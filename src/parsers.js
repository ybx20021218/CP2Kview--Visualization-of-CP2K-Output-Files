(function () {
  "use strict";

  const numberPattern = "[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[Ee][-+]?\\d+)?";
  const numberRegexGlobal = new RegExp(numberPattern, "g");
  const readEnergyRegex = new RegExp(`(?:E|energy)\\s*[=:]\\s*(${numberPattern})`, "i");
  const trailingEnergyValueRegex = new RegExp(`${numberPattern}\\s*(?:a\\.u\\.|hartree|eV|Ry)?\\s*$`, "i");
  const elementPattern = /^[A-Z][a-z]?$/;
  const elementSymbols = [
    "Og", "Ts", "Lv", "Mc", "Fl", "Nh", "Cn", "Rg", "Ds", "Mt", "Hs", "Bh", "Sg", "Db", "Rf",
    "Lr", "No", "Md", "Fm", "Es", "Cf", "Bk", "Cm", "Am", "Pu", "Np", "U", "Pa", "Th", "Ac",
    "Ra", "Fr", "Rn", "At", "Po", "Bi", "Pb", "Tl", "Hg", "Au", "Pt", "Ir", "Os", "Re", "W", "Ta", "Hf",
    "Lu", "Yb", "Tm", "Er", "Ho", "Dy", "Tb", "Gd", "Eu", "Sm", "Pm", "Nd", "Pr", "Ce", "La",
    "Ba", "Cs", "Xe", "I", "Te", "Sb", "Sn", "In", "Cd", "Ag", "Pd", "Rh", "Ru", "Tc", "Mo", "Nb", "Zr",
    "Y", "Sr", "Rb", "Kr", "Br", "Se", "As", "Ge", "Ga", "Zn", "Cu", "Ni", "Co", "Fe", "Mn", "Cr",
    "V", "Ti", "Sc", "Ca", "K", "Ar", "Cl", "S", "P", "Si", "Al", "Mg", "Na", "Ne", "F", "O", "N",
    "C", "B", "Be", "Li", "He", "H",
  ];
  const elementSymbolSet = new Set(elementSymbols);
  const elementSymbolPrefixes = elementSymbols.map((symbol) => [symbol.toUpperCase(), symbol]);
  const normalizedElementCache = new Map();

  const typeByExt = {
    ".xyz": "xyz",
    ".inp": "inp",
    ".restart": "restart",
    ".out": "out",
    ".log": "out",
    ".pdb": "pdb",
    ".cif": "cif",
    ".txt": "text",
  };
  const metadataRules = [
    ["cp2kVersion", /CP2K\|\s+version string:\s*(.+)$/i],
    ["sourceRevision", /CP2K\|\s+source code revision number:\s*(.+)$/i],
    ["compileDate", /CP2K\|\s+source code revision date:\s*(.+)$/i],
    ["startTime", /PROGRAM STARTED AT\s+(.+)$/i],
    ["endTime", /PROGRAM ENDED AT\s+(.+)$/i],
    ["inputFile", /(?:Input file name|input filename)\s*[:=]\s*(.+)$/i],
    ["runType", /GLOBAL\|\s+Run type\s+(.+)$/i],
    ["projectName", /GLOBAL\|\s+Project name\s+(.+)$/i],
    ["printLevel", /GLOBAL\|\s+Print level\s+(.+)$/i],
    ["mpiRanks", /(?:Number of MPI processes|MPI tasks)\s*[:=]?\s*(\d+)/i],
    ["ompThreads", /(?:OpenMP threads|OMP_NUM_THREADS)\s*[:=]?\s*(\d+)/i],
    ["qsMethod", /QS\|\s+Method\s+(.+)$/i],
    ["xcFunctional", /XC\|\s+Exchange-correlation functional\s+(.+)$/i],
    ["cutoff", /MGRID\|\s+Cutoff\s+\[Ry\]\s+(.+)$/i],
    ["relCutoff", /MGRID\|\s+Relative cutoff\s+\[Ry\]\s+(.+)$/i],
    ["basisSetFile", /DFT\|\s+Basis set file name\s+(.+)$/i],
    ["potentialFile", /DFT\|\s+Potential file name\s+(.+)$/i],
    ["charge", /DFT\|\s+Charge\s+(.+)$/i],
    ["multiplicity", /DFT\|\s+Multiplicity\s+(.+)$/i],
    ["poissonSolver", /POISSON\|\s+Poisson solver\s+(.+)$/i],
  ];
  const optimizationMetricRules = [
    ["energy", /OPT\|\s*Total energy \[hartree\]\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["maxStep", /OPT\|\s*Maximum step size\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["maxStepLimit", /OPT\|\s*Convergence limit for maximum step size\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["maxStepConverged", /OPT\|\s*Maximum step size is converged\s+(YES|NO)/i],
    ["rmsStep", /OPT\|\s*RMS step size\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["rmsStepLimit", /OPT\|\s*Convergence limit for RMS step size\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["rmsStepConverged", /OPT\|\s*RMS step size is converged\s+(YES|NO)/i],
    ["maxGradient", /OPT\|\s*Maximum gradient\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["maxGradientLimit", /OPT\|\s*Convergence limit for maximum gradient\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["maxGradientConverged", /OPT\|\s*Maximum gradient is converged\s+(YES|NO)/i],
    ["rmsGradient", /OPT\|\s*RMS gradient\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["rmsGradientLimit", /OPT\|\s*Convergence limit for RMS gradient\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["rmsGradientConverged", /OPT\|\s*RMS gradient is converged\s+(YES|NO)/i],
    ["maxGradient", /Max(?:imum|\.)\s*(?:gradient|force).*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["rmsGradient", /RMS\s*(?:gradient|force).*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["maxStep", /Max(?:imum|\.)\s*step.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["rmsStep", /RMS\s*step.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
  ];
  const scfIterationRowRegex = new RegExp(
    `^(\\d+)\\s+(.+)\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})\\s*$`
  );
  const inputSectionStartRegex = /^&([A-Za-z0-9_]+)\b(.*)$/;
  const inputSectionEndRegex = /^&END\b/i;
  const inputStructureSectionNames = new Set(["COORD", "CELL"]);
  const cellVectorKeys = new Set(["A", "B", "C"]);
  const outputCoordinateHeaderRegex = /ATOMIC COORDINATES/i;
  const outputCoordinateLikeRegex = new RegExp(
    `(?:^|\\s)([A-Z][a-z]?)(?:\\s+\\d+)?\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})(?:\\s|$)`
  );
  const outputCoordinateSkipRegex = /^-+$|Atom|Kind|Element|X\s+Y\s+Z/i;
  const outputCoordinateStopRegex = /^[A-Z ]{8,}:/;
  const outputNormalEndRegex = /PROGRAM ENDED AT|CP2K finished|run completed/i;
  const outputAbortRegex = /ABORT|ABNORMAL PROGRAM TERMINATION|TERMINATED|FAILED/i;
  const outputStepRecordRegex = /(?:GEOMETRY OPTIMIZATION STEP|STEP NUMBER|MD STEP|Informations at step)\s*[:=]?\s*(\d+)/i;
  const outputWarningRegex = /WARNING/i;
  const outputErrorRegex = /ERROR|ABORT|FAILED|NaN|SCF run NOT converged/i;
  const metadataCandidateRegex = /(CP2K\||PROGRAM |GLOBAL\||QS\||XC\||MGRID\||DFT\||POISSON\||Input file|input filename|MPI|OpenMP|OMP_NUM_THREADS)/i;
  const pipeParameterRegex = /^([A-Z][A-Z0-9_ ]{1,18})\|\s+(.+)$/;
  const pipeParameterSplitRegex = /^(.+?)(?:\s{2,}|:\s+|=\s+)(\S.*)$/;
  const fileCandidateRegex = /file/i;
  const fileLineRegex = /(.+?\bfile(?:\s+name)?\b.*?)\s*[:=]?\s+(.+)$/i;
  const atomCandidateRegex = /atom/i;
  const atomCountRegex = /(?:Number of atoms|Total number of atoms)\s*[:=]?\s*(\d+)/i;
  const atomKindCountRegex = /Number of atoms of kind\s+(\S+)\s*[:=]?\s*(\d+)/i;
  const kindStartRegex = /(?:Atomic kind|Kind)\s*[:=]\s*(\S+)/i;
  const kindCountLineRegex = /Number of atoms of kind/i;
  const kindElementRegex = /^Element\s*[:=]\s*(\S+)/i;
  const kindBasisRegex = /^Basis(?: set)?\s*[:=]\s*(.+)$/i;
  const kindPotentialRegex = /^Potential\s*[:=]\s*(.+)$/i;
  const kindAtomCountRegex = /^Number of atoms\s*[:=]\s*(\d+)/i;
  const optimizationCompleteRegex = /GEOMETRY OPTIMIZATION COMPLETED|OPTIMIZATION COMPLETED|GEOMETRY OPTIMIZATION CONVERGED/i;
  const optimizationStepRegexList = [
    /OPT\|\s*Step number\s+(\d+)/i,
    /Informations at step\s*=\s*(\d+)/i,
    /GEOMETRY OPTIMIZATION STEP\s*[:=]?\s*(\d+)/i,
  ];
  const optimizationCandidateRegex = /OPT\||gradient|force|step/i;
  const convergenceLimitRegex = /Convergence limit/i;
  const optEnergySourceRegex = /OPT\|\s*Total energy/i;
  const mdStepRegexList = [
    /MD\|\s+Step(?: number)?\s*[:=]?\s*(\d+)/i,
    /MD STEP\s*[:=]?\s*(\d+)/i,
  ];
  const mdPipeRegex = /^MD\|/i;
  const cellLineCandidateRegex = /CELL\||CELL_TOP\||Unit cell|Volume/i;
  const forceLineCandidateRegex = /(Max\.\s*force|RMS\s*force|SUM OF ATOMIC FORCES|ATOMIC FORCES)/i;
  const stressLineCandidateRegex = /(STRESS|PRESSURE|Virial)/i;
  const timingStartRegex = /T I M I N G|SUBROUTINE\s+CALLS|CP2K\s+timings/i;
  const timingLineRegex = /^([A-Za-z0-9_().\/-]+)\s+(\d+)\s+(.+)$/;
  const timingEndRegex = /The number of warnings|PROGRAM ENDED AT/i;
  const unitRegex = /\b(a\.u\.|hartree|eV|Ry|K|fs|bar|GPa)\b/i;
  const cifTokenRegex = /'[^']*'|"[^"]*"|\S+/g;
  const mdMetricRules = [
    ["time", /MD\|\s+Time.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["temperature", /MD\|\s+Temperature.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["kinetic", /MD\|\s+Kinetic energy.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["potential", /MD\|\s+Potential energy.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ["conserved", /MD\|\s+Conserved quantity.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
  ];
  const energyBreakdownRuleList = buildEnergyBreakdownRules();

  function parseFile(name, text) {
    const ext = (name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
    const type = typeByExt[ext] || "text";

    if (type === "xyz") return parseXYZ(name, text);
    if (type === "inp" || type === "restart") return parseCP2KInput(name, text, type);
    if (type === "out") return parseCP2KOutput(name, text);
    if (type === "pdb") return parsePDB(name, text);
    if (type === "cif") return parseCIF(name, text);

    const xyzLike = parseXYZ(name, text, true);
    if (xyzLike.frames.length) return xyzLike;
    const pdbLike = parsePDB(name, text, true);
    if (pdbLike.frames.length) return pdbLike;
    return {
      name,
      type,
      raw: text,
      frames: [],
      warnings: ["未识别为结构文件"],
    };
  }

  function parseXYZ(name, text, quiet) {
    const lines = textLines(text);
    const frames = [];
    let i = 0;

    while (i < lines.length) {
      while (i < lines.length && !lines[i].trim()) i += 1;
      if (i >= lines.length) break;

      const count = Number.parseInt(lines[i].trim(), 10);
      if (!Number.isFinite(count) || count <= 0) break;

      const comment = (lines[i + 1] || "").trim();
      const atoms = [];
      for (let j = 0; j < count; j += 1) {
        const line = lines[i + 2 + j] || "";
        const atom = parseAtomLine(line, j + 1);
        if (atom) atoms.push(atom);
      }

      if (atoms.length !== count) {
        if (frames.length === 0) break;
      } else {
        frames.push({
          name: `${name} #${frames.length + 1}`,
          comment,
          atoms,
          energy: readEnergy(comment),
          step: frames.length,
        });
      }

      i += count + 2;
    }

    return {
      name,
      type: "xyz",
      raw: text,
      frames,
      warnings: quiet || frames.length ? [] : ["XYZ 解析失败"],
    };
  }

  function parseCP2KInput(name, text, type) {
    const lines = textLines(text);
    const tree = parseInputTree(lines);
    const structure = readInputStructureSections(lines);
    const frames = [];
    const atoms = structure.atoms;
    const cell = structure.cell;

    if (atoms.length) {
      frames.push({
        name,
        comment: type === "restart" ? "CP2K restart 坐标" : "CP2K input 坐标",
        atoms,
        cell,
        step: 0,
      });
    }

    return {
      name,
      type,
      raw: text,
      frames,
      tree,
      warnings: atoms.length ? [] : ["未在 &COORD 中找到坐标"],
    };
  }

  function parseCP2KOutput(name, text) {
    const lines = textLines(text);
    const analysis = analyzeOutput(lines);
    let frames = readOutputCoordinateBlocks(lines);

    if (!frames.length) {
      const xyz = parseXYZ(name, text, true);
      frames = xyz.frames;
    }

    if (analysis.energies.length && frames.length) {
      frames.forEach((frame, index) => {
        const nearby = analysis.energies[Math.min(index, analysis.energies.length - 1)];
        if (nearby) frame.energy = nearby.value;
      });
    }

    return {
      name,
      type: "out",
      raw: text,
      frames,
      analysis,
      warnings: frames.length ? [] : ["OUT 文件已解析；未发现可显示的坐标块"],
    };
  }

  function parsePDB(name, text, quiet) {
    const atoms = [];
    const lines = textLines(text);

    lines.forEach((line) => {
      if (!/^(ATOM  |HETATM)/.test(line)) return;
      const x = Number(line.slice(30, 38));
      const y = Number(line.slice(38, 46));
      const z = Number(line.slice(46, 54));
      if (!isFiniteCoordinate(x, y, z)) return;

      const kind = line.slice(12, 16).trim();
      const element = normalizeElement(line.slice(76, 78).trim()) || normalizePdbElement(kind);
      if (!element) return;
      atoms.push({ index: atoms.length + 1, element, kind: kind || element, x, y, z });
    });

    return {
      name,
      type: "pdb",
      raw: text,
      frames: atoms.length ? [{ name, comment: "PDB 坐标", atoms, step: 0 }] : [],
      warnings: quiet || atoms.length ? [] : ["PDB 解析失败"],
    };
  }

  function parseCIF(name, text, quiet) {
    const lines = textLines(text);
    const atoms = [];

    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim() !== "loop_") continue;
      const headers = [];
      let rowStart = i + 1;
      while (rowStart < lines.length && lines[rowStart].trim().startsWith("_")) {
        headers.push(lines[rowStart].trim());
        rowStart += 1;
      }

      const typeIndex = headers.findIndex((header) => /_atom_site\.type_symbol/i.test(header));
      const labelIndex = headers.findIndex((header) => /_atom_site\.label_atom_id/i.test(header));
      const xIndex = headers.findIndex((header) => /_atom_site\.Cartn_x/i.test(header));
      const yIndex = headers.findIndex((header) => /_atom_site\.Cartn_y/i.test(header));
      const zIndex = headers.findIndex((header) => /_atom_site\.Cartn_z/i.test(header));
      if (xIndex < 0 || yIndex < 0 || zIndex < 0 || (typeIndex < 0 && labelIndex < 0)) continue;

      for (let row = rowStart; row < lines.length; row += 1) {
        const line = lines[row].trim();
        if (!line || line === "loop_" || line.startsWith("_") || line.startsWith("#")) break;
        const parts = tokenizeCifLine(line);
        const element = normalizeElement(parts[typeIndex]) || normalizeElement(parts[labelIndex]);
        const x = Number(stripCifUncertainty(parts[xIndex]));
        const y = Number(stripCifUncertainty(parts[yIndex]));
        const z = Number(stripCifUncertainty(parts[zIndex]));
        if (element && isFiniteCoordinate(x, y, z)) {
          atoms.push({ index: atoms.length + 1, element, kind: parts[labelIndex] || element, x, y, z });
        }
      }
    }

    return {
      name,
      type: "cif",
      raw: text,
      frames: atoms.length ? [{ name, comment: "CIF 笛卡尔坐标", atoms, step: 0 }] : [],
      warnings: quiet || atoms.length ? [] : ["CIF 解析失败"],
    };
  }

  function parseAtomLine(line, index) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) return null;

    for (let i = 0; i < parts.length - 3; i += 1) {
      const element = normalizeElement(parts[i]);
      if (!element) continue;
      const x = Number(parts[i + 1]);
      const y = Number(parts[i + 2]);
      const z = Number(parts[i + 3]);
      if (!isFiniteCoordinate(x, y, z)) continue;

      return {
        index,
        element,
        kind: parts[i],
        x,
        y,
        z,
      };
    }

    return null;
  }

  function parseInputTree(lines) {
    const root = { name: "ROOT", line: 1, children: [], params: [] };
    const stack = [root];

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("!") || line.startsWith("#")) return;

      const sectionStart = inputSectionStartRegex.exec(line);
      if (sectionStart && !inputSectionEndRegex.test(line)) {
        const node = {
          name: sectionStart[1].toUpperCase(),
          suffix: sectionStart[2].trim(),
          line: index + 1,
          children: [],
          params: [],
        };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        return;
      }

      if (inputSectionEndRegex.test(line)) {
        if (stack.length > 1) stack.pop();
        return;
      }

      stack[stack.length - 1].params.push({ line: index + 1, text: line });
    });

    return root;
  }

  function readCoordSection(lines) {
    return readInputStructureSections(lines).atoms;
  }

  function readCellSection(lines) {
    return readInputStructureSections(lines).cell;
  }

  function readInputStructureSections(lines) {
    const atoms = [];
    const cell = {};
    let activeSection = "";
    for (const rawLine of lines) {
      const line = stripComment(rawLine).trim();
      if (!line) continue;

      if (inputSectionEndRegex.test(line)) {
        activeSection = "";
        continue;
      }

      const sectionStart = inputSectionStartRegex.exec(line);
      if (sectionStart) {
        const sectionName = sectionStart[1].toUpperCase();
        activeSection = inputStructureSectionNames.has(sectionName) ? sectionName : activeSection;
        continue;
      }

      if (activeSection === "COORD") {
        const atom = parseAtomLine(line, atoms.length + 1);
        if (atom) atoms.push(atom);
        continue;
      }

      if (activeSection === "CELL") {
        readCellVectorLine(cell, line);
      }
    }

    return { atoms, cell: completeCell(cell) };
  }

  function readCellVectorLine(cell, line) {
    const parts = line.split(/\s+/);
    const key = parts[0].toUpperCase();
    const values = parts.slice(1, 4).map(Number);
    if (cellVectorKeys.has(key) && values.every(Number.isFinite)) {
      cell[key] = values;
    }
  }

  function completeCell(cell) {
    return cell.A && cell.B && cell.C ? cell : null;
  }

  function readOutputCoordinateBlocks(lines) {
    const frames = [];

    for (let i = 0; i < lines.length; i += 1) {
      if (!outputCoordinateHeaderRegex.test(lines[i])) continue;

      const atoms = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const raw = lines[j];
        const line = raw.trim();
        if (!line) {
          if (atoms.length) break;
          continue;
        }
        if (outputCoordinateSkipRegex.test(line)) continue;
        if (outputCoordinateStopRegex.test(line) && atoms.length) break;

        const parsed = parseOutputAtom(line, outputCoordinateLikeRegex, atoms.length + 1);
        if (parsed) {
          atoms.push(parsed);
          continue;
        }
        if (atoms.length && !parsed) break;
      }

      if (atoms.length) {
        frames.push({
          name: `OUT 坐标块 #${frames.length + 1}`,
          comment: lines[i].trim(),
          atoms,
          step: frames.length,
        });
      }
    }

    return frames;
  }

  function parseOutputAtom(line, coordinateLike, index) {
    const parts = line.trim().split(/\s+/);
    for (let i = 0; i < parts.length - 3; i += 1) {
      const element = normalizeElement(parts[i]);
      if (!element) continue;
      const triplet = coordinateTripletAfterElement(parts, i + 1);
      if (triplet) return { index, element, kind: parts[i], x: triplet[0], y: triplet[1], z: triplet[2] };
    }

    const match = line.match(coordinateLike);
    if (!match) return null;
    return {
      index,
      element: normalizeElement(match[1]) || match[1],
      kind: match[1],
      x: Number(match[2]),
      y: Number(match[3]),
      z: Number(match[4]),
    };
  }

  function analyzeOutput(lines) {
    const result = {
      normalEnd: false,
      aborted: false,
      lineCount: lines.length,
      metadata: {},
      parameters: [],
      files: [],
      energies: [],
      energyBreakdowns: [],
      energySource: "",
      scf: [],
      scfBlocks: [],
      scfRuns: [],
      steps: [],
      optimization: { optimizer: null, converged: false, steps: [] },
      md: { steps: [] },
      atoms: { count: null, kinds: [] },
      cells: [],
      forces: [],
      stress: [],
      timings: [],
      warnings: [],
      errors: [],
    };

    let scfState = { active: false, block: null };
    let inTiming = false;
    let currentKind = null;
    let currentOptStep = null;
    let currentMdStep = null;
    let currentEnergyBreakdown = null;
    const parseCaches = {
      kindsByName: new Map(),
      optStepsByNumber: new Map(),
      mdStepsByNumber: new Map(),
    };

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();
      const lineNumber = index + 1;
      if (!line) return;

      if (outputNormalEndRegex.test(line)) result.normalEnd = true;
      if (outputAbortRegex.test(line)) result.aborted = true;

      readMetadata(result, line, lineNumber);
      readPipeParameter(result, line, lineNumber);
      readFiles(result, line, lineNumber);
      readAtomsAndKinds(result, line, lineNumber, parseCaches);
      currentKind = readKindDetails(result, line, lineNumber, currentKind, parseCaches);
      currentEnergyBreakdown = readEnergyBreakdownLine(result, rawLine, lineNumber, currentEnergyBreakdown);
      readEnergyLine(result, line, lineNumber);
      scfState = readScfLine(result, line, lineNumber, scfState);
      currentOptStep = readOptimizationLine(result, line, lineNumber, currentOptStep, parseCaches);
      currentMdStep = readMdLine(result, line, lineNumber, currentMdStep, parseCaches);
      readCellLine(result, line, lineNumber);
      readForceLine(result, line, lineNumber);
      readStressLine(result, line, lineNumber);
      inTiming = readTimingLine(result, line, lineNumber, inTiming);

      const step = outputStepRecordRegex.exec(line);
      if (step) result.steps.push({ line: lineNumber, value: Number(step[1]), text: line });

      if (outputWarningRegex.test(line)) result.warnings.push({ line: lineNumber, text: line });
      if (outputErrorRegex.test(line)) result.errors.push({ line: lineNumber, text: line });
    });

    assignEnergyBreakdownSteps(result);
    assignScfBlockSteps(result);
    return result;
  }

  function readMetadata(result, line, lineNumber) {
    if (!metadataCandidateRegex.test(line)) return;
    metadataRules.some(([key, regex]) => {
      const match = line.match(regex);
      if (!match) return false;
      result.metadata[key] = { line: lineNumber, value: match[1].trim() };
      return true;
    });
  }

  function readPipeParameter(result, line, lineNumber) {
    if (!line.includes("|")) return;
    const match = pipeParameterRegex.exec(line);
    if (!match) return;
    const section = match[1].trim();
    const text = match[2].trim();
    const split = pipeParameterSplitRegex.exec(text);
    result.parameters.push({
      line: lineNumber,
      section,
      key: split ? split[1].trim() : text,
      value: split ? split[2].trim() : "",
      text,
    });
  }

  function readFiles(result, line, lineNumber) {
    if (!fileCandidateRegex.test(line)) return;
    const match = fileLineRegex.exec(line);
    if (match) result.files.push({ line: lineNumber, label: match[1].trim(), value: match[2].trim() });
  }

  function readAtomsAndKinds(result, line, lineNumber, parseCaches) {
    if (!atomCandidateRegex.test(line)) return;
    const count = atomCountRegex.exec(line);
    if (count && result.atoms.count === null) result.atoms.count = Number(count[1]);

    const kindCount = atomKindCountRegex.exec(line);
    if (kindCount) {
      const kind = findOrCreateKind(result, kindCount[1], lineNumber, parseCaches.kindsByName);
      kind.count = Number(kindCount[2]);
    }
  }

  function readKindDetails(result, line, lineNumber, currentKind, parseCaches) {
    const kindStart = kindStartRegex.exec(line);
    if (kindStart && !kindCountLineRegex.test(line)) {
      return findOrCreateKind(result, kindStart[1], lineNumber, parseCaches.kindsByName);
    }

    if (!currentKind) return currentKind;
    const element = kindElementRegex.exec(line);
    const basis = kindBasisRegex.exec(line);
    const potential = kindPotentialRegex.exec(line);
    const count = kindAtomCountRegex.exec(line);
    if (element) currentKind.element = normalizeElement(element[1]) || element[1];
    if (basis) currentKind.basis = basis[1].trim();
    if (potential) currentKind.potential = potential[1].trim();
    if (count) currentKind.count = Number(count[1]);
    return currentKind;
  }

  function findOrCreateKind(result, name, lineNumber, cache) {
    let kind = cache ? cache.get(name) : null;
    if (!kind) kind = result.atoms.kinds.find((item) => item.name === name);
    if (!kind) {
      kind = { line: lineNumber, name, element: normalizeElement(name), count: null, basis: "", potential: "" };
      result.atoms.kinds.push(kind);
    }
    if (cache) cache.set(name, kind);
    return kind;
  }

  function readEnergyLine(result, line, lineNumber) {
    if (!/(ENERGY\||Total energy|Electronic kinetic energy|Dispersion energy|Exchange-correlation energy|Hartree energy)/i.test(line)) {
      return;
    }
    const value = lastNumber(line);
    if (value === null) return;
    const label = line.replace(trailingEnergyValueRegex, "").replace(/\s+/g, " ").trim();
    const unit = readUnit(line);
    result.energies.push({ line: lineNumber, label, value, unit });
  }

  function readEnergyBreakdownLine(result, rawLine, lineNumber, currentBlock) {
    const line = rawLine.trim();
    if (!/energy/i.test(line)) {
      if (currentBlock && currentBlock.complete && lineNumber - currentBlock.lineEnd > 2) return null;
      return currentBlock;
    }

    const rule = energyBreakdownRuleList.find((item) => item.regex.test(line));
    if (!rule) {
      if (currentBlock && currentBlock.complete && lineNumber - currentBlock.lineEnd > 2) return null;
      return currentBlock;
    }

    const match = line.match(rule.regex);
    const valueText = match && match[1] ? match[1] : "";
    const value = Number(valueText);
    const needsNewBlock =
      rule.key === "overlap" ||
      !currentBlock ||
      currentBlock.complete ||
      lineNumber - currentBlock.lineEnd > 12 ||
      Boolean(currentBlock.values[rule.key]);

    if (needsNewBlock) {
      currentBlock = {
        index: result.energyBreakdowns.length + 1,
        lineStart: lineNumber,
        lineEnd: lineNumber,
        complete: false,
        entries: [],
        values: {},
      };
      result.energyBreakdowns.push(currentBlock);
    }

    const entry = {
      key: rule.key,
      label: line.replace(/\s*:\s*[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?\s*$/, "").trim(),
      line: lineNumber,
      text: line,
      value,
      valueText,
    };
    currentBlock.entries.push(entry);
    currentBlock.values[rule.key] = entry;
    currentBlock.lineEnd = lineNumber;
    if (rule.key === "total") currentBlock.complete = true;
    return currentBlock;
  }

  function buildEnergyBreakdownRules() {
    const number = `(${numberPattern})`;
    return [
      { key: "overlap", regex: new RegExp(`^Overlap energy of the core charge distribution\\s*:\\s*${number}\\s*$`, "i") },
      { key: "self", regex: new RegExp(`^Self energy of the core charge distribution\\s*:\\s*${number}\\s*$`, "i") },
      { key: "coreHamiltonian", regex: new RegExp(`^Core Hamiltonian energy\\s*:\\s*${number}\\s*$`, "i") },
      { key: "hartree", regex: new RegExp(`^Hartree energy\\s*:\\s*${number}\\s*$`, "i") },
      { key: "xc", regex: new RegExp(`^Exchange-correlation energy\\s*:\\s*${number}\\s*$`, "i") },
      { key: "total", regex: new RegExp(`^Total(?:\\s+FORCE_EVAL\\s*\\([^)]+\\))?\\s+energy(?:\\s+\\[[^\\]]+\\])?\\s*:\\s*${number}\\s*$`, "i") },
    ];
  }

  function assignEnergyBreakdownSteps(result) {
    const blocks = result.energyBreakdowns || [];
    const steps = result.optimization.steps || [];
    blocks.forEach((block, index) => {
      const step = steps[index] || null;
      if (!step) return;
      block.step = step.step;
      step.energyBreakdown = block;
    });
  }

  function readScfLine(result, line, lineNumber, state) {
    const next = state || { active: false, block: null };
    let active = next.active;
    let block = next.block;
    if (/SCF WAVEFUNCTION OPTIMIZATION|STARTING SELF-CONSISTENT FIELD/i.test(line)) {
      active = true;
      block = createScfBlock(result, lineNumber, line);
    }

    if (/^Step\s+Update method\s+Time\s+Convergence\s+Total energy\s+Change/i.test(line)) {
      if (!block) block = createScfBlock(result, lineNumber, "");
      active = true;
      block.headerLine = lineNumber;
      block.headerText = "Step  Update method  Time  Convergence  Total energy  Change";
      block.lineEnd = lineNumber;
      return { active, block };
    }

    const converged = line.match(/SCF run converged in\s+(\d+)\s+steps/i);
    if (converged) {
      if (!block) block = createScfBlock(result, lineNumber, "");
      block.lineEnd = lineNumber;
      block.statusLine = lineNumber;
      block.converged = true;
      block.steps = Number(converged[1]);
      block.statusText = line;
      result.scfRuns.push({ line: lineNumber, converged: true, steps: Number(converged[1]), text: line, blockIndex: block.index });
      return { active: false, block: null };
    }
    if (/SCF run NOT converged/i.test(line)) {
      if (!block) block = createScfBlock(result, lineNumber, "");
      block.lineEnd = lineNumber;
      block.statusLine = lineNumber;
      block.converged = false;
      block.statusText = line;
      result.scfRuns.push({ line: lineNumber, converged: false, text: line, blockIndex: block.index });
      return { active: false, block: null };
    }

    const convergence = line.match(/(?:convergence|Conv|RMS).*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i);
    if (convergence && /SCF|convergence|Conv|RMS/i.test(line)) {
      result.scf.push({ line: lineNumber, kind: "convergence", value: Number(convergence[1]), text: line });
    }

    if (active && /^\d+\s+/.test(line)) {
      const row = parseScfIterationRow(line, lineNumber);
      if (row) {
        if (/\d/.test(row.updateMethod)) {
          const values = allNumbers(line);
          if (values.length >= 2) {
            result.scf.push({ line: lineNumber, kind: "iteration", iteration: values[0], values: values.slice(1), text: line });
          }
        } else {
          result.scf.push({
            line: lineNumber,
            kind: "iteration",
            iteration: row.step,
            values: [Number(row.time), Number(row.convergence), Number(row.totalEnergy), Number(row.change)],
            text: line,
          });
        }
        if (!block) block = createScfBlock(result, lineNumber, "");
        block.iterations.push(row);
        block.lineStart = Math.min(block.lineStart, block.headerLine || row.line);
        block.lineEnd = row.line;
      } else {
        const values = allNumbers(line);
        if (values.length >= 2) {
          result.scf.push({ line: lineNumber, kind: "iteration", iteration: values[0], values: values.slice(1), text: line });
        }
      }
    }

    if (active && /ENERGY\||Total FORCE_EVAL/i.test(line)) return { active: false, block: null };
    return { active, block };
  }

  function createScfBlock(result, lineNumber, text) {
    const block = {
      index: result.scfBlocks.length + 1,
      lineStart: lineNumber,
      lineEnd: lineNumber,
      headerLine: null,
      headerText: "Step  Update method  Time  Convergence  Total energy  Change",
      startText: text || "",
      iterations: [],
      converged: null,
      steps: null,
      statusLine: null,
      statusText: "",
    };
    result.scfBlocks.push(block);
    return block;
  }

  function parseScfIterationRow(line, lineNumber) {
    const match = line.match(scfIterationRowRegex);
    if (!match) return null;
    return {
      line: lineNumber,
      step: Number(match[1]),
      updateMethod: match[2].trim(),
      time: match[3],
      convergence: match[4],
      totalEnergy: match[5],
      change: match[6],
      text: line,
    };
  }

  function assignScfBlockSteps(result) {
    const blocks = result.scfBlocks || [];
    const steps = result.optimization.steps || [];
    blocks.forEach((block, index) => {
      const step = steps[index] || null;
      if (!step) return;
      block.optStep = step.step;
      step.scfBlock = block;
    });
  }

  function readOptimizationLine(result, line, lineNumber, currentStep, parseCaches) {
    const optimizer = line.match(/Optimization Method\s*=\s*(.+)$/i);
    if (optimizer) result.optimization.optimizer = optimizer[1].trim();
    if (optimizationCompleteRegex.test(line)) {
      result.optimization.converged = true;
    }

    const stepStart = firstRegexMatch(optimizationStepRegexList, line);
    if (stepStart) currentStep = findOrCreateStep(result.optimization.steps, Number(stepStart[1]), lineNumber, parseCaches.optStepsByNumber);

    if (optimizationCandidateRegex.test(line)) {
      for (const [key, regex] of optimizationMetricRules) {
        const match = line.match(regex);
        if (!match) continue;
        if (key === "energy" && !currentStep) continue;
        if (!currentStep) currentStep = findOrCreateStep(result.optimization.steps, result.optimization.steps.length + 1, lineNumber, parseCaches.optStepsByNumber);
        if (convergenceLimitRegex.test(line) && !/Limit$/.test(key)) continue;
        if (/Converged$/i.test(key)) {
          currentStep[key] = { line: lineNumber, value: match[1].toUpperCase() };
        } else {
          currentStep[key] = { line: lineNumber, value: Number(match[1]) };
          if (key === "energy" && optEnergySourceRegex.test(line)) result.energySource = "OPT| Total energy [hartree]";
        }
      }
    }

    return currentStep;
  }

  function readMdLine(result, line, lineNumber, currentStep, parseCaches) {
    const step = firstRegexMatch(mdStepRegexList, line);
    if (step) currentStep = findOrCreateStep(result.md.steps, Number(step[1]), lineNumber, parseCaches.mdStepsByNumber);
    if (!currentStep && mdPipeRegex.test(line)) currentStep = findOrCreateStep(result.md.steps, result.md.steps.length + 1, lineNumber, parseCaches.mdStepsByNumber);
    if (!currentStep) return currentStep;
    if (!mdPipeRegex.test(line)) return currentStep;

    mdMetricRules.forEach(([key, regex]) => {
      const match = line.match(regex);
      if (match) currentStep[key] = { line: lineNumber, value: Number(match[1]) };
    });

    return currentStep;
  }

  function readCellLine(result, line, lineNumber) {
    if (!cellLineCandidateRegex.test(line)) return;
    const values = allNumbers(line);
    if (!values.length) return;
    result.cells.push({ line: lineNumber, text: line, values });
  }

  function readForceLine(result, line, lineNumber) {
    if (!forceLineCandidateRegex.test(line)) return;
    const values = allNumbers(line);
    result.forces.push({ line: lineNumber, text: line, values });
  }

  function readStressLine(result, line, lineNumber) {
    if (!stressLineCandidateRegex.test(line)) return;
    const values = allNumbers(line);
    result.stress.push({ line: lineNumber, text: line, values });
  }

  function readTimingLine(result, line, lineNumber, inTiming) {
    let active = inTiming || timingStartRegex.test(line);
    if (!active) return false;

    const timing = timingLineRegex.exec(line);
    if (timing) {
      const values = allNumbers(timing[3]);
      if (values.length >= 2) {
        result.timings.push({ line: lineNumber, label: timing[1], calls: Number(timing[2]), values, text: line });
      }
    }
    if (timingEndRegex.test(line)) active = false;
    return active;
  }

  function firstRegexMatch(regexList, line) {
    for (const regex of regexList) {
      const match = regex.exec(line);
      if (match) return match;
    }
    return null;
  }

  function findOrCreateStep(steps, stepNumber, lineNumber, cache) {
    let step = cache ? cache.get(stepNumber) : null;
    if (!step) step = steps.find((item) => item.step === stepNumber);
    if (!step) {
      step = { line: lineNumber, step: stepNumber };
      steps.push(step);
    }
    if (cache) cache.set(stepNumber, step);
    return step;
  }

  function readEnergy(comment) {
    const match = readEnergyRegex.exec(comment);
    return match ? Number(match[1]) : null;
  }

  function allNumbers(line) {
    return (String(line).match(numberRegexGlobal) || []).map(Number).filter(Number.isFinite);
  }

  function lastNumber(line) {
    const text = String(line);
    let value = null;
    numberRegexGlobal.lastIndex = 0;
    let match = numberRegexGlobal.exec(text);
    while (match) {
      const number = Number(match[0]);
      if (Number.isFinite(number)) value = number;
      match = numberRegexGlobal.exec(text);
    }
    numberRegexGlobal.lastIndex = 0;
    return value;
  }

  function readUnit(line) {
    const match = unitRegex.exec(String(line));
    return match ? match[1] : "";
  }

  function textLines(text) {
    return String(text || "").replace(/\r/g, "").split("\n");
  }

  function stripComment(line) {
    return line.replace(/(!|#).*$/, "");
  }

  function isFiniteCoordinate(x, y, z) {
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
  }

  function normalizeElement(value) {
    if (!value) return null;
    const cacheKey = String(value);
    if (normalizedElementCache.has(cacheKey)) return normalizedElementCache.get(cacheKey);
    const cleaned = cacheKey.replace(/[^A-Za-z]/g, "");
    if (!cleaned) {
      normalizedElementCache.set(cacheKey, null);
      return null;
    }
    const exact = cleaned[0].toUpperCase() + cleaned.slice(1).toLowerCase();
    if (elementPattern.test(exact) && elementSymbolSet.has(exact)) {
      normalizedElementCache.set(cacheKey, exact);
      return exact;
    }

    const upper = cleaned.toUpperCase();
    const match = elementSymbolPrefixes.find(([upperSymbol]) => upper.startsWith(upperSymbol));
    const normalized = match ? match[1] : null;
    normalizedElementCache.set(cacheKey, normalized);
    return normalized;
  }

  function normalizePdbElement(atomName) {
    const cleaned = String(atomName || "").replace(/[^A-Za-z]/g, "");
    if (!cleaned) return null;
    const upper = cleaned.toUpperCase();
    if (["CL", "BR", "NA", "MG", "AL", "SI", "CA", "FE", "CU", "ZN"].includes(upper.slice(0, 2))) {
      return normalizeElement(upper.slice(0, 2));
    }
    return normalizeElement(upper[0]);
  }

  function coordinateTripletAfterElement(parts, startIndex) {
    const values = [];
    for (let i = startIndex; i < parts.length; i += 1) {
      const value = Number(parts[i]);
      if (Number.isFinite(value)) values.push(value);
    }
    if (values.length < 3) return null;
    if (values.length === 4 && Number.isInteger(values[0]) && values[0] > 0 && values[0] < 10000) {
      return [values[1], values[2], values[3]];
    }
    return [values[0], values[1], values[2]];
  }

  function tokenizeCifLine(line) {
    return line.match(cifTokenRegex)?.map((token) => token.replace(/^['"]|['"]$/g, "")) || [];
  }

  function stripCifUncertainty(value) {
    return String(value || "").replace(/\([^)]+\)$/, "");
  }

  window.CP2KParsers = {
    parseFile,
  };
})();
