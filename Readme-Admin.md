🔹 **DEV DUTY TRACKER — ADMIN GUIDE** 🔹

━━━━━━━━━━━━━━━━━━
📌 **WHAT THIS BOT DOES**
━━━━━━━━━━━━━━━━━━
This bot tracks developers’ working hours using:

* 🟢 Start Duty
* 🔴 Stop Duty

It automatically:

* Calculates total hours
* Sends reports to admins (DM)
* Detects missing STOP duty
* Sends daily summaries

---

━━━━━━━━━━━━━━━━━━
📊 **REPORT COMMANDS**
━━━━━━━━━━━━━━━━━━

📌 All developers (all-time):

```
/hours
```

📌 Specific developer (all-time):

```
/hours @username
```

---

📅 **DATE RANGE REPORTS (NEW)**

📌 All developers within a date range:

```
/hours 2026-04-01 2026-04-30
```

📌 Specific developer within a date range:

```
/hours @username 2026-04-01 2026-04-30
```

⚠️ Date format must be:

```
YYYY-MM-DD
```

---

━━━━━━━━━━━━━━━━━━
📊 **SYSTEM SUMMARY**
━━━━━━━━━━━━━━━━━━

📌 Overview of all developers:

```
/summary
```

---

━━━━━━━━━━━━━━━━━━
⚙️ **ADMIN CONTROL COMMANDS**
━━━━━━━━━━━━━━━━━━

⛔ Pause tracking:

```
/pause
```

▶️ Resume tracking:

```
/resume
```

🧹 Reset all logs (⚠️ irreversible):

```
/reset
```

---

━━━━━━━━━━━━━━━━━━
🔔 **AUTOMATIC FEATURES**
━━━━━━━━━━━━━━━━━━

📅 Daily report
→ Sent every evening (Douala time)

⛔ Overdue alert
→ If a developer forgets to STOP duty (after ~6 hours)

📩 Reports
→ Sent directly to admins (private message)

---

━━━━━━━━━━━━━━━━━━
⚠️ **IMPORTANT RULES**
━━━━━━━━━━━━━━━━━━

✔ Admin must start bot privately
→ Open the bot and send:

```
/start
```

✔ Developers must:

* Start duty before working
* Stop duty after finishing

✔ Bot must remain in the group

---

━━━━━━━━━━━━━━━━━━
🚨 **COMMON ISSUES**
━━━━━━━━━━━━━━━━━━

❌ No reports received
→ Admin has not started bot privately

❌ Hours not accurate
→ Developer did not press STOP

❌ Bot not responding
→ Bot removed or not admin in group

❌ Date range not working
→ Wrong format (must be YYYY-MM-DD)

---

━━━━━━━━━━━━━━━━━━
✅ **BEST PRACTICE**
━━━━━━━━━━━━━━━━━━

✔ Use one dedicated group for tracking
✔ Ensure all devs follow Start → Stop
✔ Review reports daily
✔ Use date range reports for payroll & audits

━━━━━━━━━━━━━━━━━━
END OF GUIDE
━━━━━━━━━━━━━━━━━━