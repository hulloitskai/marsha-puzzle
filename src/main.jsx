import { createRoot } from "react-dom/client";
import { useViewportSize } from "@mantine/hooks";
import SVGPuzzle from "./SVGPuzzle.jsx";
import puzzleOne from "./assets/puzzle1.svg?raw";
import puzzleTwo from "./assets/puzzle2.svg?raw";
import initializersOne from "./assets/puzzle1.initializers.json";
import initializersTwo from "./assets/puzzle2.initializers.json";
import "./style.css";

function Puzzle({ svgData, pathInitializers }) {
  const { width, height } = useViewportSize();
  return (
    <SVGPuzzle
      {...{ svgData, pathInitializers, width, height }}
      debugSnapOverlay
    />
  );
}

function App() {
  const puzzle = new URLSearchParams(window.location.search).get("puzzle");
  if (puzzle === "1" || puzzle === "2") {
    return (
      <Puzzle
        svgData={puzzle === "1" ? puzzleOne : puzzleTwo}
        pathInitializers={puzzle === "1" ? initializersOne : initializersTwo}
      />
    );
  }
  return (
    <main>
      <h1>Marsha's Puzzle</h1>
      <ul>
        <li>
          <a href="?puzzle=1">Puzzle One</a>
        </li>
        <li>
          <a href="?puzzle=2">Puzzle Two</a>
        </li>
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
