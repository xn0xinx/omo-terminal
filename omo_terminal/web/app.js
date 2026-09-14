/**
 * omo-terminal client application controller.
 * Manages WebSocket event stream, prompt input, dual telemetry, and BBS teletype drawer.
 */
(function() {
  "use strict";

  const cliInput = document.getElementById("cli-input");
  const sendBtn = document.getElementById("cli-send-btn");
  const stopBtn = document.getElementById("cli-stop-btn");
  const statusBadge = document.getElementById("status-badge");
  const actionTicker = document.getElementById("action-ticker");
  const modelSelect = document.getElementById("model-select");
  const leftTelemetry = document.getElementById("telemetry-left");
  const rightTelemetry = document.getElementById("telemetry-right");
  const bbsDrawer = document.getElementById("bbs-drawer");
  const bbsOutput = document.getElementById("bbs-output");
  const drawerToggle = document.getElementById("drawer-toggle");
  const bbsCloseBtn = document.getElementById("bbs-close-btn");
  const bbsCopyBtn = document.getElementById("bbs-copy-btn");

  let ws = null;
  let history = [];
  let historyIdx = -1;
  let isWorking = false;
  let reconnectTimer = null;

  // --------------------------------------------------------------------------
  // Telemetry Scroll Helpers
  // --------------------------------------------------------------------------
  function appendTelemetry(container, lines, isDim) {
    if (!container || !lines) return;
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach(line => {
      const el = document.createElement("div");
      el.className = "t-line" + (isDim ? " dim" : "");
      el.textContent = line;
      container.appendChild(el);
    });

    // Keep max 35 lines in viewport
    while (container.children.length > 35) {
      container.removeChild(container.firstChild);
    }
  }

  // --------------------------------------------------------------------------
  // BBS Drawer Helpers
  // --------------------------------------------------------------------------
  function toggleDrawer(force) {
    const isHidden = bbsDrawer.classList.contains("drawer-hidden");
    const open = force !== undefined ? force : isHidden;
    if (open) {
      bbsDrawer.classList.remove("drawer-hidden");
      drawerToggle.textContent = "HIDE";
    } else {
      bbsDrawer.classList.add("drawer-hidden");
      drawerToggle.textContent = "SHOW";
    }
  }

  drawerToggle.addEventListener("click", () => toggleDrawer());
  bbsCloseBtn.addEventListener("click", () => toggleDrawer(false));

  bbsCopyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(bbsOutput.textContent).then(() => {
      bbsCopyBtn.textContent = "[COPIED!]";
      setTimeout(() => { bbsCopyBtn.textContent = "[COPY]"; }, 1500);
    });
  });

  // --------------------------------------------------------------------------
  // WebSocket Connection
  // --------------------------------------------------------------------------
  function connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      statusBadge.textContent = "ONLINE [CONNECTED]";
      statusBadge.style.color = "var(--crt-bright)";
    };

    ws.onclose = () => {
      statusBadge.textContent = "OFFLINE [DISCONNECTED]";
      statusBadge.style.color = "#ff4444";
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleEvent(msg);
      } catch (err) {
        console.error("Malformed event:", evt.data);
      }
    };
  }

  function handleEvent(ev) {
    switch (ev.type) {
      case "snapshot":
        if (ev.models && ev.models.length) {
          populateModels(ev.models, ev.model);
        }
        if (ev.status) statusBadge.textContent = ev.status;
        if (ev.action) actionTicker.textContent = `> OMO: ${ev.action} <`;
        if (ev.mascot && window.OmoMascot) window.OmoMascot.play(ev.mascot);
        break;

      case "init":
        statusBadge.textContent = "ONLINE [READY]";
        appendTelemetry(leftTelemetry, [
          `[INIT] session: ${ev.conversation_id ? ev.conversation_id.slice(0, 8) : "local"}`,
          `[CWD] ${ev.cwd || "/home/noxin/Work"}`,
        ], true);
        break;

      case "status":
        if (ev.status) statusBadge.textContent = ev.status;
        if (ev.action) actionTicker.textContent = `> OMO: ${ev.action} <`;
        if (ev.mascot && window.OmoMascot) window.OmoMascot.play(ev.mascot);
        break;

      case "user_msg":
        isWorking = true;
        updateWorkingUI(true);
        bbsOutput.textContent = "";
        appendTelemetry(leftTelemetry, [`> ${ev.text}`]);
        if (window.OmoMascot) window.OmoMascot.play("thinking");
        break;

      case "assistant_delta":
        toggleDrawer(true);
        bbsOutput.textContent += ev.delta;
        bbsDrawer.querySelector("#bbs-drawer-body").scrollTop = 999999;
        if (window.OmoMascot) window.OmoMascot.play("talking");
        break;

      case "tool_start":
        if (ev.mascot && window.OmoMascot) window.OmoMascot.play(ev.mascot);
        if (ev.summary) {
          actionTicker.textContent = `> OMO: ${ev.name.toUpperCase()} <`;
          appendTelemetry(leftTelemetry, [ev.summary]);
        }
        break;

      case "tool_end":
        if (ev.mascot && window.OmoMascot) window.OmoMascot.play(ev.mascot);
        break;

      case "telemetry_left":
        appendTelemetry(leftTelemetry, ev.lines, false);
        break;

      case "telemetry_right":
        if (ev.lines) {
          appendTelemetry(rightTelemetry, ev.lines, false);
        } else if (ev.chunk) {
          const lines = ev.chunk.split("\n").filter(l => l.trim().length > 0);
          if (lines.length) appendTelemetry(rightTelemetry, lines.slice(0, 3), true);
        }
        break;

      case "result":
        isWorking = false;
        updateWorkingUI(false);
        const resTag = (ev.status === "error" || ev.status === "failed") ? "failure" : "success";
        if (window.OmoMascot) {
          window.OmoMascot.play(resTag);
          setTimeout(() => {
            if (!isWorking && window.OmoMascot) window.OmoMascot.play("idle");
          }, 3500);
        }
        appendTelemetry(leftTelemetry, [`[STATUS] ${ev.status}`], true);
        break;
    }
  }

  function updateWorkingUI(working) {
    if (working) {
      sendBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
    } else {
      sendBtn.classList.remove("hidden");
      stopBtn.classList.add("hidden");
    }
  }

  function populateModels(models, current) {
    modelSelect.innerHTML = "";
    models.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === current) opt.selected = true;
      modelSelect.appendChild(opt);
    });
  }

  modelSelect.addEventListener("change", () => {
    const chosen = modelSelect.value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "model", model: chosen }));
    }
    actionTicker.textContent = `> SWITCHING MODEL: ${chosen} <`;
  });

  // --------------------------------------------------------------------------
  // User Prompt Submission & Keyboard Handlers
  // --------------------------------------------------------------------------
  function sendPrompt() {
    const text = cliInput.value.trim();
    if (!text) return;

    history.push(text);
    historyIdx = history.length;
    cliInput.value = "";

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "send", text: text }));
    }
  }

  function interruptTurn() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "interrupt" }));
    }
    actionTicker.textContent = "> OMO: HALTING <";
  }

  sendBtn.addEventListener("click", sendPrompt);
  stopBtn.addEventListener("click", interruptTurn);

  cliInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendPrompt();
    } else if (e.key === "ArrowUp") {
      if (history.length && historyIdx > 0) {
        historyIdx--;
        cliInput.value = history[historyIdx];
      }
    } else if (e.key === "ArrowDown") {
      if (historyIdx < history.length - 1) {
        historyIdx++;
        cliInput.value = history[historyIdx];
      } else {
        historyIdx = history.length;
        cliInput.value = "";
      }
    } else if (e.key === "Escape") {
      toggleDrawer(false);
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      interruptTurn();
    }
  });

  // --------------------------------------------------------------------------
  // Dynamic CRT Themes & OS Default Synchronization

  // --------------------------------------------------------------------------
  const THEME_PRESETS = {
    "classic-green": {
      name: "Classic Green",
      bg: "#030e06",
      fg: "#33ff66",
      bright: "#66ff88",
      dim: "#1d8036",
      dark: "#07220e",
      glow: "rgba(51, 255, 102, 0.7)",
      glowSoft: "rgba(51, 255, 102, 0.3)",
      bezel: "#020402",
      tint: [0.02, 0.12, 0.04],
    },
    "amber-crt": {
      name: "Amber Phosphor",
      bg: "#120800",
      fg: "#ffb000",
      bright: "#ffd24d",
      dim: "#805000",
      dark: "#261300",
      glow: "rgba(255, 176, 0, 0.7)",
      glowSoft: "rgba(255, 176, 0, 0.3)",
      bezel: "#080400",
      tint: [0.15, 0.09, 0.01],
    },
    "cyber-cyan": {
      name: "Cyberpunk Cyan",
      bg: "#010f17",
      fg: "#00f0ff",
      bright: "#80f7ff",
      dim: "#006b7a",
      dark: "#03202e",
      glow: "rgba(0, 240, 255, 0.7)",
      glowSoft: "rgba(0, 240, 255, 0.3)",
      bezel: "#01080d",
      tint: [0.01, 0.12, 0.15],
    },
    "tokyo-night": {
      name: "Tokyo Night",
      bg: "#16161e",
      fg: "#7aa2f7",
      bright: "#bb9af7",
      dim: "#3b4261",
      dark: "#1f2335",
      glow: "rgba(122, 162, 247, 0.65)",
      glowSoft: "rgba(187, 154, 247, 0.3)",
      bezel: "#0f0f15",
      tint: [0.06, 0.08, 0.14],
    },
    "blood-matrix": {
      name: "Blood Matrix",
      bg: "#140205",
      fg: "#ff3344",
      bright: "#ff6b7a",
      dim: "#851724",
      dark: "#2b050b",
      glow: "rgba(255, 51, 68, 0.7)",
      glowSoft: "rgba(255, 51, 68, 0.3)",
      bezel: "#0a0102",
      tint: [0.15, 0.02, 0.03],
    },
    "synthwave": {
      name: "Synthwave 84",
      bg: "#14051a",
      fg: "#ff71ce",
      bright: "#01cdfe",
      dim: "#79287a",
      dark: "#290936",
      glow: "rgba(255, 113, 206, 0.7)",
      glowSoft: "rgba(1, 205, 254, 0.3)",
      bezel: "#0a020d",
      tint: [0.14, 0.04, 0.12],
    },
  };

  const themeSelect = document.getElementById("theme-select");
  const themeFlipBtn = document.getElementById("theme-flip-btn");
  let osDefaultTheme = null;

  async function fetchOSDefault() {
    try {
      const res = await fetch("/api/theme");
      if (!res.ok) return null;
      const data = await res.json();
      const pal = data.palette || {};
      return {
        name: `OS Default (${data.name || "Omarchy"})`,
        bg: pal.bg || "#13131D",
        fg: pal.fg || "#c8c8c8",
        bright: pal.bright || "#EA90A8",
        dim: pal.dim || "#434353",
        dark: pal.dark || "#181825",
        glow: "rgba(234, 144, 168, 0.65)",
        glowSoft: "rgba(124, 124, 168, 0.3)",
        bezel: pal.bezel || "#0b0b12",
        tint: [0.08, 0.06, 0.10],
      };
    } catch (e) {
      return null;
    }
  }

  async function applyTheme(key) {
    let t = null;
    if (key === "os-default") {
      if (!osDefaultTheme) {
        osDefaultTheme = await fetchOSDefault();
      }
      t = osDefaultTheme || THEME_PRESETS["classic-green"];
    } else {
      t = THEME_PRESETS[key] || THEME_PRESETS["classic-green"];
    }

    const root = document.documentElement;
    root.style.setProperty("--crt-bg", t.bg);
    root.style.setProperty("--crt-green", t.fg);
    root.style.setProperty("--crt-bright", t.bright);
    root.style.setProperty("--crt-dim", t.dim);
    root.style.setProperty("--crt-dark", t.dark);
    root.style.setProperty("--crt-glow", t.glow);
    root.style.setProperty("--crt-glow-soft", t.glowSoft);
    root.style.setProperty("--bezel-color", t.bezel);

    if (window.CRTController && window.CRTController.setTint) {
      window.CRTController.setTint(t.tint);
    }

    if (themeSelect) themeSelect.value = key;
    localStorage.setItem("omo_terminal_theme", key);
    actionTicker.textContent = `> THEME: ${t.name.toUpperCase()} <`;
  }

  function flipTheme() {
    const cur = themeSelect ? themeSelect.value : "classic-green";
    const next = (cur === "classic-green") ? "os-default" : "classic-green";
    applyTheme(next);
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      applyTheme(themeSelect.value);
    });
  }

  if (themeFlipBtn) {
    themeFlipBtn.addEventListener("click", flipTheme);
  }

  // Keyboard shortcut: F2 or Alt+T to quickly flip between Classic Green and OS Default
  window.addEventListener("keydown", (e) => {
    if (e.key === "F2" || (e.altKey && (e.key === "t" || e.key === "T"))) {
      e.preventDefault();
      flipTheme();
    }
  });

  // Restore saved theme on startup
  const savedTheme = localStorage.getItem("omo_terminal_theme") || "classic-green";
  applyTheme(savedTheme);

  connect();

})();
