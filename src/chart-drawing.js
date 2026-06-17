(function () {
  "use strict";

  function createChartDrawingTools(options) {
    const settings = options || {};
    const utils = settings.utils || {};
    const chartDataTools = settings.chartDataTools || {};
    const formatNumber = utils.formatNumber || function (value) { return String(value); };

    function drawChartPolyline(ctx, points, xFor, yFor, drawSettings) {
      if (!points.length) return;
      ctx.strokeStyle = drawSettings.strokeStyle;
      ctx.lineWidth = drawSettings.lineWidth;
      ctx.beginPath();
      points.forEach(function (point, index) {
        var x = xFor(point.frame);
        var y = yFor(chartPointYValue(point));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    function drawConvergenceLimit(ctx, chart, plot, yFor, ratio, drawSettings) {
      if (!Number.isFinite(chart.convergenceLimit)) return;
      var limitValue = chartLimitYValue(chart);
      if (!Number.isFinite(limitValue)) return;
      var limitY = yFor(limitValue);
      if (limitY < plot.top || limitY > plot.top + plot.height) return;

      ctx.save();
      ctx.strokeStyle = "#cc2936";
      ctx.lineWidth = drawSettings.lineWidth * ratio;
      ctx.setLineDash(drawSettings.dash.map(function (value) { return value * ratio; }));
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(plot.left, limitY);
      ctx.lineTo(plot.left + plot.width, limitY);
      ctx.stroke();
      ctx.restore();

      var labelText = drawSettings.labelPrefix + formatNumber(chart.convergenceLimit);
      ctx.font = "bold " + Math.round(drawSettings.fontSize * ratio) + "px 'Segoe UI', sans-serif";
      var textWidth = ctx.measureText(labelText).width + drawSettings.textPad * ratio;
      var textX = plot.left + plot.width - textWidth - drawSettings.rightInset * ratio;
      var textY = limitY - drawSettings.labelYOffset * ratio;
      ctx.fillStyle = drawSettings.background;
      ctx.fillRect(textX, textY, textWidth, drawSettings.labelHeight * ratio);
      ctx.fillStyle = "#cc2936";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(labelText, textX + drawSettings.textLeftPad * ratio, limitY - drawSettings.textBottomOffset * ratio);
    }

    function updateChartHitboxes(chart, points, xFor, yFor, radius) {
      chart.hitboxes = points.map(function (point) {
        return {
          frame: point.frame,
          value: point.value,
          x: xFor(point.frame),
          y: yFor(chartPointYValue(point)),
          radius: radius,
        };
      });
    }

    function drawChartPoints(ctx, points, xFor, yFor, selectedStep, plot, ratio, drawSettings) {
      points.forEach(function (point) {
        var x = xFor(point.frame);
        if (x < plot.left - drawSettings.pointCullMargin || x > plot.left + plot.width + drawSettings.pointCullMargin) return;
        var selected = point.frame === selectedStep;
        var y = yFor(chartPointYValue(point));
        ctx.fillStyle = selected ? "#ffffff" : "#2f6f73";
        ctx.strokeStyle = selected ? "#c9302c" : "#2f6f73";
        ctx.lineWidth = (selected ? drawSettings.selectedLineWidth : drawSettings.normalLineWidth) * ratio;
        ctx.beginPath();
        ctx.arc(x, y, (selected ? drawSettings.selectedRadius : drawSettings.normalRadius) * ratio, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    function drawChartSelectionRect(ctx, selectionRect, ratio, drawSettings) {
      if (!selectionRect) return;
      ctx.strokeStyle = drawSettings.strokeStyle;
      ctx.lineWidth = drawSettings.lineWidth * ratio;
      ctx.setLineDash(drawSettings.dash.map(function (value) { return value * ratio; }));
      var x = Math.min(selectionRect.x1, selectionRect.x2);
      var y = Math.min(selectionRect.y1, selectionRect.y2);
      var width = Math.abs(selectionRect.x2 - selectionRect.x1);
      var height = Math.abs(selectionRect.y2 - selectionRect.y1);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }

    function drawChartWindowCanvas(canvas, chart, drawSettings) {
      const settingsForDraw = drawSettings || {};
      var ctx = canvas.getContext("2d");
      var metrics = chartWindowCanvasMetrics(canvas);
      var ratio = metrics.ratio;
      var plot = metrics.plot;
      prepareChartWindowCanvas(canvas, ctx, metrics);
      var view = chart.view;
      var projector = chartProjectors(plot, view);
      var xFor = projector.xFor;
      var yFor = projector.yFor;

      if (!chart.points.length) {
        chart.hitboxes = [];
        return;
      }

      drawChartWindowGrid(ctx, plot, ratio);
      drawChartWindowAxes(ctx, plot, ratio);
      drawChartWindowLabels(ctx, plot, chart, ratio);

      var visible = visibleChartPoints(chart.points, xFor, plot, 10);
      drawChartPolyline(ctx, visible, xFor, yFor, { strokeStyle: "#2f6f73", lineWidth: 1.8 * ratio });

      drawConvergenceLimit(ctx, chart, plot, yFor, ratio, chartWindowConvergenceLineStyle());

      updateChartHitboxes(chart, visible, xFor, yFor, 5.5 * ratio);
      drawChartPoints(ctx, visible, xFor, yFor, settingsForDraw.currentStep, plot, ratio, chartWindowPointStyle());
      drawChartSelectionRect(ctx, settingsForDraw.selectionRect, ratio, chartWindowSelectionStyle());
      drawChartWindowUnitLabel(ctx, chart, plot, ratio);
    }

    function chartProjectors(plot, view) {
      if (chartDataTools.chartProjectors) return chartDataTools.chartProjectors(plot, view);
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
      if (chartDataTools.visibleChartPoints) return chartDataTools.visibleChartPoints(points, xFor, plot, margin);
      return points.filter(function (point) {
        var x = xFor(point.frame);
        return x >= plot.left - margin && x <= plot.left + plot.width + margin;
      });
    }

    function chartWindowCanvasMetrics(canvas) {
      var rect = canvas.getBoundingClientRect();
      var ratio = window.devicePixelRatio || 1;
      var width = Math.max(400, Math.floor((rect.width || 600) * ratio));
      var height = Math.max(120, Math.floor((rect.height || 160) * ratio));
      return {
        ratio: ratio,
        width: width,
        height: height,
        plot: {
          left: 68 * ratio,
          top: 12 * ratio,
          width: width - 82 * ratio,
          height: height - 44 * ratio,
        },
      };
    }

    function prepareChartWindowCanvas(canvas, ctx, metrics) {
      canvas.width = metrics.width;
      canvas.height = metrics.height;
      ctx.clearRect(0, 0, metrics.width, metrics.height);
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(0, 0, metrics.width, metrics.height);
    }

    function drawChartWindowGrid(ctx, plot, ratio) {
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 0.7 * ratio;
      drawChartWindowGridLines(ctx, plot, 5, "horizontal");
      drawChartWindowGridLines(ctx, plot, 6, "vertical");
    }

    function drawChartWindowGridLines(ctx, plot, ticks, direction) {
      for (var index = 0; index <= ticks; index++) {
        var tickRatio = index / ticks;
        ctx.beginPath();
        if (direction === "horizontal") {
          var y = plot.top + tickRatio * plot.height;
          ctx.moveTo(plot.left, y);
          ctx.lineTo(plot.left + plot.width, y);
        } else {
          var x = plot.left + tickRatio * plot.width;
          ctx.moveTo(x, plot.top);
          ctx.lineTo(x, plot.top + plot.height);
        }
        ctx.stroke();
      }
    }

    function drawChartWindowAxes(ctx, plot, ratio) {
      ctx.strokeStyle = "#aeb7c2";
      ctx.lineWidth = 1 * ratio;
      ctx.beginPath();
      ctx.moveTo(plot.left, plot.top);
      ctx.lineTo(plot.left, plot.top + plot.height);
      ctx.lineTo(plot.left + plot.width, plot.top + plot.height);
      ctx.stroke();
    }

    function drawChartWindowLabels(ctx, plot, chart, ratio) {
      drawChartWindowYLabels(ctx, plot, chart, ratio, 5);
      drawChartWindowXLabels(ctx, plot, chart.view, ratio, 6);
    }

    function drawChartWindowYLabels(ctx, plot, chart, ratio, ticks) {
      var view = chart.view;
      ctx.fillStyle = "#586375";
      ctx.font = Math.round(9.5 * ratio) + "px 'Segoe UI', sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (var index = 0; index <= ticks; index++) {
        var value = view.yMax - (index / ticks) * (view.yMax - view.yMin);
        ctx.fillText(formatNumber(chartDisplayYValue(chart, value)), plot.left - 5 * ratio, plot.top + (index / ticks) * plot.height);
      }
    }

    function drawChartWindowXLabels(ctx, plot, view, ratio, ticks) {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (var index = 0; index <= ticks; index++) {
        var value = view.xMin + (index / ticks) * (view.xMax - view.xMin);
        ctx.fillText(Math.round(value), plot.left + (index / ticks) * plot.width, plot.top + plot.height + 5 * ratio);
      }
    }

    function chartWindowConvergenceLineStyle() {
      return {
        labelPrefix: "limit = ",
        lineWidth: 2,
        dash: [7, 3.5],
        fontSize: 10,
        textPad: 12,
        rightInset: 4,
        labelYOffset: 14,
        labelHeight: 16,
        textLeftPad: 5,
        textBottomOffset: 3,
        background: "rgba(204, 41, 54, 0.10)",
      };
    }

    function chartWindowPointStyle() {
      return {
        pointCullMargin: 8,
        selectedRadius: 5,
        normalRadius: 2.4,
        selectedLineWidth: 2.3,
        normalLineWidth: 1.2,
      };
    }

    function chartWindowSelectionStyle() {
      return {
        strokeStyle: "rgba(166,0,0,0.55)",
        lineWidth: 1.2,
        dash: [4, 3],
      };
    }

    function drawChartWindowUnitLabel(ctx, chart, plot, ratio) {
      ctx.fillStyle = "#8895a3";
      ctx.font = Math.round(8.5 * ratio) + "px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(chart.metric.unit, plot.left + 4 * ratio, plot.top - 1 * ratio);
    }

    return {
      drawChartPoints: drawChartPoints,
      drawChartPolyline: drawChartPolyline,
      drawChartSelectionRect: drawChartSelectionRect,
      drawChartWindowCanvas: drawChartWindowCanvas,
      drawConvergenceLimit: drawConvergenceLimit,
      updateChartHitboxes: updateChartHitboxes,
    };

    function chartPointYValue(point) {
      return chartDataTools.chartPointYValue ? chartDataTools.chartPointYValue(point) : point.value;
    }

    function chartLimitYValue(chart) {
      return chartDataTools.chartLimitYValue ? chartDataTools.chartLimitYValue(chart) : chart.convergenceLimit;
    }

    function chartDisplayYValue(chart, value) {
      return chartDataTools.chartDisplayYValue ? chartDataTools.chartDisplayYValue(chart, value) : value;
    }
  }

  window.CP2KChartDrawing = {
    create: createChartDrawingTools,
  };
})();
