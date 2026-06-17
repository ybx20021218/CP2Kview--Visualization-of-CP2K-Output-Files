(function () {
  "use strict";

  function createSavedMeasurements(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const callbacks = settings.callbacks || {};
    const i18n = settings.i18n || window.CP2KI18n || {};

    function activeDataset() {
      return callbacks.activeDataset ? callbacks.activeDataset() : null;
    }

    function activeFrame() {
      return callbacks.activeFrame ? callbacks.activeFrame() : null;
    }

    function updateSaveMeasureButton() {
      const canSave = Boolean(state.currentMeasurement && activeFrame());
      if (!els.saveMeasureBtn) return;
      els.saveMeasureBtn.disabled = !canSave;
      els.saveMeasureBtn.title = canSave ? uiText("measurement.saveTitle", "保留当前测量值") : uiText("measurement.saveDisabledTitle", "选择 2/3/4 个原子后可保留");
    }

    function saveCurrentMeasurement() {
      const dataset = activeDataset();
      const frame = activeFrame();
      const measurement = state.currentMeasurement;
      if (!dataset || !frame || !measurement) return;
      state.savedMeasurements.unshift(savedMeasurementRecord(dataset, frame, measurement));
      renderSavedMeasurements();
    }

    function savedMeasurementRecord(dataset, frame, measurement) {
      return {
        id: savedMeasurementId(),
        datasetId: dataset.id,
        datasetName: dataset.name,
        datasetType: dataset.type,
        kind: measurement.kind,
        kindText: callbacks.measurementKindLabel(measurement.kind),
        label: measurement.label,
        indices: measurement.indices.slice(),
        value: measurement.value,
        unit: measurement.unit,
        text: measurement.text,
        frameIndex: state.frameIndex,
        frameCount: dataset.frames.length,
        linkedOutName: dataset.linkedOutName || "",
        outStep: frame.outStep,
        outEnergyBlock: frame.outEnergyBlock,
        frameLabel: callbacks.measurementFrameLabel(dataset, frame, state.frameIndex),
      };
    }

    function savedMeasurementId() {
      return `measure-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function handleSavedMeasurementClick(event) {
      const button = event.target.closest(".saved-measure-delete");
      if (!button || !els.savedMeasureList || !els.savedMeasureList.contains(button)) return;
      const id = button.dataset.measureId;
      state.savedMeasurements = state.savedMeasurements.filter(function (item) {
        return item.id !== id;
      });
      renderSavedMeasurements();
    }

    function renderSavedMeasurements() {
      if (!els.savedMeasureList) return;
      if (!state.savedMeasurements.length) {
        renderEmptySavedMeasurements();
        return;
      }
      els.savedMeasureList.className = "saved-measure-list";
      els.savedMeasureList.replaceChildren.apply(
        els.savedMeasureList,
        state.savedMeasurements.map(renderSavedMeasurementItem)
      );
    }

    function renderEmptySavedMeasurements() {
      els.savedMeasureList.className = "saved-measure-list empty";
      els.savedMeasureList.textContent = uiText("measure.savedEmpty", "暂无保留测量");
    }

    function renderSavedMeasurementItem(item) {
      const row = document.createElement("div");
      row.className = "saved-measure-item";

      const main = document.createElement("div");
      main.className = "saved-measure-main";

      const title = document.createElement("div");
      title.className = "saved-measure-title";
      const kindText = callbacks.measurementKindLabel ? callbacks.measurementKindLabel(item.kind) : item.kindText;
      title.textContent = `${kindText} ${item.label}`;

      const value = document.createElement("div");
      value.className = "saved-measure-value";
      value.textContent = `${callbacks.formatMeasurementValue(item.value, item.kind)} ${item.unit}`;

      const meta = document.createElement("div");
      meta.className = "saved-measure-meta";
      meta.textContent = `${item.datasetName} | ${savedMeasurementFrameLabel(item)}`;

      const del = document.createElement("button");
      del.className = "saved-measure-delete";
      del.type = "button";
      del.dataset.measureId = item.id;
      del.title = uiText("measurement.delete", "删除");
      del.setAttribute("aria-label", uiText("measurement.deleteAria", "删除 {kind} {label}", { kind: kindText, label: item.label }));
      del.innerHTML = "&#x2715;";

      main.append(title, value, meta);
      row.append(main, del);
      return row;
    }

    function savedMeasurementFrameLabel(item) {
      if (typeof item.frameIndex !== "number" || typeof item.frameCount !== "number") {
        return displayText(item.frameLabel || "");
      }
      const prefix = item.datasetType === "out" ? uiText("measurement.outFrame", "OUT 帧") : uiText("measurement.frame", "帧");
      const parts = [`${prefix} ${item.frameIndex + 1}/${Math.max(1, item.frameCount)}`];
      if (item.linkedOutName) parts.push(uiText("measurement.linkedOut", "关联 OUT {name}", { name: item.linkedOutName }));
      if (item.outStep !== null && item.outStep !== undefined) parts.push(`OPT step ${item.outStep}`);
      if (item.outEnergyBlock !== null && item.outEnergyBlock !== undefined) {
        parts.push(uiText("measurement.outEnergyBlock", "OUT 能量块 {block}", { block: item.outEnergyBlock }));
      }
      return parts.join(" | ");
    }

    function displayText(value) {
      return i18n.dynamicText ? i18n.dynamicText(value) : value;
    }

    function forgetSavedMeasurementsForDataset(datasetId) {
      state.savedMeasurements = state.savedMeasurements.filter(function (item) {
        return item.datasetId !== datasetId;
      });
    }

    return {
      forgetSavedMeasurementsForDataset: forgetSavedMeasurementsForDataset,
      handleSavedMeasurementClick: handleSavedMeasurementClick,
      renderSavedMeasurements: renderSavedMeasurements,
      saveCurrentMeasurement: saveCurrentMeasurement,
      updateSaveMeasureButton: updateSaveMeasureButton,
    };

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }
  }

  window.CP2KSavedMeasurements = {
    create: createSavedMeasurements,
  };
})();
