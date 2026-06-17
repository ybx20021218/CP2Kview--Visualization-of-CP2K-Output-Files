(function () {
  "use strict";

  function createFrameControls(options) {
    const settings = options || {};
    const state = settings.state;
    const els = settings.els || {};
    const viewer = settings.viewer;
    const utils = settings.utils || {};
    const callbacks = settings.callbacks || {};
    const formatSliderNumber = utils.formatSliderNumber || function (value) { return String(value); };
    const setElementProperty = utils.setElementProperty || function (element, key, value) {
      if (element) element[key] = value;
    };
    const setTextContent = utils.setTextContent || function (element, value) {
      if (element) element.textContent = value;
    };

    function activeDataset() {
      return callbacks.activeDataset ? callbacks.activeDataset() : null;
    }

    function activeFrame() {
      return callbacks.activeFrame ? callbacks.activeFrame() : null;
    }

    function setFrame(index, optionsForFrame) {
      const renderOptions = optionsForFrame || {};
      const dataset = activeDataset();
      if (!hasFrames(dataset)) return;
      state.frameIndex = clampFrameIndex(dataset, index);
      if (!renderOptions.preserveSelectedOptStep) {
        syncSelectedOptStepFromActiveFrame();
      }
      callbacks.renderFrameOnly(renderOptions);
    }

    function hasFrames(dataset) {
      return Boolean(dataset && dataset.frames.length);
    }

    function clampFrameIndex(dataset, index) {
      const max = dataset.frames.length - 1;
      return Math.max(0, Math.min(max, index));
    }

    function syncSelectedOptStepFromActiveFrame() {
      state.selectedOptStep = optStepForFrame(activeFrame());
    }

    function optStepForFrame(frame) {
      return frame && frame.outStep !== null && frame.outStep !== undefined ? frame.outStep : null;
    }

    function togglePlay() {
      const dataset = activeDataset();
      if (!dataset || dataset.frames.length <= 1) return;
      if (state.playing) {
        stopPlay();
        return;
      }

      startPlay();
    }

    function startPlay() {
      state.playing = true;
      setTextContent(els.playBtn, "\u23f8");
      if (state.timer) window.clearInterval(state.timer);
      state.timer = window.setInterval(advanceFrame, playbackInterval());
    }

    function advanceFrame() {
      const current = activeDataset();
      if (!current || current.frames.length <= 1) return stopPlay();
      state.frameIndex = (state.frameIndex + 1) % current.frames.length;
      syncSelectedOptStepFromActiveFrame();
      callbacks.renderFrameOnly();
    }

    function stopPlay() {
      if (state.timer) window.clearInterval(state.timer);
      state.timer = null;
      state.playing = false;
      setTextContent(els.playBtn, "\u25b6");
    }

    function updatePlaybackSpeed() {
      state.playbackFps = Number(els.speedSlider.value) || 4;
      setTextContent(els.speedValue, `${formatSliderNumber(state.playbackFps)} fps`);
      if (state.playing) startPlay();
    }

    function updateAtomSize() {
      state.atomScale = Number(els.atomSizeSlider.value) || 1;
      viewer.setAtomScale(state.atomScale);
      setTextContent(els.atomSizeValue, `${Math.round(state.atomScale * 100)}%`);
    }

    function updateAtomLabels() {
      state.showAtomLabels = Boolean(els.atomLabelsToggle.checked);
      viewer.setShowLabels(state.showAtomLabels);
    }

    function playbackInterval() {
      return Math.round(1000 / Math.max(1, state.playbackFps));
    }

    function renderFrameControls(dataset, frame) {
      dataset = dataset || activeDataset();
      frame = frame || activeFrame();
      const count = dataset ? dataset.frames.length : 0;
      const disabled = count <= 1;
      setElementProperty(els.prevFrameBtn, "disabled", disabled);
      setElementProperty(els.nextFrameBtn, "disabled", disabled);
      setElementProperty(els.playBtn, "disabled", disabled);
      setElementProperty(els.frameSlider, "disabled", count === 0);
      setElementProperty(els.speedSlider, "disabled", disabled);
      setElementProperty(els.atomSizeSlider, "disabled", count === 0);
      setElementProperty(els.atomLabelsToggle, "disabled", count === 0);
      setElementProperty(els.frameSlider, "max", String(Math.max(0, count - 1)));
      setElementProperty(els.frameSlider, "value", String(state.frameIndex));
      setTextContent(els.frameLabel, count ? `${state.frameIndex + 1} / ${count}` : "0 / 0");
      setTextContent(els.speedValue, `${formatSliderNumber(state.playbackFps)} fps`);
      setTextContent(els.atomSizeValue, `${Math.round(state.atomScale * 100)}%`);
      setElementProperty(els.atomLabelsToggle, "checked", state.showAtomLabels);
      setElementProperty(els.exportFrameBtn, "disabled", !frame);
    }

    return {
      renderFrameControls: renderFrameControls,
      setFrame: setFrame,
      stopPlay: stopPlay,
      syncSelectedOptStepFromActiveFrame: syncSelectedOptStepFromActiveFrame,
      togglePlay: togglePlay,
      updateAtomLabels: updateAtomLabels,
      updateAtomSize: updateAtomSize,
      updatePlaybackSpeed: updatePlaybackSpeed,
    };
  }

  window.CP2KFrameControls = {
    create: createFrameControls,
  };
})();
