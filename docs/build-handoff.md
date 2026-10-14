# Standalone puzzle build handoff

Status: confirmed by the user. Ready for implementation by a fresh agent. The interview session produced docs only.

## Authorized scope

Build in `/Users/kai/Projects/marsha-puzzle` from the existing implementation in `../smallerworld-v1`. Leave the source project unchanged. This session produces docs only; a fresh agent will implement.

Use Vite with the JavaScript React template (a newer compatible React version is allowed). Manage tool versions with mise. Add Prettier, basic modern ESLint configuration, and Husky commit hooks that check formatting and lint. GitHub Actions must build and deploy GitHub Pages on pushes to main. Commit directly to main and push to `git@github.com:hulloitskai/marsha-puzzle` after validation. Inspect the remote before establishing history; preserve any existing work.

Barebones landing page: links to Puzzle One and Puzzle Two. Use `?puzzle=1` and `?puzzle=2` for direct puzzle links without server routing. Reload resets progress. Preserve existing puzzle behavior for the first working release. Edge-only snapping is a separate fast-follow, not part of this build.

## Source and parity contract

Read these source files before extraction:

- `app/pages/MarshaPuzzlePage.tsx`
- `app/components/SVGPuzzle.tsx`
- `app/helpers/svgPuzzle.ts`
- `app/controllers/marsha_puzzles_controller.rb`
- `app/assets/marshapuzzle/puzzle1.svg`
- `app/assets/marshapuzzle/puzzle1.initializers.json`
- `app/assets/marshapuzzle/puzzle2.svg`
- `app/assets/marshapuzzle/puzzle2.initializers.json`

Rails only supplies SVG and initializer data; replace this with static assets. Remove Rails/Inertia integration from the copied standalone code. Preserve asset bytes, SVG path ordering, initializer positions, embedded image data, pattern matrices, and fill offsets. Piece IDs are assigned by path order (`path-0`, etc.).

Canvas fills the viewport. Layer scale is `0.7 * min(viewportWidth / svgWidth, viewportHeight / svgHeight)`, anchored top-left; computed centering offsets are unused. Retain this behavior.

Current snapping treats all distinct pairs as neighbors. Distance is measured between piece translations with tolerance `8 / viewportFitScale`; the additional rendering multiplier makes visible tolerance about 5.6 px. Dragging collects snapped connected components, moves members together, and aligns pieces on drag-end to the first snapped neighbor. Preserve this logic initially, including the lime snap highlight.

Click/tap brings a piece to front. Hover reduces opacity to 0.8; leaving restores 1. Cursor changes between default, grab, and grabbing. There is no shuffle, persistence, completion screen, or reset button to reproduce.

Legacy dependency versions: React 18.3.1, react-konva 18.2.10, Konva 9.3.20, Mantine hooks 8.3.12, react-konva-utils 1.1.0, tiny-invariant 1.3.3. Choose mutually compatible versions; don't upgrade puzzle algorithms alongside extraction. Parent PageLayout includes unrelated analytics, PWA and web-push services; these are outside the standalone puzzle scope.

## Setup and deployment

- User chose Vite instead of the originally requested CRA after reviewing its [deprecation](https://react.dev/blog/2025/02/14/sunsetting-create-react-app). Scaffold with the JavaScript React template. Existing handoff docs make this directory nonempty: preserve them when scaffolding; use a temporary sibling directory if the generator would clear files.
- npm supports lifecycle suppression via `ignore-scripts`; pass `npm_config_ignore_scripts=true` through bootstrap and persist `.npmrc`. The requested generator itself still executes. [npm documentation](https://docs.npmjs.com/cli/install/).
- Use npm with lifecycle scripts disabled. pnpm is only a fallback if safe npm bootstrapping cannot work; do not assume pnpm dlx is automatically script-free. [pnpm documentation](https://pnpm.io/cli/pnx).
- Disabling lifecycle scripts skips Husky prepare. Explicitly initialize the trusted Husky command and document the local setup command. Evaluate any necessary build-tool setup narrowly rather than re-enabling all dependency scripts.
- Pin exact compatible tool versions in `mise.toml`; use the same versions locally and in CI. [mise documentation](https://mise.jdx.dev/configuration.html).
- Expected Pages base path is `/marsha-puzzle/`. Ensure assets and direct puzzle links work at that subpath.
- Actions deployment uses configure-pages, upload-pages-artifact and deploy-pages, with `pages: write`, `id-token: write`, and the github-pages environment. Confirm Pages source is GitHub Actions. [GitHub documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- Iframe support is required. Puzzle viewport dimensions must follow the iframe viewport, and direct puzzle URLs must render without landing-page chrome. Validate framing on a different-origin host as well as standalone use. GitHub Pages controls response headers; verify the deployed site can be framed instead of assuming source-app header settings transfer.
- Verify desktop and touch interactions for both puzzles: artwork, initial positions, drag, group movement, snap highlighting, reload reset, and direct-link refresh. Touch-sized rendering alone does not verify touch input; exercise actual touch events or report that gap.
- Keep the landing page barebones and puzzle canvases full viewport, without extra controls. Run check-only Prettier and ESLint from Husky pre-commit and CI. Deploy only after checks and the production build pass on pushes to main.

## Completion requirements

Run formatting, lint, a production build, and a small meaningful test of preserved snapping behavior. Compare both puzzles' rendering and interaction against the source behavior. Verify reload reset, direct puzzle-link refresh, and Pages subpath asset loading. Check deployed workflow and site after push; report external blockers explicitly.

## Fast-follow

After the full working standalone release, restrict snapping to pieces sharing an edge. Current all-to-all neighbor construction is deliberate parity for the initial extraction, not the intended final adjacency rule. Plan and validate edge detection separately; do not silently include it in the first release.
