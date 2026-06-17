(function () {
  "use strict";

  function createInputPanel(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const parseFile = settings.parseFile || (window.CP2KParsers && window.CP2KParsers.parseFile);
    const downloadText = utils.downloadText || function () {};
    const stripExtension = utils.stripExtension || function (name) {
      return String(name || "").replace(/\.[^.]+$/, "");
    };

    function activeDataset() {
      return callbacks.activeDataset ? callbacks.activeDataset() : null;
    }

    function linkSingleOutToStructure() {
      if (callbacks.linkSingleOutToStructure) callbacks.linkSingleOutToStructure();
    }

    function render() {
      if (callbacks.render) callbacks.render();
    }

    function activateInspectorPage(panelId) {
      if (callbacks.activateInspectorPage) callbacks.activateInspectorPage(panelId);
    }

    function renderInputTree() {
      const dataset = activeInputDataset();
      if (!dataset || !dataset.tree) {
        els.inputTree.textContent = uiText("input.empty", "暂无 inp/restart 结构");
        return;
      }

      els.inputTree.replaceChildren(
        renderInputEditor(dataset),
        renderInputCompare(),
        renderInputTreeView(dataset.tree)
      );
    }

    function renderInputTreeView(treeData) {
      const tree = document.createElement("div");
      tree.className = "input-tree-view";
      tree.replaceChildren(...treeData.children.map(function (node) { return renderTreeNode(node, 0); }));
      return tree;
    }

    function activeInputDataset() {
      const dataset = activeDataset();
      if (dataset && dataset.tree) return dataset;
      return state.datasets.find(function (item) { return item.tree; }) || null;
    }

    function renderInputEditor(dataset) {
      const details = inputPanelDetails("inp-editor", uiText("input.editor", "编辑 INP 原文"));
      const textarea = renderInputEditorTextarea(dataset);
      details.append(
        textarea,
        renderInputSnippetTools(textarea),
        renderInputEditorActions(dataset, textarea)
      );
      return details;
    }

    function renderInputEditorTextarea(dataset) {
      const textarea = document.createElement("textarea");
      textarea.className = "inp-editor-text";
      textarea.spellcheck = false;
      textarea.value = dataset.raw || "";
      return textarea;
    }

    function renderInputEditorActions(dataset, textarea) {
      const actions = document.createElement("div");
      actions.className = "inp-editor-actions";
      actions.append(
        inputEditorStatus(dataset),
        inputPanelButton(uiText("input.export", "导出 INP"), function () {
          downloadText(inputEditedFileName(dataset), textarea.value, "text/plain;charset=utf-8");
        })
      );
      return actions;
    }

    function inputEditorStatus(dataset) {
      const status = document.createElement("span");
      status.textContent = dataset.name;
      return status;
    }

    function inputEditedFileName(dataset) {
      const ext = dataset.type === "restart" ? "restart" : "inp";
      return stripExtension(dataset.name) + "-edited." + ext;
    }

    function inputPanelDetails(className, summaryText) {
      const details = document.createElement("details");
      details.className = className;
      const summary = document.createElement("summary");
      summary.textContent = summaryText;
      details.append(summary);
      return details;
    }

    function renderInputSnippetTools(textarea) {
      const tools = document.createElement("div");
      tools.className = "inp-snippet-tools";

      const select = document.createElement("select");
      refreshInputSnippetSelect(select);

      const insertBtn = inputPanelButton(uiText("input.insert", "插入"), function () {
        const snippet = loadInputSnippets().find(function (item) { return item.name === select.value; });
        if (!snippet) {
          setInputSnippetStatus(tools, uiText("input.selectSnippetRequired", "请选择要插入的语句"));
          return;
        }
        insertTextAtTextarea(textarea, snippet.text);
        setInputSnippetStatus(tools, uiText("input.inserted", "已插入：{name}", { name: snippet.name }));
      });

      const manageBtn = inputPanelButton(uiText("input.customSnippet", "自定义语句"), function () {
        openInputSnippetDialog({
          selectedName: select.value,
          onSave: function (name) {
            refreshInputSnippetSelect(select, name);
            setInputSnippetStatus(tools, uiText("input.savedLocal", "已保存到本地：{name}", { name: name }));
          },
        });
      });

      const deleteBtn = inputPanelButton(uiText("input.delete", "删除"), function () {
        const name = select.value;
        if (!name) return;
        if (!confirmInputSnippetDelete(name)) return;
        saveInputSnippets(loadInputSnippets().filter(function (item) { return item.name !== name; }));
        refreshInputSnippetSelect(select);
        setInputSnippetStatus(tools, uiText("input.deleted", "已删除：{name}", { name: name }));
      });

      const status = document.createElement("span");
      status.className = "inp-snippet-status";
      status.textContent = uiText("input.snippetHelp", "自定义语句保存在本地浏览器，可直接插入或删除");

      tools.append(select, insertBtn, manageBtn, deleteBtn, status);
      return tools;
    }

    function openInputSnippetDialog(options) {
      closeInputSnippetDialog();
      const context = inputSnippetDialogContext(options);

      const overlay = renderInputSnippetDialogOverlay();
      const panel = renderInputSnippetDialogPanel();
      const fields = renderInputSnippetDialogFields(context.existing);
      const footer = renderInputSnippetDialogFooter(context, fields.nameInput, fields.textInput);

      panel.append(
        renderInputSnippetDialogHeader(),
        fields.nameLabel,
        fields.textLabel,
        footer
      );
      overlay.append(panel);
      document.body.append(overlay);
      fields.nameInput.focus();
    }

    function inputSnippetDialogContext(options) {
      const selectedName = options && options.selectedName;
      return {
        options: options || null,
        selectedName: selectedName,
        existing: loadInputSnippets().find(function (item) { return item.name === selectedName; }) || null,
      };
    }

    function renderInputSnippetDialogOverlay() {
      const overlay = document.createElement("div");
      overlay.className = "inp-snippet-dialog";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.addEventListener("click", closeInputSnippetDialog);
      return overlay;
    }

    function renderInputSnippetDialogPanel() {
      const panel = document.createElement("div");
      panel.className = "inp-snippet-dialog-panel";
      panel.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      return panel;
    }

    function renderInputSnippetDialogHeader() {
      const head = document.createElement("div");
      head.className = "inp-snippet-dialog-head";
      const title = document.createElement("strong");
      title.dataset.snippetText = "title";
      title.textContent = uiText("input.customSnippet", "自定义语句");
      const closeBtn = inputPanelButton(uiText("input.close", "关闭"), closeInputSnippetDialog);
      closeBtn.dataset.snippetText = "close";
      head.append(title, closeBtn);
      return head;
    }

    function renderInputSnippetDialogFields(existing) {
      const nameField = renderInputSnippetDialogField({
        label: uiText("input.customTitle", "自定义标题"),
        key: "customTitle",
        tag: "input",
        value: existing ? existing.name : "",
        placeholder: uiText("input.titlePlaceholder", "例如：OT 设置 / SCF 收敛参数"),
        type: "text",
      });
      const textField = renderInputSnippetDialogField({
        label: uiText("input.formatLabel", "INP 输入文件格式"),
        key: "formatLabel",
        tag: "textarea",
        value: existing ? existing.text : "",
        placeholder: "&SCF\n  MAX_SCF 100\n  EPS_SCF 1.0E-6\n&END SCF",
        spellcheck: false,
      });

      return {
        nameLabel: nameField.label,
        nameInput: nameField.control,
        textLabel: textField.label,
        textInput: textField.control,
      };
    }

    function renderInputSnippetDialogField(config) {
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      labelText.dataset.snippetText = config.key;
      labelText.textContent = config.label;
      const control = document.createElement(config.tag);
      if (config.type) control.type = config.type;
      if ("spellcheck" in config) control.spellcheck = config.spellcheck;
      control.value = config.value || "";
      control.placeholder = config.placeholder || "";
      label.append(labelText, control);
      return { label: label, control: control };
    }

    function renderInputSnippetDialogFooter(context, nameInput, textInput) {
      const footer = document.createElement("div");
      footer.className = "inp-snippet-dialog-actions";
      const message = document.createElement("span");
      setInputSnippetDialogMessage(message, context.existing);
      message.textContent = inputSnippetDialogMessage(context.existing);
      const saveBtn = inputPanelButton(uiText("input.save", "保存"), function () {
        saveInputSnippetFromDialog(context, nameInput, textInput, message);
      });
      saveBtn.dataset.snippetText = "save";
      footer.append(message, saveBtn);
      return footer;
    }

    function setInputSnippetDialogMessage(message, existing) {
      message.dataset.snippetText = existing ? "editingLocal" : "saveLibrary";
      message.dataset.snippetName = existing ? existing.name : "";
    }

    function inputSnippetDialogMessage(existing) {
      return existing ? uiText("input.editingLocal", "当前正在编辑本地语句：{name}", { name: existing.name }) : uiText("input.saveLibrary", "保存到本地自定义语句库");
    }

    function saveInputSnippetFromDialog(context, nameInput, textInput, message) {
      const text = textInput.value.trim();
      const name = nameInput.value.trim() || firstSnippetLine(text);
      if (!text) {
        message.dataset.snippetText = "fillSnippet";
        message.dataset.snippetName = "";
        message.textContent = uiText("input.fillSnippet", "请先填写 INP 语句内容");
        textInput.focus();
        return;
      }
      const snippets = loadInputSnippets().filter(function (item) {
        return item.name !== name && item.name !== context.selectedName;
      });
      snippets.push({ name: name, text: textInput.value });
      saveInputSnippets(snippets);
      if (context.options && typeof context.options.onSave === "function") context.options.onSave(name);
      closeInputSnippetDialog();
    }

    function refreshInputSnippetDialogLanguage() {
      const dialog = document.querySelector(".inp-snippet-dialog");
      if (!dialog) return;
      dialog.querySelectorAll("[data-snippet-text]").forEach(function (element) {
        refreshInputSnippetDialogText(element);
      });
    }

    function refreshInputSnippetDialogText(element) {
      const key = element.dataset.snippetText;
      if (key === "title") element.textContent = uiText("input.customSnippet", "自定义语句");
      if (key === "close") element.textContent = uiText("input.close", "关闭");
      if (key === "customTitle") element.textContent = uiText("input.customTitle", "自定义标题");
      if (key === "formatLabel") element.textContent = uiText("input.formatLabel", "INP 输入文件格式");
      if (key === "save") element.textContent = uiText("input.save", "保存");
      if (key === "saveLibrary") element.textContent = uiText("input.saveLibrary", "保存到本地自定义语句库");
      if (key === "fillSnippet") element.textContent = uiText("input.fillSnippet", "请先填写 INP 语句内容");
      if (key === "editingLocal") {
        element.textContent = uiText("input.editingLocal", "当前正在编辑本地语句：{name}", { name: element.dataset.snippetName || "" });
      }
    }

    function closeInputSnippetDialog() {
      const dialog = document.querySelector(".inp-snippet-dialog");
      if (dialog) dialog.remove();
    }

    function loadInputSnippets() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem("cp2k-view-inp-snippets") || "[]");
        return Array.isArray(parsed) ? parsed.filter(function (item) { return item && item.name && typeof item.text === "string"; }) : [];
      } catch (error) {
        return [];
      }
    }

    function saveInputSnippets(snippets) {
      try {
        window.localStorage.setItem("cp2k-view-inp-snippets", JSON.stringify(snippets));
      } catch (error) {
        // Ignore private browsing or storage errors.
      }
    }

    function refreshInputSnippetSelect(select, selectedName) {
      const snippets = loadInputSnippets();
      select.replaceChildren();
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = snippets.length ? uiText("input.selectCustom", "选择自定义语句") : uiText("input.noCustom", "暂无自定义语句");
      select.append(empty);
      snippets.forEach(function (item) {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        select.append(option);
      });
      select.value = selectedName || "";
    }

    function setInputSnippetStatus(container, text) {
      const status = container.querySelector(".inp-snippet-status");
      if (status) status.textContent = text;
    }

    function confirmInputSnippetDelete(name) {
      return window.confirm(uiText("input.confirmDeleteSnippet", "确定删除自定义语句“{name}”吗？此操作不能撤销。", { name: name }));
    }

    function firstSnippetLine(text) {
      return String(text).trim().split(/\n/)[0].slice(0, 36) || uiText("input.defaultSnippetName", "自定义语句");
    }

    function insertTextAtTextarea(textarea, text) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      const before = textarea.value.slice(0, start);
      const after = textarea.value.slice(end);
      const prefix = before && !before.endsWith("\n") ? "\n" : "";
      const suffix = after && !String(text).endsWith("\n") ? "\n" : "";
      const inserted = prefix + text + suffix;
      textarea.value = before + inserted + after;
      const next = start + inserted.length;
      textarea.focus();
      textarea.setSelectionRange(next, next);
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    }

    function applyInputEdit(dataset, text) {
      updateInputDatasetText(dataset, text);
    }

    function renderInputCompare() {
      const datasets = inputDatasets();
      const details = document.createElement("details");
      details.className = "inp-compare";
      details.open = datasets.length >= 2;
      const summary = document.createElement("summary");
      summary.textContent = uiText("input.compare", "INP 文件对比") + (datasets.length >= 2 ? " (" + datasets.length + ")" : "");
      details.append(summary);

      if (datasets.length < 2) {
        const empty = document.createElement("div");
        empty.className = "analysis-empty";
        empty.textContent = uiText("input.compareEmpty", "载入两个 INP/restart 文件后可进行对比");
        details.append(empty);
        return details;
      }

      syncInpCompareSelection(datasets);
      details.append(renderInputCompareControls(datasets));

      const pair = selectedInputComparePair(datasets);
      const left = pair.left;
      const right = pair.right;
      details.append(renderInputCompareActions(left, right));
      details.append(renderInputDiff(left, right));
      return details;
    }

    function inputDatasets() {
      return state.datasets.filter(function (dataset) { return dataset.tree; });
    }

    function syncInpCompareSelection(datasets) {
      if (!datasets.length) {
        state.inpCompareLeftId = null;
        state.inpCompareRightId = null;
        return;
      }
      if (!datasets.some(function (item) { return item.id === state.inpCompareLeftId; })) {
        state.inpCompareLeftId = datasets[0].id;
      }
      if (!datasets.some(function (item) { return item.id === state.inpCompareRightId; }) || state.inpCompareRightId === state.inpCompareLeftId) {
        const fallback = datasets.find(function (item) { return item.id !== state.inpCompareLeftId; });
        state.inpCompareRightId = fallback ? fallback.id : datasets[0].id;
      }
    }

    function renderInputCompareControls(datasets) {
      const controls = document.createElement("div");
      controls.className = "inp-compare-controls";
      controls.append(
        renderInputCompareSelect(datasets, state.inpCompareLeftId, function (id) {
          updateInputCompareSelection("left", id, datasets);
          renderInputTree();
        }),
        renderInputCompareSelect(datasets, state.inpCompareRightId, function (id) {
          updateInputCompareSelection("right", id, datasets);
          renderInputTree();
        })
      );
      return controls;
    }

    function updateInputCompareSelection(side, id, datasets) {
      if (side === "left") {
        state.inpCompareLeftId = id;
        if (state.inpCompareRightId === id) state.inpCompareRightId = firstOtherInputDatasetId(datasets, id);
        return;
      }
      state.inpCompareRightId = id;
      if (state.inpCompareLeftId === id) state.inpCompareLeftId = firstOtherInputDatasetId(datasets, id);
    }

    function firstOtherInputDatasetId(datasets, id) {
      const other = datasets.find(function (item) { return item.id !== id; });
      return other ? other.id : id;
    }

    function selectedInputComparePair(datasets) {
      return {
        left: datasets.find(function (item) { return item.id === state.inpCompareLeftId; }),
        right: datasets.find(function (item) { return item.id === state.inpCompareRightId; }),
      };
    }

    function renderInputCompareSelect(datasets, value, onChange) {
      const select = document.createElement("select");
      datasets.forEach(function (dataset) {
        const option = document.createElement("option");
        option.value = dataset.id;
        option.textContent = dataset.name;
        select.append(option);
      });
      select.value = value;
      select.addEventListener("change", function () {
        onChange(select.value);
      });
      return select;
    }

    function renderInputCompareActions(left, right) {
      const actions = document.createElement("div");
      actions.className = "inp-compare-actions";

      const expandBtn = inputPanelButton(uiText("input.enlargeCompare", "放大对比"), function () {
        openInputCompareWindow();
      });
      actions.append(expandBtn);

      if (left) {
        const saveLeft = inputPanelButton(uiText("input.saveLeft", "保存左侧"), function () {
          saveInputDataset(left);
        });
        actions.append(saveLeft);
      }

      if (right) {
        const saveRight = inputPanelButton(uiText("input.saveRight", "保存右侧"), function () {
          saveInputDataset(right);
        });
        actions.append(saveRight);
      }

      return actions;
    }

    function saveInputDataset(dataset) {
      if (!dataset) return;
      downloadText(inputEditedFileName(dataset), dataset.raw || "", "text/plain;charset=utf-8");
    }

    function renderInputDiff(left, right) {
      const wrap = document.createElement("div");
      wrap.className = "inp-diff";
      if (!left || !right) {
        wrap.textContent = uiText("input.chooseTwo", "请选择两个 INP/restart 文件");
        return wrap;
      }
      const diff = diffInputLines(left.raw || "", right.raw || "");
      wrap.append(
        renderInputDiffMeta(diff),
        renderInputDiffHeader(left, right),
        renderInputDiffRows(left, right, diff)
      );
      return wrap;
    }

    function renderInputDiffMeta(diff) {
      const changed = inputDiffChangedCount(diff);
      const meta = document.createElement("div");
      meta.className = "inp-diff-meta";
      meta.textContent = changed ? uiText("input.diffChanged", "发现 {count} 处差异，左右并排显示完整文件", { count: changed }) : uiText("input.diffSame", "两份 INP 文本一致");
      return meta;
    }

    function inputDiffChangedCount(diff) {
      return diff.filter(function (row) { return row.kind !== "same"; }).length;
    }

    function renderInputDiffHeader(left, right) {
      const header = document.createElement("div");
      header.className = "inp-diff-header";
      header.append(
        inputDiffHeaderCell(left.name),
        inputDiffHeaderCell(uiText("input.actions", "操作")),
        inputDiffHeaderCell(right.name)
      );
      return header;
    }

    function inputDiffHeaderCell(text) {
      const cell = document.createElement("span");
      cell.textContent = text;
      return cell;
    }

    function renderInputDiffRows(left, right, diff) {
      const rows = document.createElement("div");
      rows.className = "inp-diff-rows";
      diff.forEach(function (row, index) {
        rows.append(renderInputDiffRow(left, right, diff, index, row));
      });
      return rows;
    }

    function renderInputDiffRow(left, right, diff, index, row) {
      const item = document.createElement("div");
      item.className = "inp-diff-row diff-" + row.kind;
      item.append(
        renderInputDiffCell(row.leftLine, row.leftText),
        renderInputDiffActions(left, right, diff, index, row),
        renderInputDiffCell(row.rightLine, row.rightText)
      );
      return item;
    }

    function openInputCompareWindow() {
      state.chartModal = { type: "inpCompare", charts: [], activeKey: "inpCompare" };
      setInputCompareChartToolsVisible(false);
      els.chartWindow.hidden = false;
      els.chartWindow.style.width = "min(1180px, calc(100vw - 48px))";
      els.chartWindow.style.height = "min(780px, calc(100vh - 80px))";
      refreshInputCompareWindow();
    }

    function setInputCompareChartToolsVisible(visible) {
      if (els.chartMinBtn) els.chartMinBtn.hidden = !visible;
      if (els.chartResetBtn) els.chartResetBtn.hidden = !visible;
    }

    function refreshInputCompareWindow() {
      if (!state.chartModal || state.chartModal.type !== "inpCompare" || els.chartWindow.hidden) return;
      const datasets = inputDatasets();
      syncInpCompareSelection(datasets);
      const pair = selectedInputComparePair(datasets);
      const left = pair.left;
      const right = pair.right;
      if (!left || !right) return;

      els.chartWindowTitle.textContent = uiText("input.compare", "INP 文件对比");
      els.chartWindowBody.replaceChildren(
        renderInputCompareActions(left, right),
        renderInputDiff(left, right)
      );
      els.chartWindowInfo.textContent = left.name + "  |  " + right.name;
    }

    function renderInputDiffCell(lineNumber, text) {
      const cell = document.createElement("div");
      cell.className = "inp-diff-cell";
      const gutter = document.createElement("span");
      gutter.className = "inp-diff-line";
      gutter.textContent = lineNumber || "";
      const code = document.createElement("code");
      code.textContent = text || "";
      cell.append(gutter, code);
      return cell;
    }

    function renderInputDiffActions(left, right, diff, index, row) {
      const actions = document.createElement("div");
      actions.className = "inp-diff-actions";
      const buttonConfigs = inputDiffActionConfigs(left, right, diff, index, row);
      if (buttonConfigs.length) actions.append(...buttonConfigs.map(renderInputDiffActionButton));
      return actions;
    }

    function inputDiffActionConfigs(left, right, diff, index, row) {
      if (row.kind === "added") {
        return [
          { label: uiText("input.addToLeft", "补到左"), onClick: function () { insertDiffLine(left, row.rightText, insertionLineFromDiff(diff, index, "left")); } },
          { label: uiText("input.deleteRight", "删右"), onClick: function () { deleteDiffLine(right, row.rightLine); } },
        ];
      }
      if (row.kind === "removed") {
        return [
          { label: uiText("input.addToRight", "补到右"), onClick: function () { insertDiffLine(right, row.leftText, insertionLineFromDiff(diff, index, "right")); } },
          { label: uiText("input.deleteLeft", "删左"), onClick: function () { deleteDiffLine(left, row.leftLine); } },
        ];
      }
      if (row.kind === "modified") {
        return [
          { label: uiText("input.replaceLeftWithRight", "用右覆盖左"), onClick: function () { replaceDiffLine(left, row.leftLine, row.rightText); } },
          { label: uiText("input.replaceRightWithLeft", "用左覆盖右"), onClick: function () { replaceDiffLine(right, row.rightLine, row.leftText); } },
        ];
      }
      return [];
    }

    function renderInputDiffActionButton(config) {
      return inputDiffActionButton(config.label, config.onClick);
    }

    function inputDiffActionButton(label, onClick) {
      return inputPanelButton(label, onClick);
    }

    function inputPanelButton(label, onClick) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (typeof onClick === "function") button.addEventListener("click", onClick);
      return button;
    }

    function insertionLineFromDiff(diff, rowIndex, side) {
      const key = side === "left" ? "leftLine" : "rightLine";
      for (let i = rowIndex - 1; i >= 0; i -= 1) {
        if (diff[i][key]) return diff[i][key];
      }
      return 0;
    }

    function insertDiffLine(dataset, text, afterLine) {
      const lines = inputRawLines(dataset);
      lines.splice(Math.max(0, afterLine), 0, text);
      updateInputDatasetText(dataset, lines.join("\n"), { preserveInputCompareScroll: true });
    }

    function deleteDiffLine(dataset, lineNumber) {
      if (!lineNumber) return;
      const lines = inputRawLines(dataset);
      lines.splice(lineNumber - 1, 1);
      updateInputDatasetText(dataset, lines.join("\n"), { preserveInputCompareScroll: true });
    }

    function replaceDiffLine(dataset, lineNumber, text) {
      if (!lineNumber) return;
      const lines = inputRawLines(dataset);
      lines[lineNumber - 1] = text;
      updateInputDatasetText(dataset, lines.join("\n"), { preserveInputCompareScroll: true });
    }

    function inputRawLines(dataset) {
      return String(dataset.raw || "").replace(/\r/g, "").split("\n");
    }

    function updateInputDatasetText(dataset, text, options) {
      const settings = options || {};
      const scrollState = settings.preserveInputCompareScroll ? captureInputCompareScroll() : null;
      const parsed = parseFile(dataset.name, text);
      const id = dataset.id;
      const size = dataset.size;
      Object.assign(dataset, parsed, { id: id, size: size });
      state.fittedDatasetId = null;
      linkSingleOutToStructure();
      render();
      refreshInputCompareWindow();
      activateInspectorPage("inputPanel");
      if (scrollState) restoreInputCompareScroll(scrollState);
    }

    function captureInputCompareScroll() {
      return {
        panel: scrollSnapshot(els.inputTree.querySelector(".inp-diff-rows")),
        window: state.chartModal && state.chartModal.type === "inpCompare"
          ? scrollSnapshot(els.chartWindowBody.querySelector(".inp-diff-rows"))
          : null,
      };
    }

    function scrollSnapshot(element) {
      return element ? { top: element.scrollTop, left: element.scrollLeft } : null;
    }

    function restoreInputCompareScroll(snapshot) {
      if (!snapshot) return;
      restoreScrollSnapshot(els.inputTree.querySelector(".inp-diff-rows"), snapshot.panel);
      if (state.chartModal && state.chartModal.type === "inpCompare") {
        restoreScrollSnapshot(els.chartWindowBody.querySelector(".inp-diff-rows"), snapshot.window);
      }
    }

    function restoreScrollSnapshot(element, snapshot) {
      if (!element || !snapshot) return;
      element.scrollTop = snapshot.top;
      element.scrollLeft = snapshot.left;
    }

    function diffInputLines(leftText, rightText) {
      const left = inputDiffLineRecords(leftText);
      const right = inputDiffLineRecords(rightText);
      const common = commonInputDiffEdges(left, right);
      const rows = [];

      for (let i = 0; i < common.prefix; i += 1) {
        rows.push(diffRow("same", left[i], right[i]));
      }

      const leftMiddle = left.slice(common.prefix, left.length - common.suffix);
      const rightMiddle = right.slice(common.prefix, right.length - common.suffix);
      rows.push(...diffInputLineMiddle(leftMiddle, rightMiddle));

      for (let i = left.length - common.suffix; i < left.length; i += 1) {
        const rightIndex = right.length - left.length + i;
        rows.push(diffRow("same", left[i], right[rightIndex]));
      }

      return coalesceModifiedRows(rows);
    }

    function inputDiffLineRecords(text) {
      return text.replace(/\r/g, "").split("\n").map(function (lineText, index) {
        return { text: lineText, key: lineText.trimEnd(), line: index + 1 };
      });
    }

    function commonInputDiffEdges(left, right) {
      const minLength = Math.min(left.length, right.length);
      var prefix = 0;
      while (prefix < minLength && left[prefix].key === right[prefix].key) {
        prefix += 1;
      }

      var suffix = 0;
      while (
        suffix < minLength - prefix &&
        left[left.length - 1 - suffix].key === right[right.length - 1 - suffix].key
      ) {
        suffix += 1;
      }

      return { prefix: prefix, suffix: suffix };
    }

    function diffInputLineMiddle(left, right) {
      if (!left.length && !right.length) return [];
      if (left.length * right.length > 4000000) return diffInputLinesByIndex(left, right);

      const dp = Array.from({ length: left.length + 1 }, function () { return new Array(right.length + 1).fill(0); });
      for (let i = left.length - 1; i >= 0; i -= 1) {
        for (let j = right.length - 1; j >= 0; j -= 1) {
          dp[i][j] = left[i].key === right[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }

      const rows = [];
      let i = 0;
      let j = 0;
      while (i < left.length || j < right.length) {
        if (i < left.length && j < right.length && left[i].key === right[j].key) {
          rows.push(diffRow("same", left[i], right[j]));
          i += 1;
          j += 1;
        } else if (j < right.length && (i === left.length || dp[i][j + 1] >= dp[i + 1][j])) {
          rows.push(diffRow("added", null, right[j]));
          j += 1;
        } else if (i < left.length) {
          rows.push(diffRow("removed", left[i], null));
          i += 1;
        }
      }
      return rows;
    }

    function diffInputLinesByIndex(left, right) {
      const count = Math.max(left.length, right.length);
      const rows = [];
      for (let i = 0; i < count; i += 1) {
        const a = left[i] || null;
        const b = right[i] || null;
        rows.push(diffRow(a && b && a.key === b.key ? "same" : a && b ? "modified" : a ? "removed" : "added", a, b));
      }
      return rows;
    }

    function coalesceModifiedRows(rows) {
      const result = [];
      for (let i = 0; i < rows.length; i += 1) {
        const current = rows[i];
        const next = rows[i + 1];
        if (current.kind === "removed" && next && next.kind === "added") {
          result.push({
            kind: "modified",
            leftLine: current.leftLine,
            leftText: current.leftText,
            rightLine: next.rightLine,
            rightText: next.rightText,
          });
          i += 1;
        } else {
          result.push(current);
        }
      }
      return result;
    }

    function diffRow(kind, left, right) {
      return {
        kind: kind,
        leftLine: left ? left.line : "",
        leftText: left ? left.text : "",
        rightLine: right ? right.line : "",
        rightText: right ? right.text : "",
      };
    }

    function renderTreeNode(node, depth) {
      const currentDepth = depth || 0;
      const details = document.createElement("details");
      details.className = "input-tree-node";
      details.style.setProperty("--depth", String(currentDepth));
      details.open = isDefaultOpenInputTreeNode(node);
      details.append(renderTreeNodeSummary(node));
      renderTreeNodeParams(node).forEach(function (paramNode) { details.append(paramNode); });
      node.children.forEach(function (child) {
        details.append(renderTreeNode(child, currentDepth + 1));
      });
      return details;
    }

    function renderTreeNodeSummary(node) {
      const summary = document.createElement("summary");
      summary.textContent = `&${node.name}${node.suffix ? ` ${node.suffix}` : ""}  L${node.line}`;
      return summary;
    }

    function renderTreeNodeParams(node) {
      const params = node.params.slice(0, 12).map(renderTreeNodeParam);
      if (node.params.length > 12) params.push(renderTreeNodeOverflowParam(node.params.length - 12));
      return params;
    }

    function renderTreeNodeParam(param) {
      return inputTreeParamCode(`${param.line}: ${param.text}`);
    }

    function renderTreeNodeOverflowParam(count) {
      return inputTreeParamCode(`... ${count} more`);
    }

    function inputTreeParamCode(text) {
      const code = document.createElement("code");
      code.className = "input-param";
      code.textContent = text;
      return code;
    }

    function isDefaultOpenInputTreeNode(node) {
      return node.name === "GLOBAL" || node.name === "FORCE_EVAL" || node.name === "SUBSYS";
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    return {
      closeInputSnippetDialog: closeInputSnippetDialog,
      refreshInputCompareWindow: refreshInputCompareWindow,
      refreshInputSnippetDialogLanguage: refreshInputSnippetDialogLanguage,
      renderInputTree: renderInputTree,
    };
  }

  window.CP2KInputPanel = {
    create: createInputPanel,
  };
})();
