(function () {
  "use strict";

  function createOutLocator(options) {
    const settings = options || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const inlineText = utils.inlineText || function (text) {
      return document.createTextNode(text);
    };
    const rawLineCache = new WeakMap();

    function renderOutputLocatorSection(outputDataset, block, options) {
      const sectionSettings = options || {};
      const title = sectionSettings.title || uiText("locator.outTitle", "OUT 原文定位");
      const summaryText = block ? title + " (L" + block.lineStart + ")" : title;
      const details = renderAnalysisDetails("analysis-section out-locator-section", summaryText, false);
      details.id = sectionSettings.id || "outLocatorSection";
      const linePrefix = details.id + "-line-";

      if (!outputDataset || !outputDataset.raw || !block) {
        details.append(renderAnalysisEmpty(sectionSettings.empty || uiText("locator.noOut", "暂无可定位的 OUT 原文")));
        return details;
      }

      const lines = rawLinesForDataset(outputDataset);
      const start = Math.max(1, block.lineStart - 2);
      const end = Math.min(lines.length, block.lineEnd + 2);
      details.append(
        renderOutLocatorTools("L" + block.lineStart + "-L" + block.lineEnd, function () {
          details.open = false;
        }),
        createOutSnippet(lines, start, end, block.lineStart, block.lineEnd, linePrefix)
      );
      return details;
    }

    function revealEnergyBlock(lineStart) {
      revealOutputLocator("outLocatorSection", lineStart);
    }

    function revealScfBlock(lineStart) {
      revealOutputLocator("scfLocatorSection", lineStart);
    }

    function revealOutputLocator(sectionId, lineStart) {
      const section = document.getElementById(sectionId);
      if (section) section.open = true;
      const target = document.getElementById(sectionId + "-line-" + lineStart);
      flashOutLine(target);
    }

    function outputLocateButton(label, title, onClick) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "energy-locate-btn";
      button.title = title;
      button.textContent = label;
      button.addEventListener("click", onClick);
      return button;
    }

    function renderOutLocatorTools(labelText, onClose) {
      const tools = document.createElement("div");
      tools.className = "out-locator-tools";
      const label = document.createElement("span");
      label.textContent = labelText;
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "out-locator-close";
      closeBtn.title = uiText("locator.closeTitle", "关闭 OUT 原文定位");
      closeBtn.textContent = uiText("locator.close", "关闭");
      closeBtn.addEventListener("click", onClose);
      tools.append(label, closeBtn);
      return tools;
    }

    function renderLocatableRowsSection(title, items, outputDataset, idPrefix) {
      const details = renderAnalysisDetails("analysis-section locatable-section", title + " (" + items.length + ")", false);

      if (!items.length) {
        details.append(renderAnalysisEmpty(uiText("locator.noRecords", "暂无记录")));
        return details;
      }

      const grid = document.createElement("dl");
      grid.className = "analysis-grid locatable-grid";
      items.forEach(function (item, index) {
        grid.append(...renderLocatableRow(details, item, outputDataset, idPrefix + "-" + index));
      });
      details.append(grid);
      return details;
    }

    function renderLocatableRow(section, item, outputDataset, locatorId) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = item.key;
      if (item.className) dd.className = item.className;
      dd.append(inlineText(item.value || "-"));
      const locate = inlineOutLocateButton(outputDataset, item.line, function () {
        showInlineOutLocator(section, outputDataset, item.line, locatorId);
      });
      if (locate) dd.append(locate);
      return [dt, dd];
    }

    function showInlineOutLocator(section, outputDataset, lineNumber, idPrefix) {
      if (!section || !outputDataset || !outputDataset.raw || !lineNumber) return;
      section.open = true;
      var existing = section.querySelector(".inline-out-locator");
      if (existing) existing.remove();

      const lines = rawLinesForDataset(outputDataset);
      const start = Math.max(1, lineNumber - 2);
      const end = Math.min(lines.length, lineNumber + 2);
      const wrap = document.createElement("div");
      wrap.className = "inline-out-locator";

      wrap.append(
        renderOutLocatorTools("OUT L" + lineNumber, function () {
          wrap.remove();
        }),
        createOutSnippet(lines, start, end, lineNumber, lineNumber, idPrefix + "-line-")
      );
      section.append(wrap);

      const target = document.getElementById(idPrefix + "-line-" + lineNumber);
      flashOutLine(target);
    }

    function rawLinesForDataset(dataset) {
      var cached = rawLineCache.get(dataset);
      if (cached) return cached;
      var lines = String(dataset.raw || "").replace(/\r/g, "").split("\n");
      rawLineCache.set(dataset, lines);
      return lines;
    }

    function createOutSnippet(lines, start, end, targetStart, targetEnd, idPrefix) {
      const pre = document.createElement("pre");
      pre.className = "out-snippet";
      for (let lineNo = start; lineNo <= end; lineNo += 1) {
        pre.append(renderOutSnippetLine(lines, lineNo, targetStart, targetEnd, idPrefix));
      }
      return pre;
    }

    function renderOutSnippetLine(lines, lineNo, targetStart, targetEnd, idPrefix) {
      const row = document.createElement("div");
      row.className = "out-line";
      row.id = idPrefix + lineNo;
      if (lineNo >= targetStart && lineNo <= targetEnd) row.classList.add("target");
      const number = document.createElement("span");
      number.className = "out-line-number";
      number.textContent = String(lineNo);
      const text = document.createElement("code");
      text.textContent = lines[lineNo - 1] || "";
      row.append(number, text);
      return row;
    }

    function flashOutLine(target) {
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("flash");
      window.setTimeout(function () {
        target.classList.remove("flash");
      }, 1300);
    }

    function inlineOutLocateButton(outputDataset, lineNumber, onClick) {
      if (!outputDataset || !outputDataset.raw || !lineNumber) return null;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inline-locate-btn";
      button.textContent = uiText("locator.locate", "定位");
      button.title = uiText("locator.locateLineTitle", "定位到 OUT 原文 L{line}", { line: lineNumber });
      button.addEventListener("click", onClick);
      return button;
    }

    function renderAnalysisDetails(className, summaryText, open) {
      if (callbacks.renderAnalysisDetails) return callbacks.renderAnalysisDetails(className, summaryText, open);
      const details = document.createElement("details");
      details.className = className;
      details.open = Boolean(open);
      const summary = document.createElement("summary");
      summary.textContent = summaryText;
      details.append(summary);
      return details;
    }

    function renderAnalysisEmpty(text, className) {
      if (callbacks.renderAnalysisEmpty) return callbacks.renderAnalysisEmpty(text, className);
      const empty = document.createElement("div");
      empty.className = className || "analysis-empty";
      empty.textContent = text;
      return empty;
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    return {
      inlineOutLocateButton: inlineOutLocateButton,
      outputLocateButton: outputLocateButton,
      renderLocatableRowsSection: renderLocatableRowsSection,
      renderOutputLocatorSection: renderOutputLocatorSection,
      revealEnergyBlock: revealEnergyBlock,
      revealScfBlock: revealScfBlock,
      showInlineOutLocator: showInlineOutLocator,
    };
  }

  window.CP2KOutLocator = {
    create: createOutLocator,
  };
})();
