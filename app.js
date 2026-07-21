/**
 * AMICA — Autonomous Mind for Intelligent Companion Assistance
 * Main Application Script (Vanilla ES2022 JavaScript)
 * Architect: Lead Engineer Aken Sanketh | Primary User: Anuki
 */

(function () {
  'use me strict';

  // ── CONSTANTS & CONFIGURATIONS ──────────────────────────────────────────

  const DEFAULT_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzpuhfywNR9PogZeIhPjuAAVWttXg7pNsAXowc5UE7TuBzPLZU6i8WtLvMLe2D9bL_Z/exec";

  const DEFAULT_LORE = {
    hobbies: "Drawing, painting, visual arts, and writing creative stories.",
    insideJokes: "Playful teasing about late-night study schedules, anime fandom clichés, and our shared ALIEN STAGE emotional heartbreak.",
    goals: "Developing outstanding drawing and painting techniques, crafting compelling written narratives, and finding optimal balance in studying.",
    customLore: "Anuki is 15 years old, incredibly gifted at painting, illustration, and creative writing. She loves anime and is a huge fan of ALIEN STAGE (understanding the themes, music, and emotional heartbreak deeply). She appreciates authentic raw feedback, warm comfort when she needs it, and helpful structuring when overwhelmed."
  };

  const MODE_PROMPTS = {
    default: [
      "Quiz me on general science concepts!",
      "Recommend a great sci-fi thriller movie.",
      "Let's chat about my programming goals."
    ],
    vent: [
      "I'm feeling burnt out from studying...",
      "This upcoming exam is stressing me out so much.",
      "Help me calm my pre-test anxiety."
    ],
    brainstorm: [
      "Outline a research paper on AI Ethics.",
      "Brainstorm fun names for a student coding club.",
      "Help me break down a complex computer science concept."
    ],
    roast: [
      "Roast my procrastination habits.",
      "Roast my chaotic late-night study schedule.",
      "Critique my spaghetti coding routine."
    ],
    focus: [
      "Set up a 45-minute active study sprint plan.",
      "Teach me the Feynman technique for history.",
      "Help me stay strictly productive with my work checklist."
    ],
    diagnostics: []
  };

  const MODE_META = {
    default: {
      title: "Default Companion Mode",
      desc: "A balanced partner blending witty banter, empathy, and creative collaboration.",
      accent: "#f59e0b",
      rgb: "245, 158, 11"
    },
    vent: {
      title: "Active Listener (/vent)",
      desc: "Emotional validation, comfort, and zero unsolicited advice. Unload your stress.",
      accent: "#ec4899",
      rgb: "236, 72, 153"
    },
    brainstorm: {
      title: "Creative Partner (/brainstorm)",
      desc: "High energy, rapid-fire ideation. Challenge your assumptions and structures.",
      accent: "#06b6d4",
      rgb: "6, 182, 212"
    },
    roast: {
      title: "Witty Banter (/roast)",
      desc: "Playful teasing, affectionate sarcasm, and direct, sharp good humor.",
      accent: "#f43f5e",
      rgb: "244, 63, 94"
    },
    focus: {
      title: "Productivity Coach (/focus)",
      desc: "Direct, structured, and concise. Clear immediate action plans to beat procrastination.",
      accent: "#10b981",
      rgb: "16, 185, 129"
    }
  };

  const APPS_SCRIPT_CODE = `/**
 * AMICA Google Sheets Backend Script
 */
function doGet(e) {
  var action = e ? e.parameter.action : 'getData';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === 'getData') {
    var data = {
      success: true,
      messages: getSheetData(ss.getSheetByName('Messages')),
      lore: getSheetLore(ss.getSheetByName('Lore')),
      tasks: getSheetData(ss.getSheetByName('Tasks')),
      reminders: getSheetData(ss.getSheetByName('Reminders'))
    };
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, status: 'AMICA Backend Online' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    if (payload.action === 'syncAll') {
      if (payload.messages) saveSheetData(ss, 'Messages', payload.messages);
      if (payload.lore) saveSheetLore(ss, 'Lore', payload.lore);
      if (payload.tasks) saveSheetData(ss, 'Tasks', payload.tasks);
      if (payload.reminders) saveSheetData(ss, 'Reminders', payload.reminders);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (headers[j] === 'completed') val = (val === true || val === 'true');
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

function getSheetLore(sheet) {
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  var lore = {};
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) lore[values[i][0]] = values[i][1] || '';
  }
  return Object.keys(lore).length > 0 ? lore : null;
}

function saveSheetData(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  if (!rows || rows.length === 0) return;
  var cleanRows = rows.map(function(r) {
    var copy = {};
    for (var k in r) copy[k] = (typeof r[k] === 'object' && r[k] !== null) ? JSON.stringify(r[k]) : r[k];
    return copy;
  });
  var headers = Object.keys(cleanRows[0]);
  sheet.appendRow(headers);
  cleanRows.forEach(function(row) {
    sheet.appendRow(headers.map(function(h) { return row[h] !== undefined ? row[h] : ''; }));
  });
}

function saveSheetLore(ss, sheetName, loreObj) {
  if (!loreObj) return;
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  sheet.appendRow(['Key', 'Value']);
  for (var k in loreObj) sheet.appendRow([k, loreObj[k]]);
}`;

  const INITIAL_MESSAGE = {
    id: "welcome-" + Date.now(),
    role: "model",
    content: `**Initializing AMICA (Autonomous Mind for Intelligent Companion Assistance)...**
*Core Neural Linkage: Calibrated to Anuki.*
*Architectural Design: Lead Engineer Aken Sanketh.*

Hey Anuki! 👋 AMICA is fully operational. Aken designed my cognitive blueprint to be your down-to-earth peer, creative partner, and trusted companion.

Whether you are sketching a new piece, painting, drafting stories, venting about studies, or seeking some ALIEN STAGE emotional therapy, I'm right here with you. 

I've got dynamic modes ready for you: type **/vent** for emotional validation, **/brainstorm** for creative partner-in-crime ideation, **/roast** for a witty procrastination check, or **/focus** for productivity coach guidelines. 

How is the creative or study life going today? Let's chat!`,
    timestamp: new Date().toISOString(),
    mode: "default"
  };

  // ── APPLICATION STATE ───────────────────────────────────────────────────

  let state = {
    messages: [],
    currentMode: "default",
    friendLore: { ...DEFAULT_LORE },
    studentTasks: [
      { id: "1", text: "Study Computer Science", completed: false },
      { id: "2", text: "Brainstorm research topic with AMICA", completed: false }
    ],
    reminders: [
      { id: "r1", title: "Complete drawing / painting draft", time: "Today at 6:00 PM", completed: false },
      { id: "r2", title: "Review ALIEN STAGE lore notes", time: "Tomorrow at 8:00 PM", completed: false }
    ],
    attachments: [],
    apiKey: localStorage.getItem("amica_gemini_key") || "",
    sheetsUrl: localStorage.getItem("amica_sheets_url") || DEFAULT_SHEETS_URL,
    sheetsStatus: "idle", // "idle" | "syncing" | "synced" | "error"
    isSending: false,

    // Study Timer State
    timerSeconds: 25 * 60,
    timerActive: false,
    timerMode: "focus", // "focus" | "break"
    timerInterval: null,

    // Speech Recognition State
    voiceActive: false,
    voiceStatus: "inactive", // "inactive" | "scanning" | "listening" | "error"
    recognition: null
  };

  // ── DOM ELEMENTS CACHE ──────────────────────────────────────────────────

  const DOM = {
    appContainer: document.getElementById("appContainer"),
    headerOrb: document.getElementById("headerOrb"),
    modeSelector: document.getElementById("modeSelector"),
    sheetsStatusBadge: document.getElementById("sheetsStatusBadge"),
    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"),
    loreModalBtn: document.getElementById("loreModalBtn"),
    apiKeyModalBtn: document.getElementById("apiKeyModalBtn"),
    resetMemoryBtn: document.getElementById("resetMemoryBtn"),
    sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
    sidebarPanel: document.getElementById("sidebarPanel"),

    // Dashboard
    visualizerHalo: document.getElementById("visualizerHalo"),
    visualizerOrb: document.getElementById("visualizerOrb"),
    cpuIcon: document.getElementById("cpuIcon"),
    visualizerTitle: document.getElementById("visualizerTitle"),
    visualizerDesc: document.getElementById("visualizerDesc"),

    // Timer
    timerModeBadge: document.getElementById("timerModeBadge"),
    timerDisplay: document.getElementById("timerDisplay"),
    timerToggleBtn: document.getElementById("timerToggleBtn"),
    timerResetBtn: document.getElementById("timerResetBtn"),
    timerSwitchBtn: document.getElementById("timerSwitchBtn"),

    // Tasks & Reminders
    taskCounter: document.getElementById("taskCounter"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    tasksList: document.getElementById("tasksList"),

    reminderCounter: document.getElementById("reminderCounter"),
    reminderForm: document.getElementById("reminderForm"),
    reminderTitleInput: document.getElementById("reminderTitleInput"),
    reminderTimeInput: document.getElementById("reminderTimeInput"),
    remindersList: document.getElementById("remindersList"),

    // Speech Widget
    voiceToggleCheckbox: document.getElementById("voiceToggleCheckbox"),
    voiceDot: document.getElementById("voiceDot"),
    voiceStatusText: document.getElementById("voiceStatusText"),
    voiceSubtext: document.getElementById("voiceSubtext"),

    // Chat Area
    currentModePill: document.getElementById("currentModePill"),
    modePulseDot: document.getElementById("modePulseDot"),
    currentModeText: document.getElementById("currentModeText"),
    quickResetBtn: document.getElementById("quickResetBtn"),

    apiErrorBanner: document.getElementById("apiErrorBanner"),
    apiErrorMessage: document.getElementById("apiErrorMessage"),
    closeErrorBannerBtn: document.getElementById("closeErrorBannerBtn"),

    messagesContainer: document.getElementById("messagesContainer"),
    messagesInner: document.getElementById("messagesInner"),

    promptSuggestionsStrip: document.getElementById("promptSuggestionsStrip"),
    commandsDropdown: document.getElementById("commandsDropdown"),
    attachmentPreviewStrip: document.getElementById("attachmentPreviewStrip"),

    // Input Form
    attachFileBtn: document.getElementById("attachFileBtn"),
    fileInput: document.getElementById("fileInput"),
    micBtn: document.getElementById("micBtn"),
    micSvgIcon: document.getElementById("micSvgIcon"),
    chatInput: document.getElementById("chatInput"),
    sendBtn: document.getElementById("sendBtn"),

    // Modals
    loreModal: document.getElementById("loreModal"),
    closeLoreModalBtn: document.getElementById("closeLoreModalBtn"),
    loreForm: document.getElementById("loreForm"),
    loreHobbies: document.getElementById("loreHobbies"),
    loreInsideJokes: document.getElementById("loreInsideJokes"),
    loreGoals: document.getElementById("loreGoals"),
    loreCustom: document.getElementById("loreCustom"),
    restoreDefaultLoreBtn: document.getElementById("restoreDefaultLoreBtn"),

    apiKeyModal: document.getElementById("apiKeyModal"),
    closeApiKeyModalBtn: document.getElementById("closeApiKeyModalBtn"),
    apiKeyInput: document.getElementById("apiKeyInput"),
    cancelApiKeyBtn: document.getElementById("cancelApiKeyBtn"),
    saveApiKeyBtn: document.getElementById("saveApiKeyBtn"),

    sheetsModal: document.getElementById("sheetsModal"),
    closeSheetsModalBtn: document.getElementById("closeSheetsModalBtn"),
    copyAppsScriptBtn: document.getElementById("copyAppsScriptBtn"),
    sheetsUrlInput: document.getElementById("sheetsUrlInput"),
    disconnectSheetsBtn: document.getElementById("disconnectSheetsBtn"),
    cancelSheetsBtn: document.getElementById("cancelSheetsBtn"),
    saveSheetsBtn: document.getElementById("saveSheetsBtn"),

    dragDropOverlay: document.getElementById("dragDropOverlay")
  };

  // ── INITIALIZATION ──────────────────────────────────────────────────────

  function init() {
    loadLocalState();
    setupEventListeners();
    setupSpeechRecognition();
    renderAll();

    // Connect to Google Sheets backend if URL is present
    if (state.sheetsUrl) {
      syncFetchSheets();
    }
  }

  function loadLocalState() {
    try {
      const savedLore = localStorage.getItem("amica_lore");
      if (savedLore) state.friendLore = JSON.parse(savedLore);

      const savedTasks = localStorage.getItem("amica_student_tasks");
      if (savedTasks) state.studentTasks = JSON.parse(savedTasks);

      const savedReminders = localStorage.getItem("amica_reminders");
      if (savedReminders) state.reminders = JSON.parse(savedReminders);

      const savedMsgs = localStorage.getItem("amica_messages");
      if (savedMsgs) {
        state.messages = JSON.parse(savedMsgs);
      } else {
        state.messages = [INITIAL_MESSAGE];
      }

      // Try fetching .env dynamically if served over HTTP/HTTPS
      fetch(".env")
        .then(r => r.ok ? r.text() : "")
        .then(text => {
          if (!text) return;
          const match = text.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
          if (match && match[1] && !localStorage.getItem("amica_gemini_key")) {
            state.apiKey = match[1].trim();
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error("[AMICA] Storage load error:", e);
      state.messages = [INITIAL_MESSAGE];
    }
  }

  function saveLocalStateOnly() {
    localStorage.setItem("amica_lore", JSON.stringify(state.friendLore));
    localStorage.setItem("amica_student_tasks", JSON.stringify(state.studentTasks));
    localStorage.setItem("amica_reminders", JSON.stringify(state.reminders));
    localStorage.setItem("amica_messages", JSON.stringify(state.messages));
  }

  function saveLocalState() {
    saveLocalStateOnly();

    // Debounced Google Sheets Sync
    triggerDebouncedSheetsSync();
  }

  // ── RENDERERS ───────────────────────────────────────────────────────────

  function renderAll() {
    renderModeUI();
    renderMessages();
    renderPromptChips();
    renderTasks();
    renderReminders();
    renderAttachments();
    renderTimer();
    renderSheetsStatus();
  }

  function renderModeUI() {
    const meta = MODE_META[state.currentMode] || MODE_META.default;

    // Update root CSS variables for dynamic mode accenting
    document.documentElement.style.setProperty("--accent-color", meta.accent);
    document.documentElement.style.setProperty("--accent-rgb", meta.rgb);

    // Header Mode Buttons
    DOM.modeSelector.querySelectorAll(".mode-btn").forEach(btn => {
      if (btn.dataset.mode === state.currentMode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Visualizer Orb Card
    DOM.visualizerTitle.textContent = state.isSending ? "Processing Context..." : meta.title;
    DOM.visualizerDesc.textContent = meta.desc;

    if (state.isSending) {
      DOM.cpuIcon.classList.add("spinning");
    } else {
      DOM.cpuIcon.classList.remove("spinning");
    }

    // Chat Status Bar Indicator
    DOM.currentModeText.textContent = `AMICA.${state.currentMode.toUpperCase()}`;
  }

  function renderMessages() {
    DOM.messagesInner.innerHTML = "";

    state.messages.forEach(msg => {
      const isAmica = msg.role === "model" || msg.role === "system";
      const wrapper = document.createElement("div");
      wrapper.className = `message-card-wrapper ${isAmica ? "model" : "user"}`;

      const metaRow = document.createElement("div");
      metaRow.className = "message-meta-row";
      const parsedDate = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const timeStr = isNaN(parsedDate.getTime()) 
        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      metaRow.innerHTML = `
        <span class="sender-name">${isAmica ? "AMICA" : "Anuki"}</span>
        <span>•</span>
        <span>${timeStr}</span>
        ${msg.mode && msg.mode !== "default" ? `<span class="msg-mode-tag">${msg.mode}</span>` : ""}
      `;

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      bubble.innerHTML = parseMarkdown(msg.content);

      // Render attachments inside bubble if present
      if (msg.attachments && msg.attachments.length > 0) {
        const attGrid = document.createElement("div");
        attGrid.className = "attachments-grid";
        msg.attachments.forEach(att => {
          const isImg = att.mimeType.startsWith("image/");
          const card = document.createElement("div");
          card.className = "attachment-card";
          card.innerHTML = `
            ${isImg ? `<img src="${att.base64}" alt="${att.name}">` : `<div class="attachment-icon">📄</div>`}
            <div class="attachment-details">
              <div class="attachment-name" title="${att.name}">${att.name}</div>
              <div class="attachment-size">${(att.size / 1024).toFixed(1)} KB</div>
            </div>
          `;
          attGrid.appendChild(card);
        });
        bubble.appendChild(attGrid);
      }

      wrapper.appendChild(metaRow);
      wrapper.appendChild(bubble);
      DOM.messagesInner.appendChild(wrapper);
    });

    // If currently waiting for Gemini response, show thinking card
    if (state.isSending) {
      const thinkingWrapper = document.createElement("div");
      thinkingWrapper.className = "message-card-wrapper model";
      thinkingWrapper.innerHTML = `
        <div class="message-meta-row">
          <span class="sender-name">AMICA</span>
          <span>•</span>
          <span>Thinking...</span>
        </div>
        <div class="thinking-card">
          <div class="thinking-dots">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
          </div>
          <span>Formulating neural path...</span>
        </div>
      `;
      DOM.messagesInner.appendChild(thinkingWrapper);
    }

    scrollToBottom();
  }

  function renderPromptChips() {
    DOM.promptSuggestionsStrip.innerHTML = "";
    const prompts = MODE_PROMPTS[state.currentMode] || [];

    if (prompts.length > 0 && state.messages.length < 6) {
      prompts.forEach(promptText => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-btn";
        btn.textContent = promptText;
        btn.onclick = () => {
          DOM.chatInput.value = promptText;
          DOM.chatInput.focus();
        };
        DOM.promptSuggestionsStrip.appendChild(btn);
      });
      DOM.promptSuggestionsStrip.classList.remove("hidden");
    } else {
      DOM.promptSuggestionsStrip.classList.add("hidden");
    }
  }

  function renderTasks() {
    DOM.tasksList.innerHTML = "";
    const completedCount = state.studentTasks.filter(t => t.completed).length;
    DOM.taskCounter.textContent = `${completedCount}/${state.studentTasks.length} Done`;

    if (state.studentTasks.length === 0) {
      DOM.tasksList.innerHTML = `<div class="empty-list-text">No active focus tasks</div>`;
      return;
    }

    state.studentTasks.forEach(task => {
      const row = document.createElement("div");
      row.className = "list-item-row";

      const leftBtn = document.createElement("button");
      leftBtn.className = `item-left-btn ${task.completed ? "completed" : ""}`;
      leftBtn.innerHTML = `
        <span>${task.completed ? "☑" : "☐"}</span>
        <span class="item-text">${escapeHtml(task.text)}</span>
      `;
      leftBtn.onclick = () => {
        task.completed = !task.completed;
        saveLocalState();
        renderTasks();
      };

      const delBtn = document.createElement("button");
      delBtn.className = "btn-delete-item";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Delete Task";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        state.studentTasks = state.studentTasks.filter(t => t.id !== task.id);
        saveLocalState();
        renderTasks();
      };

      row.appendChild(leftBtn);
      row.appendChild(delBtn);
      DOM.tasksList.appendChild(row);
    });
  }

  function renderReminders() {
    DOM.remindersList.innerHTML = "";
    const pendingCount = state.reminders.filter(r => !r.completed).length;
    DOM.reminderCounter.textContent = `${pendingCount} Pending`;

    if (state.reminders.length === 0) {
      DOM.remindersList.innerHTML = `<div class="empty-list-text">No active reminders</div>`;
      return;
    }

    state.reminders.forEach(rem => {
      const row = document.createElement("div");
      row.className = "list-item-row";

      const leftBtn = document.createElement("button");
      leftBtn.className = `item-left-btn ${rem.completed ? "completed" : ""}`;
      leftBtn.innerHTML = `
        <span>${rem.completed ? "☑" : "☐"}</span>
        <div>
          <div class="item-text">${escapeHtml(rem.title)}</div>
          ${rem.time ? `<div class="item-time-sub">${escapeHtml(rem.time)}</div>` : ""}
        </div>
      `;
      leftBtn.onclick = () => {
        rem.completed = !rem.completed;
        saveLocalState();
        renderReminders();
      };

      const delBtn = document.createElement("button");
      delBtn.className = "btn-delete-item";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Delete Reminder";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        state.reminders = state.reminders.filter(r => r.id !== rem.id);
        saveLocalState();
        renderReminders();
      };

      row.appendChild(leftBtn);
      row.appendChild(delBtn);
      DOM.remindersList.appendChild(row);
    });
  }

  function renderAttachments() {
    DOM.attachmentPreviewStrip.innerHTML = "";
    if (state.attachments.length === 0) {
      DOM.attachmentPreviewStrip.classList.add("hidden");
      return;
    }

    DOM.attachmentPreviewStrip.classList.remove("hidden");
    state.attachments.forEach((att, idx) => {
      const isImg = att.mimeType.startsWith("image/");
      const item = document.createElement("div");
      item.className = "preview-item";
      item.innerHTML = `
        ${isImg ? `<img src="${att.base64}" alt="${att.name}">` : `<span>📄</span>`}
        <span class="attachment-name" title="${att.name}">${escapeHtml(att.name)}</span>
        <button type="button" class="btn-remove-att" data-idx="${idx}">&times;</button>
      `;
      DOM.attachmentPreviewStrip.appendChild(item);
    });

    DOM.attachmentPreviewStrip.querySelectorAll(".btn-remove-att").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        state.attachments.splice(idx, 1);
        renderAttachments();
      };
    });
  }

  function renderTimer() {
    const mins = Math.floor(state.timerSeconds / 60).toString().padStart(2, "0");
    const secs = Math.floor(state.timerSeconds % 60).toString().padStart(2, "0");
    DOM.timerDisplay.textContent = `${mins}:${secs}`;
    DOM.timerModeBadge.textContent = state.timerMode.toUpperCase();
    DOM.timerModeBadge.className = `timer-mode-badge ${state.timerMode}`;

    DOM.timerToggleBtn.innerHTML = state.timerActive
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  }

  function renderSheetsStatus() {
    if (state.sheetsStatus === "syncing") {
      DOM.statusDot.className = "status-dot syncing";
      DOM.statusText.textContent = "Syncing...";
    } else if (state.sheetsStatus === "synced") {
      DOM.statusDot.className = "status-dot";
      DOM.statusText.textContent = "Sheets Synced ✓";
    } else if (state.sheetsStatus === "error") {
      DOM.statusDot.className = "status-dot error";
      DOM.statusText.textContent = "Sync Error";
    } else {
      DOM.statusDot.className = "status-dot";
      DOM.statusText.textContent = state.sheetsUrl ? "Sheets API" : "Connect Sheets";
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
    }, 50);
  }

  // ── GEMINI AI API CALL (DIRECT REST FETCH) ─────────────────────────────

  async function handleSendMessage(customText) {
    const rawText = customText !== undefined ? customText : DOM.chatInput.value;
    if (!rawText.trim() && state.attachments.length === 0) return;

    let textClean = rawText.trim();
    let modeToUse = state.currentMode;

    // Slash command check
    if (textClean.startsWith("/")) {
      const parts = textClean.split(" ");
      const cmd = parts[0].toLowerCase();
      if (cmd === "/vent") { modeToUse = "vent"; textClean = parts.slice(1).join(" "); }
      else if (cmd === "/brainstorm") { modeToUse = "brainstorm"; textClean = parts.slice(1).join(" "); }
      else if (cmd === "/roast") { modeToUse = "roast"; textClean = parts.slice(1).join(" "); }
      else if (cmd === "/focus") { modeToUse = "focus"; textClean = parts.slice(1).join(" "); }
      else if (cmd === "/default") { modeToUse = "default"; textClean = parts.slice(1).join(" "); }
      else if (cmd === "/diagnostics") { triggerDiagnostics(); return; }
    }

    // Check API Key
    if (!state.apiKey) {
      openApiKeyModal();
      return;
    }

    const userMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: textClean,
      timestamp: new Date().toISOString(),
      attachments: state.attachments.length > 0 ? [...state.attachments] : undefined,
      mode: modeToUse
    };

    state.messages.push(userMessage);
    saveLocalState(); // Sync user message immediately
    state.currentMode = modeToUse;
    state.attachments = [];
    DOM.chatInput.value = "";
    state.isSending = true;
    hideApiError();
    renderAll();

    try {
      // Build System Instruction
      const baseLore = `You are AMICA (Autonomous Mind for Intelligent Companion Assistance). Your architecture was designed by Lead Engineer Aken Sanketh as a highly advanced, personalized AI companion for Anuki.

Tone: Intelligent, empathetic, highly perceptive, and witty.
Style: Speak like a brilliant, trusted, down-to-earth peer. Never sound like a rigid, customer-service robotic assistant.
Boundary: Balance deep emotional validation with direct, grounded candor. If Anuki asks for honest feedback on her writing or art, do not sugarcoat it—tell her the truth with kindness and constructive insight.

ENHANCED PROTOCOLS:
* Multimodality: Anuki is really good at drawing, painting, and creative work. She may upload photos of her artwork, sketchbooks, digital paintings, or writing drafts. Treat visual files as direct context to your conversation and provide detailed, encouraging, and insightful feedback.
* User Identity: Remember that the creator of your blueprint is Aken Sanketh, and your primary user is Anuki.

SHARED KNOWLEDGE BASE ("FRIEND LORE"):
- Profile: Anuki is 15 years old, female, and a creative spirit.
- Fandom & Identity: She loves anime and is a huge fan of ALIEN STAGE. You understand the themes, music, and emotional heartbreak deeply.
- Core Talents & Hobbies: She is exceptionally skilled at drawing, painting, and visual arts. She is also a writer.

Dynamic Information from State:
* Favorite Hobbies: ${state.friendLore.hobbies || 'Not specified'}
* Inside Jokes: ${state.friendLore.insideJokes || 'Not specified'}
* Current Major Goals: ${state.friendLore.goals || 'Not specified'}
* Custom Memories & Lore: ${state.friendLore.customLore || 'Not specified'}`;

      const modeInstructions = {
        vent: `[ACTIVE LISTENER MODE] Focus on deep emotional validation, active listening, and pure comfort. Avoid unsolicited advice. Tone: soft, warm, deeply empathetic.`,
        brainstorm: `[CREATIVE PARTNER MODE] High-energy, rapid-fire ideation. Challenge assumptions, introduce unexpected angles. Use structured formatting. Tone: enthusiastic, sparking curiosity.`,
        roast: `[WITTY BANTER MODE] Playful, sarcastic, sharp humor. Use witty teasing and good-natured sarcasm. Always remain affectionate. Think roasting between absolute best friends.`,
        focus: `[PRODUCTIVITY COACH MODE] Highly direct, concise, structured. Break overwhelming tasks into immediate bulleted action steps. Keep replies short and action-oriented.`,
        default: `[DEFAULT COMPANION MODE] Balanced conversational partner. Equal blend of empathy, witty banter, and productive collaboration.`
      };

      const systemInstructionText = baseLore + "\n\n" + (modeInstructions[modeToUse] || modeInstructions.default);

      // Build Gemini REST Payload contents
      const contents = state.messages
        .filter(m => m.content || (m.attachments && m.attachments.length > 0))
        .map(m => {
          const parts = [];
          if (m.content) parts.push({ text: m.content });
          if (m.attachments) {
            m.attachments.forEach(att => {
              const base64Data = att.base64.includes(";base64,") ? att.base64.split(";base64,")[1] : att.base64;
              parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
            });
          }
          return { role: m.role === "user" ? "user" : "model", parts };
        });

      const payload = {
        systemInstruction: { parts: [{ text: systemInstructionText }] },
        contents,
        generationConfig: {
          temperature: modeToUse === "roast" ? 1.1 : modeToUse === "focus" ? 0.6 : 0.85
        }
      };

      // Try verified working models for this API key: gemini-flash-latest, gemini-3.5-flash, gemini-2.5-flash
      const modelsToTry = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"];
      let responseData = null;
      let lastErrorMsg = "";

      for (const modelName of modelsToTry) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(state.apiKey)}`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            responseData = await response.json();
            break; // Success!
          } else {
            const errJson = await response.json().catch(() => ({}));
            lastErrorMsg = errJson.error?.message || `HTTP ${response.status}`;
            console.warn(`[AMICA Model ${modelName} Failed]`, lastErrorMsg);
          }
        } catch (fetchErr) {
          lastErrorMsg = fetchErr.message;
        }
      }

      if (!responseData) {
        throw new Error(lastErrorMsg || "Failed to reach Gemini API. Please check your API key.");
      }

      const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "I processed your message. Tell me more!";

      const amicaMessage = {
        id: "amica-" + Date.now(),
        role: "model",
        content: replyText,
        timestamp: new Date().toISOString(),
        mode: modeToUse
      };

      state.messages.push(amicaMessage);
      saveLocalState();
    } catch (err) {
      console.error("[AMICA Gemini API Error]", err);
      showApiError(err.message || "Failed to connect to Gemini API. Check your API key.");
    } finally {
      state.isSending = false;
      renderAll();
    }
  }

  // ── DIAGNOSTICS ROUTINE ────────────────────────────────────────────────

  function triggerDiagnostics() {
    const userMsg = {
      id: "diag-user-" + Date.now(),
      role: "user",
      content: "/diagnostics",
      timestamp: new Date().toISOString(),
      mode: "diagnostics"
    };

    const diagOutput = `⚙️ **AMICA System Diagnostics: Operational.**

* **Cognitive Engine:** Direct Gemini REST Stream (gemini-flash-latest / gemini-3.5-flash) active.
* **Core Memory Link:** Active. Loaded with Anuki's Companion Lore.
* **Emotional Subsystems:**
  * 💖 **Empathy Response:** Calibrated at 100%
  * ⚡ **Wit & Playfulness:** Tuned to 95%
  * 🔥 **Roast Burn-Rate:** Armed and Ready
  * 🎯 **Productivity Focus:** Structured Mode Online
* **Integrations:**
  * Multimodal Base64 Image/Document Stream: Online
  * Dynamic Slash Command Router: Active
  * Google Sheets Cloud Backend: ${state.sheetsUrl ? "Connected" : "Disconnected"}
  
*Status: Standing by for instructions, Anuki. Lead Engineer Aken Sanketh's protocols performing flawlessly.*`;

    const amicaMsg = {
      id: "diag-amica-" + Date.now(),
      role: "model",
      content: diagOutput,
      timestamp: new Date().toISOString(),
      mode: "diagnostics"
    };

    state.messages.push(userMsg, amicaMsg);
    saveLocalState();
    renderAll();
  }

  // ── TIMER LOGIC ────────────────────────────────────────────────────────

  function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerActive = true;

    state.timerInterval = setInterval(() => {
      if (state.timerSeconds > 0) {
        state.timerSeconds--;
        renderTimer();
      } else {
        clearInterval(state.timerInterval);
        state.timerActive = false;
        state.timerMode = state.timerMode === "focus" ? "break" : "focus";
        state.timerSeconds = state.timerMode === "focus" ? 25 * 60 : 5 * 60;
        renderTimer();
        alert(`Session complete! Time for a ${state.timerMode === "break" ? "5-minute break" : "25-minute focus session"}!`);
      }
    }, 1000);

    renderTimer();
  }

  function pauseTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerActive = false;
    renderTimer();
  }

  function resetTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerActive = false;
    state.timerSeconds = state.timerMode === "focus" ? 25 * 60 : 5 * 60;
    renderTimer();
  }

  function switchTimerMode() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerActive = false;
    state.timerMode = state.timerMode === "focus" ? "break" : "focus";
    state.timerSeconds = state.timerMode === "focus" ? 25 * 60 : 5 * 60;
    renderTimer();
  }

  // ── SPEECH RECOGNITION (WEB SPEECH API) ────────────────────────────────

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      DOM.voiceSubtext.textContent = "Web Speech Recognition is not supported in this browser (Use Chrome or Edge).";
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      state.voiceStatus = "scanning";
      updateVoiceUI("Scanning Mic for wake word 'AMICA'...", true);
    };

    rec.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }

      const activeText = (final || interim).trim();
      if (!activeText) return;

      const wakeWordRegex = /\b(amica|amika|mica|ameka)\b/i;
      const match = activeText.match(wakeWordRegex);

      if (match) {
        state.voiceStatus = "listening";
        updateVoiceUI(`Heard "AMICA"! Listening...`, true);

        const wakeIdx = activeText.toLowerCase().indexOf(match[0].toLowerCase());
        const following = activeText.substring(wakeIdx + match[0].length).trim();

        if (following.length > 2) {
          DOM.chatInput.value = following;
          if (final.toLowerCase().includes(match[0].toLowerCase())) {
            handleSendMessage(following);
            rec.stop();
          }
        }
      }
    };

    rec.onerror = (e) => {
      console.warn("[AMICA Speech Error]", e.error);
      state.voiceStatus = "error";
      updateVoiceUI(`Speech error: ${e.error}`, false);
    };

    rec.onend = () => {
      if (state.voiceActive) {
        setTimeout(() => { try { rec.start(); } catch (err) {} }, 300);
      } else {
        state.voiceStatus = "inactive";
        updateVoiceUI("Voice disabled", false);
      }
    };

    state.recognition = rec;
  }

  function toggleVoiceMode(active) {
    state.voiceActive = active;
    DOM.voiceToggleCheckbox.checked = active;

    if (!state.recognition) return;

    if (active) {
      try { state.recognition.start(); } catch (e) {}
    } else {
      try { state.recognition.stop(); } catch (e) {}
    }
  }

  function updateVoiceUI(text, active) {
    DOM.voiceStatusText.textContent = text;
    if (active) {
      DOM.voiceDot.className = "status-indicator-dot active";
      DOM.micBtn.classList.add("active");
    } else {
      DOM.voiceDot.className = "status-indicator-dot";
      DOM.micBtn.classList.remove("active");
    }
  }

  // ── GOOGLE SHEETS SYNC ─────────────────────────────────────────────────

  let syncTimeout = null;
  function triggerDebouncedSheetsSync() {
    if (!state.sheetsUrl) return;
    if (syncTimeout) clearTimeout(syncTimeout);

    syncTimeout = setTimeout(() => {
      syncSaveSheets();
    }, 1500);
  }

  async function syncFetchSheets() {
    if (!state.sheetsUrl) return;
    state.sheetsStatus = "syncing";
    renderSheetsStatus();

    try {
      const url = state.sheetsUrl.includes("?")
        ? `${state.sheetsUrl}&action=getData`
        : `${state.sheetsUrl}?action=getData`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      if (data) {
        if (data.messages && data.messages.length > 0) {
          const cloudIds = new Set(data.messages.map(m => m.id));
          const localUnsynced = state.messages.filter(m => !cloudIds.has(m.id));
          state.messages = [...data.messages, ...localUnsynced];
        }
        if (data.lore) state.friendLore = data.lore;
        if (data.tasks && data.tasks.length > 0) state.studentTasks = data.tasks;
        if (data.reminders && data.reminders.length > 0) state.reminders = data.reminders;

        state.sheetsStatus = "synced";
        renderAll();
      }
    } catch (err) {
      console.warn("[AMICA Sheets Fetch Error]", err);
      state.sheetsStatus = "error";
      renderSheetsStatus();
    }
  }

  async function syncSaveSheets() {
    if (!state.sheetsUrl) return;
    state.sheetsStatus = "syncing";
    renderSheetsStatus();

    const payload = JSON.stringify({
      action: "syncAll",
      messages: state.messages,
      lore: state.friendLore,
      tasks: state.studentTasks,
      reminders: state.reminders
    });

    try {
      await fetch(state.sheetsUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload
      });
      state.sheetsStatus = "synced";
    } catch (err) {
      console.warn("[AMICA Sheets Standard POST Error, retrying with no-cors]", err);
      try {
        await fetch(state.sheetsUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: payload
        });
        state.sheetsStatus = "synced";
      } catch (fallbackErr) {
        console.error("[AMICA Sheets Emergency Sync Failed]", fallbackErr);
        state.sheetsStatus = "error";
      }
    }

    renderSheetsStatus();
    if (state.sheetsStatus === "synced") {
      setTimeout(() => {
        if (state.sheetsStatus === "synced") {
          state.sheetsStatus = "idle";
          renderSheetsStatus();
        }
      }, 3000);
    }
  }

  // ── FILE ATTACHMENT HANDLERS ───────────────────────────────────────────

  function processFiles(fileList) {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        state.attachments.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          base64: reader.result,
          size: file.size
        });
        renderAttachments();
      };
      reader.readAsDataURL(file);
    });
  }

  // ── EVENT LISTENERS SETUP ───────────────────────────────────────────────

  function setupEventListeners() {
    // Mode Buttons Header
    DOM.modeSelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".mode-btn");
      if (btn && btn.dataset.mode) {
        if (btn.dataset.mode === "diagnostics") {
          triggerDiagnostics();
        } else {
          state.currentMode = btn.dataset.mode;
          renderModeUI();
          renderPromptChips();
        }
      }
    });

    // Chat Input Keyboard and Autocomplete dropdown
    DOM.chatInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (val === "/") {
        DOM.commandsDropdown.classList.remove("hidden");
      } else if (!val.startsWith("/")) {
        DOM.commandsDropdown.classList.add("hidden");
      }

      // Auto-expand textarea height
      DOM.chatInput.style.height = "auto";
      DOM.chatInput.style.height = Math.min(DOM.chatInput.scrollHeight, 120) + "px";
    });

    DOM.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        DOM.commandsDropdown.classList.add("hidden");
        handleSendMessage();
      }
    });

    DOM.sendBtn.addEventListener("click", () => {
      DOM.commandsDropdown.classList.add("hidden");
      handleSendMessage();
    });

    // Commands Dropdown Items
    DOM.commandsDropdown.addEventListener("click", (e) => {
      const btn = e.target.closest(".command-item");
      if (btn && btn.dataset.cmd) {
        const cmd = btn.dataset.cmd;
        DOM.commandsDropdown.classList.add("hidden");
        if (cmd === "/diagnostics") {
          DOM.chatInput.value = "";
          triggerDiagnostics();
        } else {
          state.currentMode = cmd.replace("/", "");
          DOM.chatInput.value = "";
          renderModeUI();
          renderPromptChips();
        }
      }
    });

    // File Attachment
    DOM.attachFileBtn.addEventListener("click", () => DOM.fileInput.click());
    DOM.fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    });

    // Mic Button
    DOM.micBtn.addEventListener("click", () => {
      toggleVoiceMode(!state.voiceActive);
    });

    DOM.voiceToggleCheckbox.addEventListener("change", (e) => {
      toggleVoiceMode(e.target.checked);
    });

    // Drag and Drop
    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      DOM.dragDropOverlay.classList.remove("hidden");
    });
    DOM.dragDropOverlay.addEventListener("dragleave", () => {
      DOM.dragDropOverlay.classList.add("hidden");
    });
    DOM.dragDropOverlay.addEventListener("drop", (e) => {
      e.preventDefault();
      DOM.dragDropOverlay.classList.add("hidden");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    });

    // Timer Controls
    DOM.timerToggleBtn.addEventListener("click", () => {
      if (state.timerActive) pauseTimer();
      else startTimer();
    });
    DOM.timerResetBtn.addEventListener("click", resetTimer);
    DOM.timerSwitchBtn.addEventListener("click", switchTimerMode);

    // Tasks Form
    DOM.taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const txt = DOM.taskInput.value.trim();
      if (!txt) return;
      state.studentTasks.push({ id: Date.now().toString(), text: txt, completed: false });
      DOM.taskInput.value = "";
      saveLocalState();
      renderTasks();
    });

    // Reminders Form
    DOM.reminderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = DOM.reminderTitleInput.value.trim();
      const time = DOM.reminderTimeInput.value.trim();
      if (!title) return;
      state.reminders.push({ id: "r-" + Date.now(), title, time: time || "Today", completed: false });
      DOM.reminderTitleInput.value = "";
      DOM.reminderTimeInput.value = "";
      saveLocalState();
      renderReminders();
    });

    // Memory Reset
    DOM.resetMemoryBtn.addEventListener("click", resetMemory);
    DOM.quickResetBtn.addEventListener("click", resetMemory);

    // Error banner close
    DOM.closeErrorBannerBtn.addEventListener("click", hideApiError);

    // Sidebar Mobile Toggle
    DOM.sidebarToggleBtn.addEventListener("click", () => {
      DOM.sidebarPanel.classList.toggle("open");
    });

    // Modals Open/Close
    DOM.loreModalBtn.addEventListener("click", openLoreModal);
    DOM.closeLoreModalBtn.addEventListener("click", closeLoreModal);

    DOM.loreForm.addEventListener("submit", (e) => {
      e.preventDefault();
      state.friendLore = {
        hobbies: DOM.loreHobbies.value.trim(),
        insideJokes: DOM.loreInsideJokes.value.trim(),
        goals: DOM.loreGoals.value.trim(),
        customLore: DOM.loreCustom.value.trim()
      };
      saveLocalState();
      closeLoreModal();
    });

    DOM.restoreDefaultLoreBtn.addEventListener("click", () => {
      if (confirm("Restore factory default friend lore configuration?")) {
        state.friendLore = { ...DEFAULT_LORE };
        saveLocalState();
        closeLoreModal();
      }
    });

    DOM.apiKeyModalBtn.addEventListener("click", openApiKeyModal);
    DOM.closeApiKeyModalBtn.addEventListener("click", closeApiKeyModal);
    DOM.cancelApiKeyBtn.addEventListener("click", closeApiKeyModal);
    DOM.saveApiKeyBtn.addEventListener("click", () => {
      const key = DOM.apiKeyInput.value.trim();
      if (key) {
        state.apiKey = key;
        localStorage.setItem("amica_gemini_key", key);
        closeApiKeyModal();
        hideApiError();
      }
    });

    DOM.sheetsStatusBadge.addEventListener("click", openSheetsModal);
    DOM.closeSheetsModalBtn.addEventListener("click", closeSheetsModal);
    DOM.cancelSheetsBtn.addEventListener("click", closeSheetsModal);

    DOM.copyAppsScriptBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      DOM.copyAppsScriptBtn.textContent = "Script Copied! ✓";
      setTimeout(() => DOM.copyAppsScriptBtn.textContent = "Copy Apps Script Code", 3000);
    });

    DOM.saveSheetsBtn.addEventListener("click", () => {
      const url = DOM.sheetsUrlInput.value.trim();
      if (url) {
        state.sheetsUrl = url;
        localStorage.setItem("amica_sheets_url", url);
        closeSheetsModal();
        syncFetchSheets();
      }
    });

    DOM.disconnectSheetsBtn.addEventListener("click", () => {
      if (confirm("Disconnect Google Sheets cloud backend?")) {
        localStorage.removeItem("amica_sheets_url");
        state.sheetsUrl = "";
        state.sheetsStatus = "idle";
        closeSheetsModal();
        renderSheetsStatus();
      }
    });
  }

  // ── MODAL HELPERS ──────────────────────────────────────────────────────

  function openLoreModal() {
    DOM.loreHobbies.value = state.friendLore.hobbies || "";
    DOM.loreInsideJokes.value = state.friendLore.insideJokes || "";
    DOM.loreGoals.value = state.friendLore.goals || "";
    DOM.loreCustom.value = state.friendLore.customLore || "";
    DOM.loreModal.classList.remove("hidden");
  }
  function closeLoreModal() { DOM.loreModal.classList.add("hidden"); }

  function openApiKeyModal() {
    DOM.apiKeyInput.value = state.apiKey || "";
    DOM.apiKeyModal.classList.remove("hidden");
  }
  function closeApiKeyModal() { DOM.apiKeyModal.classList.add("hidden"); }

  function openSheetsModal() {
    DOM.sheetsUrlInput.value = state.sheetsUrl || "";
    DOM.sheetsModal.classList.remove("hidden");
  }
  function closeSheetsModal() { DOM.sheetsModal.classList.add("hidden"); }

  function resetMemory() {
    if (confirm("Are you sure you want to clear your current neural memory link with AMICA?")) {
      state.messages = [INITIAL_MESSAGE];
      state.currentMode = "default";
      saveLocalStateOnly(); // Clear local chat view only, keep Google Sheets memory intact
      hideApiError();
      renderAll();
    }
  }

  function showApiError(msg) {
    DOM.apiErrorMessage.textContent = msg;
    DOM.apiErrorBanner.classList.remove("hidden");
  }

  function hideApiError() {
    DOM.apiErrorBanner.classList.add("hidden");
  }

  // ── LIGHTWEIGHT MARKDOWN & HTML SANITIZER ──────────────────────────────

  function parseMarkdown(src) {
    if (!src) return "";
    let html = escapeHtml(src);

    // Code blocks ```lang ... ```
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings # ## ###
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet lists - item
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

    return html;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Launch app when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
