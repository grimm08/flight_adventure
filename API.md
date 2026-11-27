# Flight Game: API contract (front end <-> backend)

Simple rules for everything below:

- Data is sent and received as **JSON**.
- The player is remembered with a **session cookie** after login, so the front end never sends a player id.
- If something goes wrong, answer with status 400 (or 401 if not logged in) and `{ "error": "Readable message" }`. The page shows that text to the player.
- The round (target, stops, stops done, money at start) must be **stored on the server**, because each request is separate.
- Passwords must be **hashed** (for example bcrypt), not saved as plain text.
- Use a new database connection for each request, not one global connection.

The front end's fake version of all of this is `api.js`. It is the best example of the exact shapes.

## Shapes used everywhere

**player**
```json
{ "username": "inocent", "money": 1850.5, "points": 118, "airport": "EFHK",
  "country": "Finland", "lat": 60.3172, "lon": 24.9633 }
```

**airport**
```json
{ "ident": "EDDF", "name": "Frankfurt am Main Airport", "lat": 50.0333, "lon": 8.5706 }
```

## Endpoints

| Method and path | Sends | Returns |
|---|---|---|
| `POST /register` | `{ "username", "password" }` | player (new game: 2000 EUR, EFHK) |
| `POST /login` | `{ "username", "password" }` | player |
| `POST /logout` | nothing | `{ "ok": true }` |
| `GET /countries` | nothing | `["Albania", "Algeria", ...]` sorted by name |
| `GET /airports?country=Germany` | country name | list of airports |
| `POST /round/start` | nothing | round (see below) |
| `GET /quote?ident=EDDF` | airport code | `{ "km": 1507, "price": 150.7 }` |
| `POST /fly` | `{ "ident": "EDDF" }` | fly result (see below) |
| `POST /reset` | nothing | player (back to 2000 EUR, EFHK) |
| `GET /scores` | nothing | scores (see below) |

**Which airports and countries:** use the same rule as the game code. Return large airports of the country, and small airports if it has no large ones. Only countries that have such airports go in `/countries` (214 in the database).

## The three bigger answers

**`POST /round/start`**: picks a random target country (not the current one) and sets the number of stops (1 plus rounds won since the last reset).
```json
{ "target": "Japan", "stops": 2, "done": 0, "startMoney": 1850.5 }
```
If the player cannot afford any flight to the target (the check `play_round()` already does), return this instead:
```json
{ "gameOver": true, "finalScore": 236 }
```

**`POST /fly`**: moves the player, takes the ticket price (km x 0.10 EUR) from their money, and counts the flight. A round has `stops` flights plus one final flight to the target country. The front end shows the "final leg" screen when `done` equals `stops`.
```json
{ "from": { "ident": "EFHK", "name": "...", "lat": 60.3, "lon": 24.9, "country": "Finland" },
  "to":   { "ident": "EDDF", "name": "...", "lat": 50.0, "lon": 8.5,  "country": "Germany" },
  "km": 1507, "price": 150.7,
  "player": { "...": "updated player" },
  "done": 1,
  "reached": false,
  "score": 0,
  "gameOver": false,
  "finalScore": 236 }
```
- `reached` is true after the final flight lands in the target country. Then add the score: `100 + 5 x stops + money_left // 100`, save the round in `scores`, and set `score`.
- If the ticket costs more than the player has, move nobody and return `{ "failed": true, "gameOver": true, "finalScore": 236, "player": { ... } }` (like `OutOfMoney` in the code).
- `gameOver` is true when the player can no longer afford any flight to another country (`game_over()` in the code).
- `finalScore` is the total of the current game (`game_score()` in the code).
- Do **not** reset on game over. The player presses "New game", and the front end then calls `/reset`.

**`GET /scores`**
```json
{ "top":  [ { "username": "Akil", "points": 240 } ],
  "last": [ { "target": "Japan", "stops": 2, "score": 118 },
            { "target": "RESET" } ] }
```
`top` has up to 5 players, `last` the player's last 5 rows. A row with target `RESET` marks the start of a new game.

## Front end side (for reference)

When the real server exists, each function in `api.js` becomes a small `fetch`, for example:
```js
login: function (name, pass) {
  return fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: pass })
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw data;   // data is { error: "..." }
      return data;
    });
  });
}
```
The rest of the page does not change.
