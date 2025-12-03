// ============================
//  Telegram WebApp API
// ============================
const tg = window.Telegram?.WebApp || null;
if (tg) {
  tg.expand();
  tg.ready?.();
}

// ============================
//  BACKEND API
// ============================
const API = "https://nahadayka-backend.onrender.com/api";

// ============================
//  USER ID
// ============================
function getUserId() {
  return tg?.initDataUnsafe?.user?.id
    ? String(tg.initDataUnsafe.user.id)
    : "debug_user";
}
const USER_ID = getUserId();

// ============================
//  DOM ЕЛЕМЕНТИ
// ============================
const list = document.getElementById("list");
const removeList = document.getElementById("removeList");

const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");
const sortBtn = document.getElementById("sortBtn");
const importBtn = document.getElementById("importBtn");

const viewList = document.getElementById("view-list");
const viewAdd = document.getElementById("view-add");

const addForm = document.getElementById("addForm");
const cancelAdd = document.getElementById("cancelAdd");

const removeModal = document.getElementById("removeModal");
const closeRemove = document.getElementById("closeRemove");

// ============================
//  STATE
// ============================
let deadlines = [];
let sortAsc = true;

// ============================
//  РЕНДЕР СПИСКУ
// ============================
function renderList() {
  list.innerHTML = "";

  deadlines.forEach((d) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="title">${d.title}</div>
      <div class="date">${formatDate(d.date)}</div>
    `;
    list.appendChild(el);
  });
}

// ============================
//  РЕНДЕР СПИСКУ ДЛЯ ВИДАЛЕННЯ
// ============================
function renderRemoveList() {
  removeList.innerHTML = "";

  deadlines.forEach((d, i) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="title">${d.title}</div>
      <div class="date">${formatDate(d.date)}</div>
    `;

    el.addEventListener("click", () => deleteDeadline(i));
    removeList.appendChild(el);
  });
}

// ============================
//  FORMAT DATE
// ============================
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================
//  LOAD DEADLINES
// ============================
async function loadDeadlines() {
  try {
    const res = await fetch(`${API}/deadlines/${USER_ID}`);
    deadlines = await res.json();
    renderList();
  } catch (e) {
    console.error("Помилка завантаження:", e);
  }
}

// ============================
//  ADD DEADLINE
// ============================
addBtn.addEventListener("click", () => {
  viewList.classList.remove("active");
  viewAdd.classList.add("active");
});

cancelAdd.addEventListener("click", () => {
  viewAdd.classList.remove("active");
  viewList.classList.add("active");
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = addForm.title.value;
  const date = addForm.date.value;
  const time = addForm.time.value || "18:00";

  const iso = `${date}T${time}:00`;

  const body = {
    user_id: USER_ID,
    title,
    date: iso,
  };

  await fetch(`${API}/deadlines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  deadlines.push(body);

  addForm.reset();
  viewAdd.classList.remove("active");
  viewList.classList.add("active");
  renderList();
});

// ============================
//  DELETE DEADLINE
// ============================
removeBtn.addEventListener("click", () => {
  removeModal.setAttribute("aria-hidden", "false");
  renderRemoveList();
});

closeRemove.addEventListener("click", () => {
  removeModal.setAttribute("aria-hidden", "true");
});

async function deleteDeadline(index) {
  const d = deadlines[index];

  await fetch(`${API}/deadlines/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      title: d.title,
      date: d.date,
    }),
  });

  deadlines.splice(index, 1);

  renderList();
  renderRemoveList();
}

// ============================
//  SORT DEADLINES
// ============================
sortBtn.addEventListener("click", () => {
  sortAsc = !sortAsc;

  deadlines.sort((a, b) =>
    sortAsc
      ? a.title.localeCompare(b.title)
      : b.title.localeCompare(a.title)
  );

  sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
  renderList();
});

// ============================
//  IMPORT (tg.sendData)
// ============================
importBtn.addEventListener("click", () => {
  if (!tg) return alert("Telegram WebApp недоступний!");

  tg.sendData(JSON.stringify({ action: "sync" }));

  tg.showPopup({
    title: "Імпорт",
    message: "Команда успішно відправлена боту!",
    buttons: [{ id: "ok", type: "default", text: "OK" }],
  });
});

// ============================
//  ON START
// ============================
loadDeadlines();
