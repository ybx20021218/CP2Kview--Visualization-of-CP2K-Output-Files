(function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[char];
    });
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 0.0001 || abs >= 100000)) return value.toExponential(6);
    return Number(value).toFixed(8).replace(/\.?0+$/, "");
  }

  function formatSliderNumber(value) {
    return Number(value).toFixed(1).replace(/\.0$/, "");
  }

  function formatCoord(value) {
    return Number(value).toFixed(4);
  }

  function inlineText(value) {
    const text = document.createElement("span");
    text.textContent = value;
    return text;
  }

  function renderAtomChip(text) {
    const item = document.createElement("span");
    item.className = "atom-chip";
    item.textContent = text;
    return item;
  }

  function setElementProperty(element, key, value) {
    if (element[key] !== value) element[key] = value;
  }

  function setTextContent(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function stripExtension(name) {
    return String(name).replace(/\.[^.]+$/, "");
  }

  window.CP2KUtils = {
    clamp: clamp,
    downloadText: downloadText,
    escapeHtml: escapeHtml,
    formatCoord: formatCoord,
    formatNumber: formatNumber,
    formatSliderNumber: formatSliderNumber,
    inlineText: inlineText,
    renderAtomChip: renderAtomChip,
    setElementProperty: setElementProperty,
    setTextContent: setTextContent,
    stripExtension: stripExtension,
  };
})();
