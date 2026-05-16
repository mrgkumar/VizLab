# VizLab

VizLab is a home for interactive web-based visualizations across math, physics, chemistry, and related concepts.

## Structure

- `src/App.jsx` hosts the gallery and launches each visualization.
- `src/visualizations/` contains the interactive modules.
- `src/components/ui/` contains the small shared UI primitives used by the gallery and visualizations.

## Current Visualizations

- `src/visualizations/TrigDerivativeVisualizer.jsx`
- `src/visualizations/CircleTangentVisualization.jsx`

## GitHub Pages

This project is set up as a Vite static site with a GitHub Actions workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) that publishes `dist/` to GitHub Pages.

There is also a `deploy` script in `package.json` if you prefer the `gh-pages` branch workflow.

If your repository name is not `VizLab`, update the `base` value in [vite.config.js](./vite.config.js) to match your GitHub Pages path.

## Run Locally

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev`.
3. Build for deployment with `npm run build`.
4. Publish automatically through GitHub Actions, or run `npm run deploy` if you want the branch-based `gh-pages` flow.
