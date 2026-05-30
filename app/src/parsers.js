(function () {
  "use strict";

  const numberPattern = "[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[Ee][-+]?\\d+)?";
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
    const lines = text.replace(/\r/g, "").split("\n");
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
    const lines = text.replace(/\r/g, "").split("\n");
    const tree = parseInputTree(lines);
    const frames = [];
    const atoms = readCoordSection(lines);
    const cell = readCellSection(lines);

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
    const lines = text.replace(/\r/g, "").split("\n");
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
    const lines = text.replace(/\r/g, "").split("\n");

    lines.forEach((line) => {
      if (!/^(ATOM  |HETATM)/.test(line)) return;
      const x = Number(line.slice(30, 38));
      const y = Number(line.slice(38, 46));
      const z = Number(line.slice(46, 54));
      if (![x, y, z].every(Number.isFinite)) return;

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
    const lines = text.replace(/\r/g, "").split("\n");
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
        if (element && [x, y, z].every(Number.isFinite)) {
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
      if (![x, y, z].every(Number.isFinite)) continue;

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

      const sectionStart = line.match(/^&([A-Za-z0-9_]+)\b(.*)$/);
      if (sectionStart && !/^&END\b/i.test(line)) {
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

      if (/^&END\b/i.test(line)) {
        if (stack.length > 1) stack.pop();
        return;
      }

      stack[stack.length - 1].params.push({ line: index + 1, text: line });
    });

    return root;
  }

  function readCoordSection(lines) {
    const atoms = [];
    let inCoord = false;

    for (const rawLine of lines) {
      const line = stripComment(rawLine).trim();
      if (/^&COORD\b/i.test(line)) {
        inCoord = true;
        continue;
      }
      if (inCoord && /^&END\b/i.test(line)) break;
      if (!inCoord || !line) continue;

      const atom = parseAtomLine(line, atoms.length + 1);
      if (atom) atoms.push(atom);
    }

    return atoms;
  }

  function readCellSection(lines) {
    let inCell = false;
    const cell = {};

    for (const rawLine of lines) {
      const line = stripComment(rawLine).trim();
      if (/^&CELL\b/i.test(line)) {
        inCell = true;
        continue;
      }
      if (inCell && /^&END\b/i.test(line)) break;
      if (!inCell || !line) continue;

      const parts = line.split(/\s+/);
      const key = parts[0].toUpperCase();
      const values = parts.slice(1, 4).map(Number);
      if (["A", "B", "C"].includes(key) && values.every(Number.isFinite)) {
        cell[key] = values;
      }
    }

    return cell.A && cell.B && cell.C ? cell : null;
  }

  function readOutputCoordinateBlocks(lines) {
    const frames = [];
    const coordinateHeader = /ATOMIC COORDINATES/i;
    const coordinateLike = new RegExp(
      `(?:^|\\s)([A-Z][a-z]?)(?:\\s+\\d+)?\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})(?:\\s|$)`
    );

    for (let i = 0; i < lines.length; i += 1) {
      if (!coordinateHeader.test(lines[i])) continue;

      const atoms = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const raw = lines[j];
        const line = raw.trim();
        if (!line) {
          if (atoms.length) break;
          continue;
        }
        if (/^\-+$/.test(line) || /Atom|Kind|Element|X\s+Y\s+Z/i.test(line)) continue;
        if (/^[A-Z ]{8,}:/.test(line) && atoms.length) break;

        const parsed = parseOutputAtom(line, coordinateLike, atoms.length + 1);
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
      const triplet = coordinateTripletAfterElement(parts.slice(i + 1));
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
      energySource: "",
      scf: [],
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

    let inScf = false;
    let inTiming = false;
    let currentKind = null;
    let currentOptStep = null;
    let currentMdStep = null;

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();
      const lineNumber = index + 1;
      if (!line) return;

      if (/PROGRAM ENDED AT|CP2K finished|run completed/i.test(line)) result.normalEnd = true;
      if (/ABORT|ABNORMAL PROGRAM TERMINATION|TERMINATED|FAILED/i.test(line)) result.aborted = true;

      readMetadata(result, line, lineNumber);
      readPipeParameter(result, line, lineNumber);
      readFiles(result, line, lineNumber);
      readAtomsAndKinds(result, line, lineNumber);
      currentKind = readKindDetails(result, line, lineNumber, currentKind);
      readEnergyLine(result, line, lineNumber);
      inScf = readScfLine(result, line, lineNumber, inScf);
      currentOptStep = readOptimizationLine(result, line, lineNumber, currentOptStep);
      currentMdStep = readMdLine(result, line, lineNumber, currentMdStep);
      readCellLine(result, line, lineNumber);
      readForceLine(result, line, lineNumber);
      readStressLine(result, line, lineNumber);
      inTiming = readTimingLine(result, line, lineNumber, inTiming);

      const step = line.match(/(?:GEOMETRY OPTIMIZATION STEP|STEP NUMBER|MD STEP|Informations at step)\s*[:=]?\s*(\d+)/i);
      if (step) result.steps.push({ line: lineNumber, value: Number(step[1]), text: line });

      if (/WARNING/i.test(line)) result.warnings.push({ line: lineNumber, text: line });
      if (/ERROR|ABORT|FAILED|NaN|SCF run NOT converged/i.test(line)) result.errors.push({ line: lineNumber, text: line });
    });

    return result;
  }

  function readMetadata(result, line, lineNumber) {
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

    metadataRules.some(([key, regex]) => {
      const match = line.match(regex);
      if (!match) return false;
      result.metadata[key] = { line: lineNumber, value: match[1].trim() };
      return true;
    });
  }

  function readPipeParameter(result, line, lineNumber) {
    const match = line.match(/^([A-Z][A-Z0-9_ ]{1,18})\|\s+(.+)$/);
    if (!match) return;
    const section = match[1].trim();
    const text = match[2].trim();
    const split = text.match(/^(.+?)(?:\s{2,}|:\s+|=\s+)(\S.*)$/);
    result.parameters.push({
      line: lineNumber,
      section,
      key: split ? split[1].trim() : text,
      value: split ? split[2].trim() : "",
      text,
    });
  }

  function readFiles(result, line, lineNumber) {
    if (!/file/i.test(line)) return;
    const match = line.match(/(.+?\bfile(?:\s+name)?\b.*?)\s*[:=]?\s+(.+)$/i);
    if (match) result.files.push({ line: lineNumber, label: match[1].trim(), value: match[2].trim() });
  }

  function readAtomsAndKinds(result, line, lineNumber) {
    const count = line.match(/(?:Number of atoms|Total number of atoms)\s*[:=]?\s*(\d+)/i);
    if (count && result.atoms.count === null) result.atoms.count = Number(count[1]);

    const kindCount = line.match(/Number of atoms of kind\s+(\S+)\s*[:=]?\s*(\d+)/i);
    if (kindCount) {
      const kind = findOrCreateKind(result, kindCount[1], lineNumber);
      kind.count = Number(kindCount[2]);
    }
  }

  function readKindDetails(result, line, lineNumber, currentKind) {
    const kindStart = line.match(/(?:Atomic kind|Kind)\s*[:=]\s*(\S+)/i);
    if (kindStart && !/Number of atoms of kind/i.test(line)) {
      return findOrCreateKind(result, kindStart[1], lineNumber);
    }

    if (!currentKind) return currentKind;
    const element = line.match(/^Element\s*[:=]\s*(\S+)/i);
    const basis = line.match(/^Basis(?: set)?\s*[:=]\s*(.+)$/i);
    const potential = line.match(/^Potential\s*[:=]\s*(.+)$/i);
    const count = line.match(/^Number of atoms\s*[:=]\s*(\d+)/i);
    if (element) currentKind.element = normalizeElement(element[1]) || element[1];
    if (basis) currentKind.basis = basis[1].trim();
    if (potential) currentKind.potential = potential[1].trim();
    if (count) currentKind.count = Number(count[1]);
    return currentKind;
  }

  function findOrCreateKind(result, name, lineNumber) {
    let kind = result.atoms.kinds.find((item) => item.name === name);
    if (!kind) {
      kind = { line: lineNumber, name, element: normalizeElement(name), count: null, basis: "", potential: "" };
      result.atoms.kinds.push(kind);
    }
    return kind;
  }

  function readEnergyLine(result, line, lineNumber) {
    if (!/(ENERGY\||Total energy|Electronic kinetic energy|Dispersion energy|Exchange-correlation energy|Hartree energy)/i.test(line)) {
      return;
    }
    const value = lastNumber(line);
    if (value === null) return;
    const label = line.replace(new RegExp(`${numberPattern}\\s*(?:a\\.u\\.|hartree|eV|Ry)?\\s*$`, "i"), "").replace(/\s+/g, " ").trim();
    const unit = readUnit(line);
    result.energies.push({ line: lineNumber, label, value, unit });
  }

  function readScfLine(result, line, lineNumber, inScf) {
    let active = inScf;
    if (/SCF WAVEFUNCTION OPTIMIZATION|STARTING SELF-CONSISTENT FIELD/i.test(line)) active = true;

    const converged = line.match(/SCF run converged in\s+(\d+)\s+steps/i);
    if (converged) {
      result.scfRuns.push({ line: lineNumber, converged: true, steps: Number(converged[1]), text: line });
      return false;
    }
    if (/SCF run NOT converged/i.test(line)) {
      result.scfRuns.push({ line: lineNumber, converged: false, text: line });
      return false;
    }

    const convergence = line.match(/(?:convergence|Conv|RMS).*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i);
    if (convergence && /SCF|convergence|Conv|RMS/i.test(line)) {
      result.scf.push({ line: lineNumber, kind: "convergence", value: Number(convergence[1]), text: line });
    }

    if (active && /^\d+\s+/.test(line)) {
      const values = allNumbers(line);
      if (values.length >= 2) {
        result.scf.push({ line: lineNumber, kind: "iteration", iteration: values[0], values: values.slice(1), text: line });
      }
    }

    if (active && /ENERGY\||Total FORCE_EVAL/i.test(line)) return false;
    return active;
  }

  function readOptimizationLine(result, line, lineNumber, currentStep) {
    const optimizer = line.match(/Optimization Method\s*=\s*(.+)$/i);
    if (optimizer) result.optimization.optimizer = optimizer[1].trim();
    if (/GEOMETRY OPTIMIZATION COMPLETED|OPTIMIZATION COMPLETED|GEOMETRY OPTIMIZATION CONVERGED/i.test(line)) {
      result.optimization.converged = true;
    }

    const stepStart =
      line.match(/OPT\|\s*Step number\s+(\d+)/i) ||
      line.match(/Informations at step\s*=\s*(\d+)/i) ||
      line.match(/GEOMETRY OPTIMIZATION STEP\s*[:=]?\s*(\d+)/i);
    if (stepStart) currentStep = findOrCreateStep(result.optimization.steps, Number(stepStart[1]), lineNumber);

    const metricRules = [
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
    metricRules.forEach(([key, regex]) => {
      const match = line.match(regex);
      if (!match) return;
      if (key === "energy" && !currentStep) return;
      if (!currentStep) currentStep = findOrCreateStep(result.optimization.steps, result.optimization.steps.length + 1, lineNumber);
      if (/Convergence limit/i.test(line) && !/Limit$/.test(key)) return;
      if (/Converged$/i.test(key)) {
        currentStep[key] = { line: lineNumber, value: match[1].toUpperCase() };
      } else {
        currentStep[key] = { line: lineNumber, value: Number(match[1]) };
        if (key === "energy" && /OPT\|\s*Total energy/i.test(line)) result.energySource = "OPT| Total energy [hartree]";
      }
    });

    return currentStep;
  }

  function readMdLine(result, line, lineNumber, currentStep) {
    const step = line.match(/MD\|\s+Step(?: number)?\s*[:=]?\s*(\d+)/i) || line.match(/MD STEP\s*[:=]?\s*(\d+)/i);
    if (step) currentStep = findOrCreateStep(result.md.steps, Number(step[1]), lineNumber);
    if (!currentStep && /^MD\|/i.test(line)) currentStep = findOrCreateStep(result.md.steps, result.md.steps.length + 1, lineNumber);
    if (!currentStep) return currentStep;

    const mdRules = [
      ["time", /MD\|\s+Time.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
      ["temperature", /MD\|\s+Temperature.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
      ["kinetic", /MD\|\s+Kinetic energy.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
      ["potential", /MD\|\s+Potential energy.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
      ["conserved", /MD\|\s+Conserved quantity.*?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)/i],
    ];
    mdRules.forEach(([key, regex]) => {
      const match = line.match(regex);
      if (match) currentStep[key] = { line: lineNumber, value: Number(match[1]) };
    });

    return currentStep;
  }

  function readCellLine(result, line, lineNumber) {
    if (!/CELL\||CELL_TOP\||Unit cell|Volume/i.test(line)) return;
    const values = allNumbers(line);
    if (!values.length) return;
    result.cells.push({ line: lineNumber, text: line, values });
  }

  function readForceLine(result, line, lineNumber) {
    if (!/(Max\.\s*force|RMS\s*force|SUM OF ATOMIC FORCES|ATOMIC FORCES)/i.test(line)) return;
    const values = allNumbers(line);
    result.forces.push({ line: lineNumber, text: line, values });
  }

  function readStressLine(result, line, lineNumber) {
    if (!/(STRESS|PRESSURE|Virial)/i.test(line)) return;
    const values = allNumbers(line);
    result.stress.push({ line: lineNumber, text: line, values });
  }

  function readTimingLine(result, line, lineNumber, inTiming) {
    let active = inTiming || /T I M I N G|SUBROUTINE\s+CALLS|CP2K\s+timings/i.test(line);
    if (!active) return false;

    const timing = line.match(/^([A-Za-z0-9_().\/-]+)\s+(\d+)\s+(.+)$/);
    if (timing) {
      const values = allNumbers(timing[3]);
      if (values.length >= 2) {
        result.timings.push({ line: lineNumber, label: timing[1], calls: Number(timing[2]), values, text: line });
      }
    }
    if (/The number of warnings|PROGRAM ENDED AT/i.test(line)) active = false;
    return active;
  }

  function findOrCreateStep(steps, stepNumber, lineNumber) {
    let step = steps.find((item) => item.step === stepNumber);
    if (!step) {
      step = { line: lineNumber, step: stepNumber };
      steps.push(step);
    }
    return step;
  }

  function readEnergy(comment) {
    const match = comment.match(new RegExp(`(?:E|energy)\\s*[=:]\\s*(${numberPattern})`, "i"));
    return match ? Number(match[1]) : null;
  }

  function allNumbers(line) {
    return (String(line).match(new RegExp(numberPattern, "g")) || []).map(Number).filter(Number.isFinite);
  }

  function lastNumber(line) {
    const numbers = allNumbers(line);
    return numbers.length ? numbers[numbers.length - 1] : null;
  }

  function readUnit(line) {
    const match = String(line).match(/\b(a\.u\.|hartree|eV|Ry|K|fs|bar|GPa)\b/i);
    return match ? match[1] : "";
  }

  function stripComment(line) {
    return line.replace(/(!|#).*$/, "");
  }

  function normalizeElement(value) {
    if (!value) return null;
    const cleaned = String(value).replace(/[^A-Za-z]/g, "");
    if (!cleaned) return null;
    const exact = cleaned[0].toUpperCase() + cleaned.slice(1).toLowerCase();
    if (elementPattern.test(exact) && elementSymbols.includes(exact)) return exact;

    const upper = cleaned.toUpperCase();
    const match = elementSymbols.find((symbol) => upper.startsWith(symbol.toUpperCase()));
    return match || null;
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

  function coordinateTripletAfterElement(parts) {
    const values = parts.map((part) => Number(part)).filter(Number.isFinite);
    if (values.length < 3) return null;
    if (values.length === 4 && Number.isInteger(values[0]) && values[0] > 0 && values[0] < 10000) {
      return values.slice(1, 4);
    }
    return values.slice(0, 3);
  }

  function tokenizeCifLine(line) {
    return line.match(/'[^']*'|"[^"]*"|\S+/g)?.map((token) => token.replace(/^['"]|['"]$/g, "")) || [];
  }

  function stripCifUncertainty(value) {
    return String(value || "").replace(/\([^)]+\)$/, "");
  }

  window.CP2KParsers = {
    parseFile,
  };
})();
