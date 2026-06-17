(function () {
  "use strict";

  function createOptimizationChartPanel(options) {
    const settings = options || {};
    const callbacks = settings.callbacks || {};
    const metrics = settings.metrics || defaultOptimizationMetrics();
    const i18n = settings.i18n || window.CP2KI18n || {};

    function renderSection(analysis) {
      const details = document.createElement("details");
      details.className = "analysis-section opt-chart-section";
      details.open = Boolean(analysis.optimization.steps.length);
      const summary = document.createElement("summary");
      summary.textContent = "Optimization Plot (" + analysis.optimization.steps.length + ")";
      details.append(summary);
      details.addEventListener("toggle", function () {
        if (details.open && callbacks.drawChartsIfVisible) {
          window.setTimeout(function () {
            callbacks.drawChartsIfVisible();
          }, 0);
        }
      });

      details.append(
        renderChartTools(),
        renderChartStack(),
        renderChartStatus()
      );
      return details;
    }

    function metricDefs() {
      return metrics;
    }

    function renderChartTools() {
      const tools = document.createElement("div");
      tools.className = "opt-chart-tools";
      tools.append(renderOpenAllButton(), renderChartHint());
      return tools;
    }

    function renderOpenAllButton() {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "opt-expand-btn";
      button.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>  </svg>';
      button.append(document.createTextNode(" " + uiText("optimization.expandAll", "展开全部图表")));
      button.title = uiText("optimization.expandAll.title", "在独立窗口并排查看全部优化图表");
      button.addEventListener("click", function () {
        if (callbacks.openChartWindow) callbacks.openChartWindow(null);
      });
      return button;
    }

    function renderChartHint() {
      const hint = document.createElement("span");
      hint.textContent = uiText("optimization.hint", "拖拽可局部放大 | 双击恢复");
      return hint;
    }

    function renderChartStack() {
      const stack = document.createElement("div");
      stack.className = "opt-chart-stack";
      metrics.forEach(function (metric) {
        stack.append(renderChartItem(metric));
      });
      return stack;
    }

    function renderChartItem(metric) {
      const item = document.createElement("div");
      item.className = "opt-chart-item";
      item.append(
        renderInlineLabel(metric),
        renderChartCanvas(metric)
      );
      return item;
    }

    function renderInlineLabel(metric) {
      const label = document.createElement("div");
      label.className = "opt-chart-label-inline";
      label.textContent = metric.title;
      return label;
    }

    function renderChartCanvas(metric) {
      const canvas = document.createElement("canvas");
      canvas.className = "opt-plot-canvas";
      canvas.width = 960;
      canvas.height = 220;
      canvas.dataset.metric = metric.key;
      canvas.setAttribute("aria-label", metric.title);
      if (callbacks.bindCanvasEvents) callbacks.bindCanvasEvents(canvas);
      return canvas;
    }

    function renderChartStatus() {
      const status = document.createElement("div");
      status.className = "opt-chart-status";
      status.textContent = uiText("optimization.status", "Select an optimization step to show values here");
      return status;
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    return {
      metricDefs: metricDefs,
      renderSection: renderSection,
    };
  }

  function defaultOptimizationMetrics() {
    return [
      { key: "energy", title: "Total Energy", yLabel: "Total Energy (Hartree)", valueLabel: "Total Energy", unit: "Hartree" },
      { key: "maxGradient", title: "Maximum Internal Force", yLabel: "Maximum Force (Hartree/Bohr)", valueLabel: "Maximum Force", unit: "Hartree/Bohr", scale: "log" },
      { key: "rmsGradient", title: "RMS Gradient Norm", yLabel: "RMS Gradient Norm (Hartree/Bohr)", valueLabel: "RMS Gradient", unit: "Hartree/Bohr", scale: "log" },
      { key: "maxStep", title: "Maximum Step Size", yLabel: "Maximum Step Size (Bohr)", valueLabel: "Maximum Step", unit: "Bohr", scale: "log" },
      { key: "rmsStep", title: "RMS Step Size", yLabel: "RMS Step Size (Bohr)", valueLabel: "RMS Step", unit: "Bohr", scale: "log" },
    ];
  }

  window.CP2KOptimizationChartPanel = {
    create: createOptimizationChartPanel,
  };
})();
