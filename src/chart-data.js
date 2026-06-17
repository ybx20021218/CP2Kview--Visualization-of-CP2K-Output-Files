(function () {
  "use strict";

  function createChartDataTools(options) {
    const settings = options || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const optimizationChartDataCache = new WeakMap();

    function metricValue(metric) {
      return metric && Number.isFinite(metric.value) ? metric.value : null;
    }

    function isLogMetric(metric) {
      return metric && metric.scale === "log";
    }

    function metricPlotValue(metric, value) {
      if (!Number.isFinite(value)) return null;
      if (!isLogMetric(metric)) return value;
      return value > 0 ? Math.log10(value) : null;
    }

    function chartPointYValue(point) {
      return point && Number.isFinite(point.plotValue) ? point.plotValue : point.value;
    }

    function chartLimitYValue(chart) {
      return chart && Number.isFinite(chart.convergenceLimitPlotValue) ? chart.convergenceLimitPlotValue : chart.convergenceLimit;
    }

    function chartDisplayYValue(chart, value) {
      if (!Number.isFinite(value)) return value;
      return chart && isLogMetric(chart.metric) ? Math.pow(10, value) : value;
    }

    function chartProjectors(plot, view) {
      var xSpan = Math.max(1e-12, view.xMax - view.xMin);
      var ySpan = Math.max(1e-12, view.yMax - view.yMin);
      return {
        xFor: function (frame) {
          return plot.left + ((frame - view.xMin) / xSpan) * plot.width;
        },
        yFor: function (value) {
          return plot.top + (1 - (value - view.yMin) / ySpan) * plot.height;
        },
      };
    }

    function visibleChartPoints(points, xFor, plot, margin) {
      return points.filter(function (point) {
        var x = xFor(point.frame);
        return x >= plot.left - margin && x <= plot.left + plot.width + margin;
      });
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

    function chartPointForFrame(chart, frame) {
      if (!chart || frame === null || frame === undefined) return null;
      return chart.pointByFrame ? chart.pointByFrame.get(frame) || null : chart.points.find(function (point) { return point.frame === frame; }) || null;
    }

    function chartIndexForFrame(chart, frame) {
      if (!chart || frame === null || frame === undefined) return -1;
      if (chart.pointIndexByFrame && chart.pointIndexByFrame.has(frame)) return chart.pointIndexByFrame.get(frame);
      return chart.points.findIndex(function (point) { return point.frame === frame; });
    }

    function pointLookup(points) {
      var pointByFrame = new Map();
      var pointIndexByFrame = new Map();
      points.forEach(function (point, index) {
        if (!pointByFrame.has(point.frame)) {
          pointByFrame.set(point.frame, point);
          pointIndexByFrame.set(point.frame, index);
        }
      });
      return {
        pointByFrame: pointByFrame,
        pointIndexByFrame: pointIndexByFrame,
        lastFrame: points.length ? points[points.length - 1].frame : null,
      };
    }

    function pointBounds(points, yPadMinimum) {
      var minFrame = Infinity;
      var maxFrame = -Infinity;
      var minValue = Infinity;
      var maxValue = -Infinity;
      points.forEach(function (point) {
        minFrame = Math.min(minFrame, point.frame);
        maxFrame = Math.max(maxFrame, point.frame);
        minValue = Math.min(minValue, point.value);
        maxValue = Math.max(maxValue, point.value);
      });
      var minimumPad = Number.isFinite(yPadMinimum) ? yPadMinimum : Math.abs(maxValue || 1) * 1e-8;
      var yPad = Math.max((maxValue - minValue) * 0.12, minimumPad);
      return {
        minFrame: minFrame,
        maxFrame: maxFrame,
        minValue: minValue,
        maxValue: maxValue,
        yMin: minValue - yPad,
        yMax: maxValue + yPad,
      };
    }

    function optimizationChartState(chartEntry, existing) {
      return {
        metric: chartEntry.metric,
        points: chartEntry.points,
        pointByFrame: chartEntry.pointByFrame,
        pointIndexByFrame: chartEntry.pointIndexByFrame,
        full: chartEntry.full,
        view: existing && existing.metric && existing.metric.key === chartEntry.metric.key ? constrainChartView(existing.view, chartEntry.full) : { ...chartEntry.full },
        hitboxes: [],
        drag: null,
        convergenceLimit: Number.isFinite(chartEntry.convergenceLimit) ? chartEntry.convergenceLimit : null,
        convergenceLimitPlotValue: Number.isFinite(chartEntry.convergenceLimitPlotValue) ? chartEntry.convergenceLimitPlotValue : null,
        lastFrame: chartEntry.lastFrame,
      };
    }

    function constrainChartView(view, full) {
      if (!view) return { ...full };
      var next = { ...view };
      if (!Number.isFinite(next.xMin) || !Number.isFinite(next.xMax) || Math.abs(next.xMax - next.xMin) < 1e-9) return { ...full };
      if (!Number.isFinite(next.yMin) || !Number.isFinite(next.yMax) || Math.abs(next.yMax - next.yMin) < 1e-12) return { ...full };
      return next;
    }

    function chartWindowChartFromSource(chart) {
      return {
        metric: chart.metric,
        points: chart.points,
        pointByFrame: chart.pointByFrame,
        pointIndexByFrame: chart.pointIndexByFrame,
        full: { ...chart.full },
        view: { ...chart.view },
        hitboxes: [],
        drag: null,
        canvas: null,
        convergenceLimit: chart.convergenceLimit,
        convergenceLimitPlotValue: chart.convergenceLimitPlotValue,
        lastFrame: chart.lastFrame,
      };
    }

    function chartWindowChartFromConfig(config) {
      var bounds = pointBounds(config.points, config.yPadMinimum);
      var lookup = chartWindowLookupForConfig(config);
      return {
        metric: { key: config.key || "measure", title: config.title || uiText("chart.trendTitle", "趋势图"), unit: config.unit || "", valueLabel: config.valueLabel || "Value" },
        points: config.points,
        pointByFrame: lookup.pointByFrame,
        pointIndexByFrame: lookup.pointIndexByFrame,
        full: { xMin: bounds.minFrame, xMax: bounds.maxFrame, yMin: bounds.yMin, yMax: bounds.yMax },
        view: { xMin: bounds.minFrame, xMax: bounds.maxFrame, yMin: bounds.yMin, yMax: bounds.yMax },
        hitboxes: [],
        drag: null,
        canvas: null,
        convergenceLimit: Number.isFinite(config.convergenceLimit) ? config.convergenceLimit : null,
        convergenceLimitPlotValue: Number.isFinite(config.convergenceLimit) ? config.convergenceLimit : null,
        lastFrame: lookup.lastFrame,
      };
    }

    function chartWindowLookupForConfig(config) {
      if (config.pointByFrame && config.pointIndexByFrame) {
        return {
          pointByFrame: config.pointByFrame,
          pointIndexByFrame: config.pointIndexByFrame,
          lastFrame: config.points[config.points.length - 1].frame,
        };
      }
      return pointLookup(config.points);
    }

    function replaceChartWindowChartData(chart, nextChart) {
      var canvas = chart.canvas || null;
      var wrapper = chart.wrapper || null;
      chart.metric = nextChart.metric;
      chart.points = nextChart.points;
      chart.pointByFrame = nextChart.pointByFrame;
      chart.pointIndexByFrame = nextChart.pointIndexByFrame;
      chart.full = nextChart.full;
      chart.view = nextChart.view;
      chart.hitboxes = [];
      chart.drag = null;
      chart.convergenceLimit = nextChart.convergenceLimit;
      chart.convergenceLimitPlotValue = nextChart.convergenceLimitPlotValue;
      chart.lastFrame = nextChart.lastFrame;
      chart.canvas = canvas;
      chart.wrapper = wrapper;
    }

    function ensureChartPointVisible(chart, point) {
      if (!chart || !point || !chart.view || !chart.full) return;
      var yValue = chartPointYValue(point);
      if (point.frame < chart.view.xMin || point.frame > chart.view.xMax || yValue < chart.view.yMin || yValue > chart.view.yMax) {
        chart.view = { ...chart.full };
      }
    }

    function optimizationChartData(analysis, metricDefs) {
      var cached = optimizationChartDataCache.get(analysis);
      if (cached) return cached;
      var steps = analysis.optimization.steps || [];
      var byMetric = {};
      (metricDefs || []).forEach(function (metric) {
        var points = [];
        var convergenceLimit = null;
        var limitKey = metric.key + "Limit";
        steps.forEach(function (step) {
          if (!shouldShowOptimizationPoint(metric, step)) return;
          var value = metric.key === "energy" ? metricValue(step.energy) : metricValue(step[metric.key]);
          var plotValue = metricPlotValue(metric, value);
          if (Number.isFinite(value) && Number.isFinite(plotValue)) {
            var point = { frame: step.step, value: value, plotValue: plotValue, line: step.line };
            points.push(point);
          }
          if (metric.key !== "energy" && convergenceLimit === null && step[limitKey] && Number.isFinite(step[limitKey].value)) {
            convergenceLimit = step[limitKey].value;
          }
        });
        var lookup = pointLookup(points);
        var convergenceLimitPlotValue = metricPlotValue(metric, convergenceLimit);
        byMetric[metric.key] = {
          metric: metric,
          points: points,
          pointByFrame: lookup.pointByFrame,
          pointIndexByFrame: lookup.pointIndexByFrame,
          convergenceLimit: convergenceLimit,
          convergenceLimitPlotValue: convergenceLimitPlotValue,
          full: optimizationChartFullView(points, convergenceLimitPlotValue),
          lastFrame: lookup.lastFrame,
        };
      });
      cached = { byMetric: byMetric };
      optimizationChartDataCache.set(analysis, cached);
      return cached;
    }

    function shouldShowOptimizationPoint(metric, step) {
      return !(metric && metric.key === "energy" && step && step.step === 0);
    }

    function optimizationChartFullView(points, convergenceLimitPlotValue) {
      if (!points.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
      const xs = points.map((point) => point.frame);
      const ys = points.map(chartPointYValue);
      const xMinRaw = Math.min(...xs);
      const xMaxRaw = Math.max(...xs);
      const yMinRaw = Math.min(...ys);
      const yMaxRaw = Math.max(...ys);
      var limYMin = yMinRaw;
      var limYMax = yMaxRaw;
      if (Number.isFinite(convergenceLimitPlotValue)) {
        limYMin = Math.min(yMinRaw, convergenceLimitPlotValue);
        limYMax = Math.max(yMaxRaw, convergenceLimitPlotValue);
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

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    return {
      chartIndexForFrame: chartIndexForFrame,
      chartWindowChartFromConfig: chartWindowChartFromConfig,
      chartWindowChartFromSource: chartWindowChartFromSource,
      chartDisplayYValue: chartDisplayYValue,
      chartLimitYValue: chartLimitYValue,
      chartPointForFrame: chartPointForFrame,
      chartPointYValue: chartPointYValue,
      chartProjectors: chartProjectors,
      ensureChartPointVisible: ensureChartPointVisible,
      metricValue: metricValue,
      minChartPoint: minChartPoint,
      optimizationChartData: optimizationChartData,
      optimizationChartState: optimizationChartState,
      pointBounds: pointBounds,
      pointLookup: pointLookup,
      replaceChartWindowChartData: replaceChartWindowChartData,
      visibleChartPoints: visibleChartPoints,
    };
  }

  window.CP2KChartData = {
    create: createChartDataTools,
  };
})();
