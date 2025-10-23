Space Invaders (Mini)

A tiny browser game (HTML/CSS/JS) — a small implementation of Space Invaders to practice object arrays, shooting mechanics, timing intervals, and simple animations.

Files:
- `index.html` — entry page with a canvas and HUD
- `style.css` — basic styles
- `script.js` — game logic: player movement, bullets, alien grid and stepping, collisions, score/lives

How to run:
1. Open `index.html` in your browser (double-click or use a local server).
2. Controls: Left/Right arrows (or A/D) to move. Space to shoot. Click Restart to reset.

Notes:
- No build required.
- For development, you can run a quick local server from the project root:

```bash
# Python 3
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Enjoy! Feel free to ask for features (alien shooting, shields, sound, levels) and I'll add them.
 
Audio
- This version includes built-in synthesized SFX (shoot and explosion) and a simple background music loop using the Web Audio API. No external files are required.
- Use the HUD buttons to toggle Music and SFX on/off.