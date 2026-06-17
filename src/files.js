(function () {
  "use strict";

  function createFileManager(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const parseFile = settings.parseFile;
    const setTextContent = utils.setTextContent || function (element, value) {
      if (element) element.textContent = value;
    };

    async function importFiles(files) {
      const readableFiles = readableImportFiles(files);
      if (!readableFiles.length) {
        if (!state.datasets.length) showNoReadableFilesMessage();
        if (state.datasets.length) finishFileImport();
        return;
      }

      for (const file of readableFiles) {
        await importReadableFile(file);
      }

      finishFileImport();
    }

    function readableImportFiles(files) {
      return Array.from(files || []).filter(function (file) {
        return file && file.size >= 0;
      });
    }

    function showNoReadableFilesMessage() {
      if (els.viewerHud) els.viewerHud.textContent = uiText("files.noReadable", "未选择任何可读取的文件");
    }

    async function importReadableFile(file) {
      const parsed = prepareImportedDataset(file, await file.text());
      replaceExistingDatasetForImport(parsed);
      state.datasets.push(parsed);
    }

    function prepareImportedDataset(file, text) {
      const parsed = parseFile(file.name, text);
      parsed.id = importedDatasetId();
      parsed.size = file.size;
      return parsed;
    }

    function importedDatasetId() {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function finishFileImport() {
      activatePreferredImportedDataset();
      callbacks.linkSingleOutToStructure();
      callbacks.render();
    }

    function replaceExistingDatasetForImport(parsed) {
      const replacementType = importReplacementType(parsed);
      if (!replacementType) return;
      for (let index = state.datasets.length - 1; index >= 0; index--) {
        const existing = state.datasets[index];
        if (!shouldReplaceDatasetOnImport(replacementType, existing)) continue;
        removeExistingDatasetForImport(index);
        return;
      }
    }

    function removeExistingDatasetForImport(index) {
      const existing = state.datasets[index];
      if (!existing) return;
      callbacks.forgetSavedMeasurementsForDataset(existing.id);
      state.datasets.splice(index, 1);
    }

    function importReplacementType(dataset) {
      if (dataset.frames.length > 0 && !dataset.tree) return "structure";
      if (dataset.analysis) return "out";
      return "";
    }

    function shouldReplaceDatasetOnImport(replacementType, existing) {
      if (replacementType === "structure") return existing.frames.length && existing.type !== "out";
      if (replacementType === "out") return existing.analysis;
      return false;
    }

    function activatePreferredImportedDataset() {
      const target = preferredStructureDataset() || state.datasets[0] || null;
      if (!target) return;
      state.activeId = target.id;
      callbacks.resetFrameViewState();
    }

    function preferredStructureDataset() {
      return state.datasets.find(function (dataset) {
        return dataset.frames.length && !dataset.tree;
      }) || null;
    }

    function renderFileList() {
      setTextContent(els.fileCount, String(state.datasets.length));
      const nextKey = fileListRenderKey();
      if (nextKey === state.fileListKey) return;
      state.fileListKey = nextKey;

      if (!state.datasets.length) {
        renderEmptyFileList();
        return;
      }

      renderDatasetFileList();
    }

    function fileListRenderKey() {
      return currentLanguage() + "::" + state.datasets.map(function (dataset) {
        return [
          dataset.id,
          dataset.id === state.activeId ? "active" : "",
          dataset.name,
          dataset.type,
          dataset.frames.length,
        ].join("|");
      }).join("||");
    }

    function renderEmptyFileList() {
      els.fileList.className = "file-list empty";
      setTextContent(els.fileList, uiText("project.empty", "暂无文件"));
    }

    function renderDatasetFileList() {
      els.fileList.className = "file-list";
      els.fileList.replaceChildren(...state.datasets.map(renderFileRow));
    }

    function renderFileRow(dataset) {
      const row = document.createElement("div");
      row.className = `file-item${dataset.id === state.activeId ? " active" : ""}`;
      row.addEventListener("click", function () {
        callbacks.setActive(dataset.id);
      });
      row.append(renderFileItemInfo(dataset), renderFileDeleteButton(dataset));
      return row;
    }

    function renderFileItemInfo(dataset) {
      const info = document.createElement("span");
      info.className = "file-item-info";
      const name = document.createElement("strong");
      name.textContent = dataset.name;
      const meta = document.createElement("span");
      meta.textContent = fileMetaText(dataset);
      info.append(name, meta);
      return info;
    }

    function renderFileDeleteButton(dataset) {
      const del = document.createElement("button");
      del.className = "file-item-del";
      del.type = "button";
      del.setAttribute("aria-label", uiText("files.deleteAria", "删除 {name}", { name: dataset.name }));
      del.innerHTML = "&#x2715;";
      del.title = "Remove file from project";
      del.addEventListener("click", function (event) {
        event.stopPropagation();
        removeDataset(dataset.id);
      });
      return del;
    }

    function fileMetaText(dataset) {
      const type = dataset.type.toUpperCase();
      return dataset.frames.length ? `${type} - ${dataset.frames.length} frames` : `${type} - report`;
    }

    function removeDataset(id) {
      const index = state.datasets.findIndex(function (dataset) {
        return dataset.id === id;
      });
      if (index === -1) return;
      state.datasets.splice(index, 1);
      if (state.activeId === id) {
        activateDatasetAfterRemoval();
      }
      finishDatasetRemoval(id);
    }

    function activateDatasetAfterRemoval() {
      const target = preferredStructureDataset() || state.datasets[0] || null;
      state.activeId = target ? target.id : null;
      callbacks.resetFrameViewState();
    }

    function finishDatasetRemoval(id) {
      callbacks.forgetSavedMeasurementsForDataset(id);
      callbacks.linkSingleOutToStructure();
      callbacks.render();
    }

    return {
      importFiles: importFiles,
      preferredStructureDataset: preferredStructureDataset,
      removeDataset: removeDataset,
      renderFileList: renderFileList,
    };

    function currentLanguage() {
      return i18n.getLanguage ? i18n.getLanguage() : "zh";
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }
  }

  window.CP2KFiles = {
    create: createFileManager,
  };
})();
