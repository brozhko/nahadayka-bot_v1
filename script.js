document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  // =======================
  //  Telegram WebApp
  // =======================
  const tg = window.Telegram?.WebApp || null;

  if (tg) {
    tg.expand();
    tg.ready?.();
  }

  // =======================
  //  API
  // =======================
  const API_BASE = "https://nahadayka-backend.onrender.com/api";

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
  let sortAsc = true;

  // =======================
  //  DOM-елементи
  // =======================
  const viewList = document.getElementById("view-list");
  const viewAdd = document.getElementById("view-add");

  const list = document.getElementById("list");

  const addBtn = document.getElementById("addBtn");
  const removeBtn = document.getElementById("removeBtn");
  const sortBtn = document.getElementById("sortBtn");
  const importBtn = document.getElementById("importBtn");

  const addForm = document.getElementById("addForm");
  const titleInput = document.getElementById("title");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const cancelAddBtn = document.getElementById("cancelAdd");

  const removeModal = document.getElementById("removeModal");
  const removeList = document.getElementById("removeList");
  const closeRemoveBtn = document.getElementById("closeRemove");

  // =======================
  //  В'юхи
  // =======================
  function showView(name) {
    if (!viewList || !viewAdd) return;

    if (name === "add") {
      viewAdd.classList.add("active");
      viewList.classList.remove("active");
    } else {
      viewList.classList.add("active");
      viewAdd.classList.remove("active");
    }
  }

  // =======================
  //  Модалка видалення
  // =======================
  function openRemoveModal() {
    if (!removeModal) return;
    removeModal.classList.add("open");
    removeModal.setAttribute("aria-hidden", "false");
  }

  function closeRemoveModal() {
    if (!removeModal) return;
    removeModal.classList.remove("open");
    removeModal.setAttribute("aria-hidden", "true");
  }

  // =======================
  //  Рендер списку
  // =======================
  function renderDeadlines() {
    if (!list) return;

    list.innerHTML = "";

    if (!deadlines.length) {
      list.innerHTML = "<p>Поки що немає дедлайнів 🥲</p>";
      return;
    }

    deadlines.forEach((d) => {
      const item = document.createElement("div");
      item.className = "list-item";

      item.innerHTML = `
        <div class="item-main">
          <div class="deadline-title">${d.title}</div>
          <div class="deadline-date">${d.date}</div>
        </div>
      `;

      list.appendChild(item);
    });
  }

  function fillRemoveList() {
    if (!removeList) return;

    removeList.innerHTML = "";

    if (!deadlines.length) {
      removeList.innerHTML = "<p>Немає що видаляти 🥲</p>";
      return;
    }

    deadlines.forEach((d) => {
      const row = document.createElement("div");
      row.className = "list-item";

      const titleDiv = document.createElement("div");
      titleDiv.className = "deadline-title";
      titleDiv.textContent = d.title;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn danger";
      btn.textContent = "Видалити";

      btn.addEventListener("click", async () => {
        console.log("Delete clicked for:", d.title);
        try {
          await deleteDeadlineApi(d.title);
        } catch (err) {
          console.error(err);
          alert("Не вдалося видалити дедлайн");
        }
      });

      row.appendChild(titleDiv);
      row.appendChild(btn);
      removeList.appendChild(row);
    });
  }

  // =======================
  //  API-запити
  // =======================
  async function loadDeadlines() {
    try {
      const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`);
      if (!res.ok) throw new Error("Failed to load deadlines");
      deadlines = await res.json();
      console.log("Loaded deadlines:", deadlines);
      renderDeadlines();
      fillRemoveList();
    } catch (err) {
      console.error("loadDeadlines error:", err);
    }
  }

  async function addDeadlineApi(title, date) {
    const body = { title, date };

    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to add deadline");

    const item = await res.json();
    deadlines.push(item);
    renderDeadlines();
    fillRemoveList();
  }

  async function deleteDeadlineApi(title) {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) throw new Error("Failed to delete deadline");

    deadlines = deadlines.filter((d) => d.title !== title);
    renderDeadlines();
    fillRemoveList();
  }

  async function importFromGoogle() {
    try {
      const res = await fetch(`${API_BASE}/google_login/${USER_ID}`);
      if (!res.ok) throw new Error("Failed to get Google auth URL");
      const data = await res.json();

      const url = data.auth_url;
      console.log("Google auth URL:", url);

      if (tg) {
        tg.openLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("importFromGoogle error:", err);
    }
  }

  // =======================
  //  Хелпери
  // =======================
  function formatDateTime(dateStr, timeStr) {
    if (!dateStr) return "";
    if (!timeStr) return dateStr;
    return `${dateStr} ${timeStr}`;
  }

  function resetAddForm() {
    if (!addForm) return;
    addForm.reset();
    if (timeInput) timeInput.value = "18:00";
  }

  // =======================
  //  Обробники подій
  // =======================

  // Кнопка "Додати дедлайн"
  addBtn?.addEventListener("click", () => {
    console.log("addBtn clicked");
    showView("add");
  });

  // Кнопка "Скасувати" в формі
  cancelAddBtn?.addEventListener("click", () => {
    console.log("cancelAdd clicked");
    showView("list");
    resetAddForm();
  });

  // Сабміт форми додавання
  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("addForm submit");

    const title = titleInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;

    if (!title || !date) {
      alert("Введи назву і дату");
      return;
    }

    const fullDate = formatDateTime(date, time);

    try {
      await addDeadlineApi(title, fullDate);
      resetAddForm();
      showView("list");
    } catch (err) {
      console.error(err);
      alert("Не вдалося додати дедлайн");
    }
  });

  // Кнопка "Видалити"
  removeBtn?.addEventListener("click", () => {
    console.log("removeBtn clicked");
    fillRemoveList();
    openRemoveModal();
  });

  // Закрити модалку видалення
  closeRemoveBtn?.addEventListener("click", () => {
    console.log("closeRemove clicked");
    closeRemoveModal();
  });

  // Клік по фону модалки, щоб закрити
  removeModal?.addEventListener("click", (e) => {
    if (e.target === removeModal) {
      closeRemoveModal();
    }
  });

  // Кнопка "Сортувати"
  sortBtn?.addEventListener("click", () => {
    console.log("sortBtn clicked");

    if (!deadlines.length) return;

    deadlines.sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      if (da < db) return sortAsc ? -1 : 1;
      if (da > db) return sortAsc ? 1 : -1;
      return 0;
    });

    sortAsc = !sortAsc;
    if (sortBtn) {
      sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
    }

    renderDeadlines();
  });

  // Кнопка "Імпортувати"
  importBtn?.addEventListener("click", () => {
    console.log("importBtn clicked");
    importFromGoogle();
  });

  // =======================
  //  Старт
  // =======================
  showView("list");
  loadDeadlines();
});
