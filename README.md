# My Project

[English](README.md) | [简体中文](README.zh-CN.md)

---
# cp2kview-demo

`cp2kview-demo` is a lightweight, browser-based visualizer for CP2K-related structure and output files. It is a fully personal project developed independently, currently published as a demo version for open-source sharing and testing.

The app runs entirely in the browser, so users can try it without installing any project dependencies. There is no backend service and no build step required for normal use.

The current version focuses on quick inspection of molecular and periodic structures, CP2K input/output parsing, trajectory playback, geometry measurements, optimization analysis, and a simple Multiwfn command helper.

## Features

- Open local `xyz`, `inp`, `out`, `restart`, `pdb`, `cif`, `log`, and text-like files.
- Parse multi-frame XYZ trajectories.
- Extract coordinates from CP2K `&COORD` sections and CP2K output coordinate blocks.
- Display structures on a canvas viewer with rotation, zoom, pan, atom labels, frame switching, and trajectory playback.
- Infer simple bonds from covalent radii and show element colors based on JMol/CPK conventions.
- Measure distances, angles, and dihedral angles by selecting atoms.
- Plot measurement trends across trajectory frames and export the trend as CSV.
- Parse CP2K input/restart files into an expandable section tree.
- Analyze CP2K output files for metadata, energies, SCF records, geometry optimization steps, MD records, atom kinds, timings, warnings, errors, and run status.
- Link one loaded structure trajectory with one loaded CP2K output file to display optimization metrics per frame.
- Plot geometry optimization metrics, including total energy, step size, and gradient data.
- Export the current frame as an XYZ file.
- Generate a command line for launching Multiwfn with the selected structure file.

## Repository Layout

```text
.
├── app/
│   ├── index.html          # Main application page
│   ├── styles.css          # Application styles
│   ├── src/
│   │   ├── app.js          # UI state, file loading, panels, charts, exports
│   │   ├── parsers.js      # XYZ/CP2K/PDB/CIF parsers and output analysis
│   │   └── viewer.js       # Canvas structure viewer and geometry math
│   ├── *.xyz               # Example structure/trajectory file
│   └── *.out               # Example CP2K output file
├── README.md
└── README.zh-CN.md
```

## Requirements

- A modern desktop browser, such as Chrome, Edge, Firefox, or Safari.
- No project dependencies need to be installed for normal use.
- Python or another static file server is optional if you prefer to serve the app from `localhost`.

## Quick Start

### Option 1: Open the HTML file directly

Open this file in your browser:

```text
app/index.html
```

Then click **Open** in the top-right toolbar, or drag files into the page.

### Option 2: Run a local static server

From the repository root:

```bash
cd app
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

This mode is useful when your browser or local security settings handle `file://` pages strictly.

## Basic Usage

1. Open `app/index.html` directly, or start the local static server.
2. Load a structure or CP2K file with the **Open** button, or drag it into the app.
3. Use the file list on the left to switch between loaded files.
4. Use the structure viewer in the center to inspect atoms and frames.
5. Use the panels on the right for structure information, measurements, CP2K output analysis, and CP2K input/restart trees.

The sample `.xyz` and `.out` files in `app/` can be used for a first test.

## Viewer Controls

- Left-drag: rotate the structure.
- Mouse wheel: zoom in or out.
- Right-drag, `Ctrl` + drag, or `Alt` + drag: zoom.
- `Shift` + drag or middle-button drag: pan.
- Click atoms: select atoms for measurement.
- Select 2 atoms: distance.
- Select 3 atoms: angle.
- Select 4 atoms: dihedral angle.
- Left/right arrow keys: switch frames.
- Space: play or pause the trajectory.
- Frame slider: jump to a specific frame.
- Speed slider: change playback speed.
- Atom size slider: adjust atom sphere size.
- Atom label toggle: show or hide element labels.

## Working With CP2K Output

Load a CP2K `.out` or `.log` file to inspect parsed run information. The output analysis panel can show:

- CP2K version and run metadata.
- Input file, project name, run type, print level, and selected DFT settings.
- Energy records.
- SCF convergence records.
- Geometry optimization status and recent optimization steps.
- MD step data when detected.
- Atom and kind information.
- Timing records.
- Warnings, errors, abnormal termination markers, and normal-end markers.

If you load exactly one structure trajectory and one CP2K output file, CP2K View tries to align trajectory frames with geometry optimization steps. When alignment succeeds, frame-level energy and convergence metrics are shown in the structure panel and optimization plots.

## Exporting Data

- **Export XYZ** saves the currently visible frame as an `.xyz` file.
- **Export CSV** in the measurement panel saves the current distance/angle/dihedral trend across frames.

## Multiwfn Helper

The Multiwfn panel generates a command such as:

```bash
"Multiwfn.exe" "structure.xyz"
```

You can change the executable path in the input field. This helper only generates the command; it does not launch Multiwfn from the browser.

## Notes and Limitations

- The app is a client-side prototype. All selected files are read locally by the browser File API.
- CP2K output formats vary by version, calculation type, and print settings. Some coordinate blocks or analysis records may not be detected yet.
- Bond rendering is inferred heuristically from covalent radii and is intended for visual inspection, not chemical validation.
- CIF support currently expects Cartesian atom coordinates.
- Multiwfn integration is currently command generation only.

## Development

There is no build pipeline at the moment. Edit the files under `app/` and refresh the browser.

For local testing:

```bash
cd app
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Roadmap

- Improve CP2K output coordinate and trajectory parsing.
- Add more robust periodic boundary condition support.
- Add cube, charge density, orbital, and vibrational mode visualization.
- Add an optional local bridge for launching external tools such as Multiwfn.
- Add automated parser tests with representative CP2K files.

## Feedback

If you find bugs, parsing problems, or have feature suggestions, please leave a message on GitHub Issues or contact the developer by email:

```text
ybx20021218@163.com
```

## License

No license file has been selected yet. Add a `LICENSE` file before publishing the repository as open source.
