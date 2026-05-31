# Changelog

## 2026-05-31

### Added

- Added frame-aware CP2K energy breakdown parsing and display.
  - The Energy section now shows the energy block corresponding to the currently selected XYZ frame.
  - Supported values include overlap core charge energy, self core charge energy, core Hamiltonian energy, Hartree energy, exchange-correlation energy, and total energy.
  - Added OUT source navigation for the selected energy block.

- Added frame-aware SCF analysis.
  - SCF iterations are now grouped by SCF run instead of being read as one flat list.
  - The SCF section now follows the currently selected frame.
  - Added a full SCF convergence chart for the current frame, using all parsed iterations regardless of the user-defined maximum iteration count.
  - Added OUT source navigation for the current frame's SCF block.

- Added reusable OUT source navigation to more analysis sections.
  - Geometry optimization records now support direct OUT line navigation.
  - Files and settings now support direct OUT line navigation.
  - CP2K parameters now support direct OUT line navigation.
  - Warnings and errors now include all parsed records and group duplicate messages behind expandable summaries.

- Added resizable workspace layout.
  - The left project panel, center viewer, and right inspector can now be resized with draggable vertical splitters.
  - Added a Reset Layout button near the file open control.
  - Custom layout widths are preserved locally and can be reset to defaults.

- Added resizable enlarged chart windows.
  - Enlarged optimization, measurement, SCF, and INP comparison windows now support resizing from edges and corners.

- Added saved measurement comparisons.
  - Current distance, angle, and dihedral measurements can now be kept in the Measurement panel for quick bond-length and geometry comparison.
  - Saved measurements include atom indices, value, source file, and frame information, and can be deleted individually.
  - Measurements from OUT-derived frames now explicitly record which OUT frame the saved value came from.

- Added INP editing tools.
  - INP/restart files can now be edited directly in the INP Structure panel.
  - Edited content is reparsed into the tree view without restricting user-defined CP2K keywords.
  - Added export support for edited INP/restart content.
  - Added a local INP custom statement library for reusable input fragments.
  - Custom statements can be saved with a title and full INP-formatted content in a popup editor, then reused after reopening the HTML file.
  - The INP editor can insert or quickly delete locally saved custom statements without relying on a selected text save workflow.
  - Inserting a custom statement now preserves the INP editor scroll position instead of jumping to the end of the file.

- Added INP file comparison.
  - Multiple INP/restart files can now be loaded at the same time.
  - Added a side-by-side diff view similar to editor file comparison tools.
  - Differences are shown with line numbers and highlighted added, removed, and modified rows.
  - Added one-click actions to fill missing lines, delete extra lines, or overwrite modified lines from the opposite side.
  - Added an enlarged INP comparison window with the same resize behavior as chart windows.
  - Added separate save buttons for the left and right edited comparison files.

### Changed

- Overview and Structure-OUT linking sections now start collapsed by default.
- Geometry optimization, Files and settings, and CP2K parameters now start collapsed by default.
- The SCF section no longer renders a large inline table in the right inspector. It now uses a compact summary plus a chart button.
- The Warnings and errors section no longer truncates to the first 20 records.
- Structure-OUT linking now ignores INP/restart coordinate frames when selecting the primary structure trajectory, so INP files can coexist with loaded XYZ structures.

### Fixed

- Preserved the Output Analysis scroll position while changing trajectory frames.
- Added a close button to inline OUT source locator snippets.
- Prevented loaded INP files with coordinate sections from replacing the primary structure dataset.
- Improved analysis panels so repeated or long OUT data does not overwhelm the inspector by default.
