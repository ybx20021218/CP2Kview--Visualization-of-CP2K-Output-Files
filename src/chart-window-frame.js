(function () {
  "use strict";

  function createChartWindowFrame(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const clamp = utils.clamp || function (value, min, max) {
      return Math.min(max, Math.max(min, value));
    };

    function setupResizeHandles() {
      ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach(function (direction) {
        const handle = document.createElement("div");
        handle.className = "chart-resize-handle chart-resize-" + direction;
        handle.dataset.resize = direction;
        handle.setAttribute("aria-hidden", "true");
        handle.addEventListener("pointerdown", handleResizeStart);
        els.chartWindow.append(handle);
      });
    }

    function handleResizeStart(event) {
      if (event.button !== 0) return;
      const direction = event.currentTarget.dataset.resize || "";
      const rect = freezeRect();
      state.chartResize = {
        direction: direction,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      bindResizeEvents();
    }

    function handleResizeMove(event) {
      const resize = state.chartResize;
      if (!resize) return;
      const dx = event.clientX - resize.startX;
      const dy = event.clientY - resize.startY;
      applyRect(resizeFrame(resize, dx, dy));
      drawChartWindow();
    }

    function resizeFrame(resize, dx, dy) {
      const limits = resizeLimits();
      var left = resize.left;
      var top = resize.top;
      var width = resize.width;
      var height = resize.height;

      if (resize.direction.includes("e")) width = resize.width + dx;
      if (resize.direction.includes("s")) height = resize.height + dy;
      if (resize.direction.includes("w")) {
        width = resize.width - dx;
        left = resize.left + dx;
      }
      if (resize.direction.includes("n")) {
        height = resize.height - dy;
        top = resize.top + dy;
      }

      return constrainFrame(
        { left: left, top: top, width: width, height: height },
        resize.direction,
        limits
      );
    }

    function resizeLimits() {
      const minWidth = 500;
      const minHeight = 400;
      const margin = 12;
      return {
        minWidth: minWidth,
        minHeight: minHeight,
        margin: margin,
        maxWidth: Math.max(minWidth, window.innerWidth - margin * 2),
        maxHeight: Math.max(minHeight, window.innerHeight - margin * 2),
      };
    }

    function constrainFrame(frame, direction, limits) {
      var left = frame.left;
      var top = frame.top;
      var width = frame.width;
      var height = frame.height;

      if (width < limits.minWidth) {
        if (direction.includes("w")) left -= limits.minWidth - width;
        width = limits.minWidth;
      }
      if (height < limits.minHeight) {
        if (direction.includes("n")) top -= limits.minHeight - height;
        height = limits.minHeight;
      }
      if (width > limits.maxWidth) {
        if (direction.includes("w")) left -= limits.maxWidth - width;
        width = limits.maxWidth;
      }
      if (height > limits.maxHeight) {
        if (direction.includes("n")) top -= limits.maxHeight - height;
        height = limits.maxHeight;
      }

      left = clamp(left, limits.margin - width + limits.minWidth, window.innerWidth - limits.margin - limits.minWidth);
      top = clamp(top, limits.margin - height + limits.minHeight, window.innerHeight - limits.margin - limits.minHeight);
      if (left + width > window.innerWidth - limits.margin) width = window.innerWidth - limits.margin - left;
      if (top + height > window.innerHeight - limits.margin) height = window.innerHeight - limits.margin - top;
      return {
        left: left,
        top: top,
        width: Math.max(limits.minWidth, width),
        height: Math.max(limits.minHeight, height),
      };
    }

    function handleResizeEnd() {
      state.chartResize = null;
      unbindResizeEvents();
    }

    function bindResizeEvents() {
      window.addEventListener("pointermove", handleResizeMove);
      window.addEventListener("pointerup", handleResizeEnd);
      window.addEventListener("pointercancel", handleResizeEnd);
    }

    function unbindResizeEvents() {
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
      window.removeEventListener("pointercancel", handleResizeEnd);
    }

    function handleDragStart(event) {
      if (event.target.closest("button, .chart-resize-handle")) return;
      const rect = freezeRect();
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

    function freezeRect() {
      const rect = els.chartWindow.getBoundingClientRect();
      applyRect(rect);
      els.chartWindow.style.transform = "none";
      return rect;
    }

    function applyRect(rect) {
      els.chartWindow.style.left = rect.left + "px";
      els.chartWindow.style.top = rect.top + "px";
      els.chartWindow.style.width = rect.width + "px";
      els.chartWindow.style.height = rect.height + "px";
    }

    function drawChartWindow() {
      if (callbacks.drawChartWindow) callbacks.drawChartWindow();
    }

    return {
      handleDragStart: handleDragStart,
      setupResizeHandles: setupResizeHandles,
    };
  }

  window.CP2KChartWindowFrame = {
    create: createChartWindowFrame,
  };
})();
