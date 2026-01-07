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

  // remove modal
  const removeModal = document.getElementById("removeModal");
  const removeList = document.getElementById("removeList");
  const closeRemoveBtn = document.getElementById("closeRemove");

  // ✅ NEW: add choice modal
  const addChoiceModal = document.getElementById("addChoiceModal");
  const chooseManualBtn = document.getElementById("chooseManualBtn");
  const choosePhotoBtn = document.getElementById("choosePhotoBtn");
  const closeAddChoice = document.getElementById("closeAddChoice");
  const photoInput = document.getElementById("deadlinePhotoInput");

  // ✅ NEW: scan modal
  const scanModal = document.getElementById("scanModal");
  const scanList = document.getElementById("scanList");
  const scanAddSelected = document.getElementById("scanAddSelected");
  const scanCancel = document.getElementById("scanCancel");

  let lastScanItems = [];

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
  //  Модалки (уніфіковано через .show)
  // =======================
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add("show");
    modalEl.setAttribute("aria-hidden", "false");
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("show");
    modalEl.setAttribute("aria-hidden", "true");
  }

  // =======================
  //  Рендер списку
  // =======================
  function renderDeadlines() {
    if (!list) return;

    list.innerHTML = "";

    if (!deadlines.length) {
      list.innerHTML = `<div class="empty">Тут поки порожньо. Додайте дедлайн.</div>`;
      return;
    }

    deadlines.forEach((d) => {
      const status = buildDeadlineStatus(d.date);
      const displayDate = formatForDisplay(d.date);

      const card = document.createElement("div");
      card.className = "card dark";

      card.innerHTML = `
        <div>
          <div class="card-top">
            <span class="tag">Дедлайн</span>
          </div>
          <h3 class="card-title">${escapeHtml(d.title)}</h3>
          <div class="meta">
            <span>${escapeHtml(displayDate)}</span>
          </div>
        </div>
        <div class="due ${status.variant}">
          <div class="label">${status.label}</div>
          <div class="value">${status.value}</div>
        </div>
      `;

      list.appendChild(card);
    });
  }

  function fillRemoveList() {
    if (!removeList) return;

    removeList.innerHTML = "";

    if (!deadlines.length) {
      removeList.innerHTML = `<div class="empty">Немає що видаляти</div>`;
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
      btn.className = "btn danger small";
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
  //  ✅ NEW: рендер знайдених дедлайнів зі скану
  // =======================
  function renderScanItems(items) {
    if (!scanList) return;
    scanList.innerHTML = "";

    if (!items.length) {
      scanList.innerHTML = `<div class="empty">Нічого не знайшов 😕</div>`;
      return;
    }

    items.forEach((it, idx) => {
      const title = it.title || "Без назви";
      const date = it.date || "";
      const time = it.time || "";

      const row = document.createElement("div");
      row.className = "card dark";

      row.innerHTML = `
        <div style="display:flex; gap:10px; align-items:flex-start; width:100%;">
          <input type="checkbox" checked data-idx="${idx}" style="margin-top:6px;">
          <div style="flex:1;">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="meta"><span>${escapeHtml(date)} ${escapeHtml(time)}</span></div>
          </div>
        </div>
      `;
      scanList.appendChild(row);
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
        tg.openLink(url, { try_instant_view: true });
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("importFromGoogle error:", err);
    }
  }

  // ✅ NEW: scan image -> get deadlines
  async function scanImage(file) {
    const form = new FormData();
    form.append("image", file);
    form.append("uid", USER_ID); // якщо хочеш на бекенді знати користувача

    const res = await fetch(`${API_BASE}/scan_image`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error("Scan failed");
    }

    return await res.json(); // { items: [...] }
  }

  // =======================
  //  Хелпери
  // =======================
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(dateStr, timeStr) {
    if (!dateStr) return "";
    if (!timeStr) return dateStr;
    return `${dateStr} ${timeStr}`;
  }

  function normalizeDateString(dateStr) {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  }

  function toDateObj(dateStr) {
    const normalized = normalizeDateString(dateStr);
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function formatForDisplay(dateStr) {
    const d = toDateObj(dateStr);
    if (!d) return dateStr || "без дати";
    try {
      return d.toLocaleString("uk-UA", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      console.warn("formatForDisplay error:", err);
      return dateStr;
    }
  }

  function pluralDays(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "день";
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дні";
    return "днів";
  }

  function buildDeadlineStatus(dateStr) {
    const DAY = 24 * 60 * 60 * 1000;
    const HOUR = 60 * 60 * 1000;

    const dateObj = toDateObj(dateStr);
    if (!dateObj) {
      return { label: "СТАТУС", value: "Невідомо", note: "", variant: "unknown" };
    }

    const diff = dateObj.getTime() - Date.now();

    if (diff < 0) {
      return { label: "СТАТУС", value: "Протерміновано", note: "", variant: "overdue" };
    }

    const days = Math.floor(diff / DAY);
    const hours = Math.floor((diff % DAY) / HOUR);

    if (diff < HOUR) {
      return { label: "ЗАЛИШИЛОСЬ", value: "сьогодні", note: "", variant: "soon" };
    }

    if (days === 0) {
      return { label: "ЗАЛИШИЛОСЬ", value: `сьогодні (${hours || 1} год)`, note: "", variant: "soon" };
    }

    if (days === 1) {
      return { label: "ЗАЛИШИЛОСЬ", value: "1 день", note: "", variant: "soon" };
    }

    return { label: "ЗАЛИШИЛОСЬ", value: `${days} ${pluralDays(days)}`, note: "", variant: "ok" };
  }

  function resetAddForm() {
    if (!addForm) return;
    addForm.reset();
    if (timeInput) timeInput.value = "18:00";
  }

  // =======================
  //  Обробники подій
  // =======================

  // ✅ "Додати дедлайн" -> тепер відкриває вибір (вручну/фото)
  addBtn?.addEventListener("click", () => {
    console.log("addBtn clicked -> open addChoiceModal");
    openModal(addChoiceModal);
  });

  // ✅ Вибір "Вручну"
  chooseManualBtn?.addEventListener("click", () => {
    closeModal(addChoiceModal);
    showView("add");
  });

  // ✅ Вибір "Фото"
  choosePhotoBtn?.addEventListener("click", () => {
    photoInput.value = "";
    photoInput.click();
  });

  // ✅ Закрити вибір
  closeAddChoice?.addEventListener("click", () => {
    closeModal(addChoiceModal);
  });

  // ✅ Клік по фону модалки вибору -> закрити
  addChoiceModal?.addEventListener("click", (e) => {
    if (e.target === addChoiceModal) closeModal(addChoiceModal);
  });

  // ✅ Обробка фото
  photoInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    closeModal(addChoiceModal);

    try {
      const data = await scanImage(file);
      const items = Array.isArray(data.items) ? data.items : [];

      if (!items.length) {
        alert("Нічого не знайшов 😕 Спробуй інше фото або введи вручну.");
        return;
      }

      lastScanItems = items;
      renderScanItems(items);
      openModal(scanModal);
    } catch (err) {
      console.error(err);
      alert("Не вдалося просканувати фото. Спробуй ще раз.");
    }
  });

  // ✅ Додати вибране зі скану
  scanAddSelected?.addEventListener("click", async () => {
    const checks = [...scanList.querySelectorAll("input[type=checkbox]")];
    const selected = checks
      .filter((ch) => ch.checked)
      .map((ch) => lastScanItems[Number(ch.dataset.idx)]);

    if (!selected.length) {
      alert("Нічого не вибрано.");
      return;
    }

    try {
      for (const it of selected) {
        const title = (it.title || "").trim() || "Дедлайн";
        const date = (it.date || "").trim();
        const time = (it.time || "").trim() || "18:00";

        if (!date) continue;

        const fullDate = formatDateTime(date, time);
        await addDeadlineApi(title, fullDate);
      }

      closeModal(scanModal);
      alert("Додано ✅");
      showView("list");
    } catch (err) {
      console.error(err);
      alert("Не вдалося додати вибране.");
    }
  });

  // ✅ Скасувати скан
  scanCancel?.addEventListener("click", () => {
    closeModal(scanModal);
  });

  scanModal?.addEventListener("click", (e) => {
    if (e.target === scanModal) closeModal(scanModal);
  });

  // "Скасувати" у формі
  cancelAddBtn?.addEventListener("click", () => {
    console.log("cancelAdd clicked");
    showView("list");
    resetAddForm();
  });

  // Сабміт форми (вручну)
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
    openModal(removeModal);
  });

  // Закрити модалку видалення
  closeRemoveBtn?.addEventListener("click", () => {
    console.log("closeRemove clicked");
    closeModal(removeModal);
  });

  removeModal?.addEventListener("click", (e) => {
    if (e.target === removeModal) closeModal(removeModal);
  });

  // Сортування
  sortBtn?.addEventListener("click", () => {
    console.log("sortBtn clicked");

    if (!deadlines.length) return;

    deadlines.sort((a, b) => {
      const ta = toDateObj(a.date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const tb = toDateObj(b.date)?.getTime() ?? Number.POSITIVE_INFINITY;
      return sortAsc ? ta - tb : tb - ta;
    });

    sortAsc = !sortAsc;
    if (sortBtn) sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";

    renderDeadlines();
  });

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
