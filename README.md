# ⏱️ Telegram Duty Tracker Bot

A lightweight **Telegram bot for tracking developer working hours** using START / STOP duty logs.  
Built with Node.js, designed for small engineering teams and remote developers.

---

## 🚀 Features

- 🟢 Start / Stop duty tracking via Telegram buttons  
- ⏱️ Automatic timestamp logging (Douala timezone)  
- 👨‍💻 Multi-developer support (username-based tracking)  
- 📝 Optional task entry on start  
- 📝 Optional comments on stop  
- 📊 Admin command to calculate total hours worked  
- 💾 Simple JSON-based storage (no database required)  

---

## 🧠 How It Works

1. Developer clicks **Start Duty**
2. Bot records:
   - username
   - start time
   - optional tasks

3. Developer clicks **Stop Duty**
4. Bot records:
   - stop time
   - optional comments

5. Admin can run:
```

/hours

```

to view total hours per developer.

---

## 📦 Tech Stack

- Node.js
- Telegram Bot API
- Day.js (timezone handling)
- JSON file storage

---

## 📁 Project Structure

```

telegram-duty-bot/
│
├── index.js          # Main bot logic
├── logs.json         # Duty logs storage
├── package.json      # Dependencies
├── .gitignore        # Ignored files
└── README.md

````

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/telegram-duty-bot.git
cd telegram-duty-bot
````

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Create Telegram Bot

Use:

BotFather

* Create a bot
* Copy the token

---

### 4. Add environment variable

Create `.env` (optional) or set in hosting platform:

```bash
BOT_TOKEN=your_telegram_bot_token
```

---

### 5. Run locally

```bash
node index.js
```

---

## ▶️ Usage

### Start the bot

Send:

```
/start
```

You will see:

* 🟢 Start Duty
* 🔴 Stop Duty

---

### Admin command

Get total hours:

```
/hours
```

Get specific user hours:

```
/hours @username
```

---

## 🌍 Timezone

All timestamps are recorded in:

```
Africa/Douala (Cameroon Time)
```

---

## 📊 Example Output

```
📊 ALL DEV HOURS

@john: 8.50 hrs  
@mary: 6.25 hrs  
@dev2: 4.00 hrs
```

---

## 🚀 Deployment

Recommended hosting:

Render

### Start command:

```bash
node index.js
```

### Build command:

```bash
npm install
```

---

## ⚠️ Important Notes

* Do NOT commit `node_modules`
* Ensure `logs.json` exists
* Run only one bot instance at a time
* Keep bot token private

---

## 🔮 Future Improvements

* 📊 Google Sheets export (optional)
* 🔔 Missed STOP duty alerts
* 📅 Daily automated reports
* 📈 Admin dashboard UI
* 🧠 AI productivity summaries

---

## 👨‍💻 Author

Built for internal dev team productivity tracking.
