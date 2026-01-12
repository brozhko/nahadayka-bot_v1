document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  // =======================
  // Telegram WebApp
  // =======================
  const tg = window.Telegram?.WebApp || null;
  if (tg) {
    tg.ready?.();
    tg.expand(); // максимум по висоті в межах WebApp
    // tg.requestFullscreen?.(); // інколи працює, інколи ні (залежить від клієнта Telegram)
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
  let aiFound = [];

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

  const addChoiceModal = document.getElementById("addChoiceModal");
  const closeAddChoiceBtn = document.getElementById("closeAddChoice");
  const chooseManualBtn = document.getElementById("chooseManualBtn");
  const choosePhotoBtn = document.getElementById("choosePhotoBtn");
  const photoInput = document.getElementById("photoInput");

  const aiResultModal = document.getElementById("aiResultModal");
  const aiResultMeta = document.getElementById("aiResultMeta");
  const aiResultList = document.getElementById("aiResultList");
  const aiAddSelectedBtn = document.getElementById("aiAddSelectedBtn");
  const aiCloseBtn = document.getElementById("aiCloseBtn");

  const menuBtn = document.getElementById("menuBtn");
  const menuModal = document.getElementById("menuModal");
  const menuCloseBtn = document.getElementById("menuCloseBtn");

  const tabInfo = document.getElementById("tabInfo");
  const tabSettings = document.getElementById("tabSettings");
  const paneInfo = document.getElementById("paneInfo");
  const paneSettings = document.getElementById("paneSettings");

  const settingAiScan = document.getElementById("settingAiScan");
  const settingHaptics = document.getElementById("settingHaptics");

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
  // Modal helpers (lock scroll)
  // =======================
  function lockBodyScroll() {
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.overflow = "";
  }

  function anyModalOpen() {
    return (
      document.querySelector(".modal.show") ||
      document.querySelector(".sheet.show") ||
      document.querySelector(".menu-modal.show")
    );
  }

  function openModal(el) {
    if (!el) return;
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
    lockBodyScroll();
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    if (!anyModalOpen()) unlockBodyScroll();
  }

  function openRemoveModal() { openModal(removeModal); }
  function closeRemoveModal() { closeModal(removeModal); }

  function openAddChoice() { openModal(addChoiceModal); }
  function closeAddChoice() { closeModal(addChoiceModal); }

  function openAiResultModal() { openModal(aiResultModal); }
  function closeAiResultModal() {
    aiFound = [];
    if (aiResultMeta) aiResultMeta.textContent = "";
    if (aiResultList) aiResultList.innerHTML = "";
    closeModal(aiResultModal);
  }

  // =======================
  // Menu modal logic
  // =======================
  function openMenuModal() {
    openModal(menuModal);
    setMenuTab("info");
    const body = menuModal?.querySelector(".menu-body");
    if (body) body.scrollTop = 0;
  }

  function closeMenuModal() { closeModal(menuModal); }

  function setMenuTab(which) {
    const isInfo = which === "info";

    tabInfo?.classList.toggle("active", isInfo);
    tabInfo?.setAttribute("aria-selected", isInfo ? "true" : "false");

    tabSettings?.classList.toggle("active", !isInfo);
    tabSettings?.setAttribute("aria-selected", !isInfo ? "true" : "false");

    paneInfo?.classList.toggle("active", isInfo);
    paneSettings?.classList.toggle("active", !isInfo);
  }

  function doHaptic(type = "impact") {
    if (!tg) return;
    if (settingHaptics && !settingHaptics.checked) return;

    try {
      if (tg.HapticFeedback) {
        if (type === "selection") tg.HapticFeedback.selectionChanged();
        else if (type === "success") tg.HapticFeedback.notificationOccurred("success");
        else if (type === "error") tg.HapticFeedback.notificationOccurred("error");
        else tg.HapticFeedback.impactOccurred("light");
      }
    } catch {}
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
          <div class="meta"><span>${escapeHtml(displayDate)}</span></div>
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
          doHaptic("selection");
          await deleteDeadlineApi(d.title);
          doHaptic("success");
        } catch (err) {
          console.error(err);
          doHaptic("error");
          alert("Не вдалося видалити дедлайн");
        }
      });

      row.appendChild(titleDiv);
      row.appendChild(btn);
      removeList.appendChild(row);
    });
  }

  function renderAiResultsModal(data) {
    aiFound = Array.isArray(data.deadlines) ? data.deadlines : [];

    if (aiResultMeta) {
      const parts = [];
      if (data.cached) parts.push("♻️ Кеш: це фото вже аналізували");
      if (typeof data.remaining_today === "number") {
        parts.push(`⏳ Залишилось сканувань сьогодні: ${data.remaining_today}`);
      }
      aiResultMeta.textContent = parts.join(" • ");
    }

    if (!aiResultList) return;

    if (!aiFound.length) {
      aiResultList.innerHTML = `<div class="empty">На фото не знайдено дедлайнів 😕</div>`;
      return;
    }

    aiResultList.innerHTML = "";
    aiFound.forEach((d, idx) => {
      const dueDate = d?.due_date ?? null;
      const dueTime = d?.due_time ?? "23:59";
      const title = d?.title ?? "Дедлайн";

      const row = document.createElement("div");
      row.className = "card dark";

      row.innerHTML = `
        <label class="ai-row">
          <input type="checkbox" class="ai-check" data-idx="${idx}" checked>
          <div class="ai-col">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="meta">
              <span>📅 ${escapeHtml(String(dueDate || "без дати"))} ${escapeHtml(String(dueTime || ""))}</span>
            </div>
          </div>
        </label>
      `;
      aiResultList.appendChild(row);
    });
  }

  function getSelectedAiDeadlines() {
    if (!aiResultList) return [];
    const checks = aiResultList.querySelectorAll(".ai-check");
    const selected = [];
    checks.forEach((ch) => {
      if (!ch.checked) return;
      const idx = Number(ch.getAttribute("data-idx"));
      if (!Number.isFinite(idx)) return;
      const item = aiFound[idx];
      if (item) selected.push(item);
    });
    return selected;
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

    doHaptic("selection");
    if (tg) tg.openLink(url, { try_instant_view: true });
    else window.open(url, "_blank");
  }

  async function addAiScannedToApi(deadlinesArr) {
    const res = await fetch(`${API_BASE}/add_ai_scanned/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadlines: deadlinesArr }),
    });
    if (!res.ok) throw new Error("Failed to add AI scanned deadlines");
    return await res.json();
  }

  // =======================
  // AI PHOTO FLOW
  // =======================
  async function handlePickedPhoto(file) {
    if (!file) return;

    if (settingAiScan && !settingAiScan.checked) {
      alert("AI-скан фото вимкнено в Налаштуваннях.");
      return;
    }

    const oldBtnText = choosePhotoBtn?.textContent;

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("uid", USER_ID);

      if (choosePhotoBtn) choosePhotoBtn.textContent = "⏳ Аналізую фото...";
      doHaptic("selection");

      const res = await fetch(`${API_BASE}/scan_deadlines_ai`, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (choosePhotoBtn) choosePhotoBtn.textContent = oldBtnText || "🤖📷 Фото";

      if (res.status === 413) return alert(data?.message || "Фото завелике.");
      if (res.status === 415) return alert(data?.message || "Формат не підтримується.");
      if (res.status === 429) return alert(data?.message || "Ліміт AI на сьогодні вичерпаний.");

      if (!res.ok || data.error) {
        alert("Помилка AI: " + (data.detail || data.message || data.error || "unknown"));
        return;
      }

      renderAiResultsModal(data);
      openAiResultModal();
      doHaptic("success");
    } catch (err) {
      console.error(err);
      if (choosePhotoBtn) choosePhotoBtn.textContent = oldBtnText || "🤖📷 Фото";
      doHaptic("error");
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
    const parsed = new Date(normalizeDateString(dateStr));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function formatForDisplay(dateStr) {
    const d = toDateObj(dateStr);
    if (!d) return dateStr || "без дати";
    return d.toLocaleString("uk-UA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
    addForm?.reset();
    if (timeInput) timeInput.value = "18:00";
  }

  // =======================
  // Events
  // =======================
  addBtn?.addEventListener("click", () => { doHaptic("selection"); openAddChoice(); });

  closeAddChoiceBtn?.addEventListener("click", closeAddChoice);
  addChoiceModal?.addEventListener("click", (e) => { if (e.target === addChoiceModal) closeAddChoice(); });

  chooseManualBtn?.addEventListener("click", () => { closeAddChoice(); showView("add"); });

  choosePhotoBtn?.addEventListener("click", () => {
    closeAddChoice();
    if (photoInput) { photoInput.value = ""; photoInput.click(); }
  });

  photoInput?.addEventListener("change", (e) => {
    handlePickedPhoto(e.target.files?.[0]);
    if (photoInput) photoInput.value = "";
  });

  cancelAddBtn?.addEventListener("click", () => { showView("list"); resetAddForm(); });

  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;

    if (!title || !date) return alert("Введи назву і дату");

    try {
      doHaptic("selection");
      await addDeadlineApi(title, formatDateTime(date, time));
      resetAddForm();
      showView("list");
      doHaptic("success");
    } catch (err) {
      console.error(err);
      doHaptic("error");
      alert("Не вдалося додати дедлайн");
    }
  });

  removeBtn?.addEventListener("click", () => {
    doHaptic("selection");
    fillRemoveList();
    openRemoveModal();
  });

  closeRemoveBtn?.addEventListener("click", closeRemoveModal);
  removeModal?.addEventListener("click", (e) => { if (e.target === removeModal) closeRemoveModal(); });

  aiCloseBtn?.addEventListener("click", closeAiResultModal);
  aiResultModal?.addEventListener("click", (e) => { if (e.target === aiResultModal) closeAiResultModal(); });

  aiAddSelectedBtn?.addEventListener("click", async () => {
    try {
      const selected = getSelectedAiDeadlines();
      if (!selected.length) return alert("Вибери хоча б 1 дедлайн ✅");

      aiAddSelectedBtn.disabled = true;
      aiAddSelectedBtn.textContent = "⏳ Додаю...";
      doHaptic("selection");

      const addRes = await addAiScannedToApi(selected);
      closeAiResultModal();
      await loadDeadlines();

      doHaptic("success");
      alert(`✅ Додано: ${addRes.added ?? selected.length}`);
    } catch (err) {
      console.error(err);
      doHaptic("error");
      alert("Не вдалося додати дедлайни");
    } finally {
      aiAddSelectedBtn.disabled = false;
      aiAddSelectedBtn.textContent = "Додати вибране";
    }
  });

  sortBtn?.addEventListener("click", () => {
    if (!deadlines.length) return;

    deadlines.sort((a, b) => {
      const ta = toDateObj(a.date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const tb = toDateObj(b.date)?.getTime() ?? Number.POSITIVE_INFINITY;
      return sortAsc ? ta - tb : tb - ta;
    });

    sortAsc = !sortAsc;
    sortBtn.textContent = sortAsc ? "Сортувати ↑" : "Сортувати ↓";
    renderDeadlines();
    doHaptic("selection");
  });

  importBtn?.addEventListener("click", importFromGoogle);

  menuBtn?.addEventListener("click", () => { doHaptic("selection"); openMenuModal(); });
  menuCloseBtn?.addEventListener("click", closeMenuModal);
  menuModal?.addEventListener("click", (e) => { if (e.target === menuModal) closeMenuModal(); });

  tabInfo?.addEventListener("click", () => { doHaptic("selection"); setMenuTab("info"); });
  tabSettings?.addEventListener("click", () => { doHaptic("selection"); setMenuTab("settings"); });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    if (menuModal?.classList.contains("show")) return closeMenuModal();
    if (aiResultModal?.classList.contains("show")) return closeAiResultModal();
    if (removeModal?.classList.contains("show")) return closeRemoveModal();
    if (addChoiceModal?.classList.contains("show")) return closeAddChoice();
  });

  // =======================
  // Start
  // =======================
  showView("list");
  loadDeadlines().catch(console.error);
});
