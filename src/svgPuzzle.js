import { useCallback, useMemo } from "react";
export function arePiecesSnappedFn(a, b, translations, map, toleranceSvg) {
  if (!map.neighbors[a]?.includes(b)) {
    return false;
  }
  const transA = translations[a];
  const transB = translations[b];
  if (!transA || !transB) {
    return false;
  }
  const dx = transB.x - transA.x;
  const dy = transB.y - transA.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const isSnapped = distance <= toleranceSvg;
  return isSnapped;
}
export function usePuzzleSnap(neighbors, getTranslations, getScale) {
  const map = useMemo(() => ({ neighbors }), [neighbors]);
  const arePiecesSnapped = useCallback(
    (a, b, tolerancePx = 8) => {
      const toleranceSvg = tolerancePx / getScale();
      return arePiecesSnappedFn(a, b, getTranslations(), map, toleranceSvg);
    },
    [getTranslations, getScale, map],
  );
  return { map, arePiecesSnapped };
}
