(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     State
     --------------------------------------------------------------------- */
  let lastResult = null;   // most recent /api/analyze response.result
  let selectedFile = null; // File object for optional soil photo
  let deferredInstallPrompt = null;

  const FIELD_LIMITS = {
    nitrogen: [0, 2000],
    phosphorus: [0, 500],
    potassium: [0, 1000],
    ph: [0, 14],
    organicMatter: [0, 20],
    moisture: [0, 100]
  };

  /* ---------------------------------------------------------------------
     DOM refs
     --------------------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const soilForm = $("#soilForm");
  const btnAnalyze = $("#btnAnalyze");
  const analyzeLabel = $("#analyzeLabel");
  const btnResetForm = $("#btnResetForm");

  const btnCamera = $("#btnCamera");
  const btnGallery = $("#btnGallery");
  const fileCamera = $("#fileCamera");
  const fileGallery = $("#fileGallery");
  const imagePreviewWrap = $("#imagePreviewWrap");
  const imagePreview = $("#imagePreview");
  const removePhoto = $("#removePhoto");
  const imageError = $("#imageError");

  const resultsEmpty = $("#resultsEmpty");
  const resultsContent = $("#resultsContent");
  const scoreArc = $("#scoreArc");
  const scoreValue = $("#scoreValue");
  const scoreRatingBadge = $("#scoreRatingBadge");
  const scoreNum = $("#scoreNum");
  const paramGrid = $("#paramGrid");
  const deficiencyList = $("#deficiencyList");
  const fertilizerList = $("#fertilizerList");
  const managementList = $("#managementList");
  const topCropsList = $("#topCropsList");
  const viewAllCropsLink = $("#viewAllCropsLink");
  const btnListen = $("#btnListen");
  const listenLabel = $("#listenLabel");
  const btnDownloadPdf = $("#btnDownloadPdf");
  const btnSaveHistory = $("#btnSaveHistory");

  const cropsEmpty = $("#cropsEmpty");
  const allCropsList = $("#allCropsList");

  const historyEmpty = $("#historyEmpty");
  const historyList = $("#historyList");
  const btnClearHistory = $("#btnClearHistory");

  const langSelect = $("#langSelect");
  const installBtn = $("#installBtn");
  const offlineBanner = $("#offlineBanner");
  const toast = $("#toast");

  const SCORE_CIRCUMFERENCE = 2 * Math.PI * 42;

  /* ---------------------------------------------------------------------
     Navigation
     --------------------------------------------------------------------- */
  function switchView(viewId) {
    $$(".view").forEach(v => v.classList.toggle("active", v.id === viewId));
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
    if (viewId === "view-crops") renderAllCrops();
    if (viewId === "view-history") loadHistory();
  }
  $$(".nav-btn").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  viewAllCropsLink.addEventListener("click", () => switchView("view-crops"));

  /* ---------------------------------------------------------------------
     Toast
     --------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ---------------------------------------------------------------------
     Form validation
     --------------------------------------------------------------------- */
  function validateField(name) {
    const group = document.querySelector(`.field-group[data-field="${name}"]`);
    const input = group.querySelector("input");
    const [min, max] = FIELD_LIMITS[name];
    const value = parseFloat(input.value);
    const errorEl = group.querySelector(".field-error");
    let valid = true;

    if (input.value.trim() === "" || Number.isNaN(value)) {
      valid = false;
      errorEl.textContent = I18N.t("err_required");
    } else if (value < min || value > max) {
      valid = false;
      errorEl.textContent = I18N.t("err_range");
    }

    group.classList.toggle("invalid", !valid);
    errorEl.classList.toggle("show", !valid);
    return valid;
  }

  function validateForm() {
    return Object.keys(FIELD_LIMITS).map(validateField).every(Boolean);
  }

  Object.keys(FIELD_LIMITS).forEach(name => {
    const input = document.getElementById(`input-${name}`);
    input.addEventListener("blur", () => validateField(name));
    input.addEventListener("input", () => {
      const group = input.closest(".field-group");
      if (group.classList.contains("invalid")) validateField(name);
    });
  });

  /* ---------------------------------------------------------------------
     Image upload
     --------------------------------------------------------------------- */
  function handleFileSelected(file) {
    imageError.textContent = "";
    imageError.classList.remove("show");
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      imageError.textContent = I18N.t("err_image_type");
      imageError.classList.add("show");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      imageError.textContent = I18N.t("err_image_size");
      imageError.classList.add("show");
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreviewWrap.classList.add("show");
    };
    reader.readAsDataURL(file);
  }

  btnCamera.addEventListener("click", () => fileCamera.click());
  btnGallery.addEventListener("click", () => fileGallery.click());
  fileCamera.addEventListener("change", (e) => handleFileSelected(e.target.files[0]));
  fileGallery.addEventListener("change", (e) => handleFileSelected(e.target.files[0]));
  removePhoto.addEventListener("click", () => {
    selectedFile = null;
    imagePreview.src = "";
    imagePreviewWrap.classList.remove("show");
    fileCamera.value = "";
    fileGallery.value = "";
  });

  /* ---------------------------------------------------------------------
     Form submit -> analyze
     --------------------------------------------------------------------- */
  soilForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      Object.keys(FIELD_LIMITS).forEach(name => {
        formData.append(name, document.getElementById(`input-${name}`).value);
      });
      if (selectedFile) formData.append("soilImage", selectedFile);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) {
        showToast((data.errors && data.errors[0]) || I18N.t("err_analysis_failed"));
        return;
      }

      lastResult = data.result;
      renderResults(lastResult);
      switchView("view-results");
    } catch (err) {
      showToast(I18N.t("err_analysis_failed"));
    } finally {
      setAnalyzing(false);
    }
  });

  function setAnalyzing(isAnalyzing) {
    btnAnalyze.disabled = isAnalyzing;
    if (isAnalyzing) {
      analyzeLabel.textContent = I18N.t("btn_analyzing");
      btnAnalyze.insertAdjacentHTML("afterbegin", '<span class="spinner" id="analyzeSpinner"></span>');
    } else {
      analyzeLabel.textContent = I18N.t("btn_analyze");
      const sp = document.getElementById("analyzeSpinner");
      if (sp) sp.remove();
    }
  }

  btnResetForm.addEventListener("click", () => {
    soilForm.reset();
    $$(".field-group").forEach(g => { g.classList.remove("invalid"); g.querySelector(".field-error").classList.remove("show"); });
    selectedFile = null;
    imagePreview.src = "";
    imagePreviewWrap.classList.remove("show");
  });

  /* ---------------------------------------------------------------------
     Rendering: Results
     --------------------------------------------------------------------- */
  function prettyLevel(level) {
    return level.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function levelLabel(level) {
    if (level === "low" || level === "medium" || level === "high") return I18N.t(`level_${level}`);
    return prettyLevel(level);
  }

  function renderResults(result) {
    resultsEmpty.classList.add("hidden");
    resultsContent.classList.remove("hidden");

    // Score ring
    const score = result.soilHealth.overallScore;
    scoreValue.textContent = score;
    scoreNum.textContent = score;
    const offset = SCORE_CIRCUMFERENCE - (score / 100) * SCORE_CIRCUMFERENCE;
    scoreArc.setAttribute("stroke-dashoffset", offset.toFixed(1));
    const ringColor = { excellent: "#33633D", good: "#33633D", fair: "#C68A22", poor: "#A3352A" }[result.soilHealth.ratingColor] || "#33633D";
    scoreArc.setAttribute("stroke", ringColor);
    scoreRatingBadge.className = `score-rating-badge ${result.soilHealth.ratingColor}`;
    scoreRatingBadge.textContent = I18N.t(`results_rating_${result.soilHealth.ratingColor}`);

    // Parameter tiles
    const paramDefs = [
      { key: "nitrogen", labelKey: "field_nitrogen", unit: I18N.t("unit_kgha") },
      { key: "phosphorus", labelKey: "field_phosphorus", unit: I18N.t("unit_kgha") },
      { key: "potassium", labelKey: "field_potassium", unit: I18N.t("unit_kgha") },
      { key: "ph", labelKey: "field_ph", unit: "" },
      { key: "organicMatter", labelKey: "field_organicMatter", unit: I18N.t("unit_percent") },
      { key: "moisture", labelKey: "field_moisture", unit: I18N.t("unit_percent") }
    ];
    const levels = result.recommendations.levels;
    const levelMap = {
      nitrogen: levels.nitrogenLevel, phosphorus: levels.phosphorusLevel, potassium: levels.potassiumLevel,
      ph: levels.phLevel, organicMatter: levels.organicMatterLevel, moisture: levels.moistureLevel
    };
    paramGrid.innerHTML = paramDefs.map(p => `
      <div class="param-tile">
        <div class="param-label">${I18N.t(p.labelKey)}</div>
        <div class="param-value">${result.input[p.key]}${p.unit ? " " + p.unit : ""}</div>
        <span class="param-level ${levelMap[p.key]}">${levelLabel(levelMap[p.key])}</span>
      </div>
    `).join("");

    // Deficiency / status cards
    deficiencyList.innerHTML = result.recommendations.deficiencies.map(d => `
      <div class="card status-${d.severity}">
        <div class="card-header">
          <h3>${d.label}</h3>
          <span class="severity-badge ${d.severity}">${I18N.t(`severity_${d.severity}`)}</span>
        </div>
        <p>${d.title} &mdash; ${d.value}${d.unit ? " " + d.unit : ""}</p>
      </div>
    `).join("");

    // Fertilizer plan
    fertilizerList.innerHTML = result.recommendations.fertilizerPlan.length
      ? result.recommendations.fertilizerPlan.map(f => `
          <div class="card">
            <h3>${f.parameter}</h3>
            <ul class="rec-list">${f.actions.map(a => `<li>${a}</li>`).join("")}</ul>
            ${f.application ? `<div class="application-note"><strong>${I18N.t("results_application_title")}:</strong> ${f.application}</div>` : ""}
          </div>
        `).join("")
      : `<div class="card status-none"><p style="margin:0;">${I18N.t("severity_none")} &mdash; no corrective fertilizer needed right now.</p></div>`;

    // Management plan
    managementList.innerHTML = result.recommendations.managementPlan.length
      ? result.recommendations.managementPlan.map(m => `
          <div class="card">
            <h3>${m.parameter}</h3>
            <ul class="rec-list">${m.actions.map(a => `<li>${a}</li>`).join("")}</ul>
          </div>
        `).join("")
      : `<div class="card status-none"><p style="margin:0;">${I18N.t("severity_none")} &mdash; current practices look sufficient.</p></div>`;

    // Top crops
    topCropsList.innerHTML = result.crops.top.map((c, i) => cropCardHTML(c, i + 1)).join("");
  }

  function cropCardHTML(c, rank) {
    const nativeName = I18N.getLang() === "hi" ? c.hindi : (I18N.getLang() === "kn" ? c.kannada : "");
    return `
      <div class="card crop-card">
        <div class="crop-rank">${rank}</div>
        <div class="crop-info">
          <div class="crop-name">${c.name}${nativeName ? ` <span class="crop-native">(${nativeName})</span>` : ""}</div>
          <div class="crop-notes">${c.notes}</div>
        </div>
        <div class="crop-score">
          <div class="score-num">${c.score}</div>
          <span class="crop-category ${c.category}">${I18N.t(`crop_category_${c.category}`)}</span>
        </div>
      </div>
    `;
  }

  function renderAllCrops() {
    if (!lastResult) {
      cropsEmpty.classList.remove("hidden");
      allCropsList.classList.add("hidden");
      return;
    }
    cropsEmpty.classList.add("hidden");
    allCropsList.classList.remove("hidden");
    allCropsList.innerHTML = lastResult.crops.all.map((c, i) => cropCardHTML(c, i + 1)).join("");
  }

  /* ---------------------------------------------------------------------
     Voice output
     --------------------------------------------------------------------- */
  function buildSpokenSummary(result) {
    const parts = [];
    parts.push(`Soil health score: ${result.soilHealth.overallScore} out of 100, rated ${result.soilHealth.rating}.`);
    const critical = result.recommendations.deficiencies.filter(d => d.severity === "high");
    if (critical.length) {
      parts.push(`Key issues found: ${critical.map(d => d.title).join(", ")}.`);
    } else {
      parts.push("No critical nutrient issues were found.");
    }
    if (result.recommendations.fertilizerPlan.length) {
      const first = result.recommendations.fertilizerPlan[0];
      parts.push(`Top fertilizer recommendation for ${first.parameter}: ${first.actions[0]}.`);
    }
    if (result.crops.top.length) {
      parts.push(`Most suitable crops: ${result.crops.top.slice(0, 3).map(c => c.name).join(", ")}.`);
    }
    return parts.join(" ");
  }

  let speaking = false;
  btnListen.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      showToast("Voice output is not supported on this device.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      speaking = false;
      listenLabel.textContent = I18N.t("results_listen");
      return;
    }
    if (!lastResult) return;
    const utterance = new SpeechSynthesisUtterance(buildSpokenSummary(lastResult));
    utterance.lang = I18N.getVoiceLang();
    utterance.onend = () => { speaking = false; listenLabel.textContent = I18N.t("results_listen"); };
    utterance.onerror = () => { speaking = false; listenLabel.textContent = I18N.t("results_listen"); };
    window.speechSynthesis.speak(utterance);
    speaking = true;
    listenLabel.textContent = I18N.t("results_stop");
  });

  /* ---------------------------------------------------------------------
     PDF report
     --------------------------------------------------------------------- */
  btnDownloadPdf.addEventListener("click", () => {
    if (!lastResult || !window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;
    const lineGap = 16;
    const pageHeight = doc.internal.pageSize.getHeight();

    function ensureSpace(extra = lineGap) {
      if (y + extra > pageHeight - margin) { doc.addPage(); y = margin; }
    }
    function heading(text, size = 14) {
      ensureSpace(size + 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.text(text, margin, y);
      y += size + 8;
    }
    function paragraph(text, size = 10.5) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const wrapped = doc.splitTextToSize(text, 515);
      wrapped.forEach(line => { ensureSpace(); doc.text(line, margin, y); y += lineGap; });
    }
    function bullet(text) {
      ensureSpace();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const wrapped = doc.splitTextToSize(`\u2022 ${text}`, 505);
      wrapped.forEach((line, idx) => { ensureSpace(); doc.text(idx === 0 ? line : `  ${line}`, margin + 10, y); y += lineGap; });
    }

    heading("AI Soil Analytics - Soil Health Report", 16);
    paragraph(`Generated: ${new Date(lastResult.timestamp).toLocaleString()}`);
    y += 4;

    heading("Soil Health Score");
    paragraph(`${lastResult.soilHealth.overallScore} / 100 (${lastResult.soilHealth.rating})`);
    y += 4;

    heading("Soil Parameters");
    const p = lastResult.input;
    paragraph(`Nitrogen (N): ${p.nitrogen} kg/ha   Phosphorus (P): ${p.phosphorus} kg/ha   Potassium (K): ${p.potassium} kg/ha`);
    paragraph(`Soil pH: ${p.ph}   Organic Matter: ${p.organicMatter}%   Moisture: ${p.moisture}%`);
    y += 4;

    heading("Nutrient & Condition Status");
    lastResult.recommendations.deficiencies.forEach(d => bullet(`${d.label}: ${d.title} [${d.severity.toUpperCase()}]`));
    y += 4;

    heading("Fertilizer Recommendations");
    if (lastResult.recommendations.fertilizerPlan.length) {
      lastResult.recommendations.fertilizerPlan.forEach(f => {
        paragraph(f.parameter, 11.5);
        f.actions.forEach(a => bullet(a));
        if (f.application) bullet(`How to apply: ${f.application}`);
        y += 2;
      });
    } else {
      paragraph("No corrective fertilizer needed at this time.");
    }
    y += 4;

    heading("Soil Management Advice");
    if (lastResult.recommendations.managementPlan.length) {
      lastResult.recommendations.managementPlan.forEach(m => {
        paragraph(m.parameter, 11.5);
        m.actions.forEach(a => bullet(a));
        y += 2;
      });
    } else {
      paragraph("Current practices appear sufficient.");
    }
    y += 4;

    heading("Suitable Crops");
    lastResult.crops.top.forEach((c, i) => bullet(`${i + 1}. ${c.name} - Score ${c.score}/100 (${prettyLevel(c.category)})`));

    doc.save(`soil-health-report-${Date.now()}.pdf`);
  });

  /* ---------------------------------------------------------------------
     History
     --------------------------------------------------------------------- */
  btnSaveHistory.addEventListener("click", async () => {
    if (!lastResult) return;
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastResult)
      });
      const data = await res.json();
      if (data.success) showToast(I18N.t("results_saved"));
    } catch (e) {
      showToast(I18N.t("err_analysis_failed"));
    }
  });

  async function loadHistory() {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      const items = (data && data.history) || [];
      if (!items.length) {
        historyEmpty.classList.remove("hidden");
        historyList.classList.add("hidden");
        btnClearHistory.classList.add("hidden");
        return;
      }
      historyEmpty.classList.add("hidden");
      historyList.classList.remove("hidden");
      btnClearHistory.classList.remove("hidden");
      historyList.innerHTML = items.map(h => `
        <div class="card history-item" data-id="${h.id}">
          <div class="history-meta">
            <div class="history-score">${h.soilHealth.overallScore}/100 &middot; ${h.soilHealth.rating}</div>
            <div class="history-date">${new Date(h.timestamp).toLocaleString()}</div>
          </div>
          <div class="history-actions">
            <button class="btn-view" data-id="${h.id}">${I18N.t("history_view")}</button>
            <button class="btn-delete" data-id="${h.id}">${I18N.t("history_delete")}</button>
          </div>
        </div>
      `).join("");

      historyList.querySelectorAll(".btn-view").forEach(btn => {
        btn.addEventListener("click", () => {
          const record = items.find(h => h.id === btn.dataset.id);
          if (record) {
            lastResult = record;
            renderResults(record);
            switchView("view-results");
          }
        });
      });
      historyList.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", async () => {
          await fetch(`/api/history/${btn.dataset.id}`, { method: "DELETE" });
          loadHistory();
        });
      });
    } catch (e) {
      historyEmpty.classList.remove("hidden");
      historyList.classList.add("hidden");
    }
  }

  btnClearHistory.addEventListener("click", async () => {
    if (!confirm(I18N.t("history_confirm_clear"))) return;
    await fetch("/api/history", { method: "DELETE" });
    loadHistory();
  });

  /* ---------------------------------------------------------------------
     Language switching
     --------------------------------------------------------------------- */
  langSelect.addEventListener("change", async () => {
    const lang = langSelect.value;
    localStorage.setItem("soilapp_lang", lang);
    await I18N.load(lang);
    if (lastResult) renderResults(lastResult);
    const activeView = document.querySelector(".view.active")?.id;
    if (activeView === "view-crops") renderAllCrops();
    if (activeView === "view-history") loadHistory();
  });

  /* ---------------------------------------------------------------------
     PWA: install prompt + offline detection + service worker
     --------------------------------------------------------------------- */
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installBtn.classList.remove("hidden");
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add("hidden");
  });

  function updateOfflineBanner() {
    offlineBanner.classList.toggle("show", !navigator.onLine);
  }
  window.addEventListener("online", updateOfflineBanner);
  window.addEventListener("offline", updateOfflineBanner);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  (async function init() {
    const savedLang = localStorage.getItem("soilapp_lang") || "en";
    langSelect.value = savedLang;
    await I18N.load(savedLang);
    updateOfflineBanner();
  })();
})();
