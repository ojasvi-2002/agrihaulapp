# AgriHaul — Operations Dashboard

A lightweight, single-page web dashboard for agritech companies managing SMS-based farm pickup logistics. No backend server required. Connects directly to Google Sheets as a database and Twilio for SMS dispatch.

---

## What This Is

Your agritech client logs in here to:
- Monitor 60 trucks on a live map
- View all dispatch history
- Manage farmer and driver registrations
- Trigger manual dispatches if needed

Farmers and drivers never use this app — they interact only via SMS.

---

## Project Structure

```
agrihaulapp/
├── index.html          ← Main app shell + login screen
├── css/
│   ├── theme.css       ← CSS variables, dark/light mode tokens
│   └── app.css         ← All component styles
├── js/
│   ├── config.js       ← ★ YOUR INTEGRATION KEYS GO HERE ★
│   ├── data.js         ← Google Sheets fetch + seed data fallback
│   ├── map.js          ← Map rendering logic
│   ├── tables.js       ← Table render + filter functions
│   └── app.js          ← Page routing, auth, actions
└── README.md
```

---

## Setup Guide

### Step 1 — Google Sheets

1. Create a Google Sheet with three tabs:
   - `Farmers` — columns: Name, Phone, Village, Lat, Lon, Registered
   - `Trucks` — columns: TruckID, DriverName, Phone, Status, Lat, Lon, LastUpdated
   - `DispatchLog` — columns: Date, Time, Farmer, Village, WeightKG, Driver, TruckID, DistanceKM

2. Publish the sheet:
   - File → Share → Publish to web → Select each tab → CSV → Publish
   - Copy the published CSV URLs for each tab

3. Open `js/config.js` and paste the URLs into `SHEETS.FARMERS_URL`, `SHEETS.TRUCKS_URL`, and `SHEETS.DISPATCH_URL`

### Step 2 — Twilio

1. Sign up at twilio.com (free trial gives $15 credit)
2. Buy a phone number with SMS capability (~$1/month)
3. Go to Console → Account Info → copy Account SID and Auth Token
4. Open `js/config.js` and fill in `TWILIO.ACCOUNT_SID`, `TWILIO.AUTH_TOKEN`, and `TWILIO.FROM_NUMBER`

> ⚠️ Note: Calling Twilio directly from the browser exposes your Auth Token. For production, proxy through a small Cloudflare Worker or Netlify Function. See comments in `js/config.js` for how to do this.

### Step 3 — Make.com Webhook

1. In Make.com, create your SMS dispatch scenario (see previous prompt chains)
2. Copy the webhook URL from your Make.com scenario
3. Paste it into `MAKE.WEBHOOK_URL` in `js/config.js`

### Step 4 — Deploy Free

**Option A — Netlify Drop (zero account)**
1. Zip the entire `agrihaulapp/` folder
2. Go to netlify.com/drop
3. Drag and drop the zip
4. Get a live URL instantly

**Option B — GitHub + Netlify (recommended for ongoing use)**
1. Push this repo to GitHub
2. Log in to netlify.com → New site from Git → Connect repo → Deploy
3. Any push to main auto-deploys

**Option C — GitHub Pages**
1. Push to GitHub
2. Settings → Pages → Source: main branch / root
3. Live at `https://yourusername.github.io/agrihaulapp`

---

## GitHub Setup (First Time)

```bash
cd agrihaulapp
git init
git add .
git commit -m "Initial AgriHaul dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/agrihaulapp.git
git push -u origin main
```

---

## Credentials Security

Never commit real API keys to GitHub. Before pushing:
1. Copy `js/config.js` → `js/config.example.js` (with empty values)
2. Add `js/config.js` to `.gitignore`
3. Only `config.example.js` goes to GitHub

A `.gitignore` file is included that does this automatically.

---

## Cost Summary

| Service | Cost |
|---|---|
| Twilio (~2,000 SMS/month) | ~$15–20/mo |
| Make.com Core | $9/mo |
| Google Sheets | Free |
| Netlify hosting | Free |
| **Total** | **~$24–29/mo** |
