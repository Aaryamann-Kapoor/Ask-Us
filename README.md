# 🧞 ASK-US — Conversational AI for Instant Business Intelligence

> **GFG Hackathon 2024 Submission**

---

## 🚀 What is ASK-US?

ASK-US lets anyone type a plain English question about YouTube creator data and instantly get a beautiful interactive dashboard — no SQL, no coding, no data skills needed.

**Example:**
> *"Show monthly views trend by category for India only"*
> → Instantly renders 4 interactive charts with AI insights ✨

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Natural language to charts | ✅ |
| Bar, Line, Pie, Doughnut, Scatter charts | ✅ |
| Follow-up questions | ✅ |
| CSV upload (any schema) | ✅ |
| Google Gemini AI | ✅ |
| Smart fallback (works without AI) | ✅ |
| Export dashboard as PNG | ✅ |
| Export dashboard as HTML | ✅ |
| Dark YouTube-style UI | ✅ |
| Hover tooltips + zoom on charts | ✅ |
| Loading states + error messages | ✅ |
| Responsive / mobile friendly | ✅ |

---

## 📁 Folder Structure

```
ASK-US/
├── backend/
│   ├── app.py              ← FastAPI server + Gemini AI
│   ├── requirements.txt    ← Python packages
│   └── .env                ← API key (do not share)
├── frontend/
│   ├── index.html          ← Full single page app
│   ├── script.js           ← Charts + API logic
│   └── style.css           ← Extra styles
├── HOW_TO_RUN.md         ← Simple run instructions
└── README.md               ← This file
```

### Requirements
- Python 3.10 or higher
- A modern browser (Chrome recommended)
- Internet connection (for Gemini AI)

---

## 🏗️ How It Works

```
User types query
      ↓
Frontend sends POST /query to FastAPI
      ↓
FastAPI builds pandas schema + sample rows
      ↓
Sends to Google Gemini AI with strict prompt
      ↓
Gemini returns JSON: { charts: [...], insights: [...] }
      ↓
Frontend renders Chart.js charts with animations
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Tailwind CSS, Vanilla JS, Chart.js 4 |
| Backend | Python FastAPI, Uvicorn |
| AI Model | Google Gemini 1.5 Flash |
| Data | Pandas, NumPy |
| Export | html2canvas, Chart.js PNG export |

---

## 📊 Dataset Columns

| Column | Type | Description |
|--------|------|-------------|
| timestamp | datetime | Video publish date |
| video_id | string | Unique video ID |
| category | string | Tech Reviews / Gaming / Education / Vlogs / Music |
| language | string | English / Hindi / Telugu |
| region | string | India / USA |
| duration_sec | integer | Video length in seconds |
| views | integer | Total views |
| likes | integer | Total likes |
| comments | integer | Total comments |
| shares | integer | Total shares |
| sentiment_score | float | Audience positivity (0 to 1) |
| ads_enabled | boolean | Monetisation enabled |

---

*Made with ❤️ for Geeks for Geeks Hackathon 2026*
