import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

type FlagRestriction = {
  flags: string[];
  reason?: string;
};

type StoryOption = {
  target: string;
  text: string;
  setFlags?: string[];
  clearFlags?: string[];
  HideIf?: FlagRestriction[];
  HideIfNot?: FlagRestriction[];
  DisableIf?: FlagRestriction[];
  DisableIfNot?: FlagRestriction[];
  metadata?: Record<string, unknown>;
};

type SceneImage = {
  background: string;
  parallax: number;
  wobble?: number;
};

type StoryScene = {
  id: string;
  images: SceneImage[];
  speaker: string;
  title: string;
  text: string;
  options: StoryOption[];
  setFlags?: string[];
  clearFlags?: string[];
};

type StatusFlag = {
  name: string;
  visible: boolean;
};

type GameState = {
  activeFlags: string[];
};

function App() {
const [scenes, setScenes] = React.useState<Record<string, StoryScene>>({});
const [currentSceneId, setCurrentSceneId] = React.useState(() => {
  return localStorage.getItem("currentSceneId") ?? "intro-woods-1";
});
const [flags, setFlags] = React.useState<Record<string, StatusFlag>>({});
const [gameState, setGameState] = React.useState<GameState>(() => {
  const raw = localStorage.getItem("gameState");
  if (!raw) return { activeFlags: [] };

  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return { activeFlags: [] };
  }
});

const [mousePos, setMousePos] = React.useState({ x: 0.5, y: 0.5 });

function handleMouseMove(event: React.MouseEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect();

  setMousePos({
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  });
}

const [wobbleSeed, setWobbleSeed] = React.useState(0);

React.useEffect(() => {
  const interval = window.setInterval(() => {
    setWobbleSeed(Math.random() * 10000);
  }, 200);

  return () => window.clearInterval(interval);
}, []);

React.useEffect(() => {
  localStorage.setItem("currentSceneId", currentSceneId);
}, [currentSceneId]);

React.useEffect(() => {
  localStorage.setItem("gameState", JSON.stringify(gameState));
}, [gameState]);

React.useEffect(() => {
  fetch("flags.json")
    .then((response) => response.json())
    .then((data) => {
      setFlags(data);
    });
}, []);

React.useEffect(() => {
  fetch("script.json")
    .then((response) => response.json())
    .then((data) => {
      setScenes(data);
    });
}, []);

const visibleStatusEffects = gameState.activeFlags
  .map((flagId) => flags[flagId])
  .filter((flag): flag is StatusFlag => flag !== undefined && flag.visible)
  .map((flag) => flag.name);


  const scene = scenes[currentSceneId];

  function saveGame(): void {
    console.log("Save clicked");
  }

  function loadGame(): void {
    console.log("Load clicked");
  }

function resetGame(): void {
  const sceneId = "intro-woods-1";
  const nextScene = scenes[sceneId];

  const activeFlags = new Set<string>();

  nextScene?.clearFlags?.forEach((flag) => activeFlags.delete(flag));
  nextScene?.setFlags?.forEach((flag) => activeFlags.add(flag));

  const newGameState: GameState = {
    activeFlags: Array.from(activeFlags),
  };

  setCurrentSceneId(sceneId);
  setGameState(newGameState);

  localStorage.setItem("currentSceneId", sceneId);
  localStorage.setItem("gameState", JSON.stringify(newGameState));
}

function enterScene(sceneId: string): void {
  const nextScene = scenes[sceneId];

  setGameState((oldState) => {
    const activeFlags = new Set(oldState.activeFlags);

    nextScene?.clearFlags?.forEach((flag) => activeFlags.delete(flag));
    nextScene?.setFlags?.forEach((flag) => activeFlags.add(flag));

    return {
      ...oldState,
      activeFlags: Array.from(activeFlags),
    };
  });

  setCurrentSceneId(sceneId);
}

function selectOption(option: StoryOption): void {
  const nextScene = scenes[option.target];

  setGameState((oldState) => {
    const activeFlags = new Set(oldState.activeFlags);

    option.clearFlags?.forEach((flag) => activeFlags.delete(flag));
    option.setFlags?.forEach((flag) => activeFlags.add(flag));

    nextScene?.clearFlags?.forEach((flag) => activeFlags.delete(flag));
    nextScene?.setFlags?.forEach((flag) => activeFlags.add(flag));

    return {
      ...oldState,
      activeFlags: Array.from(activeFlags),
    };
  });

  setCurrentSceneId(option.target);
}

function hasAnyFlag(restriction: FlagRestriction): boolean {
  return restriction.flags.some((flag) => gameState.activeFlags.includes(flag));
}

function hasMissingFlag(restriction: FlagRestriction): boolean {
  return restriction.flags.some((flag) => !gameState.activeFlags.includes(flag));
}

function shouldHideOption(option: StoryOption): boolean {
  if (option.HideIf?.some(hasAnyFlag)) return true;
  if (option.HideIfNot?.some(hasMissingFlag)) return true;

  return false;
}

function shouldDisableOption(option: StoryOption): boolean {
  if (option.DisableIf?.some(hasAnyFlag)) return true;
  if (option.DisableIfNot?.some(hasMissingFlag)) return true;

  return false;
}

function applyFlagChanges(setFlags?: string[], clearFlags?: string[]): void {
  setGameState((oldState) => {
    const activeFlags = new Set(oldState.activeFlags);

    clearFlags?.forEach((flag) => activeFlags.delete(flag));
    setFlags?.forEach((flag) => activeFlags.add(flag));

    return {
      ...oldState,
      activeFlags: Array.from(activeFlags),
    };
  });
}

  if (!scene) {
    return <div>Loading... {currentSceneId}           <button onClick={resetGame}>Reset</button>
</div>;
  }

  return (
      <main className="game" onMouseMove={handleMouseMove}>

        <svg className="svgFilters" xmlns="http://www.w3.org/2000/svg">
          {scene.images.map((image, index) => (
            <filter
                key={index}
                id={`wobbleFilter-${index}`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015"
                numOctaves="2"
                seed={wobbleSeed}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={image.wobble ?? 0}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </svg>            

        <div className="backgroundLayers">
          {scene.images.map((image, index) => {

            const absParallax = Math.abs(image.parallax);

            if (absParallax < 1) {
              console.warn("Parallax absolute value must be at least 1:", image);
            }

            const wobbleBleedPercent = image.wobble ? image.wobble * 0.25 : 0; // not working
            const sizePercent = absParallax * 100 + wobbleBleedPercent;
            const overflowPercent = sizePercent - 100;

            const direction = image.parallax >= 0 ? 1 : -1;

            const xPercent =
              direction === 1
                ? -overflowPercent * mousePos.x
                : -overflowPercent * (1 - mousePos.x);

            const yPercent =
              direction === 1
                ? -overflowPercent * mousePos.y
                : -overflowPercent * (1 - mousePos.y);

            return (
              <div
                key={index}
                className="backgroundLayer"
                style={{
                  width: `${sizePercent}%`,
                  height: `${sizePercent}%`,
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                }}
              >
                <img
                  src={image.background}
                  className="backgroundImage"
                  style={{
                    filter: image.wobble
                      ? `url(#wobbleFilter-${index})`
                      : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>

        <section className="leftPane">
        <div className="sceneTitle">{scene.title}</div>

        <div className="saveLoadButtons">
          <button onClick={saveGame}>Save (unimp)</button>
          <button onClick={loadGame}>Load (unimp)</button>
          <button onClick={resetGame}>Reset</button>
        </div>

        <article className="textBox">
          <h1>{scene.speaker}</h1>
          <p>{scene.text}</p>
        </article>
      </section>

      <aside className="rightPane">
        <div className="actionsArea">
          <ul>
            {scene.options
              .filter((option) => !shouldHideOption(option))
              .map((option) => {
                const disabled = shouldDisableOption(option);

                return (
                  <li key={option.target}>
                    <button
                      disabled={disabled}
                      onClick={() => selectOption(option)}
                      className={disabled ? "disabledOption" : ""}
                    >
                      {option.text}
                    </button>
                  </li>
                );
              })}
            </ul>
        </div>

        <div className="statusArea">
          <h3>Status</h3>
          {visibleStatusEffects.map((effect) => (
            <div key={effect} className="statusEffect">
              {effect}
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);