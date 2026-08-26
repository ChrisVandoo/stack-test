# stack-test
Testing Github Stacks

## Blob game

Move a blob around the screen and collect pellets, working around two kinds of
obstacle. Ten `*` pellets sit on the board at any one time — eat one and
another appears somewhere you can reach.

| Obstacle     | Behaviour                                                      |
| ------------ | -------------------------------------------------------------- |
| `▓` wall     | Solid. Bumping into one leaves you put, and costs no move.      |
| `O` boulder  | Shoves one square if the space behind it is clear, otherwise it acts like a wall. A successful shove costs the same single move as a step. |

Pushing a boulder can seal off part of the field. Any pellet cut off that way
is moved somewhere you can still reach, so a round never strands one.

```
npm start      # or: npm run game
```

Opens on a title screen where you type a name for your blob (up to 12
characters — leave it blank and it's just `Blob`), then press `Enter` to play.
You get 30 moves to collect as many pellets as you can; when they run out, the
game-over screen shows how your blob did and offers a restart.

Controls:

| Screen    | Keys                                                       |
| --------- | ---------------------------------------------------------- |
| Title     | type to name your blob, `Enter` to start, `Esc` to quit     |
| Playing   | arrow keys or WASD to move, `q` to quit                     |
| Game over | `r` to play again, `n` to change the name, `q` to quit      |

## Hello world

```
npm run hello          # Hello, World!
node index.js Chris    # Hello, Chris!
```
