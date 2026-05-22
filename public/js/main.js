import { GAMES } from "./registry.js";

function renderLauncher() {
  const list = document.getElementById("gameList");
  if (!list) return;

  list.innerHTML = "";
  for (const game of GAMES) {
    const btn = document.createElement("button");
    btn.className = "gameButton";
    btn.type = "button";
    btn.addEventListener("click", () => {
      window.location.href = game.page;
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

renderLauncher();
