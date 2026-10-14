import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const edgeNeighbors = JSON.parse(
  readFileSync("src/assets/edge-neighbors.json"),
);

for (const puzzle of [1, 2]) {
  test(`puzzle ${puzzle}: neighbor data matches completed SVG boundaries`, async ({
    page,
  }) => {
    await page.goto("/marsha-puzzle/");
    const svg = readFileSync(`src/assets/puzzle${puzzle}.svg`, "utf8");
    const pairs = await page.evaluate((svg) => {
      const container = document.createElement("div");
      container.innerHTML = svg;
      document.body.append(container);
      try {
        const paths = [...container.querySelectorAll("path")];
        const points = paths.map((path) => {
          const length = path.getTotalLength();
          return Array.from({ length: Math.ceil(length / 2) }, (_, i) =>
            path.getPointAtLength(i * 2),
          );
        });
        const grids = points.map((outline) => {
          const grid = new Map();
          for (const point of outline) {
            const key = `${Math.floor(point.x / 2)},${Math.floor(point.y / 2)}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(point);
          }
          return grid;
        });
        const pairs = [];
        for (let a = 0; a < paths.length; a++) {
          for (let b = a + 1; b < paths.length; b++) {
            let closePoints = 0;
            for (const point of points[a]) {
              const x = Math.floor(point.x / 2),
                y = Math.floor(point.y / 2);
              const candidates = [];
              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++)
                  candidates.push(
                    ...(grids[b].get(`${x + dx},${y + dy}`) ?? []),
                  );
              }
              if (
                candidates.some(
                  (other) =>
                    Math.hypot(point.x - other.x, point.y - other.y) < 2,
                )
              )
                closePoints++;
            }
            pairs.push({
              a: `path-${a}`,
              b: `path-${b}`,
              sharedLength: closePoints * 2,
            });
          }
        }
        return pairs;
      } finally {
        container.remove();
      }
    }, svg);
    for (const { a, b, sharedLength } of pairs) {
      // These fixed illustrations have 124+ unit edges and at most 12 units of corner proximity.
      expect(
        edgeNeighbors[puzzle][a].includes(b),
        `${a}/${b}: ${sharedLength} shared SVG units`,
      ).toBe(sharedLength > 40);
    }
    expect(pairs.filter((pair) => pair.sharedLength > 40)).toHaveLength(
      puzzle === 1 ? 6 : 7,
    );
  });
}
