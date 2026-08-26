const readline = require("readline");

const BLOB = "●";
const PELLET = "*";
const OBSTACLE = "▓";
const OBSTACLE_DENSITY = 0.08;
const PELLET_COUNT = 10;

const TITLE_ART = [
  "██████  ██       ██████  ██████ ",
  "██   ██ ██      ██    ██ ██   ██",
  "██████  ██      ██    ██ ██████ ",
  "██   ██ ██      ██    ██ ██   ██",
  "██████  ███████  ██████  ██████ ",
];

function createState(width, height) {
  return {
    width,
    height,
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    score: 0,
    pellets: [],
    obstacles: [],
    screen: "title",
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

function isPellet(state, x, y) {
  return state.pellets.some((p) => p.x === x && p.y === y);
}

// Tops the board back up to PELLET_COUNT, skipping squares that are already
// taken. Fewer are placed only when the reachable area is genuinely smaller.
function placePellets(state) {
  const open = reachableSquares(state).filter(
    (key) => !isPellet(state, key % state.width, Math.floor(key / state.width))
  );

  while (state.pellets.length < PELLET_COUNT && open.length > 0) {
    const i = Math.floor(Math.random() * open.length);
    const key = open.splice(i, 1)[0];
    state.pellets.push({ x: key % state.width, y: Math.floor(key / state.width) });
  }
}

function move(state, dx, dy) {
  const nextX = Math.min(state.width - 1, Math.max(0, state.x + dx));
  const nextY = Math.min(state.height - 1, Math.max(0, state.y + dy));

  // Obstacles are solid: bump into one and the blob stays put.
  if (isObstacle(state, nextX, nextY)) return;

  state.x = nextX;
  state.y = nextY;

  const eaten = state.pellets.findIndex((p) => p.x === state.x && p.y === state.y);
  if (eaten !== -1) {
    state.pellets.splice(eaten, 1);
    state.score += 1;
    placePellets(state);
  }
}

function center(line, width) {
  const pad = Math.max(0, Math.floor((width - [...line].length) / 2));
  return " ".repeat(pad) + line;
}

function frame(lines, width) {
  const rows = ["┌" + "─".repeat(width) + "┐"];
  for (const line of lines) {
    const visible = [...line].slice(0, width).join("");
    rows.push("│" + visible + " ".repeat(width - [...visible].length) + "│");
  }
  rows.push("└" + "─".repeat(width) + "┘");
  return rows;
}

function renderTitle(state) {
  const { width, height } = state;
  const narrow = width < 24;
  const art = TITLE_ART[0].length <= width ? TITLE_ART : ["B L O B"];
  const hints = narrow
    ? ["wasd move", "q quit"]
    : ["arrows / wasd  move", "q              quit"];
  const body = [
    ...art.map((line) => center(line, width)),
    "",
    center(narrow ? "eat the " + PELLET : "collect the " + PELLET + " pellets", width),
    "",
    ...hints.map((line) => center(line, width)),
  ];

  const blank = Math.max(0, Math.floor((height - body.length) / 2));
  const lines = [...Array(blank).fill(""), ...body];
  while (lines.length < height) lines.push("");

  return frame(lines.slice(0, height), width).join("\n") +
    "\n" + center("press SPACE to start", width + 2);
}

function renderGame(state) {
  const lines = [];
  for (let y = 0; y < state.height; y++) {
    let row = "";
    for (let x = 0; x < state.width; x++) {
      if (x === state.x && y === state.y) row += BLOB;
      else if (isPellet(state, x, y)) row += PELLET;
      else if (isObstacle(state, x, y)) row += OBSTACLE;
      else row += " ";
    }
    lines.push(row);
  }
  return frame(lines, state.width).join("\n") +
    `\nScore: ${state.score}   Pellets: ${state.pellets.length}   ` +
    `Avoid the ${OBSTACLE} walls - q to quit`;
}

function render(state) {
  return state.screen === "title" ? renderTitle(state) : renderGame(state);
}

function startGame(state) {
  state.screen = "playing";
  state.score = 0;
  state.x = Math.floor(state.width / 2);
  state.y = Math.floor(state.height / 2);
  state.pellets = [];
  placeObstacles(state);
  placePellets(state);
}

function draw(state) {
  process.stdout.write("\x1b[H\x1b[2J" + render(state) + "\n");
}

function start() {
  const width = Math.max(10, Math.min(60, (process.stdout.columns || 60) - 2));
  const height = Math.max(9, Math.min(20, (process.stdout.rows || 24) - 4));
  const state = createState(width, height);

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  const quit = () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    const tail = state.screen === "playing" ? `\nFinal score: ${state.score}\n` : "\n";
    process.stdout.write(tail);
    process.exit(0);
  };

  process.stdin.on("keypress", (str, key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) return quit();

    if (state.screen === "title") {
      if (key.name === "space" || key.name === "return") {
        startGame(state);
        draw(state);
      }
      return;
    }

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
  renderTitle,
  renderGame,
  startGame,
  placeObstacles,
  placePellets,
  isPellet,
  isObstacle,
  reachableSquares,
};
