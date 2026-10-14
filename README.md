# Marsha Puzzle

Two standalone puzzles extracted from smallerworld-v1. Artwork, starting positions, and drag behavior are preserved. Only pieces sharing an edge can snap; corner contact is excluded. Reload starts over.

## Local setup

```sh
mise trust
mise install
mise exec -- npm ci --ignore-scripts
mise exec -- npm run hooks:install
mise exec -- npm run dev
```

Dependency lifecycle scripts stay disabled through `.npmrc`. Husky is installed explicitly by the trusted local command above.

```sh
mise exec -- npm run format:check
mise exec -- npm run lint
mise exec -- npm test
mise exec -- npm run build
mise exec -- npm exec -- playwright install chromium
mise exec -- npm run test:browser
mise exec -- npm run preview
```

Open `/marsha-puzzle/`, `/marsha-puzzle/?puzzle=1`, or `/marsha-puzzle/?puzzle=2`. Embed either direct puzzle URL in an iframe; the canvas follows its viewport. No progress is persisted.

Pushes to main validate and deploy through GitHub Actions. Pages must use the GitHub Actions source. The build base is `/marsha-puzzle/`.

Neighbor maps in `src/assets/edge-neighbors.json` describe the two fixed illustrations by SVG path order. Browser tests validate every pair against the actual completed outlines. Update and revalidate these maps if artwork or path ordering changes.
