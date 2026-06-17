(function () {
  "use strict";

  function createInspectorPanels(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};

    function init() {
      (els.inspectorTabs || []).forEach(function (button) {
        button.addEventListener("click", function () {
          activateInspectorPage(button.dataset.panelTarget);
        });
      });
      (els.panelPopouts || []).forEach(function (button) {
        button.addEventListener("click", function () {
          toggleExpandedPanel(button.dataset.popout);
        });
      });
    }

    function activateInspectorPage(panelId) {
      if (!panelId) return;
      (els.inspectorTabs || []).forEach(function (button) {
        button.classList.toggle("active", button.dataset.panelTarget === panelId);
      });
      (els.inspectorPages || []).forEach(function (page) {
        page.classList.toggle("active", page.id === panelId);
      });
      refreshPanelCanvases(panelId);
    }

    function refreshPanelCanvases(panelId) {
      if (panelId === "measurePanel") window.setTimeout(refreshTrendCanvas, 0);
      if (panelId === "analysisPanel") window.setTimeout(refreshOptimizationCharts, 0);
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
      setPanelPopoutButton(panel, "\u00d7", uiText("panel.collapse", "收起"));
      window.setTimeout(refreshAllCanvases, 0);
    }

    function closeExpandedPanel() {
      if (!state.expandedPanelId) return;
      const panel = document.getElementById(state.expandedPanelId);
      if (panel) {
        panel.classList.remove("panel-expanded");
        setPanelPopoutButton(panel, "Open", uiText("panel.popout", "单独查看"));
      }
      document.body.classList.remove("panel-expanded-open");
      state.expandedPanelId = null;
      window.setTimeout(refreshAllCanvases, 0);
    }

    function setPanelPopoutButton(panel, text, title) {
      const button = panel.querySelector(".panel-popout");
      if (!button) return;
      button.textContent = text;
      button.title = title;
    }

    function refreshAllCanvases() {
      refreshTrendCanvas();
      refreshOptimizationCharts();
    }

    function refreshLanguage() {
      if (!state.expandedPanelId) return;
      const panel = document.getElementById(state.expandedPanelId);
      if (panel) setPanelPopoutButton(panel, "\u00d7", uiText("panel.collapse", "收起"));
    }

    function refreshTrendCanvas() {
      if (callbacks.drawTrendCanvasIfVisible) callbacks.drawTrendCanvasIfVisible();
    }

    function refreshOptimizationCharts() {
      if (callbacks.drawOptimizationChartsIfVisible) callbacks.drawOptimizationChartsIfVisible();
    }

    return {
      activateInspectorPage: activateInspectorPage,
      closeExpandedPanel: closeExpandedPanel,
      init: init,
      refreshLanguage: refreshLanguage,
      toggleExpandedPanel: toggleExpandedPanel,
    };

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }
  }

  window.CP2KInspectorPanels = {
    create: createInspectorPanels,
  };
})();
