// --- Telegram WebApp compatibility ---
const tg = window.Telegram?.WebApp || null;
if (tg) tg.expand();

// --- API base URL (auto detect local or production) ---
const API_BASE = location.hostname === "127.0.0.1" || location.hostname === "localhost"
  ? "http://127.0.0.1:8000/api"
  : "https://nahadayka-backend.onrender.com/api";

// --- User ID (fallback for debug) ---
const USER_ID = tg?.initDataUnsafe?.user?.id?.toString() || "debug_user";

let deadlines = [];

// --- Elements ---
const list = document.getElementById('list');
const addBtn = document.getElementById('addBtn');
const removeBtn = document.getElementById('removeBtn');
const sortBtn = document.getElementById('sortBtn');
const viewList = document.getElementById('view-list');
const viewAdd = document.getElementById('view-add');
const addForm = document.getElementById('addForm');
const cancelAdd = document.getElementById('cancelAdd');
const removeModal = document.getElementById('removeModal');
const removeList = document.getElementById('removeList');
const closeRemove = document.getElementById('closeRemove');

let sortAsc = true;

// --- View switching ---
function showView(name) {
  if (name === 'add') {
    viewList.classList.remove('active');
    viewAdd.classList.add('active');
  } else {
    viewAdd.classList.remove('active');
    viewList.classList.add('active');
  }
}

// --- Utils ---
function calcDaysLeft(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function sortItems(items) {
  const sorted = [...items].sort((a, b) => calcDaysLeft(a.date) - calcDaysLeft(b.date));
  return sortAsc ? sorted : sorted.reverse();
}

// --- Render main list ---
function renderDeadlines(items = deadlines) {
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<div class="empty">Дедлайнів не знайдено</div>';
    return;
  }

  const toRender = sortItems(items);

  toRender.forEach((item) => {
    const diff = calcDaysLeft(item.date);

    const card = document.createElement('article');
    card.className = `card ${diff <= 7 && diff >= 0 ? 'light' : 'dark'}`;

    const left = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title;

    const date = document.createElement('div');
    date.className = 'meta';
    date.textContent = `📅 ${item.date}`;

    left.append(title, date);

    const due = document.createElement('div');
    due.className = 'due';

    const label = document.createElement('div');
    label.className = 'label';
    const value = document.createElement('div');
    value.className = 'value';

    if (diff >= 0) {
      label.textContent = 'ЗАЛИШИЛОСЬ';
      value.textContent = `${diff} ДНІВ`;
    } else {
      label.textContent = 'СТАТУС';
      value.textContent = 'ДЕДЛАЙН МИНУВ';
    }

    due.append(label, value);

    card.append(left, due);
    list.appendChild(card);
  });
}

// --- Backend operations ---
async function loadFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`);
    if (!res.ok) throw new Error("Bad response");

    deadlines = await res.json();
    localStorage.setItem('deadlines', JSON.stringify(deadlines));
    renderDeadlines();
  } catch (err) {
    console.error("⚠️ Не вдалося завантажити бекенд:", err);
    deadlines = JSON.parse(localStorage.getItem('deadlines')) || [];
    renderDeadlines();
  }
}

async function addDeadlineToBackend(deadline) {
  const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deadline)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Add failed");
  }
  return res.json();
}

async function deleteDeadlineFromBackend(title) {
  const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Delete failed");
  }

  return res.json();
}

// --- Handlers ---
addBtn.onclick = () => showView('add');

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = addForm.title.value.trim();
  const date = addForm.date.value;
  const time = addForm.time.value;

  if (!title || !date) return;

  const datetime = time ? `${date} ${time}` : date;

  const newDeadline = { title, date: datetime };

  try {
    const saved = await addDeadlineToBackend(newDeadline);
    deadlines.push(saved);
    localStorage.setItem('deadlines', JSON.stringify(deadlines));

    renderDeadlines();
    addForm.reset();
    showView('list');

    if (tg) tg.sendData(JSON.stringify(saved));

  } catch (err) {
    alert("Не вдалося додати: " + err.message);
    console.error(err);
  }
});

removeBtn.onclick = () => openRemoveModal();

sortBtn.onclick = () => {
  sortAsc = !sortAsc;
  sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
  renderDeadlines();
};

if (cancelAdd) {
  cancelAdd.onclick = () => {
    addForm.reset();
    showView('list');
  };
}

function openRemoveModal() {
  renderRemoveList();
  removeModal.classList.add('show');
  removeModal.setAttribute('aria-hidden', 'false');
}

function closeRemoveModal() {
  removeModal.classList.remove('show');
  removeModal.setAttribute('aria-hidden', 'true');
}

// --- Render removing list ---
function renderRemoveList() {
  removeList.innerHTML = '';

  if (deadlines.length === 0) {
    removeList.innerHTML = '<div class="empty">Дедлайнів немає</div>';
    return;
  }

  const sorted = sortItems(deadlines);

  sorted.forEach(item => {
    const diff = calcDaysLeft(item.date);

    const card = document.createElement('article');
    card.className = `card ${diff <= 7 && diff >= 0 ? 'light' : 'dark'}`;

    const left = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title;

    const date = document.createElement('div');
    date.className = 'meta';
    date.textContent = `📅 ${item.date}`;

    left.append(title, date);

    const actions = document.createElement('div');
    actions.className = 'due';

    const btn = document.createElement('button');
    btn.className = 'btn danger small';
    btn.textContent = 'Видалити';
    btn.onclick = () => handleDeleteDeadline(item.title);

    actions.appendChild(btn);

    card.append(left, actions);
    removeList.appendChild(card);
  });
}

async function handleDeleteDeadline(title) {
  try {
    await deleteDeadlineFromBackend(title);

    deadlines = deadlines.filter(d => d.title !== title);
    localStorage.setItem('deadlines', JSON.stringify(deadlines));

    renderDeadlines();
    renderRemoveList();

    if (tg) tg.sendData(JSON.stringify({ action: "delete", title }));

    alert(`❌ Видалено: ${title}`);

  } catch (err) {
    alert("Помилка видалення: " + err.message);
    console.error(err);
  }
}

closeRemove.addEventListener('click', closeRemoveModal);
removeModal.addEventListener('click', e => {
  if (e.target === removeModal) closeRemoveModal();
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeRemoveModal();
});

// --- Initial load ---
loadFromBackend();
