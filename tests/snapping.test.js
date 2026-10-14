import test from "node:test";
import assert from "node:assert/strict";
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
