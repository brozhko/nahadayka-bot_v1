// =======================
//  Telegram WebApp API
// =======================
const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.expand();
  tg.ready?.();
}

// =======================
//  BASE URL BACKEND
// =======================
const API_BASE = "https://nahadayka-backend.onrender.com/api";

// =======================
//  USER ID
// =======================
function getUserId() {
  const id = tg?.initDataUnsafe?.user?.id;
  return id ? String(id) : "debug_user";
}
const USER_ID = getUserId();

// =======================
//  STATE
// =======================
let deadlines = [];
let sortAsc = true; // true → A→Z, false → Z→A

// =======================
//  DOM
// =======================
const list = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");
const sortBtn = document.getElementById("sortBtn");
const importBtn = document.getElementById("importBtn");

// =======================
//  Функція рендера списку
// =======================
function renderList() {
  list.innerHTML = "";

  deadlines.forEach((d, i) => {
    const item = document.createElement("div");
    item.className = "item";

    item.innerHTML = `
      <div class="title">${d.title}</div>
      <div class="date">${d.date}</div>
    `;

    item.addEventListener("click", () => {
      document.querySelectorAll(".item").forEach(x => x.classList.remove("selected"));
      item.classList.add("selected");
      item.dataset.index = i;
    });

    list.appendChild(item);
  });
}

// =======================
//  LOAD deadlines
// =======================
async function loadDeadlines() {
  try {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`);
    deadlines = await res.json();
    renderList();
  } catch (e) {
    console.error("Помилка завантаження:", e);
  }
}

// =======================
//  ADD deadline
// =======================
addBtn.addEventListener("click", async () => {
  const title = prompt("Назва дедлайну:");
  if (!title) return;

  const date = prompt("Дата (YYYY-MM-DD):");
  if (!date) return;

  const newDeadline = { user_id: USER_ID, title, date };

  try {
    await fetch(`${API_BASE}/deadlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDeadline)
    });

    deadlines.push({ title, date });
    renderList();
  } catch (e) {
    alert("Помилка при додаванні дедлайну");
  }
});

// =======================
//  REMOVE deadline
// =======================
removeBtn.addEventListener("click", async () => {
  const selected = document.querySelector(".item.selected");
  if (!selected) return alert("Вибери дедлайн!");

  const index = [...document.querySelectorAll(".item")].indexOf(selected);
  const item = deadlines[index];

  try {
    await fetch(`${API_BASE}/deadlines/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        title: item.title,
        date: item.date
      })
    });

    deadlines.splice(index, 1);
    renderList();
  } catch (e) {
    alert("Помилка при видаленні");
  }
});

// =======================
//  SORT deadlines
// =======================
sortBtn.addEventListener("click", () => {
  sortAsc = !sortAsc;

  deadlines.sort((a, b) => {
    if (sortAsc) {
      return a.title.localeCompare(b.title);
    } else {
      return b.title.localeCompare(a.title);
    }
  });

  renderList();
});

// =======================
//  IMPORT (SEND DATA TO BOT)
// =======================
importBtn.addEventListener("click", () => {
  if (!tg) return alert("Telegram WebApp недоступний");

  tg.sendData(JSON.stringify({ action: "sync" }));

  tg.showPopup({
    title: "Імпорт",
    message: "Запит на імпорт надіслано боту!",
    buttons: [{ id: "ok", type: "default", text: "OK" }]
  });
});

// =======================
//  AUTO LOAD ON START
// =======================
loadDeadlines();
