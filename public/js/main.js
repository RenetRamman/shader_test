import { GAMES } from "./registry.js";

function parseHash() {
  const raw = (window.location.hash || "").replace(/^#/, "");
  const p = new URLSearchParams(raw);
  return {
    game: p.get("game"),
  };
}

function setHashGame(gameId) {
  const p = new URLSearchParams();
  p.set("game", gameId);
  window.location.hash = p.toString();
}

function clearHash() {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

function show(el, on) {
  if (!el) return;
  el.style.display = on ? "" : "none";
}

async function startGame(gameId) {
  const launcher = document.getElementById("launcher");
  const gameRoot = document.getElementById("gameRoot");
  show(launcher, false);
  show(gameRoot, true);

  const game = GAMES.find((g) => g.id === gameId) ?? GAMES[0];
  if (!game) throw new Error("No games registered.");

  const mod = await game.load();
  if (!mod || typeof mod.start !== "function") {
    throw new Error(`Game module '${game.id}' must export start().`);
  }

  mod.start({
    onBackToLauncher: () => {
      clearHash();
      window.location.reload();
    },
  });
}

function renderLauncher() {
  const list = document.getElementById("gameList");
  if (!list) return;

  list.innerHTML = "";
  for (const game of GAMES) {
    const btn = document.createElement("button");
    btn.className = "gameButton";
    btn.type = "button";
    btn.addEventListener("click", () => {
      setHashGame(game.id);
      window.location.reload();
    });

    const title = document.createElement("div");
    title.className = "gameButtonTitle";
    title.textContent = game.name;

    const desc = document.createElement("div");
    desc.className = "gameButtonDesc";
    desc.textContent = game.description || "";

    btn.appendChild(title);
    btn.appendChild(desc);
    list.appendChild(btn);
  }
}

function boot() {
  const { game } = parseHash();
  const launcher = document.getElementById("launcher");
  const gameRoot = document.getElementById("gameRoot");

  if (!game) {
    show(gameRoot, false);
    show(launcher, true);
    renderLauncher();
    return;
  }

  startGame(game).catch((e) => {
    console.error(e);
    clearHash();
    show(gameRoot, false);
    show(launcher, true);
    renderLauncher();
  });
}

boot();

