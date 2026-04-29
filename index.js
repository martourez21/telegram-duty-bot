require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
const fs = require('fs');
const express = require('express');

const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// =====================
// CONFIG
// =====================
const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error("BOT_TOKEN is missing in environment variables");
}

const bot = new TelegramBot(token, { polling: true });

const LOG_FILE = './logs.json';

// =====================
// EXPRESS (RENDER HEALTH CHECK)
// =====================
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Health server running on ${PORT}`);
});

// =====================
// BOT STATE
// =====================
let BOT_PAUSED = false;
const userState = {};

// =====================
// ADMIN IDS
// =====================
function getAdmins() {
    return (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(Boolean);
}

function isAdmin(userId) {
    return getAdmins().includes(userId);
}

// =====================
// TIME
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
function getUsername(msg) {
    return msg.from.username
        ? `@${msg.from.username}`
        : `${msg.from.first_name}_${msg.from.id}`;
}

// =====================
// ADMIN SENDER
// =====================
async function sendReportToAdmins(message) {
    const admins = getAdmins();

    for (const adminId of admins) {
        try {
            await bot.sendMessage(adminId, message, {
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error(`Failed sending to admin ${adminId}:`, err.message);
        }
    }
}

// =====================
// START UI
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

    if (!msg.text) return;
    if (BOT_PAUSED) return;

    if (!userState[username]) return;

    const state = userState[username];
    const input = msg.text;
    const { date, time, iso } = getNow();

    if (state.action === 'start') {
        const task = input.toLowerCase() === 'skip' ? '' : input;

        addLog({ username, type: 'START', timestamp: iso, task });

        bot.sendMessage(msg.chat.id, `
🟢 START DUTY
User: ${username}
Date: ${date}
Time: ${time}
Tasks: ${task || 'N/A'}
`);

        delete userState[username];
    }

    if (state.action === 'stop') {
        const comment = input.toLowerCase() === 'skip' ? '' : input;

        addLog({ username, type: 'STOP', timestamp: iso, comment });

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
// COMMANDS
// =====================

// PAUSE
bot.onText(/\/pause/, (msg) => {
    if (!isAdmin(msg.from.id)) return;

    BOT_PAUSED = true;
    bot.sendMessage(msg.chat.id, "⛔ Bot paused");
});

// RESUME
bot.onText(/\/resume/, (msg) => {
    if (!isAdmin(msg.from.id)) return;

    BOT_PAUSED = false;
    bot.sendMessage(msg.chat.id, "✅ Bot resumed");
});

// RESET LOGS
bot.onText(/\/reset/, (msg) => {
    if (!isAdmin(msg.from.id)) return;

    writeLogs([]);
    bot.sendMessage(msg.chat.id, "🗑 Logs cleared");
});

// SUMMARY
bot.onText(/\/summary/, (msg) => {
    const logs = readLogs();
    const users = [...new Set(logs.map(l => l.username))];

    let report = `📊 *SUMMARY REPORT*\n\n`;

    users.forEach(u => {
        report += `👤 ${u}: ${calculateHours(u)} hrs\n`;
    });

    sendReportToAdmins(report);
});

// HOURS
bot.onText(/\/hours/, (msg) => {
    const logs = readLogs();
    const users = [...new Set(logs.map(l => l.username))];

    let report = `📊 *ALL DEV HOURS*\n\n`;

    users.forEach(u => {
        report += `👤 ${u}: ${calculateHours(u)} hrs\n`;
    });

    sendReportToAdmins(report);
});