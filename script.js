const tg = window.Telegram.WebApp;
tg.expand();

let deadlines = JSON.parse(localStorage.getItem('deadlines')) || [];

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

function showView(name) {
  if (name === 'add') {
    viewList.classList.remove('active');
    viewAdd.classList.add('active');
  } else {
    viewAdd.classList.remove('active');
    viewList.classList.add('active');
  }
}

function saveData() { localStorage.setItem('deadlines', JSON.stringify(deadlines)); }

let sortAsc = true;
function sortItems(items) {
  const sorted = [...items].sort((a, b) => calcDaysLeft(a.date) - calcDaysLeft(b.date));
  return sortAsc ? sorted : sorted.reverse();
}

function renderDeadlines(items = deadlines) {
  list.innerHTML = '';
  if (items.length === 0) {
    list.innerHTML = '<div class="empty">Дедлайнів не знайдено</div>';
    return;
  }

  const toRender = sortItems(items);
  toRender.forEach((item) => {
    const diffDays = calcDaysLeft(item.date);

    const card = document.createElement('article');
    card.className = `card ${diffDays <= 7 && diffDays >= 0 ? 'light' : 'dark'}`;

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
    if (diffDays >= 0) {
      label.textContent = 'ЗАЛИШИЛОСЬ';
      value.textContent = `${diffDays} ДНІВ`;
    } else {
      label.textContent = 'СТАТУС';
      value.textContent = 'ДЕДЛАЙН МИНУВ';
    }
    due.append(label, value);

    card.append(left, due);
    list.appendChild(card);
  });
}

function calcDaysLeft(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

addBtn.onclick = () => showView('add');

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = addForm.title.value.trim();
  const date = addForm.date.value;
  const time = addForm.time.value;
  if (!title || !date) return;
  const dateStr = time ? `${date} ${time}` : date;
  const newDeadline = { title, date: dateStr };

  deadlines.push(newDeadline);
  saveData();
  addForm.reset();
  showView('list');
  renderDeadlines();

// --- ВІДПРАВКА ДАНИХ У БОТА ---
try {
  tg?.sendData && tg.sendData(JSON.stringify(newDeadline));
  console.log("✅ Дані надіслані в Telegram:", newDeadline);
} catch (err) {
  console.error("⚠️ Помилка відправки даних у бота:", err);
}
});

removeBtn.onclick = () => openRemoveModal();

sortBtn.onclick = () => {
  sortAsc = !sortAsc;
  sortBtn.textContent = sortAsc ? 'Сортувати ↑' : 'Сортувати ↓';
  renderDeadlines();
};

if (cancelAdd) {
  cancelAdd.onclick = () => { addForm.reset(); showView('list'); };
}

if (sortBtn) sortBtn.textContent = sortAsc ? 'Сортувати ↑' : 'Сортувати ↓';

renderDeadlines();


function openRemoveModal(){
  renderRemoveList();
  removeModal.classList.add('show');
  removeModal.setAttribute('aria-hidden','false');
}
function closeRemoveModal(){
  removeModal.classList.remove('show');
  removeModal.setAttribute('aria-hidden','true');
}
function renderRemoveList() {
  removeList.innerHTML = '';
  if (deadlines.length === 0) {
    removeList.innerHTML = '<div class="empty">Дедлайнів не знайдено</div>';
    return;
  }

  const toRender = sortItems(deadlines);
  toRender.forEach((item) => {
    const diffDays = calcDaysLeft(item.date);
    const card = document.createElement('article');
    card.className = `card ${diffDays <= 7 && diffDays >= 0 ? 'light' : 'dark'}`;

    const left = document.createElement('div');
    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = item.title;
    const date = document.createElement('div');
    date.className = 'meta';
    date.textContent = `📅 ${item.date}`;
    left.append(titleEl, date);

    const actions = document.createElement('div');
    actions.className = 'due';
    const btn = document.createElement('button');
    btn.className = 'btn danger small';
    btn.textContent = 'Видалити';
    btn.onclick = () => deleteDeadline(item.title);
    actions.appendChild(btn);

    card.append(left, actions);
    removeList.appendChild(card);
  });
}

function deleteDeadline(title) {
  // 1️⃣ Видаляємо локально
  deadlines = deadlines.filter(d => d.title !== title);
  localStorage.setItem("deadlines", JSON.stringify(deadlines));
  renderDeadlines();
  renderRemoveList();

  // 2️⃣ Відправляємо дані у Telegram
  try {
    const tg = window.Telegram.WebApp;
    const payload = { action: "delete", title };
    tg.sendData(JSON.stringify(payload));
    console.log("❌ Відправлено у Telegram:", payload);
  } catch (err) {
    console.error("⚠️ Помилка відправки delete:", err);
  }

  // 3️⃣ Повідомлення користувачу
  alert(`❌ Дедлайн "${title}" видалено.`);
}


closeRemove.addEventListener('click', closeRemoveModal);
removeModal.addEventListener('click', (e) => { if (e.target === removeModal) closeRemoveModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRemoveModal(); });

function deleteDeadline(title) {
  // видаляємо з локального сховища
  deadlines = deadlines.filter(d => d.title !== title);
  localStorage.setItem("deadlines", JSON.stringify(deadlines));

  // показуємо оновлений список
  renderDeadlines();

  // повідомляємо Telegram про видалення
  const tg = window.Telegram.WebApp;
  tg.sendData(JSON.stringify({
    action: "delete",
    title: title
  }));

  alert(`❌ Дедлайн "${title}" видалено.`);
}
