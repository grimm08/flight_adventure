// app.js - what the page does. Data comes only from api.js.

const map = L.map('map', { minZoom: 3 }).setView([35, 10], 3);   // country names show from zoom 3
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 12
}).addTo(map);
map.zoomControl.setPosition('topright');
map.scrollWheelZoom.disable();   // so the page can still scroll

const trail = L.layerGroup().addTo(map);     // plane and lines
const markers = L.layerGroup().addTo(map);   // airports to click

let player = null;      // null = not signed in
let round = null;
let demoRunning = false;
let lastScore = 0;      // points won in the last finished round

function el(id) {
  return document.getElementById(id);
}

/* ---------- show home or game ---------- */

function showHome() {
  el('home').classList.remove('hidden');
  el('game').classList.add('hidden');
  el('homeBtn').classList.add('hidden');
  demoRunning = false;
}

function showGame() {
  el('home').classList.add('hidden');
  el('game').classList.remove('hidden');
  el('homeBtn').classList.remove('hidden');
  map.invalidateSize();   // the map was hidden, so tell it to fit again
}

/* ---------- pop-up ---------- */

function showModal(html) {
  el('modal').innerHTML = html;
  el('overlay').classList.remove('hidden');
}

function closeModal() {
  el('overlay').classList.add('hidden');
}

function message(title, text) {
  showModal(`<h2>${title}</h2><p>${text}</p><button id="ok">OK</button>`);
  el('ok').addEventListener('click', closeModal);
}

/* ---------- sign in and register ---------- */

function showLogin(mode) {
  let title = 'Sign in';
  let buttonText = 'Sign in';
  let otherText = 'Create account';
  if (mode === 'register') {
    title = 'Register';
    buttonText = 'Create account';
    otherText = 'I have an account';
  }

  showModal(`
    <h2>${title}</h2>
    <form id="loginForm">
      <label for="user">Username</label>
      <input id="user">
      <label for="pass">Password</label>
      <input id="pass" type="password">
      <p class="error" id="err"></p>
      <button type="submit">${buttonText}</button>
      <button type="button" class="secondary" id="other">${otherText}</button>
      <button type="button" class="secondary" id="cancel">Cancel</button>
    </form>`);

  el('cancel').addEventListener('click', closeModal);
  el('other').addEventListener('click', function () {
    showLogin(mode === 'register' ? 'login' : 'register');
  });

  el('loginForm').addEventListener('submit', async function (evt) {
    evt.preventDefault();
    const name = el('user').value.trim();
    const pass = el('pass').value;
    try {
      if (mode === 'register') {
        player = await api.register(name, pass);
      } else {
        player = await api.login(name, pass);
      }
      closeModal();
      startGame();
    } catch (error) {
      el('err').innerText = error.error;
    }
  });
}

/* ---------- how it works and help ---------- */

function showHow() {
  showModal(`
    <h2>How it works</h2>
    <p>Reach a random target country without running out of money.</p>
    <ol>
      <li>Sign in or register. You start in Helsinki with 2000 EUR.</li>
      <li>Press Start round. You get a random target country.</li>
      <li>Choose a country, click an airport on the map and buy the ticket.</li>
    </ol>
    <h2>Rules</h2>
    <ul>
      <li>A ticket costs 0.10 EUR per kilometre.</li>
      <li>Stops per round = 1 + rounds won.</li>
      <li>Reaching the target gives 100 points, plus 5 per stop and 1 per 100 EUR left.</li>
      <li>If you cannot afford a flight, the game is over.</li>
    </ul>
    <button id="ok">Close</button>`);
  el('ok').addEventListener('click', closeModal);
}

function showHelp() {
  showModal(`
    <h2>Help?</h2>
    <p>Send us a message.</p>
    <form id="helpForm">
      <label for="hName">Name</label>
      <input id="hName" required>
      <label for="hEmail">Email</label>
      <input id="hEmail" type="email" required>
      <label for="hMsg">Message</label>
      <textarea id="hMsg" rows="4" required></textarea>
      <button type="submit">Send</button>
      <button type="button" class="secondary" id="cancel">Cancel</button>
    </form>`);

  el('cancel').addEventListener('click', closeModal);
  el('helpForm').addEventListener('submit', function (evt) {
    evt.preventDefault();
    // there is no server for this yet, so we only show a thank-you message
    message('Thank you', 'Thanks, your message has been sent.');
  });
}

/* ---------- top menu (only when signed in) ---------- */

function renderMenu() {
  el('menu').innerHTML = '';
  if (player) {
    addMenuButton('Scores', showScores);
    addMenuButton('Start over', askReset);
    addMenuButton('Exit game', exitGame);
    el('playBtn').innerText = 'Continue playing';
    el('demoBtn').classList.add('hidden');
  } else {
    el('playBtn').innerText = 'Play';
    el('demoBtn').classList.remove('hidden');
  }
}

function addMenuButton(text, action) {
  const button = document.createElement('button');
  button.innerText = text;
  button.addEventListener('click', action);
  el('menu').appendChild(button);
}

/* ---------- game screen ---------- */

function updateHud() {
  let target = '-';
  let stopsLeft = '-';
  let roundNumber = '-';
  if (round) {
    target = round.target;
    stopsLeft = round.stops - round.done;
    roundNumber = round.stops;   // round 1 has 1 stop, round 2 has 2 stops...
  }
  let html = `
    <p>Player: <b>${player.username}</b></p>
    <p>Money: <b>${player.money.toFixed(2)} EUR</b></p>
    <p>Round: <b>${roundNumber}</b></p>
    <p>Points: <b>${player.points}</b></p>
    <p>Last round score: <b>+${lastScore}</b></p>
    <p>Location: <b>${player.country} (${player.airport})</b></p>
    <p>Target: <b>${target}</b></p>
    <p>Stops left: <b>${stopsLeft}</b></p>`;
  if (!round) {
    html += '<button id="startRound">Start round</button>';
  }
  el('hud').innerHTML = html;
  if (!round) {
    el('startRound').addEventListener('click', playRound);
  }
}

function showHere() {
  trail.clearLayers();
  markers.clearLayers();
  L.circleMarker([player.lat, player.lon], { radius: 8, color: '#1d3a8a' }).addTo(trail);
  map.setView([player.lat, player.lon], 3);
}

function startGame() {
  demoRunning = false;
  round = null;
  lastScore = 0;
  renderMenu();
  showGame();
  el('guestBox').classList.add('hidden');
  el('hud').classList.remove('hidden');
  updateHud();
  showHere();
}

async function exitGame() {
  await api.logout();
  player = null;
  round = null;
  lastScore = 0;
  trail.clearLayers();
  markers.clearLayers();
  map.setView([35, 10], 3);
  el('hud').classList.add('hidden');
  el('stopPanel').classList.add('hidden');
  renderMenu();
  showHome();
}

/* ---------- playing a round ---------- */

async function playRound() {
  const r = await api.startRound();
  if (r.gameOver) {
    gameOver(r.finalScore);
    return;
  }
  round = r;
  updateHud();
  showStopPanel();
}

async function showStopPanel() {
  const lastLeg = round.done === round.stops;
  let countries = await api.countries();

  if (lastLeg) {
    countries = [round.target];
  } else {
    // you cannot choose your own country or the target before the last leg
    countries = countries.filter(function (c) {
      return c !== player.country && c !== round.target;
    });
  }

  let options = '';
  for (const c of countries) {
    options += `<option>${c}</option>`;
  }

  let heading = `Stop ${round.done + 1} of ${round.stops}`;
  if (lastLeg) {
    heading = `Final leg: fly to ${round.target}`;
  }

  el('stopPanel').innerHTML = `
    <p><b>${heading}</b></p>
    <label for="country">Country</label>
    <select id="country">${options}</select>
    <button id="showAirports">Show airports</button>`;
  el('stopPanel').classList.remove('hidden');
  el('showAirports').addEventListener('click', function () {
    showAirports(el('country').value);
  });
}

async function showAirports(country) {
  const list = await api.airports(country);
  markers.clearLayers();
  const points = [];
  for (const a of list) {
    const marker = L.circleMarker([a.lat, a.lon], { radius: 8, color: '#c2410c' });
    marker.bindTooltip(`${a.name} (${a.ident})`);
    marker.on('click', function () {
      askTicket(a);
    });
    marker.addTo(markers);
    points.push([a.lat, a.lon]);
  }
  map.fitBounds(points, { maxZoom: 5, padding: [60, 60] });
}

async function askTicket(airport) {
  const q = await api.quote(airport.ident);
  showModal(`
    <h2>Buy ticket?</h2>
    <p>${airport.name} (${airport.ident})<br>
    ${q.km} km, price ${q.price.toFixed(2)} EUR<br>
    You have ${player.money.toFixed(2)} EUR.</p>
    <button id="buy">Buy and fly</button>
    <button class="secondary" id="no">Cancel</button>`);
  el('no').addEventListener('click', closeModal);
  el('buy').addEventListener('click', function () {
    closeModal();
    flyTo(airport.ident);
  });
}

async function flyTo(ident) {
  const res = await api.fly(ident);
  if (res.failed) {
    player = res.player;
    gameOver(res.finalScore);
    return;
  }
  markers.clearLayers();
  el('stopPanel').classList.add('hidden');

  animate([res.from.lat, res.from.lon], [res.to.lat, res.to.lon], function () {
    player = res.player;
    if (res.reached) {
      lastScore = res.score;
      round = null;
      updateHud();
      message('You reached the target!', `Round score: ${res.score} points.`);
    } else if (res.gameOver) {
      gameOver(res.finalScore);
    } else {
      round.done = res.done;
      updateHud();
      showStopPanel();
    }
  });
}

function gameOver(finalScore) {
  round = null;
  updateHud();
  el('stopPanel').classList.add('hidden');
  showModal(`
    <h2>Game over</h2>
    <p>You do not have enough money to travel on.<br>Score of this game: ${finalScore}</p>
    <button id="again">New game</button>`);
  el('again').addEventListener('click', function () {
    closeModal();
    doReset();
  });
}

/* ---------- scores and start over ---------- */

async function showScores() {
  const s = await api.scores();
  let top = '';
  for (const p of s.top) {
    top += `<li>${p.username}: ${p.points} points</li>`;
  }
  let last = '';
  for (const r of s.last) {
    if (r.target === 'RESET') {
      last += '<li>--- new game started ---</li>';
    } else {
      last += `<li>${r.target}: ${r.stops} stop(s), score ${r.score}</li>`;
    }
  }
  if (last === '') {
    last = '<li>No rounds played yet.</li>';
  }
  showModal(`
    <h2>Top 5 players</h2>
    <ol>${top}</ol>
    <h2>Your last rounds</h2>
    <ul>${last}</ul>
    <button id="ok">Close</button>`);
  el('ok').addEventListener('click', closeModal);
}

function askReset() {
  showModal(`
    <h2>Start over?</h2>
    <p>You go back to 2000 EUR and Helsinki. Your points are reset.</p>
    <button id="yes">Start over</button>
    <button class="secondary" id="no">Cancel</button>`);
  el('no').addEventListener('click', closeModal);
  el('yes').addEventListener('click', function () {
    closeModal();
    doReset();
  });
}

async function doReset() {
  player = await api.reset();
  round = null;
  lastScore = 0;
  el('stopPanel').classList.add('hidden');
  updateHud();
  showHere();
}

/* ---------- plane animation and demo flight ---------- */

function animate(from, to, done) {
  L.polyline([from, to], { color: '#c2410c', weight: 2, dashArray: '6' }).addTo(trail);
  const plane = L.circleMarker(from, { radius: 7, color: '#1d3a8a', fillOpacity: 1 }).addTo(trail);
  let step = 0;
  const timer = setInterval(function () {
    step++;
    const lat = from[0] + (to[0] - from[0]) * step / 60;
    const lon = from[1] + (to[1] - from[1]) * step / 60;
    plane.setLatLng([lat, lon]);
    if (step === 60) {
      clearInterval(timer);
      done();
    }
  }, 25);
}

const demoRoute = [[60.317, 24.963], [50.033, 8.571], [35.553, 139.78]];

function startDemo() {
  showGame();
  el('guestBox').classList.remove('hidden');
  map.setView([40, 70], 3);
  trail.clearLayers();
  demoRunning = true;
  runDemo(0);
}

function runDemo(n) {
  if (!demoRunning) return;
  animate(demoRoute[n], demoRoute[n + 1], function () {
    if (!demoRunning) return;
    if (n + 1 < demoRoute.length - 1) {
      setTimeout(function () { runDemo(n + 1); }, 1000);
    } else {
      setTimeout(function () { trail.clearLayers(); runDemo(0); }, 1000);
    }
  });
}

/* ---------- connect the buttons ---------- */

el('playBtn').addEventListener('click', function () {
  if (player) {
    showGame();
  } else {
    showLogin('login');
  }
});
el('howBtn').addEventListener('click', showHow);
el('helpBtn').addEventListener('click', showHelp);
el('demoBtn').addEventListener('click', startDemo);
el('guestPlay').addEventListener('click', function () { showLogin('login'); });
el('homeBtn').addEventListener('click', showHome);
el('logo').addEventListener('click', function (evt) {
  evt.preventDefault();
  showHome();
});

renderMenu();