const readline = require("readline");

const BLOB = "●";
const PELLET = "*";

function createState(width, height) {
  return {
    width,
    height,
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    score: 0,
    pellet: null,
  };
}

function placePellet(state) {
  do {
    state.pellet = {
      x: Math.floor(Math.random() * state.width),
      y: Math.floor(Math.random() * state.height),
    };
  } while (state.pellet.x === state.x && state.pellet.y === state.y);
}

function move(state, dx, dy) {
  state.x = Math.min(state.width - 1, Math.max(0, state.x + dx));
  state.y = Math.min(state.height - 1, Math.max(0, state.y + dy));

  if (state.pellet && state.x === state.pellet.x && state.y === state.pellet.y) {
    state.score += 1;
    placePellet(state);
  }
}

function render(state) {
  const rows = [];
  rows.push("┌" + "─".repeat(state.width) + "┐");
  for (let y = 0; y < state.height; y++) {
    let row = "";
    for (let x = 0; x < state.width; x++) {
      if (x === state.x && y === state.y) row += BLOB;
      else if (state.pellet && x === state.pellet.x && y === state.pellet.y) row += PELLET;
      else row += " ";
    }
    rows.push("│" + row + "│");
  }
  rows.push("└" + "─".repeat(state.width) + "┘");
  rows.push(`Score: ${state.score}   Arrows/WASD to move, q to quit`);
  return rows.join("\n");
}

function draw(state) {
  process.stdout.write("\x1b[H\x1b[2J" + render(state) + "\n");
}

function start() {
  const width = Math.max(10, Math.min(60, (process.stdout.columns || 60) - 2));
  const height = Math.max(5, Math.min(20, (process.stdout.rows || 24) - 4));
  const state = createState(width, height);
  placePellet(state);

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  const quit = () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdout.write(`\nFinal score: ${state.score}\n`);
    process.exit(0);
  };

  process.stdin.on("keypress", (str, key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) return quit();

    const moves = {
      up: [0, -1], w: [0, -1],
      down: [0, 1], s: [0, 1],
      left: [-1, 0], a: [-1, 0],
      right: [1, 0], d: [1, 0],
    };
    const delta = moves[key.name];
    if (!delta) return;

    move(state, delta[0], delta[1]);
    draw(state);
  });

  draw(state);
}

if (require.main === module) start();

module.exports = { createState, move, render };
