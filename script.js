// =======================
//  Telegram WebApp
// =======================
const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.expand();
  tg.ready?.();
}

// Базовий URL бекенду
const API_BASE = "https://nahadayka-backend.onrender.com/api";

// =======================
//  USER ID
// =======================
// Якщо запущено в Telegram WebApp → беремо tg.initDataUnsafe.user.id
// Якщо відкрито напряму в браузері → fallback "debug_user"
function getUserId() {
  return String(tg?.initDataUnsafe?.user?.id || "");
}
const USER_ID = getUserId();


// =======================
//  СТАН
// =======================
let deadlines = [];
let sortAsc = true;

// =======================
//  DOM-елементи
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
//  ХЕЛПЕРИ
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
  if (sortBtn) {
    sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
  }
};


// =======================
//  РЕНДЕР СПИСКУ
// =======================
const renderDeadlines = (items = deadlines) => {
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Дедлайнів не знайдено</div>';
    return;
  }

  const toRender = sortItems(items);

  toRender.forEach((item) => {
    const diffDays = calcDaysLeft(item.date);

    const card = document.createElement("article");
    card.className = `card ${
      diffDays <= 7 && diffDays >= 0 ? "light" : "dark"
    }`;

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
    label.className = "label";
    const value = document.createElement("div");
    value.className = "value";

    if (diffDays >= 0) {
      label.textContent = "Залишилось";
      value.textContent = `${diffDays} дн.`;
    } else {
      label.textContent = "Прострочено";
      value.textContent = "Спробуй не забути наступного разу";
    }

    due.append(label, value);
    card.append(left, due);
    list.appendChild(card);
  });
};


// =======================
//  РОБОТА З БЕКЕНДОМ
// =======================
const loadFromBackend = async () => {
  try {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`);
    if (!res.ok) throw new Error("Bad response");

    deadlines = await res.json();
    localStorage.setItem("deadlines", JSON.stringify(deadlines));
    renderDeadlines();
  } catch (err) {
    console.error("Не вдалось отримати дедлайни:", err);
    deadlines = JSON.parse(localStorage.getItem("deadlines")) || [];
    renderDeadlines();
  }
};

const addDeadlineToBackend = async (newDeadline) => {
  const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newDeadline),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Add failed");
  }
  return res.json();
};

const deleteDeadlineFromBackend = async (title) => {
  const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Delete failed");
  }
  return res.json();
};


// =======================
//  ОБРОБНИКИ КНОПОК
// =======================

// Імпорт з Google — надсилаємо сигнал боту і кілька разів тягнемо свіже з бекенду
if (importBtn) {
  importBtn.onclick = () => {
    if (tg) {
      // 1) кажемо боту: "зроби sync"
      tg.sendData(JSON.stringify({ action: "sync" }));

      // 2) можна показати користувачу повідомлення
      alert(
        "Імпорт даних... Якщо зʼявиться вікно Google — авторизуйся, " +
        "потім просто зачекай, поки я підтягну події."
      );

      // 3) періодично пробуємо підвантажити оновлений список дедлайнів
      const prevCount = deadlines.length;
      let attempts = 0;

      const intervalId = setInterval(async () => {
        attempts += 1;
        try {
          await loadFromBackend();
        } catch (e) {
          console.error("Помилка оновлення після імпорту:", e);
        }

        if (deadlines.length !== prevCount || attempts >= 6) {
          clearInterval(intervalId);

          if (deadlines.length !== prevCount) {
            console.log("🔥 Дані успішно імпортовано, список оновлено.");
          } else {
            console.log(
              "⚠️ Нові дані не знайдено. Можливо, імпорт не відбувся або ти не авторизувався у Google."
            );
          }
        }
      }, 5000);
    } else {
      fetch(`${API_BASE}/google_sync/${USER_ID}`, { method: "POST" })
        .then((res) => (res.ok ? loadFromBackend() : Promise.reject(res.status)))
        .catch((err) => alert("Помилка імпорту: " + err));
    }
  };
}

addBtn.onclick = () => showView("add");

sortBtn.onclick = () => {
  sortAsc = !sortAsc;
  updateSortLabel();
  renderDeadlines();
};

if (cancelAdd) {
  cancelAdd.onclick = () => {
    addForm.reset();
    showView("list");
  };
}

removeBtn.onclick = () => openRemoveModal();


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
  const newDeadline = { title, date: dateStr };

  try {
    const saved = await addDeadlineToBackend(newDeadline);
    deadlines.push(saved);
    localStorage.setItem("deadlines", JSON.stringify(deadlines));

    addForm.reset();
    showView("list");
    renderDeadlines();

    tg?.sendData?.(JSON.stringify(saved));
  } catch (err) {
    console.error("Не вдалось додати дедлайн:", err);
    alert("Не вдалось додати дедлайн: " + err.message);
  }
});


// =======================
//  ВИДАЛЕННЯ ДЕДЛАЙНІВ
// =======================
function openRemoveModal() {
  renderRemoveList();
  removeModal.classList.add("show");
  removeModal.setAttribute("aria-hidden", "false");
}

function closeRemoveModal() {
  removeModal.classList.remove("show");
  removeModal.setAttribute("aria-hidden", "true");
}

function renderRemoveList() {
  removeList.innerHTML = "";

  if (!deadlines.length) {
    removeList.innerHTML = '<div class="empty">Дедлайнів не знайдено</div>';
    return;
  }

  const toRender = sortItems(deadlines);
  toRender.forEach((item) => {
    const diffDays = calcDaysLeft(item.date);

    const card = document.createElement("article");
    card.className = `card ${
      diffDays <= 7 && diffDays >= 0 ? "light" : "dark"
    }`;

    const left = document.createElement("div");
    const titleEl = document.createElement("h3");
    titleEl.className = "card-title";
    titleEl.textContent = item.title;

    const date = document.createElement("div");
    date.className = "meta";
    date.textContent = `До: ${item.date}`;
    left.append(titleEl, date);

    const actions = document.createElement("div");
    actions.className = "due";
    const btn = document.createElement("button");
    btn.className = "btn danger small";
    btn.textContent = "Видалити";
    btn.onclick = () => handleDeleteDeadline(item.title);
    actions.appendChild(btn);

    card.append(left, actions);
    removeList.appendChild(card);
  });
}

async function handleDeleteDeadline(title) {
  try {
    await deleteDeadlineFromBackend(title);
    deadlines = deadlines.filter((d) => d.title !== title);
    localStorage.setItem("deadlines", JSON.stringify(deadlines));

    renderDeadlines();
    renderRemoveList();

    tg?.sendData?.(JSON.stringify({ action: "delete", title }));
    alert(`Дедлайн "${title}" видалено.`);
  } catch (err) {
    console.error("Не вдалось видалити дедлайн:", err);
    alert("Не вдалось видалити дедлайн: " + err.message);
  }
}

// Закриття модалки
closeRemove.addEventListener("click", closeRemoveModal);
removeModal.addEventListener("click", (e) => {
  if (e.target === removeModal) closeRemoveModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeRemoveModal();
});


// =======================
//  Старт
// =======================
updateSortLabel();
loadFromBackend();
