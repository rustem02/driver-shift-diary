const dateInput = document.getElementById("date-input");
const prevBtn = document.getElementById("prev-day");
const nextBtn = document.getElementById("next-day");
const summaryEl = document.getElementById("summary");
const tripsList = document.getElementById("trips-list");
const emptyEl = document.getElementById("empty");
const tripForm = document.getElementById("trip-form");
const toggleFormBtn = document.getElementById("toggle-form");
const formError = document.getElementById("form-error");
const formOk = document.getElementById("form-ok");

/** @type {string[]} */
let availableDates = [];

function formatMoney(n) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shiftDate(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function renderSummary(summary) {
  summaryEl.innerHTML = `
    <div class="stat">
      <span class="label">Поездок</span>
      <span class="value">${summary.tripsCount}</span>
    </div>
    <div class="stat">
      <span class="label">Выручка</span>
      <span class="value">${formatMoney(summary.revenue)}</span>
    </div>
    <div class="stat">
      <span class="label">Комиссия</span>
      <span class="value">${formatMoney(summary.commission)}</span>
    </div>
    <div class="stat">
      <span class="label">На руки</span>
      <span class="value">${formatMoney(summary.net)}</span>
    </div>
    <div class="payment-breakdown">
      <span class="dot-cash">●</span>
      Наличные: <strong>${summary.byPayment.cash.count}</strong>
      на <strong>${formatMoney(summary.byPayment.cash.amount)}</strong>
      <span class="dot-card">●</span>
      Карта: <strong>${summary.byPayment.card.count}</strong>
      на <strong>${formatMoney(summary.byPayment.card.amount)}</strong>
    </div>
  `;
}

function renderTrips(trips) {
  tripsList.innerHTML = "";
  emptyEl.classList.toggle("hidden", trips.length > 0);

  for (const trip of trips) {
    const li = document.createElement("li");
    li.className = "trip-item";
    const payLabel = trip.payment === "cash" ? "Наличные" : "Карта";
    const badgeClass = trip.payment === "cash" ? "badge-cash" : "badge-card";
    li.innerHTML = `
      <div>
        <div class="trip-time">${formatTime(trip.start)} – ${formatTime(trip.end)}</div>
        <div class="trip-meta">комиссия ${formatMoney(trip.commission)} · ${trip.id}</div>
      </div>
      <div>
        <div class="trip-amount">${formatMoney(trip.amount)}</div>
        <div class="trip-pay"><span class="badge ${badgeClass}">${payLabel}</span></div>
      </div>
    `;
    tripsList.appendChild(li);
  }
}

async function loadDates() {
  const res = await fetch("/api/dates");
  const data = await res.json();
  availableDates = data.dates || [];
  if (!dateInput.value && availableDates.length) {
    dateInput.value = availableDates[availableDates.length - 1];
  }
  updateNavButtons();
}

function updateNavButtons() {
  const date = dateInput.value;
  if (!availableDates.length) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  const idx = availableDates.indexOf(date);
  if (idx === -1) {
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    return;
  }
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= availableDates.length - 1;
}

async function loadDay() {
  const date = dateInput.value;
  if (!date) return;

  const res = await fetch(`/api/trips?date=${encodeURIComponent(date)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    summaryEl.innerHTML = `<p class="form-error">${err.error || "Ошибка загрузки"}</p>`;
    return;
  }

  const data = await res.json();
  renderSummary(data.summary);
  renderTrips(data.trips);
  updateNavButtons();
}

function toIsoLocal(datetimeLocal) {
  // datetime-local → ISO с фиксированным смещением +05:00 (как в примере данных)
  if (!datetimeLocal) return "";
  return `${datetimeLocal}:00+05:00`;
}

toggleFormBtn.addEventListener("click", () => {
  tripForm.classList.toggle("hidden");
  formError.hidden = true;
  formOk.hidden = true;
});

prevBtn.addEventListener("click", () => {
  const date = dateInput.value;
  const idx = availableDates.indexOf(date);
  if (idx > 0) {
    dateInput.value = availableDates[idx - 1];
  } else {
    dateInput.value = shiftDate(date, -1);
  }
  loadDay();
});

nextBtn.addEventListener("click", () => {
  const date = dateInput.value;
  const idx = availableDates.indexOf(date);
  if (idx >= 0 && idx < availableDates.length - 1) {
    dateInput.value = availableDates[idx + 1];
  } else {
    dateInput.value = shiftDate(date, 1);
  }
  loadDay();
});

dateInput.addEventListener("change", () => loadDay());

tripForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formOk.hidden = true;

  const fd = new FormData(tripForm);
  const id = String(fd.get("id") || "").trim();
  const payload = {
    start: toIsoLocal(fd.get("start")),
    end: toIsoLocal(fd.get("end")),
    amount: Number(fd.get("amount")),
    commission: Number(fd.get("commission")),
    payment: fd.get("payment"),
  };
  if (id) payload.id = id;

  const res = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    formError.textContent = data.error || "Ошибка сохранения";
    formError.hidden = false;
    return;
  }

  formOk.textContent = data.created
    ? "Поездка добавлена"
    : "Такая поездка уже есть — дубль не создан";
  formOk.hidden = false;

  if (data.created) {
    tripForm.reset();
  }

  await loadDates();
  const tripDate = data.trip.start.slice(0, 10);
  dateInput.value = tripDate;
  await loadDay();
});

await loadDates();
if (!dateInput.value) {
  dateInput.value = "2026-10-01";
}
await loadDay();
