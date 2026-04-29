require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
const fs = require('fs');
const cron = require('node-cron');

const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// =====================
// CONFIG
// =====================
const token = process.env.BOT_TOKEN;
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
// STORAGE
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
// USER STATE
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
// ADMIN HANDLING
// =====================
function getEnvAdmins() {
    return (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id))
        .filter(Boolean);
}

async function getGroupAdmins(chatId) {
    try {
        const admins = await bot.getChatAdministrators(chatId);
        return admins.map(a => a.user.id);
    } catch {
        return getEnvAdmins();
    }
}

async function sendReportToAdmins(chatId, message) {
    const admins = await getGroupAdmins(chatId);

    admins.forEach(adminId => {
        bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
    });
}

// =====================
// START / STOP UI
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
// CALLBACK HANDLER
// =====================
bot.on('callback_query', (query) => {
    const username = getUsername(query);

    if (query.data === 'start_duty') {
        userState[username] = { action: 'start' };
        bot.sendMessage(query.message.chat.id, `🟢 START DUTY\nSend tasks or type skip`);
    }

    if (query.data === 'stop_duty') {
        userState[username] = { action: 'stop' };
        bot.sendMessage(query.message.chat.id, `🔴 STOP DUTY\nSend comments or type skip`);
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

    // START
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

    // STOP
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
// /HOURS COMMAND (DM ADMINS)
// =====================
bot.onText(/\/hours(?:\s+(.+))?/, async (msg, match) => {
    const logs = readLogs();
    const param = match[1];

    let report = '';

    if (param) {
        report = `📊 *DEV REPORT*\n\n👤 ${param}: ${calculateHours(param)} hrs`;
    } else {
        const users = [...new Set(logs.map(l => l.username))];

        report = `📊 *ALL DEV HOURS*\n\n`;

        users.forEach(u => {
            report += `👤 ${u}: ${calculateHours(u)} hrs\n`;
        });
    }

    await sendReportToAdmins(msg.chat.id, report);
});

// =====================
// ACTIVE DUTY CHECK
// =====================
function getActiveSessions() {
    const logs = readLogs();
    const lastStart = {};

    logs.forEach(log => {
        if (log.type === 'START') {
            lastStart[log.username] = log.timestamp;
        }

        if (log.type === 'STOP') {
            delete lastStart[log.username];
        }
    });

    return lastStart;
}

function checkOverdueSessions() {
    const active = getActiveSessions();
    const now = new Date();

    const overdue = [];

    for (const user in active) {
        const startTime = new Date(active[user]);
        const diffHours = (now - startTime) / (1000 * 60 * 60);

        if (diffHours > 6) {
            overdue.push({ user, hours: diffHours.toFixed(1) });
        }
    }

    return overdue;
}

// =====================
// ⏰ DAILY REPORT (18:00)
// =====================
cron.schedule('0 18 * * *', async () => {
    const logs = readLogs();
    const users = [...new Set(logs.map(l => l.username))];

    let report = `📊 *DAILY DEV REPORT*\n\n`;

    users.forEach(u => {
        report += `👤 ${u}: ${calculateHours(u)} hrs\n`;
    });

    const chatId = process.env.GROUP_CHAT_ID;
    if (chatId) {
        await sendReportToAdmins(chatId, report);
    }
}, {
    timezone: "Africa/Douala"
});

// =====================
// ⛔ HOURLY OVERDUE CHECK
// =====================
cron.schedule('0 * * * *', async () => {
    const overdue = checkOverdueSessions();

    if (overdue.length === 0) return;

    let message = `⛔ *OVERDUE DUTY ALERT*\n\n`;

    overdue.forEach(d => {
        message += `👤 ${d.user} - ${d.hours} hrs active (NO STOP)\n`;
    });

    const chatId = process.env.GROUP_CHAT_ID;

    if (chatId) {
        await sendReportToAdmins(chatId, message);
    }
}, {
    timezone: "Africa/Douala"
});