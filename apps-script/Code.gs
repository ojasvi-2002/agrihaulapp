/**
 * agrihaulapp write endpoint.
 *
 * The dashboard reads Sheets data through "Publish to web" CSV links,
 * which are read-only. This script is the other half: a small web app
 * bound to the same spreadsheet that accepts a POST and appends a row
 * to the right tab, so anything added on the dashboard (a new farmer,
 * a new truck, a dispatch, an SMS request) actually lands in Sheets
 * instead of living only in the browser tab.
 *
 * SETUP
 * 1. Open your spreadsheet → Extensions → Apps Script
 * 2. Delete any starter code, paste this file in
 * 3. Deploy → New deployment → type: Web app
 *      Execute as:      Me
 *      Who has access:  Anyone
 * 4. Copy the Web app URL it gives you
 * 5. Paste it into SHEETS.WRITE_URL in js/config.js
 *
 * Every time you edit this script you need to create a new deployment
 * (or "Manage deployments" → edit → new version) for changes to go live.
 */

// Column order must match each tab's header row exactly.
const SHEET_COLUMNS = {
  Farmers:     ["Name", "Phone", "Village", "Lat", "Lon", "Registered"],
  Trucks:      ["TruckID", "DriverName", "Phone", "Status", "Lat", "Lon", "LastUpdated"],
  DispatchLog: ["Date", "Time", "Farmer", "Village", "WeightKG", "Driver", "TruckID", "DistanceKM"],
  Requests:    ["Phone", "Raw", "ReceivedAt"],
};

const ACTION_TO_SHEET = {
  addFarmer:   "Farmers",
  addTruck:    "Trucks",
  addDispatch: "DispatchLog",
  addRequest:  "Requests",
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheetName = ACTION_TO_SHEET[body.action];
    if (!sheetName) throw new Error("Unknown action: " + body.action);

    const columns = SHEET_COLUMNS[sheetName];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("No tab named " + sheetName);

    const row = columns.map(col => body.payload[col] ?? "");
    sheet.appendRow(row);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// Lets you sanity-check the deployment URL directly in a browser.
function doGet() {
  return jsonResponse({ ok: true, message: "agrihaulapp write endpoint is live" });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
