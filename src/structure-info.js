(function () {
  "use strict";

  function createStructureInfo(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const compositionCache = new WeakMap();
    const formatCoord = utils.formatCoord || function (value) { return String(value); };
    const formatNumber = utils.formatNumber || function (value) { return String(value); };
    const setTextContent = utils.setTextContent || function (element, value) {
      if (element) element.textContent = value;
    };

    function activeDataset() {
      return callbacks.activeDataset ? callbacks.activeDataset() : null;
    }

    function activeFrame() {
      return callbacks.activeFrame ? callbacks.activeFrame() : null;
    }

    function renderStats(dataset, frame) {
      dataset = dataset || activeDataset();
      frame = frame || activeFrame();
      renderStatsRows(structureStatsRows(dataset, frame));
    }

    function structureStatsRows(dataset, frame) {
      const rows = [
        [uiText("stats.file", "文件"), dataset ? dataset.name : "-"],
        [uiText("stats.type", "类型"), dataset ? dataset.type.toUpperCase() : "-"],
        [uiText("stats.atoms", "原子"), frame ? String(frame.atoms.length) : "-"],
        [uiText("stats.frames", "帧数"), dataset ? String(dataset.frames.length) : "-"],
        [uiText("structure.composition", "组成"), frame ? compositionText(frame.atoms) : "-"],
      ];
      appendAnalysisStatsRows(rows, dataset && dataset.analysis);
      appendLinkedOutputStatsRows(rows, dataset, frame);
      appendFrameMetricStatsRows(rows, frame);
      return rows;
    }

    function appendAnalysisStatsRows(rows, analysis) {
      if (!analysis) return;
      rows.push([uiText("structure.outLines", "OUT 行数"), String(analysis.lineCount || 0)]);
      rows.push(["End", analysis.normalEnd ? "Normal" : analysis.aborted ? "Aborted" : "Unknown"]);
      if (analysis.metadata.runType) rows.push([uiText("structure.runType", "运行类型"), analysis.metadata.runType.value]);
    }

    function appendLinkedOutputStatsRows(rows, dataset, frame) {
      if (dataset && dataset.linkedOutName) {
        rows.push([uiText("structure.linkedOut", "关联 OUT"), dataset.linkedOutName]);
        rows.push(["OPT step", frame && frame.outStep !== null ? "OPT step " + frame.outStep : "-"]);
        if (frame && frame.energyBreakdown) rows.push([uiText("structure.outEnergyBlock", "OUT 能量块"), "L" + frame.energyBreakdown.lineStart + "-L" + frame.energyBreakdown.lineEnd]);
        if (dataset.linkedStepOffset) rows.push(["Step offset", "XYZ frame 1 -> OPT step " + dataset.linkedStepOffset]);
        if (dataset.linkWarning) rows.push([uiText("structure.warning", "警告"), displayText(dataset.linkWarning)]);
      }
    }

    function appendFrameMetricStatsRows(rows, frame) {
      if (frame && frame.optMetrics) {
        rows.push([uiText("structure.outEnergy", "OUT 能量"), formatNumber(frame.optMetrics.energy) + " Ha"]);
        convergenceRows(frame.optMetrics).forEach(function (row) { rows.push(row); });
      } else if (frame && frame.energyBreakdown && frame.energyBreakdown.values && frame.energyBreakdown.values.total) {
        rows.push([uiText("structure.outEnergy", "OUT 能量"), frame.energyBreakdown.values.total.valueText + " Ha"]);
      }
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

    function renderStatsRows(rows) {
      const nextKey = rows.map(function (row) { return row[0] + "\u0001" + row[1]; }).join("\u0002");
      if (nextKey === state.structureStatsKey) return;
      state.structureStatsKey = nextKey;
      const nodes = [];
      rows.forEach(function (row) {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = row[0];
        dd.textContent = row[1];
        nodes.push(dt, dd);
      });
      els.structureStats.replaceChildren.apply(els.structureStats, nodes);
    }

    function renderHud(dataset, frame) {
      dataset = dataset || activeDataset();
      frame = frame || activeFrame();
      if (!dataset) {
        setTextContent(els.viewerHud, uiText("viewer.empty", "未载入结构"));
        return;
      }
      if (!frame && dataset.analysis) {
        const analysis = dataset.analysis;
        const parts = [`${dataset.name}`, "OUT report", `${analysis.lineCount || 0} lines`];
        if (analysis.metadata.runType) parts.push(analysis.metadata.runType.value);
        if (analysis.energies.length) parts.push(`last E=${analysis.energies[analysis.energies.length - 1].value.toFixed(8)}`);
        if (analysis.warnings.length) parts.push(`${analysis.warnings.length} warnings`);
        if (analysis.errors.length) parts.push(`${analysis.errors.length} errors`);
        setTextContent(els.viewerHud, parts.join(" | "));
        return;
      }
      if (!frame) {
        setTextContent(els.viewerHud, dataset.warnings && dataset.warnings.length ? displayText(dataset.warnings[0]) : uiText("viewer.empty", "未载入结构"));
        return;
      }

      const parts = [`${dataset.name}`, `${frame.atoms.length} atoms`, `frame ${state.frameIndex + 1}/${dataset.frames.length}`];
      if (frame.outStep !== null && frame.outStep !== undefined) parts.push(`OPT step ${frame.outStep}`);
      if (Number.isFinite(frame.energy)) parts.push(`E=${frame.energy.toFixed(8)}`);
      if (frame.comment) parts.push(displayText(frame.comment));
      if (dataset.warnings && dataset.warnings.length) parts.push(displayText(dataset.warnings[0]));
      setTextContent(els.viewerHud, parts.join(" | "));
    }

    function atomSummary(atom) {
      const info = window.CP2KElements && window.CP2KElements.get(atom.element);
      const name = info ? (isEnglish() ? ` ${info.nameEn}` : ` ${info.nameZh}/${info.nameEn}`) : "";
      const kind = atom.kind && atom.kind !== atom.element ? " " + uiText("atom.typeInline", "类型 {type}", { type: atom.kind }) : "";
      return `#${atom.index} ${atom.element}${name}${kind} (${formatCoord(atom.x)}, ${formatCoord(atom.y)}, ${formatCoord(atom.z)})`;
    }

    function atomStatusText(atom) {
      const info = window.CP2KElements && window.CP2KElements.get(atom.element);
      const label = info ? (isEnglish() ? `${atom.element} ${info.nameEn}` : `${atom.element} ${info.nameZh}/${info.nameEn}`) : atom.element;
      const type = atom.kind && atom.kind !== atom.element ? uiText("atom.typeSuffix", "，类型 {type}", { type: atom.kind }) : "";
      return uiText("atom.selected", "选中 #{index} {label}{type}，坐标 {x}, {y}, {z} Å", {
        index: atom.index,
        label: label,
        type: type,
        x: formatCoord(atom.x),
        y: formatCoord(atom.y),
        z: formatCoord(atom.z),
      });
    }

    function compositionText(atoms) {
      if (!atoms || !atoms.length) return "";
      const cached = compositionCache.get(atoms);
      if (cached) return cached;
      const counts = {};
      atoms.forEach(function (atom) {
        counts[atom.element] = (counts[atom.element] || 0) + 1;
      });
      const text = Object.entries(counts)
        .sort(function (a, b) { return a[0].localeCompare(b[0]); })
        .map(function (entry) { return `${entry[0]}${entry[1]}`; })
        .join(" ");
      compositionCache.set(atoms, text);
      return text;
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

    function isEnglish() {
      return i18n.getLanguage && i18n.getLanguage() === "en";
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    function displayText(value) {
      return i18n.dynamicText ? i18n.dynamicText(value) : value;
    }

    return {
      atomStatusText: atomStatusText,
      atomSummary: atomSummary,
      frameCommentWithMetrics: frameCommentWithMetrics,
      renderHud: renderHud,
      renderStats: renderStats,
    };
  }

  window.CP2KStructureInfo = {
    create: createStructureInfo,
  };
})();
