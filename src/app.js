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
    inpCompareLeftId: null,
    inpCompareRightId: null,
    structureStatsKey: "",
    fileListKey: null,
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
  const workspaceLayout = window.CP2KWorkspaceLayout.create({
    workspace: els.workspace,
    splitters: els.layoutSplitters,
    resetButton: els.resetLayoutBtn,
    onLayoutChange: refreshWorkspaceAfterLayoutChange,
  });
  const {
    clamp,
    downloadText,
    formatCoord,
    formatNumber,
    renderAtomChip,
    stripExtension,
  } = window.CP2KUtils;
  const i18n = window.CP2KI18n || {};
  const outAnalysisData = window.CP2KOutAnalysisData.create({
    i18n: i18n,
    utils: window.CP2KUtils,
  });
  const outLocator = window.CP2KOutLocator.create({
    i18n: i18n,
    utils: window.CP2KUtils,
  });
  const outAnalysisPanel = window.CP2KOutAnalysisPanel.create({
    els: {
      analysisView: els.analysisView,
    },
    i18n: i18n,
    utils: window.CP2KUtils,
    outAnalysisData: outAnalysisData,
    outLocator: outLocator,
    callbacks: {
      activeAnalysisDataset: activeAnalysisDataset,
      activeDataset: activeDataset,
      activeFrame: activeFrame,
      currentOptStep: currentOptStep,
      drawOptimizationCharts: drawOptimizationCharts,
      openScfConvergenceWindow: openScfConvergenceWindow,
      renderOptimizationChartsSection: renderOptimizationChartsSection,
    },
  });
  const chartDataTools = window.CP2KChartData.create({
    i18n: i18n,
  });
  const chartDrawingTools = window.CP2KChartDrawing.create({
    chartDataTools: chartDataTools,
    utils: window.CP2KUtils,
  });
  const optimizationChartPanel = window.CP2KOptimizationChartPanel.create({
    callbacks: {
      bindCanvasEvents: bindOptimizationChartCanvasEvents,
      drawChartsIfVisible: drawOptimizationChartsIfVisible,
      openChartWindow: openOptimizationChartWindow,
    },
    i18n: i18n,
  });
  const chartWindowFrame = window.CP2KChartWindowFrame.create({
    state: state,
    els: {
      chartWindow: els.chartWindow,
    },
    i18n: i18n,
    utils: window.CP2KUtils,
    callbacks: {
      drawChartWindow: drawChartWindow,
    },
  });
  const chartWindowContent = window.CP2KChartWindowContent.create({
    els: {
      chartMinBtn: els.chartMinBtn,
      chartResetBtn: els.chartResetBtn,
      chartWindowBody: els.chartWindowBody,
    },
    callbacks: {
      bindCanvasEvents: bindChartWindowCanvasEvents,
    },
  });
  const structureInfo = window.CP2KStructureInfo.create({
    state: state,
    els: {
      structureStats: els.structureStats,
      viewerHud: els.viewerHud,
    },
    utils: window.CP2KUtils,
    callbacks: {
      activeDataset: activeDataset,
      activeFrame: activeFrame,
    },
    i18n: i18n,
  });
  const fileManager = window.CP2KFiles.create({
    state: state,
    els: {
      fileCount: els.fileCount,
      fileList: els.fileList,
      viewerHud: els.viewerHud,
    },
    utils: window.CP2KUtils,
    parseFile: window.CP2KParsers.parseFile,
    i18n: i18n,
    callbacks: {
      forgetSavedMeasurementsForDataset: forgetSavedMeasurementsForDataset,
      linkSingleOutToStructure: linkSingleOutToStructure,
      render: render,
      resetFrameViewState: resetFrameViewState,
      setActive: setActive,
    },
  });
  const measurementTools = window.CP2KMeasurement.create({
    state: state,
    els: {
      exportFrameBtn: els.exportFrameBtn,
      exportTrendBtn: els.exportTrendBtn,
      trendCanvas: els.trendCanvas,
      trendPanel: els.trendPanel,
      trendSummary: els.trendSummary,
    },
    i18n: i18n,
    utils: window.CP2KUtils,
    callbacks: {
      activeDataset: activeDataset,
      activeFrame: activeFrame,
      atomSummary: atomSummary,
      chartProjectors: chartProjectors,
      drawChartPolyline: drawChartPolyline,
      openChartWindow: openChartWindow,
      pointBounds: pointBounds,
      pointLookup: pointLookup,
    },
  });
  const savedMeasurementTools = window.CP2KSavedMeasurements.create({
    state: state,
    els: {
      saveMeasureBtn: els.saveMeasureBtn,
      savedMeasureList: els.savedMeasureList,
    },
    callbacks: {
      activeDataset: activeDataset,
      activeFrame: activeFrame,
      formatMeasurementValue: formatMeasurementValue,
      measurementFrameLabel: measurementFrameLabel,
      measurementKindLabel: measurementKindLabel,
    },
    i18n: i18n,
  });
  const frameControls = window.CP2KFrameControls.create({
    state: state,
    els: {
      atomLabelsToggle: els.atomLabelsToggle,
      atomSizeSlider: els.atomSizeSlider,
      atomSizeValue: els.atomSizeValue,
      exportFrameBtn: els.exportFrameBtn,
      frameLabel: els.frameLabel,
      frameSlider: els.frameSlider,
      nextFrameBtn: els.nextFrameBtn,
      playBtn: els.playBtn,
      prevFrameBtn: els.prevFrameBtn,
      speedSlider: els.speedSlider,
      speedValue: els.speedValue,
    },
    viewer: viewer,
    utils: window.CP2KUtils,
    callbacks: {
      activeDataset: activeDataset,
      activeFrame: activeFrame,
      renderFrameOnly: renderFrameOnly,
    },
  });
  const inspectorPanels = window.CP2KInspectorPanels.create({
    state: state,
    els: {
      inspectorPages: els.inspectorPages,
      inspectorTabs: els.inspectorTabs,
      panelPopouts: els.panelPopouts,
    },
    callbacks: {
      drawOptimizationChartsIfVisible: drawOptimizationChartsIfVisible,
      drawTrendCanvasIfVisible: drawTrendCanvasIfVisible,
    },
    i18n: i18n,
  });
  const outLinker = window.CP2KOutLinker.create({
    state: state,
    callbacks: {
      energyBreakdownRows: outAnalysisData.energyBreakdownRows,
    },
  });

  const inputPanel = window.CP2KInputPanel.create({
    state: state,
    els: {
      chartWindow: els.chartWindow,
      chartWindowBody: els.chartWindowBody,
      chartWindowInfo: els.chartWindowInfo,
      chartMinBtn: els.chartMinBtn,
      chartResetBtn: els.chartResetBtn,
      chartWindowTitle: els.chartWindowTitle,
      inputTree: els.inputTree,
    },
    utils: window.CP2KUtils,
    parseFile: window.CP2KParsers.parseFile,
    i18n: i18n,
    callbacks: {
      activeDataset: activeDataset,
      activateInspectorPage: activateInspectorPage,
      linkSingleOutToStructure: linkSingleOutToStructure,
      render: render,
    },
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
  workspaceLayout.init();
  inspectorPanels.init();
  els.multiwfnCommandBtn.addEventListener("click", renderMultiwfnCommand);

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
    workspaceLayout.fitToViewport();
    drawTrendCanvasIfVisible();
    drawOptimizationChartsIfVisible();
  });
  window.addEventListener("cp2k-language-change", handleLanguageChange);
  new ResizeObserver(() => drawChartWindow()).observe(els.chartWindow);

  function handleLanguageChange() {
    state.structureStatsKey = "";
    state.fileListKey = null;
    if (inspectorPanels.refreshLanguage) inspectorPanels.refreshLanguage();
    render();
    refreshInputCompareWindow();
    if (inputPanel.refreshInputSnippetDialogLanguage) inputPanel.refreshInputSnippetDialogLanguage();
    refreshChartWindowLanguage();
    renderSelection(viewer.selected ? viewer.selected.slice() : []);
  }

  function refreshChartWindowLanguage() {
    if (!state.chartModal || els.chartWindow.hidden || state.chartModal.type === "inpCompare") return;
    if (state.chartModal.type === "scf") refreshScfChartWindowForCurrentFrame(true);
    updateChartWindowTitle();
    refreshChartWindowLabels();
    drawChartWindow();
  }

  function refreshWorkspaceAfterLayoutChange() {
    if (viewer && typeof viewer.resize === "function") viewer.resize();
    drawTrendCanvasIfVisible();
    drawOptimizationChartsIfVisible();
    drawChartWindow();
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    await importFiles(files);
    event.target.value = "";
  }

  async function importFiles(files) {
    await fileManager.importFiles(files);
  }

  function clearProject() {
    stopPlay();
    resetProjectState();
    closeExpandedPanel();
    render();
  }

  function preferredStructureDataset() {
    return fileManager.preferredStructureDataset();
  }

  function resetProjectState() {
    state.datasets = [];
    state.activeId = null;
    state.savedMeasurements = [];
    resetFrameViewState();
    resetSelectionDraftState();
    resetAnalysisStepSelection();
    resetInputCompareSelection();
  }

  function resetFrameViewState() {
    state.frameIndex = 0;
    state.fittedDatasetId = null;
  }

  function resetSelectionDraftState() {
    state.selectionKey = "";
    state.currentMeasurement = null;
    resetTrendState();
  }

  function resetTrendState() {
    state.currentTrendSeries = null;
    state.trendSeries = null;
    state.trendHitboxes = [];
  }

  function resetAnalysisStepSelection() {
    state.selectedOptStep = null;
  }

  function resetInputCompareSelection() {
    state.inpCompareLeftId = null;
    state.inpCompareRightId = null;
  }

  function datasetById(id) {
    if (!id) return null;
    return state.datasets.find((dataset) => dataset.id === id) || null;
  }

  function activeDataset() {
    return datasetById(state.activeId);
  }

  function activeFrame() {
    const dataset = activeDataset();
    if (!dataset || !dataset.frames.length) return null;
    return dataset.frames[state.frameIndex] || dataset.frames[0];
  }

  // 鈹€鈹€ Structure-OUT linking 鈹€鈹€

  function linkSingleOutToStructure() {
    outLinker.linkSingleOutToStructure();
  }

  function setActive(id) {
    stopPlay();
    state.activeId = id;
    resetFrameViewState();
    resetSelectionDraftState();
    resetAnalysisStepSelection();
    const dataset = activeDataset();
    if (dataset && dataset.tree) state.inpCompareLeftId = id;
    render();
  }

  function setFrame(index, options) {
    frameControls.setFrame(index, options);
  }

  function syncSelectedOptStepFromActiveFrame() {
    frameControls.syncSelectedOptStepFromActiveFrame();
  }

  function togglePlay() {
    frameControls.togglePlay();
  }

  function stopPlay() {
    frameControls.stopPlay();
  }

  function updatePlaybackSpeed() {
    frameControls.updatePlaybackSpeed();
  }

  function updateAtomSize() {
    frameControls.updateAtomSize();
  }

  function updateAtomLabels() {
    frameControls.updateAtomLabels();
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
    const context = frameRenderContext();
    renderViewerFrame(context);
    renderFramePanels(context);
    refreshFrameAnalysis(context.dataset, settings);
    refreshFrameCharts(settings);
  }

  function frameRenderContext() {
    const dataset = activeDataset();
    const frame = activeFrame();
    return {
      dataset: dataset,
      frame: frame,
      shouldFit: Boolean(dataset && dataset.id !== state.fittedDatasetId),
    };
  }

  function renderViewerFrame(context) {
    const dataset = context.dataset;
    viewer.setFrame(context.frame, {
      fit: context.shouldFit,
      referenceAtoms: dataset && dataset.frames[0] ? dataset.frames[0].atoms : null,
      preserveSelection: !context.shouldFit,
    });
    if (context.shouldFit) state.fittedDatasetId = dataset.id;
  }

  function renderFramePanels(context) {
    renderStats(context.dataset, context.frame);
    renderFrameControls(context.dataset, context.frame);
    renderHud(context.dataset, context.frame);
  }

  function refreshFrameAnalysis(dataset, settings) {
    if (!settings.skipAnalysis && dataset && dataset.linkedOutId) {
      if (state.playing) {
        refreshLinkedAnalysisSections();
      } else {
        renderAnalysis({ preserveScroll: true });
      }
    }
  }

  function refreshFrameCharts(settings) {
    if (settings.deferChartRedraw || state.playing) {
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

  function refreshLinkedAnalysisSections() {
    outAnalysisPanel.refreshLinkedAnalysisSections();
  }

  function renderFileList() {
    fileManager.renderFileList();
  }

  function removeDataset(id) {
    fileManager.removeDataset(id);
  }

  function renderStats(dataset, frame) {
    structureInfo.renderStats(dataset, frame);
  }

  function renderFrameControls(dataset, frame) {
    frameControls.renderFrameControls(dataset, frame);
  }

  function renderHud(dataset, frame) {
    structureInfo.renderHud(dataset, frame);
  }

  function renderSelection(selected) {
    const selectionChanged = updateSelectionKey(selected);
    if (!selected.length) {
      clearSelectionPanel();
      return;
    }

    if (selectionChanged) {
      activateInspectorPage("measurePanel");
    }

    renderSelectedAtoms(selected);
    updateCurrentMeasurement(selected);
  }

  function updateSelectionKey(selected) {
    const nextSelectionKey = selected.map((atom) => atom.index).join("-");
    const selectionChanged = nextSelectionKey !== state.selectionKey;
    state.selectionKey = nextSelectionKey;
    return selectionChanged;
  }

  function clearSelectionPanel() {
    els.selectionList.textContent = uiText("measure.selectionEmpty", "未选择原子");
    els.measureResult.textContent = "-";
    els.atomStatus.textContent = uiText("atom.status", "点击原子查看元素、类型和坐标");
    state.currentMeasurement = null;
    updateSaveMeasureButton();
    state.currentTrendSeries = null;
    renderTrend(null);
  }

  function renderSelectedAtoms(selected) {
    const details = selected.map(atomSummary);
    els.selectionList.replaceChildren(...details.map(renderAtomChip));
    els.atomStatus.textContent = atomStatusText(selected[selected.length - 1]);
  }

  function updateCurrentMeasurement(selected) {
    const result = measurementFromSelection(selected);
    els.measureResult.textContent = result ? result.text : atomSummary(selected[0]);
    const measurement = result && result.kind !== "atom" ? result : null;
    state.currentMeasurement = measurement;
    updateSaveMeasureButton();
    state.currentTrendSeries = measurement ? buildTrendSeries(selected, measurement.kind) : null;
    renderTrend(state.currentTrendSeries);
  }

  function updateSaveMeasureButton() {
    savedMeasurementTools.updateSaveMeasureButton();
  }

  function saveCurrentMeasurement() {
    savedMeasurementTools.saveCurrentMeasurement();
  }

  function handleSavedMeasurementClick(event) {
    savedMeasurementTools.handleSavedMeasurementClick(event);
  }

  function renderSavedMeasurements() {
    savedMeasurementTools.renderSavedMeasurements();
  }

  function forgetSavedMeasurementsForDataset(datasetId) {
    savedMeasurementTools.forgetSavedMeasurementsForDataset(datasetId);
  }

  function measurementFrameLabel(dataset, frame, frameIndex) {
    const total = dataset && dataset.frames ? dataset.frames.length : 0;
    const prefix = dataset && dataset.type === "out" ? uiText("measurement.outFrame", "OUT 帧") : uiText("measurement.frame", "帧");
    const parts = [`${prefix} ${frameIndex + 1}/${Math.max(1, total)}`];
    if (dataset && dataset.type !== "out" && dataset.linkedOutName) parts.push(uiText("measurement.linkedOut", "关联 OUT {name}", { name: dataset.linkedOutName }));
    if (frame && frame.outStep !== null && frame.outStep !== undefined) parts.push(`OPT step ${frame.outStep}`);
    if (frame && frame.outEnergyBlock !== null && frame.outEnergyBlock !== undefined) parts.push(uiText("measurement.outEnergyBlock", "OUT 能量块 {block}", { block: frame.outEnergyBlock }));
    return parts.join(" | ");
  }

  function activateInspectorPage(panelId) {
    inspectorPanels.activateInspectorPage(panelId);
  }

  function toggleExpandedPanel(panelId) {
    inspectorPanels.toggleExpandedPanel(panelId);
  }

  function closeExpandedPanel() {
    inspectorPanels.closeExpandedPanel();
  }

  function renderInputTree() {
    inputPanel.renderInputTree();
  }

  function closeInputSnippetDialog() {
    inputPanel.closeInputSnippetDialog();
  }

  function refreshInputCompareWindow() {
    inputPanel.refreshInputCompareWindow();
  }

  function activeAnalysisDataset() {
    const dataset = activeDataset();
    if (!dataset) return null;
    if (dataset.analysis) return dataset;
    // If viewing a structure linked to an OUT, use the OUT's analysis
    if (dataset.linkedOutId) return datasetById(dataset.linkedOutId);
    return null;
  }

  function renderAnalysis(options) {
    outAnalysisPanel.renderAnalysis(options);
  }

  function renderOptimizationChartsSection(analysis) {
    return optimizationChartPanel.renderSection(analysis);
  }

  function bindOptimizationChartCanvasEvents(canvas) {
    canvas.addEventListener("pointerdown", handleOptChartPointerDown);
    canvas.addEventListener("pointermove", handleOptChartPointerMove);
    canvas.addEventListener("pointerup", handleOptChartPointerUp);
    canvas.addEventListener("pointercancel", handleOptChartPointerCancel);
    canvas.addEventListener("dblclick", () => resetOptChartCanvas(canvas));
  }

  function drawOptimizationCharts(section, analysis) {
    if (!section || !section.isConnected) return;
    const chartData = optimizationChartData(analysis);
    section.querySelectorAll("canvas[data-metric]").forEach((canvas) => {
      const metricKey = canvas.dataset.metric;
      const entry = chartData.byMetric[metricKey];
      if (!entry) return;
      configureOptChartCanvas(canvas, entry);
    });
    updateOptChartStatus(section);
  }

  function optimizationChartData(analysis) {
    return chartDataTools.optimizationChartData(analysis, optimizationMetricDefs());
  }

  function optimizationMetricDefs() {
    return optimizationChartPanel.metricDefs();
  }

  function configureOptChartCanvas(canvas, chartEntry) {
    const existing = canvas._optChart;
    canvas._optChart = chartDataTools.optimizationChartState(chartEntry, existing);
    drawOptChartCanvas(canvas);
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
    const projector = chartProjectors(plot, chart.view);
    const xFor = projector.xFor;
    const yFor = projector.yFor;

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
    const visible = visibleChartPoints(chart.points, xFor, plot, 8);

    // Draw trend line
    drawChartPolyline(ctx, visible, xFor, yFor, { strokeStyle: "#2f6f73", lineWidth: 1.7 * ratio });

    // Draw convergence threshold line (horizontal dashed)
    drawConvergenceLimit(ctx, chart, plot, yFor, ratio, {
      labelPrefix: "limit ",
      lineWidth: 1.8,
      dash: [6, 3],
      fontSize: 9,
      textPad: 10,
      rightInset: 2,
      labelYOffset: 12,
      labelHeight: 14,
      textLeftPad: 4,
      textBottomOffset: 2,
      background: "rgba(204, 41, 54, 0.12)",
    });

    // Build hitboxes around the actual data points; the connecting line has no hit target.
    updateChartHitboxes(chart, visible, xFor, yFor, 4.5 * ratio);

    // Draw every visible data point so the selectable targets match what is on screen.
    drawChartPoints(ctx, visible, xFor, yFor, currentOptStep(), plot, ratio, {
      pointCullMargin: 6 * ratio,
      selectedRadius: 4,
      normalRadius: 1.9,
      selectedLineWidth: 2,
      normalLineWidth: 1,
    });

    // Draw selection rectangle
    drawChartSelectionRect(ctx, selectionRect, ratio, {
      strokeStyle: "rgba(166, 0, 0, 0.65)",
      lineWidth: 1.4,
      dash: [5, 3],
    });
  }

  function chartProjectors(plot, view) {
    return chartDataTools.chartProjectors(plot, view);
  }

  function visibleChartPoints(points, xFor, plot, margin) {
    return chartDataTools.visibleChartPoints(points, xFor, plot, margin);
  }

  function drawChartPolyline(ctx, points, xFor, yFor, settings) {
    chartDrawingTools.drawChartPolyline(ctx, points, xFor, yFor, settings);
  }

  function drawConvergenceLimit(ctx, chart, plot, yFor, ratio, settings) {
    chartDrawingTools.drawConvergenceLimit(ctx, chart, plot, yFor, ratio, settings);
  }

  function updateChartHitboxes(chart, points, xFor, yFor, radius) {
    chartDrawingTools.updateChartHitboxes(chart, points, xFor, yFor, radius);
  }

  function drawChartPoints(ctx, points, xFor, yFor, selectedStep, plot, ratio, settings) {
    chartDrawingTools.drawChartPoints(ctx, points, xFor, yFor, selectedStep, plot, ratio, settings);
  }

  function drawChartSelectionRect(ctx, selectionRect, ratio, settings) {
    chartDrawingTools.drawChartSelectionRect(ctx, selectionRect, ratio, settings);
  }

  function openOptimizationChartWindow(canvas) {
    canvas = canvas || firstOptimizationChartCanvas();
    const chart = canvas && canvas._optChart;
    if (!chart || !chart.points.length) return;
    setActiveOptChart(canvas);

    openChartModal({
      title: uiText("chart.optimizationTitle", "优化图表"),
      titleKey: "chart.optimizationTitle",
      titleFallback: "优化图表",
      type: "opt",
      charts: optimizationChartsForWindow(canvas),
      activeKey: chart.metric.key,
    });
  }

  function firstOptimizationChartCanvas() {
    return document.querySelector("canvas[data-metric]");
  }

  function optimizationChartsForWindow(canvas) {
    return optimizationChartCanvasesForWindow(canvas).map(function (item) {
      return chartDataTools.chartWindowChartFromSource(item._optChart);
    });
  }

  function optimizationChartCanvasesForWindow(canvas) {
    const section = canvas.closest(".opt-chart-section");
    if (!section) return [canvas];
    return Array.from(section.querySelectorAll("canvas[data-metric]")).filter(function (item) {
      return item._optChart && item._optChart.points.length;
    });
  }

  function buildChartWindowBody() {
    chartWindowContent.buildBody(state.chartModal && state.chartModal.charts);
  }

  function bindChartWindowCanvasEvents(canvas) {
    canvas.addEventListener("pointerdown", handleCWPointerDown);
    canvas.addEventListener("pointermove", handleCWPointerMove);
    canvas.addEventListener("pointerup", handleCWPointerUp);
    canvas.addEventListener("pointercancel", handleCWPointerCancel);
    canvas.addEventListener("dblclick", handleCWDoubleClick);
  }

  function closeChartWindow() {
    els.chartWindow.hidden = true;
    state.chartModal = null;
    chartWindowContent.clearBody();
    setChartWindowToolsVisible(true);
  }

  function setChartWindowToolsVisible(visible) {
    chartWindowContent.setToolsVisible(visible);
  }

  function resetChartWindowView() {
    if (!state.chartModal || !state.chartModal.charts) return;
    state.chartModal.charts.forEach(resetChartWindowChartView);
    drawChartWindow();
  }

  function resetChartWindowChartView(chart) {
    chart.view = { ...chart.full };
    chart.drag = null;
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
      status.textContent = uiText("optimization.noStep", "No optimization step data");
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
      const point = chart.pointByFrame ? chart.pointByFrame.get(step) : chart.points.find((item) => item.frame === step);
      if (point) result[chart.metric.key] = formatNumber(point.value);
      return result;
    }, {});
  }

  function optLastStep(canvases) {
    var last = null;
    canvases.forEach(function (canvas) {
      if (!canvas._optChart || canvas._optChart.lastFrame === null) return;
      last = last === null ? canvas._optChart.lastFrame : Math.max(last, canvas._optChart.lastFrame);
    });
    return last;
  }

  function minChartPoint(points) {
    return chartDataTools.minChartPoint(points);
  }

  function ensureChartPointVisible(chart, point) {
    chartDataTools.ensureChartPointVisible(chart, point);
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

  function scfConvergencePoints(block) {
    return outAnalysisData.scfConvergencePoints(block);
  }

  function openScfConvergenceWindow(block) {
    var config = scfChartWindowConfig(block);
    if (!config) return;
    openChartWindow(config);
  }

  function scfChartWindowConfig(block) {
    const points = scfConvergencePoints(block);
    if (!points.length) return null;
    return {
      points: points,
      title: uiText("analysis.scfChart", "SCF 收敛图"),
      titleKey: "analysis.scfChart",
      titleFallback: "SCF 收敛图",
      unit: "Convergence",
      valueLabel: "Convergence",
      key: "scfConvergence",
      type: "scf",
      selectedFrame: points[points.length - 1].frame,
      sourceScfBlock: block,
    };
  }

  function measurementFromSelection(selected) {
    return measurementTools.measurementFromSelection(selected);
  }

  function buildTrendSeries(selected, kind) {
    return measurementTools.buildTrendSeries(selected, kind);
  }

  function renderTrend(series) {
    measurementTools.renderTrend(series);
  }

  function drawTrendCanvasIfVisible() {
    measurementTools.drawTrendCanvasIfVisible();
  }

  function handleTrendClick(event) {
    measurementTools.handleTrendClick(event);
  }

  function openChartWindow(config) {
    if (!config || !config.points || !config.points.length) return;
    openChartModal({
      title: config.title || uiText("chart.trendTitle", "趋势图"),
      type: config.type || "measure",
      charts: [chartDataTools.chartWindowChartFromConfig(config)],
      activeKey: config.key || "measure",
      selectedFrame: config.selectedFrame || null,
      sourceScfBlock: config.sourceScfBlock || null,
      titleKey: config.titleKey || "",
      titleFallback: config.titleFallback || "",
    });
  }

  function openChartModal(config) {
    state.chartModal = {
      type: config.type,
      charts: config.charts,
      activeKey: config.activeKey,
      selectedFrame: config.selectedFrame || null,
      sourceScfBlock: config.sourceScfBlock || null,
      title: config.title || "",
      titleKey: config.titleKey || "",
      titleFallback: config.titleFallback || "",
    };
    setChartWindowToolsVisible(true);
    updateChartWindowTitle();
    buildChartWindowBody();
    els.chartWindow.hidden = false;
    drawChartWindow();
  }

  function updateChartWindowTitle() {
    if (!state.chartModal) return;
    els.chartWindowTitle.textContent = state.chartModal.titleKey
      ? uiText(state.chartModal.titleKey, state.chartModal.titleFallback || state.chartModal.title)
      : state.chartModal.title;
  }

  function refreshChartWindowLabels() {
    if (!state.chartModal || !state.chartModal.charts) return;
    state.chartModal.charts.forEach(function (chart) {
      if (!chart.wrapper || !chart.metric) return;
      var label = chart.wrapper.querySelector(".cw-chart-label span");
      if (label) label.textContent = chart.metric.title;
    });
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
    setActiveChartWindowChart(chart);
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
    setActiveChartWindowChart(chart);

    if (state.chartModal.type === "measure") {
      updateChartWindowInfo(point, chart);
      scheduleChartLinkedFrameUpdate(() => selectMeasuredFrameFromChart(point));
      return;
    }

    if (state.chartModal.type === "scf") {
      selectScfFrameFromChart(point, chart);
      return;
    }

    selectOptimizationFrameFromChart(point, chart);
  }

  function setActiveChartWindowChart(chart) {
    if (!state.chartModal || !chart) return;
    state.chartModal.activeKey = chart.metric.key;
    document.querySelectorAll(".cw-canvas.focus").forEach(function (canvas) { canvas.classList.remove("focus"); });
    if (chart.canvas) chart.canvas.classList.add("focus");
  }

  function selectMeasuredFrameFromChart(point) {
    setFrame(point.frame - 1, { deferChartRedraw: true });
    activateInspectorPage("measurePanel");
  }

  function selectScfFrameFromChart(point, chart) {
    state.chartModal.selectedFrame = point.frame;
    updateChartWindowInfo(point, chart);
    drawChartWindow();
  }

  function selectOptimizationFrameFromChart(point, chart) {
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
    var currentIndex = chartIndexForFrame(chart, step);
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
      var sameStep = chartPointForFrame(item, point.frame);
      if (sameStep) ensureChartPointVisible(item, sameStep);
    });
    setActiveChartWindowChart(chart);
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
      els.chartWindowInfo.textContent = uiText("chart.noData", "没有数据");
      return;
    }
    els.chartWindowInfo.textContent = chartWindowInfoParts(step).join("  \u2502  ");
  }

  function chartWindowInfoParts(step) {
    var parts = [state.chartModal.type === "scf" ? "SCF iteration " + step : "Step " + step];
    state.chartModal.charts.forEach(function (chart) {
      appendChartWindowPointInfo(parts, chart, step);
    });
    return parts;
  }

  function appendChartWindowPointInfo(parts, chart, step) {
    var point = chartPointForFrame(chart, step);
    if (!point) return;
    parts.push(chart.metric.title + " = " + formatNumber(point.value) + " " + chart.metric.unit);
    if (state.chartModal.type === "scf") {
      if (point.totalEnergy) parts.push("Total energy = " + point.totalEnergy);
      if (point.change) parts.push("Change = " + point.change);
    }
  }

  function chartPointForFrame(chart, frame) {
    return chartDataTools.chartPointForFrame(chart, frame);
  }

  function chartIndexForFrame(chart, frame) {
    return chartDataTools.chartIndexForFrame(chart, frame);
  }

  function pointLookup(points) {
    return chartDataTools.pointLookup(points);
  }

  function pointBounds(points, yPadMinimum) {
    return chartDataTools.pointBounds(points, yPadMinimum);
  }

  function drawChartWindow() {
    if (!state.chartModal || els.chartWindow.hidden) return;
    refreshScfChartWindowForCurrentFrame(false);
    (state.chartModal.charts || []).forEach(function (chart) {
      if (chart.canvas && chart.canvas.isConnected) {
        drawCWChart(chart.canvas, chart);
      }
    });
  }

  function refreshScfChartWindowForCurrentFrame(force) {
    if (!state.chartModal || state.chartModal.type !== "scf") return;
    var block = currentScfBlockForActiveFrame();
    if (!block || (!force && block === state.chartModal.sourceScfBlock)) return;
    var config = scfChartWindowConfig(block);
    if (!config) return;
    var nextChart = chartDataTools.chartWindowChartFromConfig(config);
    var currentChart = state.chartModal.charts && state.chartModal.charts[0];
    if (currentChart) {
      chartDataTools.replaceChartWindowChartData(currentChart, nextChart);
    } else {
      state.chartModal.charts = [nextChart];
      buildChartWindowBody();
      currentChart = nextChart;
    }
    state.chartModal.sourceScfBlock = block;
    state.chartModal.selectedFrame = config.selectedFrame || null;
    state.chartModal.title = config.title || "";
    state.chartModal.titleKey = config.titleKey || "";
    state.chartModal.titleFallback = config.titleFallback || "";
    updateChartWindowTitle();
    refreshChartWindowLabels();
    updateChartWindowInfo(null, currentChart);
  }

  function currentScfBlockForActiveFrame() {
    var outputDataset = activeAnalysisDataset();
    if (!outputDataset || !outputDataset.analysis) return null;
    return outAnalysisData.currentScfBlock(outputDataset.analysis, {
      active: activeDataset(),
      frame: activeFrame(),
      stepNumber: currentOptStep(),
    });
  }

  function drawCWChart(canvas, chart, selectionRect) {
    chartDrawingTools.drawChartWindowCanvas(canvas, chart, {
      currentStep: currentChartStep(),
      selectionRect: selectionRect,
    });
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
      return chart ? chart.lastFrame : null;
    }
    return currentOptStep();
  }

  function setupChartWindowResizeHandles() {
    chartWindowFrame.setupResizeHandles();
  }

  function handleChartWindowDragStart(event) {
    chartWindowFrame.handleDragStart(event);
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
    measurementTools.exportTrendCsv();
  }

  function measurementKindLabel(kind) {
    return measurementTools.measurementKindLabel(kind);
  }

  function formatMeasurementValue(value, kind) {
    return measurementTools.formatMeasurementValue(value, kind);
  }

  function renderMultiwfnCommand() {
    const dataset = activeDataset();
    if (!dataset || !dataset.frames.length) {
      els.multiwfnCommand.textContent = uiText("multiwfn.waiting", "等待选择结构文件");
      return;
    }

    const executable = els.multiwfnPath.value.trim() || "Multiwfn.exe";
    const fileName = dataset.name.replace(/"/g, '\\"');
    els.multiwfnCommand.textContent = `"${executable}" "${fileName}"\n# ${uiText("multiwfn.commandComment", "复制上方命令到终端执行")}`;
  }

  function atomSummary(atom) {
    return structureInfo.atomSummary(atom);
  }

  function atomStatusText(atom) {
    return structureInfo.atomStatusText(atom);
  }

  function frameCommentWithMetrics(frame) {
    return structureInfo.frameCommentWithMetrics(frame);
  }

  function hasFiles(event) {
    return Array.from(event.dataTransfer && event.dataTransfer.types ? event.dataTransfer.types : []).includes("Files");
  }

  function uiText(key, fallback, values) {
    return i18n.text ? i18n.text(key, fallback, values) : fallback;
  }

  render();
})();
