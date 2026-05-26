// ============================================================
// js/tables.js  —  Table Rendering & Filtering
// ============================================================
// All functions that build HTML table rows from data objects.
// Column names match your AgriDispatch.xlsx exactly.
// ============================================================

// ── DASHBOARD METRICS ────────────────────────────────────────
function renderMetrics(farmers, trucks, dispatches) {
  const available  = trucks.filter(t => t.Status === "Available").length;
  const enRoute    = trucks.filter(t => t.Status === "En Route").length;
  const maintenance= trucks.filter(t => t.Status === "Maintenance").length;

  const todayStr   = new Date().toISOString().slice(0,10);
  const todayTrips = dispatches.filter(d => d.Date === todayStr);
  const totalWeight= todayTrips.reduce((s, d) => s + parseFloat(d.WeightKG || 0), 0);

  setEl("m-available",  available);
  setEl("m-available-sub", `${enRoute} en route · ${maintenance} maintenance`);
  setEl("m-dispatched", todayTrips.length);
  setEl("m-weight",     totalWeight >= 1000
    ? (totalWeight/1000).toFixed(1) + " t"
    : totalWeight + " kg");
  setEl("m-farmers",    farmers.length);

  // Sidebar stat footer
  setEl("sf-available",  available);
  setEl("sf-enroute",    enRoute);
  setEl("sf-farmers",    farmers.length);

  // Nav badge
  setEl("dispatchBadge", dispatches.length);
}

// ── RECENT DISPATCH TABLE (dashboard) ────────────────────────
function renderRecentDispatches(dispatches) {
  const tbody = document.getElementById("recentDispatchTable");
  if (!tbody) return;
  tbody.innerHTML = dispatches.slice(0, 8).map(d => `
    <tr>
      <td class="mono">${d.Time}</td>
      <td class="primary">${d.Farmer}</td>
      <td>${d.Village}</td>
      <td class="mono">${Number(d.WeightKG).toLocaleString()} kg</td>
      <td>${d.Driver}</td>
      <td class="mono">${d.DistanceKM} km</td>
    </tr>`).join("");
}

// ── DASHBOARD TRUCK SNAPSHOT (right column) ──────────────────
function renderDashTrucks(trucks) {
  const tbody = document.getElementById("dashTruckTable");
  if (!tbody) return;
  tbody.innerHTML = trucks.slice(0, 12).map(t => `
    <tr>
      <td class="mono primary">${t.TruckID}</td>
      <td>${t.DriverName.split(" ")[0]}</td>
      <td>${statusBadge(t.Status)}</td>
    </tr>`).join("");
}

// ── FULL DISPATCH LOG TABLE ───────────────────────────────────
let _allDispatches = [];

function renderDispatchTable(dispatches, highlightFirst = false) {
  const tbody = document.getElementById("dispatchTable");
  if (!tbody) return;
  tbody.innerHTML = dispatches.map((d, i) => `
    <tr ${highlightFirst && i === 0 ? 'class="row-new"' : ""}>
      <td class="mono">${d.Date}</td>
      <td class="mono">${d.Time}</td>
      <td class="primary">${d.Farmer}</td>
      <td>${d.Village}</td>
      <td class="mono">${Number(d.WeightKG).toLocaleString()}</td>
      <td>${d.Driver}</td>
      <td class="mono">${d.TruckID}</td>
      <td class="mono">${d.DistanceKM} km</td>
    </tr>`).join("");
}

function filterDispatch() {
  const q = (document.getElementById("dispatchSearch")?.value || "").toLowerCase();
  const filtered = _allDispatches.filter(d =>
    `${d.Farmer} ${d.Village} ${d.Driver} ${d.TruckID}`.toLowerCase().includes(q)
  );
  renderDispatchTable(filtered);
}

// ── FULL TRUCKS TABLE ─────────────────────────────────────────
let _allTrucks = [];

function renderTruckTable(trucks) {
  const tbody = document.getElementById("truckTable");
  if (!tbody) return;
  tbody.innerHTML = trucks.map(t => `
    <tr>
      <td class="mono primary">${t.TruckID}</td>
      <td>${t.DriverName}</td>
      <td class="mono" style="font-size:11px">${t.Phone}</td>
      <td>${statusBadge(t.Status)}</td>
      <td class="mono">${t.Lat}</td>
      <td class="mono">${t.Lon}</td>
      <td class="mono" style="font-size:11px">${t.LastUpdated}</td>
      <td>
        <button class="btn btn-ghost btn-sm"
          onclick="cycleStatus('${t.TruckID}')">
          Toggle
        </button>
      </td>
    </tr>`).join("");
}

function filterTrucks() {
  const q = (document.getElementById("truckSearch")?.value || "").toLowerCase();
  const filtered = _allTrucks.filter(t =>
    `${t.TruckID} ${t.DriverName}`.toLowerCase().includes(q)
  );
  renderTruckTable(filtered);
}

// ── FULL FARMERS TABLE ────────────────────────────────────────
let _allFarmers = [];

function renderFarmerTable(farmers) {
  const tbody = document.getElementById("farmerTable");
  if (!tbody) return;
  tbody.innerHTML = farmers.map(f => `
    <tr>
      <td class="primary">${f.Name}</td>
      <td class="mono" style="font-size:11px">${f.Phone}</td>
      <td>${f.Village}</td>
      <td class="mono">${f.Lat}</td>
      <td class="mono">${f.Lon}</td>
      <td class="mono" style="font-size:11px">${f.Registered}</td>
    </tr>`).join("");
}

function filterFarmers() {
  const q = (document.getElementById("farmerSearch")?.value || "").toLowerCase();
  const filtered = _allFarmers.filter(f =>
    `${f.Name} ${f.Village} ${f.Phone}`.toLowerCase().includes(q)
  );
  renderFarmerTable(filtered);
}

// ── SMALL UTILITIES ───────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
