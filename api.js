// api.js - FAKE backend so the page works without a server.
// Later: replace the inside of each function with a fetch() to the real server.
// Every function must keep returning a Promise with the same shape.

var START_MONEY = 2000;

// "places" (all countries and their airports) comes from airports.js

var db = { player: null, round: null, wins: 0, total: 0, history: [] };

function ok(data) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(JSON.parse(JSON.stringify(data))); }, 200);
  });
}
function fail(message) {
  return new Promise(function (resolve, reject) { reject({ error: message }); });
}

function findAirport(ident) {
  for (var country in places) {
    for (var i = 0; i < places[country].length; i++) {
      if (places[country][i].ident === ident) {
        return { ident: ident, name: places[country][i].name, lat: places[country][i].lat, lon: places[country][i].lon, country: country };
      }
    }
  }
}

function distanceKm(a, b) {
  var rad = Math.PI / 180;
  var dLat = (b.lat - a.lat) * rad;
  var dLon = (b.lon - a.lon) * rad;
  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function newPlayer(name) {
  var home = findAirport('EFHK');
  return { username: name, money: START_MONEY, points: 0, airport: 'EFHK', country: 'Finland', lat: home.lat, lon: home.lon };
}

var api = {
  login: function (name, pass) {
    if (!name || !pass) return fail('Enter your username and password.');
    db.player = newPlayer(name);
    return ok(db.player);
  },

  register: function (name, pass) {
    if (name.length < 3) return fail('Username needs at least 3 characters.');
    if (pass.length < 4) return fail('Password needs at least 4 characters.');
    db.player = newPlayer(name);
    return ok(db.player);
  },

  logout: function () { db.player = null; return ok({ ok: true }); },

  countries: function () { return ok(Object.keys(places)); },

  airports: function (country) { return ok(places[country]); },

  startRound: function () {
    var names = Object.keys(places).filter(function (c) { return c !== db.player.country; });
    var target = names[Math.floor(Math.random() * names.length)];
    db.round = { target: target, stops: 1 + db.wins, done: 0, startMoney: db.player.money };
    return ok(db.round);
  },

  quote: function (ident) {
    var km = distanceKm(findAirport(db.player.airport), findAirport(ident));
    return ok({ km: Math.round(km), price: Math.round(km * 0.10 * 100) / 100 });
  },

  fly: function (ident) {
    var from = findAirport(db.player.airport);
    var to = findAirport(ident);
    var km = distanceKm(from, to);
    var price = Math.round(km * 0.10 * 100) / 100;
    var r = db.round;

    if (price > db.player.money) {
      return ok({ failed: true, gameOver: true, finalScore: db.total, player: db.player });
    }
    db.player.money = Math.round((db.player.money - price) * 100) / 100;
    db.player.airport = ident;
    db.player.country = to.country;
    db.player.lat = to.lat;
    db.player.lon = to.lon;
    r.done++;

    var reached = r.done > r.stops;
    var score = 0;
    if (reached) {
      score = 100 + 5 * r.stops + Math.floor(db.player.money / 100);
      db.player.points += score;
      db.total += score;
      db.wins++;
      db.history.unshift({ target: r.target, stops: r.stops, score: score });
      db.round = null;
    }
    var gameOver = !reached && db.player.money < 50;
    return ok({ from: from, to: to, km: Math.round(km), price: price, player: db.player,
                done: r.done, reached: reached, score: score, gameOver: gameOver, finalScore: db.total });
  },

  reset: function () {
    db.player = newPlayer(db.player.username);
    db.round = null;
    db.wins = 0;
    db.total = 0;
    db.history.unshift({ target: 'RESET' });
    return ok(db.player);
  },

  scores: function () {
    var list = [
      { username: 'Inocent', points: 240 },
      { username: 'Jounas', points: 180 },
      { username: 'Akil', points: 150 },
      { username: db.player.username, points: db.player.points }
    ];
    list.sort(function (a, b) { return b.points - a.points; });
    return ok({ top: list.slice(0, 5), last: db.history.slice(0, 5) });
  }
};
