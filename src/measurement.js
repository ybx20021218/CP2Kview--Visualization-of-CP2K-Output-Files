(function () {
  "use strict";

  function createMeasurementTools(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const atomIndexCache = new WeakMap();
    const measurementTrendCache = new WeakMap();
    const formatNumber = utils.formatNumber || function (value) { return String(value); };
    const downloadText = utils.downloadText || function () {};

    function activeDataset() {
      return callbacks.activeDataset ? callbacks.activeDataset() : null;
    }

    function activeFrame() {
      return callbacks.activeFrame ? callbacks.activeFrame() : null;
    }

    function atomSummary(atom) {
      return callbacks.atomSummary ? callbacks.atomSummary(atom) : `#${atom.index} ${atom.element}`;
    }

    function measurementFromSelection(selected) {
      if (selected.length === 1) {
        return { kind: "atom", text: atomSummary(selected[0]) };
      }

      const kind = measurementKindForSelection(selected);
      if (!kind) return null;
      const atoms = selected.slice(0, measurementAtomCount(kind));
      const indices = atoms.map(function (atom) { return atom.index; });
      const value = measurementValueForAtoms(atoms, kind);
      const unit = measurementUnit(kind);
      return {
        kind: kind,
        label: measurementLabel(indices),
        indices: indices,
        unit: unit,
        value: value,
        text: measurementText(kind, value, unit),
      };
    }

    function buildTrendSeries(selected, kind) {
      const dataset = activeDataset();
      if (!canBuildMeasurementTrend(dataset)) return null;
      const indices = measurementTrendIndices(selected, kind);
      const cacheKey = measurementTrendKey(kind, indices);
      const cache = measurementTrendDatasetCache(dataset);
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      const points = measurementTrendPoints(dataset, indices, kind);
      if (points.length < 2) {
        return cacheMeasurementTrend(cache, cacheKey, null);
      }

      return cacheMeasurementTrend(cache, cacheKey, measurementTrendSeries(dataset, kind, indices, points));
    }

    function canBuildMeasurementTrend(dataset) {
      return Boolean(dataset && dataset.frames.length > 1);
    }

    function measurementTrendIndices(selected, kind) {
      return selected.slice(0, measurementAtomCount(kind)).map(function (atom) {
        return atom.index;
      });
    }

    function measurementTrendPoints(dataset, indices, kind) {
      const points = [];
      dataset.frames.forEach(function (frame, frameIndex) {
        const atoms = atomsForMeasurement(frame, indices);
        if (atoms.some(function (atom) { return !atom; })) return;
        const value = measurementValueForAtoms(atoms, kind);
        if (Number.isFinite(value)) points.push({ frame: frameIndex + 1, value: value });
      });
      return points;
    }

    function measurementTrendSeries(dataset, kind, indices, points) {
      const lookup = callbacks.pointLookup(points);
      return {
        datasetId: dataset.id,
        kind: kind,
        label: measurementLabel(indices),
        indices: indices,
        unit: measurementUnit(kind),
        points: points,
        pointByFrame: lookup.pointByFrame,
        pointIndexByFrame: lookup.pointIndexByFrame,
        lastFrame: lookup.lastFrame,
        bounds: callbacks.pointBounds(points, measurementYPadding(kind)),
      };
    }

    function cacheMeasurementTrend(cache, cacheKey, series) {
      cache.set(cacheKey, series);
      return series;
    }

    function measurementKindForSelection(selected) {
      if (selected.length === 2) return "distance";
      if (selected.length === 3) return "angle";
      if (selected.length >= 4) return "dihedral";
      return "";
    }

    function measurementAtomCount(kind) {
      if (kind === "distance") return 2;
      if (kind === "angle") return 3;
      if (kind === "dihedral") return 4;
      return 0;
    }

    function measurementValueForAtoms(atoms, kind) {
      const math = window.StructureMath;
      if (kind === "distance") return math.distance(atoms[0], atoms[1]);
      if (kind === "angle") return math.angle(atoms[0], atoms[1], atoms[2]);
      if (kind === "dihedral") return math.dihedral(atoms[0], atoms[1], atoms[2], atoms[3]);
      return NaN;
    }

    function atomsForMeasurement(frame, indices) {
      const atomMap = atomIndexForFrame(frame);
      return indices.map(function (index) {
        return atomMap.get(index) || null;
      });
    }

    function measurementLabel(indices) {
      return indices.map(function (index) { return `#${index}`; }).join("-");
    }

    function measurementUnit(kind) {
      return kind === "distance" ? "Å" : "°";
    }

    function measurementText(kind, value, unit) {
      if (kind === "distance") return `${uiText("measurement.distance", "键长")} ${formatMeasurementValue(value, kind)} ${unit}`;
      if (kind === "angle") return `${uiText("measurement.angle", "键角")} ${formatMeasurementValue(value, kind)}${unit}`;
      return `${uiText("measurement.dihedral", "二面角")} ${formatMeasurementValue(value, kind)}${unit}`;
    }

    function measurementYPadding(kind) {
      return kind === "distance" ? 0.01 : 0.1;
    }

    function measurementTrendKey(kind, indices) {
      return kind + "|" + indices.join("-");
    }

    function measurementTrendDatasetCache(dataset) {
      var cache = measurementTrendCache.get(dataset);
      if (!cache) {
        cache = new Map();
        measurementTrendCache.set(dataset, cache);
      }
      return cache;
    }

    function atomIndexForFrame(frame) {
      var cached = atomIndexCache.get(frame);
      if (cached) return cached;
      cached = new Map();
      frame.atoms.forEach(function (atom) {
        cached.set(atom.index, atom);
      });
      atomIndexCache.set(frame, cached);
      return cached;
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
        els.trendSummary.textContent = uiText("measurement.trendEmpty", "Select 2/3/4 atoms to build a trend");
        return;
      }

      els.trendSummary.textContent = trendSummaryText(series);
      drawTrendCanvas(series);
    }

    function drawTrendCanvasIfVisible() {
      if (state.trendSeries && !els.trendPanel.hidden) drawTrendCanvas(state.trendSeries);
    }

    function drawTrendCanvas(series) {
      const prepared = prepareTrendCanvas();
      const ctx = prepared.ctx;
      const metrics = prepared.metrics;
      const projector = trendProjectors(series, metrics);

      updateTrendHitboxes(series, projector.xFor, projector.yFor, metrics.ratio);
      drawTrendAxes(ctx, metrics, series);
      drawTrendLine(ctx, series, projector.xFor, projector.yFor, metrics.ratio);
      drawTrendPoints(ctx, metrics.ratio);
      drawTrendCurrentFrame(ctx, series, metrics.plot, projector.xFor, projector.yFor, metrics.ratio);
    }

    function prepareTrendCanvas() {
      const canvas = els.trendCanvas;
      const ctx = canvas.getContext("2d");
      const metrics = trendCanvasMetrics(canvas);
      canvas.width = metrics.width;
      canvas.height = metrics.height;

      ctx.clearRect(0, 0, metrics.width, metrics.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, metrics.width, metrics.height);
      return { ctx: ctx, metrics: metrics };
    }

    function trendProjectors(series, metrics) {
      const bounds = series.bounds;
      return callbacks.chartProjectors(metrics.plot, {
        xMin: bounds.minFrame,
        xMax: bounds.maxFrame,
        yMin: bounds.yMin,
        yMax: bounds.yMax,
      });
    }

    function drawTrendLine(ctx, series, xFor, yFor, ratio) {
      callbacks.drawChartPolyline(ctx, series.points, xFor, yFor, { strokeStyle: "#137c72", lineWidth: 2 * ratio });
    }

    function trendSummaryText(series) {
      const currentPoint = trendPointForFrame(series, state.frameIndex + 1);
      const minValue = formatMeasurementValue(series.bounds.minValue, series.kind);
      const maxValue = formatMeasurementValue(series.bounds.maxValue, series.kind);
      const currentText = currentPoint ? `${isEnglish() ? "; " : "；"}${uiText("measurement.currentFrame", "当前帧")} ${currentPoint.frame}: ${formatMeasurementValue(currentPoint.value, series.kind)} ${series.unit}` : "";
      return `${trendTitle(series)}: ${minValue} - ${maxValue} ${series.unit}${currentText}`;
    }

    function trendCanvasMetrics(canvas) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(240, Math.floor(rect.width * ratio));
      const height = Math.max(130, Math.floor(rect.height * ratio));
      const padding = { left: 58 * ratio, right: 38 * ratio, top: 18 * ratio, bottom: 34 * ratio };
      return {
        ratio: ratio,
        width: width,
        height: height,
        padding: padding,
        plot: {
          left: padding.left,
          top: padding.top,
          width: width - padding.left - padding.right,
          height: height - padding.top - padding.bottom,
        },
      };
    }

    function updateTrendHitboxes(series, xFor, yFor, ratio) {
      state.trendHitboxes = series.points.map(function (point) {
        return {
          frame: point.frame,
          value: point.value,
          x: xFor(point.frame),
          y: yFor(point.value),
          radius: 8 * ratio,
        };
      });
    }

    function drawTrendAxes(ctx, metrics, series) {
      const bounds = series.bounds;
      const ratio = metrics.ratio;
      const plot = metrics.plot;
      ctx.strokeStyle = "#d6dde5";
      ctx.lineWidth = ratio;
      ctx.beginPath();
      ctx.moveTo(plot.left, plot.top);
      ctx.lineTo(plot.left, plot.top + plot.height);
      ctx.lineTo(plot.left + plot.width, plot.top + plot.height);
      ctx.stroke();

      ctx.fillStyle = "#627386";
      ctx.font = `${11 * ratio}px Segoe UI, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(formatMeasurementValue(bounds.yMax, series.kind), plot.left - 7 * ratio, plot.top);
      ctx.fillText(formatMeasurementValue(bounds.yMin, series.kind), plot.left - 7 * ratio, plot.top + plot.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(String(bounds.minFrame), plot.left, plot.top + plot.height + 8 * ratio);
      ctx.fillText(String(bounds.maxFrame), plot.left + plot.width, plot.top + plot.height + 8 * ratio);
    }

    function drawTrendPoints(ctx, ratio) {
      ctx.fillStyle = "#137c72";
      state.trendHitboxes.forEach(function (point) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.5 * ratio, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawTrendCurrentFrame(ctx, series, plot, xFor, yFor, ratio) {
      const current = trendPointForFrame(series, state.frameIndex + 1);
      if (!current) return;
      const x = xFor(current.frame);
      const y = yFor(current.value);
      ctx.strokeStyle = "rgba(179, 68, 43, 0.55)";
      ctx.lineWidth = ratio;
      ctx.beginPath();
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.top + plot.height);
      ctx.stroke();
      ctx.fillStyle = "#b3442b";
      ctx.beginPath();
      ctx.arc(x, y, 3.5 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }

    function clearTrendCanvas() {
      state.trendHitboxes = [];
      const ctx = els.trendCanvas.getContext("2d");
      ctx.clearRect(0, 0, els.trendCanvas.width, els.trendCanvas.height);
    }

    function trendPointForFrame(series, frame) {
      if (!series || frame === null || frame === undefined) return null;
      return series.pointByFrame ? series.pointByFrame.get(frame) || null : series.points.find(function (point) {
        return point.frame === frame;
      }) || null;
    }

    function handleTrendClick() {
      if (!state.trendSeries) return;
      callbacks.openChartWindow({
        points: state.trendSeries.points,
        pointByFrame: state.trendSeries.pointByFrame,
        pointIndexByFrame: state.trendSeries.pointIndexByFrame,
        title: trendTitle(state.trendSeries),
        unit: state.trendSeries.unit,
        type: "measure",
      });
    }

    function exportTrendCsv() {
      if (!state.trendSeries) return;
      const series = state.trendSeries;
      const header = `frame,${series.kind}_${series.label}_${series.unit}`;
      const rows = series.points.map(function (point) { return `${point.frame},${point.value}`; });
      downloadText(`${series.kind}-${series.label}.csv`, [header].concat(rows).join("\n"), "text/csv;charset=utf-8");
    }

    function trendKindLabel(kind) {
      if (kind === "distance") return "Distance";
      if (kind === "angle") return "Angle";
      return "Dihedral";
    }

    function measurementKindLabel(kind) {
      if (kind === "distance") return uiText("measurement.distance", "键长");
      if (kind === "angle") return uiText("measurement.angle", "键角");
      return uiText("measurement.dihedral", "二面角");
    }

    function formatMeasurementValue(value, kind) {
      if (!Number.isFinite(value)) return "-";
      return kind === "distance" ? value.toFixed(4) : value.toFixed(2);
    }

    function isEnglish() {
      return i18n.getLanguage && i18n.getLanguage() === "en";
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    return {
      buildTrendSeries: buildTrendSeries,
      drawTrendCanvasIfVisible: drawTrendCanvasIfVisible,
      exportTrendCsv: exportTrendCsv,
      formatMeasurementValue: formatMeasurementValue,
      handleTrendClick: handleTrendClick,
      measurementFromSelection: measurementFromSelection,
      measurementKindLabel: measurementKindLabel,
      renderTrend: renderTrend,
    };
  }

  window.CP2KMeasurement = {
    create: createMeasurementTools,
  };
})();
