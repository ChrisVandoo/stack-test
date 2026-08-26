const readline = require("readline");

const BLOB = "●";
const PELLET = "*";
const OBSTACLE = "▓";
const OBSTACLE_DENSITY = 0.08;

function createState(width, height) {
  return {
    width,
    height,
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    score: 0,
    pellet: null,
    obstacles: [],
  };
}

function isObstacle(state, x, y) {
  return state.obstacles.some((o) => o.x === x && o.y === y);
}

function placeObstacles(state) {
  const count = Math.round(state.width * state.height * OBSTACLE_DENSITY);
  state.obstacles = [];

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * state.width);
    const y = Math.floor(Math.random() * state.height);

    // Never wall in the blob's own square or the ones it starts next to.
    if (Math.abs(x - state.x) <= 1 && Math.abs(y - state.y) <= 1) continue;
    if (isObstacle(state, x, y)) continue;

    state.obstacles.push({ x, y });
  }
}

// Squares the blob can actually walk to from where it stands, so a pellet
// never spawns inside a pocket the obstacles have sealed off.
function reachableSquares(state) {
  const seen = new Set([state.y * state.width + state.x]);
  const queue = [[state.x, state.y]];

  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
      const key = ny * state.width + nx;
      if (seen.has(key) || isObstacle(state, nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }

  seen.delete(state.y * state.width + state.x);
  return [...seen];
}

function placePellet(state) {
  const open = reachableSquares(state);
  if (open.length === 0) {
    state.pellet = null;
    return;
  }

  const key = open[Math.floor(Math.random() * open.length)];
  state.pellet = { x: key % state.width, y: Math.floor(key / state.width) };
}

function move(state, dx, dy) {
  const nextX = Math.min(state.width - 1, Math.max(0, state.x + dx));
  const nextY = Math.min(state.height - 1, Math.max(0, state.y + dy));

  // Obstacles are solid: bump into one and the blob stays put.
  if (isObstacle(state, nextX, nextY)) return;

  state.x = nextX;
  state.y = nextY;

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
      else if (isObstacle(state, x, y)) row += OBSTACLE;
      else row += " ";
    }
    rows.push("│" + row + "│");
  }
  rows.push("└" + "─".repeat(state.width) + "┘");
  rows.push(`Score: ${state.score}   Avoid the ${OBSTACLE} walls - q to quit`);
  return rows.join("\n");
}

function draw(state) {
  process.stdout.write("\x1b[H\x1b[2J" + render(state) + "\n");
}

function start() {
  const width = Math.max(10, Math.min(60, (process.stdout.columns || 60) - 2));
  const height = Math.max(5, Math.min(20, (process.stdout.rows || 24) - 4));
  const state = createState(width, height);
  placeObstacles(state);
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

module.exports = {
  createState,
  move,
  render,
  placeObstacles,
  placePellet,
  isObstacle,
  reachableSquares,
};
