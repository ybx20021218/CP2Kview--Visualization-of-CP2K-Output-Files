(function () {
  "use strict";

  const storageKey = "cp2k-view-workspace-layout";
  const defaultLayout = { sidebar: 280, inspector: 340 };

  function createWorkspaceLayout(options) {
    const settings = options || {};
    const workspace = settings.workspace;
    const splitters = settings.splitters || [];
    const resetButton = settings.resetButton || null;
    const onLayoutChange = typeof settings.onLayoutChange === "function" ? settings.onLayoutChange : noop;
    var layoutDrag = null;

    function init() {
      if (resetButton) resetButton.addEventListener("click", reset);
      splitters.forEach(function (splitter) {
        splitter.addEventListener("pointerdown", handleSplitterDown);
      });
      restore();
    }

    function restore() {
      const saved = loadLayout();
      if (saved) {
        applyLayout(saved.sidebar, saved.inspector, false);
      }
      fitToViewport();
    }

    function reset() {
      applyLayout(defaultLayout.sidebar, defaultLayout.inspector, false);
      clearSavedLayout();
      onLayoutChange();
    }

    function fitToViewport() {
      if (!workspace || window.innerWidth <= 1180) return;
      const metrics = layoutMetrics();
      if (!metrics) return;
      const current = currentLayout();
      const limits = layoutLimits(metrics.total);
      const layout = constrainedLayout(current, limits);
      applyLayout(layout.sidebar, layout.inspector, false);
    }

    function handleSplitterDown(event) {
      if (event.button !== 0 || !workspace) return;
      const metrics = layoutMetrics();
      if (!metrics) return;
      layoutDrag = createDragState(event, currentLayout(), metrics);
      event.currentTarget.classList.add("active");
      document.body.classList.add("layout-resizing");
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      bindDragEvents();
    }

    function createDragState(event, current, metrics) {
      return {
        side: event.currentTarget.dataset.layoutSplitter,
        startX: event.clientX,
        sidebar: current.sidebar,
        inspector: current.inspector,
        total: metrics.total,
        splitter: event.currentTarget,
      };
    }

    function bindDragEvents() {
      window.addEventListener("pointermove", handleSplitterMove);
      window.addEventListener("pointerup", handleSplitterUp);
      window.addEventListener("pointercancel", handleSplitterUp);
    }

    function unbindDragEvents() {
      window.removeEventListener("pointermove", handleSplitterMove);
      window.removeEventListener("pointerup", handleSplitterUp);
      window.removeEventListener("pointercancel", handleSplitterUp);
    }

    function handleSplitterMove(event) {
      if (!layoutDrag) return;
      const layout = layoutFromDrag(layoutDrag, event.clientX);
      applyLayout(layout.sidebar, layout.inspector, false);
      onLayoutChange();
    }

    function layoutFromDrag(drag, clientX) {
      const dx = clientX - drag.startX;
      var sidebar = drag.sidebar;
      var inspector = drag.inspector;
      const limits = layoutLimits(drag.total);
      if (drag.side === "left") {
        sidebar = clamp(drag.sidebar + dx, limits.sidebarMin, limits.sidebarMaxFor(inspector));
      } else {
        inspector = clamp(drag.inspector - dx, limits.inspectorMin, limits.inspectorMaxFor(sidebar));
      }
      return { sidebar: sidebar, inspector: inspector };
    }

    function handleSplitterUp() {
      const drag = layoutDrag;
      if (drag && drag.splitter) drag.splitter.classList.remove("active");
      layoutDrag = null;
      document.body.classList.remove("layout-resizing");
      unbindDragEvents();
      saveLayout(currentLayout());
    }

    function currentLayout() {
      const styles = window.getComputedStyle(workspace);
      return {
        sidebar: parseCssPixels(styles.getPropertyValue("--sidebar-width")) || defaultLayout.sidebar,
        inspector: parseCssPixels(styles.getPropertyValue("--inspector-width")) || defaultLayout.inspector,
      };
    }

    function applyLayout(sidebar, inspector, persist) {
      if (!workspace) return;
      workspace.style.setProperty("--sidebar-width", Math.round(sidebar) + "px");
      workspace.style.setProperty("--inspector-width", Math.round(inspector) + "px");
      if (persist) saveLayout({ sidebar: sidebar, inspector: inspector });
    }

    function layoutMetrics() {
      if (!workspace) return null;
      const rect = workspace.getBoundingClientRect();
      const styles = window.getComputedStyle(workspace);
      const paddingLeft = parseCssPixels(styles.paddingLeft);
      const paddingRight = parseCssPixels(styles.paddingRight);
      const splitterWidth = splitters.reduce(function (sum, splitter) {
        const box = splitter.getBoundingClientRect();
        return box.width > 0 ? sum + box.width : sum;
      }, 0);
      return {
        total: Math.max(0, rect.width - paddingLeft - paddingRight - splitterWidth),
      };
    }

    return {
      fitToViewport: fitToViewport,
      init: init,
      reset: reset,
      restore: restore,
    };
  }

  function layoutLimits(total) {
    const sidebarMin = 180;
    const inspectorMin = 260;
    const centerMin = 360;
    return {
      sidebarMin: sidebarMin,
      inspectorMin: inspectorMin,
      sidebarMaxFor: function (inspector) {
        return Math.max(sidebarMin, total - inspector - centerMin);
      },
      inspectorMaxFor: function (sidebar) {
        return Math.max(inspectorMin, total - sidebar - centerMin);
      },
    };
  }

  function constrainedLayout(current, limits) {
    const sidebar = clamp(current.sidebar, limits.sidebarMin, limits.sidebarMaxFor(current.inspector));
    const inspector = clamp(current.inspector, limits.inspectorMin, limits.inspectorMaxFor(sidebar));
    return { sidebar: sidebar, inspector: inspector };
  }

  function loadLayout() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      return validLayout(saved) ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function saveLayout(layout) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch (error) {
      // Ignore private browsing or storage errors.
    }
  }

  function clearSavedLayout() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      // Ignore private browsing or storage errors.
    }
  }

  function validLayout(layout) {
    return Boolean(layout && Number.isFinite(layout.sidebar) && Number.isFinite(layout.inspector));
  }

  function parseCssPixels(value) {
    const number = Number.parseFloat(String(value || "").replace("px", ""));
    return Number.isFinite(number) ? number : 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function noop() {}

  window.CP2KWorkspaceLayout = {
    create: createWorkspaceLayout,
  };
})();
