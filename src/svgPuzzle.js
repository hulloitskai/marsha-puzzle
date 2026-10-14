import { useCallback, useMemo } from "react";
export function buildRelativityMapFromSVG(svgRaw) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  document.body.appendChild(container);
  container.innerHTML = svgRaw;
  const svgElement = container.querySelector("svg");
  if (!svgElement) {
    throw new Error("Missing SVG element");
  }
  const viewBoxSpec = svgElement.getAttribute("viewBox");
  if (!viewBoxSpec) {
    throw new Error("Missing viewBox attribute");
  }
  const viewBox = viewBoxSpec.split(" ");
  const svgWidth = parseFloat(viewBox[2]);
  const svgHeight = parseFloat(viewBox[3]);
  const pathElements = svgElement.querySelectorAll("path");
  const paths = [];
  pathElements.forEach((pathElement, index) => {
    const data = pathElement.getAttribute("d");
    if (data) {
      paths.push({
        id: `path-${index}`,
        element: pathElement,
      });
    }
  });
  const neighbors = {};
  paths.forEach(({ id }) => {
    neighbors[id] = [];
  });
  // shortcut: all distinct pieces are neighbors; restrict to shared edges in the fast-follow.
  for (let i = 0; i < paths.length; i++) {
    for (let j = 0; j < paths.length; j++) {
      if (i !== j) {
        neighbors[paths[i].id].push(paths[j].id);
      }
    }
  }
  document.body.removeChild(container);
  return {
    neighbors,
    svgWidth,
    svgHeight,
  };
}
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
export function usePuzzleSnap(svgRaw, getTranslations, getScale) {
  const map = useMemo(() => buildRelativityMapFromSVG(svgRaw), [svgRaw]);
  const arePiecesSnapped = useCallback(
    (a, b, tolerancePx = 8) => {
      const toleranceSvg = tolerancePx / getScale();
      return arePiecesSnappedFn(a, b, getTranslations(), map, toleranceSvg);
    },
    [getTranslations, getScale, map],
  );
  return { map, arePiecesSnapped };
}
