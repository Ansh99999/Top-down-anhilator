const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const SpatialGrid = require('./spatial-grid');

app.use(express.static(path.join(__dirname, 'public')));

// --- CONSTANTS ---
const MAP_SIZES = { 0: 2000, 1: 2500, 2: 1500, 3: 2200, 4: 1800 }; // Added maps 3 & 4
const MAX_OBS_R = 100;

const VEHICLE_DEFS = {
  0: { // Dune Buggy
    name: 'Dune Buggy',
    physics: { accel: 0.8, maxSpd: 11, turnSpd: 0.1, drift: 0.96, mass: 1 },
    durability: { type: 'SHIELD', max: 50, regen: 10, delay: 3000 },
    resistance: { KINETIC: 1.0, EXPLOSIVE: 1.5, ENERGY: 0.8, HEAT: 1.0 },
    stress: { max: 100, decay: 2, overloadDuration: 3000 },
    passives: ['SPEED_DAMAGE'],
    ability: { name: 'Nitro', type: 'boost', cooldown: 5000 }
  },
  1: { // Ranger Jeep
    name: 'Ranger Jeep',
    physics: { accel: 0.5, maxSpd: 9, turnSpd: 0.08, drift: 0.90, mass: 1.2 },
    durability: { type: 'ARMOR', max: 60, mitigation: 0.2 },
    resistance: { KINETIC: 0.8, EXPLOSIVE: 1.0, ENERGY: 1.2, HEAT: 1.0 },
    stress: { max: 100, decay: 3, overloadDuration: 2000 },
    passives: ['SQUAD_LINK'],
    ability: { name: 'Field Med', type: 'heal', cooldown: 10000 }
  },
  2: { // Armored Truck
    name: 'Armored Truck',
    physics: { accel: 0.3, maxSpd: 7, turnSpd: 0.05, drift: 0.85, mass: 2.0 },
    durability: { type: 'HEAT_SINK', max: 100, overheatThreshold: 80 },
    resistance: { KINETIC: 0.5, EXPLOSIVE: 0.8, ENERGY: 1.5, HEAT: 2.0 },
    stress: { max: 100, decay: 1, overloadDuration: 5000 },
    passives: ['HEAVY_IMPACT'],
    ability: { name: 'Dmg Up', type: 'buff', cooldown: 15000 }
  },
  3: { // Battle Tank
    name: 'Battle Tank',
    physics: { accel: 0.2, maxSpd: 5, turnSpd: 0.03, drift: 0.80, mass: 3.0 },
    durability: { type: 'REACTIVE', max: 3, recharge: 10000 },
    resistance: { KINETIC: 0.4, EXPLOSIVE: 0.6, ENERGY: 1.2, HEAT: 1.2 },
    stress: { max: 150, decay: 1, overloadDuration: 4000 },
    passives: ['SIEGE_MODE'],
    ability: { name: 'Repair', type: 'repair', cooldown: 20000 }
  },
  4: { // Rocket Truck
    name: 'Rocket Truck',
    physics: { accel: 0.4, maxSpd: 6, turnSpd: 0.04, drift: 0.85, mass: 1.8 },
    durability: { type: 'NONE', max: 0 },
    resistance: { KINETIC: 1.2, EXPLOSIVE: 1.2, ENERGY: 1.0, HEAT: 0.5 },
    stress: { max: 80, decay: 1, overloadDuration: 6000 },
    passives: ['BOMBARDMENT'],
    ability: { name: 'Barrage', type: 'barrage', cooldown: 10000 }
  },
  5: { // Iron Fortress
    name: 'Iron Fortress',
    physics: { accel: 0.1, maxSpd: 4, turnSpd: 0.02, drift: 0.70, mass: 5.0 },
    durability: { type: 'ARMOR', max: 250, mitigation: 0.4 },
    resistance: { KINETIC: 0.3, EXPLOSIVE: 0.5, ENERGY: 1.0, HEAT: 1.0 },
    stress: { max: 200, decay: 5, overloadDuration: 10000 },
    passives: ['AURA_DEFENSE'],
    ability: { name: 'Mega Repair', type: 'fortress', cooldown: 30000 }
  },
  6: { // Attack Chopper
    name: 'Attack Chopper',
    physics: { accel: 0.9, maxSpd: 13, turnSpd: 0.15, drift: 0.98, mass: 0.5 },
    durability: { type: 'SHIELD', max: 40, regen: 15, delay: 2000 },
    resistance: { KINETIC: 1.5, EXPLOSIVE: 2.0, ENERGY: 0.8, HEAT: 0.8 },
    stress: { max: 80, decay: 4, overloadDuration: 2000 },
    passives: ['STRAFE_RUN'],
    ability: { name: 'Afterburner', type: 'speed', cooldown: 8000 }
  },
  7: { // Combat Engi
    name: 'Combat Engi',
    physics: { accel: 0.6, maxSpd: 8, turnSpd: 0.09, drift: 0.90, mass: 1.0 },
    durability: { type: 'NONE', max: 0 },
    resistance: { KINETIC: 1.0, EXPLOSIVE: 1.0, ENERGY: 1.0, HEAT: 1.0 },
    stress: { max: 100, decay: 2, overloadDuration: 3000 },
    passives: ['SCAVENGER'],
    ability: { name: 'Sentry', type: 'turret', cooldown: 20000 }
  }
};

const EVENTS = [
  { name: 'FRENZY', duration: 15000, desc: 'Enemies move faster!' },
  { name: 'POWER SURGE', duration: 10000, desc: 'Players deal double damage!' },
  { name: 'DARKNESS', duration: 20000, desc: 'Visibility reduced!' },
  { name: 'AMMO SURPLUS', duration: 15000, desc: 'Infinite stress/ammo!' }
];

// --- GAME INSTANCE CLASS ---
class GameInstance {
  constructor(roomId, hostId, config) {
    this.roomId = roomId;
    this.hostId = hostId;
    this.players = {};
    this.bullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.items = [];
    this.structures = [];
    this.destructibles = [];
    this.config = config || { mapId: 0 };
    this.mapId = this.config.mapId;
    this.mapRadius = MAP_SIZES[this.mapId] || 2000;

    this.obstacleGrid = new SpatialGrid(6000, 6000, 200);

    this.wave = 1;
    this.threat = 0;
    this.waveState = { total: 15, spawned: 0, active: true };
    this.lastEnemySpawn = 0;
    this.lastItemSpawn = 0;
    this.adapt = { speed: 0, stat: 0, kills: 0 };

    this.weather = 'CLEAR';
    this.weatherTimer = 0;

    this.activeEvent = null;
    this.started = false;

    this.generateObstacles(this.mapId);
  }

  generateObstacles(mapId) {
    this.obstacles = [];
    this.destructibles = [];
    this.obstacleGrid.clear();
    let r = this.mapRadius;

    // Map specific generation logic
    let obsCount = 100;
    let desCount = 20;

    if (mapId === 0) obsCount = 150; // Jungle
    if (mapId === 1) obsCount = 50;  // River
    if (mapId === 2) obsCount = 80;  // Mountain (Rocky)
    if (mapId === 3) obsCount = 20;  // Arena (Open)
    if (mapId === 4) obsCount = 200; // Maze (Dense)

    for (let i = 0; i < obsCount; i++) {
      let dist = 300 + Math.random() * (r - 300);
      let ang = Math.random() * Math.PI * 2;
      let obs = {
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        r: 30 + Math.random() * 50
      };
      // Map 4: Maze-like linear structures (simulated with lines of circles)
      if(mapId === 4 && i % 10 === 0) {
         for(let j=1; j<5; j++) {
            this.obstacles.push({x: obs.x + j*40, y: obs.y, r: 30});
            this.obstacleGrid.insert({x: obs.x + j*40, y: obs.y, r: 30});
         }
      }
      this.obstacles.push(obs);
      this.obstacleGrid.insert(obs);
    }

    for (let i = 0; i < desCount; i++) {
      let dist = 200 + Math.random() * (r - 200);
      let ang = Math.random() * Math.PI * 2;
      this.destructibles.push({
        id: Math.random(), x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
        r: 25, hp: 100, maxHp: 100
      });
    }
  }

  addPlayer(socket, data) {
    let stats = data.stats;
    let def = VEHICLE_DEFS[data.type] || VEHICLE_DEFS[0];
    let fireRate = 10;
    if (data.type === 0) fireRate = 5;
    if (data.type === 3 || data.type === 5) fireRate = 20;
    if (data.type === 6) fireRate = 8;

    this.players[socket.id] = {
      id: socket.id,
      x: 0, y: 0, angle: 0, turretAngle: 0,
      type: data.type,
      hp: stats.hp, maxHp: stats.hp,
      speed: stats.speed, damage: stats.damage,
      score: 0, buffs: { speed: 1, damage: 1 },
      isBot: false,
      isShooting: false, fireCooldown: 0, fireRate: fireRate,
      lastAbility: 0, abilityCd: def.ability.cooldown,

      vx: 0, vy: 0,
      stress: 0, maxStress: def.stress.max, overload: false,
      shield: (def.durability.type === 'SHIELD' ? def.durability.max : 0),
      maxShield: (def.durability.type === 'SHIELD' ? def.durability.max : 0),
      lastHit: 0,
      armor: (def.durability.type === 'ARMOR' ? def.durability.max : 0),
      maxArmor: (def.durability.type === 'ARMOR' ? def.durability.max : 0),
      reactive: (def.durability.type === 'REACTIVE' ? def.durability.max : 0),
      dashCooldown: 0 // New dash mechanic
    };

    // Allies
    for(let i=0;i<data.allyCount;i++){
        let allyId=`bot_${socket.id}_${i}`;
        let rType=Math.floor(Math.random()*5);
        this.players[allyId]={
            id:allyId,owner:socket.id,x:Math.random()*100-50,y:Math.random()*100-50,
            angle:0,turretAngle:0,type:rType,hp:100,maxHp:100,speed:4,damage:15,
            score:0,buffs:{speed:1,damage:1},isBot:true,
            isShooting:false,fireCooldown:0,fireRate:15,
            lastAbility:0,abilityCd:10000,state:'follow',targetId:null,
            vx:0, vy:0, stress:0, shield:0, armor:0
        };
    }
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    // Remove allies
    for (let id in this.players) {
      if (this.players[id].isBot && this.players[id].owner === socketId) {
        delete this.players[id];
      }
    }
    // If host leaves, reassign or close? For now, we keep running until empty.
  }

  checkCollision(x, y, r) {
    let searchR = MAX_OBS_R + r;
    let candidates = this.obstacleGrid.query(x - searchR, y - searchR, searchR * 2, searchR * 2);
    for (let o of candidates) {
      let dx = x - o.x; let dy = y - o.y;
      let distSq = dx * dx + dy * dy;
      let minDist = o.r + r;
      if (distSq < minDist * minDist) return o;
    }
    for (let d of this.destructibles) {
      let dx = x - d.x; let dy = y - d.y;
      let distSq = dx * dx + dy * dy;
      let minDist = d.r + r;
      if (distSq < minDist * minDist) return d;
    }
    return null;
  }

  resolveCollision(p, radius) {
    let mapR = this.mapRadius;
    let dist = Math.sqrt(p.x * p.x + p.y * p.y);
    if (dist > mapR - radius) {
      let ang = Math.atan2(p.y, p.x);
      p.x = Math.cos(ang) * (mapR - radius);
      p.y = Math.sin(ang) * (mapR - radius);
    }
    let searchR = MAX_OBS_R + radius;
    let candidates = this.obstacleGrid.query(p.x - searchR, p.y - searchR, searchR * 2, searchR * 2);

    // Helper to push out
    const pushOut = (o) => {
        let dx = p.x - o.x; let dy = p.y - o.y;
        let distSq = dx * dx + dy * dy;
        let minDist = o.r + radius;
        if (distSq < minDist * minDist) {
          let d = Math.sqrt(distSq);
          if (d === 0) { dx = 1; dy = 0; d = 1; }
          let push = minDist - d;
          p.x += dx / d * push;
          p.y += dy / d * push;
        }
    };

    candidates.forEach(pushOut);
    this.destructibles.forEach(pushOut);
  }

  useAbility(p) {
    let def = VEHICLE_DEFS[p.type] || VEHICLE_DEFS[0];
    if (p.overload || Date.now() - p.lastAbility < p.abilityCd) return;

    p.lastAbility = Date.now();
    p.stress = Math.min(p.stress + 20, p.maxStress);
    if (p.stress >= p.maxStress) {
      p.overload = true;
      io.to(this.roomId).emit('notification', `SYSTEM OVERLOAD: ${p.id.substring(0,4)}`);
      setTimeout(() => { p.overload = false; p.stress = 0; }, 3000);
    }

    // Ability Logic
    if (p.type === 0) { p.vx += Math.cos(p.angle) * 20; p.vy += Math.sin(p.angle) * 20; } // Nitro
    if (p.type === 1) { p.hp = Math.min(p.hp + 40, p.maxHp); io.to(this.roomId).emit('effect', {type: 'HEAL', x: p.x, y: p.y}); } // Heal
    if (p.type === 2) { p.buffs.damage = 2.5; setTimeout(() => p.buffs.damage = 1, 4000); }
    if (p.type === 3) { p.hp = Math.min(p.hp + 60, p.maxHp * 1.5); }
    if (p.type === 4) {
        for (let i = 0; i < 12; i++) {
            let a = Math.PI * 2 / 12 * i;
            this.bullets.push({ id: Math.random(), owner: p.id, x: p.x, y: p.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, damage: p.damage * 2, life: 50 });
        }
    }
    if (p.type === 5) { p.hp = Math.min(p.hp + 150, p.maxHp); this.threat += 10; }
    if (p.type === 6) { p.speed = 18; setTimeout(() => p.speed = 8, 2500); }
    if (p.type === 7) { this.structures.push({ id: Math.random(), x: p.x, y: p.y, hp: 150, owner: p.id, life: 1000 }); }
  }

  update() {
    // 1. Event & Weather
    this.updateWeather();
    this.checkEvents();

    // 2. Players
    for (let id in this.players) {
      let p = this.players[id];
      let def = VEHICLE_DEFS[p.type] || VEHICLE_DEFS[0];

      this.resolveCollision(p, 25);

      // Stress Decay
      if (!p.overload && p.stress > 0 && !p.isShooting) p.stress = Math.max(0, p.stress - 0.2);
      // Shield Regen
      if (def.durability.type === 'SHIELD') {
        if (Date.now() - p.lastHit > def.durability.delay && p.shield < p.maxShield) {
          p.shield = Math.min(p.shield + 0.5, p.maxShield);
        }
      }

      // Dash Cooldown
      if(p.dashCooldown > 0) p.dashCooldown--;

      // Shooting
      if (p.isShooting && !p.overload) {
        p.stress = Math.min(p.stress + 0.5, p.maxStress);
        if (p.stress >= p.maxStress) {
          p.overload = true;
          p.isShooting = false;
          io.to(p.id).emit('notification', 'OVERLOAD! COOLING DOWN...');
          setTimeout(() => { p.overload = false; p.stress = 0; }, 2000);
        }
      }

      if (p.fireCooldown > 0) p.fireCooldown--;
      if (p.isShooting && p.fireCooldown <= 0 && !p.overload) {
        let dmg = p.damage * p.buffs.damage;
        if (this.activeEvent && this.activeEvent.name === 'POWER SURGE') dmg *= 2;

        // Passives
        if (def.passives.includes('SPEED_DAMAGE')) {
            let spd = Math.sqrt((p.vx || 0) ** 2 + (p.vy || 0) ** 2);
            dmg += spd * 1.5;
        }
        if (def.passives.includes('SIEGE_MODE')) {
             let spd = Math.sqrt((p.vx || 0) ** 2 + (p.vy || 0) ** 2);
             if (spd < 0.5) dmg *= 1.3;
        }

        // Recoil
        // Apply negative velocity based on angle
        if(!p.isBot) {
            let rx = Math.cos(p.turretAngle) * 0.5; // Recoil force
            let ry = Math.sin(p.turretAngle) * 0.5;
            // Since we trust client pos mostly, we can only suggest velocity changes or rely on client to handle recoil physics.
            // But we can update vx/vy here which is sent back to client for interpolation
            p.vx -= rx; p.vy -= ry;
        }

        this.bullets.push({
            id: Math.random(), owner: p.id, x: p.x, y: p.y,
            vx: Math.cos(p.turretAngle) * 20, vy: Math.sin(p.turretAngle) * 20,
            damage: dmg, life: 100, type: 'KINETIC'
        });
        p.fireCooldown = p.fireRate;
      }

      // Bot Logic
      if(p.isBot) this.updateBot(p);
    }

    // 3. Structures
    this.updateStructures();

    // 4. Bullets
    this.updateBullets();

    // 5. Enemies
    this.updateEnemies();

    // 6. Spawning
    this.spawnLogic();

    // 7. Emit Update
    io.to(this.roomId).emit('update', {
        players: this.players,
        bullets: this.bullets,
        enemies: this.enemies,
        items: this.items,
        structures: this.structures,
        destructibles: this.destructibles,
        wave: this.wave,
        threat: this.threat,
        weather: this.weather
    });
  }

  updateWeather(){
      this.weatherTimer++;
      if(this.weather === 'CLEAR' && this.weatherTimer > 3000 && Math.random() < 0.001){
        this.weather = 'MONSOON';
        this.weatherTimer = 0;
        io.to(this.roomId).emit('notification', 'MONSOON APPROACHING!');
      } else if(this.weather === 'MONSOON' && this.weatherTimer > 1500 && Math.random() < 0.002){
        this.weather = 'CLEAR';
        this.weatherTimer = 0;
        io.to(this.roomId).emit('notification', 'THE STORM HAS PASSED.');
      }
  }

  checkEvents(){
      if(this.activeEvent){
        if(Date.now() > this.activeEvent.endTime){
          this.activeEvent = null;
          io.to(this.roomId).emit('eventEnd');
        }
      } else if(Math.random() < 0.0005 && Object.keys(this.players).length > 0){
        let ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        this.activeEvent = { ...ev, endTime: Date.now() + ev.duration };
        io.to(this.roomId).emit('eventStart', this.activeEvent);
      }
  }

  updateBot(bot){
      let owner=this.players[bot.owner];
      if(!owner){ delete this.players[bot.id]; return; }

      let target=null; let minDSq=Infinity;
      this.enemies.forEach(e=>{
          let dx = e.x - bot.x;
          let dy = e.y - bot.y;
          let dSq = dx*dx + dy*dy;
          if(dSq<minDSq){minDSq=dSq; target=e;}
      });

      if(target && minDSq < 360000){ // 600^2
        let ang=Math.atan2(target.y-bot.y, target.x-bot.x);
        bot.turretAngle=ang; bot.isShooting=true;
        if(minDSq > 90000){ // 300^2
            bot.x+=Math.cos(ang)*bot.speed; bot.y+=Math.sin(ang)*bot.speed;
        } else {
            bot.x+=Math.cos(ang+Math.PI/2)*bot.speed; bot.y+=Math.sin(ang+Math.PI/2)*bot.speed;
        }
      } else {
        bot.isShooting=false;
        let dx = owner.x - bot.x;
        let dy = owner.y - bot.y;
        if((dx*dx + dy*dy) > 22500){ // 150^2
            let ang=Math.atan2(dy, dx);
            bot.x+=Math.cos(ang)*bot.speed; bot.y+=Math.sin(ang)*bot.speed;
            bot.angle=ang;
        }
      }
  }

  updateStructures(){
      this.structures.forEach((s, idx) => {
          s.life--;
          if (s.life % 30 === 0) {
            let target = null, minDSq = 360000; // 600^2
            this.enemies.forEach(e => {
                let dx = e.x - s.x;
                let dy = e.y - s.y;
                let dSq = dx*dx + dy*dy;
                if (dSq < minDSq) { minDSq = dSq; target = e; }
            });
            if (target) {
                let a = Math.atan2(target.y - s.y, target.x - s.x);
                this.bullets.push({ id: Math.random(), owner: s.owner, x: s.x, y: s.y, vx: Math.cos(a) * 15, vy: Math.sin(a) * 15, damage: 10, life: 60 });
            }
          }
      });
      this.structures = this.structures.filter(s => s.life > 0 && s.hp > 0);
  }

  updateBullets(){
      this.bullets.forEach(b => {
          b.x += b.vx; b.y += b.vy; b.life--;
          let hitObj = this.checkCollision(b.x, b.y, 5);
          if (hitObj) {
            b.life = 0;
            if (hitObj.hp !== undefined) {
              hitObj.hp -= b.damage;
            }
          }
      });
      this.bullets = this.bullets.filter(b => b.life > 0);

      // Destructibles logic
      for (let i = this.destructibles.length - 1; i >= 0; i--) {
        if (this.destructibles[i].hp <= 0) {
          let d = this.destructibles[i];
          io.to(this.roomId).emit('explosion', { x: d.x, y: d.y });
          // Area Dmg
              for (let id in this.players) {
                  let p = this.players[id];
                  if ((p.x - d.x)**2 + (p.y - d.y)**2 < 10000) p.hp -= 30;
              }
              this.enemies.forEach(e => {
                  if ((e.x - d.x)**2 + (e.y - d.y)**2 < 10000) e.hp -= 50;
              });
          this.destructibles.splice(i, 1);
        }
      }
  }

  updateEnemies(){
      // AI Logic
      this.enemies.forEach(e => {
        // Find Target
        let target = null; let minDSq = Infinity;
        for (let id in this.players) {
          let p = this.players[id];
          let dx = p.x - e.x;
          let dy = p.y - e.y;
          let dSq = dx*dx + dy*dy;
          if (p.type === 5) dSq /= 4; // Tank draws aggro (d/2)^2
          if (dSq < minDSq) { minDSq = dSq; target = p; }
        }

        e.stateTimer--;
        if (e.stateTimer <= 0) {
          if (minDSq < 40000 && e.type === 1) e.state = 'flee'; // 200^2
          else if (minDSq < 160000 && e.type === 1) e.state = 'strafe'; // 400^2
          else if (minDSq < 1000000) e.state = 'chase'; // 1000^2
          else e.state = 'wander';

          if(e.type === 8) e.state = 'chase'; // SUICIDER ALWAYS CHASES
          if(e.type === 9) e.state = (Math.random() > 0.5) ? 'chase' : 'strafe'; // SWARMER MIX

          e.stateTimer = 20 + Math.random() * 40;
        }

        let dx = 0, dy = 0;
        let spd = e.speed;
        if (this.activeEvent && this.activeEvent.name === 'FRENZY') spd *= 1.5;

        if (target && minDSq < 2250000) { // 1500^2
          let tx = target.x - e.x; let ty = target.y - e.y;
          let ang = Math.atan2(ty, tx);
          if (e.state === 'chase') {
            dx = Math.cos(ang) * spd; dy = Math.sin(ang) * spd;
            if (e.type === 0) { dx += Math.cos(Date.now() / 200) * 2; dy += Math.sin(Date.now() / 200) * 2; }
          } else if (e.state === 'strafe') {
            dx = Math.cos(ang + Math.PI / 2) * spd; dy = Math.sin(ang + Math.PI / 2) * spd;
            if (Math.random() < 0.05 && minDSq < 250000) // 500^2
                this.bullets.push({ id: Math.random(), owner: 'enemy', x: e.x, y: e.y, vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10, damage: 5 + this.wave, life: 100 });
          } else if (e.state === 'flee') {
            dx = -Math.cos(ang) * spd; dy = -Math.sin(ang) * spd;
          }
        } else {
           dx = Math.cos(e.id) * 1; dy = Math.sin(e.id) * 1;
        }
        e.x += dx; e.y += dy;
        this.resolveCollision(e, 15);
      });

      // Player collision/Bullet collision logic
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        let b = this.bullets[i];
        if (b.owner === 'enemy') {
            for (let id in this.players) {
                let p = this.players[id];
                if ((b.x - p.x)**2 + (b.y - p.y)**2 < 400) { // 20^2
                    let dmg = b.damage;
                    let def = VEHICLE_DEFS[p.type] || VEHICLE_DEFS[0];
                    let type = b.type || 'KINETIC';
                    let res = def.resistance[type] || 1.0;
                    dmg /= res;
                    p.lastHit = Date.now();
                    if(p.reactive > 0){ p.reactive--; dmg = 0; }
                    else if(p.shield > 0){
                        if(p.shield >= dmg){ p.shield -= dmg; dmg = 0; }
                        else { dmg -= p.shield; p.shield = 0; }
                    } else if(p.armor > 0){
                        let mit = def.durability.mitigation || 0;
                        dmg *= (1 - mit);
                        p.armor = Math.max(0, p.armor - dmg * 0.5);
                    }
                    p.hp -= dmg;
                    this.bullets.splice(i, 1);
                    if (p.hp <= 0) {
                        if (p.isBot) { delete this.players[id]; }
                        else {
                            io.to(id).emit('gameOver', p.score);
                            delete this.players[id];
                            for (let pid in this.players) { if (this.players[pid].owner === id) delete this.players[pid]; }
                        }
                    }
                    break;
                }
            }
        } else {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let e = this.enemies[j];
                let hitR = e.radius || 32;
                if ((b.x - e.x)**2 + (b.y - e.y)**2 < hitR * hitR) {
                    let reduction = e.modifiers.includes('ARMORED') ? 0.5 : 1;
                    e.hp -= b.damage * reduction;
                    this.bullets.splice(i, 1);
                    if (e.hp <= 0) {
                        this.enemies.splice(j, 1);
                        if (e.modifiers.includes('EXPLOSIVE')) {
                            io.to(this.roomId).emit('explosion', { x: e.x, y: e.y });
                            for (let id in this.players) {
                                let p = this.players[id];
                                if ((p.x - e.x)**2 + (p.y - e.y)**2 < 22500) p.hp -= 40; // 150^2
                            }
                        }
                        let shooter = this.players[b.owner];
                        if (shooter) { shooter.score += 10 + (e.isElite ? 20 : 0); this.threat += 2; }

                        // Wave check
                        if (this.waveState.spawned >= this.waveState.total && this.enemies.length === 0) {
                            this.wave++;
                            this.waveState.total = 15 + this.wave * 5;
                            this.waveState.spawned = 0;
                            io.to(this.roomId).emit('wave', this.wave);
                        }
                    }
                    break;
                }
            }
        }
      }

      // Check collision with players for suicide/melee dmg
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        let e = this.enemies[j];
        for(let id in this.players){
            let p = this.players[id];
            let distSq = (p.x - e.x)**2 + (p.y - e.y)**2;
            let combinedR = e.radius + 20;
            if(distSq < combinedR * combinedR){
                p.hp -= 1;
                if(e.type === 8) { // Suicider Explode on Contact
                    e.hp = 0;
                    this.enemies.splice(j, 1);
                    io.to(this.roomId).emit('explosion', { x: e.x, y: e.y });
                    for (let pid in this.players) {
                        let pp = this.players[pid];
                        if ((pp.x - e.x)**2 + (pp.y - e.y)**2 < 22500) pp.hp -= 40; // 150^2
                    }
                    break;
                }
            }
        }
      }
  }

  spawnLogic(){
      let spawnDelay = Math.max(500, 2000 - this.wave * 100);
      if (Date.now() - this.lastEnemySpawn > spawnDelay && this.waveState.spawned < this.waveState.total) {
        if (this.wave % 5 === 0 && this.waveState.spawned === 0) {
            // BOSS
            let ang = Math.random() * Math.PI * 2;
            let dist = this.mapRadius - 50;
            this.enemies.push({
                id: Math.random(), x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
                type: 10, hp: 5000 + this.wave * 500, maxHp: 5000 + this.wave * 500,
                speed: 3, state: 'chase', stateTimer: 0, targetId: null, modifiers: ['ARMORED'], radius: 60
            });
            io.to(this.roomId).emit('notification', 'WARNING: JUNGLE BEHEMOTH!');
            this.waveState.total = 1; this.waveState.spawned = 1;
            this.lastEnemySpawn = Date.now();
        } else {
            // NORMAL
            let r = Math.random();
            let type = 0;
            if (this.adapt.speed > 6 || this.threat > 50 || this.wave > 3) type = 1;
            if (this.threat > 80 || this.wave > 5) type = 3;
            // NEW ENEMIES
            if(this.wave > 4 && Math.random() < 0.2) type = 8; // Suicider
            if(this.wave > 6 && Math.random() < 0.2) type = 9; // Swarmer

            let ang = Math.random() * Math.PI * 2;
            let dist = this.mapRadius - 50;
            let enemy = {
                id: Math.random(), x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
                type: type,
                hp: 30 + this.wave * 5,
                maxHp: 30 + this.wave * 5,
                speed: type === 0 ? 5 : type === 1 ? 3 : type === 3 ? 1.5 : 4,
                state: 'chase', stateTimer: 0, targetId: null, modifiers: [], radius: 25
            };
            if(type===8) { enemy.hp = 10; enemy.speed = 9; enemy.modifiers=['EXPLOSIVE']; } // Suicider
            if(type===9) { enemy.hp = 15; enemy.speed = 10; enemy.radius=15; } // Swarmer

            if (this.wave > 2 && Math.random() < (0.1 + this.wave * 0.05)) {
                let mods = ['FAST', 'ARMORED', 'EXPLOSIVE'];
                let mod = mods[Math.floor(Math.random() * mods.length)];
                enemy.modifiers.push(mod);
                enemy.isElite = true;
                if (mod === 'FAST') enemy.speed *= 1.5;
                if (mod === 'ARMORED') { enemy.hp *= 2; enemy.maxHp *= 2; }
            }
            this.enemies.push(enemy);
            this.waveState.spawned++;
            this.lastEnemySpawn = Date.now();
        }
      }
      if (Date.now() - this.lastItemSpawn > 10000 && this.items.length < 10) {
        let ang = Math.random() * Math.PI * 2; let d = Math.random() * this.mapRadius;
        this.items.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d, type: Math.floor(Math.random() * 3) });
        this.lastItemSpawn = Date.now();
      }
  }
}

// --- GLOBAL STATE & LOBBY SYSTEM ---
const games = {}; // roomId -> GameInstance

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Default lobby joining? For now, we wait for specific events.

  socket.on('createGame', (data) => {
      let roomId = Math.random().toString(36).substring(7).toUpperCase();
      games[roomId] = new GameInstance(roomId, socket.id, { mapId: parseInt(data.mapId) });
      socket.emit('gameCreated', { roomId });
  });

  socket.on('joinGame', (data) => {
      // data: { roomId (opt), type, stats, allyCount }
      let roomId = data.roomId;

      // Auto-create if not specified or doesn't exist (for quick play)
      if (!roomId || !games[roomId]) {
          // Find first available or create
          let available = Object.keys(games).find(id => Object.keys(games[id].players).length < 4); // Max 4
          if(available) roomId = available;
          else {
              roomId = Math.random().toString(36).substring(7).toUpperCase();
              games[roomId] = new GameInstance(roomId, socket.id, { mapId: data.mapId !== undefined ? parseInt(data.mapId) : 0 });
          }
      }

      // ⚡ Bolt: Store roomId on socket for O(1) access
      socket.data.roomId = roomId;

      let game = games[roomId];
      socket.join(roomId);
      game.addPlayer(socket, { ...data, stats: VEHICLE_DEFS[data.type].stats || {hp:100,damage:10,speed:5} }); // Sanitize stats usage

      socket.emit('init', {
          id: socket.id,
          roomId: roomId,
          players: game.players,
          obstacles: game.obstacles,
          destructibles: game.destructibles,
          mapRadius: game.mapRadius,
          wave: game.wave,
          items: game.items,
          structures: game.structures,
          vehicleDefs: VEHICLE_DEFS
      });
      io.to(roomId).emit('updatePlayers', game.players);
  });

  socket.on('move', (data) => {
      // ⚡ Bolt: O(1) Room Lookup
      const roomId = socket.data.roomId;
      if (roomId && games[roomId] && games[roomId].players[socket.id]) {
          let p = games[roomId].players[socket.id];
          p.x = data.x; p.y = data.y; p.angle = data.angle;
          if(data.vx !== undefined){ p.vx = data.vx; p.vy = data.vy; }
      }
  });

  socket.on('shootInput', (data) => {
    const roomId = socket.data.roomId;
    if (roomId && games[roomId] && games[roomId].players[socket.id]) {
        games[roomId].players[socket.id].turretAngle = data.angle;
        games[roomId].players[socket.id].isShooting = data.active;
    }
  });

  socket.on('ability', () => {
      const roomId = socket.data.roomId;
      if (roomId && games[roomId] && games[roomId].players[socket.id]) {
          games[roomId].useAbility(games[roomId].players[socket.id]);
      }
  });

  socket.on('dash', () => { // NEW DASH
    const roomId = socket.data.roomId;
    if (roomId && games[roomId] && games[roomId].players[socket.id]) {
        let p = games[roomId].players[socket.id];
        if(p.dashCooldown <= 0 && p.stress < p.maxStress - 20){
            p.stress += 15;
            p.dashCooldown = 60; // 2 seconds
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for(let rid in games){
        if(games[rid].players[socket.id]){
            games[rid].removePlayer(socket.id);
            io.to(rid).emit('updatePlayers', games[rid].players);
            if(Object.keys(games[rid].players).length === 0){
                delete games[rid]; // Cleanup empty room
            }
        }
    }
  });
});

// Main Server Loop
setInterval(() => {
    for (let roomId in games) {
        games[roomId].update();
    }
}, 33); // 30 TPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
