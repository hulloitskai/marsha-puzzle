import test from "node:test";
import assert from "node:assert/strict";
import edgeNeighbors from "../src/assets/edge-neighbors.json" with { type: "json" };
import { arePiecesSnappedFn } from "../src/svgPuzzle.js";

test("legacy snapping uses translation distance, includes the boundary, and rejects missing/non-neighbor pieces", () => {
  const map = { neighbors: { a: ["b"], b: ["a"], c: [] } };
  const translations = {
    a: { x: 10, y: -20 },
    b: { x: 13, y: -16 },
    c: { x: 10, y: -20 },
  };
  assert.equal(arePiecesSnappedFn("a", "b", translations, map, 5), true);
  assert.equal(arePiecesSnappedFn("a", "b", translations, map, 4.999), false);
  assert.equal(arePiecesSnappedFn("a", "c", translations, map, 8), false);
  assert.equal(arePiecesSnappedFn("a", "a", translations, map, 8), false);
  assert.equal(
    arePiecesSnappedFn("a", "b", { a: translations.a }, map, 8),
    false,
  );
  // Fit scale, rather than the extra 0.7 rendering multiplier, determines tolerance.
  assert.equal(arePiecesSnappedFn("a", "b", translations, map, 8 / 2), false);
  assert.equal(arePiecesSnappedFn("a", "b", translations, map, 8 / 1), true);
});

for (const puzzle of [1, 2]) {
  test(`puzzle ${puzzle}: only symmetric edge neighbors can snap at identical translations`, () => {
    const neighbors = edgeNeighbors[puzzle];
    const ids = Array.from({ length: 5 }, (_, i) => `path-${i}`);
    assert.deepEqual(Object.keys(neighbors), ids);
    const translations = Object.fromEntries(
      ids.map((id) => [id, { x: 0, y: 0 }]),
    );
    for (const a of ids) {
      assert.equal(new Set(neighbors[a]).size, neighbors[a].length);
      for (const b of ids) {
        assert.equal(
          arePiecesSnappedFn(a, b, translations, { neighbors }, 8),
          neighbors[a].includes(b),
        );
        assert.equal(neighbors[a].includes(b), neighbors[b].includes(a));
      }
      assert.equal(neighbors[a].includes(a), false);
    }
    assert.equal(
      arePiecesSnappedFn("path-0", "path-4", translations, { neighbors }, 8),
      false,
    );
  });
}

test("Puzzle One corner contact between pieces 2 and 3 is not an edge", () => {
  assert.equal(edgeNeighbors[1]["path-2"].includes("path-3"), false);
});
