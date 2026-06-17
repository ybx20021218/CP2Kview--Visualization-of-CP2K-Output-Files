# CP2K View
<p align="center">
  <a href="./README_CN.md">
    <img src="https://img.shields.io/badge/简体中文-阅读文档-green">
  </a>
</p>

Created by bxyao | ybx20021218@163.com

CP2K View is a browser-based viewer and analysis helper for CP2K structure, input, and output files. It runs locally in the browser and reads files with the browser File API, so files do not need to be uploaded to a server.

This cleaned open-source version keeps the original main features and adds bilingual UI, stronger CP2K OUT analysis, INP tools, chart improvements, and a more maintainable source layout.

## What changed from the old prototype

- The old prototype was mostly concentrated in a few large JavaScript files. The new version splits the code into focused modules for file import, structure viewing, frame controls, measurements, OUT analysis, INP tools, chart windows, layout, and bilingual text.
- Added Chinese / English UI switching. The selected language is saved in the local browser.
- Expanded CP2K OUT analysis with overview data, energy breakdowns, SCF blocks, geometry optimization data, MD records, atom kinds, files/parameters, cell/stress/force records, timing, warnings, and errors.
- Added OUT source locators so analysis rows can reveal the related source lines in the OUT file.
- Added automatic structure-OUT linking when one structure trajectory and one OUT file are loaded.
- During trajectory playback, the output analysis follows the current frame without repeatedly flashing the whole panel.
- SCF convergence windows follow the current frame.
- The four convergence-metric charts are plotted on a log scale for readability, while displayed values remain the original raw values.
- **The optimization energy chart skips the CP2K initial guess energy point so Step 1 aligns with the corresponding force and step metrics.**
- Measurement trend, SCF convergence, and optimization charts can now all be opened in a larger chart window.
- Chart windows support dragging, resizing, box zoom, reset, minimum-point selection, keyboard point navigation, and clicking points to sync the structure frame.
- Improved measurement tools with saved values, trend CSV export, and current-frame highlighting.
- Improved INP/restart tools with a source editor, edited-file export, local custom snippets, delete confirmation, and side-by-side comparison.
- **Added a custom INP snippet library: local common snippets can be saved, inserted at the current cursor position, and deleted with confirmation.**
- **Added INP file comparison: two INP/restart files can be compared side by side, showing added, deleted, and modified lines, with add, delete, left/right replace, save, and enlarged comparison actions.**
- Improved INP comparison scroll behavior after edits to avoid jumping back to the first line.
- Improved larger-structure performance in bond inference by using spatial buckets instead of only brute-force pair checks.
- Added public sample files under `samples/`.

## Supported files

Files can be loaded with the top Open button or by drag and drop.

- `.xyz`: structures and multi-frame trajectories.
- `.inp`: CP2K input files; `&COORD` and `&CELL` are read when present.
- `.restart`: CP2K restart files, read similarly to input files.
- `.out` / `.log`: CP2K output files for analysis; coordinate blocks may also be displayed.
- `.pdb`: PDB structures.
- `.cif`: CIF structures with Cartesian coordinate fields.
- `.txt`: text files; the parser will try to recognize structure-like content.

## Main features

### Structure viewer

- Displays atomic structures in the central canvas.
- Supports mouse rotate, zoom, and pan.
- Supports previous frame, next frame, play/pause, frame slider, and playback speed for multi-frame structures.
- Supports atom sphere size control.
- Supports showing or hiding element labels.
- Click an atom to inspect element, type/kind, and coordinates.
- Uses Jmol/CPK-like element colors.
- Infers bonds from element radii and interatomic distances.
- Draws unit-cell edges when cell data is available.
- Exports the current frame as an XYZ file.

### Structure information

- Shows file name, file type, atom count, frame count, current frame, and composition.
- When a structure is linked to an OUT file, shows the linked OUT file, optimization step, energy, energy breakdown block, maximum step, RMS step, maximum gradient, and RMS gradient.
- The exported XYZ frame comment can include current-frame optimization metrics when available.

### Measurements

- Select 2 atoms to measure distance or bond length.
- Select 3 atoms to measure angle.
- Select 4 atoms to measure dihedral angle.
- Shows the selected atom list.
- For multi-frame structures, plots distance/angle/dihedral trends across frames.
- Highlights the current frame in the trend plot.
- Opens a larger trend chart window.
- Saves the current measurement value to a saved-measurements list.
- Deletes saved measurements.
- Exports trend data as CSV.

### CP2K OUT analysis

- Parses CP2K `.out` and `.log` files.
- Shows end status: normal, aborted, or unknown.
- Shows line count, CP2K version, run type, project name, QS method, XC functional, cutoff, and relative cutoff.
- Counts energy points, SCF runs, SCF records, optimization steps, MD steps, warnings, and errors.
- Shows energy breakdown records, including core charge overlap energy, self energy, core Hamiltonian energy, Hartree energy, exchange-correlation energy, and total energy.
- Shows SCF iteration tables, convergence values, convergence status, and an SCF convergence plot.
- Shows geometry optimization information, including optimizer, convergence state, recent steps, and optimization charts.
- Optimization charts include total energy, maximum force, RMS gradient, maximum step size, and RMS step size.
- Convergence metric charts use log-scale plotting for readability, while labels and status values keep raw values.
- The energy chart omits the CP2K initial guess energy point to align optimization steps with structure frames.
- Clicking an optimization chart point can sync the structure frame and analysis panel.
- Shows MD records such as time, temperature, kinetic energy, potential energy, and conserved quantity when found (test version).
- Shows atom kind information, including element, count, basis set, and potential.
- Shows recognized file records and CP2K pipe-style parameter records.
- Shows cell, force, stress, and timing records.
- Groups warnings and errors to make repeated issues easier to inspect.
- Can locate energy blocks, SCF blocks, parameter lines, warning lines, and error lines in the OUT source.

### Structure-OUT linking

- When exactly one structure trajectory and one OUT file are loaded, the app tries to link them automatically.
- After linking, changing the structure frame updates the related energy breakdown, SCF block, and optimization metrics in the output panel.
- If the OUT file contains an extra initial energy or SCF block, the app tries to offset the link automatically.
- If frame count and OUT record count do not fully match, the app shows a linking warning.

### CP2K INP / restart tools

- Reads `.inp` and `.restart` files.
- Extracts atoms from `&COORD` for structure display.
- Extracts cell vectors from `&CELL` for unit-cell display.
- Displays the input file as an expandable `&SECTION` tree.
- Shows and edits raw INP text.
- Exports edited INP/restart files.
- Saves local custom INP snippets.
- Inserts custom snippets at the current cursor position.
- Confirms before deleting custom snippets.
- Compares two INP/restart files.
- Shows same, added, removed, and modified lines.
- Provides add-to-left, add-to-right, delete-left, delete-right, replace-left-with-right, and replace-right-with-left actions.
- Saves edited left or right files.
- Opens an enlarged comparison window.
- Preserves comparison scroll position after edits where possible.

### Chart windows

- Measurement trends, SCF convergence, and geometry optimization plots can open in a separate large window.
- Chart windows can be dragged and resized.
- Supports box-select zoom.
- Supports double-click or button reset.
- Supports minimum-point selection.
- Supports left/right arrow key navigation between chart points.
- Clicking a chart point can sync the current structure frame and analysis panel.

### Layout and UI

- Three-column layout: project files on the left, structure canvas in the center, analysis panels on the right.
- Left and right columns can be resized by dragging.
- Layout can be reset.
- Right-side tabs include Structure, Measure, Output Analysis, and INP Structure.
- Right-side panels can be opened separately in a larger view.
- Chinese and English UI are supported.
- Language selection is stored locally in the browser.

### Multiwfn helper (test version, to be improved)

- Lets the user enter the Multiwfn executable path.
- Generates a command such as `"Multiwfn.exe" "filename"` for the current structure file.
- The app only generates the command; it does not launch Multiwfn.

## Basic usage

1. Open `index.html`.
2. Click Open, or drag structure/OUT/INP files into the page.
3. Use the project file list on the left to switch files.
4. Use the central canvas to inspect the structure, and the frame controls to play trajectories or adjust display settings.
5. Use the right-side tabs for structure information, measurements, OUT analysis, and INP tools.
6. If one structure trajectory and one OUT file are loaded together, the app tries to link frames with OUT analysis data automatically.
7. Export data when needed: current-frame XYZ, measurement trend CSV, or edited INP/restart files.

If opening `index.html` directly is limited by browser local-file rules, start a small static server inside the folder:

```bash
python -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

## Sample files

The `samples/` folder contains public test files:

- `CsPbBr3_mp-567629_primitive-pos-slab-1hole1Br.inp`
- `CsPbBr3_mp-567629_primitive-pos-slab-2hole.inp`
- `CsPbBr3_mp-567629_primitive-pos-slab-2hole2Br-pos-1.xyz`
- `CsPbBr3_mp-567629_primitive-pos-slab-2hole2Br.out`

They can be used to test structure display, trajectory playback, OUT analysis, structure-OUT linking, and INP comparison.

## Notes and limitations

- This is a local front-end tool that runs mainly in the browser.
- Files are read locally by the browser; **the app itself does not upload files to a remote server** and has no remote server.
- CP2K OUT files can vary between versions and print settings. The parser tries to recognize common CP2K output patterns. Current testing is based on CP2K 202502.
- Bonds are inferred from radii and distances; they are not a strict quantum-chemical bond-order analysis.
- CIF support currently focuses on Cartesian coordinate fields.
- The Multiwfn helper only generates a command and does not start external programs.
- Custom INP snippets and language settings are stored in browser localStorage. They may disappear after switching browsers or clearing browser data.

## Development notes

- Main page: `index.html`
- Styles: `styles.css`
- Source code: `src/`
- Sample files: `samples/`

Main modules under `src/`:

- `app.js`: main application flow and module wiring.
- `viewer.js`: structure canvas, atom colors, bonds, unit cell, and mouse interaction.
- `parsers.js`: parsers for XYZ, INP, restart, OUT, PDB, CIF, and related data.
- `files.js`: file import and project file list.
- `frame-controls.js`: frame navigation, playback, speed, atom size, and labels.
- `measurement.js`: distances, angles, dihedrals, and measurement trends.
- `saved-measurements.js`: saved measurement values.
- `structure-info.js`: structure information panel.
- `out-analysis-data.js` / `out-analysis-panel.js` / `out-locator.js` / `out-linker.js`: OUT analysis, source location, and structure-OUT linking.
- `input-panel.js`: INP tree, editor, custom snippets, and INP comparison.
- `chart-data.js` / `chart-drawing.js` / `chart-window-frame.js` / `chart-window-content.js` / `optimization-chart-panel.js`: chart data, drawing, and large chart windows.
- `layout.js` / `inspector-panels.js`: three-column layout and right-side panels.
- `i18n.js`: Chinese and English UI text.
- `utils.js`: shared utility helpers.
