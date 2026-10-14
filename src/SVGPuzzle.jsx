import { useMap } from "@mantine/hooks";
import { useMemo, useRef } from "react";
import { Layer, Path, Stage } from "react-konva";
import { useImage } from "react-konva-utils";
import invariant from "tiny-invariant";
import { usePuzzleSnap } from "./svgPuzzle.js";
const SVGPuzzle = ({
  svgData,
  width,
  height,
  pathInitializers,
  edgeNeighbors,
  debugSnapOverlay,
  ...otherProps
}) => {
  const { paths, svgWidth, svgHeight } = useMemo(() => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.visibility = "hidden";
    document.body.appendChild(container);
    container.innerHTML = svgData;
    const svgElement = container.querySelector("svg");
    invariant(svgElement, "Missing SVG element");
    const viewBoxSpec = svgElement.getAttribute("viewBox");
    invariant(viewBoxSpec, "Missing viewBox attribute");
    const viewBox = viewBoxSpec.split(" ");
    const svgWidth2 = parseFloat(viewBox[2]);
    const svgHeight2 = parseFloat(viewBox[3]);
    const patterns = {};
    svgElement.querySelectorAll("pattern").forEach((pattern) => {
      const id = pattern.getAttribute("id");
      const useElement = pattern.querySelector("use");
      const imageRef = useElement?.getAttribute("xlink:href");
      if (id && imageRef) {
        const imageId = imageRef.substring(1);
        const imageElement = svgElement.querySelector(`image[id="${imageId}"]`);
        const href =
          imageElement?.getAttribute("xlink:href") ??
          imageElement?.getAttribute("href");
        if (href?.startsWith("data:")) {
          invariant(href, `Pattern ${id} missing image data`);
          patterns[id] = {
            href,
            transform: useElement?.getAttribute("transform") ?? void 0,
          };
        }
      }
    });
    const pathElements = svgElement.querySelectorAll("path");
    const paths2 = Array.from(pathElements).map((pathElement, index) => {
      const data = pathElement.getAttribute("d");
      invariant(data, `Path ${index} missing 'd' attribute`);
      const fill = pathElement.getAttribute("fill") ?? void 0;
      const stroke = pathElement.getAttribute("stroke") ?? void 0;
      const strokeWidth = parseStrokeWidth(pathElement);
      const transform = pathElement.getAttribute("transform");
      let fillPatternSrc;
      let fillPatternTransform;
      if (fill?.startsWith("url(#")) {
        const patternId = /url\(#([^)]+)\)/.exec(fill)?.[1];
        if (patternId && patterns[patternId]) {
          const pattern = patterns[patternId];
          fillPatternSrc = pattern.href;
          fillPatternTransform = pattern.transform;
        }
      }
      return {
        id: `path-${index}`,
        data,
        fill,
        stroke,
        strokeWidth,
        transform,
        fillPatternSrc,
        fillPatternTransform,
      };
    });
    document.body.removeChild(container);
    return {
      paths: paths2,
      patterns,
      svgWidth: svgWidth2,
      svgHeight: svgHeight2,
    };
  }, [svgData]);
  const initialPathPositions = useMemo(
    () =>
      Object.entries(pathInitializers).map(([id, { initialPosition }]) => [
        id,
        initialPosition,
      ]),
    [pathInitializers],
  );
  const pathPositions = useMap(initialPathPositions);
  const {
    scale,
    /*, offsetX, offsetY */
  } = useMemo(() => {
    const scaleX = width / svgWidth;
    const scaleY = height / svgHeight;
    const uniformScale = Math.min(scaleX, scaleY);
    const scaledWidth = svgWidth * uniformScale;
    const scaledHeight = svgHeight * uniformScale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;
    return { scale: uniformScale, offsetX, offsetY };
  }, [width, height, svgWidth, svgHeight]);
  const { arePiecesSnapped, map } = usePuzzleSnap(
    edgeNeighbors,
    () => Object.fromEntries(pathPositions.entries()),
    () => scale,
  );
  const dragGroupRef = useRef(null);
  const layerRef = useRef(null);
  const collectConnectedComponent = (startId) => {
    const visited = /* @__PURE__ */ new Set();
    const queue = [startId];
    const component = [];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      component.push(currentId);
      const neighbors = map.neighbors[currentId] ?? [];
      for (const neighborId of neighbors) {
        if (
          !visited.has(neighborId) &&
          arePiecesSnapped(currentId, neighborId, 8)
        ) {
          queue.push(neighborId);
        }
      }
    }
    return component;
  };
  const autoAlignSnappedPieces = (pieceId, layer) => {
    const neighbors = map.neighbors[pieceId] ?? [];
    const snappedNeighbors = [];
    for (const neighborId of neighbors) {
      if (arePiecesSnapped(pieceId, neighborId, 8)) {
        snappedNeighbors.push(neighborId);
      }
    }
    if (snappedNeighbors.length === 0) return;
    const currentPos = pathPositions.get(pieceId);
    if (!currentPos) return;
    const neighborPos = pathPositions.get(snappedNeighbors[0]);
    if (!neighborPos) return;
    const alignedPos = {
      x: neighborPos.x,
      y: neighborPos.y,
    };
    const node = layer.findOne(`.${pieceId}`);
    if (node) {
      node.position(alignedPos);
      pathPositions.set(pieceId, alignedPos);
    }
  };
  const scaleMultiplier = 0.7;
  return (
    <Stage {...{ width, height }} {...otherProps}>
      <Layer
        ref={layerRef}
        scale={{ x: scale * scaleMultiplier, y: scale * scaleMultiplier }}
      >
        {paths.map((path) => {
          const { x, y } = pathPositions.get(path.id) ?? {};
          const props = {
            name: path.id,
            data: path.data,
            x,
            y,
            stroke: path.stroke,
            strokeWidth: path.strokeWidth,
            draggable: true,
            onDragEnd: ({ target }) => {
              document.body.style.cursor = "grab";
              const layer = target.getLayer();
              if (!layer) return;
              if (dragGroupRef.current) {
                const { groupIds } = dragGroupRef.current;
                for (const memberId of groupIds) {
                  const node = layer.findOne(`.${memberId}`);
                  if (node) {
                    pathPositions.set(memberId, {
                      x: node.x(),
                      y: node.y(),
                    });
                  }
                }
                for (const memberId of groupIds) {
                  autoAlignSnappedPieces(memberId, layer);
                }
                dragGroupRef.current = null;
              } else {
                pathPositions.set(path.id, {
                  x: target.x(),
                  y: target.y(),
                });
                autoAlignSnappedPieces(path.id, layer);
              }
            },
            onClick: ({ target }) => {
              target.moveToTop();
            },
            onTap: ({ target }) => {
              target.moveToTop();
            },
            onMouseEnter: ({ target }) => {
              target.opacity(0.8);
              document.body.style.cursor = "grab";
            },
            onMouseLeave: ({ target }) => {
              target.opacity(1);
              document.body.style.cursor = "default";
            },
            onDragStart: (evt) => {
              document.body.style.cursor = "grabbing";
              const groupIds = collectConnectedComponent(path.id);
              const layer = evt.target.getLayer();
              const memberStarts = {};
              for (const memberId of groupIds) {
                const node = layer?.findOne(`.${memberId}`);
                if (node) {
                  memberStarts[memberId] = { x: node.x(), y: node.y() };
                }
              }
              const leaderStart = memberStarts[path.id];
              if (leaderStart) {
                dragGroupRef.current = {
                  leaderId: path.id,
                  leaderStart,
                  groupIds,
                  memberStarts,
                };
              }
            },
            onDragMove: (evt) => {
              if (!dragGroupRef.current) return;
              const { leaderId, leaderStart, groupIds, memberStarts } =
                dragGroupRef.current;
              const layer = evt.target.getLayer();
              const leaderCurrent = { x: evt.target.x(), y: evt.target.y() };
              const delta = {
                x: leaderCurrent.x - leaderStart.x,
                y: leaderCurrent.y - leaderStart.y,
              };
              for (const memberId of groupIds) {
                if (memberId === leaderId) continue;
                const node = layer?.findOne(`.${memberId}`);
                if (node && memberStarts[memberId]) {
                  const memberStart = memberStarts[memberId];
                  if (memberStart) {
                    const newPos = {
                      x: memberStart.x + delta.x,
                      y: memberStart.y + delta.y,
                    };
                    node.position(newPos);
                  }
                }
              }
              layer?.batchDraw();
            },
          };
          const isSnapped =
            debugSnapOverlay &&
            Array.from(pathPositions.keys()).some(
              (neighborId) =>
                neighborId !== path.id &&
                arePiecesSnapped(path.id, neighborId, 8),
            );
          const snapProps = isSnapped
            ? {
                shadowColor: "lime",
                shadowBlur: 4 / scale,
                shadowOffset: { x: 0, y: 0 },
                shadowOpacity: 1,
                skipShadow: true,
              }
            : {};
          return path.fillPatternSrc ? (
            <ImagePath
              key={path.id}
              {...props}
              {...snapProps}
              {...{ pathInitializers }}
              fillPatternSrc={path.fillPatternSrc}
              fillPatternTransform={path.fillPatternTransform}
            />
          ) : (
            <Path key={path.id} {...props} {...snapProps} fill={path.fill} />
          );
        })}
      </Layer>
    </Stage>
  );
};
export default SVGPuzzle;
const parseStrokeWidth = (pathElement) => {
  const value = pathElement.getAttribute("stroke-width");
  if (value) {
    return parseFloat(value);
  }
};
const ImagePath = ({
  pathInitializers,
  fillPatternSrc,
  fillPatternTransform,
  ...otherProps
}) => {
  const ref = useRef(null);
  const [fillPatternImage] = useImage(fillPatternSrc);
  const { x, y } =
    typeof otherProps.name === "string"
      ? (pathInitializers[otherProps.name]?.fillPatternOffset ?? {})
      : { x: void 0, y: void 0 };
  return (
    <Path
      {...{ ref, fillPatternImage }}
      {...svgTransform2KonvaTransformAttributes(
        ref.current,
        fillPatternTransform,
      )}
      fillPatternX={x}
      fillPatternY={y}
      {...otherProps}
    />
  );
};
const svgTransform2KonvaTransformAttributes = (path, transform) => {
  if (!transform || !path) {
    return {};
  }
  const match = /matrix\(([^)]+)\)/.exec(transform);
  if (!match) {
    throw new Error("Invalid transform string: " + transform);
  }
  const [scaleX, _skewY, _skewX, scaleY, translateX, translateY] = match[1]
    .split(/[\s,]+/)
    .map(Number);
  const { width, height } = path.getClientRect({
    skipTransform: true,
    skipShadow: true,
  });
  return {
    fillPatternScale: {
      x: scaleX * width,
      y: scaleY * height,
    },
    fillPatternOffset: {
      x: translateX * width,
      y: translateY * height,
    },
  };
};
