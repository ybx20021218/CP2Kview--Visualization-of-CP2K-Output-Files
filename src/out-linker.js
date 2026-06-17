(function () {
  "use strict";

  function createOutLinker(options) {
    const settings = options || {};
    const state = settings.state;
    const callbacks = settings.callbacks || {};

    function linkSingleOutToStructure() {
      var structures = linkableStructureDatasets();
      var outputs = outputAnalysisDatasets();
      clearStructureOutLinks();
      if (structures.length !== 1 || outputs.length !== 1) return;

      var structure = structures[0];
      var output = outputs[0];
      var linkData = outputLinkData(output);
      var mode = chooseOutputLinkMode(linkData);
      if (!mode) return;

      var offset = chooseOutputLinkOffset(structure.frames, linkData, mode);
      structure.linkedOutId = output.id;
      structure.linkedOutName = output.name;
      structure.linkedStepOffset = offset;
      structure.linkMode = mode;
      structure.linkWarning = outputLinkWarning(structure.frames.length, offset, linkData, mode);

      structure.frames.forEach(function (frame, index) {
        applyFrameOutputLink(frame, frameOutputLink(linkData, index + offset), output.analysis.energySource);
      });
    }

    function linkableStructureDatasets() {
      return state.datasets.filter(function (dataset) {
        return dataset.frames.length && !dataset.tree && dataset.type !== "out";
      });
    }

    function outputAnalysisDatasets() {
      return state.datasets.filter(function (dataset) {
        return dataset.analysis;
      });
    }

    function clearStructureOutLinks() {
      state.datasets.forEach(function (dataset) {
        if (!dataset.frames.length) return;
        dataset.linkedOutId = null;
        dataset.linkedOutName = "";
        dataset.linkedStepOffset = 0;
        dataset.linkWarning = "";
        dataset.linkMode = "";
        dataset.frames.forEach(clearFrameOutputLink);
      });
    }

    function clearFrameOutputLink(frame) {
      frame.outStep = null;
      frame.outEnergyBlock = null;
      frame.energyBreakdown = null;
      frame.scfBlock = null;
      frame.optMetrics = null;
    }

    function outputLinkData(output) {
      var analysis = output.analysis || {};
      return {
        steps: analysis.optimization && analysis.optimization.steps ? analysis.optimization.steps : [],
        energyBreakdowns: analysis.energyBreakdowns || [],
        scfBlocks: analysis.scfBlocks || [],
      };
    }

    function chooseOutputLinkMode(linkData) {
      if (linkData.steps.length) return "optimization";
      if (linkData.energyBreakdowns.length) return "energy";
      if (linkData.scfBlocks.length) return "scf";
      return "";
    }

    function chooseOutputLinkOffset(frames, linkData, mode) {
      if (mode === "optimization") return chooseOptStepOffset(frames, linkData.steps);
      if (mode === "energy") return chooseEnergyBlockOffset(frames, linkData.energyBreakdowns);
      if (mode === "scf") return chooseScfBlockOffset(frames, linkData.scfBlocks);
      return 0;
    }

    function outputLinkCount(linkData, mode) {
      if (mode === "optimization") return linkData.steps.length;
      if (mode === "energy") return linkData.energyBreakdowns.length;
      if (mode === "scf") return linkData.scfBlocks.length;
      return 0;
    }

    function outputLinkWarning(frameCount, offset, linkData, mode) {
      var linkedCount = outputLinkCount(linkData, mode);
      if (frameCount + offset <= linkedCount) return "";
      return "XYZ 共 " + frameCount + " 帧，OUT 从第 " + offset + " 项开始，共 " + Math.max(0, linkedCount - offset) + " 项可关联数据";
    }

    function frameOutputLink(linkData, index) {
      var step = linkData.steps[index] || null;
      var energyBlock = step && step.energyBreakdown ? step.energyBreakdown : linkData.energyBreakdowns[index] || null;
      var scfBlock = step && step.scfBlock ? step.scfBlock : linkData.scfBlocks[index] || null;
      return {
        step: step,
        energyBlock: energyBlock,
        scfBlock: scfBlock,
      };
    }

    function applyFrameOutputLink(frame, link, energySource) {
      frame.outStep = link.step ? link.step.step : null;
      frame.outEnergyBlock = link.energyBlock ? link.energyBlock.index : null;
      frame.energyBreakdown = link.energyBlock;
      frame.scfBlock = link.scfBlock;
      frame.optMetrics = link.step ? summarizeOptStep(link.step, energySource || "OPT| Total energy [hartree]", link.energyBlock) : null;
      if (frame.optMetrics && Number.isFinite(frame.optMetrics.energy)) frame.energy = frame.optMetrics.energy;
      if (link.energyBlock && link.energyBlock.values && link.energyBlock.values.total && Number.isFinite(link.energyBlock.values.total.value)) {
        frame.energy = link.energyBlock.values.total.value;
      }
    }

    function chooseOptStepOffset(frames, steps) {
      return chooseEnergyAlignedOffset(frames, steps, function (step) {
        return step && step.energy ? step.energy.value : null;
      });
    }

    function chooseEnergyBlockOffset(frames, blocks) {
      return chooseEnergyAlignedOffset(frames, blocks, function (block) {
        return block && block.values && block.values.total ? block.values.total.value : null;
      });
    }

    function chooseEnergyAlignedOffset(frames, items, valueForItem) {
      var maxOffset = Math.min(5, Math.max(0, items.length - frames.length));
      var candidates = Array.from({ length: maxOffset + 1 }, function (_, i) { return i; });
      if (!candidates.length) return 0;
      var scored = candidates.map(function (offset) {
        var score = 0;
        var count = 0;
        for (var i = 0; i < Math.min(8, frames.length); i++) {
          var frameEnergy = frames[i] ? frames[i].energy : null;
          var itemEnergy = valueForItem(items[i + offset]);
          if (Number.isFinite(frameEnergy) && Number.isFinite(itemEnergy)) {
            score += Math.abs(frameEnergy - itemEnergy);
            count += 1;
          }
        }
        return { offset: offset, score: count ? score / count : Number.POSITIVE_INFINITY };
      });
      scored.sort(function (a, b) { return a.score - b.score; });
      if (Number.isFinite(scored[0].score)) return scored[0].offset;
      return items.length === frames.length + 1 ? 1 : 0;
    }

    function chooseScfBlockOffset(frames, blocks) {
      return blocks.length === frames.length + 1 ? 1 : 0;
    }

    function summarizeOptStep(step, energySource, energyBlock) {
      return {
        step: step.step,
        energy: metricValue(step.energy),
        energySource: energySource,
        energyBreakdown: summarizeEnergyBreakdown(energyBlock || step.energyBreakdown),
        metrics: {
          maxStep: metricGroup(step.maxStep, step.maxStepLimit, step.maxStepConverged),
          rmsStep: metricGroup(step.rmsStep, step.rmsStepLimit, step.rmsStepConverged),
          maxGradient: metricGroup(step.maxGradient, step.maxGradientLimit, step.maxGradientConverged),
          rmsGradient: metricGroup(step.rmsGradient, step.rmsGradientLimit, step.rmsGradientConverged),
        },
      };
    }

    function summarizeEnergyBreakdown(block) {
      if (!block) return null;
      return {
        index: block.index,
        lineStart: block.lineStart,
        lineEnd: block.lineEnd,
        entries: callbacks.energyBreakdownRows ? callbacks.energyBreakdownRows(block) : [],
      };
    }

    function metricGroup(value, limit, converged) {
      return {
        value: metricValue(value),
        limit: metricValue(limit),
        converged: converged && typeof converged.value === "string" ? converged.value : "",
      };
    }

    function metricValue(metric) {
      return metric && Number.isFinite(metric.value) ? metric.value : null;
    }

    return {
      linkSingleOutToStructure: linkSingleOutToStructure,
    };
  }

  window.CP2KOutLinker = {
    create: createOutLinker,
  };
})();
