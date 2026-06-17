(function () {
  "use strict";

  const STORAGE_KEY = "cp2k-view-language";
  const DEFAULT_LANGUAGE = "zh";
  const SUPPORTED_LANGUAGES = ["zh", "en"];

  const dictionaries = {
    en: {
      "app.tagline": "Created by bxyao | ybx20021218@163.com",
      "toolbar.reset": "Reset layout",
      "toolbar.reset.title": "Reset the three-column layout",
      "toolbar.open": "Open",
      "toolbar.open.title": "Open a structure file or CP2K output file",
      "toolbar.exportFrame.title": "Export current frame as XYZ coordinates",
      "toolbar.clear.title": "Clear project",
      "toolbar.language.title": "Switch language",
      "project.files": "Project files",
      "project.empty": "No files",
      "multiwfn.path": "Program path",
      "multiwfn.command": "Generate command",
      "multiwfn.waiting": "Waiting for a structure file",
      "layout.left": "Resize left project panel",
      "layout.right": "Resize right analysis panel",
      "viewer.canvas": "Structure viewer",
      "viewer.empty": "No structure loaded",
      "viewer.drop": "Drop files to load structure",
      "viewer.openHint": "Open an xyz / inp / out / restart file",
      "frame.prev": "Previous frame",
      "frame.play": "Play/Pause",
      "frame.next": "Next frame",
      "frame.speed.title": "Playback speed",
      "frame.speed": "Speed",
      "frame.atomSize.title": "Atom sphere size",
      "frame.atomSize": "Sphere",
      "frame.atomLabels.title": "Always show element labels",
      "frame.atomLabels": "Element",
      "atom.status": "Click an atom to inspect element, type, and coordinates",
      "inspector.tabs": "Information panels",
      "panel.structure": "Structure",
      "panel.measure": "Measure",
      "panel.analysis": "Output Analysis",
      "panel.input": "INP Structure",
      "panel.popout": "Open separately",
      "stats.file": "File",
      "stats.type": "Type",
      "stats.atoms": "Atoms",
      "stats.frames": "Frames",
      "measure.save": "Keep current value",
      "measure.exportCsv": "Export CSV",
      "measure.savedTitle": "Saved measurements",
      "measure.savedEmpty": "No saved measurements",
      "measure.selectionEmpty": "No atoms selected",
      "measure.trend": "Trend chart",
      "analysis.empty": "No OUT file results",
      "analysis.overview": "Overview",
      "analysis.linkedOutput": "Structure-OUT Link",
      "analysis.outFile": "OUT file",
      "analysis.linkedStructure": "Linked structure",
      "analysis.linkMode": "Link mode",
      "analysis.energySource": "Energy source",
      "analysis.warning": "Warning",
      "analysis.xyzFrame1": "XYZ frame 1",
      "analysis.noEnergyCurrentFrame": "No OUT energy breakdown matched for the current frame",
      "analysis.noEnergy": "No OUT energy breakdown found",
      "analysis.locateOut": "Locate OUT source",
      "analysis.locateEnergyTitle": "Expand OUT source and locate this energy block",
      "analysis.noScfCurrentFrame": "No SCF iteration block matched for the current frame",
      "analysis.noScf": "No SCF iteration table found",
      "analysis.scfChart": "SCF convergence plot",
      "analysis.scfChartTitle": "Open the full SCF convergence plot for the current frame",
      "analysis.locateScfTitle": "Expand OUT source and locate the full SCF block for the current frame",
      "analysis.matchedScf": "Matched current-frame SCF: {count} iterations, iteration {first} -> {last}, latest convergence = {value}",
      "analysis.noWarnings": "No warning/error",
      "analysis.atomTypes": "Atom types",
      "analysis.cellStress": "Cell / Stress",
      "analysis.timing": "Timing",
      "analysis.element": "element {value}",
      "analysis.basis": "basis {value}",
      "analysis.potential": "potential {value}",
      "locator.outTitle": "OUT Source Locator",
      "locator.scfTitle": "SCF Source Locator",
      "locator.noOut": "No locatable OUT source",
      "locator.noScf": "No locatable SCF source",
      "locator.closeTitle": "Close OUT source locator",
      "locator.close": "Close",
      "locator.noRecords": "No records",
      "locator.locate": "Locate",
      "locator.locateLineTitle": "Locate OUT source L{line}",
      "input.empty": "No inp/restart structure",
      "input.editor": "Edit INP source",
      "input.export": "Export INP",
      "input.insert": "Insert",
      "input.selectSnippetRequired": "Select a statement to insert",
      "input.inserted": "Inserted: {name}",
      "input.customSnippet": "Custom statements",
      "input.savedLocal": "Saved locally: {name}",
      "input.delete": "Delete",
      "input.confirmDeleteSnippet": "Delete custom statement \"{name}\"? This cannot be undone.",
      "input.deleted": "Deleted: {name}",
      "input.snippetHelp": "Custom statements are saved in this browser and can be inserted or deleted",
      "input.close": "Close",
      "input.customTitle": "Custom title",
      "input.titlePlaceholder": "Example: OT settings / SCF convergence parameters",
      "input.formatLabel": "INP input file format",
      "input.save": "Save",
      "input.editingLocal": "Editing local statement: {name}",
      "input.saveLibrary": "Save to local custom statement library",
      "input.fillSnippet": "Please enter INP statement content",
      "input.selectCustom": "Select a custom statement",
      "input.noCustom": "No custom statements",
      "input.defaultSnippetName": "Custom statement",
      "input.compare": "INP File Comparison",
      "input.compareEmpty": "Load two INP/restart files to compare",
      "input.enlargeCompare": "Enlarge comparison",
      "input.saveLeft": "Save left",
      "input.saveRight": "Save right",
      "input.chooseTwo": "Select two INP/restart files",
      "input.diffChanged": "Found {count} differences; showing full files side by side",
      "input.diffSame": "The two INP files are identical",
      "input.actions": "Actions",
      "input.addToLeft": "Add to left",
      "input.deleteRight": "Delete right",
      "input.addToRight": "Add to right",
      "input.deleteLeft": "Delete left",
      "input.replaceLeftWithRight": "Replace left with right",
      "input.replaceRightWithLeft": "Replace right with left",
      "chart.title": "Optimization Chart",
      "chart.min.title": "Select the minimum point in the current chart",
      "chart.min": "Minimum",
      "chart.reset.title": "Reset all views",
      "chart.reset": "Reset",
      "chart.close.title": "Close",
      "chart.optimizationTitle": "Optimization Charts",
      "chart.trendTitle": "Trend Chart",
      "chart.noData": "No data",
      "optimization.expandAll": "Expand all charts",
      "optimization.expandAll.title": "View all optimization charts side by side in a separate window",
      "optimization.hint": "Drag to zoom | Double-click to reset",
      "optimization.status": "Select an optimization step to show values here",
      "optimization.noStep": "No optimization step data",
      "structure.composition": "Composition",
      "structure.outLines": "OUT lines",
      "structure.runType": "Run type",
      "structure.linkedOut": "Linked OUT",
      "structure.outEnergyBlock": "OUT energy block",
      "structure.warning": "Warning",
      "structure.outEnergy": "OUT energy",
      "atom.typeInline": "type {type}",
      "atom.typeSuffix": ", type {type}",
      "atom.selected": "Selected #{index} {label}{type}, coordinates {x}, {y}, {z} Å",
      "measurement.distance": "Bond length",
      "measurement.angle": "Bond angle",
      "measurement.dihedral": "Dihedral",
      "measurement.trendEmpty": "Select 2/3/4 atoms to build a trend",
      "measurement.currentFrame": "current frame",
      "measurement.saveTitle": "Keep current measurement value",
      "measurement.saveDisabledTitle": "Select 2/3/4 atoms to keep",
      "measurement.frame": "Frame",
      "measurement.outFrame": "OUT frame",
      "measurement.linkedOut": "linked OUT {name}",
      "measurement.outEnergyBlock": "OUT energy block {block}",
      "measurement.delete": "Delete",
      "measurement.deleteAria": "Delete {kind} {label}",
      "files.noReadable": "No readable file selected",
      "files.deleteAria": "Delete {name}",
      "parser.unknownStructure": "Unrecognized structure file",
      "parser.xyzFailed": "XYZ parsing failed",
      "parser.restartCoord": "CP2K restart coordinates",
      "parser.inputCoord": "CP2K input coordinates",
      "parser.noCoord": "No coordinates found in &COORD",
      "parser.outNoCoordinates": "OUT file parsed; no displayable coordinate block found",
      "parser.pdbCoord": "PDB coordinates",
      "parser.pdbFailed": "PDB parsing failed",
      "parser.cifCoord": "CIF Cartesian coordinates",
      "parser.cifFailed": "CIF parsing failed",
      "parser.outCoordinateBlock": "OUT coordinate block #{index}",
      "link.warning": "XYZ has {frameCount} frames; OUT starts from item {offset}, with {count} linkable data items",
      "multiwfn.commandComment": "Copy the command above and run it in a terminal",
      "panel.collapse": "Collapse",
    },
  };

  const dynamicTextExact = {
    "未识别为结构文件": "parser.unknownStructure",
    "XYZ 解析失败": "parser.xyzFailed",
    "CP2K restart 坐标": "parser.restartCoord",
    "CP2K input 坐标": "parser.inputCoord",
    "未在 &COORD 中找到坐标": "parser.noCoord",
    "OUT 文件已解析；未发现可显示的坐标块": "parser.outNoCoordinates",
    "PDB 坐标": "parser.pdbCoord",
    "PDB 解析失败": "parser.pdbFailed",
    "CIF 笛卡尔坐标": "parser.cifCoord",
    "CIF 解析失败": "parser.cifFailed",
  };

  const dynamicTextPatterns = [
    {
      regex: /^OUT 坐标块 #(\d+)$/,
      key: "parser.outCoordinateBlock",
      values: function (match) {
        return { index: match[1] };
      },
    },
    {
      regex: /^XYZ 共 (\d+) 帧，OUT 从第 (\d+) 项开始，共 (\d+) 项可关联数据$/,
      key: "link.warning",
      values: function (match) {
        return { frameCount: match[1], offset: match[2], count: match[3] };
      },
    },
  ];

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function getLanguage() {
    try {
      return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE);
    } catch (error) {
      return DEFAULT_LANGUAGE;
    }
  }

  function setLanguage(language) {
    const current = getLanguage();
    const next = normalizeLanguage(language);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // localStorage may be unavailable for some file:// browser settings.
    }
    apply(next);
    if (next !== current) {
      window.dispatchEvent(new CustomEvent("cp2k-language-change", { detail: { language: next } }));
    }
  }

  function t(key, language) {
    const lang = normalizeLanguage(language || getLanguage());
    if (lang === DEFAULT_LANGUAGE) return "";
    return dictionaries[lang] && dictionaries[lang][key] ? dictionaries[lang][key] : "";
  }

  function text(key, fallback, values, language) {
    const lang = normalizeLanguage(language || getLanguage());
    const template = lang === DEFAULT_LANGUAGE ? fallback : t(key, lang) || fallback;
    return interpolate(template, values);
  }

  function dynamicText(value, language) {
    if (value === null || value === undefined) return value;
    const original = String(value);
    const lang = normalizeLanguage(language || getLanguage());
    if (lang === DEFAULT_LANGUAGE) return original;

    const exactKey = dynamicTextExact[original];
    if (exactKey) return text(exactKey, original, null, lang);

    for (const rule of dynamicTextPatterns) {
      const match = original.match(rule.regex);
      if (match) return text(rule.key, original, rule.values(match), lang);
    }
    return original;
  }

  function interpolate(template, values) {
    if (!values) return template;
    return String(template).replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match;
    });
  }

  function apply(language) {
    const lang = normalizeLanguage(language || getLanguage());
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.querySelectorAll("[data-i18n], [data-i18n-title], [data-i18n-aria], [data-i18n-placeholder]").forEach(function (element) {
      applyElement(element, lang);
    });
    syncLanguageControl(lang);
  }

  function applyElement(element, language) {
    applyText(element, language);
    applyAttribute(element, language, "title", "i18nTitle", "i18nOriginalTitle");
    applyAttribute(element, language, "aria-label", "i18nAria", "i18nOriginalAria");
    applyAttribute(element, language, "placeholder", "i18nPlaceholder", "i18nOriginalPlaceholder");
  }

  function applyText(element, language) {
    const key = element.dataset.i18n;
    if (!key) return;
    if (!Object.prototype.hasOwnProperty.call(element.dataset, "i18nOriginalText")) {
      element.dataset.i18nOriginalText = element.textContent;
    }
    element.textContent = language === DEFAULT_LANGUAGE ? element.dataset.i18nOriginalText : t(key, language) || element.dataset.i18nOriginalText;
  }

  function applyAttribute(element, language, attributeName, keyName, originalName) {
    const key = element.dataset[keyName];
    if (!key) return;
    if (!Object.prototype.hasOwnProperty.call(element.dataset, originalName)) {
      element.dataset[originalName] = element.getAttribute(attributeName) || "";
    }
    const original = element.dataset[originalName];
    const translated = language === DEFAULT_LANGUAGE ? original : t(key, language) || original;
    if (translated) element.setAttribute(attributeName, translated);
    else element.removeAttribute(attributeName);
  }

  function initLanguageControl() {
    const control = document.getElementById("languageSelect");
    if (!control) return;
    control.value = getLanguage();
    control.addEventListener("change", function () {
      setLanguage(control.value);
    });
  }

  function syncLanguageControl(language) {
    const control = document.getElementById("languageSelect");
    if (control && control.value !== language) control.value = language;
  }

  function init() {
    initLanguageControl();
    apply(getLanguage());
  }

  window.CP2KI18n = {
    apply: apply,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    dynamicText: dynamicText,
    text: text,
    t: t,
  };

  init();
})();
