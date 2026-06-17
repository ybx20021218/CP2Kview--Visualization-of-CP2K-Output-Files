(function () {
  "use strict";

  function createOutAnalysisData(options) {
    const settings = options || {};
    const utils = settings.utils || {};
    const i18n = settings.i18n || window.CP2KI18n || {};
    const formatNumber = utils.formatNumber || function (value) { return String(value); };
    const analysisPanelDataCache = new WeakMap();
    const analysisLookupCache = new WeakMap();
    const scfConvergencePointCache = new WeakMap();

    function analysisPanelData(analysis) {
      const language = currentLanguage();
      var cached = analysisPanelDataCache.get(analysis);
      if (cached && cached.language === language) return cached.data;

      const warningRecords = buildWarningRecords(analysis);
      const data = {
        overviewRows: buildAnalysisOverviewRows(analysis),
        optimizationItems: buildOptimizationItems(analysis),
        mdRows: buildMdRows(analysis),
        atomRows: buildAtomRows(analysis),
        fileItems: buildFileItems(analysis),
        parameterItems: buildParameterItems(analysis),
        cellStressRows: buildCellStressRows(analysis),
        timingRows: buildTimingRows(analysis),
        warningRecords: warningRecords,
        warningGroups: groupWarningRecords(warningRecords),
      };
      analysisPanelDataCache.set(analysis, { language: language, data: data });
      return data;
    }

    function buildAnalysisOverviewRows(analysis) {
      return [
        ["End status", analysis.normalEnd ? "Normal" : analysis.aborted ? "Aborted" : "Unknown", analysis.normalEnd ? "ok" : "warn"],
        ["Lines", String(analysis.lineCount || 0)],
        ["CP2K version", metaValue(analysis, "cp2kVersion")],
        ["Run type", metaValue(analysis, "runType")],
        ["Project", metaValue(analysis, "projectName")],
        ["QS method", metaValue(analysis, "qsMethod")],
        ["XC", metaValue(analysis, "xcFunctional")],
        ["Cutoff", metaValue(analysis, "cutoff")],
        ["Relative cutoff", metaValue(analysis, "relCutoff")],
        ["Energy points", String(analysis.energies.length)],
        ["SCF", `${analysis.scfRuns.length} runs / ${analysis.scf.length} records`],
        ["Optimization steps", String(analysis.optimization.steps.length)],
        ["MD steps", String(analysis.md.steps.length)],
        ["Warnings/errors", `${analysis.warnings.length} / ${analysis.errors.length}`, analysis.errors.length ? "warn" : ""],
      ].filter(([, value]) => value !== "");
    }

    function buildOptimizationItems(analysis) {
      const items = [];
      if (analysis.optimization.optimizer) {
        items.push({ key: "Optimizer", value: analysis.optimization.optimizer, line: null });
      }
      items.push({ key: "Converged", value: analysis.optimization.converged ? "Yes" : "Not detected", line: null, className: analysis.optimization.converged ? "ok" : "" });
      analysis.optimization.steps.slice(-10).forEach((step) => {
        items.push({
          key: "Step " + step.step,
          line: step.line,
          value: [
            step.energy ? "E " + formatNumber(step.energy.value) : "",
            step.maxStep ? "MaxStep " + formatNumber(step.maxStep.value) : "",
            step.rmsStep ? "RMSStep " + formatNumber(step.rmsStep.value) : "",
            step.maxGradient ? "MaxGrad " + formatNumber(step.maxGradient.value) : "",
            step.rmsGradient ? "RMSGrad " + formatNumber(step.rmsGradient.value) : "",
          ].filter(Boolean).join("  ") || "L" + step.line,
        });
      });
      return items;
    }

    function buildMdRows(analysis) {
      return analysis.md.steps.slice(-12).map((step) => [
        `Step ${step.step}`,
        [
          step.time ? `t ${formatNumber(step.time.value)} fs` : "",
          step.temperature ? `T ${formatNumber(step.temperature.value)} K` : "",
          step.kinetic ? `Ek ${formatNumber(step.kinetic.value)}` : "",
          step.potential ? `Ep ${formatNumber(step.potential.value)}` : "",
          step.conserved ? `Cons ${formatNumber(step.conserved.value)}` : "",
        ].filter(Boolean).join("  ") || `L${step.line}`,
      ]);
    }

    function buildAtomRows(analysis) {
      const rows = [];
      if (analysis.atoms.count !== null) rows.push(["Total atoms", String(analysis.atoms.count)]);
      analysis.atoms.kinds.forEach((kind) => {
        rows.push([
          kind.name,
          [
            kind.element ? uiText("analysis.element", "元素 {value}", { value: kind.element }) : "",
            kind.count !== null ? `${kind.count} atoms` : "",
            kind.basis ? uiText("analysis.basis", "基组 {value}", { value: kind.basis }) : "",
            kind.potential ? uiText("analysis.potential", "赝势 {value}", { value: kind.potential }) : "",
          ].filter(Boolean).join("  ") || `L${kind.line}`,
        ]);
      });
      return rows;
    }

    function buildFileItems(analysis) {
      return analysis.files.slice(0, 20).map(function (item) {
        return {
          key: "L" + item.line,
          line: item.line,
          value: item.label + ": " + item.value,
        };
      });
    }

    function buildParameterItems(analysis) {
      const grouped = analysis.parameters.reduce((total, item) => {
        if (!total[item.section]) total[item.section] = [];
        total[item.section].push(item);
        return total;
      }, {});
      return Object.entries(grouped).flatMap(function ([section, records]) {
        return records.slice(0, 10).map(function (item) {
          return {
            key: section + " L" + item.line,
            line: item.line,
            value: item.key + (item.value ? ": " + item.value : ""),
          };
        });
      });
    }

    function buildCellStressRows(analysis) {
      return [
        ...analysis.cells.slice(-8).map((item) => `L${item.line} ${item.text}`),
        ...analysis.forces.slice(-8).map((item) => `L${item.line} ${item.text}`),
        ...analysis.stress.slice(-8).map((item) => `L${item.line} ${item.text}`),
      ];
    }

    function buildTimingRows(analysis) {
      return analysis.timings.slice(-16).map((item) => [
        `L${item.line}`,
        `${item.label} calls=${item.calls} values=${item.values.map(formatNumber).join(" ")}`,
      ]);
    }

    function buildWarningRecords(analysis) {
      return [
        ...analysis.errors.map(function (item) { return { type: "ERROR", line: item.line, text: item.text }; }),
        ...analysis.warnings.map(function (item) { return { type: "WARNING", line: item.line, text: item.text }; }),
      ];
    }

    function groupWarningRecords(records) {
      const map = new Map();
      records.forEach(function (record) {
        const key = record.type + "\n" + normalizeWarningText(record.text);
        if (!map.has(key)) {
          map.set(key, { type: record.type, text: record.text, records: [] });
        }
        map.get(key).records.push(record);
      });
      return Array.from(map.values()).sort(function (a, b) {
        const rank = function (group) { return group.type === "ERROR" ? 0 : 1; };
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return a.records[0].line - b.records[0].line;
      });
    }

    function normalizeWarningText(text) {
      return String(text || "")
        .replace(/\s+/g, " ")
        .replace(/\bL\d+\b/g, "L#")
        .trim();
    }

    function metaValue(analysis, key) {
      return analysis.metadata && analysis.metadata[key] ? analysis.metadata[key].value : "";
    }

    function currentEnergyBreakdown(analysis, context) {
      const settings = context || {};
      const active = settings.active || null;
      const frame = settings.frame || null;
      const stepNumber = settings.stepNumber;
      if (active && active.linkedOutId && frame && frame.energyBreakdown) return frame.energyBreakdown;

      if (stepNumber !== null && stepNumber !== undefined) {
        var lookup = analysisLookup(analysis);
        var step = lookup.optStepByNumber.get(stepNumber);
        if (step && step.energyBreakdown) return step.energyBreakdown;
        var byStep = lookup.energyBreakdownByStep.get(stepNumber);
        if (byStep) return byStep;
      }

      return (analysis.energyBreakdowns || [])[0] || null;
    }

    function currentScfBlock(analysis, context) {
      const settings = context || {};
      const active = settings.active || null;
      const frame = settings.frame || null;
      const stepNumber = settings.stepNumber;
      if (active && active.linkedOutId && frame && frame.scfBlock) return frame.scfBlock;

      if (stepNumber !== null && stepNumber !== undefined) {
        var lookup = analysisLookup(analysis);
        var step = lookup.optStepByNumber.get(stepNumber);
        if (step && step.scfBlock) return step.scfBlock;
        var byStep = lookup.scfBlockByOptStep.get(stepNumber);
        if (byStep) return byStep;
      }

      return (analysis.scfBlocks || [])[0] || null;
    }

    function analysisLookup(analysis) {
      var cached = analysisLookupCache.get(analysis);
      if (cached) return cached;
      var lookup = {
        optStepByNumber: new Map(),
        energyBreakdownByStep: new Map(),
        scfBlockByOptStep: new Map(),
      };
      (analysis.optimization.steps || []).forEach(function (step) {
        lookup.optStepByNumber.set(step.step, step);
      });
      (analysis.energyBreakdowns || []).forEach(function (block) {
        if (block.step !== null && block.step !== undefined) {
          lookup.energyBreakdownByStep.set(block.step, block);
        }
      });
      (analysis.scfBlocks || []).forEach(function (block) {
        if (block.optStep !== null && block.optStep !== undefined) {
          lookup.scfBlockByOptStep.set(block.optStep, block);
        }
      });
      analysisLookupCache.set(analysis, lookup);
      return lookup;
    }

    function energyBreakdownRows(block) {
      if (!block || !block.values) return [];
      return ["overlap", "self", "coreHamiltonian", "hartree", "xc", "total"]
        .map(function (key) { return block.values[key]; })
        .filter(Boolean);
    }

    function scfConvergenceText(block) {
      if (block.converged === false) return "  NOT converged";
      if (block.converged === true) return "  converged";
      return "";
    }

    function scfConvergencePoints(block) {
      if (!block || !block.iterations) return [];
      var cached = scfConvergencePointCache.get(block);
      if (cached) return cached;
      cached = block.iterations
        .map(function (row) {
          return {
            frame: row.step,
            value: Number(row.convergence),
            line: row.line,
            totalEnergy: row.totalEnergy,
            change: row.change,
            updateMethod: row.updateMethod,
          };
        })
        .filter(function (point) { return Number.isFinite(point.value); });
      scfConvergencePointCache.set(block, cached);
      return cached;
    }

    function currentLanguage() {
      return i18n.getLanguage ? i18n.getLanguage() : "zh";
    }

    function uiText(key, fallback, values) {
      return i18n.text ? i18n.text(key, fallback, values) : fallback;
    }

    return {
      analysisPanelData: analysisPanelData,
      currentEnergyBreakdown: currentEnergyBreakdown,
      currentScfBlock: currentScfBlock,
      energyBreakdownRows: energyBreakdownRows,
      scfConvergencePoints: scfConvergencePoints,
      scfConvergenceText: scfConvergenceText,
    };
  }

  window.CP2KOutAnalysisData = {
    create: createOutAnalysisData,
  };
})();
