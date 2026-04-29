# ⏱️ Telegram Duty Tracker Bot

A lightweight production-ready Telegram bot for tracking developer working hours using START / STOP duty logs.

Built for engineering teams, remote developers, and internal productivity tracking.

---

## 🚀 Features

- 🟢 Start / Stop duty tracking via Telegram buttons  
- ⏱️ Accurate working time calculation (Douala timezone)  
- 👨‍💻 Multi-developer support (username + ID tracking)  
- 📝 Optional task logging on start  
- 📝 Optional comments on stop  
- 📊 `/hours` report (single user or full team)  
- 📩 Admin-only DM reports  
- ⛔ Auto detection of forgotten STOP duty  
- 🔔 Hourly alerts for long-running sessions  
- 📅 Daily automated report (18:00 Africa/Douala time)  
- 💾 Simple JSON file storage (no database required)

---

## 🧠 How It Works

1. Developer clicks **Start Duty**
   - Bot records start time, username, and optional tasks

2. Developer clicks **Stop Duty**
   - Bot records stop time and optional comments

3. System calculates total working hours per user

4. Admins receive:
   - Daily reports
   - On-demand `/hours` reports
   - Overdue duty alerts

---

## 📊 Example Output

### All Dev Hours
```

📊 ALL DEV HOURS

@john: 6.20 hrs
@mary: 4.50 hrs
@dev2: 8.10 hrs

```

### Single User
```

📊 DEV REPORT

👤 @john
⏱ Total Hours: 6.20

````

---

## ⚙️ Tech Stack

- Node.js  
- Telegram Bot API  
- Day.js (timezone handling)  
- node-cron (scheduling)  
- JSON file storage  

---

## 📁 Project Structure

```
telegram-duty-bot/
│
├── index.js        # Main bot logic
├── logs.json       # Duty logs storage
├── package.json    # Dependencies
├── .env            # Environment variables
├── .gitignore      # Ignored files
└── README.md
````

---

## 🔐 Environment Variables

Create a `.env` file:

```env
BOT_TOKEN=your_telegram_bot_token
GROUP_CHAT_ID=-100xxxxxxxxxx
ADMIN_IDS=123456789,987654321
```

---

## ▶️ Local Setup

### 1. Install dependencies

```bash
npm install
```

---

### 2. Run bot locally

```bash
node index.js
```

---

## 🤖 Bot Setup (Telegram)

Use:

BotFather

Steps:

* Create bot
* Copy token
* Add to your group
* Make bot admin

---

## 🌍 Deployment

Recommended platform:

Render

---

## ⚠️ Important Notes

* ❌ Do NOT commit `node_modules`
* ❌ Do NOT commit `.env`
* ✔ Ensure `logs.json` exists
* ✔ Bot must run as single instance only
* ✔ Admins must start bot in private chat for DM reports

---

## 🔮 Future Improvements

* 📊 Admin dashboard (React)
* 📈 Productivity charts per developer
* 🧾 PDF weekly reports
* 🧠 AI productivity scoring
* 🔔 Slack / Email integration

