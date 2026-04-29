const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
const fs = require('fs');

const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// =====================
// CONFIG
// =====================
const token = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

const LOG_FILE = './logs.json';

// =====================
// TIME (DOUALA)
// =====================
function getNow() {
    const now = dayjs().tz('Africa/Douala');
    return {
        date: now.format('YYYY-MM-DD'),
        time: now.format('HH:mm:ss'),
        iso: now.toISOString()
    };
}

// =====================
// STORAGE (SAFE JSON)
// =====================
function readLogs() {
    try {
        if (!fs.existsSync(LOG_FILE)) return [];
        const data = fs.readFileSync(LOG_FILE, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error('readLogs error:', err);
        return [];
    }
}

function writeLogs(logs) {
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error('writeLogs error:', err);
    }
}

function addLog(entry) {
    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);
}

// =====================
// USER STATE (TEMP)
// =====================
const userState = {};

// =====================
// USER IDENTIFIER
// =====================
function getUsername(msg) {
    return msg.from.username
        ? `@${msg.from.username}`
        : `${msg.from.first_name}_${msg.from.id}`;
}

// =====================
// START BOT UI
// =====================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Select action:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🟢 Start Duty', callback_data: 'start_duty' }],
                [{ text: '🔴 Stop Duty', callback_data: 'stop_duty' }]
            ]
        }
    });
});

// =====================
// BUTTON HANDLER
// =====================
bot.on('callback_query', (query) => {
    const username = getUsername(query);

    if (query.data === 'start_duty') {
        userState[username] = { action: 'start' };

        bot.sendMessage(query.message.chat.id,
            `🟢 START DUTY\n\nSend tasks (or type skip)`);
    }

    if (query.data === 'stop_duty') {
        userState[username] = { action: 'stop' };

        bot.sendMessage(query.message.chat.id,
            `🔴 STOP DUTY\n\nSend comments (or type skip)`);
    }

    bot.answerCallbackQuery(query.id);
});

// =====================
// MESSAGE HANDLER
// =====================
bot.on('message', (msg) => {
    const username = getUsername(msg);

    if (msg.text && msg.text.startsWith('/')) return;
    if (!userState[username]) return;

    const state = userState[username];
    const input = msg.text || '';
    const { date, time, iso } = getNow();

    // ---------------------
    // START DUTY
    // ---------------------
    if (state.action === 'start') {
        const task = input.toLowerCase() === 'skip' ? '' : input;

        addLog({
            username,
            type: 'START',
            timestamp: iso,
            task
        });

        bot.sendMessage(msg.chat.id, `
🟢 START DUTY

User: ${username}
Date: ${date}
Time: ${time}

Tasks: ${task || 'N/A'}
`);

        delete userState[username];
    }

    // ---------------------
    // STOP DUTY
    // ---------------------
    if (state.action === 'stop') {
        const comment = input.toLowerCase() === 'skip' ? '' : input;

        addLog({
            username,
            type: 'STOP',
            timestamp: iso,
            comment
        });

        bot.sendMessage(msg.chat.id, `
🔴 STOP DUTY

User: ${username}
Date: ${date}
Time: ${time}

Comments: ${comment || 'N/A'}
`);

        delete userState[username];
    }
});

// =====================
// HOURS CALCULATION
// =====================
function calculateHours(username) {
    const logs = readLogs()
        .filter(l => l.username === username)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let totalMs = 0;
    let start = null;

    for (const log of logs) {
        const ts = new Date(log.timestamp);

        if (log.type === 'START') start = ts;

        if (log.type === 'STOP' && start) {
            totalMs += ts - start;
            start = null;
        }
    }

    return (totalMs / 3600000).toFixed(2);
}

// =====================
// /HOURS COMMAND
// =====================
bot.onText(/\/hours(?:\s+(.+))?/, (msg, match) => {
    const logs = readLogs();
    const param = match[1];

    // single user
    if (param) {
        const hours = calculateHours(param);

        return bot.sendMessage(msg.chat.id, `
📊 DEV REPORT

User: ${param}
Total Hours: ${hours}
`);
    }

    // all users
    const users = [...new Set(logs.map(l => l.username))];

    let report = `📊 ALL DEV HOURS\n\n`;

    users.forEach(u => {
        report += `${u}: ${calculateHours(u)} hrs\n`;
    });

    bot.sendMessage(msg.chat.id, report);
});