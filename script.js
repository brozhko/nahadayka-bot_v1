document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  // =======================
  // Telegram WebApp
  // =======================
  const tg = window.Telegram?.WebApp || null;
  if (tg) {
    tg.expand();
    tg.ready?.();
  }

  // =======================
  // API
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
  // STATE
  // =======================
  let deadlines = [];
  let sortAsc = true;

  // =======================
  // DOM
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

  // ✅ bottom sheet: вибір способу
  const addChoiceModal = document.getElementById("addChoiceModal");
  const closeAddChoiceBtn = document.getElementById("closeAddChoice");
  const chooseManualBtn = document.getElementById("chooseManualBtn");
  const choosePhotoBtn = document.getElementById("choosePhotoBtn");

  // ✅ один input -> iOS меню (Фототека/Камера/Файл)
  const photoInput = document.getElementById("photoInput");

  // =======================
  // Views
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
  // Modals
  // =======================
  function openRemoveModal() {
    if (!removeModal) return;
    removeModal.classList.add("show");
    removeModal.setAttribute("aria-hidden", "false");
  }

  function closeRemoveModal() {
    if (!removeModal) return;
    removeModal.classList.remove("show");
    removeModal.setAttribute("aria-hidden", "true");
  }

  function openAddChoice() {
    if (!addChoiceModal) return;
    addChoiceModal.classList.add("show");
    addChoiceModal.setAttribute("aria-hidden", "false");
  }

  function closeAddChoice() {
    if (!addChoiceModal) return;
    addChoiceModal.classList.remove("show");
    addChoiceModal.setAttribute("aria-hidden", "true");
  }

  // =======================
  // Render
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
  // API calls
  // =======================
  async function loadDeadlines() {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`);
    if (!res.ok) throw new Error("Failed to load deadlines");
    deadlines = await res.json();
    renderDeadlines();
    fillRemoveList();
  }

  async function addDeadlineApi(title, date) {
    const body = { title, date };
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to add deadline");
    await loadDeadlines();
  }

  async function deleteDeadlineApi(title) {
    const res = await fetch(`${API_BASE}/deadlines/${USER_ID}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) throw new Error("Failed to delete deadline");
    await loadDeadlines();
  }

  async function importFromGoogle() {
    const res = await fetch(`${API_BASE}/google_login/${USER_ID}`);
    if (!res.ok) throw new Error("Failed to get Google auth URL");
    const data = await res.json();
    const url = data.auth_url;

    if (tg) tg.openLink(url, { try_instant_view: true });
    else window.open(url, "_blank");
  }

  // ✅ AI deadlines -> save
  async function addAiScannedToApi(deadlinesArr) {
    const res = await fetch(`${API_BASE}/add_ai_scanned/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadlines: deadlinesArr }),
    });

    if (!res.ok) throw new Error("Failed to add AI scanned deadlines");
    return await res.json(); // {status:"ok", added:n}
  }

  // =======================
  // ✅ AI PHOTO FLOW (NO OCR)
  // =======================
  async function handlePickedPhoto(file) {
    if (!file) return;

    try {
      // 1) send photo to AI scan
      const form = new FormData();
      form.append("image", file);
      form.append("uid", USER_ID);

      // (опційно) трошки UI
      if (choosePhotoBtn) choosePhotoBtn.textContent = "⏳ Аналізую фото...";

      const res = await fetch(`${API_BASE}/scan_deadlines_ai`, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (choosePhotoBtn) choosePhotoBtn.textContent = "Фото (AI)";

      // 429 ліміт
      if (res.status === 429) {
        alert(data?.message || "Ліміт AI на сьогодні вичерпаний. Спробуй завтра.");
        return;
      }

      if (!res.ok || data.error) {
        alert("Помилка AI: " + (data.detail || data.error || "unknown"));
        return;
      }

      const found = Array.isArray(data.deadlines) ? data.deadlines : [];

      if (!found.length) {
        alert("На фото не знайдено дедлайнів 😕");
        return;
      }

      // 2) show confirm to user
      let msg = "🤖 Знайдено дедлайни:\n\n";
      found.forEach((d, i) => {
        msg += `${i + 1}) ${d.title}\n📅 ${d.due_date} ${d.due_time}\n`;
        msg += `⭐ confidence: ${d.confidence}\n\n`;
      });

      if (data.cached) msg += "✅ (кеш: це фото вже аналізували)\n";
      if (typeof data.remaining_today === "number") msg += `Залишилось сканів сьогодні: ${data.remaining_today}\n`;

      const ok = confirm(msg + "\n➕ Додати в список?");
      if (!ok) return;

      // 3) save
      const addRes = await addAiScannedToApi(found);
      alert(`✅ Додано: ${addRes.added ?? found.length}`);

      // 4) reload list
      await loadDeadlines();

    } catch (err) {
      console.error(err);
      if (choosePhotoBtn) choosePhotoBtn.textContent = "Фото (AI)";
      alert("Не вдалося обробити фото");
    }
  }

  // =======================
  // Helpers
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
    } catch {
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
    if (!dateObj) return { label: "СТАТУС", value: "Невідомо", variant: "unknown" };

    const diff = dateObj.getTime() - Date.now();

    if (diff < 0) return { label: "СТАТУС", value: "Протерміновано", variant: "overdue" };

    const days = Math.floor(diff / DAY);
    const hours = Math.floor((diff % DAY) / HOUR);

    if (diff < HOUR) return { label: "ЗАЛИШИЛОСЬ", value: "сьогодні", variant: "soon" };
    if (days === 0) return { label: "ЗАЛИШИЛОСЬ", value: `сьогодні (${hours || 1} год)`, variant: "soon" };
    if (days === 1) return { label: "ЗАЛИШИЛОСЬ", value: "1 день", variant: "soon" };

    return { label: "ЗАЛИШИЛОСЬ", value: `${days} ${pluralDays(days)}`, variant: "ok" };
  }

  function resetAddForm() {
    if (!addForm) return;
    addForm.reset();
    if (timeInput) timeInput.value = "18:00";
  }

  // =======================
  // Events
  // =======================

  // Додати дедлайн -> показати bottom sheet
  addBtn?.addEventListener("click", openAddChoice);

  closeAddChoiceBtn?.addEventListener("click", closeAddChoice);
  addChoiceModal?.addEventListener("click", (e) => {
    if (e.target === addChoiceModal) closeAddChoice();
  });

  chooseManualBtn?.addEventListener("click", () => {
    closeAddChoice();
    showView("add");
  });

  // ✅ Фото (AI)
  choosePhotoBtn?.addEventListener("click", () => {
    closeAddChoice();
    if (photoInput) {
      photoInput.value = "";
      photoInput.click();
    }
  });

  photoInput?.addEventListener("change", (e) => {
    handlePickedPhoto(e.target.files?.[0]);
  });

  cancelAddBtn?.addEventListener("click", () => {
    showView("list");
    resetAddForm();
  });

  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

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

  removeBtn?.addEventListener("click", () => {
    fillRemoveList();
    openRemoveModal();
  });

  closeRemoveBtn?.addEventListener("click", closeRemoveModal);
  removeModal?.addEventListener("click", (e) => {
    if (e.target === removeModal) closeRemoveModal();
  });

  sortBtn?.addEventListener("click", () => {
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

  importBtn?.addEventListener("click", importFromGoogle);

  // =======================
  // Start
  // =======================
  showView("list");
  loadDeadlines().catch(console.error);
});
