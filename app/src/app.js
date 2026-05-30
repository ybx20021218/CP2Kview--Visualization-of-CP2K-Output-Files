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
  };

  const els = {
    fileInput: document.getElementById("fileInput"),
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
  els.trendCanvas.addEventListener("click", handleTrendClick);
  els.exportFrameBtn.addEventListener("click", exportCurrentFrameXyz);
  els.exportTrendBtn.addEventListener("click", exportTrendCsv);
  els.chartMinBtn.addEventListener("click", selectChartWindowMinimum);
  els.chartResetBtn.addEventListener("click", resetChartWindowView);
  els.chartCloseBtn.addEventListener("click", closeChartWindow);
  els.chartWindowHead.addEventListener("pointerdown", handleChartWindowDragStart);
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
    drawTrendCanvasIfVisible();
    drawOptimizationChartsIfVisible();
  });
  new ResizeObserver(() => drawChartWindow()).observe(els.chartWindow);

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
      const isStructure = parsed.frames.length > 0;
      const isOut = parsed.analysis;
      for (let i = state.datasets.length - 1; i >= 0; i--) {
        const existing = state.datasets[i];
        if (isStructure && existing.frames.length && existing.type !== "out") {
          state.datasets.splice(i, 1);
          break;
        }
        if (isOut && existing.analysis) {
          state.datasets.splice(i, 1);
          break;
        }
      }
      state.datasets.push(parsed);
    }

    // Find the structure to show, otherwise the out
    const structure = state.datasets.find((d) => d.frames.length);
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
    state.currentTrendSeries = null;
    state.trendSeries = null;
    state.trendHitboxes = [];
    state.selectedOptStep = null;
    state.fittedDatasetId = null;
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
    var structures = state.datasets.filter(function (d) { return d.frames.length && d.type !== "out"; });
    var outputs = state.datasets.filter(function (d) { return d.analysis; });
    state.datasets.forEach(function (d) {
      if (d.frames.length) {
        d.linkedOutId = null;
        d.linkedOutName = "";
        d.linkedStepOffset = 0;
        d.linkWarning = "";
      }
    });
    if (structures.length !== 1 || outputs.length !== 1) return;

    var structure = structures[0];
    var output = outputs[0];
    var steps = output.analysis.optimization.steps || [];
    if (!steps.length) return;

    var offset = chooseOptStepOffset(structure.frames, steps);
    structure.linkedOutId = output.id;
    structure.linkedOutName = output.name;
    structure.linkedStepOffset = offset;
    if (structure.frames.length + offset > steps.length) {
      structure.linkWarning = "XYZ 共 " + structure.frames.length + " 帧，OUT 从第 " + offset + " 步开始，共 " + Math.max(0, steps.length - offset) + " 个优化步";
    }

    structure.frames.forEach(function (frame, index) {
      var step = steps[index + offset] || null;
      frame.outStep = step ? step.step : null;
      frame.optMetrics = step ? summarizeOptStep(step, output.analysis.energySource || "OPT| Total energy [hartree]") : null;
      if (frame.optMetrics && Number.isFinite(frame.optMetrics.energy)) frame.energy = frame.optMetrics.energy;
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

  function summarizeOptStep(step, energySource) {
    return {
      step: step.step,
      energy: metricValue(step.energy),
      energySource: energySource,
      metrics: {
        maxStep: metricGroup(step.maxStep, step.maxStepLimit, step.maxStepConverged),
        rmsStep: metricGroup(step.rmsStep, step.rmsStepLimit, step.rmsStepConverged),
        maxGradient: metricGroup(step.maxGradient, step.maxGradientLimit, step.maxGradientConverged),
        rmsGradient: metricGroup(step.rmsGradient, step.rmsGradientLimit, step.rmsGradientConverged),
      },
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
    state.currentTrendSeries = null;
    state.trendSeries = null;
    state.trendHitboxes = [];
    state.selectedOptStep = null;
    state.fittedDatasetId = null;
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
    renderFrameOnly();
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
      const structure = state.datasets.find((d) => d.frames.length);
      const target = structure || state.datasets[0] || null;
      state.activeId = target ? target.id : null;
      state.frameIndex = 0;
      state.fittedDatasetId = null;
    }
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
      if (dataset.linkedStepOffset) rows.push(["Step offset", "XYZ frame 1 -> OPT step " + dataset.linkedStepOffset]);
      if (dataset.linkWarning) rows.push(["警告", dataset.linkWarning]);
    }
    if (frame && frame.optMetrics) {
      rows.push(["OUT 能量", formatNumber(frame.optMetrics.energy) + " Ha"]);
      convergenceRows(frame.optMetrics).forEach(function (row) { rows.push(row); });
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
    state.currentTrendSeries = result && result.kind !== "atom" ? buildTrendSeries(selected, result.kind) : null;
    renderTrend(state.currentTrendSeries);
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
    const dataset = activeDataset();
    if (!dataset || !dataset.tree) {
      els.inputTree.textContent = "暂无 inp/restart 结构";
      return;
    }

    els.inputTree.replaceChildren(...dataset.tree.children.map(renderTreeNode));
  }

  function renderTreeNode(node) {
    const details = document.createElement("details");
    details.open = node.name === "GLOBAL" || node.name === "FORCE_EVAL" || node.name === "SUBSYS";
    const summary = document.createElement("summary");
    summary.textContent = `&${node.name}${node.suffix ? ` ${node.suffix}` : ""}  L${node.line}`;
    details.append(summary);

    node.params.slice(0, 12).forEach((param) => {
      const code = document.createElement("code");
      code.textContent = `${param.line}: ${param.text}`;
      details.append(code);
    });

    if (node.params.length > 12) {
      const code = document.createElement("code");
      code.textContent = `... ${node.params.length - 12} more`;
      details.append(code);
    }

    node.children.forEach((child) => details.append(renderTreeNode(child)));
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
      rows.push(["对应方式", "XYZ 第 1 帧 → OPT step " + (active.linkedStepOffset || 0)]);
      rows.push(["能量来源", outputDataset.analysis.energySource || "OPT| Total energy [hartree]"]);
      if (active.linkWarning) rows.push(["警告", active.linkWarning, "warn"]);
    }
    return renderKeyValueSection("结构-OUT 关联", rows, true);
  }

  function renderAnalysis() {
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

    report.append(renderKeyValueSection("概览", overview, true));
    const chartSection = renderOptimizationChartsSection(analysis);
    report.append(chartSection);
    report.append(renderEnergySection(analysis));
    report.append(renderScfSection(analysis));
    report.append(renderOptimizationSection(analysis));
    report.append(renderMdSection(analysis));
    report.append(renderAtomsSection(analysis));
    report.append(renderTextRowsSection("Files and settings", analysis.files.slice(0, 20).map((item) => `L${item.line} ${item.label}: ${item.value}`)));
    report.append(renderParameterSection(analysis));
    report.append(renderTextRowsSection("晶胞 / 应力", [
      ...analysis.cells.slice(-8).map((item) => `L${item.line} ${item.text}`),
      ...analysis.forces.slice(-8).map((item) => `L${item.line} ${item.text}`),
      ...analysis.stress.slice(-8).map((item) => `L${item.line} ${item.text}`),
    ]));
    report.append(renderTimingSection(analysis));
    report.append(renderTextRowsSection("Warnings and errors", [
      ...analysis.errors.slice(0, 20).map((item) => `ERROR L${item.line}: ${item.text}`),
      ...analysis.warnings.slice(0, 20).map((item) => `WARNING L${item.line}: ${item.text}`),
    ], analysis.errors.length > 0));

    els.analysisView.replaceChildren(report);
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

  function renderEnergySection(analysis) {
    const rows = analysis.energies.slice(-16).map((item) => [
      `L${item.line}`,
      `${item.label || "Energy"} = ${formatNumber(item.value)}${item.unit ? ` ${item.unit}` : ""}`,
    ]);
    return renderKeyValueSection("Energy", rows, rows.length > 0);
  }

  function renderScfSection(analysis) {
    const rows = [];
    analysis.scfRuns.slice(-8).forEach((run) => {
      rows.push([`L${run.line}`, run.converged ? `converged in ${run.steps || "?"} steps` : `not converged ${run.text}`, run.converged ? "ok" : "warn"]);
    });
    analysis.scf.slice(-12).forEach((item) => {
      const value = item.kind === "iteration" ? `iter ${item.iteration}: ${item.values.map(formatNumber).join("  ")}` : item.text;
      rows.push([`L${item.line}`, value]);
    });
    return renderKeyValueSection("SCF", rows, rows.length > 0);
  }

  function renderOptimizationSection(analysis) {
    const rows = [];
    if (analysis.optimization.optimizer) rows.push(["Optimizer", analysis.optimization.optimizer]);
    rows.push(["Converged", analysis.optimization.converged ? "Yes" : "Not detected", analysis.optimization.converged ? "ok" : ""]);
    analysis.optimization.steps.slice(-10).forEach((step) => {
      rows.push([
        `Step ${step.step}`,
        [
          step.energy ? `E ${formatNumber(step.energy.value)}` : "",
          step.maxStep ? `MaxStep ${formatNumber(step.maxStep.value)}` : "",
          step.rmsStep ? `RMSStep ${formatNumber(step.rmsStep.value)}` : "",
          step.maxGradient ? `MaxGrad ${formatNumber(step.maxGradient.value)}` : "",
          step.rmsGradient ? `RMSGrad ${formatNumber(step.rmsGradient.value)}` : "",
        ].filter(Boolean).join("  ") || `L${step.line}`,
      ]);
    });
    return renderKeyValueSection("Geometry optimization", rows, rows.length > 2);
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

  function renderParameterSection(analysis) {
    const grouped = analysis.parameters.reduce((total, item) => {
      if (!total[item.section]) total[item.section] = [];
      total[item.section].push(item);
      return total;
    }, {});
    const rows = Object.entries(grouped).flatMap(([section, items]) =>
      items.slice(0, 10).map((item) => [`${section} L${item.line}`, `${item.key}${item.value ? `: ${item.value}` : ""}`])
    );
    return renderKeyValueSection("CP2K parameters", rows, rows.length > 0);
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
      return {
        kind: "distance",
        label: `#${selected[0].index}-#${selected[1].index}`,
        unit: "Å",
        value: math.distance(selected[0], selected[1]),
        text: `键长 ${math.distance(selected[0], selected[1]).toFixed(4)} Å`,
      };
    }
    if (selected.length === 3) {
      return {
        kind: "angle",
        label: `#${selected[0].index}-#${selected[1].index}-#${selected[2].index}`,
        unit: "°",
        value: math.angle(selected[0], selected[1], selected[2]),
        text: `键角 ${math.angle(selected[0], selected[1], selected[2]).toFixed(2)}°`,
      };
    }
    if (selected.length >= 4) {
      return {
        kind: "dihedral",
        label: `#${selected[0].index}-#${selected[1].index}-#${selected[2].index}-#${selected[3].index}`,
        unit: "°",
        value: math.dihedral(selected[0], selected[1], selected[2], selected[3]),
        text: `二面角 ${math.dihedral(selected[0], selected[1], selected[2], selected[3]).toFixed(2)}°`,
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
      metric: { key: "measure", title: config.title || "\u8d8b\u52bf\u56fe", unit: config.unit || "", valueLabel: "Value" },
      points: config.points,
      full: { xMin: xMin, xMax: xMax, yMin: yMinRaw - yPad, yMax: yMaxRaw + yPad },
      view: { xMin: xMin, xMax: xMax, yMin: yMinRaw - yPad, yMax: yMaxRaw + yPad },
      hitboxes: [],
      drag: null,
      canvas: null,
    };
    state.chartModal = {
      type: "measure",
      charts: [chart],
      activeKey: "measure",
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
    var parts = ["Step " + step];
    state.chartModal.charts.forEach(function (ch) {
      var pt = ch.points.find(function (p) { return p.frame === step; });
      if (pt) {
        parts.push(ch.metric.title + " = " + formatNumber(pt.value) + " " + ch.metric.unit);
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
    return currentOptStep();
  }

  function handleChartWindowDragStart(event) {
    if (event.target.closest("button")) return;
    const rect = els.chartWindow.getBoundingClientRect();
    els.chartWindow.style.left = `${rect.left}px`;
    els.chartWindow.style.top = `${rect.top}px`;
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
