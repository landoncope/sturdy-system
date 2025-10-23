// Space Invaders (Mini)
// Simple implementation using canvas, object arrays, and intervals.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// HUD
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const restartBtn = document.getElementById('restart');

// Game state
let player;
let bullets = [];
let aliens = [];
let alienStepInterval = null;
let lastTime = 0;
let score = 0;
let lives = 3;
let gameOver = false;
let keys = {};

// Audio
let audioCtx = null;
let sfxGain = null;
let musicGain = null;
let musicInterval = null;
let musicEnabled = true;
let sfxEnabled = true;

function ensureAudio(){
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.18;
    sfxGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.06;
    musicGain.connect(audioCtx.destination);
  } catch (e) {
    console.warn('WebAudio not available', e);
  }
}

function playShoot(){
  if (!sfxEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 780;
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(sfxGain);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  o.start(now);
  o.stop(now + 0.2);
}

function playExplosion(){
  if (!sfxEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  // Noise burst
  const bufferSize = audioCtx.sampleRate * 0.25;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const g = audioCtx.createGain();
  g.gain.value = 0.2;
  noise.connect(g);
  g.connect(sfxGain);
  noise.start();
}

function startMusic(){
  if (!musicEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  stopMusic();
  // Simple chiptune-ish loop using short beeps
  const seq = [440, 0, 440, 0, 523, 0, 660, 0];
  let i = 0;
  musicInterval = setInterval(() => {
    const freq = seq[i % seq.length];
    if (freq > 0) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(musicGain);
      const now = audioCtx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      o.start(now);
      o.stop(now + 0.22);
    }
    i++;
  }, 220);
}

function stopMusic(){
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
}

// Config
const PLAYER_SPEED = 4.5;
const BULLET_SPEED = 6.5;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_H_SPACING = 58;
const ALIEN_V_SPACING = 42;
const ALIEN_START_X = 40;
const ALIEN_START_Y = 40;
let alienDir = 1; // 1 right, -1 left
let alienSpeedX = 12; // pixels per step
let alienStepMs = 600;

function resetGame() {
  player = { x: W/2 - 18, y: H - 48, w: 36, h: 18 };
  bullets = [];
  aliens = [];
  score = 0;
  lives = 3;
  gameOver = false;
  alienDir = 1;
  alienSpeedX = 12;
  alienStepMs = 600;
  spawnAliens();
  updateHUD();
  if (alienStepInterval) clearInterval(alienStepInterval);
  alienStepInterval = setInterval(stepAliens, alienStepMs);
}

function spawnAliens(){
  aliens = [];
  for (let r = 0; r < ALIEN_ROWS; r++){
    for (let c = 0; c < ALIEN_COLS; c++){
      const x = ALIEN_START_X + c * ALIEN_H_SPACING;
      const y = ALIEN_START_Y + r * ALIEN_V_SPACING;
      aliens.push({ x, y, w: 30, h: 20, row: r, col: c, alive: true });
    }
  }
}

function stepAliens(){
  // Move horizontally
  let leftmost = Math.min(...aliens.filter(a=>a.alive).map(a=>a.x));
  let rightmost = Math.max(...aliens.filter(a=>a.alive).map(a=>a.x + a.w));
  const willHitRight = rightmost + alienSpeedX > W - 10;
  const willHitLeft = leftmost - alienSpeedX < 10;

  if (willHitRight && alienDir === 1) {
    // move down and reverse
    aliens.forEach(a => { if (a.alive) a.y += 18; });
    alienDir = -1;
  } else if (willHitLeft && alienDir === -1) {
    aliens.forEach(a => { if (a.alive) a.y += 18; });
    alienDir = 1;
  } else {
    aliens.forEach(a => { if (a.alive) a.x += alienSpeedX * alienDir; });
  }

  // Slightly increase speed as aliens are killed
  const aliveCount = aliens.filter(a=>a.alive).length;
  if (aliveCount > 0) {
    alienStepMs = Math.max(180, 600 - ( (ALIEN_ROWS*ALIEN_COLS - aliveCount) * 6));
    // reset interval with new speed
    clearInterval(alienStepInterval);
    alienStepInterval = setInterval(stepAliens, alienStepMs);
  }

  // Check for game over condition (aliens reached player)
  if (aliens.some(a => a.alive && (a.y + a.h) >= player.y)) {
    endGame(false);
  }
}

function updateHUD(){
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

function fireBullet(){
  if (gameOver) return;
  // cap bullets
  if (bullets.length >= 4) return;
  const bx = player.x + player.w/2 - 2;
  const by = player.y - 8;
  bullets.push({ x: bx, y: by, w: 4, h: 12, vy: -BULLET_SPEED });
  try { playShoot(); } catch(e) { /* ignore audio errors */ }
}

function rectsOverlap(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function update(dt){
  // Player movement
  if (keys['ArrowLeft'] || keys['a']) player.x -= PLAYER_SPEED;
  if (keys['ArrowRight'] || keys['d']) player.x += PLAYER_SPEED;
  player.x = Math.max(8, Math.min(W - player.w - 8, player.x));

  // Update bullets
  for (let i = bullets.length -1; i >=0; i--) {
    const b = bullets[i];
    b.y += b.vy;
    if (b.y + b.h < 0) bullets.splice(i,1);
  }

  // Collisions bullets vs aliens
  for (let i = bullets.length -1; i >=0; i--){
    const b = bullets[i];
    for (let j = 0; j < aliens.length; j++){
      const a = aliens[j];
      if (!a.alive) continue;
      if (rectsOverlap(b, a)){
        // hit
        a.alive = false;
        bullets.splice(i,1);
        score += 10;
        updateHUD();
        // increase speed slightly
        alienSpeedX += 0.2;
        try { playExplosion(); } catch(e) { /* ignore audio errors */ }
        break;
      }
    }
  }

  // If all aliens dead -> win
  if (!aliens.some(a => a.alive)) {
    endGame(true);
  }
}

function endGame(won){
  gameOver = true;
  clearInterval(alienStepInterval);
  if (won) {
    score += 100;
    updateHUD();
    try { playExplosion(); } catch(e) {}
    setTimeout(() => alert('You win! Score: ' + score), 100);
  } else {
    try { playExplosion(); } catch(e) {}
    setTimeout(() => alert('Game over! Score: ' + score), 10);
  }
}

function draw(){
  // clear
  ctx.fillStyle = '#020614';
  ctx.fillRect(0,0,W,H);

  // draw player
  ctx.fillStyle = '#85d7ff';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  // small tip
  ctx.fillStyle = '#c3f1ff';
  ctx.fillRect(player.x + player.w/2 - 2, player.y - 8, 4, 8);

  // draw bullets
  ctx.fillStyle = '#ffd9a6';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  // draw aliens
  aliens.forEach(a => {
    if (!a.alive) return;
    ctx.fillStyle = '#9bd6a6';
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.fillStyle = '#2c6b3b';
    ctx.fillRect(a.x + 4, a.y + a.h - 6, a.w - 8, 4);
  });

  // HUD (score/lives are DOM but show small footer)
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, H/2 - 40, W, 80);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over - Press Restart', W/2, H/2 + 8);
  }
}

function loop(ts){
  const dt = ts - lastTime;
  lastTime = ts;
  if (!gameOver) update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Input
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    fireBullet();
  }
  keys[e.key] = true;
  // Ensure audio context is resumed/created after user gesture
  if ([' ', 'Spacebar', 'Space'].includes(e.key) || e.code === 'Space') {
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    // start background music automatically if enabled
    if (musicEnabled) startMusic();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

restartBtn.addEventListener('click', () => {
  ensureAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  // restart music if enabled
  if (musicEnabled) startMusic();
});

// Music / SFX toggles
const toggleMusicBtn = document.getElementById('toggle-music');
const toggleSfxBtn = document.getElementById('toggle-sfx');
toggleMusicBtn.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  toggleMusicBtn.textContent = `Music: ${musicEnabled ? 'On' : 'Off'}`;
  toggleMusicBtn.classList.toggle('toggled-off', !musicEnabled);
  if (musicEnabled) startMusic(); else stopMusic();
});
toggleSfxBtn.addEventListener('click', () => {
  sfxEnabled = !sfxEnabled;
  toggleSfxBtn.textContent = `SFX: ${sfxEnabled ? 'On' : 'Off'}`;
  toggleSfxBtn.classList.toggle('toggled-off', !sfxEnabled);
});

// Start
resetGame();
// start music by default after a gesture; but try to start softly now if allowed
try { startMusic(); } catch(e) { /* ignore */ }
requestAnimationFrame(loop);
