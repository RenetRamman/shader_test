export const GAMES = [
  {
    id: "conway",
    name: "Conway's Game of Life",
    description:
      "Cellular automaton simulation (GPU). Paint patterns, tweak speed, zoom, and seed from an image.",
    load: () => import("../games/conway/js/index.js"),
  },
];

