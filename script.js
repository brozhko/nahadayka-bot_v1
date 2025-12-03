// =======================
//  Telegram WebApp
// =======================
const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.expand();
  tg.ready?.();
}

// =======================
//  БАЗОВІ НАЛАШТУВАННЯ
// =======================

// 🔴 якщо тестуєш локально з Flask: "http://127.0.0.1:8000/api"
// 🔴 якщо вже на Render: "https://nahadayka-backend.onrender.com/api"
const API_BASE = "https://nahadayka-backend.onrender.com/api";

// USER_ID: з Telegram або debug_user
function getUserId() {
  const id = tg?.initDataUnsafe?.user?.id;
  const uid = id ? String(id) : "debug_user";
  console.log("USER_ID =", uid);
  return uid;
}

const USER_ID = getUserId();

// =======================
//  СТАН
// =======================
let deadlines = [];
let sortAsc = true; // true = найраніші вгорі

// =======================
//  DOM елементи
// =======================
const viewList = document.getElementById("view-list");
const viewAdd = document.getElementById("view-add");

const listEl = document.getElementById("list");
const removeModal = document.getElementById("removeModal");
const removeListEl = document.getElementById("removeList");

const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");
const sortBtn = document.getElementById("sortBtn");
const importBtn = document.getElementById("importBtn");

const addForm = document.getElementById("addForm");
const cancelAddBtn = document.getElementById("cancelAdd");
const closeRemoveBtn = document.getElementById("closeRemove");

// =======================
//  Допоміжні функції
// =======================

function showView(name) {
  if (name === "list") {
    viewList.classList.add("active");
    viewAdd.classList.remove("active");
  } else if (name === "add") {
    viewAdd.classList.add("active");
    viewList.classList.remove("active");
  }
}

function openRemoveModal() {
  removeModal.classList.add("show");
}

function closeRemoveModal() {
  removeModal.classList.remove("show");
}

// Формуємо красивий текст дати/часу та "залишилось"
function formatDue(dueStr) {
  if (!dueStr) return { dateText: "", timeText: "", remaining: "" };

  // очікуємо формат "YYYY-MM-DD HH:MM" або ISO
  let d = new Date(dueStr.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) {
    // fallback
    return { dateText: dueStr, timeText: "", remaining: "" };
  }

  const pad = (n) => String(n).padStart(2, "0");

  const dateText = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const timeText = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let remaining = "";
  if (diffMs < 0) {
    remaining = "Протерміновано";
  } else if (diffDays === 0) {
    remaining = "Сьогодні";
  } else if (diffDays === 1) {
    remaining = "Завтра";
  } else {
    remaining = `Через ${diffDays} дн.`;
  }

  return { dateText, timeText, remaining };
}

// Створюємо карточку дедлайну для списку
function createDeadlineCard(item) {
  const { dateText, timeText, remaining } = formatDue(item.due);

  const card = document.createElement("article");
  card.className = "card dark";

  card.innerHTML = `
    <div>
      <div class="card-top">
        <span class="tag">${item.source === "manual" ? "РУЧНИЙ" : item.source}</span>
      </div>
      <h3 class="card-title">${item.title || "Без назви"}</h3>
      <div class="meta">
        <span>${dateText} ${timeText ? "• " + timeText : ""}</span>
        ${remaining ? `<span>• ${remaining}</span>` : ""}
      </div>
    </div>
    <div class="due">
      <div class="label">ДЕДЛАЙН</div>
      <div class="value">${timeText || "--:--"}</div>
    </div>
  `;

  return card;
}

// =======================
//  API виклики
// =======================

async function loadDeadlines() {
  try {
    const res = await fetch(`${API_BASE}/deadlines?user_id=${USER_ID}`);
    deadlines = await res.json();
    console.log("Deadlines:", deadlines);
    renderList();
  } catch (err) {
    console.error("Помилка завантаження дедлайнів:", err);
    listEl.innerHTML = `<div class="empty">Не вдалося завантажити дедлайни 🥲</div>`;
  }
}

async function addDeadline(title, due, description = "") {
  const body = {
    user_id: USER_ID,
    title,
    due,
    description,
    source: "manual",
  };

  const res = await fetch(`${API_BASE}/deadlines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Помилка додавання дедлайну");
  }

  return await res.json();
}

async function deleteDeadline(id) {
  const res = await fetch(
    `${API_BASE}/deadlines/${id}?user_id=${USER_ID}`,
    { method: "DELETE" }
  );
  return await res.json();
}

async function importFromGoogleCalendar() {
  const res = await fetch(`${API_BASE}/import/google-calendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID }),
  });
  return await res.json();
}

// =======================
//  РЕНДЕРИНГ
// =======================

function renderList() {
  listEl.innerHTML = "";

  if (!deadlines || deadlines.length === 0) {
    listEl.innerHTML = `<div class="empty">Поки що немає жодного дедлайну. Натисни «Додати дедлайн» ⏱️</div>`;
    return;
  }

  const sorted = [...deadlines].sort((a, b) => {
    const aDue = a.due || "";
    const bDue = b.due || "";
    if (aDue < bDue) return sortAsc ? -1 : 1;
    if (aDue > bDue) return sortAsc ? 1 : -1;
    return 0;
  });

  sorted.forEach((item) => {
    const card = createDeadlineCard(item);
    listEl.appendChild(card);
  });
}

function renderRemoveList() {
  removeListEl.innerHTML = "";

  if (!deadlines || deadlines.length === 0) {
    removeListEl.innerHTML = `<div class="empty">Немає що видаляти.</div>`;
    return;
  }

  const sorted = [...deadlines].sort((a, b) => {
    const aDue = a.due || "";
    const bDue = b.due || "";
    if (aDue < bDue) return -1;
    if (aDue > bDue) return 1;
    return 0;
  });

  sorted.forEach((item) => {
    const { dateText, timeText } = formatDue(item.due);

    const row = document.createElement("article");
    row.className = "card dark";

    row.innerHTML = `
      <div>
        <h3 class="card-title">${item.title || "Без назви"}</h3>
        <div class="meta">
          <span>${dateText} ${timeText ? "• " + timeText : ""}</span>
        </div>
      </div>
      <div class="due">
        <button class="btn small danger">Видалити</button>
      </div>
    `;

    const btn = row.querySelector("button");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "…";
      try {
        await deleteDeadline(item.id);
        // оновити локальний список
        deadlines = deadlines.filter((d) => d.id !== item.id);
        renderList();
        renderRemoveList();
      } catch (err) {
        console.error("Помилка видалення:", err);
        btn.disabled = false;
        btn.textContent = "Видалити";
      }
    });

    removeListEl.appendChild(row);
  });
}

// =======================
//  ОБРОБНИКИ ПОДІЙ
// =======================

addBtn.addEventListener("click", () => {
  showView("add");
});

cancelAddBtn.addEventListener("click", () => {
  showView("list");
});

sortBtn.addEventListener("click", () => {
  sortAsc = !sortAsc;
  sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
  renderList();
});

removeBtn.addEventListener("click", () => {
  renderRemoveList();
  openRemoveModal();
});

closeRemoveBtn.addEventListener("click", () => {
  closeRemoveModal();
});

// Закриття модалки по кліку на фон
removeModal.addEventListener("click", (e) => {
  if (e.target === removeModal) {
    closeRemoveModal();
  }
});

// Форма додавання
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const titleInput = document.getElementById("title");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");

  const title = titleInput.value.trim();
  const date = dateInput.value; // YYYY-MM-DD
  const time = timeInput.value || "18:00"; // HH:MM

  if (!title || !date) return;

  // формат, який сортується нормально як строка
  const due = `${date} ${time}`;

  try {
    const created = await addDeadline(title, due);
    console.log("Створено дедлайн:", created);

    // оновлюємо локальний список
    deadlines.push(created);
    renderList();

    // очистити форму
    titleInput.value = "";
    // dateInput.value = ""; // можна залишити обране
    // timeInput.value = "18:00";

    showView("list");
  } catch (err) {
    console.error(err);
    alert("Не вдалося додати дедлайн 😢");
  }
});

// Імпорт (поки що → заглушка з бекенду)
importBtn.addEventListener("click", async () => {
  importBtn.disabled = true;
  importBtn.textContent = "Імпортую…";

  try {
    const imported = await importFromGoogleCalendar();
    console.log("Імпортовано:", imported);
    deadlines = deadlines.concat(imported);
    renderList();
  } catch (err) {
    console.error("Помилка імпорту:", err);
    alert("Не вдалося імпортувати з Google Calendar");
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = "Імпортувати";
  }
});

// =======================
//  СТАРТ
// =======================
loadDeadlines();
