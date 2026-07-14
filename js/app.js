// ============================================================
// js/app.js  —  Main Application Logic
// ============================================================
// Handles: login/logout, page routing, data refresh loop,
// theme toggle, add farmer/truck forms, manual dispatch,
// truck status toggling.
// ============================================================

// ── STATE ────────────────────────────────────────────────────
let appData = { farmers: [], trucks: [], dispatches: [], requests: [] };
let refreshTimer = null;

// ── BOOT ─────────────────────────────────────────────────────
// Called once when the page loads.
// Shows login screen; app shell stays hidden until auth.

document.addEventListener("DOMContentLoaded", () => {
  startClock();
  restoreTheme();
  // Close modals when clicking outside
  document.querySelectorAll(".modal-overlay").forEach(o => {
    o.addEventListener("click", e => { if (e.target === o) o.classList.remove("open"); });
  });
});

// ── CLOCK ─────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById("liveTime");
  if (!el) return;
  const tick = () => el.textContent = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  tick();
  setInterval(tick, 1000);
}

// ── AUTH ──────────────────────────────────────────────────────
// Simple credential check against config.js values.
// For production, swap this with Supabase Auth or Netlify Identity:
//   https://supabase.com/docs/guides/auth
//   https://docs.netlify.com/security/secure-access-to-your-sites/identity/

async function doLogin() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  const btn  = document.getElementById("loginBtn");

  const cfg = window.CONFIG?.APP || {};
  if (!cfg.DEMO_USERNAME || !cfg.DEMO_PASSWORD) {
    // Config not set — allow any non-empty credentials for demo
    if (!user || !pass) { showToast("Enter credentials", true); return; }
  } else {
    if (user !== cfg.DEMO_USERNAME || pass !== cfg.DEMO_PASSWORD) {
      showToast("Invalid credentials", true); return;
    }
  }

  btn.textContent = "Loading...";
  btn.disabled = true;

  // Load initial data
  appData = await loadAllData();
  _allFarmers   = [...appData.farmers];
  _allTrucks    = [...appData.trucks];
  _allDispatches= [...appData.dispatches];
  _allRequests  = buildRequestQueue(appData.requests, appData.farmers);

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("mainApp").style.display     = "grid";
  document.getElementById("clientLabel").textContent   =
    cfg.CLIENT_NAME || user;

  // Render initial state
  renderAll();
  showPage("dashboard");

  // Start auto-refresh
  const interval = window.CONFIG?.SHEETS?.REFRESH_INTERVAL || 30000;
  if (interval > 0) {
    refreshTimer = setInterval(refreshData, interval);
  }
}

function doLogout() {
  clearInterval(refreshTimer);
  document.getElementById("mainApp").style.display   = "none";
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("loginBtn").textContent = "Sign in";
  document.getElementById("loginBtn").disabled = false;
}

// Allow Enter key on login form
document.addEventListener("DOMContentLoaded", () => {
  ["loginUser","loginPass"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", e => {
      if (e.key === "Enter") doLogin();
    });
  });
});

// ── DATA REFRESH ──────────────────────────────────────────────
// Runs every REFRESH_INTERVAL ms to pull fresh data from Sheets.
// Make.com writes to DispatchLog after every SMS dispatch, so
// new rows appear here automatically.

async function refreshData() {
  const fresh = await loadAllData();
  appData = fresh;
  _allFarmers    = [...fresh.farmers];
  _allTrucks     = [...fresh.trucks];
  _allDispatches = [...fresh.dispatches];
  // Pass the existing queue in so confirmed/dispatched requests keep
  // their status instead of resetting on every refresh tick.
  _allRequests   = buildRequestQueue(fresh.requests, fresh.farmers, _allRequests);
  renderAll();
  showToast("Data refreshed");
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll() {
  renderMetrics(appData.farmers, appData.trucks, appData.dispatches);
  renderRecentDispatches(appData.dispatches);
  renderDashTrucks(appData.trucks);
  updateRequestsBadge(_allRequests);
}

// ── PAGE ROUTING ──────────────────────────────────────────────
function showPage(id, sourceEl) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("page-" + id)?.classList.add("active");
  if (sourceEl) sourceEl.classList.add("active");
  else {
    // Activate the right nav item by data attribute
    document.querySelector(`[data-page="${id}"]`)?.classList.add("active");
  }

  // Lazy render per page
  switch (id) {
    case "map":
      // Small delay lets the div paint before we measure offsetWidth
      setTimeout(() => renderMap(appData.farmers, appData.trucks), 50);
      break;
    case "dispatch":
      renderDispatchTable(_allDispatches);
      break;
    case "trucks":
      renderTruckTable(_allTrucks);
      break;
    case "farmers":
      renderFarmerTable(_allFarmers);
      break;
    case "requests":
      renderRequestsTable(_allRequests, appData.trucks);
      break;
  }
}

// ── THEME TOGGLE ──────────────────────────────────────────────
// Persists preference in localStorage so it survives page reload.

function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.classList.toggle("light");
  const icon = isLight ? "☾" : "☀";
  // Update both the main topbar button and the login screen button
  const btn1 = document.getElementById("themeBtn");
  const btn2 = document.getElementById("loginThemeBtn");
  if (btn1) btn1.textContent = icon;
  if (btn2) btn2.textContent = icon;
  localStorage.setItem("agrihaulTheme", isLight ? "light" : "dark");
}

function restoreTheme() {
  const saved = localStorage.getItem("agrihaulTheme");
  if (saved === "light") {
    document.documentElement.classList.add("light");
    const icon = "☾";
    const btn1 = document.getElementById("themeBtn");
    const btn2 = document.getElementById("loginThemeBtn");
    if (btn1) btn1.textContent = icon;
    if (btn2) btn2.textContent = icon;
  }
}

// ── TRUCK STATUS TOGGLE ───────────────────────────────────────
// Changes status in local state (visual only).
// To persist, you'd write back to Google Sheets via its API
// or update the sheet manually. For now this is a dashboard
// override for ops use.

function cycleStatus(truckId) {
  const t = appData.trucks.find(t => t.TruckID === truckId);
  if (!t) return;
  const cycle = ["Available", "En Route", "Maintenance"];
  t.Status = cycle[(cycle.indexOf(t.Status) + 1) % cycle.length];
  t.LastUpdated = new Date().toLocaleString("en-GB");
  renderTruckTable(_allTrucks);
  renderDashTrucks(appData.trucks);
  renderMetrics(appData.farmers, appData.trucks, appData.dispatches);
  showToast(`${truckId} → ${t.Status}`);
}

// ── SIMULATE DISPATCH (demo button) ──────────────────────────
// Creates a fake dispatch record for testing.
// In production this button can be replaced by a "Force dispatch"
// that calls triggerMakeDispatch() to fire the real Make.com flow.

function simulateDispatch() {
  const farmers = appData.farmers;
  const avail   = appData.trucks.filter(t => t.Status === "Available");
  if (!farmers.length || !avail.length) {
    showToast("No available trucks or farmers to simulate", true); return;
  }
  const f  = farmers[Math.floor(Math.random() * farmers.length)];
  const t  = avail[0];
  t.Status = "En Route";
  const now = new Date();
  const entry = {
    Date: now.toISOString().slice(0,10),
    Time: now.toTimeString().slice(0,5),
    Farmer: f.Name, Village: f.Village,
    WeightKG: 200 + Math.floor(Math.random() * 800),
    Driver: t.DriverName, TruckID: t.TruckID,
    DistanceKM: (Math.random() * 80 + 5).toFixed(1)
  };
  appData.dispatches.unshift(entry);
  _allDispatches = [...appData.dispatches];
  renderAll();
  renderDispatchTable(_allDispatches, true);
  showToast(`Dispatched ${t.TruckID} to ${f.Name}`);
}

// ── ADD TRUCK ─────────────────────────────────────────────────
// Adds to local state. To persist to Google Sheets, use the
// Google Sheets API or have ops staff add rows directly.

function addTruck() {
  const get = id => document.getElementById(id)?.value.trim();
  const id   = get("f-truckId");
  const name = get("f-driverName");
  const ph   = get("f-driverPhone");
  if (!id || !name || !ph) { showToast("Fill in required fields", true); return; }

  const truck = {
    TruckID: id, DriverName: name, Phone: ph,
    Status:  document.getElementById("f-truckStatus")?.value || "Available",
    Lat:     parseFloat(get("f-truckLat")) || window.CONFIG?.APP?.MAP_CENTER_LAT || 10.0,
    Lon:     parseFloat(get("f-truckLon")) || window.CONFIG?.APP?.MAP_CENTER_LON || -8.0,
    LastUpdated: new Date().toLocaleString("en-GB")
  };
  appData.trucks.push(truck);
  _allTrucks = [...appData.trucks];
  closeModal("addTruck");
  renderTruckTable(_allTrucks);
  renderMetrics(appData.farmers, appData.trucks, appData.dispatches);
  showToast(`Truck ${id} added`);
  // Clear form
  ["f-truckId","f-driverName","f-driverPhone","f-truckLat","f-truckLon"].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = "";
  });
}

// ── ADD FARMER ────────────────────────────────────────────────
function addFarmer() {
  const get = id => document.getElementById(id)?.value.trim();
  const name    = get("f-farmerName");
  const phone   = get("f-farmerPhone");
  const village = get("f-farmerVillage");
  if (!name || !phone) { showToast("Fill in required fields", true); return; }

  const farmer = {
    Name: name, Phone: phone, Village: village || "—",
    Lat: parseFloat(get("f-farmerLat")) || window.CONFIG?.APP?.MAP_CENTER_LAT || 10.0,
    Lon: parseFloat(get("f-farmerLon")) || window.CONFIG?.APP?.MAP_CENTER_LON || -8.0,
    Registered: new Date().toISOString().slice(0,10)
  };
  appData.farmers.push(farmer);
  _allFarmers = [...appData.farmers];
  closeModal("addFarmer");
  renderFarmerTable(_allFarmers);
  renderMetrics(appData.farmers, appData.trucks, appData.dispatches);
  showToast(`Farmer ${name} registered`);
  ["f-farmerName","f-farmerPhone","f-farmerVillage","f-farmerLat","f-farmerLon"].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = "";
  });
}

// ── SMS INTAKE ACTIONS ───────────────────────────────────────
// These operate on _allRequests (built by buildRequestQueue in
// intake.js) and mirror the GreenEarth Connect flow: a farmer's raw
// SMS becomes a structured request, ops confirms it (registering a
// new farmer if needed), then assigns a truck to turn it into a
// real dispatch. Skips WhatsApp/app-based intake entirely — SMS in,
// structured data out, same as the rest of this dashboard.

function loadIntakeExample() {
  const el = document.getElementById("intakeText");
  if (el) el.value = "KWAME - RED OIL - 200L - AJUMAKO";
}

function ingestMessages() {
  const el = document.getElementById("intakeText");
  const lines = (el?.value || "").split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) { showToast("Paste at least one message", true); return; }

  const now = new Date();
  const stamp = `${now.toISOString().slice(0,10)} ${now.toTimeString().slice(0,5)}`;
  lines.forEach(line => {
    appData.requests.push({ Phone: "SMS-IN", Raw: line, ReceivedAt: stamp });
  });

  _allRequests = buildRequestQueue(appData.requests, appData.farmers, _allRequests);
  renderRequestsTable(_allRequests, appData.trucks);
  updateRequestsBadge(_allRequests);
  el.value = "";
  showToast(`${lines.length} message${lines.length > 1 ? "s" : ""} ingested`);
}

// Demo button — simulates a farmer texting in, using either a known
// farmer's phone (tests the "already registered" path) or a new one.
function simulateIncomingSMS() {
  const products = ["Red Oil", "Maize", "Cassava", "Millet", "Cocoa", "Rice"];
  const useKnown = appData.farmers.length && Math.random() > 0.4;
  const farmer = useKnown ? appData.farmers[Math.floor(Math.random() * appData.farmers.length)] : null;
  const name = farmer ? farmer.Name.split(" ")[0] : ["Yaw","Adama","Salimata","Boubacar"][Math.floor(Math.random()*4)];
  const phone = farmer ? farmer.Phone : `+233 24 000 ${Math.floor(1000 + Math.random()*8999)}`;
  const village = farmer ? farmer.Village : ["Techiman","Ho","Sunyani"][Math.floor(Math.random()*3)];
  const product = products[Math.floor(Math.random() * products.length)];
  const qty = 50 + Math.floor(Math.random() * 450);
  const raw = `${name.toUpperCase()} - ${product.toUpperCase()} - ${qty}KG - ${village.toUpperCase()}`;

  const now = new Date();
  appData.requests.push({
    Phone: phone, Raw: raw,
    ReceivedAt: `${now.toISOString().slice(0,10)} ${now.toTimeString().slice(0,5)}`
  });
  _allRequests = buildRequestQueue(appData.requests, appData.farmers, _allRequests);
  renderRequestsTable(_allRequests, appData.trucks);
  updateRequestsBadge(_allRequests);
  showToast(`Incoming SMS from ${phone}`);
}

// Confirms a request: registers a new farmer if the phone number
// wasn't already in the Farmers sheet, then moves the request to
// "confirmed" so it can be assigned a truck.
function confirmRequest(id) {
  const r = _allRequests.find(x => x.id === id);
  if (!r) return;

  if (!r.farmerKnown) {
    const farmer = {
      Name: r.fields.name || "Unknown",
      Phone: r.phone,
      Village: r.fields.location || "—",
      Lat: (window.CONFIG?.APP?.MAP_CENTER_LAT || 10.0) + (Math.random() - 0.5) * 2,
      Lon: (window.CONFIG?.APP?.MAP_CENTER_LON || -8.0) + (Math.random() - 0.5) * 2,
      Registered: new Date().toISOString().slice(0, 10),
    };
    appData.farmers.push(farmer);
    _allFarmers = [...appData.farmers];
    r.farmerKnown = true;
    r.farmerName = farmer.Name;
    renderFarmerTable(_allFarmers);
    renderMetrics(appData.farmers, appData.trucks, appData.dispatches);
  }

  r.status = "confirmed";
  renderRequestsTable(_allRequests, appData.trucks);
  updateRequestsBadge(_allRequests);
  showToast(`${r.farmerName} confirmed, awaiting truck`);
}

function discardRequest(id) {
  const r = _allRequests.find(x => x.id === id);
  if (r) appData.requests = appData.requests.filter(x => !(x.Raw === r.raw && x.Phone === r.phone));
  _allRequests = _allRequests.filter(x => x.id !== id);
  renderRequestsTable(_allRequests, appData.trucks);
  updateRequestsBadge(_allRequests);
  showToast("Request discarded");
}

// Turns a confirmed request into a real dispatch record, same shape
// as simulateDispatch() produces, and marks the truck En Route.
function dispatchRequest(id, truckId) {
  const r = _allRequests.find(x => x.id === id);
  const t = appData.trucks.find(x => x.TruckID === truckId);
  if (!r || r.status !== "confirmed") return;
  if (!t) { showToast("Choose a truck first", true); return; }

  t.Status = "En Route";
  const now = new Date();
  appData.dispatches.unshift({
    Date: now.toISOString().slice(0, 10),
    Time: now.toTimeString().slice(0, 5),
    Farmer: r.farmerName,
    Village: r.fields.location,
    WeightKG: r.fields.quantity || 0,
    Driver: t.DriverName,
    TruckID: t.TruckID,
    DistanceKM: (Math.random() * 80 + 5).toFixed(1),
  });
  _allDispatches = [...appData.dispatches];
  r.status = "dispatched";

  renderAll();
  renderDispatchTable(_allDispatches, true);
  renderTruckTable(_allTrucks);
  renderRequestsTable(_allRequests, appData.trucks);
  showToast(`${t.TruckID} dispatched to ${r.farmerName}`);
}

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id)  { document.getElementById("modal-" + id)?.classList.add("open"); }
function closeModal(id) { document.getElementById("modal-" + id)?.classList.remove("open"); }

// ── TOAST ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("toast-error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
