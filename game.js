const readline = require("readline");

const BLOB = "●";
const PELLET = "*";
const OBSTACLE = "▓";
const OBSTACLE_DENSITY = 0.08;
const BOULDER = "O";
const BOULDER_COUNT = 6;
const PELLET_COUNT = 10;
const MOVES_PER_GAME = 30;
const MAX_NAME = 12;
const DEFAULT_NAME = "Blob";

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
    boulders: [],
    movesLeft: MOVES_PER_GAME,
    nameInput: "",
    name: DEFAULT_NAME,
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

function isBoulder(state, x, y) {
  return state.boulders.some((b) => b.x === x && b.y === y);
}

function placeBoulders(state) {
  state.boulders = [];

  // Only on squares the blob could already walk to, and never right beside it,
  // so a round never opens with a boulder shoved against the blob's nose.
  const open = reachableSquares(state).filter((key) => {
    const x = key % state.width;
    const y = Math.floor(key / state.width);
    return Math.abs(x - state.x) > 1 || Math.abs(y - state.y) > 1;
  });

  while (state.boulders.length < BOULDER_COUNT && open.length > 0) {
    const i = Math.floor(Math.random() * open.length);
    const key = open.splice(i, 1)[0];
    state.boulders.push({ x: key % state.width, y: Math.floor(key / state.width) });
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
      if (seen.has(key) || isObstacle(state, nx, ny) || isBoulder(state, nx, ny)) continue;
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

function rehomeStrandedPellets(state) {
  const open = new Set(reachableSquares(state));
  const stranded = state.pellets.filter((p) => !open.has(p.y * state.width + p.x));
  if (stranded.length === 0) return;

  state.pellets = state.pellets.filter((p) => open.has(p.y * state.width + p.x));
  placePellets(state);
}

function move(state, dx, dy) {
  const nextX = Math.min(state.width - 1, Math.max(0, state.x + dx));
  const nextY = Math.min(state.height - 1, Math.max(0, state.y + dy));

  // Obstacles are solid: bump into one and the blob stays put, and the
  // wasted step doesn't come out of the move budget.
  if (isObstacle(state, nextX, nextY)) return;

  // Boulders give way instead, but only when the square behind them is clear.
  // A boulder with its back to a wall is as good as one, and shoving costs the
  // same single move that walking does.
  const boulder = state.boulders.find((b) => b.x === nextX && b.y === nextY);
  if (boulder) {
    const overX = nextX + dx;
    const overY = nextY + dy;
    const blocked =
      overX < 0 ||
      overY < 0 ||
      overX >= state.width ||
      overY >= state.height ||
      isObstacle(state, overX, overY) ||
      isBoulder(state, overX, overY) ||
      isPellet(state, overX, overY);

    if (blocked) return;

    boulder.x = overX;
    boulder.y = overY;
  }

  state.x = nextX;
  state.y = nextY;

  // A shoved boulder can seal a corridor, so any pellet it cut off is re-homed
  // rather than left stranded for the rest of the round.
  if (boulder) rehomeStrandedPellets(state);

  const eaten = state.pellets.findIndex((p) => p.x === state.x && p.y === state.y);
  if (eaten !== -1) {
    state.pellets.splice(eaten, 1);
    state.score += 1;
    placePellets(state);
  }

  state.movesLeft -= 1;
  if (state.movesLeft <= 0) {
    state.movesLeft = 0;
    state.screen = "gameover";
  }
}

function blobName(state) {
  return state.nameInput.trim() || DEFAULT_NAME;
}

// Returns true when the keypress changed the name, so the caller knows to redraw.
function typeName(state, str, key = {}) {
  if (key.name === "backspace" || key.name === "delete") {
    if (!state.nameInput) return false;
    state.nameInput = [...state.nameInput].slice(0, -1).join("");
    return true;
  }

  if (key.ctrl || key.meta) return false;
  if (!str || [...str].length !== 1 || str < " " || str > "~") return false;
  // No leading spaces, so the name never renders as an empty-looking field.
  if (str === " " && !state.nameInput) return false;
  if ([...state.nameInput].length >= MAX_NAME) return false;

  state.nameInput += str;
  return true;
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
    ? ["enter play", "esc quit"]
    : ["enter  start playing", "esc    quit"];
  // Keep the field inside the frame on narrow terminals, showing the tail of
  // a long name so the cursor stays visible while typing.
  const fieldWidth = Math.max(4, Math.min(MAX_NAME + 1, width - 4));
  const typed = state.nameInput + "_";
  const field = [...typed].slice(-fieldWidth).join("").padEnd(fieldWidth);
  const body = [
    ...art.map((line) => center(line, width)),
    "",
    center(narrow ? "eat the " + PELLET : "collect the " + PELLET + " pellets", width),
    center(
      narrow
        ? `${OBSTACLE} blocks ${BOULDER} shoves`
        : `${OBSTACLE} walls block you, ${BOULDER} boulders shove`,
      width
    ),
    "",
    center(narrow ? "name:" : "name your blob:", width),
    center("[" + field + "]", width),
    "",
    ...hints.map((line) => center(line, width)),
  ];

  const blank = Math.max(0, Math.floor((height - body.length) / 2));
  const lines = [...Array(blank).fill(""), ...body];
  while (lines.length < height) lines.push("");

  return frame(lines.slice(0, height), width).join("\n") +
    "\n" + center(`type a name, then ENTER to play as ${blobName(state)}`, width + 2);
}

function renderGame(state) {
  const lines = [];
  for (let y = 0; y < state.height; y++) {
    let row = "";
    for (let x = 0; x < state.width; x++) {
      if (x === state.x && y === state.y) row += BLOB;
      else if (isPellet(state, x, y)) row += PELLET;
      else if (isObstacle(state, x, y)) row += OBSTACLE;
      else if (isBoulder(state, x, y)) row += BOULDER;
      else row += " ";
    }
    lines.push(row);
  }
  return frame(lines, state.width).join("\n") +
    `\n${state.name}  Score: ${state.score}   Moves: ${state.movesLeft}   ` +
    `Pellets: ${state.pellets.length}   ` +
    `${OBSTACLE} blocks, ${BOULDER} shoves`;
}

function renderGameOver(state) {
  const { width, height } = state;
  const narrow = width < 24;
  const pellets = state.score === 1 ? "pellet" : "pellets";
  const body = [
    center("GAME OVER", width),
    "",
    center(
      narrow
        ? `${state.score} ${PELLET}`
        : `${state.name} collected ${state.score} ${pellets}`,
      width
    ),
    "",
    ...(narrow
      ? [center("r again", width), center("n rename", width), center("q quit", width)]
      : [
          center("r  play again", width),
          center("n  change name", width),
          center("q  quit", width),
        ]),
  ];

  const blank = Math.max(0, Math.floor((height - body.length) / 2));
  const lines = [...Array(blank).fill(""), ...body];
  while (lines.length < height) lines.push("");

  return frame(lines.slice(0, height), width).join("\n") +
    "\n" + center(`final score: ${state.score}`, width + 2);
}

function render(state) {
  if (state.screen === "title") return renderTitle(state);
  if (state.screen === "gameover") return renderGameOver(state);
  return renderGame(state);
}

function startGame(state) {
  state.screen = "playing";
  state.name = blobName(state);
  state.score = 0;
  state.movesLeft = MOVES_PER_GAME;
  state.x = Math.floor(state.width / 2);
  state.y = Math.floor(state.height / 2);
  state.pellets = [];
  placeObstacles(state);
  placeBoulders(state);
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
    const tail = state.screen === "title" ? "\n" : `\nFinal score: ${state.score}\n`;
    process.stdout.write(tail);
    process.exit(0);
  };

  process.stdin.on("keypress", (str, key) => {
    if (key.ctrl && key.name === "c") return quit();

    if (state.screen === "title") {
      // Every printable key is name input here, so escape stands in for q.
      if (key.name === "escape") return quit();
      if (key.name === "return") {
        startGame(state);
        draw(state);
        return;
      }
      if (typeName(state, str, key)) draw(state);
      return;
    }

    if (key.name === "q") return quit();

    if (state.screen === "gameover") {
      if (key.name === "r") {
        startGame(state);
        draw(state);
      } else if (key.name === "n") {
        state.screen = "title";
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
  renderGameOver,
  startGame,
  typeName,
  blobName,
  placeObstacles,
  placeBoulders,
  isBoulder,
  placePellets,
  isPellet,
  isObstacle,
  reachableSquares,
  MOVES_PER_GAME,
};
