// ============================================================
// js/config.example.js  —  Template for new developers
// ============================================================
// This file IS committed to GitHub (safe — no real keys).
// To set up a new instance:
//   1. Copy this file: cp config.example.js config.js
//   2. Fill in all the empty strings below
//   3. config.js is in .gitignore, so your keys stay private
// ============================================================

const CONFIG = {
  SHEETS: {
    FARMERS_URL:  "",   // Publish Farmers tab → CSV → URL
    TRUCKS_URL:   "",   // Publish Trucks tab  → CSV → URL
    DISPATCH_URL: "",   // Publish DispatchLog → CSV → URL
    REFRESH_INTERVAL: 30000,
  },
  TWILIO: {
    ACCOUNT_SID:  "",   // From Twilio Console → Account Info
    AUTH_TOKEN:   "",   // From Twilio Console → Account Info
    FROM_NUMBER:  "",   // Your purchased Twilio number
  },
  MAKE: {
    WEBHOOK_URL:  "",   // Your Make.com scenario webhook URL
  },
  APP: {
    APP_NAME:      "AgriHaul Ops",
    CLIENT_NAME:   "Your Client Name",
    DEMO_USERNAME: "admin",
    DEMO_PASSWORD: "changeme",
    MAP_CENTER_LAT: 21.1,
    MAP_CENTER_LON: 78.5,
  }
};

window.CONFIG = CONFIG;
