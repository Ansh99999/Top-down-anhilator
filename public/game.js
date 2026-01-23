const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');

// --- UI MANAGERS ---
const ui = {
  screens: {
    home: document.getElementById('home-screen'),
    lobby: document.getElementById('lobby-screen'),
    garage: document.getElementById('garage-screen'),
    game: document.getElementById('game-ui'),
    gameOver: document.getElementById('game-over-screen')
  },
  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.add('hidden'));
    this.screens[name].style.display = 'flex'; // Reset display logic
    this.screens[name].classList.remove('hidden');
    if(name === 'game') this.screens[name].style.display = 'block';
  },
  showHome() { this.showScreen('home'); },
  showLobby(isHost) {
    this.showScreen('lobby');
    document.getElementById('lobby-title').innerText = isHost ? "MISSION BRIEFING (HOST)" : "JOINING SQUAD";
    document.getElementById('lobby-action-btn').innerText = isHost ? "DEPLOY" : "JOIN";
    document.getElementById('join-code-area').style.display = isHost ? 'none' : 'block';

    // Reset state
    game.isHost = isHost;
    game.roomId = null;
    document.getElementById('lobby-info').style.display = 'none';
  },
  showGarage() {
    this.showScreen('garage');
    renderGarage();
  },
  updateLobby(roomId, players) {
    document.getElementById('lobby-info').style.display = 'block';
    document.getElementById('display-room-code').innerText = roomId;
    const list = document.getElementById('lobby-players-list');
    list.innerHTML = '';
    Object.values(players).forEach(p => {
        let div = document.createElement('div');
        div.className = 'lobby-player-row' + (p.id === socket.id ? ' me' : '');
        div.innerHTML = `<span>${p.id.substring(0,4)}</span><span>${game.vehicles[p.type].name}</span>`;
        list.appendChild(div);
    });
  }
};
window.ui = ui;

// --- GAME STATE ---
const game = {
  vehicles: [
    {name:'Dune Buggy',stats:{hp:80,damage:10,speed:5},desc:'Fast Scout',color:'#f39c12'},
    {name:'Ranger Jeep',stats:{hp:100,damage:15,speed:4},desc:'Standard Issue',color:'#27ae60'},
    {name:'Armored Truck',stats:{hp:120,damage:20,speed:3},desc:'Heavy Transport',color:'#7f8c8d'},
    {name:'Battle Tank',stats:{hp:150,damage:25,speed:2},desc:'Main Battle Tank',color:'#2c3e50'},
    {name:'Rocket Truck',stats:{hp:90,damage:40,speed:3},desc:'Artillery',color:'#8e44ad'},
    {name:'Iron Fortress',stats:{hp:300,damage:20,speed:1.5},desc:'Mobile Base',color:'#34495e'},
    {name:'Attack Chopper',stats:{hp:90,damage:12,speed:8},desc:'Air Support',color:'#16a085'},
    {name:'Combat Engi',stats:{hp:110,damage:10,speed:3},desc:'Builder',color:'#d35400'}
  ],
  selectedVehicle: 0,
  isHost: false,
  roomId: null,
  startRequest() {
    let allyCount = parseInt(document.getElementById('ally-count').value);
    let mapId = parseInt(document.getElementById('map-select').value);

    if (this.isHost) {
        socket.emit('createGame', { mapId });
        // We wait for gameCreated event to join our own game
        this.pendingJoin = { type: this.selectedVehicle, allyCount, mapId };
    } else {
        let code = document.getElementById('room-code-input').value.toUpperCase();
        socket.emit('joinGame', { roomId: code, type: this.selectedVehicle, allyCount, mapId }); // allyCount ignored for joiners usually
    }
  }
};
window.game = game;

// Garage Render
function renderGarage() {
    const grid = document.getElementById('garage-grid');
    const focusedIndex = Array.from(grid.children).indexOf(document.activeElement);

    grid.innerHTML = '';
    game.vehicles.forEach((v, i) => {
        let el = document.createElement('div');
        el.className = 'vehicle-card' + (i === game.selectedVehicle ? ' selected' : '');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-pressed', i === game.selectedVehicle ? 'true' : 'false');
        el.setAttribute('aria-label', `${v.name}. ${v.desc}. Speed ${v.stats.speed}, Health ${v.stats.hp}.`);
        el.innerHTML = `
            <h3>${v.name}</h3>
            <p>${v.desc}</p>
            <div class="stat-bar"><div class="stat-fill" style="width:${v.stats.hp/2}%"></div></div>
            <div class="stat-bar"><div class="stat-fill" style="width:${v.stats.damage*2}%"></div></div>
            <div class="stat-bar"><div class="stat-fill" style="width:${v.stats.speed*10}%"></div></div>
        `;
        el.tabIndex = 0;
        const select = () => {
            game.selectedVehicle = i;
            renderGarage();
        };
        el.onclick = select;
        el.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select();
            }
        };
        grid.appendChild(el);
        if (i === focusedIndex) {
            // Restore focus after re-render to maintain keyboard navigation flow
            requestAnimationFrame(() => el.focus());
        }
    });
}

// --- ASSET LOADER ---
const assets = {};
function loadAssets() {
  const list = [
    { key: 'DuneBuggy', src: 'assets/DuneBuggy.png' }
  ];
  list.forEach(item => {
    const img = new Image();
    img.src = item.src;
    img.onload = () => { assets[item.key] = img; };
  });
}
loadAssets();

// --- RESIZE ---
let width, height;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// --- INPUT HANDLING ---
let joystick = { active: false, id: null, cx: 0, cy: 0, angle: 0 };
let shootJoy = { active: false, id: null, cx: 0, cy: 0, angle: 0 };

// Bindings
const joyEl = document.getElementById('joystick-move');
const knobEl = document.getElementById('knob-move');
const shootEl = document.getElementById('joystick-shoot');
const shootKnob = document.getElementById('knob-shoot');
const dashBtn = document.getElementById('dash-btn');
const abilityBtn = document.getElementById('ability-btn');

function handleTouch(e, obj, knob, isShoot) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    let t = e.changedTouches[i];
    if (!obj.active && e.type === 'touchstart') {
      obj.active = true;
      obj.id = t.identifier;
      let r = e.target.getBoundingClientRect();
      obj.cx = r.left + r.width / 2;
      obj.cy = r.top + r.height / 2;
      updateJoy(t, obj, knob, isShoot);
    } else if (obj.active && t.identifier === obj.id) {
      if (e.type === 'touchmove') updateJoy(t, obj, knob, isShoot);
      if (e.type === 'touchend' || e.type === 'touchcancel') {
        obj.active = false;
        obj.id = null;
        knob.style.transform = `translate(-50%,-50%)`;
        if (isShoot) socket.emit('shootInput', { active: false, angle: obj.angle });
      }
    }
  }
}

function updateJoy(t, obj, knob, isShoot) {
  let dx = t.clientX - obj.cx;
  let dy = t.clientY - obj.cy;
  let dist = Math.hypot(dx, dy);
  let maxR = 40;
  let angle = Math.atan2(dy, dx);
  obj.angle = angle;
  if (dist > maxR) {
    dx = Math.cos(angle) * maxR;
    dy = Math.sin(angle) * maxR;
  }
  knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  if (isShoot) socket.emit('shootInput', { active: true, angle: obj.angle });
}

['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(evt => {
  joyEl.addEventListener(evt, e => handleTouch(e, joystick, knobEl, false));
  shootEl.addEventListener(evt, e => handleTouch(e, shootJoy, shootKnob, true));
});

// Ability & Dash
dashBtn.addEventListener('touchstart', e => { e.preventDefault(); socket.emit('dash'); });
dashBtn.addEventListener('click', e => socket.emit('dash')); // Desktop fallback

abilityBtn.addEventListener('touchstart', e => { e.preventDefault(); socket.emit('ability'); });
abilityBtn.addEventListener('click', e => socket.emit('ability'));

// Keyboard
let keys = {};
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.code === 'Space') socket.emit('dash'); // Space is now Dash
    if (e.code === 'ShiftLeft') socket.emit('ability');
});
document.addEventListener('keyup', e => {
    keys[e.key] = false;
});
// Mouse Shoot
document.addEventListener('mousedown', e => {
    if(ui.screens.game.style.display !== 'none'){
        let dx = e.clientX - width/2; // Center based aiming
        let dy = e.clientY - height/2;
        let ang = Math.atan2(dy,dx);
        socket.emit('shootInput', { active: true, angle: ang });
    }
});
document.addEventListener('mouseup', () => {
    socket.emit('shootInput', { active: false, angle: 0 });
});

// --- CLIENT GAME LOGIC ---
let myId = null;
let players = {};
let bullets = [];
let enemies = [];
let obstacles = [];
let items = [];
let structures = [];
let destructibles = [];
let mapRadius = 2000;
let VEHICLE_DEFS = {};

let camX = 0, camY = 0;
let vx = 0, vy = 0;
let physicsAngle = 0;

// Socket Events
socket.on('gameCreated', data => {
    game.roomId = data.roomId;
    if(game.pendingJoin) {
        socket.emit('joinGame', { roomId: game.roomId, ...game.pendingJoin });
        game.pendingJoin = null;
    }
});

socket.on('init', data => {
    myId = data.id;
    game.roomId = data.roomId;
    players = data.players;
    obstacles = data.obstacles;
    destructibles = data.destructibles;
    mapRadius = data.mapRadius;
    items = data.items;
    structures = data.structures;
    VEHICLE_DEFS = data.vehicleDefs;

    initMapCanvas();
    ui.showScreen('game');

    // Reset Physics
    vx=0; vy=0; physicsAngle=0;
    requestAnimationFrame(draw);
});

socket.on('updatePlayers', p => {
    players = p;
    if (ui.screens.lobby.style.display !== 'none') {
        ui.updateLobby(game.roomId, players);
    }
});

socket.on('update', data => {
    players = data.players;
    bullets = data.bullets;
    enemies = data.enemies;
    items = data.items;
    structures = data.structures;
    destructibles = data.destructibles;

    document.getElementById('wave-val').innerText = data.wave;
    document.getElementById('threat-bar').style.width = Math.min(100, data.threat) + '%';

    // HUD Updates
    if (players[myId]) {
        let me = players[myId];
        document.getElementById('hp-bar').style.width = (me.hp / me.maxHp * 100) + '%';
        document.getElementById('shield-bar').style.width = (me.shield / me.maxShield * 100) + '%';
        document.getElementById('stress-bar').style.width = (me.stress / me.maxStress * 100) + '%';
        document.getElementById('score-val').innerText = me.score;

        let cd = me.abilityCd || 10000;
        let ready = Date.now() - (me.lastAbility || 0) >= cd;
        abilityBtn.classList.toggle('cooldown', !ready);
    }

    // Weather
    if (data.weather === 'MONSOON') {
        canvas.style.filter = 'brightness(0.6) contrast(1.2)';
    } else {
        canvas.style.filter = 'none';
    }
    window.currentWeather = data.weather;
});

socket.on('notification', msg => {
    let el = document.createElement('div');
    el.className = 'notification';
    el.innerText = msg;
    document.getElementById('notification-area').appendChild(el);
    setTimeout(() => el.remove(), 3000);
});

socket.on('gameOver', score => {
    ui.showScreen('game-over-screen');
    document.getElementById('final-score').innerText = 'SCORE: ' + score;
});

// --- RENDERER ---
let mapCanvas = document.createElement('canvas');
let mapCtx = mapCanvas.getContext('2d');

function initMapCanvas() {
    let s = mapRadius * 2 + 200;
    mapCanvas.width = s;
    mapCanvas.height = s;
    mapCtx.translate(s / 2, s / 2);

    // Base Ground
    mapCtx.fillStyle = '#2ecc71';
    mapCtx.beginPath();
    mapCtx.arc(0, 0, mapRadius, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = '#145a32';
    mapCtx.lineWidth = 20;
    mapCtx.stroke();

    // Details
    for (let i = 0; i < 300; i++) {
        mapCtx.fillStyle = Math.random() > 0.5 ? '#27ae60' : '#229954';
        let r = Math.random() * mapRadius;
        let a = Math.random() * Math.PI * 2;
        let sz = 50 + Math.random() * 150;
        mapCtx.beginPath();
        mapCtx.ellipse(Math.cos(a) * r, Math.sin(a) * r, sz, sz * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
        mapCtx.fill();
    }
}

function draw() {
    // 1. Clear
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, width, height);

    if (!myId || !players[myId]) return; // Stop if dead/not spawned
    let me = players[myId];

    // 2. Camera
    let shake = 0; // Implement shake later if needed
    camX = me.x - width / 2;
    camY = me.y - height / 2;

    ctx.save();
    ctx.translate(-camX, -camY);

    // 3. Terrain
    ctx.drawImage(mapCanvas, -mapRadius - 100, -mapRadius - 100);

    // Weather Effects (Rain)
    if (window.currentWeather === 'MONSOON') {
      ctx.save();
      ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let time = Date.now();
      for(let i=0; i<100; i++){
         // Simple rain simulation around camera
         let rx = camX + (Math.sin(i * 1321 + time*0.001) * width);
         let ry = camY + ((time * 2 + i * 3232) % height);
         ctx.moveTo(rx, ry);
         ctx.lineTo(rx - 5, ry + 15);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Objects
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;

    obstacles.forEach(o => {
        ctx.fillStyle = '#1e8449';
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#115e30'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(o.x - o.r / 3, o.y - o.r / 3, o.r / 2, 0, Math.PI * 2); ctx.fill();
    });

    destructibles.forEach(d => {
        ctx.fillStyle = '#d35400';
        ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
        ctx.strokeStyle = '#a04000'; ctx.lineWidth = 3; ctx.strokeRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
        if (d.hp < d.maxHp / 2) {
            ctx.beginPath(); ctx.moveTo(d.x - 10, d.y - 10); ctx.lineTo(d.x + 5, d.y + 5); ctx.stroke();
        }
    });

    items.forEach(i => {
        ctx.fillStyle = i.type === 0 ? '#e74c3c' : i.type === 1 ? '#3498db' : '#f1c40f';
        ctx.beginPath(); ctx.arc(i.x, i.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });

    structures.forEach(s => {
        ctx.fillStyle = '#d35400'; ctx.fillRect(s.x - 15, s.y - 15, 30, 30); ctx.strokeRect(s.x - 15, s.y - 15, 30, 30);
    });

    bullets.forEach(b => {
        ctx.fillStyle = b.owner === 'enemy' ? '#c0392b' : '#f1c40f';
        if (b.damage > 30) ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        if (b.owner === 'enemy') ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        else ctx.ellipse(b.x, b.y, 8, 4, Math.atan2(b.vy, b.vx), 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.shadowBlur = 0;

    // 5. Entities
    enemies.forEach(e => {
        ctx.save(); ctx.translate(e.x, e.y);
        drawEnemy(ctx, e, Math.atan2(me.y - e.y, me.x - e.x));
        ctx.restore();
    });

    for (let id in players) {
        let p = players[id];
        ctx.save(); ctx.translate(p.x, p.y);
        drawVehicle(ctx, id === myId ? '#3498db' : p.isBot ? '#2ecc71' : game.vehicles[p.type].color, p.angle, p.turretAngle, p.type, p);

        // Nametag
        ctx.restore();
        ctx.fillStyle='#fff';
        ctx.font='10px Arial';
        ctx.textAlign='center';
        ctx.fillText(p.id.substring(0,4), p.x, p.y - 50);

        // Bars
        ctx.fillStyle = '#c0392b'; ctx.fillRect(p.x - 20, p.y - 45, 40, 4);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(p.x - 20, p.y - 45, 40 * (p.hp / p.maxHp), 4);
        if (p.shield > 0) {
            ctx.fillStyle = '#3498db'; ctx.fillRect(p.x - 20, p.y - 50, 40 * (p.shield / p.maxShield), 3);
        }
    }

    ctx.restore();

    // 6. Minimap
    drawMinimap(me);

    // 7. Physics Loop
    updatePhysics(me);

    requestAnimationFrame(draw);
}

function drawVehicle(ctx, color, angle, turretAngle, type, p) {
    ctx.save(); ctx.rotate(angle);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-18, -16, 36, 32, 6); ctx.fill(); ctx.stroke();

    // Tracks
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.rect(-24, -20, 6, 40); ctx.fill();
    ctx.beginPath(); ctx.rect(18, -20, 6, 40); ctx.fill();

    // Shield
    if(p.shield > 0) {
        ctx.strokeStyle = '#3498db';
        ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2); ctx.stroke();
    }

    ctx.restore();

    // Turret
    ctx.save(); ctx.rotate(turretAngle);
    ctx.fillStyle = '#444'; ctx.beginPath(); ctx.rect(0, -4, 32, 8); ctx.fill(); ctx.stroke(); // Barrel
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
}

function drawEnemy(ctx, e, angle) {
    ctx.rotate(angle); ctx.lineWidth = 2; ctx.strokeStyle = '#000';

    // New Types
    if(e.type === 8){ // SUICIDER
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill(); ctx.stroke();
        // Blinking light
        if(Date.now()%200 < 100) { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); }
        return;
    }
    if(e.type === 9){ // SWARMER
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-10,8); ctx.lineTo(-10,-8); ctx.fill(); ctx.stroke();
        return;
    }

    // Existing logic...
    let type = e.type;
    if (type === 10) { // BOSS
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(20, -20, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 20, 10, 0, Math.PI * 2); ctx.fill();
    } else if (type === 0) { // Rusher
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10); ctx.fill(); ctx.stroke();
    } else if (type === 1) { // Shooter
        ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.rect(5, -5, 15, 10); ctx.fill();
    } else if (type === 3) { // Tank
        ctx.fillStyle = '#555'; ctx.beginPath(); ctx.rect(-20, -20, 40, 40); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    } else { // Ambusher
        ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.fill(); ctx.stroke();
    }

    if (e.modifiers && e.modifiers.length > 0) {
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4; ctx.stroke();
    }
}

function drawMinimap(me) {
    miniCtx.clearRect(0, 0, 140, 140);

    let s = 140 / (mapRadius * 2.2);
    miniCtx.save();
    miniCtx.translate(70, 70);

    // Allies
    miniCtx.fillStyle = '#3498db';
    for(let id in players) {
        let p = players[id];
        miniCtx.fillRect(p.x * s, p.y * s, 4, 4);
    }

    // Enemies (Red)
    miniCtx.fillStyle = '#e74c3c';
    enemies.forEach(e => miniCtx.fillRect(e.x * s, e.y * s, 3, 3));

    // Me
    miniCtx.fillStyle = '#fff';
    miniCtx.beginPath(); miniCtx.arc(me.x * s, me.y * s, 3, 0, Math.PI*2); miniCtx.fill();

    miniCtx.restore();
}

function updatePhysics(me) {
    let inputAngle = null;
    if (joystick.active) { inputAngle = joystick.angle; }
    else {
        let dx = 0, dy = 0;
        if (keys['ArrowUp'] || keys['w']) dy = -1;
        if (keys['ArrowDown'] || keys['s']) dy = 1;
        if (keys['ArrowLeft'] || keys['a']) dx = -1;
        if (keys['ArrowRight'] || keys['d']) dx = 1;
        if (dx != 0 || dy != 0) inputAngle = Math.atan2(dy, dx);
    }

    let def = VEHICLE_DEFS[me.type] || { physics: { accel: 0.5, maxSpd: 5, turnSpd: 0.1, drift: 0.9, mass: 1 } };
    let phys = def.physics;

    if (inputAngle !== null) {
        let ax = Math.cos(inputAngle) * phys.accel;
        let ay = Math.sin(inputAngle) * phys.accel;

        let diff = inputAngle - physicsAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        physicsAngle += diff * phys.turnSpd;

        vx += ax; vy += ay;
    }

    // Drift
    let drift = phys.drift;
    if (window.currentWeather === 'MONSOON') drift = Math.min(0.99, drift + 0.05);
    vx *= drift;
    vy *= drift;

    // Server-side recoil/impulse integration?
    // We trust server velocity if it's significant (e.g. from dash or explosion)
    // But we need to blend it. For now, we just rely on client physics + correction.

    let spd = Math.hypot(vx, vy);
    if (spd > phys.maxSpd) {
        vx = (vx / spd) * phys.maxSpd;
        vy = (vy / spd) * phys.maxSpd;
    }

    let nx = me.x + vx;
    let ny = me.y + vy;

    // Collision
    let hit = false;
    if (Math.hypot(nx, ny) > mapRadius - 25) hit = true;
    for (let o of obstacles) { if (Math.hypot(nx - o.x, ny - o.y) < o.r + 25) hit = true; }
    // Destructibles collision
    for (let d of destructibles) { if (Math.hypot(nx - d.x, ny - d.y) < d.r + 25) hit = true; }

    if (hit) {
        vx *= -0.5; vy *= -0.5;
        nx = me.x + vx; ny = me.y + vy;
    }

    // Send
    socket.emit('move', { x: nx, y: ny, angle: physicsAngle, vx, vy });
}
