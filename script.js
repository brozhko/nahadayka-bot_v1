// =======================
// Telegram WebApp
// =======================
const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.expand();
  tg.ready?.();
}

// =======================
// Налаштування
// =======================
const API_BASE = "https://nahadayka-backend.onrender.com/api";

// Якщо ми всередині Telegram WebApp → беремо реальний id
// Якщо в звичайному браузері → "debug_user"
function getUserId() {
  const id = tg?.initDataUnsafe?.user?.id;
  const uid = id ? String(id) : "debug_user";
  console.log("USER_ID =", uid);
  return uid;
}

const USER_ID = getUserId();

// =======================
// Стан
// =======================
let deadlines = [];
let sortAsc = true;

// =======================
// DOM-елементи (зроби такі id в HTML)
// =======================
const listEl = document.getElementById("list");          // <ul id="list">
const importBtn = document.getElementById("importBtn");  // кнопка "Імпортувати"
const sortBtn = document.getElementById("sortBtn");      // кнопка "Сортувати"

// =======================
// Рендер списку
// =======================
function renderList() {
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!deadlines.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Немає дедлайнів";
    listEl.appendChild(li);
    return;
  }

  const items = [...deadlines];

  items.sort((a, b) => {
    const ta = new Date(a.due_at).getTime();
    const tb = new Date(b.due_at).getTime();
    return sortAsc ? ta - tb : tb - ta;
  });

  for (const d of items) {
    const li = document.createElement("li");
    li.className = "deadline-item";

    const dateStr = new Date(d.due_at).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    li.innerHTML = `
      <div class="title">${d.title}</div>
      <div class="meta">
        <span class="date">${dateStr}</span>
        <span class="subject">${d.subject || ""}</span>
      </div>
    `;

    listEl.appendChild(li);
  }
}

// =======================
// Завантаження дедлайнів з бекенда
// =======================
async function loadDeadlinesFromBackend() {
  try {
    const url = `${API_BASE}/deadlines?telegram_id=${encodeURIComponent(
      USER_ID
    )}`;
    console.log("GET", url);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    deadlines = Array.isArray(data.deadlines) ? data.deadlines : [];

    console.log("Отримані дедлайни:", deadlines);
    renderList();
  } catch (err) {
    console.error("Помилка імпорту:", err);
    alert("Не вдалося імпортувати дедлайни. Перевір бекенд.");
  }
}

// =======================
// Обробники кнопок
// =======================
if (importBtn) {
  importBtn.addEventListener("click", () => {
    loadDeadlinesFromBackend();
  });
}

if (sortBtn) {
  sortBtn.addEventListener("click", () => {
    sortAsc = !sortAsc;
    renderList();
  });
}

// При старті сторінки
document.addEventListener("DOMContentLoaded", () => {
  // Можеш одразу підвантажувати, або чекати на кнопку "Імпортувати"
  loadDeadlinesFromBackend();
});

