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
// BOT STATE
// =====================
let BOT_PAUSED = false;
let isDailyRunning = false;
let isHourlyRunning = false;

// =====================
// ADMIN IDS
// =====================
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id))
    .filter(Boolean);

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

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

function getUsername(msg) {
    return msg.from.username
        ? `@${msg.from.username}`
        : `${msg.from.first_name}_${msg.from.id}`;
}

// =====================
// ADMIN SENDER
// =====================
async function getGroupAdmins(chatId) {
    try {
        const admins = await bot.getChatAdministrators(chatId);
        return admins.map(a => a.user.id);
    } catch {
        return ADMIN_IDS;
    }
}

async function sendReportToAdmins(chatId, message) {
    const admins = await getGroupAdmins(chatId);

    admins.forEach(adminId => {
        bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
    });
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
    if (BOT_PAUSED) return;
    if (!userState[username]) return;

    const state = userState[username];
    const input = msg.text || '';
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
// DATE RANGE CALCULATION
// =====================
function calculateHoursInRange(username, startDate, endDate) {
    const logs = readLogs()
        .filter(l => l.username === username)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let totalMs = 0;
    let start = null;

    const startRange = new Date(startDate);
    const endRange = new Date(endDate);
    endRange.setHours(23, 59, 59, 999);

    for (const log of logs) {
        const ts = new Date(log.timestamp);

        if (log.type === 'START') start = ts;

        if (log.type === 'STOP' && start) {
            if (ts >= startRange && ts <= endRange) {
                totalMs += ts - start;
            }
            start = null;
        }
    }

    return (totalMs / 3600000).toFixed(2);
}

// =====================
// /HOURS COMMAND (UPDATED)
// =====================
bot.onText(/\/hours(?:\s+(.+))?/, async (msg, match) => {
    const logs = readLogs();
    const input = match[1];

    let report = '';

    if (input) {
        const parts = input.trim().split(/\s+/);

        if (parts.length === 3) {
            const [user, start, end] = parts;

            report = `📊 *DEV REPORT*\n\n👤 ${user}\n📅 ${start} → ${end}\n⏱ ${calculateHoursInRange(user, start, end)} hrs`;
        }

        else if (parts.length === 2) {
            const [start, end] = parts;

            const users = [...new Set(logs.map(l => l.username))];

            report = `📊 *ALL DEV HOURS*\n\n📅 ${start} → ${end}\n\n`;

            users.forEach(u => {
                report += `👤 ${u}: ${calculateHoursInRange(u, start, end)} hrs\n`;
            });
        }

        else {
            report = "❌ Invalid format\nUse:\n/hours 2026-01-01 2026-01-31\n/hours @user 2026-01-01 2026-01-31";
        }
    }

    else {
        const users = [...new Set(logs.map(l => l.username))];

        report = `📊 *ALL DEV HOURS (ALL TIME)*\n\n`;

        users.forEach(u => {
            report += `👤 ${u}: ${calculateHours(u)} hrs\n`;
        });
    }

    await sendReportToAdmins(msg.chat.id, report);
});