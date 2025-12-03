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
    removeModal.classList.add("show");          // 🔴 важливо: .show, як у CSS
    removeModal.setAttribute("aria-hidden", "false");
  }

  function closeRemoveModal() {
    if (!removeModal) return;
    removeModal.classList.remove("show");       // 🔴 теж .show
    removeModal.setAttribute("aria-hidden", "true");
  }

  // =======================
  //  Рендер списку (картки .card.dark)
  // =======================
  function renderDeadlines() {
    if (!list) return;

    list.innerHTML = "";

    if (!deadlines.length) {
      list.innerHTML = `<div class="empty">Поки що немає дедлайнів 🥲</div>`;
      return;
    }

    deadlines.forEach((d) => {
      const card = document.createElement("div");
      card.className = "card dark"; // під твої стилі

      card.innerHTML = `
        <div>
          <div class="card-top">
            <span class="tag">ДЕДЛАЙН</span>
          </div>
          <h3 class="card-title">${d.title}</h3>
          <div class="meta">
            <span>${d.date}</span>
          </div>
        </div>
      `;

      list.appendChild(card);
    });
  }

  // список у модалці видалення — теж у вигляді карт
  function fillRemoveList() {
    if (!removeList) return;

    removeList.innerHTML = "";

    if (!deadlines.length) {
      removeList.innerHTML = `<div class="empty">Немає що видаляти 🥲</div>`;
      return;
    }

    deadlines.forEach((d) => {
      const row = document.createElement("div");
      row.className = "card dark";

      const titleDiv = document.createElement("div");
      titleDiv.className = "card-title";
      titleDiv.textContent = d.title;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn danger small";  // danger + small є в CSS
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

  // "Додати дедлайн"
  addBtn?.addEventListener("click", () => {
    console.log("addBtn clicked");
    showView("add");
  });

  // "Скасувати" у формі
  cancelAddBtn?.addEventListener("click", () => {
    console.log("cancelAdd clicked");
    showView("list");
    resetAddForm();
  });

  // Сабміт форми
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

  // "Видалити"
  removeBtn?.addEventListener("click", () => {
    console.log("removeBtn clicked");
    fillRemoveList();
    openRemoveModal();
  });

  // Закрити модалку
  closeRemoveBtn?.addEventListener("click", () => {
    console.log("closeRemove clicked");
    closeRemoveModal();
  });

  // Клік по фону модалки → закрити
  removeModal?.addEventListener("click", (e) => {
    if (e.target === removeModal) {
      closeRemoveModal();
    }
  });

  // "Сортувати"
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

  // "Імпортувати"
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
