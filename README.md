# Flight Adventure: frontend

This folder has the website for our Flight Game, made with HTML, CSS and JavaScript.

## Run it
Open `index.html` in the browser (in PyCharm: right-click the file, Open in Browser).
You need an internet connection for the map.

## Pages
- Home page: Play, How it works, Help? and a demo flight
- Game page: full-screen map, stats panel, airports to click, top menu (Scores, Start over, Exit game)

## Files
- `index.html`: page structure
- `style.css`: colors and layout
- `app.js`: buttons, pop-ups, map and game screen
- `api.js`: the only file that gets data (fake for now)
- `airports.js`: test airports for the fake data, to be deleted later
- `API.md`: the endpoints the backend must provide and their JSON

## Status
Everything works with fake data. It is not connected to Python yet.

## Next steps
- Backend: build the endpoints in `API.md`
- Frontend: replace the functions in `api.js` with `fetch()` calls, then delete `airports.js`
- Check the page with the W3C validator, Lighthouse and WAVE

## Notes
- Python's `geodesic()` decides the ticket price (the fake data uses a simpler formula).
- The contact form only shows a thank-you message, it sends nothing yet.
- The leaderboard shows the top 5 players by points.

## Testing
Write here what you tested, for example: opened in Chrome, registered, played a round, checked the demo flight and the phone layout.
