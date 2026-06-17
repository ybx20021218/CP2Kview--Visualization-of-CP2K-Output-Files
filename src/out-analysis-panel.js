(function () {
  "use strict";

  function createOutAnalysisPanel(options) {
    const settings = options || {};
    const els = settings.els || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const outAnalysisData = settings.outAnalysisData;
    const outLocator = settings.outLocator;
    const formatNumber = utils.formatNumber || function (value) { return String(value); };
    const inlineText = utils.inlineText || function (text) { return document.createTextNode(text); };

    function renderAnalysis(options) {
      const renderSettings = options || {};
      const scrollState = captureAnalysisScroll(renderSettings);
      const dataset = activeAnalysisDataset();
      if (!dataset || !dataset.analysis) {
        els.analysisView.textContent = uiText("analysis.empty", "暂无 out 文件结果");
        return;
      }

      const rendered = renderAnalysisReport(dataset);
      els.analysisView.replaceChildren(rendered.report);
      restoreAnalysisScroll(scrollState);
      window.setTimeout(function () {
        drawOptimizationCharts(rendered.chartSection, dataset.analysis);
      }, 0);
    }

    function refreshLinkedAnalysisSections() {
      const outputDataset = activeAnalysisDataset();
      const report = els.analysisView.querySelector(".analysis-report");
      if (!outputDataset || !outputDataset.analysis || !report) {
        renderAnalysis({ preserveScroll: true });
        return;
      }

      const analysis = outputDataset.analysis;
      const energyBlock = currentEnergyBreakdown(analysis);
      const scfBlock = currentScfBlock(analysis);
      const scrollTop = els.analysisView.scrollTop;
      const scrollLeft = els.analysisView.scrollLeft;
      const updates = [
        [".energy-breakdown-section", renderEnergySection(analysis, energyBlock)],
        ["#outLocatorSection", renderOutputLocatorSection(outputDataset, energyBlock, outLocatorOptions("out"))],
        [".scf-section", renderScfSection(analysis, scfBlock)],
        ["#scfLocatorSection", renderOutputLocatorSection(outputDataset, scfBlock, outLocatorOptions("scf"))],
      ];

      for (const update of updates) {
        if (!replaceAnalysisSection(report, update[0], update[1])) return;
      }

      els.analysisView.scrollTop = scrollTop;
      els.analysisView.scrollLeft = scrollLeft;
    }

    function replaceAnalysisSection(report, selector, newSection) {
      const oldSection = report.querySelector(selector);
      if (!oldSection) {
        renderAnalysis({ preserveScroll: true });
        return false;
      }
      if ("open" in oldSection && "open" in newSection) newSection.open = oldSection.open;
      oldSection.replaceWith(newSection);
      return true;
    }

    function captureAnalysisScroll(renderSettings) {
      if (!renderSettings.preserveScroll) return null;
      return {
        top: els.analysisView.scrollTop,
        left: els.analysisView.scrollLeft,
      };
    }

    function restoreAnalysisScroll(scrollState) {
      if (!scrollState) return;
      els.analysisView.scrollTop = scrollState.top;
      els.analysisView.scrollLeft = scrollState.left;
    }

    function renderAnalysisReport(dataset) {
      const analysis = dataset.analysis;
      const panelData = analysisPanelData(analysis);
      const report = document.createElement("div");
      report.className = "analysis-report";
      const chartSection = renderOptimizationChartsSection(analysis);
      report.append(...analysisReportSections(dataset, analysis, panelData, chartSection));
      return { report: report, chartSection: chartSection };
    }

    function analysisReportSections(dataset, analysis, panelData, chartSection) {
      const energyBlock = currentEnergyBreakdown(analysis);
      const scfBlock = currentScfBlock(analysis);
      return [
        renderLinkedOutputNotice(dataset),
        renderKeyValueSection(uiText("analysis.overview", "概览"), panelData.overviewRows, false),
        chartSection,
        renderEnergySection(analysis, energyBlock),
        renderOutputLocatorSection(dataset, energyBlock, outLocatorOptions("out")),
        renderScfSection(analysis, scfBlock),
        renderOutputLocatorSection(dataset, scfBlock, outLocatorOptions("scf")),
        renderOptimizationSection(analysis, dataset),
        renderMdSection(analysis),
        renderAtomsSection(analysis),
        renderFilesSection(analysis, dataset),
        renderParameterSection(analysis, dataset),
        renderTextRowsSection(uiText("analysis.cellStress", "晶胞 / 应力"), panelData.cellStressRows),
        renderTimingSection(analysis),
        renderWarningsErrorsSection(analysis, dataset),
      ];
    }

    function renderLinkedOutputNotice(outputDataset) {
      const rows = linkedOutputNoticeRows(outputDataset);
      const section = renderKeyValueSection(uiText("analysis.linkedOutput", "结构-OUT 关联"), rows, false);
      section.classList.add("linked-output-section");
      section.open = false;
      return section;
    }

    function linkedOutputNoticeRows(outputDataset) {
      const active = activeDataset();
      const rows = [[uiText("analysis.outFile", "OUT 文件"), outputDataset.name]];
      if (active && active.linkedOutId === outputDataset.id) {
        rows.push([uiText("analysis.linkedStructure", "关联结构"), active.name]);
        rows.push([uiText("analysis.linkMode", "对应方式"), linkedOutputModeText(active)]);
        rows.push([uiText("analysis.energySource", "能量来源"), outputDataset.analysis.energySource || "OPT| Total energy [hartree]"]);
        if (active.linkWarning) rows.push([uiText("analysis.warning", "警告"), displayText(active.linkWarning), "warn"]);
      }
      return rows;
    }

    function linkedOutputModeText(dataset) {
      const offset = dataset.linkedStepOffset || 0;
      const prefix = uiText("analysis.xyzFrame1", "XYZ 第 1 帧");
      if (dataset.linkMode === "energy") return prefix + " -> energy block " + offset;
      if (dataset.linkMode === "scf") return prefix + " -> SCF block " + offset;
      return prefix + " -> OPT step " + offset;
    }

    function analysisPanelData(analysis) {
      return outAnalysisData.analysisPanelData(analysis);
    }

    function currentEnergyBreakdown(analysis) {
      return outAnalysisData.currentEnergyBreakdown(analysis, {
        active: activeDataset(),
        frame: activeFrame(),
        stepNumber: currentOptStep(),
      });
    }

    function currentScfBlock(analysis) {
      return outAnalysisData.currentScfBlock(analysis, {
        active: activeDataset(),
        frame: activeFrame(),
        stepNumber: currentOptStep(),
      });
    }

    function energyBreakdownRows(block) {
      return outAnalysisData.energyBreakdownRows(block);
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

    function renderEnergySection(analysis, block) {
      const rows = energyBreakdownRows(block);
      const details = renderAnalysisDetails("analysis-section energy-breakdown-section", "Energy (" + rows.length + ")", true);

      if (!block || !rows.length) {
        details.append(renderAnalysisEmpty(analysis.energyBreakdowns && analysis.energyBreakdowns.length ? uiText("analysis.noEnergyCurrentFrame", "当前帧没有匹配到 OUT 能量分解块") : uiText("analysis.noEnergy", "未找到 OUT 能量分解块")));
        return details;
      }

      details.append(
        renderEnergyBlockTools(block, [
          outputLocateButton(uiText("analysis.locateOut", "定位到 OUT 原文"), uiText("analysis.locateEnergyTitle", "展开 OUT 原文并定位到这组能量"), function () {
            revealOutputEnergyBlock(block.lineStart);
          }),
        ]),
        renderAnalysisGrid(
          rows.map(function (item) { return [item.label, item.valueText]; }),
          "analysis-grid energy-breakdown-grid"
        )
      );
      return details;
    }

    function renderOutputLocatorSection(outputDataset, block, options) {
      return outLocator.renderOutputLocatorSection(outputDataset, block, options);
    }

    function revealOutputEnergyBlock(lineStart) {
      outLocator.revealEnergyBlock(lineStart);
    }

    function revealOutputScfBlock(lineStart) {
      outLocator.revealScfBlock(lineStart);
    }

    function renderScfSection(analysis, block) {
      const points = scfConvergencePoints(block);
      const details = renderAnalysisDetails("analysis-section scf-section", "SCF (" + points.length + ")", Boolean(block && block.iterations && block.iterations.length));

      if (!block || !points.length) {
        details.append(renderAnalysisEmpty(analysis.scfBlocks && analysis.scfBlocks.length ? uiText("analysis.noScfCurrentFrame", "当前帧没有匹配到 SCF 迭代块") : uiText("analysis.noScf", "未找到 SCF 迭代表")));
        return details;
      }

      details.append(
        renderEnergyBlockTools(block, [
          outputLocateButton(uiText("analysis.scfChart", "SCF 收敛图"), uiText("analysis.scfChartTitle", "打开当前帧完整 SCF 收敛大图"), function () {
            openScfConvergenceWindow(block);
          }),
          outputLocateButton(uiText("analysis.locateOut", "定位到 OUT 原文"), uiText("analysis.locateScfTitle", "展开 OUT 原文并定位到当前帧完整 SCF"), function () {
            revealOutputScfBlock(block.headerLine || block.lineStart);
          }),
        ], scfBlockConvergenceText(block)),
        renderScfChartHint(points)
      );
      return details;
    }

    function renderAnalysisDetails(className, summaryText, open) {
      const details = document.createElement("details");
      details.className = className;
      details.open = Boolean(open);
      const summary = document.createElement("summary");
      summary.textContent = summaryText;
      details.append(summary);
      return details;
    }

    function renderAnalysisEmpty(text, className) {
      const empty = document.createElement("div");
      empty.className = className || "analysis-empty";
      empty.textContent = text;
      return empty;
    }

    function renderAnalysisGrid(rows, className) {
      const grid = document.createElement("dl");
      grid.className = className || "analysis-grid";
      rows.forEach(function (row) {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = row[0];
        dd.textContent = row[1] || "-";
        if (row[2]) dd.className = row[2];
        grid.append(dt, dd);
      });
      return grid;
    }

    function renderEnergyBlockTools(block, buttons, suffix) {
      const tools = document.createElement("div");
      tools.className = "energy-block-tools";
      const meta = document.createElement("span");
      meta.textContent = "OUT L" + block.lineStart + "-L" + block.lineEnd + (suffix || "");
      tools.append(meta, ...buttons);
      return tools;
    }

    function outputLocateButton(label, title, onClick) {
      return outLocator.outputLocateButton(label, title, onClick);
    }

    function scfBlockConvergenceText(block) {
      return outAnalysisData.scfConvergenceText(block);
    }

    function renderScfChartHint(points) {
      const first = points[0];
      const last = points[points.length - 1];
      return renderAnalysisEmpty(
        uiText("analysis.matchedScf", "已匹配当前帧 SCF：{count} 轮，iteration {first} -> {last}，最新 convergence = {value}", {
          count: points.length,
          first: first.frame,
          last: last.frame,
          value: formatNumber(last.value),
        }),
        "analysis-empty scf-chart-hint"
      );
    }

    function scfConvergencePoints(block) {
      return outAnalysisData.scfConvergencePoints(block);
    }

    function renderOptimizationSection(analysis, outputDataset) {
      return renderLocatableRowsSection("Geometry optimization", analysisPanelData(analysis).optimizationItems, outputDataset, "geomOptLocator");
    }

    function renderFilesSection(analysis, outputDataset) {
      return renderLocatableRowsSection("Files and settings", analysisPanelData(analysis).fileItems, outputDataset, "filesLocator");
    }

    function renderLocatableRowsSection(title, items, outputDataset, idPrefix) {
      return outLocator.renderLocatableRowsSection(title, items, outputDataset, idPrefix);
    }

    function renderWarningsErrorsSection(analysis, outputDataset) {
      const panelData = analysisPanelData(analysis);
      const records = panelData.warningRecords;
      const groups = panelData.warningGroups;
      const details = renderAnalysisDetails("analysis-section warnings-section", "Warnings and errors (" + records.length + ")", analysis.errors.length > 0);

      if (!records.length) {
        details.append(renderAnalysisEmpty(uiText("analysis.noWarnings", "暂无 warning/error")));
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

    function renderWarningGroup(group, section, outputDataset, idPrefix) {
      const item = document.createElement("details");
      item.className = "warning-group " + (group.type === "ERROR" ? "error-group" : "warning-group-item");
      item.open = false;

      item.append(renderWarningGroupSummary(group));

      const lines = document.createElement("div");
      lines.className = "warning-lines";
      group.records.forEach(function (record, index) {
        lines.append(renderWarningLine(record, section, outputDataset, idPrefix + "-" + index));
      });
      item.append(lines);
      return item;
    }

    function renderWarningGroupSummary(group) {
      const summary = document.createElement("summary");
      const label = document.createElement("span");
      label.className = group.type === "ERROR" ? "warn" : "";
      label.textContent = group.type + " x" + group.records.length;
      const text = document.createElement("span");
      text.className = "warning-summary-text";
      text.textContent = group.text;
      summary.append(label, text);
      return summary;
    }

    function renderWarningLine(record, section, outputDataset, locatorId) {
      const row = document.createElement("div");
      row.className = "warning-line";
      const line = document.createElement("span");
      line.textContent = "L" + record.line;
      row.append(line, inlineText(record.text));
      const locate = inlineOutLocateButton(outputDataset, record.line, function () {
        showInlineOutLocator(section, outputDataset, record.line, locatorId);
      });
      if (locate) row.append(locate);
      return row;
    }

    function showInlineOutLocator(section, outputDataset, lineNumber, idPrefix) {
      outLocator.showInlineOutLocator(section, outputDataset, lineNumber, idPrefix);
    }

    function inlineOutLocateButton(outputDataset, lineNumber, onClick) {
      return outLocator.inlineOutLocateButton(outputDataset, lineNumber, onClick);
    }

    function renderMdSection(analysis) {
      const rows = analysisPanelData(analysis).mdRows;
      return renderKeyValueSection("Molecular dynamics", rows, rows.length > 0);
    }

    function renderAtomsSection(analysis) {
      const rows = analysisPanelData(analysis).atomRows;
      return renderKeyValueSection(uiText("analysis.atomTypes", "原子类型"), rows, rows.length > 0);
    }

    function renderParameterSection(analysis, outputDataset) {
      return renderLocatableRowsSection("CP2K parameters", analysisPanelData(analysis).parameterItems, outputDataset, "cp2kParamLocator");
    }

    function renderTimingSection(analysis) {
      const rows = analysisPanelData(analysis).timingRows;
      return renderKeyValueSection(uiText("analysis.timing", "计时"), rows, rows.length > 0);
    }

    function renderTextRowsSection(title, rows, open) {
      const filtered = rows.filter(Boolean);
      if (!filtered.length) return renderKeyValueSection(title, [], false);
      const normalized = filtered.map((text, index) => [String(index + 1), text]);
      return renderKeyValueSection(title, normalized, open);
    }

    function activeAnalysisDataset() {
      return callbacks.activeAnalysisDataset ? callbacks.activeAnalysisDataset() : null;
    }

    function activeDataset() {
      return callbacks.activeDataset ? callbacks.activeDataset() : null;
    }

    function activeFrame() {
      return callbacks.activeFrame ? callbacks.activeFrame() : null;
    }

    function currentOptStep() {
      return callbacks.currentOptStep ? callbacks.currentOptStep() : null;
    }

    function renderOptimizationChartsSection(analysis) {
      return callbacks.renderOptimizationChartsSection ? callbacks.renderOptimizationChartsSection(analysis) : document.createDocumentFragment();
    }

    function drawOptimizationCharts(section, analysis) {
      if (callbacks.drawOptimizationCharts) callbacks.drawOptimizationCharts(section, analysis);
    }

    function openScfConvergenceWindow(block) {
      if (callbacks.openScfConvergenceWindow) callbacks.openScfConvergenceWindow(block);
    }

    function outLocatorOptions(type) {
      if (type === "scf") {
        return {
          id: "scfLocatorSection",
          title: uiText("locator.scfTitle", "SCF 原文定位"),
          empty: uiText("locator.noScf", "暂无可定位的 SCF 原文"),
        };
      }
      return {
        id: "outLocatorSection",
        title: uiText("locator.outTitle", "OUT 原文定位"),
        empty: uiText("locator.noOut", "暂无可定位的 OUT 原文"),
      };
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    function displayText(value) {
      return i18n.dynamicText ? i18n.dynamicText(value) : value;
    }

    return {
      refreshLinkedAnalysisSections: refreshLinkedAnalysisSections,
      renderAnalysis: renderAnalysis,
    };
  }

  window.CP2KOutAnalysisPanel = {
    create: createOutAnalysisPanel,
  };
})();
