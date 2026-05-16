# VizLab

VizLab is a home for interactive web-based visualizations across math, physics, chemistry, and related concepts.

## Structure

- `src/App.jsx` hosts the gallery and launches each visualization.
- `src/visualizations/` contains the interactive modules.
- `src/components/ui/` contains the small shared UI primitives used by the gallery and visualizations.

## Current Visualizations

- `src/visualizations/TrigDerivativeVisualizer.jsx`
- `src/visualizations/CircleTangentVisualization.jsx`
- `src/visualizations/SolenoidVisualization.jsx`

## GitHub Pages

This project is set up for manual GitHub Pages deployment from the `gh-pages` branch.

Use `npm run build` to verify locally, then `npm run deploy` to publish `dist/` to GitHub Pages.

If your repository name is not `VizLab`, update the `base` value in [vite.config.js](./vite.config.js) to match your GitHub Pages path.

## Run Locally

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev`.
3. Build for deployment with `npm run build`.
4. Publish with `npm run deploy` when you want to push the built site to GitHub Pages.
