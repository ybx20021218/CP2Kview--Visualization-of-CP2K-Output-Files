(function () {
  "use strict";

  // Full periodic table — 118 elements with JMol/CPK colors and covalent radii (Å)
  var elementRows = [
    ["H",  "氢",     "Hydrogen",     1,  "#ffffff", 0.31],
    ["He", "氦",     "Helium",       2,  "#d9ffff", 0.28],
    ["Li", "锂",     "Lithium",      3,  "#cc80ff", 1.28],
    ["Be", "铍",     "Beryllium",    4,  "#c2ff00", 0.96],
    ["B",  "硼",     "Boron",        5,  "#ffb5b5", 0.84],
    ["C",  "碳",     "Carbon",       6,  "#909090", 0.76],
    ["N",  "氮",     "Nitrogen",     7,  "#3050f8", 0.71],
    ["O",  "氧",     "Oxygen",       8,  "#ff0d0d", 0.66],
    ["F",  "氟",     "Fluorine",     9,  "#90e050", 0.57],
    ["Ne", "氖",     "Neon",        10,  "#b3e3f5", 0.58],
    ["Na", "钠",     "Sodium",      11,  "#ab5cf2", 1.66],
    ["Mg", "镁",     "Magnesium",   12,  "#8aff00", 1.41],
    ["Al", "铝",     "Aluminium",   13,  "#bfa6a6", 1.21],
    ["Si", "硅",     "Silicon",     14,  "#f0c8a0", 1.11],
    ["P",  "磷",     "Phosphorus",  15,  "#ff8000", 1.07],
    ["S",  "硫",     "Sulfur",      16,  "#ffff30", 1.05],
    ["Cl", "氯",     "Chlorine",    17,  "#1ff01f", 1.02],
    ["Ar", "氩",     "Argon",       18,  "#80d1e3", 1.06],
    ["K",  "钾",     "Potassium",   19,  "#8f40d4", 2.03],
    ["Ca", "钙",     "Calcium",     20,  "#3dff00", 1.76],
    ["Sc", "钪",     "Scandium",    21,  "#e6e6e6", 1.70],
    ["Ti", "钛",     "Titanium",    22,  "#bfc2c7", 1.60],
    ["V",  "钒",     "Vanadium",    23,  "#a6a6ab", 1.53],
    ["Cr", "铬",     "Chromium",    24,  "#8a99c7", 1.39],
    ["Mn", "锰",     "Manganese",   25,  "#9c7ac7", 1.39],
    ["Fe", "铁",     "Iron",        26,  "#e06633", 1.32],
    ["Co", "钴",     "Cobalt",      27,  "#f090a0", 1.26],
    ["Ni", "镍",     "Nickel",      28,  "#50d050", 1.24],
    ["Cu", "铜",     "Copper",      29,  "#c88033", 1.32],
    ["Zn", "锌",     "Zinc",        30,  "#7d80b0", 1.22],
    ["Ga", "镓",     "Gallium",     31,  "#c28f8f", 1.22],
    ["Ge", "锗",     "Germanium",   32,  "#668f8f", 1.20],
    ["As", "砷",     "Arsenic",     33,  "#bd80e3", 1.19],
    ["Se", "硒",     "Selenium",    34,  "#ffa100", 1.20],
    ["Br", "溴",     "Bromine",     35,  "#a62929", 1.20],
    ["Kr", "氪",     "Krypton",     36,  "#5cb8d1", 1.16],
    ["Rb", "铷",     "Rubidium",    37,  "#702eb0", 2.20],
    ["Sr", "锶",     "Strontium",   38,  "#00ff00", 1.95],
    ["Y",  "钇",     "Yttrium",     39,  "#94ffff", 1.90],
    ["Zr", "锆",     "Zirconium",   40,  "#94e0e0", 1.75],
    ["Nb", "铌",     "Niobium",     41,  "#73c2c9", 1.64],
    ["Mo", "钼",     "Molybdenum",  42,  "#54b5b5", 1.54],
    ["Tc", "锝",     "Technetium",  43,  "#3b9e9e", 1.47],
    ["Ru", "钌",     "Ruthenium",   44,  "#248f8f", 1.46],
    ["Rh", "铑",     "Rhodium",     45,  "#0a7d8c", 1.42],
    ["Pd", "钯",     "Palladium",   46,  "#006985", 1.39],
    ["Ag", "银",     "Silver",      47,  "#c0c0c0", 1.45],
    ["Cd", "镉",     "Cadmium",     48,  "#ffd98f", 1.44],
    ["In", "铟",     "Indium",      49,  "#a67573", 1.42],
    ["Sn", "锡",     "Tin",         50,  "#668080", 1.39],
    ["Sb", "锑",     "Antimony",    51,  "#9e63b5", 1.39],
    ["Te", "碲",     "Tellurium",   52,  "#d47a00", 1.38],
    ["I",  "碘",     "Iodine",      53,  "#940094", 1.39],
    ["Xe", "氙",     "Xenon",       54,  "#429eb0", 1.40],
    ["Cs", "铯",     "Caesium",     55,  "#57178f", 2.44],
    ["Ba", "钡",     "Barium",      56,  "#00c900", 2.15],
    ["La", "镧",     "Lanthanum",   57,  "#70d4ff", 2.07],
    ["Ce", "铈",     "Cerium",      58,  "#ffffc7", 2.04],
    ["Pr", "镨",     "Praseodymium",59,  "#d9ffc7", 2.03],
    ["Nd", "钕",     "Neodymium",   60,  "#c7ffc7", 2.01],
    ["Pm", "钷",     "Promethium",  61,  "#a3ffc7", 1.99],
    ["Sm", "钐",     "Samarium",    62,  "#8fffc7", 1.98],
    ["Eu", "铕",     "Europium",    63,  "#61ffc7", 1.98],
    ["Gd", "钆",     "Gadolinium",  64,  "#45ffc7", 1.96],
    ["Tb", "铽",     "Terbium",     65,  "#30ffc7", 1.94],
    ["Dy", "镝",     "Dysprosium",  66,  "#1fffc7", 1.92],
    ["Ho", "钬",     "Holmium",     67,  "#00ff9c", 1.92],
    ["Er", "铒",     "Erbium",      68,  "#00e675", 1.89],
    ["Tm", "铥",     "Thulium",     69,  "#00d452", 1.90],
    ["Yb", "镱",     "Ytterbium",   70,  "#00bf38", 1.87],
    ["Lu", "镥",     "Lutetium",    71,  "#00ab24", 1.87],
    ["Hf", "铪",     "Hafnium",     72,  "#4dc2ff", 1.75],
    ["Ta", "钽",     "Tantalum",    73,  "#4da6ff", 1.70],
    ["W",  "钨",     "Tungsten",    74,  "#2194d6", 1.62],
    ["Re", "铼",     "Rhenium",     75,  "#267dab", 1.51],
    ["Os", "锇",     "Osmium",      76,  "#266696", 1.44],
    ["Ir", "铱",     "Iridium",     77,  "#175487", 1.41],
    ["Pt", "铂",     "Platinum",    78,  "#d0d0e0", 1.36],
    ["Au", "金",     "Gold",        79,  "#ffd123", 1.36],
    ["Hg", "汞",     "Mercury",     80,  "#b8b8d0", 1.32],
    ["Tl", "铊",     "Thallium",    81,  "#a6544d", 1.45],
    ["Pb", "铅",     "Lead",        82,  "#575961", 1.46],
    ["Bi", "铋",     "Bismuth",     83,  "#9e4fb5", 1.48],
    ["Po", "钋",     "Polonium",    84,  "#ab5c00", 1.40],
    ["At", "砹",     "Astatine",    85,  "#754f45", 1.50],
    ["Rn", "氡",     "Radon",       86,  "#428296", 1.50],
    ["Fr", "钫",     "Francium",    87,  "#420066", 2.60],
    ["Ra", "镭",     "Radium",      88,  "#007d00", 2.21],
    ["Ac", "锕",     "Actinium",    89,  "#70abfa", 2.15],
    ["Th", "钍",     "Thorium",     90,  "#00baff", 2.06],
    ["Pa", "镤",     "Protactinium",91,  "#00a1ff", 2.00],
    ["U",  "铀",     "Uranium",     92,  "#008fff", 1.96],
    ["Np", "镎",     "Neptunium",   93,  "#0080ff", 1.90],
    ["Pu", "钚",     "Plutonium",   94,  "#006bff", 1.87],
    ["Am", "镅",     "Americium",   95,  "#545cf2", 1.80],
    ["Cm", "锔",     "Curium",      96,  "#785ce3", 1.69],
    ["Bk", "锫",     "Berkelium",   97,  "#8a4fe3", 1.70],
    ["Cf", "锎",     "Californium", 98,  "#a136d4", 1.68],
    ["Es", "锿",     "Einsteinium", 99,  "#b31fd4", 1.65],
    ["Fm", "镄",     "Fermium",    100,  "#b31fba", 1.67],
    ["Md", "钔",     "Mendelevium",101,  "#b30da6", 1.73],
    ["No", "锘",     "Nobelium",   102,  "#bd0d87", 1.76],
    ["Lr", "铹",     "Lawrencium", 103,  "#c70066", 1.61],
    ["Rf", "",       "Rutherfordium",104,"#cc0059",1.57],
    ["Db", "",       "Dubnium",    105,  "#d1004f", 1.49],
    ["Sg", "",       "Seaborgium", 106,  "#d90045", 1.43],
    ["Bh", "",       "Bohrium",    107,  "#e00038", 1.41],
    ["Hs", "",       "Hassium",    108,  "#e6002e", 1.34],
    ["Mt", "",       "Meitnerium", 109,  "#eb0026", 1.29],
    ["Ds", "",       "Darmstadtium",110,"#f0001e", 1.28],
    ["Rg", "",       "Roentgenium",111,  "#f50016", 1.21],
    ["Cn", "",       "Copernicium",112,  "#fa000e", 1.22],
    ["Nh", "",       "Nihonium",   113,  "#cccccc", 1.36],
    ["Fl", "",       "Flerovium",  114,  "#cccccc", 1.43],
    ["Mc", "",       "Moscovium",  115,  "#cccccc", 1.62],
    ["Lv", "",       "Livermorium",116,  "#cccccc", 1.75],
    ["Ts", "",       "Tennessine", 117,  "#cccccc", 1.65],
    ["Og", "",       "Oganesson",  118,  "#cccccc", 1.57],
  ];

  var elements = {};
  var colors = {};
  var radii = {};
  elementRows.forEach(function (row) {
    var sym = row[0], zh = row[1], en = row[2], num = row[3], col = row[4], rad = row[5];
    elements[sym] = { symbol: sym, nameZh: zh, nameEn: en, atomicNumber: num, color: col, covalentRadius: rad };
    colors[sym] = col;
    radii[sym] = rad;
  });

  var viewerBackground = "#f7f9fb";
  var viewerGrid = "rgba(21, 32, 43, 0.052)";

  // ── GaussView-style Euler rotation (simple, intuitive) ──

  function rotatePoint(point, matrix) {
    return {
      x: matrix[0] * point.x + matrix[1] * point.y + matrix[2] * point.z,
      y: matrix[3] * point.x + matrix[4] * point.y + matrix[5] * point.z,
      z: matrix[6] * point.x + matrix[7] * point.y + matrix[8] * point.z,
    };
  }

  function matrixFromEuler(rx, ry) {
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var cosX = Math.cos(rx), sinX = Math.sin(rx);
    return [
      cosY, 0, sinY,
      sinX * sinY, cosX, -sinX * cosY,
      -cosX * sinY, sinX, cosX * cosY,
    ];
  }

  function trackballVector(canvas, clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var radius = Math.max(1, Math.min(rect.width, rect.height) * 0.5);
    var x = (clientX - rect.left - rect.width * 0.5) / radius;
    var y = (rect.height * 0.5 - (clientY - rect.top)) / radius;
    var length2 = x * x + y * y;
    var z = length2 <= 1 ? Math.sqrt(1 - length2) : 0;
    return normalizeVector({ x: x, y: y, z: z });
  }

  function matrixFromBallVectors(from, to) {
    var axis = cross(from, to);
    var axisLength = vectorLength(axis);
    if (axisLength < 1e-8) return identityMatrix();
    axis = scaleVector(axis, 1 / axisLength);
    var dotValue = clamp(dot(from, to), -1, 1);
    var angle = Math.acos(dotValue);
    return matrixFromAxisAngle(axis, angle);
  }

  function matrixFromAxisAngle(axis, angle) {
    var x = axis.x, y = axis.y, z = axis.z;
    var c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    return [
      t * x * x + c, t * x * y - s * z, t * x * z + s * y,
      t * x * y + s * z, t * y * y + c, t * y * z - s * x,
      t * x * z - s * y, t * y * z + s * x, t * z * z + c,
    ];
  }

  function multiplyMatrices(a, b) {
    return [
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
    ];
  }

  function identityMatrix() {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }
  function vectorLength(v) { return Math.hypot(v.x, v.y, v.z); }
  function scaleVector(v, scale) { return { x: v.x * scale, y: v.y * scale, z: v.z * scale }; }
  function normalizeVector(v) {
    var length = vectorLength(v) || 1;
    return scaleVector(v, 1 / length);
  }

  // ── Viewer class ──

  function StructureViewer(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = options || {};
    this.frame = null;
    this.bonds = [];
    this.selected = [];
    this.mode = "select";
    // Simple Euler rotation — default slight tilt like GaussView
    this.rotationX = -0.35;  // tilt down a bit
    this.rotationY = 0.45;   // rotate slightly clockwise
    this.orientation = matrixFromEuler(this.rotationX, this.rotationY);
    this.zoom = 1;
    this.atomScale = 1;
    this.showLabels = false;
    this.pan = { x: 0, y: 0 };
    this.drag = null;
    this.projectedAtoms = [];
    this.pixelRatio = 1;
    this.resizeObserver = new ResizeObserver(this.resize.bind(this));
    this.resizeObserver.observe(canvas.parentElement);
    this.bindEvents();
    this.resize();
    this.draw();
  }

  StructureViewer.prototype.setFrame = function (frame, options) {
    var settings = options || {};
    var selectedIndices = settings.preserveSelection ? this.selected.map(function (a) { return a.index; }) : [];
    this.frame = frame || null;
    this.selected =
      this.frame && selectedIndices.length
        ? selectedIndices
            .map(function (idx) { return this.frame.atoms.find(function (a) { return a.index === idx; }); }.bind(this))
            .filter(Boolean)
        : [];
    this.bonds = this.frame ? inferBonds(this.frame.atoms) : [];
    if (settings.fit !== false) this.fit(settings.referenceAtoms || (this.frame ? this.frame.atoms : null));
    this.draw();
    this.emitSelection();
  };

  StructureViewer.prototype.setAtomScale = function (scale) {
    this.atomScale = clamp(Number(scale) || 1, 0.7, 1.4);
    this.draw();
  };

  StructureViewer.prototype.setShowLabels = function (show) {
    this.showLabels = Boolean(show);
    this.draw();
  };

  StructureViewer.prototype.setMode = function (mode) {
    this.mode = mode;
    this.selected = [];
    this.draw();
    this.emitSelection();
  };

  StructureViewer.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.pixelRatio));
    this.draw();
  };

  StructureViewer.prototype.fit = function (atoms) {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    var fitAtoms = atoms || (this.frame ? this.frame.atoms : null);
    if (!fitAtoms || !fitAtoms.length) return;
    var box = bounds(fitAtoms);
    var span = Math.max(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ, 1);
    this.zoom = Math.min(this.canvas.width, this.canvas.height) / (span * 2.4 * this.pixelRatio);
  };

  StructureViewer.prototype.bindEvents = function () {
    var self = this;
    this.canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    this.canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      self.canvas.setPointerCapture(e.pointerId);
      self.drag = {
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
        button: e.button,
        startVector: trackballVector(self.canvas, e.clientX, e.clientY),
        startOrientation: self.orientation.slice(),
      };
    });

    this.canvas.addEventListener("pointermove", function (e) {
      if (!self.drag) return;
      var totalDx = e.clientX - self.drag.startX;
      var totalDy = e.clientY - self.drag.startY;
      var deltaDx = e.clientX - self.drag.lastX;
      var deltaDy = e.clientY - self.drag.lastY;
      if (Math.abs(totalDx) + Math.abs(totalDy) > 2) self.drag.moved = true;

      if (e.ctrlKey || e.altKey || self.drag.button === 2) {
        // Right-drag or Ctrl/Alt-drag → zoom
        self.zoom = clamp(self.zoom * (1 - deltaDy * 0.01), 2, 260);
      } else if (e.shiftKey || self.drag.button === 1) {
        // Shift-drag or middle-button → pan
        self.pan.x += deltaDx * self.pixelRatio;
        self.pan.y += deltaDy * self.pixelRatio;
      } else {
        // Left-drag → simple Euler rotation (GaussView-style)
        var currentVector = trackballVector(self.canvas, e.clientX, e.clientY);
        var dragRotation = matrixFromBallVectors(self.drag.startVector, currentVector);
        self.orientation = multiplyMatrices(dragRotation, self.drag.startOrientation);
      }

      self.drag.lastX = e.clientX;
      self.drag.lastY = e.clientY;
      self.draw();
    });

    this.canvas.addEventListener("pointerup", function (e) {
      if (self.drag && !self.drag.moved) self.pick(e.clientX, e.clientY);
      self.drag = null;
    });

    this.canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 0.9 : 1.1;
      self.zoom = clamp(self.zoom * factor, 2, 260);
      self.draw();
    }, { passive: false });
  };

  StructureViewer.prototype.pick = function (clientX, clientY) {
    if (!this.frame || !this.projectedAtoms.length) return;
    var rect = this.canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * this.pixelRatio;
    var y = (clientY - rect.top) * this.pixelRatio;
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < this.projectedAtoms.length; i++) {
      var a = this.projectedAtoms[i];
      var d = Math.hypot(a.screenX - x, a.screenY - y);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    if (!best || bestDist > Math.max(18 * this.pixelRatio, best.radius + 7 * this.pixelRatio)) {
      if (this.selected.length) { this.selected = []; this.draw(); this.emitSelection(); }
      return;
    }
    var limit = 4;
    var existing = -1;
    for (var j = 0; j < this.selected.length; j++) {
      if (this.selected[j].index === best.index) { existing = j; break; }
    }
    if (existing >= 0) { this.selected.splice(existing, 1); }
    else {
      if (this.selected.length >= limit) this.selected.shift();
      this.selected.push(best.source);
    }
    this.draw();
    this.emitSelection();
  };

  StructureViewer.prototype.emitSelection = function () {
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.selected.slice(), this.mode);
    }
  };

  StructureViewer.prototype.draw = function () {
    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = viewerBackground;
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, w, h, this.pixelRatio);

    if (!this.frame || !this.frame.atoms.length) {
      ctx.fillStyle = "#627386";
      ctx.font = (14 * this.pixelRatio) + "px Segoe UI, Microsoft YaHei, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("打开 xyz / inp / out / restart 文件", w / 2, h / 2);
      this.projectedAtoms = [];
      return;
    }

    var centered = centerAtoms(this.frame.atoms);
    var orientation = this.orientation;
    var projected = centered.map(function (atom) {
      var rot = rotatePoint(atom, orientation);
      return {
        source: atom.source,
        index: atom.source.index,
        element: atom.source.element,
        x: rot.x, y: rot.y, z: rot.z,
        screenX: w / 2 + this.pan.x + rot.x * this.zoom,
        screenY: h / 2 + this.pan.y - rot.y * this.zoom,
        radius: atomRadius(atom.source.element, this.zoom) * this.atomScale * this.pixelRatio,
        fog: 0,
      };
    }, this);

    // Pure orthographic projection — no depth cue / perspective
    constrainAtomRadii(projected, this.bonds, this.pixelRatio);
    this.projectedAtoms = projected;
    this.drawCell(ctx, centered, w, h);
    this.drawBonds(ctx, projected);
    this.drawAtoms(ctx, projected);
  };

  StructureViewer.prototype.drawCell = function (ctx, centered, w, h) {
    if (!this.frame.cell) return;
    var orientation = this.orientation;
    var origin = { x: 0, y: 0, z: 0 };
    var vectors = ["A", "B", "C"].map(function (key) {
      var v = this.frame.cell[key];
      return { x: v[0], y: v[1], z: v[2] };
    }, this);
    var points = [origin, vectors[0], vectors[1], vectors[2],
      add(vectors[0], vectors[1]), add(vectors[0], vectors[2]),
      add(vectors[1], vectors[2]), add(add(vectors[0], vectors[1]), vectors[2])];
    var boxCenter = average(points);
    var screen = points.map(function (pt) {
      var shifted = { x: pt.x - boxCenter.x, y: pt.y - boxCenter.y, z: pt.z - boxCenter.z };
      var rot = rotatePoint(shifted, orientation);
      return { x: w / 2 + this.pan.x + rot.x * this.zoom, y: h / 2 + this.pan.y - rot.y * this.zoom };
    }, this);
    var edges = [[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]];
    ctx.save();
    ctx.strokeStyle = "rgba(19, 124, 114, 0.45)";
    ctx.lineWidth = 1 * this.pixelRatio;
    edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(screen[e[0]].x, screen[e[0]].y);
      ctx.lineTo(screen[e[1]].x, screen[e[1]].y);
      ctx.stroke();
    });
    ctx.restore();
  };

  StructureViewer.prototype.drawBonds = function (ctx, projected) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    var width = bondWidth(this.zoom, this.pixelRatio);
    var outline = Math.min(2.4 * this.pixelRatio, width * 0.55);
    var self = this;
    this.bonds.forEach(function (pair) {
      var p1 = projected[pair[0]], p2 = projected[pair[1]];
      if (!p1 || !p2) return;
      ctx.lineWidth = width + outline;
      ctx.strokeStyle = "rgba(20, 24, 29, 0.62)";
      ctx.beginPath();
      ctx.moveTo(p1.screenX, p1.screenY);
      ctx.lineTo(p2.screenX, p2.screenY);
      ctx.stroke();
    });
    this.bonds.forEach(function (pair) {
      var p1 = projected[pair[0]], p2 = projected[pair[1]];
      if (!p1 || !p2) return;
      var mx = (p1.screenX + p2.screenX) / 2;
      var my = (p1.screenY + p2.screenY) / 2;
      drawBondSegment(ctx, p1.screenX, p1.screenY, mx, my, colors[p1.element] || "#aeb8c4", width);
      drawBondSegment(ctx, p2.screenX, p2.screenY, mx, my, colors[p2.element] || "#aeb8c4", width);
    });
    ctx.restore();
  };

  StructureViewer.prototype.drawAtoms = function (ctx, projected) {
    var sorted = projected.slice().sort(function (a, b) { return a.z - b.z; });
    var self = this;
    sorted.forEach(function (atom) {
      var selected = self.selected.some(function (s) { return s.index === atom.index; });
      var color = colors[atom.element] || "#9aa7b5";
      var gradient = ctx.createRadialGradient(
        atom.screenX - atom.radius * 0.35,
        atom.screenY - atom.radius * 0.42,
        atom.radius * 0.05,
        atom.screenX, atom.screenY,
        atom.radius * 1.32
      );
      gradient.addColorStop(0, lighten(color, 1.0));
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(1, darken(color, 1.0));

      ctx.beginPath();
      ctx.arc(atom.screenX, atom.screenY, atom.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(atom.screenX, atom.screenY, atom.radius, 0, Math.PI * 2);
      ctx.lineWidth = selected ? 3.2 * self.pixelRatio : 1.2 * self.pixelRatio;
      ctx.strokeStyle = selected ? "#f1c84b" : "rgba(27, 33, 40, 0.62)";
      ctx.stroke();

      // Element label — clean, no stroke/halo
      if (selected || self.showLabels) {
        var fontSize = Math.max(10, Math.min(14, atom.radius * 0.82 / self.pixelRatio)) * self.pixelRatio;
        ctx.font = "bold " + fontSize + "px Segoe UI, Microsoft YaHei, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Determine readable color
        var rgb = toRgb(color);
        var lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        ctx.fillStyle = lum > 0.55 ? "#141820" : "#f9fbfd";
        ctx.fillText(atom.element, atom.screenX, atom.screenY);
      }

      if (selected) {
        ctx.fillStyle = "#f9fbfd";
        ctx.font = (11 * self.pixelRatio) + "px Segoe UI, Microsoft YaHei, sans-serif";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("#" + atom.index, atom.screenX, atom.screenY - atom.radius - 8 * self.pixelRatio);
      }
    });
  };

  // ── Pure functions ──

  function inferBonds(atoms) {
    var bonds = [];
    for (var i = 0; i < atoms.length; i++) {
      for (var j = i + 1; j < atoms.length; j++) {
        var a = atoms[i], b = atoms[j];
        var cutoff = ((radii[a.element] || 0.8) + (radii[b.element] || 0.8)) * 1.25;
        var dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (dist > 0.35 && dist <= Math.min(cutoff, 2.65)) bonds.push([i, j]);
      }
    }
    return bonds;
  }

  function centerAtoms(atoms) {
    var box = bounds(atoms);
    var cx = (box.minX + box.maxX) / 2;
    var cy = (box.minY + box.maxY) / 2;
    var cz = (box.minZ + box.maxZ) / 2;
    return atoms.map(function (a) {
      return { source: a, x: a.x - cx, y: a.y - cy, z: a.z - cz };
    });
  }

  function bounds(atoms) {
    return atoms.reduce(function (box, a) {
      return {
        minX: Math.min(box.minX, a.x), maxX: Math.max(box.maxX, a.x),
        minY: Math.min(box.minY, a.y), maxY: Math.max(box.maxY, a.y),
        minZ: Math.min(box.minZ, a.z), maxZ: Math.max(box.maxZ, a.z),
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
  }

  function atomRadius(element, zoom) {
    var cr = radii[element] || 0.88;
    var scaled = cr * Math.max(zoom, 1) * 0.28;
    var minimum = clamp(Math.max(zoom, 1) * 0.16, 2.2, 4.2);
    return clamp(scaled, minimum, 16);
  }

  function constrainAtomRadii(projected, bonds, ratio) {
    if (!projected.length || !bonds.length) return;
    var caps = projected.map(function () { return Infinity; });
    bonds.forEach(function (pair) {
      var p1 = projected[pair[0]], p2 = projected[pair[1]];
      if (!p1 || !p2) return;
      var dist = Math.hypot(p1.screenX - p2.screenX, p1.screenY - p2.screenY);
      var cap = Math.max(1.8 * ratio, dist * 0.28);
      caps[pair[0]] = Math.min(caps[pair[0]], cap);
      caps[pair[1]] = Math.min(caps[pair[1]], cap);
    });
    projected.forEach(function (a, i) {
      if (Number.isFinite(caps[i])) a.radius = Math.min(a.radius, caps[i]);
    });
  }

  function bondWidth(zoom, ratio) {
    return clamp(Math.max(zoom, 1) * 0.13, 1.4, 5.2) * ratio;
  }

  function drawBondSegment(ctx, x1, y1, x2, y2, color, width) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var half = width / 2;
    var shade = ctx.createLinearGradient(mx - nx * half, my - ny * half, mx + nx * half, my + ny * half);
    shade.addColorStop(0, darken(color, 0.42));
    shade.addColorStop(0.5, lighten(color, 0.38));
    shade.addColorStop(1, darken(color, 0.42));
    ctx.lineWidth = width;
    ctx.strokeStyle = shade;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function applyDepthCue(projected) {
    if (!projected.length) return;
    var zs = projected.map(function (a) { return a.z; });
    var minZ = Math.min.apply(null, zs);
    var maxZ = Math.max.apply(null, zs);
    var range = Math.max(maxZ - minZ, 1e-6);
    projected.forEach(function (a) {
      var depth = (maxZ - a.z) / range;
      a.fog = clamp((depth - 0.08) * 0.42, 0, 0.34);
    });
  }

  function fogColor(color, amount) { return mix(color, viewerBackground, amount); }

  function lighten(color, strength) {
    return shiftHsl(color, { targetHue: 60, hueFactor: 0.15, lightFactor: 0.2 * strength, saturationFactor: -0.1 * strength });
  }

  function darken(color, strength) {
    return shiftHsl(color, { targetHue: 240, hueFactor: 0.15, lightFactor: -0.36 * strength, saturationFactor: 0.1 * strength });
  }

  function shiftHsl(color, opts) {
    var rgb = toRgb(color);
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    var h = hsl[0], s = hsl[1], l = hsl[2];
    var delta = ((((opts.targetHue - h + 180) % 360) + 360) % 360) - 180;
    h = (h + delta * opts.hueFactor + 360) % 360;
    l = clamp(l + opts.lightFactor * (opts.lightFactor > 0 ? 1 - l : l), 0, 1);
    s = clamp(s + opts.saturationFactor * (opts.saturationFactor > 0 ? 1 - s : s), 0, 1);
    return rgbToCss(hslToRgb(h, s, l));
  }

  function mix(color, target, amount) {
    var a = toRgb(color), b = toRgb(target);
    return rgbToCss([0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * amount); }));
  }

  function toRgb(color) {
    var v = String(color).trim();
    if (v.startsWith("rgb")) { return (v.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(function (x) { return clamp(Math.round(Number(x)), 0, 255); }); }
    var hex = v.replace("#", "");
    return [0, 2, 4].map(function (s) { return parseInt(hex.slice(s, s + 2), 16); });
  }

  function rgbToCss(rgb) { return "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")"; }

  function rgbToHsl(r, g, b) {
    var rn = r / 255, gn = g / 255, bn = b / 255;
    var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    var h = 0, s = 0;
    var l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var rp, gp, bp;
    if (h < 60)      { rp = c; gp = x; bp = 0; }
    else if (h < 120) { rp = x; gp = c; bp = 0; }
    else if (h < 180) { rp = 0; gp = c; bp = x; }
    else if (h < 240) { rp = 0; gp = x; bp = c; }
    else if (h < 300) { rp = x; gp = 0; bp = c; }
    else              { rp = c; gp = 0; bp = x; }
    return [rp, gp, bp].map(function (v) { return Math.round((v + m) * 255); });
  }

  function drawGrid(ctx, w, h, ratio) {
    ctx.save();
    ctx.strokeStyle = viewerGrid;
    ctx.lineWidth = ratio;
    var step = 42 * ratio;
    for (var x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function average(points) {
    var sum = points.reduce(function (t, p) { return add(t, p); }, { x: 0, y: 0, z: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
  }

  // ── Exports ──

  window.StructureViewer = StructureViewer;
  window.CP2KElements = {
    get: function (sym) { return elements[sym] || null; },
    all: function () { return elements; },
  };
  window.StructureMath = {
    distance: function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); },
    angle: function (a, b, c) {
      var ab = vector(b, a), cb = vector(b, c);
      return deg(Math.acos(clamp(dot(ab, cb) / (norm(ab) * norm(cb)), -1, 1)));
    },
    dihedral: function (a, b, c, d) {
      var b1 = vector(a, b), b2 = vector(b, c), b3 = vector(c, d);
      var n1 = cross(b1, b2), n2 = cross(b2, b3);
      var m1 = cross(n1, unit(b2));
      return deg(Math.atan2(dot(m1, n2), dot(n1, n2)));
    },
  };

  function vector(a, b) { return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
  function norm(v) { return Math.hypot(v.x, v.y, v.z) || 1; }
  function unit(v) { var len = norm(v); return { x: v.x / len, y: v.y / len, z: v.z / len }; }
  function deg(rad) { return (rad * 180) / Math.PI; }
})();
