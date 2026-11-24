# Gatework – logic gates to an 8-bit computer

A browser lab for building logic circuits, simulating them, reusing circuits as blocks and working up to an 8-bit computer.
React + Vite front end on top of a plain-JavaScript simulation engine.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # engine, git, i18n and UI tests
npm run build          # static site in dist/ (deploy anywhere, e.g. GitHub Pages)
npm run build:single   # one self-contained dist-single/index.html
```

## What is in it
* **Editor** – gates, flip-flops, registers, counters, RAM/ROM, MUX/decoders, constants, keys, 7-segment display, delays, 8-bit buses (divide / collect).
  Sub-circuits (any circuit can be placed inside another), pins on any side of a block, rotation, multi-select, copy/paste, zoom, multi-bend wires, auto-arrange *preview*.
* **Control & monitor** (right pane) – a controller built from the circuit's inputs (switch / push button / lamp / slider / number / bit toggles, 1–4 columns)
  and a monitor for outputs (LED / decimal / hex / binary / bar / 7-segment).
  *Probes* watch any block output inside the circuit. *Test cases* store input values with manually typed expected results and compare them with the live result.
  *Brute force* tries every 0/1 combination of the selected inputs, records the selected outputs, lets you type or save expected values (a baseline) and highlights mismatches; export as CSV.
* **Simplify** – Karnaugh maps with Quine–McCluskey minimisation and "build simplified circuit".
* **8-bit CPU** – assembler + emulator with an 8×8 pixel screen.
* **Languages** – English, සිංහල, தமிழ். **Themes** – light / dark.
* **Git & GitHub** – see below.

## Git and GitHub
A project is stored as a diff-friendly folder:

```
gatework.json            project name, open circuit, circuit order
circuits/<name>.json     one file per circuit (controller layout, probes, tests and brute-force baselines live in here too)
```
* **Local history** – commit snapshots in the browser, see changes since the last commit, restore any commit.
* **GitHub** – enter owner, repository, branch (optional sub-folder) and a *fine-grained personal access token* with **Contents: read & write**.
  *Push* creates one commit through the REST Git Data API (files deleted locally are deleted in the commit); *Pull* replaces the open project with the branch contents.
  The token is only sent to `api.github.com`, and is kept in `sessionStorage` unless you tick "remember".
  An empty repository is initialised automatically.
* **ZIP** – "Download repo ZIP" produces the same folder layout (plus README and .gitignore) that you can `git init` / push yourself, and *Open file* reads it back.
* The engine is plain data: you can also edit the JSON by hand or review circuit changes in pull requests.
* `.github/workflows/deploy.yml` tests and publishes the app to GitHub Pages on every push to `main`.

## Gate pictures
Gates are drawn as standard logic symbols by `src/engine/symbols.js`, the same drawing is used on the canvas and in the palette.
To use your own pictures, put them in `public/symbols/` and list them in `src/symbols.config.js` (`AND: '/symbols/and.png'`).

## Layout
```
src/engine/   simulation, geometry, layout, expressions, zip, CPU (no React)      ← state.js holds all shared state
src/debug/    controller/monitor helpers, probes, brute force, K-map helpers
src/git/      file tree <-> project, local history, GitHub client, downloads
src/panels/   right-pane tabs        src/ui/  header, palette, canvas, circuit bar
src/i18n/     en.js si.js ta.js      tests/   vitest suites
```
Adding a language: copy `src/i18n/en.js`, translate the values, register it in `src/i18n/index.jsx` (a test checks every key is present).
