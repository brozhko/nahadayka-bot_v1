console.log("Telegram WebApp:", window.Telegram?.WebApp);
console.log("initDataUnsafe:", window.Telegram?.WebApp?.initDataUnsafe);

const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.expand();
  tg.ready?.();
}

// =======================
//  USER ID (ГАРАНТОВАНИЙ)
// =======================
function getUserId() {
  return String(tg?.initDataUnsafe?.user?.id || "debug_user");
}
const USER_ID = getUserId();

console.log("USER_ID =", USER_ID);

// =======================
//  API URL
// =======================
const API_BASE = "https://nahadayka-backend.onrender.com/api";

// =======================
//  СТАН
// =======================
let deadlines = [];
let sortAsc = true;

// =======================
//  DOM
// =======================
const list = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");
const sortBtn = document.getElementById("sortBtn");
const importBtn = document.getElementById("importBtn");

const viewList = document.getElementById("view-list");
const viewAdd = document.getElementById("view-add");
const addForm = document.getElementById("addForm");
const cancelAdd = document.getElementById("cancelAdd");

const removeModal = document.getElementById("removeModal");
const removeList = document.getElementById("removeList");
const closeRemove = document.getElementById("closeRemove");

// =======================
//  ВІДОБРАЖЕННЯ
// =======================
const showView = (name) => {
  if (name === "add") {
    viewList.classList.remove("active");
    viewAdd.classList.add("active");
  } else {
    viewAdd.classList.remove("active");
    viewList.classList.add("active");
  }
};

const calcDaysLeft = (dateStr) => {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const sortItems = (items) => {
  const sorted = [...items].sort(
    (a, b) => calcDaysLeft(a.date) - calcDaysLeft(b.date)
  );
  return sortAsc ? sorted : sorted.reverse();
};

const updateSortLabel = () => {
  sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
};

const renderDeadlines = (items = deadlines) => {
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Дедлайнів не знайдено</div>';
    return;
  }

  const sorted = sortItems(items);

  sorted.forEach((item) => {
    const diff = calcDaysLeft(item.date);

    const card = document.createElement("article");
    card.className = `card ${diff <= 7 && diff >= 0 ? "light" : "dark"}`;

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = item.title;

    const date = document.createElement("div");
    date.className = "meta";
    date.textContent = `До: ${item.date}`;

    left.append(title, date);

    const due = document.createElement("div");
    due.className = "due";
    const label = document.createElement("div");
    label.textContent = diff >= 0 ? "Залишилось" : "Прострочено";

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = diff >= 0 ? `${diff} дн.` : "🤡";
    due.append(label, value);

    card.append(left, due);
    list.appendChild(card);
  });
};

// =======================
//  API
// =======================
const loadFromBackend = async () => {
  try {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`);
    if (!res.ok) throw new Error("bad");

    deadlines = await res.json();
    localStorage.setItem("deadlines", JSON.stringify(deadlines));
    renderDeadlines();
  } catch (e) {
    deadlines = JSON.parse(localStorage.getItem("deadlines")) || [];
    renderDeadlines();
  }
};

const addDeadlineToBackend = async (dl) => {
  const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dl),
  });
  if (!res.ok) throw new Error("Add failed");
  return res.json();
};

const deleteDeadlineFromBackend = async (title) => {
  const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
};

// =======================
//  📥 ІМПОРТ GOOGLE
// =======================
if (importBtn) {
  importBtn.onclick = () => {
    console.log("IMPORT CLICKED");
console.log("USER_ID =", USER_ID);
console.log("tg =", tg);

    tg.sendData(
      JSON.stringify({
        action: "sync",
        user_id: USER_ID,
      })
    );

    alert("Імпорт розпочато! Якщо зʼявиться Google — авторизуйся.");

    let attempts = 0;
    const oldCount = deadlines.length;

    const timer = setInterval(async () => {
      attempts++;

      try {
        await loadFromBackend();
      } catch {}

      if (deadlines.length !== oldCount || attempts >= 6) {
        clearInterval(timer);
      }
    }, 5000);
  };
}

// =======================
//  Додавання дедлайну
// =======================
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = addForm.title.value.trim();
  const date = addForm.date.value;
  const time = addForm.time.value;

  if (!title || !date) return;

  const dateStr = time ? `${date} ${time}` : date;
  const newDl = { title, date: dateStr };

  try {
    const saved = await addDeadlineToBackend(newDl);
    deadlines.push(saved);
    localStorage.setItem("deadlines", JSON.stringify(deadlines));

    showView("list");
    renderDeadlines();

    tg.sendData(JSON.stringify({ action: "add", user_id: USER_ID, ...saved }));
  } catch (e) {
    alert("Помилка додавання дедлайну.");
  }
});

// =======================
//  Видалення
// =======================
removeBtn.onclick = () => {
  renderRemoveList();
  removeModal.classList.add("show");
};

function renderRemoveList() {
  removeList.innerHTML = "";

  if (!deadlines.length) {
    removeList.innerHTML = "<div>Немає</div>";
    return;
  }

  const sorted = sortItems(deadlines);
  sorted.forEach((item) => {
    const row = document.createElement("div");
    row.className = "remove-item";

    const title = document.createElement("span");
    title.textContent = item.title;

    const btn = document.createElement("button");
    btn.textContent = "Видалити";
    btn.onclick = () => handleDelete(item.title);

    row.append(title, btn);
    removeList.append(row);
  });
}

async function handleDelete(title) {
  await deleteDeadlineFromBackend(title);

  deadlines = deadlines.filter((d) => d.title !== title);
  localStorage.setItem("deadlines", JSON.stringify(deadlines));

  renderDeadlines();
  renderRemoveList();

  tg.sendData(
    JSON.stringify({ action: "delete", user_id: USER_ID, title })
  );
}

// =======================
// START
// =======================
updateSortLabel();
loadFromBackend();
