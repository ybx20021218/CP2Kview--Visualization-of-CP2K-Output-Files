(function () {
  "use strict";

  function createChartWindowContent(options) {
    const settings = options || {};
    const els = settings.els || {};
    const callbacks = settings.callbacks || {};

    function buildBody(charts) {
      if (!els.chartWindowBody) return;
      els.chartWindowBody.replaceChildren();
      if (!charts || !charts.length) return;
      els.chartWindowBody.replaceChildren(...charts.map(renderChart));
    }

    function clearBody() {
      if (els.chartWindowBody) els.chartWindowBody.replaceChildren();
    }

    function setToolsVisible(visible) {
      if (els.chartMinBtn) els.chartMinBtn.hidden = !visible;
      if (els.chartResetBtn) els.chartResetBtn.hidden = !visible;
    }

    function renderChart(chart, index) {
      var wrapper = document.createElement("div");
      wrapper.className = "cw-chart-wrap";
      var canvas = renderCanvas(index);
      chart.canvas = canvas;
      chart.wrapper = wrapper;
      wrapper.append(renderLabel(chart), canvas);
      return wrapper;
    }

    function renderLabel(chart) {
      var label = document.createElement("div");
      label.className = "cw-chart-label";
      var title = document.createElement("span");
      title.textContent = chart.metric.title;
      label.append(title);
      return label;
    }

    function renderCanvas(index) {
      var canvas = document.createElement("canvas");
      canvas.className = "cw-canvas";
      canvas.dataset.cwIndex = String(index);
      if (callbacks.bindCanvasEvents) callbacks.bindCanvasEvents(canvas);
      return canvas;
    }

    return {
      buildBody: buildBody,
      clearBody: clearBody,
      setToolsVisible: setToolsVisible,
    };
  }

  window.CP2KChartWindowContent = {
    create: createChartWindowContent,
  };
})();
