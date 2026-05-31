(function () {
  "use strict";

  const state = {
    datasets: [],
    activeId: null,
    frameIndex: 0,
    playing: false,
    timer: null,
    playbackFps: 4,
    atomScale: 1,
    showAtomLabels: false,
    selectionKey: "",
    currentMeasurement: null,
    savedMeasurements: [],
    currentTrendSeries: null,
    trendSeries: null,
    trendHitboxes: [],
    chartModal: null,
    chartDrag: null,
    selectedOptStep: null,
    fittedDatasetId: null,
    expandedPanelId: null,
    chartRedrawRequest: null,
    chartFrameUpdateVersion: 0,
    chartResize: null,
    layoutDrag: null,
    inpCompareLeftId: null,
    inpCompareRightId: null,
  };

  const els = {
    workspace: document.querySelector(".workspace"),
    fileInput: document.getElementById("fileInput"),
    resetLayoutBtn: document.getElementById("resetLayoutBtn"),
    clearBtn: document.getElementById("clearBtn"),
    fileList: document.getElementById("fileList"),
    fileCount: document.getElementById("fileCount"),
    canvas: document.getElementById("structureCanvas"),
    viewerHud: document.getElementById("viewerHud"),
    dropOverlay: document.getElementById("dropOverlay"),
    atomStatus: document.getElementById("atomStatus"),
    prevFrameBtn: document.getElementById("prevFrameBtn"),
    nextFrameBtn: document.getElementById("nextFrameBtn"),
    playBtn: document.getElementById("playBtn"),
    frameSlider: document.getElementById("frameSlider"),
    speedSlider: document.getElementById("speedSlider"),
    speedValue: document.getElementById("speedValue"),
    atomSizeSlider: document.getElementById("atomSizeSlider"),
    atomSizeValue: document.getElementById("atomSizeValue"),
    atomLabelsToggle: document.getElementById("atomLabelsToggle"),
    frameLabel: document.getElementById("frameLabel"),
    structureStats: document.getElementById("structureStats"),
    inspectorTabs: Array.from(document.querySelectorAll(".inspector-tabs button")),
    inspectorPages: Array.from(document.querySelectorAll(".inspector-page")),
    panelPopouts: Array.from(document.querySelectorAll(".panel-popout")),
    selectionList: document.getElementById("selectionList"),
    measureResult: document.getElementById("measureResult"),
    saveMeasureBtn: document.getElementById("saveMeasureBtn"),
    savedMeasureList: document.getElementById("savedMeasureList"),
    trendPanel: document.getElementById("trendPanel"),
    trendCanvas: document.getElementById("trendCanvas"),
    trendSummary: document.getElementById("trendSummary"),
    exportFrameBtn: document.getElementById("exportFrameBtn"),
    exportTrendBtn: document.getElementById("exportTrendBtn"),
    chartWindow: document.getElementById("chartWindow"),
    chartWindowHead: document.getElementById("chartWindowHead"),
    chartWindowTitle: document.getElementById("chartWindowTitle"),
    chartWindowBody: document.getElementById("chartWindowBody"),
    chartWindowInfo: document.getElementById("chartWindowInfo"),
    chartMinBtn: document.getElementById("chartMinBtn"),
    chartResetBtn: document.getElementById("chartResetBtn"),
    chartCloseBtn: document.getElementById("chartCloseBtn"),
    analysisView: document.getElementById("analysisView"),
    inputTree: document.getElementById("inputTree"),
    multiwfnPath: document.getElementById("multiwfnPath"),
    multiwfnCommandBtn: document.getElementById("multiwfnCommandBtn"),
    multiwfnCommand: document.getElementById("multiwfnCommand"),
    layoutSplitters: Array.from(document.querySelectorAll(".layout-splitter")),
  };

  const viewer = new window.StructureViewer(els.canvas, {
    onSelectionChange: renderSelection,
  });

  els.fileInput.addEventListener("change", handleFiles);
  els.clearBtn.addEventListener("click", clearProject);
  els.prevFrameBtn.addEventListener("click", () => setFrame(state.frameIndex - 1));
  els.nextFrameBtn.addEventListener("click", () => setFrame(state.frameIndex + 1));
  els.playBtn.addEventListener("click", togglePlay);
  els.frameSlider.addEventListener("input", () => setFrame(Number(els.frameSlider.value)));
  els.speedSlider.addEventListener("input", updatePlaybackSpeed);
  els.atomSizeSlider.addEventListener("input", updateAtomSize);
  els.atomLabelsToggle.addEventListener("change", updateAtomLabels);
  els.saveMeasureBtn.addEventListener("click", saveCurrentMeasurement);
  els.savedMeasureList.addEventListener("click", handleSavedMeasurementClick);
  els.trendCanvas.addEventListener("click", handleTrendClick);
  els.exportFrameBtn.addEventListener("click", exportCurrentFrameXyz);
  els.exportTrendBtn.addEventListener("click", exportTrendCsv);
  els.chartMinBtn.addEventListener("click", selectChartWindowMinimum);
  els.chartResetBtn.addEventListener("click", resetChartWindowView);
  els.chartCloseBtn.addEventListener("click", closeChartWindow);
  els.chartWindowHead.addEventListener("pointerdown", handleChartWindowDragStart);
  setupChartWindowResizeHandles();
  els.resetLayoutBtn.addEventListener("click", resetWorkspaceLayout);
  els.layoutSplitters.forEach((splitter) => {
    splitter.addEventListener("pointerdown", handleLayoutSplitterDown);
  });
  restoreWorkspaceLayout();
  els.multiwfnCommandBtn.addEventListener("click", renderMultiwfnCommand);
  els.inspectorTabs.forEach((button) => {
    button.addEventListener("click", () => activateInspectorPage(button.dataset.panelTarget));
  });
  els.panelPopouts.forEach((button) => {
    button.addEventListener("click", () => toggleExpandedPanel(button.dataset.popout));
  });

  let dragDepth = 0;
  ["dragenter", "dragover"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      if (eventName === "dragenter") dragDepth += 1;
      document.body.classList.add("drag-active");
    });
  });

  window.addEventListener("dragleave", (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) document.body.classList.remove("drag-active");
  });

  window.addEventListener("drop", async (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    document.body.classList.remove("drag-active");
    await importFiles(Array.from(event.dataTransfer.files || []));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInputSnippetDialog();
      closeChartWindow();
      closeExpandedPanel();
      return;
    }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
    if (event.code === "Space") {
      event.preventDefault();
      togglePlay();
    }
    if (event.key === "ArrowLeft" && handleChartWindowArrow(-1)) {
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight" && handleChartWindowArrow(1)) {
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft") setFrame(state.frameIndex - 1);
    if (event.key === "ArrowRight") setFrame(state.frameIndex + 1);
  });
  window.addEventListener("resize", () => {
    fitWorkspaceLayoutToViewport();
    drawTrendCanvasIfVisible();
    drawOptimizationChartsIfVisible();
  });
  new ResizeObserver(() => drawChartWindow()).observe(els.chartWindow);

  function restoreWorkspaceLayout() {
    var saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem("cp2k-view-workspace-layout") || "null");
    } catch (error) {
      saved = null;
    }
    if (saved && Number.isFinite(saved.sidebar) && Number.isFinite(saved.inspector)) {
      applyWorkspaceLayout(saved.sidebar, saved.inspector, false);
    }
    fitWorkspaceLayoutToViewport();
  }

  function resetWorkspaceLayout() {
    applyWorkspaceLayout(280, 340, false);
    try {
      window.localStorage.removeItem("cp2k-view-workspace-layout");
    } catch (error) {
      // Ignore private browsing or storage errors.
    }
    refreshWorkspaceAfterLayoutChange();
  }

  function handleLayoutSplitterDown(event) {
    if (event.button !== 0 || !els.workspace) return;
    const metrics = workspaceLayoutMetrics();
    if (!metrics) return;
    const current = currentWorkspaceLayout();
    state.layoutDrag = {
      side: event.currentTarget.dataset.layoutSplitter,
      startX: event.clientX,
      sidebar: current.sidebar,
      inspector: current.inspector,
      total: metrics.total,
      splitter: event.currentTarget,
    };
    event.currentTarget.classList.add("active");
    document.body.classList.add("layout-resizing");
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    window.addEventListener("pointermove", handleLayoutSplitterMove);
    window.addEventListener("pointerup", handleLayoutSplitterUp);
    window.addEventListener("pointercancel", handleLayoutSplitterUp);
  }

  function handleLayoutSplitterMove(event) {
    const drag = state.layoutDrag;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    var sidebar = drag.sidebar;
    var inspector = drag.inspector;
    const limits = workspaceLayoutLimits(drag.total);
    if (drag.side === "left") {
      sidebar = clamp(drag.sidebar + dx, limits.sidebarMin, limits.sidebarMaxFor(inspector));
    } else {
      inspector = clamp(drag.inspector - dx, limits.inspectorMin, limits.inspectorMaxFor(sidebar));
    }
    applyWorkspaceLayout(sidebar, inspector, false);
    refreshWorkspaceAfterLayoutChange();
  }

  function handleLayoutSplitterUp() {
    const drag = state.layoutDrag;
    if (drag && drag.splitter) drag.splitter.classList.remove("active");
    state.layoutDrag = null;
    document.body.classList.remove("layout-resizing");
    window.removeEventListener("pointermove", handleLayoutSplitterMove);
    window.removeEventListener("pointerup", handleLayoutSplitterUp);
    window.removeEventListener("pointercancel", handleLayoutSplitterUp);
    const current = currentWorkspaceLayout();
    try {
      window.localStorage.setItem("cp2k-view-workspace-layout", JSON.stringify(current));
    } catch (error) {
      // Ignore private browsing or storage errors.
    }
  }

  function fitWorkspaceLayoutToViewport() {
    if (!els.workspace || window.innerWidth <= 1180) return;
    const metrics = workspaceLayoutMetrics();
    if (!metrics) return;
    const current = currentWorkspaceLayout();
    const limits = workspaceLayoutLimits(metrics.total);
    const sidebar = clamp(current.sidebar, limits.sidebarMin, limits.sidebarMaxFor(current.inspector));
    const inspector = clamp(current.inspector, limits.inspectorMin, limits.inspectorMaxFor(sidebar));
    applyWorkspaceLayout(sidebar, inspector, false);
  }

  function currentWorkspaceLayout() {
    const styles = window.getComputedStyle(els.workspace);
    return {
      sidebar: parseCssPixels(styles.getPropertyValue("--sidebar-width")) || 280,
      inspector: parseCssPixels(styles.getPropertyValue("--inspector-width")) || 340,
    };
  }

  function applyWorkspaceLayout(sidebar, inspector, persist) {
    if (!els.workspace) return;
    els.workspace.style.setProperty("--sidebar-width", Math.round(sidebar) + "px");
    els.workspace.style.setProperty("--inspector-width", Math.round(inspector) + "px");
    if (persist) {
      try {
        window.localStorage.setItem("cp2k-view-workspace-layout", JSON.stringify({ sidebar, inspector }));
      } catch (error) {
        // Ignore private browsing or storage errors.
      }
    }
  }

  function workspaceLayoutMetrics() {
    if (!els.workspace) return null;
    const rect = els.workspace.getBoundingClientRect();
    const styles = window.getComputedStyle(els.workspace);
    const paddingLeft = parseCssPixels(styles.paddingLeft);
    const paddingRight = parseCssPixels(styles.paddingRight);
    const splitterWidth = els.layoutSplitters.reduce(function (sum, splitter) {
      const box = splitter.getBoundingClientRect();
      return box.width > 0 ? sum + box.width : sum;
    }, 0);
    return {
      total: Math.max(0, rect.width - paddingLeft - paddingRight - splitterWidth),
    };
  }

  function workspaceLayoutLimits(total) {
    const sidebarMin = 180;
    const inspectorMin = 260;
    const centerMin = 360;
    return {
      sidebarMin,
      inspectorMin,
      sidebarMaxFor: function (inspector) {
        return Math.max(sidebarMin, total - inspector - centerMin);
      },
      inspectorMaxFor: function (sidebar) {
        return Math.max(inspectorMin, total - sidebar - centerMin);
      },
    };
  }

  function refreshWorkspaceAfterLayoutChange() {
    if (viewer && typeof viewer.resize === "function") viewer.resize();
    drawTrendCanvasIfVisible();
    drawOptimizationChartsIfVisible();
    drawChartWindow();
  }

  function parseCssPixels(value) {
    const number = Number.parseFloat(String(value || "").replace("px", ""));
    return Number.isFinite(number) ? number : 0;
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    await importFiles(files);
    event.target.value = "";
  }

  async function importFiles(files) {
    const readableFiles = files.filter((file) => file && file.size >= 0);
    if (!readableFiles.length && !state.datasets.length) {
      els.viewerHud.textContent = "未选择任何可读取的文件";
      return;
    }

    for (const file of readableFiles) {
      const text = await file.text();
      const parsed = window.CP2KParsers.parseFile(file.name, text);
      parsed.id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      parsed.size = file.size;

      // Replace same-type file: 1 structure + 1 out at most
      const isStructure = parsed.frames.length > 0 && !parsed.tree;
      const isOut = parsed.analysis;
      for (let i = state.datasets.length - 1; i >= 0; i--) {
        const existing = state.datasets[i];
        if (isStructure && existing.frames.length && existing.type !== "out") {
          forgetSavedMeasurementsForDataset(existing.id);
          state.datasets.splice(i, 1);
          break;
        }
        if (isOut && existing.analysis) {
          forgetSavedMeasurementsForDataset(existing.id);
          state.datasets.splice(i, 1);
          break;
        }
      }
      state.datasets.push(parsed);
    }

    // Find the structure to show, otherwise the out
    const structure = state.datasets.find((d) => d.frames.length && !d.tree);
    const target = structure || state.datasets[0];
    if (target) {
      state.activeId = target.id;
      state.frameIndex = 0;
      state.fittedDatasetId = null;
    }

    linkSingleOutToStructure();
    render();
  }

  function clearProject() {
    stopPlay();
    state.datasets = [];
    state.activeId = null;
    state.frameIndex = 0;
    state.selectionKey = "";
    state.currentMeasurement = null;
    state.savedMeasurements = [];
    state.currentTrendSeries = null;
    state.trendSeries = null;
    state.trendHitboxes = [];
    state.selectedOptStep = null;
    state.fittedDatasetId = null;
    state.inpCompareLeftId = null;
    state.inpCompareRightId = null;
    closeExpandedPanel();
    render();
  }

  function activeDataset() {
    return state.datasets.find((dataset) => dataset.id === state.activeId) || null;
  }

  function activeFrame() {
    const dataset = activeDataset();
    if (!dataset || !dataset.frames.length) return null;
    return dataset.frames[state.frameIndex] || dataset.frames[0];
  }

  // 鈹€鈹€ Structure-OUT linking 鈹€鈹€

  function linkSingleOutToStructure() {
    var structures = state.datasets.filter(function (d) { return d.frames.length && !d.tree && d.type !== "out"; });
    var outputs = state.datasets.filter(function (d) { return d.analysis; });
    state.datasets.forEach(function (d) {
      if (d.frames.length) {
        d.linkedOutId = null;
        d.linkedOutName = "";
        d.linkedStepOffset = 0;
        d.linkWarning = "";
        d.linkMode = "";
        d.frames.forEach(function (frame) {
          frame.outStep = null;
          frame.outEnergyBlock = null;
          frame.energyBreakdown = null;
          frame.scfBlock = null;
          frame.optMetrics = null;
        });
      }
    });
    if (structures.length !== 1 || outputs.length !== 1) return;

    var structure = structures[0];
    var output = outputs[0];
    var steps = output.analysis.optimization.steps || [];
    var energyBreakdowns = output.analysis.energyBreakdowns || [];
    var scfBlocks = output.analysis.scfBlocks || [];
    if (!steps.length && !energyBreakdowns.length && !scfBlocks.length) return;

    var offset = steps.length ? chooseOptStepOffset(structure.frames, steps) : energyBreakdowns.length ? chooseEnergyBlockOffset(structure.frames, energyBreakdowns) : chooseScfBlockOffset(structure.frames, scfBlocks);
    structure.linkedOutId = output.id;
    structure.linkedOutName = output.name;
    structure.linkedStepOffset = offset;
    structure.linkMode = steps.length ? "optimization" : energyBreakdowns.length ? "energy" : "scf";
    var linkedCount = steps.length || energyBreakdowns.length || scfBlocks.length;
    if (structure.frames.length + offset > linkedCount) {
      structure.linkWarning = "XYZ 共 " + structure.frames.length + " 帧，OUT 从第 " + offset + " 项开始，共 " + Math.max(0, linkedCount - offset) + " 项可关联数据";
    }

    structure.frames.forEach(function (frame, index) {
      var step = steps[index + offset] || null;
      var energyBlock = step && step.energyBreakdown ? step.energyBreakdown : energyBreakdowns[index + offset] || null;
      var scfBlock = step && step.scfBlock ? step.scfBlock : scfBlocks[index + offset] || null;
      frame.outStep = step ? step.step : null;
      frame.outEnergyBlock = energyBlock ? energyBlock.index : null;
      frame.energyBreakdown = energyBlock;
      frame.scfBlock = scfBlock;
      frame.optMetrics = step ? summarizeOptStep(step, output.analysis.energySource || "OPT| Total energy [hartree]", energyBlock) : null;
      if (frame.optMetrics && Number.isFinite(frame.optMetrics.energy)) frame.energy = frame.optMetrics.energy;
      if (energyBlock && energyBlock.values && energyBlock.values.total && Number.isFinite(energyBlock.values.total.value)) {
        frame.energy = energyBlock.values.total.value;
      }
    });
  }

  function chooseOptStepOffset(frames, steps) {
    // Compare early frame energies against step energies to find the best alignment
    var maxOffset = Math.min(5, Math.max(0, steps.length - frames.length));
    var candidates = Array.from({ length: maxOffset + 1 }, function (_, i) { return i; });
    if (!candidates.length) return 0;
    var scored = candidates.map(function (offset) {
      var score = 0;
      var count = 0;
      for (var i = 0; i < Math.min(8, frames.length); i++) {
        var frameEnergy = frames[i].energy;
        var stepEnergy = steps[i + offset] && steps[i + offset].energy ? steps[i + offset].energy.value : null;
        if (Number.isFinite(frameEnergy) && Number.isFinite(stepEnergy)) {
          score += Math.abs(frameEnergy - stepEnergy);
          count += 1;
        }
      }
      return { offset: offset, score: count ? score / count : Number.POSITIVE_INFINITY };
    });
    scored.sort(function (a, b) { return a.score - b.score; });
    if (Number.isFinite(scored[0].score)) return scored[0].offset;
    // Fallback: if steps has one more entry, offset by 1 (common CP2K pattern)
    return steps.length === frames.length + 1 ? 1 : 0;
  }

  function chooseEnergyBlockOffset(frames, blocks) {
    var maxOffset = Math.min(5, Math.max(0, blocks.length - frames.length));
    var candidates = Array.from({ length: maxOffset + 1 }, function (_, i) { return i; });
    if (!candidates.length) return 0;
    var scored = candidates.map(function (offset) {
      var score = 0;
      var count = 0;
      for (var i = 0; i < Math.min(8, frames.length); i++) {
        var frameEnergy = frames[i].energy;
        var block = blocks[i + offset];
        var blockEnergy = block && block.values && block.values.total ? block.values.total.value : null;
        if (Number.isFinite(frameEnergy) && Number.isFinite(blockEnergy)) {
          score += Math.abs(frameEnergy - blockEnergy);
          count += 1;
        }
      }
      return { offset: offset, score: count ? score / count : Number.POSITIVE_INFINITY };
    });
    scored.sort(function (a, b) { return a.score - b.score; });
    if (Number.isFinite(scored[0].score)) return scored[0].offset;
    return blocks.length === frames.length + 1 ? 1 : 0;
  }

  function chooseScfBlockOffset(frames, blocks) {
    return blocks.length === frames.length + 1 ? 1 : 0;
  }

  function summarizeOptStep(step, energySource, energyBlock) {
    return {
      step: step.step,
      energy: metricValue(step.energy),
      energySource: energySource,
      energyBreakdown: summarizeEnergyBreakdown(energyBlock || step.energyBreakdown),
      metrics: {
        maxStep: metricGroup(step.maxStep, step.maxStepLimit, step.maxStepConverged),
        rmsStep: metricGroup(step.rmsStep, step.rmsStepLimit, step.rmsStepConverged),
        maxGradient: metricGroup(step.maxGradient, step.maxGradientLimit, step.maxGradientConverged),
        rmsGradient: metricGroup(step.rmsGradient, step.rmsGradientLimit, step.rmsGradientConverged),
      },
    };
  }

  function summarizeEnergyBreakdown(block) {
    if (!block) return null;
    return {
      index: block.index,
      lineStart: block.lineStart,
      lineEnd: block.lineEnd,
      entries: energyBreakdownRows(block),
    };
  }

  function metricGroup(value, limit, converged) {
    return {
      value: metricValue(value),
      limit: metricValue(limit),
      converged: converged && typeof converged.value === "string" ? converged.value : "",
    };
  }

  function metricValue(metric) {
    return metric && Number.isFinite(metric.value) ? metric.value : null;
  }

  function convergenceRows(optMetrics) {
    return [
      ["Max step", formatMetricGroup(optMetrics.metrics.maxStep)],
      ["RMS step", formatMetricGroup(optMetrics.metrics.rmsStep)],
      ["Max grad", formatMetricGroup(optMetrics.metrics.maxGradient)],
      ["RMS grad", formatMetricGroup(optMetrics.metrics.rmsGradient)],
    ];
  }

  function formatMetricGroup(metric) {
    if (!metric || !Number.isFinite(metric.value)) return "-";
    var limit = Number.isFinite(metric.limit) ? " / " + formatNumber(metric.limit) : "";
    var flag = metric.converged ? " " + metric.converged : "";
    return formatNumber(metric.value) + limit + flag;
  }

  function setActive(id) {
    stopPlay();
    state.activeId = id;
    state.frameIndex = 0;
    state.selectionKey = "";
    state.currentMeasurement = null;
    state.currentTrendSeries = null;
    state.trendSeries = null;
    state.trendHitboxes = [];
    state.selectedOptStep = null;
    state.fittedDatasetId = null;
    const dataset = activeDataset();
    if (dataset && dataset.tree) state.inpCompareLeftId = id;
    render();
  }

  function setFrame(index, options) {
    const settings = options || {};
    const dataset = activeDataset();
    if (!dataset || !dataset.frames.length) return;
    const max = dataset.frames.length - 1;
    state.frameIndex = Math.max(0, Math.min(max, index));
    if (!settings.preserveSelectedOptStep) {
      const frame = activeFrame();
      state.selectedOptStep = frame && frame.outStep !== null && frame.outStep !== undefined ? frame.outStep : null;
    }
    renderFrameOnly(settings);
  }

  function togglePlay() {
    const dataset = activeDataset();
    if (!dataset || dataset.frames.length <= 1) return;
    if (state.playing) {
      stopPlay();
      return;
    }

    startPlay();
  }

  function startPlay() {
    state.playing = true;
    els.playBtn.textContent = "Pause";
    if (state.timer) window.clearInterval(state.timer);
    state.timer = window.setInterval(advanceFrame, playbackInterval());
  }

  function advanceFrame() {
    const current = activeDataset();
    if (!current || current.frames.length <= 1) return stopPlay();
    state.frameIndex = (state.frameIndex + 1) % current.frames.length;
    const frame = activeFrame();
    state.selectedOptStep = frame && frame.outStep !== null && frame.outStep !== undefined ? frame.outStep : null;
    renderFrameOnly();
  }

  function stopPlay() {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
    state.playing = false;
    els.playBtn.textContent = "Play";
  }

  function updatePlaybackSpeed() {
    state.playbackFps = Number(els.speedSlider.value) || 4;
    els.speedValue.textContent = `${formatSliderNumber(state.playbackFps)} fps`;
    if (state.playing) startPlay();
  }

  function updateAtomSize() {
    state.atomScale = Number(els.atomSizeSlider.value) || 1;
    viewer.setAtomScale(state.atomScale);
    els.atomSizeValue.textContent = `${Math.round(state.atomScale * 100)}%`;
  }

  function updateAtomLabels() {
    state.showAtomLabels = Boolean(els.atomLabelsToggle.checked);
    viewer.setShowLabels(state.showAtomLabels);
  }

  function playbackInterval() {
    return Math.round(1000 / Math.max(1, state.playbackFps));
  }

  function render() {
    renderFileList();
    renderFrameOnly({ skipAnalysis: true });
    renderSavedMeasurements();
    renderInputTree();
    renderAnalysis();
    renderMultiwfnCommand();
  }

  function renderFrameOnly(options) {
    const settings = options || {};
    const dataset = activeDataset();
    const frame = activeFrame();
    const shouldFit = dataset && dataset.id !== state.fittedDatasetId;
    viewer.setFrame(frame, {
      fit: shouldFit,
      referenceAtoms: dataset && dataset.frames[0] ? dataset.frames[0].atoms : null,
      preserveSelection: !shouldFit,
    });
    if (shouldFit) state.fittedDatasetId = dataset.id;
    renderStats();
    renderFrameControls();
    renderHud();
    if (!settings.skipAnalysis && dataset && dataset.linkedOutId) renderAnalysis({ preserveScroll: true });
    if (settings.deferChartRedraw) {
      scheduleChartRedraw();
    } else {
      drawOptimizationChartsIfVisible();
      drawChartWindow();
    }
  }

  function scheduleChartRedraw() {
    if (state.chartRedrawRequest) return;
    state.chartRedrawRequest = window.requestAnimationFrame(function () {
      state.chartRedrawRequest = null;
      drawOptimizationChartsIfVisible();
      drawChartWindow();
    });
  }

  function renderFileList() {
    els.fileCount.textContent = String(state.datasets.length);
    if (!state.datasets.length) {
      els.fileList.className = "file-list empty";
      els.fileList.textContent = "暂无文件";
      return;
    }

    els.fileList.className = "file-list";
    els.fileList.replaceChildren(
      ...state.datasets.map((dataset) => {
        const row = document.createElement("div");
        row.className = `file-item${dataset.id === state.activeId ? " active" : ""}`;
        row.addEventListener("click", () => setActive(dataset.id));

        const info = document.createElement("span");
        info.className = "file-item-info";
        const name = document.createElement("strong");
        name.textContent = dataset.name;
        const meta = document.createElement("span");
        meta.textContent = dataset.frames.length ? `${dataset.type.toUpperCase()} - ${dataset.frames.length} frames` : `${dataset.type.toUpperCase()} - report`;
        info.append(name, meta);

        const del = document.createElement("button");
        del.className = "file-item-del";
        del.type = "button";
        del.setAttribute("aria-label", `删除 ${dataset.name}`);
        del.innerHTML = "&#x2715;";
        del.title = "Remove file from project";
        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          removeDataset(dataset.id);
        });

        row.append(info, del);
        return row;
      })
    );
  }

  function removeDataset(id) {
    const idx = state.datasets.findIndex((d) => d.id === id);
    if (idx === -1) return;
    state.datasets.splice(idx, 1);
    if (state.activeId === id) {
      const structure = state.datasets.find((d) => d.frames.length && !d.tree);
      const target = structure || state.datasets[0] || null;
      state.activeId = target ? target.id : null;
      state.frameIndex = 0;
      state.fittedDatasetId = null;
    }
    forgetSavedMeasurementsForDataset(id);
    linkSingleOutToStructure();
    render();
  }

  function renderStats() {
    const dataset = activeDataset();
    const frame = activeFrame();
    const analysis = dataset && dataset.analysis;
    const rows = [
      ["文件", dataset ? dataset.name : "-"],
      ["类型", dataset ? dataset.type.toUpperCase() : "-"],
      ["原子", frame ? String(frame.atoms.length) : "-"],
      ["帧数", dataset ? String(dataset.frames.length) : "-"],
      ["组成", frame ? compositionText(frame.atoms) : "-"],
    ];
    if (analysis) {
      rows.push(["OUT 行数", String(analysis.lineCount || 0)]);
      rows.push(["End", analysis.normalEnd ? "Normal" : analysis.aborted ? "Aborted" : "Unknown"]);
      if (analysis.metadata.runType) rows.push(["运行类型", analysis.metadata.runType.value]);
    }
    if (dataset && dataset.linkedOutName) {
      rows.push(["关联 OUT", dataset.linkedOutName]);
      rows.push(["OPT step", frame && frame.outStep !== null ? "OPT step " + frame.outStep : "-"]);
      if (frame && frame.energyBreakdown) rows.push(["OUT 能量块", "L" + frame.energyBreakdown.lineStart + "-L" + frame.energyBreakdown.lineEnd]);
      if (dataset.linkedStepOffset) rows.push(["Step offset", "XYZ frame 1 -> OPT step " + dataset.linkedStepOffset]);
      if (dataset.linkWarning) rows.push(["警告", dataset.linkWarning]);
    }
    if (frame && frame.optMetrics) {
      rows.push(["OUT 能量", formatNumber(frame.optMetrics.energy) + " Ha"]);
      convergenceRows(frame.optMetrics).forEach(function (row) { rows.push(row); });
    } else if (frame && frame.energyBreakdown && frame.energyBreakdown.values && frame.energyBreakdown.values.total) {
      rows.push(["OUT 能量", frame.energyBreakdown.values.total.valueText + " Ha"]);
    }

    els.structureStats.replaceChildren(
      ...rows.flatMap(([key, value]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = key;
        dd.textContent = value;
        return [dt, dd];
      })
    );
  }

  function renderFrameControls() {
    const dataset = activeDataset();
    const count = dataset ? dataset.frames.length : 0;
    const disabled = count <= 1;
    els.prevFrameBtn.disabled = disabled;
    els.nextFrameBtn.disabled = disabled;
    els.playBtn.disabled = disabled;
    els.frameSlider.disabled = count === 0;
    els.speedSlider.disabled = disabled;
    els.atomSizeSlider.disabled = count === 0;
    els.atomLabelsToggle.disabled = count === 0;
    els.frameSlider.max = String(Math.max(0, count - 1));
    els.frameSlider.value = String(state.frameIndex);
    els.frameLabel.textContent = count ? `${state.frameIndex + 1} / ${count}` : "0 / 0";
    els.speedValue.textContent = `${formatSliderNumber(state.playbackFps)} fps`;
    els.atomSizeValue.textContent = `${Math.round(state.atomScale * 100)}%`;
    els.atomLabelsToggle.checked = state.showAtomLabels;
    els.exportFrameBtn.disabled = !activeFrame();
  }

  function renderHud() {
    const dataset = activeDataset();
    const frame = activeFrame();
    if (!dataset) {
      els.viewerHud.textContent = "No structure loaded";
      return;
    }
    if (!frame && dataset.analysis) {
      const analysis = dataset.analysis;
      const parts = [`${dataset.name}`, "OUT report", `${analysis.lineCount || 0} lines`];
      if (analysis.metadata.runType) parts.push(analysis.metadata.runType.value);
      if (analysis.energies.length) parts.push(`last E=${analysis.energies[analysis.energies.length - 1].value.toFixed(8)}`);
      if (analysis.warnings.length) parts.push(`${analysis.warnings.length} warnings`);
      if (analysis.errors.length) parts.push(`${analysis.errors.length} errors`);
      els.viewerHud.textContent = parts.join(" | ");
      return;
    }
    if (!frame) {
      els.viewerHud.textContent = dataset.warnings && dataset.warnings.length ? dataset.warnings[0] : "未载入结构";
      return;
    }

    const parts = [`${dataset.name}`, `${frame.atoms.length} atoms`, `frame ${state.frameIndex + 1}/${dataset.frames.length}`];
    if (frame.outStep !== null && frame.outStep !== undefined) parts.push(`OPT step ${frame.outStep}`);
    if (Number.isFinite(frame.energy)) parts.push(`E=${frame.energy.toFixed(8)}`);
    if (frame.comment) parts.push(frame.comment);
    if (dataset.warnings && dataset.warnings.length) parts.push(dataset.warnings[0]);
    els.viewerHud.textContent = parts.join(" | ");
  }

  function renderSelection(selected) {
    const nextSelectionKey = selected.map((atom) => atom.index).join("-");
    const selectionChanged = nextSelectionKey !== state.selectionKey;
    state.selectionKey = nextSelectionKey;

    if (!selected.length) {
      els.selectionList.textContent = "未选择原子";
      els.measureResult.textContent = "-";
      els.atomStatus.textContent = "点击原子查看元素、类型和坐标";
      state.currentMeasurement = null;
      updateSaveMeasureButton();
      state.currentTrendSeries = null;
      renderTrend(null);
      return;
    }

    if (selectionChanged) {
      activateInspectorPage("measurePanel");
    }

    const details = selected.map(atomSummary);
    els.selectionList.replaceChildren(...details.map(renderAtomChip));
    els.atomStatus.textContent = atomStatusText(selected[selected.length - 1]);
    const result = measurementFromSelection(selected);
    els.measureResult.textContent = result ? result.text : atomSummary(selected[0]);
    state.currentMeasurement = result && result.kind !== "atom" ? result : null;
    updateSaveMeasureButton();
    state.currentTrendSeries = result && result.kind !== "atom" ? buildTrendSeries(selected, result.kind) : null;
    renderTrend(state.currentTrendSeries);
  }

  function updateSaveMeasureButton() {
    const canSave = Boolean(state.currentMeasurement && activeFrame());
    els.saveMeasureBtn.disabled = !canSave;
    els.saveMeasureBtn.title = canSave ? "保留当前测量值" : "选择 2/3/4 个原子后可保留";
  }

  function saveCurrentMeasurement() {
    const dataset = activeDataset();
    const frame = activeFrame();
    const measurement = state.currentMeasurement;
    if (!dataset || !frame || !measurement) return;
    state.savedMeasurements.unshift({
      id: `measure-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      datasetId: dataset.id,
      datasetName: dataset.name,
      datasetType: dataset.type,
      kind: measurement.kind,
      kindText: measurementKindLabel(measurement.kind),
      label: measurement.label,
      indices: measurement.indices.slice(),
      value: measurement.value,
      unit: measurement.unit,
      text: measurement.text,
      frameIndex: state.frameIndex,
      frameCount: dataset.frames.length,
      frameLabel: measurementFrameLabel(dataset, frame, state.frameIndex),
    });
    renderSavedMeasurements();
  }

  function handleSavedMeasurementClick(event) {
    const button = event.target.closest(".saved-measure-delete");
    if (!button || !els.savedMeasureList.contains(button)) return;
    const id = button.dataset.measureId;
    state.savedMeasurements = state.savedMeasurements.filter((item) => item.id !== id);
    renderSavedMeasurements();
  }

  function renderSavedMeasurements() {
    if (!els.savedMeasureList) return;
    if (!state.savedMeasurements.length) {
      els.savedMeasureList.className = "saved-measure-list empty";
      els.savedMeasureList.textContent = "暂无保留测量";
      return;
    }
    els.savedMeasureList.className = "saved-measure-list";
    els.savedMeasureList.replaceChildren(...state.savedMeasurements.map(renderSavedMeasurementItem));
  }

  function renderSavedMeasurementItem(item) {
    const row = document.createElement("div");
    row.className = "saved-measure-item";

    const main = document.createElement("div");
    main.className = "saved-measure-main";

    const title = document.createElement("div");
    title.className = "saved-measure-title";
    title.textContent = `${item.kindText} ${item.label}`;

    const value = document.createElement("div");
    value.className = "saved-measure-value";
    value.textContent = `${formatMeasurementValue(item.value, item.kind)} ${item.unit}`;

    const meta = document.createElement("div");
    meta.className = "saved-measure-meta";
    meta.textContent = `${item.datasetName} | ${item.frameLabel}`;

    const del = document.createElement("button");
    del.className = "saved-measure-delete";
    del.type = "button";
    del.dataset.measureId = item.id;
    del.title = "删除";
    del.setAttribute("aria-label", `删除 ${item.kindText} ${item.label}`);
    del.innerHTML = "&#x2715;";

    main.append(title, value, meta);
    row.append(main, del);
    return row;
  }

  function forgetSavedMeasurementsForDataset(datasetId) {
    state.savedMeasurements = state.savedMeasurements.filter((item) => item.datasetId !== datasetId);
  }

  function measurementFrameLabel(dataset, frame, frameIndex) {
    const total = dataset && dataset.frames ? dataset.frames.length : 0;
    const prefix = dataset && dataset.type === "out" ? "OUT 帧" : "帧";
    const parts = [`${prefix} ${frameIndex + 1}/${Math.max(1, total)}`];
    if (dataset && dataset.type !== "out" && dataset.linkedOutName) parts.push(`关联 OUT ${dataset.linkedOutName}`);
    if (frame && frame.outStep !== null && frame.outStep !== undefined) parts.push(`OPT step ${frame.outStep}`);
    if (frame && frame.outEnergyBlock !== null && frame.outEnergyBlock !== undefined) parts.push(`OUT 能量块 ${frame.outEnergyBlock}`);
    return parts.join(" | ");
  }

  function activateInspectorPage(panelId) {
    if (!panelId) return;
    els.inspectorTabs.forEach((button) => {
      button.classList.toggle("active", button.dataset.panelTarget === panelId);
    });
    els.inspectorPages.forEach((page) => {
      page.classList.toggle("active", page.id === panelId);
    });
    if (panelId === "measurePanel") window.setTimeout(() => drawTrendCanvasIfVisible(), 0);
    if (panelId === "analysisPanel") window.setTimeout(() => drawOptimizationChartsIfVisible(), 0);
  }

  function toggleExpandedPanel(panelId) {
    if (state.expandedPanelId === panelId) {
      closeExpandedPanel();
      return;
    }
    closeExpandedPanel();
    const panel = document.getElementById(panelId);
    if (!panel) return;
    activateInspectorPage(panelId);
    panel.classList.add("panel-expanded");
    document.body.classList.add("panel-expanded-open");
    state.expandedPanelId = panelId;
    const button = panel.querySelector(".panel-popout");
    if (button) {
      button.textContent = "×";
      button.title = "收起";
    }
    window.setTimeout(() => {
      drawTrendCanvasIfVisible();
      drawOptimizationChartsIfVisible();
    }, 0);
  }

  function closeExpandedPanel() {
    if (!state.expandedPanelId) return;
    const panel = document.getElementById(state.expandedPanelId);
    if (panel) {
      panel.classList.remove("panel-expanded");
      const button = panel.querySelector(".panel-popout");
      if (button) {
        button.textContent = "Open";
        button.title = "单独查看";
      }
    }
    document.body.classList.remove("panel-expanded-open");
    state.expandedPanelId = null;
    window.setTimeout(() => {
      drawTrendCanvasIfVisible();
      drawOptimizationChartsIfVisible();
    }, 0);
  }

  function renderInputTree() {
    const dataset = activeInputDataset();
    if (!dataset || !dataset.tree) {
      els.inputTree.textContent = "暂无 inp/restart 结构";
      return;
    }

    const editor = renderInputEditor(dataset);
    const compare = renderInputCompare();
    const tree = document.createElement("div");
    tree.className = "input-tree-view";
    tree.replaceChildren(...dataset.tree.children.map(function (node) { return renderTreeNode(node, 0); }));
    els.inputTree.replaceChildren(editor, compare, tree);
  }

  function activeInputDataset() {
    const dataset = activeDataset();
    if (dataset && dataset.tree) return dataset;
    return state.datasets.find(function (item) { return item.tree; }) || null;
  }

  function renderInputEditor(dataset) {
    const details = document.createElement("details");
    details.className = "inp-editor";
    const summary = document.createElement("summary");
    summary.textContent = "编辑 INP 原文";
    details.append(summary);

    const textarea = document.createElement("textarea");
    textarea.className = "inp-editor-text";
    textarea.spellcheck = false;
    textarea.value = dataset.raw || "";
    details.append(textarea);

    const snippets = renderInputSnippetTools(textarea);
    details.append(snippets);

    const actions = document.createElement("div");
    actions.className = "inp-editor-actions";

    const status = document.createElement("span");
    status.textContent = dataset.name;

    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.textContent = "应用编辑";
    applyBtn.addEventListener("click", function () {
      applyInputEdit(dataset, textarea.value);
    });

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.textContent = "导出 INP";
    exportBtn.addEventListener("click", function () {
      downloadText(stripExtension(dataset.name) + "-edited." + (dataset.type === "restart" ? "restart" : "inp"), textarea.value, "text/plain;charset=utf-8");
    });

    actions.append(status, applyBtn, exportBtn);
    details.append(actions);
    return details;
  }

  function renderInputSnippetTools(textarea) {
    const tools = document.createElement("div");
    tools.className = "inp-snippet-tools";

    const select = document.createElement("select");
    refreshInputSnippetSelect(select);

    const insertBtn = document.createElement("button");
    insertBtn.type = "button";
    insertBtn.textContent = "插入";
    insertBtn.addEventListener("click", function () {
      const snippet = loadInputSnippets().find(function (item) { return item.name === select.value; });
      if (!snippet) {
        setInputSnippetStatus(tools, "请选择要插入的语句");
        return;
      }
      insertTextAtTextarea(textarea, snippet.text);
      setInputSnippetStatus(tools, "已插入：" + snippet.name);
    });

    const manageBtn = document.createElement("button");
    manageBtn.type = "button";
    manageBtn.textContent = "自定义语句";
    manageBtn.addEventListener("click", function () {
      openInputSnippetDialog({
        selectedName: select.value,
        onSave: function (name) {
          refreshInputSnippetSelect(select, name);
          setInputSnippetStatus(tools, "已保存到本地：" + name);
        },
      });
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "删除";
    deleteBtn.addEventListener("click", function () {
      const name = select.value;
      if (!name) return;
      saveInputSnippets(loadInputSnippets().filter(function (item) { return item.name !== name; }));
      refreshInputSnippetSelect(select);
      setInputSnippetStatus(tools, "已删除：" + name);
    });

    const status = document.createElement("span");
    status.className = "inp-snippet-status";
    status.textContent = "自定义语句保存在本地浏览器，可直接插入或删除";

    tools.append(select, insertBtn, manageBtn, deleteBtn, status);
    return tools;
  }

  function openInputSnippetDialog(options) {
    closeInputSnippetDialog();
    const selectedName = options && options.selectedName;
    const existing = loadInputSnippets().find(function (item) { return item.name === selectedName; });

    const overlay = document.createElement("div");
    overlay.className = "inp-snippet-dialog";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "inp-snippet-dialog-panel";
    panel.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    const head = document.createElement("div");
    head.className = "inp-snippet-dialog-head";
    const title = document.createElement("strong");
    title.textContent = "自定义语句";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "关闭";
    closeBtn.addEventListener("click", closeInputSnippetDialog);
    head.append(title, closeBtn);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "自定义标题";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = existing ? existing.name : "";
    nameInput.placeholder = "例如：OT 设置 / SCF 收敛参数";
    nameLabel.append(nameInput);

    const textLabel = document.createElement("label");
    textLabel.textContent = "INP 输入文件格式";
    const textInput = document.createElement("textarea");
    textInput.spellcheck = false;
    textInput.value = existing ? existing.text : "";
    textInput.placeholder = "&SCF\n  MAX_SCF 100\n  EPS_SCF 1.0E-6\n&END SCF";
    textLabel.append(textInput);

    const footer = document.createElement("div");
    footer.className = "inp-snippet-dialog-actions";
    const message = document.createElement("span");
    message.textContent = existing ? "当前正在编辑本地语句：" + existing.name : "保存到本地自定义语句库";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "保存";
    saveBtn.addEventListener("click", function () {
      const text = textInput.value.trim();
      const name = nameInput.value.trim() || firstSnippetLine(text);
      if (!text) {
        message.textContent = "请先填写 INP 语句内容";
        textInput.focus();
        return;
      }
      const snippets = loadInputSnippets().filter(function (item) { return item.name !== name && item.name !== selectedName; });
      snippets.push({ name: name, text: textInput.value });
      saveInputSnippets(snippets);
      if (options && typeof options.onSave === "function") options.onSave(name);
      closeInputSnippetDialog();
    });
    footer.append(message, saveBtn);

    panel.append(head, nameLabel, textLabel, footer);
    overlay.append(panel);
    overlay.addEventListener("click", closeInputSnippetDialog);
    document.body.append(overlay);
    nameInput.focus();
  }

  function closeInputSnippetDialog() {
    const dialog = document.querySelector(".inp-snippet-dialog");
    if (dialog) dialog.remove();
  }

  function loadInputSnippets() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem("cp2k-view-inp-snippets") || "[]");
      return Array.isArray(parsed) ? parsed.filter(function (item) { return item && item.name && typeof item.text === "string"; }) : [];
    } catch (error) {
      return [];
    }
  }

  function saveInputSnippets(snippets) {
    try {
      window.localStorage.setItem("cp2k-view-inp-snippets", JSON.stringify(snippets));
    } catch (error) {
      // Ignore private browsing or storage errors.
    }
  }

  function refreshInputSnippetSelect(select, selectedName) {
    const snippets = loadInputSnippets();
    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = snippets.length ? "选择自定义语句" : "暂无自定义语句";
    select.append(empty);
    snippets.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = item.name;
      select.append(option);
    });
    select.value = selectedName || "";
  }

  function setInputSnippetStatus(container, text) {
    const status = container.querySelector(".inp-snippet-status");
    if (status) status.textContent = text;
  }

  function firstSnippetLine(text) {
    return String(text).trim().split(/\n/)[0].slice(0, 36) || "自定义语句";
  }

  function insertTextAtTextarea(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const suffix = after && !String(text).endsWith("\n") ? "\n" : "";
    const inserted = prefix + text + suffix;
    textarea.value = before + inserted + after;
    const next = start + inserted.length;
    textarea.focus();
    textarea.setSelectionRange(next, next);
    textarea.scrollTop = scrollTop;
    textarea.scrollLeft = scrollLeft;
  }

  function applyInputEdit(dataset, text) {
    updateInputDatasetText(dataset, text);
  }

  function renderInputCompare() {
    const datasets = inputDatasets();
    const details = document.createElement("details");
    details.className = "inp-compare";
    details.open = datasets.length >= 2;
    const summary = document.createElement("summary");
    summary.textContent = "INP 文件对比" + (datasets.length >= 2 ? " (" + datasets.length + ")" : "");
    details.append(summary);

    if (datasets.length < 2) {
      const empty = document.createElement("div");
      empty.className = "analysis-empty";
      empty.textContent = "载入两个 INP/restart 文件后可进行对比";
      details.append(empty);
      return details;
    }

    syncInpCompareSelection(datasets);
    const controls = document.createElement("div");
    controls.className = "inp-compare-controls";
    const leftSelect = renderInputCompareSelect(datasets, state.inpCompareLeftId, function (id) {
      state.inpCompareLeftId = id;
      if (state.inpCompareRightId === id) {
        state.inpCompareRightId = datasets.find(function (item) { return item.id !== id; }).id;
      }
      renderInputTree();
    });
    const rightSelect = renderInputCompareSelect(datasets, state.inpCompareRightId, function (id) {
      state.inpCompareRightId = id;
      if (state.inpCompareLeftId === id) {
        state.inpCompareLeftId = datasets.find(function (item) { return item.id !== id; }).id;
      }
      renderInputTree();
    });
    controls.append(leftSelect, rightSelect);
    details.append(controls);

    const left = datasets.find(function (item) { return item.id === state.inpCompareLeftId; });
    const right = datasets.find(function (item) { return item.id === state.inpCompareRightId; });
    details.append(renderInputCompareActions(left, right));
    details.append(renderInputDiff(left, right));
    return details;
  }

  function inputDatasets() {
    return state.datasets.filter(function (dataset) { return dataset.tree; });
  }

  function syncInpCompareSelection(datasets) {
    if (!datasets.length) {
      state.inpCompareLeftId = null;
      state.inpCompareRightId = null;
      return;
    }
    if (!datasets.some(function (item) { return item.id === state.inpCompareLeftId; })) {
      state.inpCompareLeftId = datasets[0].id;
    }
    if (!datasets.some(function (item) { return item.id === state.inpCompareRightId; }) || state.inpCompareRightId === state.inpCompareLeftId) {
      const fallback = datasets.find(function (item) { return item.id !== state.inpCompareLeftId; });
      state.inpCompareRightId = fallback ? fallback.id : datasets[0].id;
    }
  }

  function renderInputCompareSelect(datasets, value, onChange) {
    const select = document.createElement("select");
    datasets.forEach(function (dataset) {
      const option = document.createElement("option");
      option.value = dataset.id;
      option.textContent = dataset.name;
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", function () {
      onChange(select.value);
    });
    return select;
  }

  function renderInputCompareActions(left, right) {
    const actions = document.createElement("div");
    actions.className = "inp-compare-actions";

    const expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.textContent = "放大对比";
    expandBtn.addEventListener("click", function () {
      openInputCompareWindow();
    });
    actions.append(expandBtn);

    if (left) {
      const saveLeft = document.createElement("button");
      saveLeft.type = "button";
      saveLeft.textContent = "保存左侧";
      saveLeft.addEventListener("click", function () {
        saveInputDataset(left);
      });
      actions.append(saveLeft);
    }

    if (right) {
      const saveRight = document.createElement("button");
      saveRight.type = "button";
      saveRight.textContent = "保存右侧";
      saveRight.addEventListener("click", function () {
        saveInputDataset(right);
      });
      actions.append(saveRight);
    }

    return actions;
  }

  function saveInputDataset(dataset) {
    if (!dataset) return;
    const ext = dataset.type === "restart" ? "restart" : "inp";
    downloadText(stripExtension(dataset.name) + "-edited." + ext, dataset.raw || "", "text/plain;charset=utf-8");
  }

  function renderInputDiff(left, right) {
    const wrap = document.createElement("div");
    wrap.className = "inp-diff";
    if (!left || !right) {
      wrap.textContent = "请选择两个 INP/restart 文件";
      return wrap;
    }
    const diff = diffInputLines(left.raw || "", right.raw || "");
    const changed = diff.filter(function (row) { return row.kind !== "same"; }).length;
    const meta = document.createElement("div");
    meta.className = "inp-diff-meta";
    meta.textContent = changed ? "发现 " + changed + " 处差异，左右并排显示完整文件" : "两份 INP 文本一致";
    wrap.append(meta);

    const header = document.createElement("div");
    header.className = "inp-diff-header";
    const leftName = document.createElement("span");
    leftName.textContent = left.name;
    const actionName = document.createElement("span");
    actionName.textContent = "操作";
    const rightName = document.createElement("span");
    rightName.textContent = right.name;
    header.append(leftName, actionName, rightName);
    wrap.append(header);

    const rows = document.createElement("div");
    rows.className = "inp-diff-rows";
    diff.forEach(function (row, index) {
      const item = document.createElement("div");
      item.className = "inp-diff-row diff-" + row.kind;
      item.append(
        renderInputDiffCell(row.leftLine, row.leftText),
        renderInputDiffActions(left, right, diff, index, row),
        renderInputDiffCell(row.rightLine, row.rightText)
      );
      rows.append(item);
    });
    wrap.append(rows);
    return wrap;
  }

  function openInputCompareWindow() {
    const datasets = inputDatasets();
    syncInpCompareSelection(datasets);
    const left = datasets.find(function (item) { return item.id === state.inpCompareLeftId; });
    const right = datasets.find(function (item) { return item.id === state.inpCompareRightId; });
    if (!left || !right) return;

    state.chartModal = { type: "inpCompare", charts: [], activeKey: "inpCompare" };
    els.chartWindowTitle.textContent = "INP 文件对比";
    els.chartWindowBody.innerHTML = "";
    els.chartWindowBody.append(renderInputCompareActions(left, right));
    els.chartWindowBody.append(renderInputDiff(left, right));
    els.chartWindow.hidden = false;
    els.chartWindow.style.width = "min(1180px, calc(100vw - 48px))";
    els.chartWindow.style.height = "min(780px, calc(100vh - 80px))";
    els.chartWindowInfo.textContent = left.name + "  |  " + right.name;
  }

  function renderInputDiffCell(lineNumber, text) {
    const cell = document.createElement("div");
    cell.className = "inp-diff-cell";
    const gutter = document.createElement("span");
    gutter.className = "inp-diff-line";
    gutter.textContent = lineNumber || "";
    const code = document.createElement("code");
    code.textContent = text || "";
    cell.append(gutter, code);
    return cell;
  }

  function renderInputDiffActions(left, right, diff, index, row) {
    const actions = document.createElement("div");
    actions.className = "inp-diff-actions";
    if (row.kind === "same") return actions;

    if (row.kind === "added") {
      actions.append(
        inputDiffActionButton("补到左", function () { insertDiffLine(left, row.rightText, insertionLineFromDiff(diff, index, "left")); }),
        inputDiffActionButton("删右", function () { deleteDiffLine(right, row.rightLine); })
      );
    } else if (row.kind === "removed") {
      actions.append(
        inputDiffActionButton("补到右", function () { insertDiffLine(right, row.leftText, insertionLineFromDiff(diff, index, "right")); }),
        inputDiffActionButton("删左", function () { deleteDiffLine(left, row.leftLine); })
      );
    } else if (row.kind === "modified") {
      actions.append(
        inputDiffActionButton("用右覆盖左", function () { replaceDiffLine(left, row.leftLine, row.rightText); }),
        inputDiffActionButton("用左覆盖右", function () { replaceDiffLine(right, row.rightLine, row.leftText); })
      );
    }
    return actions;
  }

  function inputDiffActionButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function insertionLineFromDiff(diff, rowIndex, side) {
    const key = side === "left" ? "leftLine" : "rightLine";
    for (let i = rowIndex - 1; i >= 0; i -= 1) {
      if (diff[i][key]) return diff[i][key];
    }
    return 0;
  }

  function insertDiffLine(dataset, text, afterLine) {
    const lines = inputRawLines(dataset);
    lines.splice(Math.max(0, afterLine), 0, text);
    updateInputDatasetText(dataset, lines.join("\n"));
  }

  function deleteDiffLine(dataset, lineNumber) {
    if (!lineNumber) return;
    const lines = inputRawLines(dataset);
    lines.splice(lineNumber - 1, 1);
    updateInputDatasetText(dataset, lines.join("\n"));
  }

  function replaceDiffLine(dataset, lineNumber, text) {
    if (!lineNumber) return;
    const lines = inputRawLines(dataset);
    lines[lineNumber - 1] = text;
    updateInputDatasetText(dataset, lines.join("\n"));
  }

  function inputRawLines(dataset) {
    return String(dataset.raw || "").replace(/\r/g, "").split("\n");
  }

  function updateInputDatasetText(dataset, text) {
    const parsed = window.CP2KParsers.parseFile(dataset.name, text);
    const id = dataset.id;
    const size = dataset.size;
    Object.assign(dataset, parsed, { id: id, size: size });
    state.fittedDatasetId = null;
    linkSingleOutToStructure();
    render();
    activateInspectorPage("inputPanel");
  }

  function diffInputLines(leftText, rightText) {
    const left = leftText.replace(/\r/g, "").split("\n").map(function (text, index) {
      return { text: text, key: text.trimEnd(), line: index + 1 };
    });
    const right = rightText.replace(/\r/g, "").split("\n").map(function (text, index) {
      return { text: text, key: text.trimEnd(), line: index + 1 };
    });
    if (left.length * right.length > 4000000) return diffInputLinesByIndex(left, right);

    const dp = Array.from({ length: left.length + 1 }, function () { return new Array(right.length + 1).fill(0); });
    for (let i = left.length - 1; i >= 0; i -= 1) {
      for (let j = right.length - 1; j >= 0; j -= 1) {
        dp[i][j] = left[i].key === right[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const rows = [];
    let i = 0;
    let j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i].key === right[j].key) {
        rows.push(diffRow("same", left[i], right[j]));
        i += 1;
        j += 1;
      } else if (j < right.length && (i === left.length || dp[i][j + 1] >= dp[i + 1][j])) {
        rows.push(diffRow("added", null, right[j]));
        j += 1;
      } else if (i < left.length) {
        rows.push(diffRow("removed", left[i], null));
        i += 1;
      }
    }
    return coalesceModifiedRows(rows);
  }

  function diffInputLinesByIndex(left, right) {
    const count = Math.max(left.length, right.length);
    const rows = [];
    for (let i = 0; i < count; i += 1) {
      const a = left[i] || null;
      const b = right[i] || null;
      rows.push(diffRow(a && b && a.key === b.key ? "same" : a && b ? "modified" : a ? "removed" : "added", a, b));
    }
    return rows;
  }

  function coalesceModifiedRows(rows) {
    const result = [];
    for (let i = 0; i < rows.length; i += 1) {
      const current = rows[i];
      const next = rows[i + 1];
      if (current.kind === "removed" && next && next.kind === "added") {
        result.push({
          kind: "modified",
          leftLine: current.leftLine,
          leftText: current.leftText,
          rightLine: next.rightLine,
          rightText: next.rightText,
        });
        i += 1;
      } else {
        result.push(current);
      }
    }
    return result;
  }

  function diffRow(kind, left, right) {
    return {
      kind: kind,
      leftLine: left ? left.line : "",
      leftText: left ? left.text : "",
      rightLine: right ? right.line : "",
      rightText: right ? right.text : "",
    };
  }

  function renderTreeNode(node, depth) {
    const details = document.createElement("details");
    details.className = "input-tree-node";
    details.style.setProperty("--depth", String(depth || 0));
    details.open = node.name === "GLOBAL" || node.name === "FORCE_EVAL" || node.name === "SUBSYS";
    const summary = document.createElement("summary");
    summary.textContent = `&${node.name}${node.suffix ? ` ${node.suffix}` : ""}  L${node.line}`;
    details.append(summary);

    node.params.slice(0, 12).forEach((param) => {
      const code = document.createElement("code");
      code.className = "input-param";
      code.textContent = `${param.line}: ${param.text}`;
      details.append(code);
    });

    if (node.params.length > 12) {
      const code = document.createElement("code");
      code.className = "input-param";
      code.textContent = `... ${node.params.length - 12} more`;
      details.append(code);
    }

    node.children.forEach((child) => details.append(renderTreeNode(child, (depth || 0) + 1)));
    return details;
  }

  function activeAnalysisDataset() {
    const dataset = activeDataset();
    if (!dataset) return null;
    if (dataset.analysis) return dataset;
    // If viewing a structure linked to an OUT, use the OUT's analysis
    if (dataset.linkedOutId) return state.datasets.find(function (item) { return item.id === dataset.linkedOutId; }) || null;
    return null;
  }

  function renderLinkedOutputNotice(outputDataset) {
    const active = activeDataset();
    const rows = [["OUT 文件", outputDataset.name]];
    if (active && active.linkedOutId === outputDataset.id) {
      rows.push(["关联结构", active.name]);
      rows.push(["对应方式", active.linkMode === "energy" ? "XYZ 第 1 帧 -> energy block " + (active.linkedStepOffset || 0) : active.linkMode === "scf" ? "XYZ 第 1 帧 -> SCF block " + (active.linkedStepOffset || 0) : "XYZ 第 1 帧 -> OPT step " + (active.linkedStepOffset || 0)]);
      rows.push(["能量来源", outputDataset.analysis.energySource || "OPT| Total energy [hartree]"]);
      if (active.linkWarning) rows.push(["警告", active.linkWarning, "warn"]);
    }
    return renderKeyValueSection("结构-OUT 关联", rows, false);
  }

  function renderAnalysis(options) {
    const settings = options || {};
    const scrollTop = settings.preserveScroll ? els.analysisView.scrollTop : 0;
    const scrollLeft = settings.preserveScroll ? els.analysisView.scrollLeft : 0;
    const dataset = activeAnalysisDataset();
    if (!dataset || !dataset.analysis) {
      els.analysisView.textContent = "暂无 out 文件结果";
      return;
    }

    const analysis = dataset.analysis;
    const report = document.createElement("div");
    report.className = "analysis-report";
    report.append(renderLinkedOutputNotice(dataset));

    const overview = [
      ["End status", analysis.normalEnd ? "Normal" : analysis.aborted ? "Aborted" : "Unknown", analysis.normalEnd ? "ok" : "warn"],
      ["Lines", String(analysis.lineCount || 0)],
      ["CP2K version", metaValue(analysis, "cp2kVersion")],
      ["Run type", metaValue(analysis, "runType")],
      ["Project", metaValue(analysis, "projectName")],
      ["QS method", metaValue(analysis, "qsMethod")],
      ["XC", metaValue(analysis, "xcFunctional")],
      ["Cutoff", metaValue(analysis, "cutoff")],
      ["Relative cutoff", metaValue(analysis, "relCutoff")],
      ["Energy points", String(analysis.energies.length)],
      ["SCF", `${analysis.scfRuns.length} runs / ${analysis.scf.length} records`],
      ["Optimization steps", String(analysis.optimization.steps.length)],
      ["MD steps", String(analysis.md.steps.length)],
      ["Warnings/errors", `${analysis.warnings.length} / ${analysis.errors.length}`, analysis.errors.length ? "warn" : ""],
    ].filter(([, value]) => value !== "");

    report.append(renderKeyValueSection("概览", overview, false));
    const chartSection = renderOptimizationChartsSection(analysis);
    report.append(chartSection);
    const energyBlock = currentEnergyBreakdown(analysis);
    const scfBlock = currentScfBlock(analysis);
    report.append(renderEnergySection(analysis, energyBlock));
    report.append(renderOutputLocatorSection(dataset, energyBlock, { id: "outLocatorSection", title: "OUT 原文定位", empty: "暂无可定位的 OUT 原文" }));
    report.append(renderScfSection(analysis, scfBlock));
    report.append(renderOutputLocatorSection(dataset, scfBlock, { id: "scfLocatorSection", title: "SCF 原文定位", empty: "暂无可定位的 SCF 原文" }));
    report.append(renderOptimizationSection(analysis, dataset));
    report.append(renderMdSection(analysis));
    report.append(renderAtomsSection(analysis));
    report.append(renderFilesSection(analysis, dataset));
    report.append(renderParameterSection(analysis, dataset));
    report.append(renderTextRowsSection("晶胞 / 应力", [
      ...analysis.cells.slice(-8).map((item) => `L${item.line} ${item.text}`),
      ...analysis.forces.slice(-8).map((item) => `L${item.line} ${item.text}`),
      ...analysis.stress.slice(-8).map((item) => `L${item.line} ${item.text}`),
    ]));
    report.append(renderTimingSection(analysis));
    report.append(renderWarningsErrorsSection(analysis, dataset));

    els.analysisView.replaceChildren(report);
    if (settings.preserveScroll) {
      els.analysisView.scrollTop = scrollTop;
      els.analysisView.scrollLeft = scrollLeft;
    }
    window.setTimeout(() => drawOptimizationCharts(chartSection, analysis), 0);
  }

  function renderKeyValueSection(title, rows, open) {
    const details = document.createElement("details");
    details.className = "analysis-section";
    details.open = open || rows.length <= 8;
    const summary = document.createElement("summary");
    summary.textContent = `${title} (${rows.length})`;
    details.append(summary);

    const grid = document.createElement("dl");
    grid.className = "analysis-grid";
    rows.forEach(([key, value, className]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = key;
      dd.textContent = value || "-";
      if (className) dd.className = className;
      grid.append(dt, dd);
    });
    details.append(grid);
    return details;
  }

  function renderOptimizationChartsSection(analysis) {
    const details = document.createElement("details");
    details.className = "analysis-section opt-chart-section";
    details.open = Boolean(analysis.optimization.steps.length);
    const summary = document.createElement("summary");
    summary.textContent = `Optimization Plot (${analysis.optimization.steps.length})`;
    details.append(summary);
    details.addEventListener("toggle", () => {
      if (details.open) window.setTimeout(() => drawOptimizationChartsIfVisible(), 0);
    });

    const tools = document.createElement("div");
    tools.className = "opt-chart-tools";
    const openAllBtn = document.createElement("button");
    openAllBtn.type = "button";
    openAllBtn.className = "opt-expand-btn";
    openAllBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>  </svg> 展开全部图表';
    openAllBtn.title = "在独立窗口并排查看全部优化图表";
    openAllBtn.addEventListener("click", () => openOptimizationChartWindow(null));
    tools.append(openAllBtn);
    const hint = document.createElement("span");
    hint.textContent = "拖拽可局部放大 | 双击恢复";
    tools.append(hint);
    details.append(tools);

    const stack = document.createElement("div");
    stack.className = "opt-chart-stack";
    optimizationMetricDefs().forEach((metric) => {
      const item = document.createElement("div");
      item.className = "opt-chart-item";
      const label = document.createElement("div");
      label.className = "opt-chart-label-inline";
      label.textContent = metric.title;
      const canvas = document.createElement("canvas");
      canvas.className = "opt-plot-canvas";
      canvas.width = 960;
      canvas.height = 220;
      canvas.dataset.metric = metric.key;
      canvas.setAttribute("aria-label", metric.title);
      canvas.addEventListener("pointerdown", handleOptChartPointerDown);
      canvas.addEventListener("pointermove", handleOptChartPointerMove);
      canvas.addEventListener("pointerup", handleOptChartPointerUp);
      canvas.addEventListener("pointercancel", handleOptChartPointerCancel);
      canvas.addEventListener("dblclick", () => resetOptChartCanvas(canvas));
      item.append(label, canvas);
      stack.append(item);
    });
    details.append(stack);

    const status = document.createElement("div");
    status.className = "opt-chart-status";
    status.textContent = "Select an optimization step to show values here";
    details.append(status);
    return details;
  }

  function drawOptimizationCharts(section, analysis) {
    if (!section || !section.isConnected) return;
    section.querySelectorAll("canvas[data-metric]").forEach((canvas) => {
      const metricKey = canvas.dataset.metric;
      const metric = optimizationMetricDefs().find((item) => item.key === metricKey);
      if (!metric) return;
      const points = analysis.optimization.steps
        .map((step) => {
          const value = metricKey === "energy" ? metricValue(step.energy) : metricValue(step[metricKey]);
          return Number.isFinite(value) ? { frame: step.step, value, line: step.line } : null;
        })
        .filter(Boolean);
      const convergenceLimit = extractConvergenceLimit(analysis.optimization.steps, metricKey);
      configureOptChartCanvas(canvas, metric, points, convergenceLimit);
    });
    updateOptChartStatus(section);
  }

  function extractConvergenceLimit(steps, metricKey) {
    if (metricKey === "energy") return null;
    const limitKey = metricKey + "Limit";
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (step[limitKey] && Number.isFinite(step[limitKey].value)) {
        return step[limitKey].value;
      }
    }
    return null;
  }

  function optimizationMetricDefs() {
    return [
      { key: "energy", title: "Total Energy", yLabel: "Total Energy (Hartree)", valueLabel: "Total Energy", unit: "Hartree" },
      { key: "maxGradient", title: "Maximum Internal Force", yLabel: "Maximum Force (Hartree/Bohr)", valueLabel: "Maximum Force", unit: "Hartree/Bohr" },
      { key: "rmsGradient", title: "RMS Gradient Norm", yLabel: "RMS Gradient Norm (Hartree/Bohr)", valueLabel: "RMS Gradient", unit: "Hartree/Bohr" },
      { key: "maxStep", title: "Maximum Step Size", yLabel: "Maximum Step Size (Bohr)", valueLabel: "Maximum Step", unit: "Bohr" },
      { key: "rmsStep", title: "RMS Step Size", yLabel: "RMS Step Size (Bohr)", valueLabel: "RMS Step", unit: "Bohr" },
    ];
  }

  function configureOptChartCanvas(canvas, metric, points, convergenceLimit) {
    const existing = canvas._optChart;
    const full = optChartFullView(points, convergenceLimit);
    canvas._optChart = {
      metric,
      points,
      full,
      view: existing && existing.metric && existing.metric.key === metric.key ? constrainOptView(existing.view, full) : { ...full },
      hitboxes: [],
      drag: null,
      convergenceLimit: Number.isFinite(convergenceLimit) ? convergenceLimit : null,
    };
    drawOptChartCanvas(canvas);
  }

  function optChartFullView(points, convergenceLimit) {
    if (!points.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    const xs = points.map((point) => point.frame);
    const ys = points.map((point) => point.value);
    const xMinRaw = Math.min(...xs);
    const xMaxRaw = Math.max(...xs);
    const yMinRaw = Math.min(...ys);
    const yMaxRaw = Math.max(...ys);
    var limYMin = yMinRaw;
    var limYMax = yMaxRaw;
    if (Number.isFinite(convergenceLimit)) {
      limYMin = Math.min(yMinRaw, convergenceLimit * 0.85);
      limYMax = Math.max(yMaxRaw, convergenceLimit * 1.15);
    }
    const xPad = Math.max((xMaxRaw - xMinRaw) * 0.03, 0.65);
    const yPad = Math.max((limYMax - limYMin) * 0.12, Math.max(Math.abs(limYMax), 1) * 1e-8);
    return {
      xMin: xMinRaw - xPad,
      xMax: xMaxRaw + xPad,
      yMin: limYMin - yPad,
      yMax: limYMax + yPad,
    };
  }

  function constrainOptView(view, full) {
    if (!view) return { ...full };
    const next = { ...view };
    if (!Number.isFinite(next.xMin) || !Number.isFinite(next.xMax) || Math.abs(next.xMax - next.xMin) < 1e-9) return { ...full };
    if (!Number.isFinite(next.yMin) || !Number.isFinite(next.yMax) || Math.abs(next.yMax - next.yMin) < 1e-12) return { ...full };
    return next;
  }

  function drawOptimizationChartsIfVisible() {
    document.querySelectorAll(".opt-plot-canvas").forEach((canvas) => {
      if (canvas._optChart && canvas.isConnected) drawOptChartCanvas(canvas);
    });
    const section = document.querySelector(".opt-chart-section");
    if (section) updateOptChartStatus(section);
  }

  function drawOptChartCanvas(canvas, selectionRect) {
    const chart = canvas._optChart;
    if (!chart) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(220, Math.floor((rect.width || 320) * ratio));
    const height = Math.max(70, Math.floor((rect.height || 88) * ratio));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fffdf4";
    ctx.fillRect(0, 0, width, height);

    const plot = {
      left: 6 * ratio,
      top: 4 * ratio,
      width: width - 12 * ratio,
      height: height - 8 * ratio,
    };
    chart.plot = plot;
    const view = chart.view;
    const viewXSpan = Math.max(1e-12, view.xMax - view.xMin);
    const viewYSpan = Math.max(1e-12, view.yMax - view.yMin);
    const xFor = (frame) => plot.left + ((frame - view.xMin) / viewXSpan) * plot.width;
    const yFor = (value) => plot.top + (1 - (value - view.yMin) / viewYSpan) * plot.height;

    if (!chart.points.length) {
      chart.hitboxes = [];
      return;
    }

    // Thin bottom line
    ctx.strokeStyle = "#dbe2ea";
    ctx.lineWidth = ratio;
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.top + plot.height);
    ctx.lineTo(plot.left + plot.width, plot.top + plot.height);
    ctx.stroke();

    // Filter visible points within view range
    const visible = chart.points.filter((point) => {
      const x = xFor(point.frame);
      return x >= plot.left - 8 && x <= plot.left + plot.width + 8;
    });

    // Draw trend line
    ctx.strokeStyle = "#2f6f73";
    ctx.lineWidth = 1.7 * ratio;
    ctx.beginPath();
    visible.forEach((point) => {
      const x = xFor(point.frame);
      const y = yFor(point.value);
      if (point === visible[0]) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw convergence threshold line (horizontal dashed)
    if (Number.isFinite(chart.convergenceLimit)) {
      const limY = yFor(chart.convergenceLimit);
      if (limY >= plot.top && limY <= plot.top + plot.height) {
        ctx.save();
        ctx.strokeStyle = "#cc2936";
        ctx.lineWidth = 1.8 * ratio;
        ctx.setLineDash([6 * ratio, 3 * ratio]);
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.moveTo(plot.left, limY);
        ctx.lineTo(plot.left + plot.width, limY);
        ctx.stroke();
        ctx.restore();

        // Label with numeric value on semi-transparent background
        var labelText = "limit " + formatNumber(chart.convergenceLimit);
        ctx.font = "bold " + Math.round(9 * ratio) + "px 'Segoe UI', sans-serif";
        var textW = ctx.measureText(labelText).width + 10 * ratio;
        ctx.fillStyle = "rgba(204, 41, 54, 0.12)";
        var tx = plot.left + plot.width - textW - 2 * ratio;
        var ty = limY - 12 * ratio;
        ctx.fillRect(tx, ty, textW, 14 * ratio);
        ctx.fillStyle = "#cc2936";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(labelText, tx + 4 * ratio, limY - 2 * ratio);
      }
    }

    // Build hitboxes around the actual data points; the connecting line has no hit target.
    chart.hitboxes = visible.map((point) => ({
      frame: point.frame,
      value: point.value,
      x: xFor(point.frame),
      y: yFor(point.value),
      radius: 4.5 * ratio,
    }));

    // Draw every visible data point so the selectable targets match what is on screen.
    const selectedStep = currentOptStep();
    visible.forEach((point) => {
      const x = xFor(point.frame);
      if (x < plot.left - 6 * ratio || x > plot.left + plot.width + 6 * ratio) return;
      const selected = point.frame === selectedStep;
      const y = yFor(point.value);
      ctx.fillStyle = selected ? "#ffffff" : "#2f6f73";
      ctx.strokeStyle = selected ? "#c9302c" : "#2f6f73";
      ctx.lineWidth = selected ? 2 * ratio : 1 * ratio;
      ctx.beginPath();
      ctx.arc(x, y, selected ? 4 * ratio : 1.9 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw selection rectangle
    if (selectionRect) {
      ctx.strokeStyle = "rgba(166, 0, 0, 0.65)";
      ctx.lineWidth = 1.4 * ratio;
      ctx.setLineDash([5 * ratio, 3 * ratio]);
      const rx = Math.min(selectionRect.x1, selectionRect.x2);
      const ry = Math.min(selectionRect.y1, selectionRect.y2);
      const rw = Math.abs(selectionRect.x2 - selectionRect.x1);
      const rh = Math.abs(selectionRect.y2 - selectionRect.y1);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }
  }

  function openOptimizationChartWindow(canvas) {
    // When called from the expand button, find the first available chart canvas
    if (!canvas) {
      var firstCanvas = document.querySelector("canvas[data-metric]");
      if (!firstCanvas) return;
      canvas = firstCanvas;
    }
    const chart = canvas && canvas._optChart;
    if (!chart || !chart.points.length) return;
    setActiveOptChart(canvas);

    // Collect all chart canvases from the opt section
    const section = canvas.closest(".opt-chart-section");
    const allCanvases = section ? Array.from(section.querySelectorAll("canvas[data-metric]")).filter(function (c) { return c._optChart && c._optChart.points.length; }) : [canvas];
    const activeMetric = chart.metric.key;

    state.chartModal = {
      type: "opt",
      charts: allCanvases.map(function (c) {
        var ch = c._optChart;
        return {
          metric: ch.metric,
          points: ch.points,
          full: { ...ch.full },
          view: { ...ch.view },
          hitboxes: [],
          drag: null,
          canvas: null,
          convergenceLimit: ch.convergenceLimit,
        };
      }),
      activeKey: activeMetric,
    };

    els.chartWindowTitle.textContent = "\u4f18\u5316\u56fe\u8868";
    buildChartWindowBody();
    els.chartWindow.hidden = false;
    drawChartWindow();
  }

  function buildChartWindowBody() {
    var body = els.chartWindowBody;
    body.innerHTML = "";
    if (!state.chartModal || !state.chartModal.charts) return;

    state.chartModal.charts.forEach(function (chart, idx) {
      var wrapper = document.createElement("div");
      wrapper.className = "cw-chart-wrap";

      var label = document.createElement("div");
      label.className = "cw-chart-label";
      var title = document.createElement("span");
      title.textContent = chart.metric.title;

      var canvas = document.createElement("canvas");
      canvas.className = "cw-canvas";
      canvas.dataset.cwIndex = String(idx);

      label.append(title);
      wrapper.append(label, canvas);
      body.append(wrapper);

      // Store reference
      chart.canvas = canvas;
      chart.wrapper = wrapper;

      // Attach per-canvas event handlers
      canvas.addEventListener("pointerdown", handleCWPointerDown);
      canvas.addEventListener("pointermove", handleCWPointerMove);
      canvas.addEventListener("pointerup", handleCWPointerUp);
      canvas.addEventListener("pointercancel", handleCWPointerCancel);
      canvas.addEventListener("dblclick", handleCWDoubleClick);
    });
  }

  function closeChartWindow() {
    els.chartWindow.hidden = true;
    state.chartModal = null;
    els.chartWindowBody.innerHTML = "";
  }

  function resetChartWindowView() {
    if (!state.chartModal || !state.chartModal.charts) return;
    state.chartModal.charts.forEach(function (chart) {
      chart.view = { ...chart.full };
      chart.drag = null;
    });
    drawChartWindow();
  }

  function optChartPlotBox(canvas, ratio) {
    const r = ratio || window.devicePixelRatio || 1;
    return {
      left: 82 * r,
      top: 34 * r,
      width: canvas.width - 98 * r,
      height: canvas.height - 68 * r,
    };
  }

  function handleOptChartPointerDown(event) {
    if (event.button !== 0) return;
    const canvas = event.currentTarget;
    if (!canvas._optChart) return;
    setActiveOptChart(canvas);
    const point = optCanvasPoint(canvas, event);
    canvas.setPointerCapture(event.pointerId);
    canvas._optChart.drag = {
      start: point,
      end: point,
      moved: false,
    };
  }

  function handleOptChartPointerMove(event) {
    const canvas = event.currentTarget;
    const chart = canvas._optChart;
    if (!chart) return;
    const point = optCanvasPoint(canvas, event);
    if (chart.drag) {
      chart.drag.end = point;
      const distance = Math.hypot(point.x - chart.drag.start.x, point.y - chart.drag.start.y);
      chart.drag.moved = chart.drag.moved || distance > 4 * (window.devicePixelRatio || 1);
      if (chart.drag.moved) {
        drawOptChartCanvas(canvas, {
          x1: chart.drag.start.x,
          y1: chart.drag.start.y,
          x2: chart.drag.end.x,
          y2: chart.drag.end.y,
        });
      }
      return;
    }

    const nearest = nearestOptHitbox(chart, point.x, point.y);
    if (nearest) updateOptChartStatus(canvas.closest(".opt-chart-section"), nearest, chart);
  }

  function handleOptChartPointerUp(event) {
    const canvas = event.currentTarget;
    const chart = canvas._optChart;
    if (!chart || !chart.drag) return;
    const drag = chart.drag;
    chart.drag = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already be gone after a cancel event.
    }

    const width = Math.abs(drag.end.x - drag.start.x);
    const height = Math.abs(drag.end.y - drag.start.y);
    if (drag.moved && width > 10 && height > 10) {
      zoomOptChartToRect(canvas, drag.start, drag.end);
      updateOptChartStatus(canvas.closest(".opt-chart-section"));
      return;
    }

    selectOptPointAt(canvas, optCanvasPoint(canvas, event));
  }

  function handleOptChartPointerCancel(event) {
    const canvas = event.currentTarget;
    if (canvas._optChart) {
      canvas._optChart.drag = null;
      drawOptChartCanvas(canvas);
    }
  }

  function optCanvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
      y: (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
    };
  }

  function optValueAtCanvas(canvas, point) {
    const chart = canvas._optChart;
    const plot = chart.plot || optChartPlotBox(canvas);
    const xRatio = (point.x - plot.left) / Math.max(1, plot.width);
    const yRatio = (point.y - plot.top) / Math.max(1, plot.height);
    return {
      x: chart.view.xMin + xRatio * (chart.view.xMax - chart.view.xMin),
      y: chart.view.yMax - yRatio * (chart.view.yMax - chart.view.yMin),
    };
  }

  function nearestOptHitbox(chart, x, y) {
    let best = null;
    let bestDistance = Infinity;
    chart.hitboxes.forEach((point) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    });
    if (!best || bestDistance > best.radius) return null;
    return best;
  }

  function selectOptPointAt(canvas, point) {
    const chart = canvas._optChart;
    const best = chart ? nearestOptHitbox(chart, point.x, point.y) : null;
    if (!best) {
      drawOptChartCanvas(canvas);
      return;
    }
    state.selectedOptStep = best.frame;
    updateOptChartStatus(canvas.closest(".opt-chart-section"), best, chart);
    selectFrameForOptStep(best.frame, { deferChartRedraw: true, preserveSelectedOptStep: true });
    scheduleChartRedraw();
    activateInspectorPage("analysisPanel");
    // chart re-drawn by renderFrameOnly 鈫?drawOptimizationChartsIfVisible
  }

  function zoomOptChartToRect(canvas, start, end) {
    const chart = canvas._optChart;
    if (!chart) return;
    const plot = chart.plot || optChartPlotBox(canvas);
    const left = clamp(Math.min(start.x, end.x), plot.left, plot.left + plot.width);
    const right = clamp(Math.max(start.x, end.x), plot.left, plot.left + plot.width);
    const top = clamp(Math.min(start.y, end.y), plot.top, plot.top + plot.height);
    const bottom = clamp(Math.max(start.y, end.y), plot.top, plot.top + plot.height);
    if (right - left < 6 || bottom - top < 6) {
      drawOptChartCanvas(canvas);
      return;
    }
    const low = optValueAtCanvas(canvas, { x: left, y: bottom });
    const high = optValueAtCanvas(canvas, { x: right, y: top });
    chart.view = {
      xMin: low.x,
      xMax: high.x,
      yMin: low.y,
      yMax: high.y,
    };
    drawOptChartCanvas(canvas);
  }

  function resetOptChartCanvas(canvas) {
    if (!canvas._optChart) return;
    canvas._optChart.view = { ...canvas._optChart.full };
    drawOptChartCanvas(canvas);
  }

  function setActiveOptChart(canvas) {
    document.querySelectorAll(".opt-plot-canvas.active").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".opt-chart-item.active").forEach((item) => item.classList.remove("active"));
    canvas.classList.add("active");
    const item = canvas.closest(".opt-chart-item");
    if (item) item.classList.add("active");
  }

  function updateOptChartStatus(section, point, chart) {
    if (!section) return;
    const status = section.querySelector(".opt-chart-status");
    if (!status) return;
    const canvases = Array.from(section.querySelectorAll("canvas[data-metric]")).filter((canvas) => canvas._optChart);
    const step = point ? point.frame : currentOptStep() || optLastStep(canvases);
    if (!step) {
      status.textContent = "No optimization step data";
      return;
    }
    const values = optValuesForStep(canvases, step);
    const focused = point && chart ? `  鈻?${chart.metric.valueLabel} (${chart.metric.unit}) = ${formatNumber(point.value)}` : "";
    status.innerHTML = [
      `<strong>Optimization Step Number = ${step}</strong>`,
      values.energy ? ` &nbsp; | &nbsp; Total Energy (Hartree) = <strong>${values.energy}</strong>` : "",
      values.rmsGradient ? ` &nbsp; | &nbsp; RMS Gradient = ${values.rmsGradient}` : "",
      values.maxGradient ? ` &nbsp; | &nbsp; Maximum Force = ${values.maxGradient}` : "",
      focused,
    ].filter(Boolean).join("");
  }

  function optValuesForStep(canvases, step) {
    return canvases.reduce((result, canvas) => {
      const chart = canvas._optChart;
      if (!chart) return result;
      const point = chart.points.find((item) => item.frame === step);
      if (point) result[chart.metric.key] = formatNumber(point.value);
      return result;
    }, {});
  }

  function optLastStep(canvases) {
    const steps = canvases.flatMap((canvas) => (canvas._optChart ? canvas._optChart.points.map((point) => point.frame) : []));
    return steps.length ? Math.max(...steps) : null;
  }

  function minChartPoint(points) {
    if (!points || !points.length) return null;
    return points.reduce(function (best, point) {
      if (!best) return point;
      if (point.value < best.value) return point;
      if (point.value === best.value && point.frame < best.frame) return point;
      return best;
    }, null);
  }

  function ensureChartPointVisible(chart, point) {
    if (!chart || !point || !chart.view || !chart.full) return;
    if (point.frame < chart.view.xMin || point.frame > chart.view.xMax || point.value < chart.view.yMin || point.value > chart.view.yMax) {
      chart.view = { ...chart.full };
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function selectFrameForOptStep(optStep, options) {
    state.selectedOptStep = optStep;
    // If viewing a structure linked to an OUT, jump to the matching frame
    var active = activeDataset();
    var linkedStructure =
      active && active.frames.length && active.linkedOutId
        ? active
        : state.datasets.find(function (d) { return d.frames.length && d.linkedOutId === (active && active.id); });
    if (!linkedStructure) return;
    var frameIndex = optStep - (linkedStructure.linkedStepOffset || 0);
    if (frameIndex < 0 || frameIndex >= linkedStructure.frames.length) return;
    if (state.activeId !== linkedStructure.id) {
      state.activeId = linkedStructure.id;
      state.fittedDatasetId = null;
      renderFileList();
    }
    setFrame(frameIndex, options);
  }

  function currentEnergyBreakdown(analysis) {
    var active = activeDataset();
    var frame = activeFrame();
    if (active && active.linkedOutId && frame && frame.energyBreakdown) return frame.energyBreakdown;

    var stepNumber = currentOptStep();
    if (stepNumber !== null && stepNumber !== undefined) {
      var step = (analysis.optimization.steps || []).find(function (item) { return item.step === stepNumber; });
      if (step && step.energyBreakdown) return step.energyBreakdown;
      var byStep = (analysis.energyBreakdowns || []).find(function (item) { return item.step === stepNumber; });
      if (byStep) return byStep;
    }

    return (analysis.energyBreakdowns || [])[0] || null;
  }

  function currentScfBlock(analysis) {
    var active = activeDataset();
    var frame = activeFrame();
    if (active && active.linkedOutId && frame && frame.scfBlock) return frame.scfBlock;

    var stepNumber = currentOptStep();
    if (stepNumber !== null && stepNumber !== undefined) {
      var step = (analysis.optimization.steps || []).find(function (item) { return item.step === stepNumber; });
      if (step && step.scfBlock) return step.scfBlock;
      var byStep = (analysis.scfBlocks || []).find(function (item) { return item.optStep === stepNumber; });
      if (byStep) return byStep;
    }

    return (analysis.scfBlocks || [])[0] || null;
  }

  function energyBreakdownRows(block) {
    if (!block || !block.values) return [];
    return ["overlap", "self", "coreHamiltonian", "hartree", "xc", "total"]
      .map(function (key) { return block.values[key]; })
      .filter(Boolean);
  }

  function renderEnergySection(analysis, block) {
    const details = document.createElement("details");
    details.className = "analysis-section energy-breakdown-section";
    details.open = true;
    const rows = energyBreakdownRows(block);
    const summary = document.createElement("summary");
    summary.textContent = "Energy (" + rows.length + ")";
    details.append(summary);

    if (!block || !rows.length) {
      const empty = document.createElement("div");
      empty.className = "analysis-empty";
      empty.textContent = analysis.energyBreakdowns && analysis.energyBreakdowns.length
        ? "当前帧没有匹配到 OUT 能量分解块"
        : "未找到 OUT 能量分解块";
      details.append(empty);
      return details;
    }

    const tools = document.createElement("div");
    tools.className = "energy-block-tools";
    const meta = document.createElement("span");
    meta.textContent = "OUT L" + block.lineStart + "-L" + block.lineEnd;
    const locateBtn = document.createElement("button");
    locateBtn.type = "button";
    locateBtn.className = "energy-locate-btn";
    locateBtn.title = "展开 OUT 原文并定位到这组能量";
    locateBtn.textContent = "定位到 OUT 原文";
    locateBtn.addEventListener("click", function () {
      revealOutputEnergyBlock(block.lineStart);
    });
    tools.append(meta, locateBtn);
    details.append(tools);

    const grid = document.createElement("dl");
    grid.className = "analysis-grid energy-breakdown-grid";
    rows.forEach(function (item) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = item.label;
      dd.textContent = item.valueText;
      grid.append(dt, dd);
    });
    details.append(grid);
    return details;
  }

  function renderOutputLocatorSection(outputDataset, block, options) {
    const settings = options || {};
    const details = document.createElement("details");
    details.className = "analysis-section out-locator-section";
    details.id = settings.id || "outLocatorSection";
    const linePrefix = details.id + "-line-";
    const summary = document.createElement("summary");
    summary.textContent = block ? (settings.title || "OUT 原文定位") + " (L" + block.lineStart + ")" : settings.title || "OUT 原文定位";
    details.append(summary);

    if (!outputDataset || !outputDataset.raw || !block) {
      const empty = document.createElement("div");
      empty.className = "analysis-empty";
      empty.textContent = settings.empty || "暂无可定位的 OUT 原文";
      details.append(empty);
      return details;
    }

    const tools = document.createElement("div");
    tools.className = "out-locator-tools";
    const range = document.createElement("span");
    range.textContent = "L" + block.lineStart + "-L" + block.lineEnd;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "out-locator-close";
    closeBtn.title = "关闭 OUT 原文定位";
    closeBtn.textContent = "关闭";
    closeBtn.addEventListener("click", function () {
      details.open = false;
    });
    tools.append(range, closeBtn);
    details.append(tools);

    const lines = outputDataset.raw.replace(/\r/g, "").split("\n");
    const start = Math.max(1, block.lineStart - 2);
    const end = Math.min(lines.length, block.lineEnd + 2);
    const pre = document.createElement("pre");
    pre.className = "out-snippet";
    for (let lineNo = start; lineNo <= end; lineNo += 1) {
      const row = document.createElement("div");
      row.className = "out-line";
      row.id = linePrefix + lineNo;
      if (lineNo >= block.lineStart && lineNo <= block.lineEnd) row.classList.add("target");
      const number = document.createElement("span");
      number.className = "out-line-number";
      number.textContent = String(lineNo);
      const text = document.createElement("code");
      text.textContent = lines[lineNo - 1] || "";
      row.append(number, text);
      pre.append(row);
    }
    details.append(pre);
    return details;
  }

  function revealOutputEnergyBlock(lineStart) {
    revealOutputLocator("outLocatorSection", lineStart);
  }

  function revealOutputScfBlock(lineStart) {
    revealOutputLocator("scfLocatorSection", lineStart);
  }

  function revealOutputLocator(sectionId, lineStart) {
    const section = document.getElementById(sectionId);
    if (section) section.open = true;
    const target = document.getElementById(sectionId + "-line-" + lineStart);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("flash");
    window.setTimeout(function () {
      target.classList.remove("flash");
    }, 1300);
  }

  function renderScfSection(analysis, block) {
    const details = document.createElement("details");
    details.className = "analysis-section scf-section";
    details.open = Boolean(block && block.iterations && block.iterations.length);
    const points = scfConvergencePoints(block);
    const summary = document.createElement("summary");
    summary.textContent = "SCF (" + points.length + ")";
    details.append(summary);

    if (!block || !points.length) {
      const empty = document.createElement("div");
      empty.className = "analysis-empty";
      empty.textContent = analysis.scfBlocks && analysis.scfBlocks.length ? "当前帧没有匹配到 SCF 迭代块" : "未找到 SCF 迭代表";
      details.append(empty);
      return details;
    }

    const tools = document.createElement("div");
    tools.className = "energy-block-tools";
    const meta = document.createElement("span");
    meta.textContent = "OUT L" + block.lineStart + "-L" + block.lineEnd + (block.converged === false ? "  NOT converged" : block.converged === true ? "  converged" : "");
    const locateBtn = document.createElement("button");
    locateBtn.type = "button";
    locateBtn.className = "energy-locate-btn";
    locateBtn.title = "展开 OUT 原文并定位到当前帧完整 SCF";
    locateBtn.textContent = "定位到 OUT 原文";
    locateBtn.addEventListener("click", function () {
      revealOutputScfBlock(block.headerLine || block.lineStart);
    });
    const chartBtn = document.createElement("button");
    chartBtn.type = "button";
    chartBtn.className = "energy-locate-btn";
    chartBtn.title = "打开当前帧完整 SCF 收敛大图";
    chartBtn.textContent = "SCF 收敛图";
    chartBtn.addEventListener("click", function () {
      openScfConvergenceWindow(block);
    });
    tools.append(meta, chartBtn, locateBtn);
    details.append(tools);

    const hint = document.createElement("div");
    hint.className = "analysis-empty scf-chart-hint";
    const first = points[0];
    const last = points[points.length - 1];
    hint.textContent = "已匹配当前帧 SCF：" + points.length + " 轮，iteration " + first.frame + " -> " + last.frame + "，最新 convergence = " + formatNumber(last.value);
    details.append(hint);
    return details;
  }

  function scfConvergencePoints(block) {
    if (!block || !block.iterations) return [];
    return block.iterations
      .map(function (row) {
        return {
          frame: row.step,
          value: Number(row.convergence),
          line: row.line,
          totalEnergy: row.totalEnergy,
          change: row.change,
          updateMethod: row.updateMethod,
        };
      })
      .filter(function (point) { return Number.isFinite(point.value); });
  }

  function openScfConvergenceWindow(block) {
    const points = scfConvergencePoints(block);
    if (!points.length) return;
    openChartWindow({
      points: points,
      title: "SCF 收敛图",
      unit: "Convergence",
      valueLabel: "Convergence",
      key: "scfConvergence",
      type: "scf",
      selectedFrame: points[points.length - 1].frame,
    });
  }

  function renderOptimizationSection(analysis, outputDataset) {
    const items = [];
    if (analysis.optimization.optimizer) {
      items.push({ key: "Optimizer", value: analysis.optimization.optimizer, line: null });
    }
    items.push({ key: "Converged", value: analysis.optimization.converged ? "Yes" : "Not detected", line: null, className: analysis.optimization.converged ? "ok" : "" });
    analysis.optimization.steps.slice(-10).forEach((step) => {
      items.push({
        key: "Step " + step.step,
        line: step.line,
        value: [
          step.energy ? "E " + formatNumber(step.energy.value) : "",
          step.maxStep ? "MaxStep " + formatNumber(step.maxStep.value) : "",
          step.rmsStep ? "RMSStep " + formatNumber(step.rmsStep.value) : "",
          step.maxGradient ? "MaxGrad " + formatNumber(step.maxGradient.value) : "",
          step.rmsGradient ? "RMSGrad " + formatNumber(step.rmsGradient.value) : "",
        ].filter(Boolean).join("  ") || "L" + step.line,
      });
    });
    return renderLocatableRowsSection("Geometry optimization", items, outputDataset, "geomOptLocator");
  }

  function renderFilesSection(analysis, outputDataset) {
    const items = analysis.files.slice(0, 20).map(function (item) {
      return {
        key: "L" + item.line,
        line: item.line,
        value: item.label + ": " + item.value,
      };
    });
    return renderLocatableRowsSection("Files and settings", items, outputDataset, "filesLocator");
  }

  function renderLocatableRowsSection(title, items, outputDataset, idPrefix) {
    const details = document.createElement("details");
    details.className = "analysis-section locatable-section";
    details.open = false;
    const summary = document.createElement("summary");
    summary.textContent = title + " (" + items.length + ")";
    details.append(summary);

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "analysis-empty";
      empty.textContent = "暂无记录";
      details.append(empty);
      return details;
    }

    const grid = document.createElement("dl");
    grid.className = "analysis-grid locatable-grid";
    items.forEach(function (item, index) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = item.key;
      if (item.className) dd.className = item.className;

      const text = document.createElement("span");
      text.textContent = item.value || "-";
      dd.append(text);

      if (outputDataset && outputDataset.raw && item.line) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "inline-locate-btn";
        button.textContent = "定位";
        button.title = "定位到 OUT 原文 L" + item.line;
        button.addEventListener("click", function () {
          showInlineOutLocator(details, outputDataset, item.line, idPrefix + "-" + index);
        });
        dd.append(button);
      }

      grid.append(dt, dd);
    });
    details.append(grid);
    return details;
  }

  function showInlineOutLocator(section, outputDataset, lineNumber, idPrefix) {
    if (!section || !outputDataset || !outputDataset.raw || !lineNumber) return;
    section.open = true;
    var existing = section.querySelector(".inline-out-locator");
    if (existing) existing.remove();

    const lines = outputDataset.raw.replace(/\r/g, "").split("\n");
    const start = Math.max(1, lineNumber - 2);
    const end = Math.min(lines.length, lineNumber + 2);
    const wrap = document.createElement("div");
    wrap.className = "inline-out-locator";

    const tools = document.createElement("div");
    tools.className = "out-locator-tools";
    const label = document.createElement("span");
    label.textContent = "OUT L" + lineNumber;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "out-locator-close";
    closeBtn.textContent = "关闭";
    closeBtn.addEventListener("click", function () {
      wrap.remove();
    });
    tools.append(label, closeBtn);
    wrap.append(tools);

    const pre = document.createElement("pre");
    pre.className = "out-snippet";
    for (let lineNo = start; lineNo <= end; lineNo += 1) {
      const row = document.createElement("div");
      row.className = "out-line";
      row.id = idPrefix + "-line-" + lineNo;
      if (lineNo === lineNumber) row.classList.add("target");
      const number = document.createElement("span");
      number.className = "out-line-number";
      number.textContent = String(lineNo);
      const text = document.createElement("code");
      text.textContent = lines[lineNo - 1] || "";
      row.append(number, text);
      pre.append(row);
    }
    wrap.append(pre);
    section.append(wrap);

    const target = document.getElementById(idPrefix + "-line-" + lineNumber);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("flash");
      window.setTimeout(function () {
        target.classList.remove("flash");
      }, 1300);
    }
  }

  function renderWarningsErrorsSection(analysis, outputDataset) {
    const records = [
      ...analysis.errors.map(function (item) { return { type: "ERROR", line: item.line, text: item.text }; }),
      ...analysis.warnings.map(function (item) { return { type: "WARNING", line: item.line, text: item.text }; }),
    ];
    const groups = groupWarningRecords(records);
    const details = document.createElement("details");
    details.className = "analysis-section warnings-section";
    details.open = analysis.errors.length > 0;
    const summary = document.createElement("summary");
    summary.textContent = "Warnings and errors (" + records.length + ")";
    details.append(summary);

    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "analysis-empty";
      empty.textContent = "暂无 warning/error";
      details.append(empty);
      return details;
    }

    const list = document.createElement("div");
    list.className = "warning-groups";
    groups.forEach(function (group, index) {
      list.append(renderWarningGroup(group, details, outputDataset, "warnErr-" + index));
    });
    details.append(list);
    return details;
  }

  function groupWarningRecords(records) {
    const map = new Map();
    records.forEach(function (record) {
      const key = record.type + "\n" + normalizeWarningText(record.text);
      if (!map.has(key)) {
        map.set(key, { type: record.type, text: record.text, records: [] });
      }
      map.get(key).records.push(record);
    });
    return Array.from(map.values()).sort(function (a, b) {
      const rank = function (group) { return group.type === "ERROR" ? 0 : 1; };
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return a.records[0].line - b.records[0].line;
    });
  }

  function normalizeWarningText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\bL\d+\b/g, "L#")
      .trim();
  }

  function renderWarningGroup(group, section, outputDataset, idPrefix) {
    const item = document.createElement("details");
    item.className = "warning-group " + (group.type === "ERROR" ? "error-group" : "warning-group-item");
    item.open = false;

    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.className = group.type === "ERROR" ? "warn" : "";
    label.textContent = group.type + " x" + group.records.length;
    const text = document.createElement("span");
    text.className = "warning-summary-text";
    text.textContent = group.text;
    summary.append(label, text);
    item.append(summary);

    const lines = document.createElement("div");
    lines.className = "warning-lines";
    group.records.forEach(function (record, index) {
      const row = document.createElement("div");
      row.className = "warning-line";
      const line = document.createElement("span");
      line.textContent = "L" + record.line;
      const body = document.createElement("span");
      body.textContent = record.text;
      row.append(line, body);
      if (outputDataset && outputDataset.raw) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "inline-locate-btn";
        button.textContent = "定位";
        button.title = "定位到 OUT 原文 L" + record.line;
        button.addEventListener("click", function () {
          showInlineOutLocator(section, outputDataset, record.line, idPrefix + "-" + index);
        });
        row.append(button);
      }
      lines.append(row);
    });
    item.append(lines);
    return item;
  }

  function renderMdSection(analysis) {
    const rows = analysis.md.steps.slice(-12).map((step) => [
      `Step ${step.step}`,
      [
        step.time ? `t ${formatNumber(step.time.value)} fs` : "",
        step.temperature ? `T ${formatNumber(step.temperature.value)} K` : "",
        step.kinetic ? `Ek ${formatNumber(step.kinetic.value)}` : "",
        step.potential ? `Ep ${formatNumber(step.potential.value)}` : "",
        step.conserved ? `Cons ${formatNumber(step.conserved.value)}` : "",
      ].filter(Boolean).join("  ") || `L${step.line}`,
    ]);
    return renderKeyValueSection("Molecular dynamics", rows, rows.length > 0);
  }

  function renderAtomsSection(analysis) {
    const rows = [];
    if (analysis.atoms.count !== null) rows.push(["Total atoms", String(analysis.atoms.count)]);
    analysis.atoms.kinds.forEach((kind) => {
      rows.push([
        kind.name,
        [
          kind.element ? `元素 ${kind.element}` : "",
          kind.count !== null ? `${kind.count} atoms` : "",
          kind.basis ? `基组 ${kind.basis}` : "",
          kind.potential ? `赝势 ${kind.potential}` : "",
        ].filter(Boolean).join("  ") || `L${kind.line}`,
      ]);
    });
    return renderKeyValueSection("原子类型", rows, rows.length > 0);
  }

  function renderParameterSection(analysis, outputDataset) {
    const grouped = analysis.parameters.reduce((total, item) => {
      if (!total[item.section]) total[item.section] = [];
      total[item.section].push(item);
      return total;
    }, {});
    const items = Object.entries(grouped).flatMap(function ([section, records]) {
      return records.slice(0, 10).map(function (item) {
        return {
          key: section + " L" + item.line,
          line: item.line,
          value: item.key + (item.value ? ": " + item.value : ""),
        };
      });
    });
    return renderLocatableRowsSection("CP2K parameters", items, outputDataset, "cp2kParamLocator");
  }

  function renderTimingSection(analysis) {
    const rows = analysis.timings.slice(-16).map((item) => [
      `L${item.line}`,
      `${item.label} calls=${item.calls} values=${item.values.map(formatNumber).join(" ")}`,
    ]);
    return renderKeyValueSection("计时", rows, rows.length > 0);
  }

  function renderTextRowsSection(title, rows, open) {
    const filtered = rows.filter(Boolean);
    if (!filtered.length) return renderKeyValueSection(title, [], false);
    const normalized = filtered.map((text, index) => [String(index + 1), text]);
    return renderKeyValueSection(title, normalized, open);
  }

  function measurementFromSelection(selected) {
    const math = window.StructureMath;
    if (selected.length === 1) {
      return { kind: "atom", text: atomSummary(selected[0]) };
    }
    if (selected.length === 2) {
      const value = math.distance(selected[0], selected[1]);
      const indices = [selected[0].index, selected[1].index];
      return {
        kind: "distance",
        label: indices.map((index) => `#${index}`).join("-"),
        indices,
        unit: "Å",
        value,
        text: `键长 ${formatMeasurementValue(value, "distance")} Å`,
      };
    }
    if (selected.length === 3) {
      const value = math.angle(selected[0], selected[1], selected[2]);
      const indices = [selected[0].index, selected[1].index, selected[2].index];
      return {
        kind: "angle",
        label: indices.map((index) => `#${index}`).join("-"),
        indices,
        unit: "°",
        value,
        text: `键角 ${formatMeasurementValue(value, "angle")}°`,
      };
    }
    if (selected.length >= 4) {
      const value = math.dihedral(selected[0], selected[1], selected[2], selected[3]);
      const indices = [selected[0].index, selected[1].index, selected[2].index, selected[3].index];
      return {
        kind: "dihedral",
        label: indices.map((index) => `#${index}`).join("-"),
        indices,
        unit: "°",
        value,
        text: `二面角 ${formatMeasurementValue(value, "dihedral")}°`,
      };
    }
    return null;
  }

  function buildTrendSeries(selected, kind) {
    const dataset = activeDataset();
    if (!dataset || dataset.frames.length <= 1) return null;
    const indices = selected.slice(0, kind === "distance" ? 2 : kind === "angle" ? 3 : 4).map((atom) => atom.index);
    const math = window.StructureMath;
    const points = dataset.frames
      .map((frame, frameIndex) => {
        const atoms = indices.map((index) => atomByIndex(frame, index));
        if (atoms.some((atom) => !atom)) return null;
        const value =
          kind === "distance"
            ? math.distance(atoms[0], atoms[1])
            : kind === "angle"
              ? math.angle(atoms[0], atoms[1], atoms[2])
              : math.dihedral(atoms[0], atoms[1], atoms[2], atoms[3]);
        return { frame: frameIndex + 1, value };
      })
      .filter(Boolean);

    if (points.length < 2) return null;
    const label = indices.map((index) => `#${index}`).join("-");
    return {
      datasetId: dataset.id,
      kind,
      label,
      indices,
      unit: kind === "distance" ? "Å" : "°",
      points,
    };
  }

  function atomByIndex(frame, index) {
    return frame.atoms.find((atom) => atom.index === index) || null;
  }

  function trendTitle(series) {
    return `${trendKindLabel(series.kind)} ${series.label}`;
  }

  function renderTrend(series) {
    state.trendSeries = series;
    els.trendPanel.hidden = !series;
    els.exportTrendBtn.disabled = !series;
    els.exportFrameBtn.disabled = !activeFrame();
    if (!series) {
      clearTrendCanvas();
      els.trendSummary.textContent = "Select 2/3/4 atoms to build a trend";
      return;
    }

    const values = series.points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const currentPoint = series.points.find((point) => point.frame === state.frameIndex + 1);
    const currentText = currentPoint ? `；当前帧 ${currentPoint.frame}: ${formatNumber(currentPoint.value)} ${series.unit}` : "";
    els.trendSummary.textContent = `${trendTitle(series)}: ${formatNumber(min)} - ${formatNumber(max)} ${series.unit}${currentText}`;
    drawTrendCanvas(series);
  }

  function drawTrendCanvasIfVisible() {
    if (state.trendSeries && !els.trendPanel.hidden) drawTrendCanvas(state.trendSeries);
  }

  function drawTrendCanvas(series) {
    const canvas = els.trendCanvas;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(240, Math.floor(rect.width * ratio));
    const height = Math.max(130, Math.floor(rect.height * ratio));
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const padding = { left: 42 * ratio, right: 14 * ratio, top: 18 * ratio, bottom: 30 * ratio };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const values = series.points.map((point) => point.value);
    const frames = series.points.map((point) => point.frame);
    const minFrame = Math.min(...frames);
    const maxFrame = Math.max(...frames);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valuePad = Math.max((maxValue - minValue) * 0.12, series.kind === "distance" ? 0.01 : 0.1);
    const yMin = minValue - valuePad;
    const yMax = maxValue + valuePad;

    const xFor = (frame) => padding.left + ((frame - minFrame) / Math.max(1, maxFrame - minFrame)) * plotWidth;
    const yFor = (value) => padding.top + (1 - (value - yMin) / Math.max(1e-9, yMax - yMin)) * plotHeight;
    state.trendHitboxes = series.points.map((point) => ({
      frame: point.frame,
      value: point.value,
      x: xFor(point.frame),
      y: yFor(point.value),
      radius: 8 * ratio,
    }));

    ctx.strokeStyle = "#d6dde5";
    ctx.lineWidth = ratio;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
    ctx.stroke();

    ctx.fillStyle = "#627386";
    ctx.font = `${11 * ratio}px Segoe UI, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatNumber(yMax), padding.left - 7 * ratio, padding.top);
    ctx.fillText(formatNumber(yMin), padding.left - 7 * ratio, padding.top + plotHeight);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(minFrame), padding.left, padding.top + plotHeight + 8 * ratio);
    ctx.fillText(String(maxFrame), padding.left + plotWidth, padding.top + plotHeight + 8 * ratio);

    ctx.strokeStyle = "#137c72";
    ctx.lineWidth = 2 * ratio;
    ctx.beginPath();
    series.points.forEach((point, index) => {
      const x = xFor(point.frame);
      const y = yFor(point.value);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#137c72";
    state.trendHitboxes.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    });

    const current = series.points.find((point) => point.frame === state.frameIndex + 1);
    if (current) {
      const x = xFor(current.frame);
      const y = yFor(current.value);
      ctx.strokeStyle = "rgba(179, 68, 43, 0.55)";
      ctx.lineWidth = ratio;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
      ctx.fillStyle = "#b3442b";
      ctx.beginPath();
      ctx.arc(x, y, 3.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function clearTrendCanvas() {
    state.trendHitboxes = [];
    const ctx = els.trendCanvas.getContext("2d");
    ctx.clearRect(0, 0, els.trendCanvas.width, els.trendCanvas.height);
  }

  function handleTrendClick(event) {
    if (!state.trendSeries) return;
    openChartWindow({
      points: state.trendSeries.points,
      title: trendTitle(state.trendSeries),
      unit: state.trendSeries.unit,
      type: "measure",
    });
  }

  function openChartWindow(config) {
    if (!config || !config.points || !config.points.length) return;
    var xs = config.points.map(function (p) { return p.frame; });
    var ys = config.points.map(function (p) { return p.value; });
    var xMin = Math.min.apply(null, xs);
    var xMax = Math.max.apply(null, xs);
    var yMinRaw = Math.min.apply(null, ys);
    var yMaxRaw = Math.max.apply(null, ys);
    var yPad = Math.max((yMaxRaw - yMinRaw) * 0.12, Math.abs(yMaxRaw || 1) * 1e-8);
    var chart = {
      metric: { key: config.key || "measure", title: config.title || "\u8d8b\u52bf\u56fe", unit: config.unit || "", valueLabel: config.valueLabel || "Value" },
      points: config.points,
      full: { xMin: xMin, xMax: xMax, yMin: yMinRaw - yPad, yMax: yMaxRaw + yPad },
      view: { xMin: xMin, xMax: xMax, yMin: yMinRaw - yPad, yMax: yMaxRaw + yPad },
      hitboxes: [],
      drag: null,
      canvas: null,
    };
    state.chartModal = {
      type: config.type || "measure",
      charts: [chart],
      activeKey: config.key || "measure",
      selectedFrame: config.selectedFrame || null,
    };
    els.chartWindowTitle.textContent = config.title || "\u8d8b\u52bf\u56fe";
    buildChartWindowBody();
    els.chartWindow.hidden = false;
    drawChartWindow();
  }

  // 鈹€鈹€ Enlarged chart window (multi-canvas, box-select zoom) 鈹€鈹€

  function cwChartFromEvent(event) {
    if (!state.chartModal || !state.chartModal.charts) return null;
    var idx = Number(event.currentTarget.dataset.cwIndex);
    return state.chartModal.charts[idx] || null;
  }

  function cwCanvasPoint(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
      y: (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
    };
  }

  function cwPlotBox(canvas) {
    var ratio = window.devicePixelRatio || 1;
    return {
      left: 68 * ratio,
      top: 10 * ratio,
      width: canvas.width - 82 * ratio,
      height: canvas.height - 40 * ratio,
    };
  }

  function cwValueAt(canvas, chart, point) {
    var plot = cwPlotBox(canvas);
    var xRatio = (point.x - plot.left) / Math.max(1, plot.width);
    var yRatio = (point.y - plot.top) / Math.max(1, plot.height);
    return {
      x: chart.view.xMin + xRatio * (chart.view.xMax - chart.view.xMin),
      y: chart.view.yMax - yRatio * (chart.view.yMax - chart.view.yMin),
    };
  }

  function handleCWPointerDown(event) {
    if (event.button !== 0) return;
    var chart = cwChartFromEvent(event);
    if (!chart) return;
    var canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    var point = cwCanvasPoint(canvas, event);
    chart.drag = { start: point, end: point, moved: false };
    // Highlight active chart
    document.querySelectorAll(".cw-canvas.focus").forEach(function (c) { c.classList.remove("focus"); });
    canvas.classList.add("focus");
    state.chartModal.activeKey = chart.metric.key;
  }

  function handleCWPointerMove(event) {
    var chart = cwChartFromEvent(event);
    if (!chart) return;
    var canvas = event.currentTarget;
    var point = cwCanvasPoint(canvas, event);

    if (chart.drag) {
      chart.drag.end = point;
      var dist = Math.hypot(point.x - chart.drag.start.x, point.y - chart.drag.start.y);
      chart.drag.moved = chart.drag.moved || dist > 4 * (window.devicePixelRatio || 1);
      if (chart.drag.moved) {
        drawCWChart(canvas, chart, {
          x1: chart.drag.start.x, y1: chart.drag.start.y,
          x2: chart.drag.end.x, y2: chart.drag.end.y,
        });
      }
      return;
    }

    // Hover: update info bar with nearest point
    var nearest = cwNearestHitbox(chart, point.x, point.y);
    updateChartWindowInfo(nearest, chart);
  }

  function handleCWPointerUp(event) {
    var chart = cwChartFromEvent(event);
    if (!chart || !chart.drag) return;
    var canvas = event.currentTarget;
    var drag = chart.drag;
    chart.drag = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (e) { /* ok */ }

    var w = Math.abs(drag.end.x - drag.start.x);
    var h = Math.abs(drag.end.y - drag.start.y);
    if (drag.moved && w > 8 && h > 8) {
      // Box-select zoom
      cwZoomChartToRect(canvas, chart, drag.start, drag.end);
      drawCWChart(canvas, chart);
      updateChartWindowInfo(null, chart);
      return;
    }

    // Click: select nearest point
    var point = cwCanvasPoint(canvas, event);
    cwSelectPoint(canvas, chart, point);
  }

  function handleCWPointerCancel(event) {
    var chart = cwChartFromEvent(event);
    if (!chart) return;
    chart.drag = null;
    drawCWChart(event.currentTarget, chart);
  }

  function handleCWDoubleClick(event) {
    var chart = cwChartFromEvent(event);
    if (!chart) return;
    chart.view = { ...chart.full };
    chart.drag = null;
    drawCWChart(event.currentTarget, chart);
    updateChartWindowInfo(null, chart);
  }

  function cwZoomChartToRect(canvas, chart, start, end) {
    var plot = cwPlotBox(canvas);
    var left = clamp(Math.min(start.x, end.x), plot.left, plot.left + plot.width);
    var right = clamp(Math.max(start.x, end.x), plot.left, plot.left + plot.width);
    var top = clamp(Math.min(start.y, end.y), plot.top, plot.top + plot.height);
    var bottom = clamp(Math.max(start.y, end.y), plot.top, plot.top + plot.height);
    if (right - left < 6 || bottom - top < 6) return;
    var low = cwValueAt(canvas, chart, { x: left, y: bottom });
    var high = cwValueAt(canvas, chart, { x: right, y: top });
    chart.view = { xMin: low.x, xMax: high.x, yMin: low.y, yMax: high.y };
    state.chartModal.activeKey = chart.metric.key;
  }

  function cwNearestHitbox(chart, x, y) {
    var best = null;
    var bestDist = Infinity;
    (chart.hitboxes || []).forEach(function (pt) {
      var d = Math.hypot(pt.x - x, pt.y - y);
      if (d < bestDist) { best = pt; bestDist = d; }
    });
    if (!best || bestDist > best.radius) return null;
    return best;
  }

  function cwSelectPoint(canvas, chart, point) {
    var best = cwNearestHitbox(chart, point.x, point.y);
    if (!best) { drawCWChart(canvas, chart); return; }
    selectChartWindowPoint(chart, best);
  }

  function selectChartWindowPoint(chart, point) {
    if (!state.chartModal || !chart || !point) return;
    state.chartModal.activeKey = chart.metric.key;
    if (chart.canvas) {
      document.querySelectorAll(".cw-canvas.focus").forEach(function (canvas) { canvas.classList.remove("focus"); });
      chart.canvas.classList.add("focus");
    }

    if (state.chartModal.type === "measure") {
      updateChartWindowInfo(point, chart);
      scheduleChartLinkedFrameUpdate(function () {
        setFrame(point.frame - 1, { deferChartRedraw: true });
        activateInspectorPage("measurePanel");
      });
      return;
    }

    if (state.chartModal.type === "scf") {
      state.chartModal.selectedFrame = point.frame;
      updateChartWindowInfo(point, chart);
      drawChartWindow();
      return;
    }

    state.selectedOptStep = point.frame;
    updateChartWindowInfo(point, chart);
    drawChartWindow();
    scheduleChartLinkedFrameUpdate(function () {
      selectFrameForOptStep(point.frame, { deferChartRedraw: true, preserveSelectedOptStep: true });
      scheduleChartRedraw();
      activateInspectorPage("analysisPanel");
    });
  }

  function scheduleChartLinkedFrameUpdate(callback) {
    var version = ++state.chartFrameUpdateVersion;
    window.requestAnimationFrame(function () {
      if (version !== state.chartFrameUpdateVersion) return;
      window.setTimeout(function () {
        if (version !== state.chartFrameUpdateVersion) return;
        callback();
      }, 0);
    });
  }

  function handleChartWindowArrow(delta) {
    if (!state.chartModal || els.chartWindow.hidden) return false;
    var chart = activeChartWindowChart();
    if (!chart || !chart.points || !chart.points.length) return false;
    var step = currentChartStep();
    var currentIndex = chart.points.findIndex(function (point) { return point.frame === step; });
    if (currentIndex < 0) {
      currentIndex = delta > 0 ? -1 : chart.points.length;
    }
    var nextIndex = clamp(currentIndex + delta, 0, chart.points.length - 1);
    var point = chart.points[nextIndex];
    if (!point || point.frame === step) return true;
    selectChartWindowPoint(chart, point);
    return true;
  }

  function selectChartWindowMinimum() {
    if (!state.chartModal || !state.chartModal.charts || !state.chartModal.charts.length) return;
    var chart = activeChartWindowChart();
    var point = minChartPoint(chart && chart.points);
    if (!chart || !point) return;
    ensureChartPointVisible(chart, point);
    state.chartModal.charts.forEach(function (item) {
      var sameStep = item.points.find(function (candidate) { return candidate.frame === point.frame; });
      if (sameStep) ensureChartPointVisible(item, sameStep);
    });
    state.chartModal.activeKey = chart.metric.key;
    if (chart.canvas) {
      document.querySelectorAll(".cw-canvas.focus").forEach(function (canvas) { canvas.classList.remove("focus"); });
      chart.canvas.classList.add("focus");
    }
    selectChartWindowPoint(chart, point);
  }

  function activeChartWindowChart() {
    if (!state.chartModal || !state.chartModal.charts || !state.chartModal.charts.length) return null;
    var activeKey = state.chartModal.activeKey;
    return state.chartModal.charts.find(function (chart) { return chart.metric.key === activeKey; }) || state.chartModal.charts[0];
  }

  function updateChartWindowInfo(point, chart) {
    if (!state.chartModal || !state.chartModal.charts) {
      els.chartWindowInfo.textContent = "";
      return;
    }
    var step = point ? point.frame : currentChartStep();
    if (!step) {
      els.chartWindowInfo.textContent = "\u6ca1\u6709\u6570\u636e";
      return;
    }
    var parts = [state.chartModal.type === "scf" ? "SCF iteration " + step : "Step " + step];
    state.chartModal.charts.forEach(function (ch) {
      var pt = ch.points.find(function (p) { return p.frame === step; });
      if (pt) {
        parts.push(ch.metric.title + " = " + formatNumber(pt.value) + " " + ch.metric.unit);
        if (state.chartModal.type === "scf") {
          if (pt.totalEnergy) parts.push("Total energy = " + pt.totalEnergy);
          if (pt.change) parts.push("Change = " + pt.change);
        }
      }
    });
    els.chartWindowInfo.textContent = parts.join("  \u2502  ");
  }

  function drawChartWindow() {
    if (!state.chartModal || els.chartWindow.hidden) return;
    (state.chartModal.charts || []).forEach(function (chart) {
      if (chart.canvas && chart.canvas.isConnected) {
        drawCWChart(chart.canvas, chart);
      }
    });
  }

  function drawCWChart(canvas, chart, selectionRect) {
    var ctx = canvas.getContext("2d");
    var rect = canvas.getBoundingClientRect();
    var ratio = window.devicePixelRatio || 1;
    var w = Math.max(400, Math.floor((rect.width || 600) * ratio));
    var h = Math.max(120, Math.floor((rect.height || 160) * ratio));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(0, 0, w, h);

    var plot = {
      left: 68 * ratio,
      top: 12 * ratio,
      width: w - 82 * ratio,
      height: h - 44 * ratio,
    };
    chart._plot = plot;
    var view = chart.view;
    var dx = Math.max(1e-12, view.xMax - view.xMin);
    var dy = Math.max(1e-12, view.yMax - view.yMin);
    var xFor = function (f) { return plot.left + ((f - view.xMin) / dx) * plot.width; };
    var yFor = function (v) { return plot.top + (1 - (v - view.yMin) / dy) * plot.height; };

    if (!chart.points.length) { chart.hitboxes = []; return; }

    // Grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 0.7 * ratio;
    var yTicks = 5;
    for (var i = 0; i <= yTicks; i++) {
      var gy = plot.top + (i / yTicks) * plot.height;
      ctx.beginPath(); ctx.moveTo(plot.left, gy); ctx.lineTo(plot.left + plot.width, gy); ctx.stroke();
    }
    var xTicks = 6;
    for (var j = 0; j <= xTicks; j++) {
      var gx = plot.left + (j / xTicks) * plot.width;
      ctx.beginPath(); ctx.moveTo(gx, plot.top); ctx.lineTo(gx, plot.top + plot.height); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#aeb7c2";
    ctx.lineWidth = 1 * ratio;
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.top);
    ctx.lineTo(plot.left, plot.top + plot.height);
    ctx.lineTo(plot.left + plot.width, plot.top + plot.height);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#586375";
    ctx.font = Math.round(9.5 * ratio) + "px 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var k = 0; k <= yTicks; k++) {
      var vy = view.yMax - (k / yTicks) * (view.yMax - view.yMin);
      ctx.fillText(formatNumber(vy), plot.left - 5 * ratio, plot.top + (k / yTicks) * plot.height);
    }

    // X-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var m = 0; m <= xTicks; m++) {
      var vx = view.xMin + (m / xTicks) * (view.xMax - view.xMin);
      ctx.fillText(Math.round(vx), plot.left + (m / xTicks) * plot.width, plot.top + plot.height + 5 * ratio);
    }

    // Draw line
    var visible = chart.points.filter(function (pt) {
      var px = xFor(pt.frame);
      return px >= plot.left - 10 && px <= plot.left + plot.width + 10;
    });

    ctx.strokeStyle = "#2f6f73";
    ctx.lineWidth = 1.8 * ratio;
    ctx.beginPath();
    visible.forEach(function (pt) {
      var px = xFor(pt.frame), py = yFor(pt.value);
      if (pt === visible[0]) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw convergence threshold line (horizontal dashed)
    if (Number.isFinite(chart.convergenceLimit)) {
      var limY = yFor(chart.convergenceLimit);
      if (limY >= plot.top && limY <= plot.top + plot.height) {
        ctx.save();
        ctx.strokeStyle = "#cc2936";
        ctx.lineWidth = 2 * ratio;
        ctx.setLineDash([7 * ratio, 3.5 * ratio]);
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.moveTo(plot.left, limY);
        ctx.lineTo(plot.left + plot.width, limY);
        ctx.stroke();
        ctx.restore();

        // Label with numeric value on semi-transparent background
        var cwLimitLabel = "limit = " + formatNumber(chart.convergenceLimit);
        ctx.font = "bold " + Math.round(10 * ratio) + "px 'Segoe UI', sans-serif";
        var cwTw = ctx.measureText(cwLimitLabel).width + 12 * ratio;
        ctx.fillStyle = "rgba(204, 41, 54, 0.10)";
        var cwTx = plot.left + plot.width - cwTw - 4 * ratio;
        var cwTy = limY - 14 * ratio;
        ctx.fillRect(cwTx, cwTy, cwTw, 16 * ratio);
        ctx.fillStyle = "#cc2936";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(cwLimitLabel, cwTx + 5 * ratio, limY - 3 * ratio);
      }
    }

    // Build hitboxes around the actual data points; the connecting line has no hit target.
    chart.hitboxes = visible.map(function (pt) { return { frame: pt.frame, value: pt.value, x: xFor(pt.frame), y: yFor(pt.value), radius: 5.5 * ratio }; });

    // Draw every visible data point so each frame can be selected directly.
    var selStep = currentChartStep();
    visible.forEach(function (pt) {
      var px = xFor(pt.frame);
      if (px < plot.left - 8 || px > plot.left + plot.width + 8) return;
      var sel = pt.frame === selStep;
      var py = yFor(pt.value);
      ctx.fillStyle = sel ? "#ffffff" : "#2f6f73";
      ctx.strokeStyle = sel ? "#c9302c" : "#2f6f73";
      ctx.lineWidth = sel ? 2.3 * ratio : 1.2 * ratio;
      ctx.beginPath();
      ctx.arc(px, py, sel ? 5 * ratio : 2.4 * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Selection rectangle
    if (selectionRect) {
      ctx.strokeStyle = "rgba(166,0,0,0.55)";
      ctx.lineWidth = 1.2 * ratio;
      ctx.setLineDash([4 * ratio, 3 * ratio]);
      var rx = Math.min(selectionRect.x1, selectionRect.x2);
      var ry = Math.min(selectionRect.y1, selectionRect.y2);
      var rw = Math.abs(selectionRect.x2 - selectionRect.x1);
      var rh = Math.abs(selectionRect.y2 - selectionRect.y1);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    // Y-axis unit label
    ctx.fillStyle = "#8895a3";
    ctx.font = Math.round(8.5 * ratio) + "px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(chart.metric.unit, plot.left + 4 * ratio, plot.top - 1 * ratio);
  }

  function currentOptStep() {
    if (state.selectedOptStep !== null && state.selectedOptStep !== undefined) return state.selectedOptStep;
    var frame = activeFrame();
    return frame && frame.outStep !== null && frame.outStep !== undefined ? frame.outStep : null;
  }

  function currentChartStep() {
    if (state.chartModal && state.chartModal.type === "measure") {
      return activeFrame() ? state.frameIndex + 1 : null;
    }
    if (state.chartModal && state.chartModal.type === "scf") {
      if (state.chartModal.selectedFrame) return state.chartModal.selectedFrame;
      var chart = activeChartWindowChart();
      return chart && chart.points && chart.points.length ? chart.points[chart.points.length - 1].frame : null;
    }
    return currentOptStep();
  }

  function setupChartWindowResizeHandles() {
    ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach(function (direction) {
      const handle = document.createElement("div");
      handle.className = "chart-resize-handle chart-resize-" + direction;
      handle.dataset.resize = direction;
      handle.setAttribute("aria-hidden", "true");
      handle.addEventListener("pointerdown", handleChartWindowResizeStart);
      els.chartWindow.append(handle);
    });
  }

  function handleChartWindowResizeStart(event) {
    if (event.button !== 0) return;
    const direction = event.currentTarget.dataset.resize || "";
    const rect = els.chartWindow.getBoundingClientRect();
    els.chartWindow.style.left = rect.left + "px";
    els.chartWindow.style.top = rect.top + "px";
    els.chartWindow.style.width = rect.width + "px";
    els.chartWindow.style.height = rect.height + "px";
    els.chartWindow.style.transform = "none";
    state.chartResize = {
      direction: direction,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    window.addEventListener("pointermove", handleChartWindowResizeMove);
    window.addEventListener("pointerup", handleChartWindowResizeEnd);
    window.addEventListener("pointercancel", handleChartWindowResizeEnd);
  }

  function handleChartWindowResizeMove(event) {
    const resize = state.chartResize;
    if (!resize) return;
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    const minWidth = 500;
    const minHeight = 400;
    const margin = 12;
    const maxWidth = Math.max(minWidth, window.innerWidth - margin * 2);
    const maxHeight = Math.max(minHeight, window.innerHeight - margin * 2);
    var left = resize.left;
    var top = resize.top;
    var width = resize.width;
    var height = resize.height;

    if (resize.direction.includes("e")) width = resize.width + dx;
    if (resize.direction.includes("s")) height = resize.height + dy;
    if (resize.direction.includes("w")) {
      width = resize.width - dx;
      left = resize.left + dx;
    }
    if (resize.direction.includes("n")) {
      height = resize.height - dy;
      top = resize.top + dy;
    }

    if (width < minWidth) {
      if (resize.direction.includes("w")) left -= minWidth - width;
      width = minWidth;
    }
    if (height < minHeight) {
      if (resize.direction.includes("n")) top -= minHeight - height;
      height = minHeight;
    }
    if (width > maxWidth) {
      if (resize.direction.includes("w")) left -= maxWidth - width;
      width = maxWidth;
    }
    if (height > maxHeight) {
      if (resize.direction.includes("n")) top -= maxHeight - height;
      height = maxHeight;
    }

    left = clamp(left, margin - width + minWidth, window.innerWidth - margin - minWidth);
    top = clamp(top, margin - height + minHeight, window.innerHeight - margin - minHeight);
    if (left + width > window.innerWidth - margin) width = window.innerWidth - margin - left;
    if (top + height > window.innerHeight - margin) height = window.innerHeight - margin - top;
    width = Math.max(minWidth, width);
    height = Math.max(minHeight, height);

    els.chartWindow.style.left = left + "px";
    els.chartWindow.style.top = top + "px";
    els.chartWindow.style.width = width + "px";
    els.chartWindow.style.height = height + "px";
    drawChartWindow();
  }

  function handleChartWindowResizeEnd() {
    state.chartResize = null;
    window.removeEventListener("pointermove", handleChartWindowResizeMove);
    window.removeEventListener("pointerup", handleChartWindowResizeEnd);
    window.removeEventListener("pointercancel", handleChartWindowResizeEnd);
  }

  function handleChartWindowDragStart(event) {
    if (event.target.closest("button, .chart-resize-handle")) return;
    const rect = els.chartWindow.getBoundingClientRect();
    els.chartWindow.style.left = `${rect.left}px`;
    els.chartWindow.style.top = `${rect.top}px`;
    els.chartWindow.style.width = `${rect.width}px`;
    els.chartWindow.style.height = `${rect.height}px`;
    els.chartWindow.style.transform = "none";
    const start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    const move = (moveEvent) => {
      els.chartWindow.style.left = `${start.left + moveEvent.clientX - start.x}px`;
      els.chartWindow.style.top = `${start.top + moveEvent.clientY - start.y}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function exportCurrentFrameXyz() {
    const dataset = activeDataset();
    const frame = activeFrame();
    if (!dataset || !frame) return;
    const lines = [
      String(frame.atoms.length),
      frameCommentWithMetrics(frame),
      ...frame.atoms.map((atom) => `${atom.element} ${formatCoord(atom.x)} ${formatCoord(atom.y)} ${formatCoord(atom.z)}`),
    ];
    downloadText(`${stripExtension(dataset.name)}-frame-${state.frameIndex + 1}.xyz`, lines.join("\n"), "chemical/x-xyz");
  }

  function exportTrendCsv() {
    if (!state.trendSeries) return;
    const series = state.trendSeries;
    const header = `frame,${series.kind}_${series.label}_${series.unit}`;
    const rows = series.points.map((point) => `${point.frame},${point.value}`);
    downloadText(`${series.kind}-${series.label}.csv`, [header, ...rows].join("\n"), "text/csv;charset=utf-8");
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function trendKindLabel(kind) {
    if (kind === "distance") return "Distance";
    if (kind === "angle") return "Angle";
    return "Dihedral";
  }

  function measurementKindLabel(kind) {
    if (kind === "distance") return "键长";
    if (kind === "angle") return "键角";
    return "二面角";
  }

  function formatMeasurementValue(value, kind) {
    if (!Number.isFinite(value)) return "-";
    return kind === "distance" ? value.toFixed(4) : value.toFixed(2);
  }

  function renderMultiwfnCommand() {
    const dataset = activeDataset();
    if (!dataset || !dataset.frames.length) {
      els.multiwfnCommand.textContent = "等待选择结构文件";
      return;
    }

    const executable = els.multiwfnPath.value.trim() || "Multiwfn.exe";
    const fileName = dataset.name.replace(/"/g, '\\"');
    els.multiwfnCommand.textContent = `"${executable}" "${fileName}"\n# 复制上方命令到终端执行`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[char];
    });
  }

  function metaValue(analysis, key) {
    return analysis.metadata && analysis.metadata[key] ? analysis.metadata[key].value : "";
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 0.0001 || abs >= 100000)) return value.toExponential(6);
    return Number(value).toFixed(8).replace(/\.?0+$/, "");
  }

  function formatSliderNumber(value) {
    return Number(value).toFixed(1).replace(/\.0$/, "");
  }

  function renderAtomChip(text) {
    const item = document.createElement("span");
    item.className = "atom-chip";
    item.textContent = text;
    return item;
  }

  function atomSummary(atom) {
    const info = window.CP2KElements && window.CP2KElements.get(atom.element);
    const name = info ? ` ${info.nameZh}/${info.nameEn}` : "";
    const kind = atom.kind && atom.kind !== atom.element ? ` 类型 ${atom.kind}` : "";
    return `#${atom.index} ${atom.element}${name}${kind} (${formatCoord(atom.x)}, ${formatCoord(atom.y)}, ${formatCoord(atom.z)})`;
  }

  function atomStatusText(atom) {
    const info = window.CP2KElements && window.CP2KElements.get(atom.element);
    const label = info ? `${atom.element} ${info.nameZh}/${info.nameEn}` : atom.element;
    const type = atom.kind && atom.kind !== atom.element ? `，类型 ${atom.kind}` : "";
    return `选中 #${atom.index} ${label}${type}，坐标 ${formatCoord(atom.x)}, ${formatCoord(atom.y)}, ${formatCoord(atom.z)} Å`;
  }

  function compositionText(atoms) {
    const counts = atoms.reduce((total, atom) => {
      total[atom.element] = (total[atom.element] || 0) + 1;
      return total;
    }, {});
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([element, count]) => `${element}${count}`)
      .join(" ");
  }

  function formatCoord(value) {
    return Number(value).toFixed(4);
  }

  function frameCommentWithMetrics(frame) {
    var parts = ["frame=" + (state.frameIndex + 1)];
    if (frame.outStep !== null && frame.outStep !== undefined) parts.push("opt_step=" + frame.outStep);
    if (frame.optMetrics) {
      parts.push("energy=" + formatNumber(frame.optMetrics.energy));
      Object.entries(frame.optMetrics.metrics).forEach(function (entry) {
        var key = entry[0], metric = entry[1];
        if (!Number.isFinite(metric.value)) return;
        parts.push(key + "=" + formatNumber(metric.value));
        if (Number.isFinite(metric.limit)) parts.push(key + "_limit=" + formatNumber(metric.limit));
        if (metric.converged) parts.push(key + "_converged=" + metric.converged);
      });
    } else if (Number.isFinite(frame.energy)) {
      parts.push("energy=" + formatNumber(frame.energy));
    }
    return parts.join(" ");
  }

  function stripExtension(name) {
    return String(name).replace(/\.[^.]+$/, "");
  }

  function hasFiles(event) {
    return Array.from(event.dataTransfer && event.dataTransfer.types ? event.dataTransfer.types : []).includes("Files");
  }

  render();
})();
