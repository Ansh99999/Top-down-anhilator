const express=require('express');const app=express();const http=require('http');const server=http.createServer(app);const {Server}=require("socket.io");const io=new Server(server);const path=require('path');
app.use(express.static(path.join(__dirname,'public')));
let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let structures=[];let destructibles=[];
// Radius based maps
const MAP_SIZES={0:2000,1:2500,2:1500}; // 0:Jungle, 1:River, 2:Mountain
let currentMap=0;
// --- VEHICLE DESIGN UPDATE ---
// 1. Handling, 2. Durability, 3. Stress, 4. Evolution, 5. Passives, 6. Damage Types
const VEHICLE_DEFS = {
  0: { // Dune Buggy
    name: 'Dune Buggy',
    physics: { accel: 0.8, maxSpd: 10, turnSpd: 0.1, drift: 0.96, mass: 1 },
    durability: { type: 'SHIELD', max: 50, regen: 10, delay: 3000 },
    resistance: { KINETIC: 1.0, EXPLOSIVE: 1.5, ENERGY: 0.8, HEAT: 1.0 },
    stress: { max: 100, decay: 2, overloadDuration: 3000 },
    passives: ['SPEED_DAMAGE'],
    ability: { name: 'Nitro', type: 'boost' }
  },
  1: { // Ranger Jeep
    name: 'Ranger Jeep',
    physics: { accel: 0.5, maxSpd: 8, turnSpd: 0.08, drift: 0.90, mass: 1.2 },
    durability: { type: 'ARMOR', max: 50, mitigation: 0.2 }, // Reduces dmg by 20% while armor holds
    resistance: { KINETIC: 0.8, EXPLOSIVE: 1.0, ENERGY: 1.2, HEAT: 1.0 },
    stress: { max: 100, decay: 3, overloadDuration: 2000 },
    passives: ['SQUAD_LINK'], // Buffs nearby allies
    ability: { name: 'Field Med', type: 'heal' }
  },
  2: { // Armored Truck
    name: 'Armored Truck',
    physics: { accel: 0.3, maxSpd: 6, turnSpd: 0.05, drift: 0.85, mass: 2.0 },
    durability: { type: 'HEAT_SINK', max: 100, overheatThreshold: 80 },
    resistance: { KINETIC: 0.5, EXPLOSIVE: 0.8, ENERGY: 1.5, HEAT: 2.0 },
    stress: { max: 100, decay: 1, overloadDuration: 5000 },
    passives: ['HEAVY_IMPACT'], // Ramming dmg
    ability: { name: 'Dmg Up', type: 'buff' }
  },
  3: { // Battle Tank
    name: 'Battle Tank',
    physics: { accel: 0.2, maxSpd: 4, turnSpd: 0.03, drift: 0.80, mass: 3.0 },
    durability: { type: 'REACTIVE', max: 3, recharge: 10000 }, // Blocks 3 hits fully
    resistance: { KINETIC: 0.4, EXPLOSIVE: 0.6, ENERGY: 1.2, HEAT: 1.2 },
    stress: { max: 150, decay: 1, overloadDuration: 4000 },
    passives: ['SIEGE_MODE'], // Stationary buff
    ability: { name: 'Repair', type: 'repair' }
  },
  4: { // Rocket Truck
    name: 'Rocket Truck',
    physics: { accel: 0.4, maxSpd: 5, turnSpd: 0.04, drift: 0.85, mass: 1.8 },
    durability: { type: 'NONE', max: 0 },
    resistance: { KINETIC: 1.2, EXPLOSIVE: 1.2, ENERGY: 1.0, HEAT: 0.5 },
    stress: { max: 80, decay: 1, overloadDuration: 6000 },
    passives: ['BOMBARDMENT'], // Range dmg
    ability: { name: 'Barrage', type: 'barrage' }
  },
  5: { // Iron Fortress
    name: 'Iron Fortress',
    physics: { accel: 0.1, maxSpd: 3, turnSpd: 0.02, drift: 0.70, mass: 5.0 },
    durability: { type: 'ARMOR', max: 200, mitigation: 0.4 },
    resistance: { KINETIC: 0.3, EXPLOSIVE: 0.5, ENERGY: 1.0, HEAT: 1.0 },
    stress: { max: 200, decay: 5, overloadDuration: 10000 },
    passives: ['AURA_DEFENSE'],
    ability: { name: 'Mega Repair', type: 'fortress' }
  },
  6: { // Attack Chopper
    name: 'Attack Chopper',
    physics: { accel: 0.9, maxSpd: 12, turnSpd: 0.15, drift: 0.98, mass: 0.5 },
    durability: { type: 'SHIELD', max: 30, regen: 15, delay: 2000 },
    resistance: { KINETIC: 1.5, EXPLOSIVE: 2.0, ENERGY: 0.8, HEAT: 0.8 },
    stress: { max: 80, decay: 4, overloadDuration: 2000 },
    passives: ['STRAFE_RUN'], // Move sideways faster
    ability: { name: 'Afterburner', type: 'speed' }
  },
  7: { // Combat Engi
    name: 'Combat Engi',
    physics: { accel: 0.6, maxSpd: 7, turnSpd: 0.09, drift: 0.90, mass: 1.0 },
    durability: { type: 'NONE', max: 0 },
    resistance: { KINETIC: 1.0, EXPLOSIVE: 1.0, ENERGY: 1.0, HEAT: 1.0 },
    stress: { max: 100, decay: 2, overloadDuration: 3000 },
    passives: ['SCAVENGER'], // Heals on kill
    ability: { name: 'Sentry', type: 'turret' }
  }
};
// ----------------------------

function generateObstacles(mapId){
obstacles=[];destructibles=[];
let r=MAP_SIZES[mapId];
let count=mapId===0?120:mapId===1?60:40;
for(let i=0;i<count;i++){
  // Random pos within circle, but not too close to center
  let dist=300+Math.random()*(r-300);
  let ang=Math.random()*Math.PI*2;
  obstacles.push({
    x:Math.cos(ang)*dist,
    y:Math.sin(ang)*dist,
    r:30+Math.random()*60 // Radius of tree
  });
}
// Generate destructibles
let dCount=20;
for(let i=0;i<dCount;i++){
  let dist=200+Math.random()*(r-200);let ang=Math.random()*Math.PI*2;
  destructibles.push({id:Math.random(),x:Math.cos(ang)*dist,y:Math.sin(ang)*dist,r:25,hp:100,maxHp:100});
}
}
generateObstacles(0);
let wave=1;let threat=0;
let waveState={total:10,spawned:0,active:true};
let lastEnemySpawn=0;let lastItemSpawn=0;
let adapt={speed:0,stat:0,kills:0};
// Ability Cooldowns (ms)
const ABILITY_COOLDOWNS={0:5000,1:10000,2:15000,3:20000,4:10000,5:30000,6:8000,7:20000};
// Global Events
let activeEvent=null;let eventTimer=0;
const EVENTS=[
  {name:'FRENZY',duration:15000,desc:'Enemies move faster!'},
  {name:'POWER SURGE',duration:10000,desc:'Players deal double damage!'},
  {name:'DARKNESS',duration:20000,desc:'Visibility reduced!'}
];
function checkEvents(){
  if(activeEvent){
    if(Date.now()>activeEvent.endTime){
      activeEvent=null;io.emit('eventEnd');
    }
  }else if(Math.random()<0.0005 && Object.keys(players).length>0){ // Chance per tick
    let ev=EVENTS[Math.floor(Math.random()*EVENTS.length)];
    activeEvent={...ev,endTime:Date.now()+ev.duration};
    io.emit('eventStart',activeEvent);
  }
}

io.on('connection',(socket)=>{
console.log('User connected:',socket.id);
socket.on('joinGame',(data)=>{
if(data.mapId!==undefined && data.mapId!==currentMap){currentMap=data.mapId;generateObstacles(currentMap);wave=1;waveState={total:10,spawned:0,active:true};enemies=[];items=[];structures=[];}
let stats=data.stats;
let fireRate=10;
if(data.type===0) fireRate=5;if(data.type===3 || data.type===5) fireRate=20;if(data.type===6) fireRate=8;

let def = VEHICLE_DEFS[data.type] || VEHICLE_DEFS[0];

players[socket.id]={
id:socket.id,x:0,y:0,angle:0,turretAngle:0, // Spawn at center
type:data.type,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,damage:stats.damage,
score:0,buffs:{speed:1,damage:1},isBot:false,
isShooting:false,fireCooldown:0,fireRate:fireRate,
lastAbility:0,abilityCd:ABILITY_COOLDOWNS[data.type]||10000,
// New Mechanics
vx: 0, vy: 0, // Velocity
stress: 0, maxStress: def.stress.max, overload: false,
shield: (def.durability.type==='SHIELD'?def.durability.max:0), maxShield: (def.durability.type==='SHIELD'?def.durability.max:0), lastHit: 0,
armor: (def.durability.type==='ARMOR'?def.durability.max:0), maxArmor: (def.durability.type==='ARMOR'?def.durability.max:0),
reactive: (def.durability.type==='REACTIVE'?def.durability.max:0),
augments: [],
evolution: 0 // 0: Base, 1: Path A, 2: Path B
};

// Spawn allies slightly offset
for(let i=0;i<data.allyCount;i++){
let allyId=`bot_${socket.id}_${i}`;
let rType=Math.floor(Math.random()*5);
players[allyId]={
id:allyId,owner:socket.id,x:Math.random()*100-50,y:Math.random()*100-50,
angle:0,turretAngle:0,type:rType,hp:100,maxHp:100,speed:4,damage:15,
score:0,buffs:{speed:1,damage:1},isBot:true,
isShooting:false,fireCooldown:0,fireRate:15,
lastAbility:0,abilityCd:10000,state:'follow',targetId:null,
vx:0, vy:0, stress:0, shield:0, armor:0
};
}
// Send defs to client
socket.emit('init',{id:socket.id,players,obstacles,destructibles,mapRadius:MAP_SIZES[currentMap],wave,items,structures, vehicleDefs: VEHICLE_DEFS});
if(activeEvent) socket.emit('eventStart',activeEvent);
io.emit('updatePlayers',players);
});
socket.on('move',(data)=>{if(players[socket.id]){
  // Update physics state (Client sends authoritative position for lag reasons, but we track velocity for server logic if needed)
  players[socket.id].x=data.x;players[socket.id].y=data.y;players[socket.id].angle=data.angle;
  if(data.vx!==undefined){players[socket.id].vx=data.vx;players[socket.id].vy=data.vy;} // Sync velocity for passives
}});
socket.on('shootInput',(data)=>{if(players[socket.id]){players[socket.id].turretAngle=data.angle;players[socket.id].isShooting=data.active;}});
socket.on('ability',()=>{if(players[socket.id])useAbility(players[socket.id]);});
socket.on('disconnect',()=>{
console.log('User disconnected:',socket.id);
delete players[socket.id];
for(let id in players){if(players[id].isBot && players[id].owner===socket.id)delete players[id];}
io.emit('updatePlayers',players);
});
});
function useAbility(p){
if(p.overload || Date.now()-p.lastAbility<p.abilityCd)return;
p.lastAbility=Date.now();
// Stress Buildup
p.stress = Math.min(p.stress + 20, p.maxStress); // 20 stress per ability
if(p.stress >= p.maxStress){
  p.overload = true;
  io.to(p.id).emit('notification', 'SYSTEM OVERLOAD!');
  setTimeout(()=>{p.overload=false;p.stress=0;}, 3000); // 3s overload penalty
}

if(p.type===0){p.x+=Math.cos(p.angle)*250;p.y+=Math.sin(p.angle)*250;} // Nitro
if(p.type===1){p.hp=Math.min(p.hp+40,p.maxHp);} // Med
if(p.type===2){p.buffs.damage=2.5;setTimeout(()=>p.buffs.damage=1,4000);} // Dmg
if(p.type===3){p.hp=Math.min(p.hp+60,p.maxHp*1.5);} // Repair
if(p.type===4){for(let i=0;i<12;i++){let a=Math.PI*2/12*i;bullets.push({id:Math.random(),owner:p.id,x:p.x,y:p.y,vx:Math.cos(a)*12,vy:Math.sin(a)*12,damage:p.damage*2,life:50});}} // Barrage
if(p.type===5){p.hp=Math.min(p.hp+150,p.maxHp);threat+=10;} // Fortress
if(p.type===6){p.speed=18;setTimeout(()=>p.speed=8,2500);} // Speed
if(p.type===7){structures.push({id:Math.random(),x:p.x,y:p.y,hp:150,owner:p.id,life:1000});} // Sentry
}
function checkCollision(x,y,r){
for(let o of obstacles){let dist=Math.hypot(x-o.x,y-o.y);if(dist<o.r+r) return o;}
for(let d of destructibles){let dist=Math.hypot(x-d.x,y-d.y);if(dist<d.r+r) return d;}
return null;
}
function resolveCollision(p,radius){
let mapR=MAP_SIZES[currentMap];
let dist=Math.hypot(p.x,p.y);
if(dist>mapR-radius){
  let ang=Math.atan2(p.y,p.x);
  p.x=Math.cos(ang)*(mapR-radius);
  p.y=Math.sin(ang)*(mapR-radius);
}
[...obstacles,...destructibles].forEach(o=>{
  let dx=p.x-o.x;let dy=p.y-o.y;
  let d=Math.hypot(dx,dy);
  let minDist=o.r+radius;
  if(d<minDist){
    if(d===0){dx=1;dy=0;d=1;}
    let push=minDist-d;
    p.x+=dx/d*push;
    p.y+=dy/d*push;
  }
});
}
setInterval(()=>{
let mapR=MAP_SIZES[currentMap];
checkEvents();
let totalSpeed=0,count=0;
for(let id in players){if(!players[id].isBot){totalSpeed+=players[id].speed;count++;}}
if(count>0) adapt.speed=totalSpeed/count;
if(threat>0) threat-=0.05;
for(let id in players){
let p=players[id];
resolveCollision(p,25);

// Stress Decay
if(!p.overload && p.stress>0 && !p.isShooting) p.stress = Math.max(0, p.stress - 0.2);

// Shield Regen
let def = VEHICLE_DEFS[p.type] || VEHICLE_DEFS[0];
if(def.durability.type === 'SHIELD'){
  if(Date.now() - p.lastHit > def.durability.delay && p.shield < p.maxShield){
     p.shield = Math.min(p.shield + 0.5, p.maxShield); // Slow regen
  }
}

// Shooting Stress
if(p.isShooting && !p.overload){
  p.stress = Math.min(p.stress + 0.5, p.maxStress); // Firing builds stress
  if(p.stress >= p.maxStress){
    p.overload = true;
    p.isShooting = false;
    io.to(p.id).emit('notification', 'OVERLOAD! COOLING DOWN...');
    setTimeout(()=>{p.overload=false;p.stress=0;}, 2000);
  }
}

if(p.fireCooldown>0) p.fireCooldown--;
if(p.isShooting && p.fireCooldown<=0 && !p.overload){
let dmg=p.damage*p.buffs.damage;
if(activeEvent && activeEvent.name==='POWER SURGE') dmg*=2;
// Passive: Speed Damage
if(def.passives.includes('SPEED_DAMAGE')){
  let spd = Math.hypot(p.vx||0, p.vy||0);
  dmg += spd * 1.5;
}
// Passive: Siege Mode
if(def.passives.includes('SIEGE_MODE')){
   let spd = Math.hypot(p.vx||0, p.vy||0);
   if(spd < 0.5) dmg *= 1.3;
}

if(p.type===6) dmg+=p.speed;
bullets.push({id:Math.random(),owner:p.id,x:p.x,y:p.y,vx:Math.cos(p.turretAngle)*20,vy:Math.sin(p.turretAngle)*20,damage:dmg,life:100, type: 'KINETIC'}); // Default Kinetic
p.fireCooldown=p.fireRate;
}
}
structures.forEach((s,idx)=>{
s.life--;
if(s.life%30===0){
let target=null,minD=600;
enemies.forEach(e=>{let d=Math.hypot(e.x-s.x,e.y-s.y);if(d<minD){minD=d;target=e;}});
if(target){let a=Math.atan2(target.y-s.y,target.x-s.x);bullets.push({id:Math.random(),owner:s.owner,x:s.x,y:s.y,vx:Math.cos(a)*15,vy:Math.sin(a)*15,damage:10,life:60});}
}
});
structures=structures.filter(s=>s.life>0 && s.hp>0);
bullets.forEach(b=>{
b.x+=b.vx;b.y+=b.vy;b.life--;
let hitObj = checkCollision(b.x,b.y,5);
if(hitObj){
  b.life=0;
  if(hitObj.hp!==undefined){ // Destructible
    hitObj.hp-=b.damage;
  }
}
});
bullets=bullets.filter(b=>b.life>0);
// Destructibles Logic
for(let i=destructibles.length-1;i>=0;i--){
  if(destructibles[i].hp<=0){
    // Explosion
    let d=destructibles[i];
    io.emit('explosion',{x:d.x,y:d.y});
    // Area Damage
    for(let id in players){if(Math.hypot(players[id].x-d.x,players[id].y-d.y)<100) players[id].hp-=30;}
    enemies.forEach(e=>{if(Math.hypot(e.x-d.x,e.y-d.y)<100) e.hp-=50;});
    destructibles.splice(i,1);
  }
}
// Spawn Logic
let spawnDelay=Math.max(500, 2000 - wave*100);
if(Date.now()-lastEnemySpawn>spawnDelay && waveState.spawned<waveState.total){
let r=Math.random();
let type=0;
if(adapt.speed>6 || threat>50 || wave>3) type=1;
if(threat>80 || wave>5) type=3;
if(Math.random()<0.2 + threat/200) type=2;
let ang=Math.random()*Math.PI*2;
let dist=mapR-50;
let enemy={
  id:Math.random(),x:Math.cos(ang)*dist,y:Math.sin(ang)*dist,
  type:type,
  hp:20+wave*5+(type===3?100:0),
  maxHp:20+wave*5+(type===3?100:0),
  speed:type===0?5:type===1?3:type===3?1.5:4,
  state:'chase',stateTimer:0,
  targetId:null,
  modifiers:[]
};
// Elite System
if(wave>2 && Math.random()<(0.1 + wave*0.05)){
  let mods=['FAST','ARMORED','EXPLOSIVE'];
  let mod=mods[Math.floor(Math.random()*mods.length)];
  enemy.modifiers.push(mod);
  enemy.isElite=true;
  if(mod==='FAST') enemy.speed*=1.5;
  if(mod==='ARMORED') {enemy.hp*=2;enemy.maxHp*=2;}
}
enemies.push(enemy);
waveState.spawned++;
lastEnemySpawn=Date.now();
}
if(Date.now()-lastItemSpawn>10000 && items.length<10){
let ang=Math.random()*Math.PI*2;let d=Math.random()*mapR;
items.push({x:Math.cos(ang)*d,y:Math.sin(ang)*d,type:Math.floor(Math.random()*3)});
lastItemSpawn=Date.now();
}
// AI Logic
enemies.forEach(e=>{
// 1. Find Target
let target=null;let minD=Infinity;
for(let id in players){
  let p=players[id];
  let d=Math.hypot(p.x-e.x,p.y-e.y);
  if(p.type===5)d/=2;
  if(d<minD){minD=d;target=p;}
}
e.stateTimer--;
if(e.stateTimer<=0){
  if(minD<200 && e.type===1) e.state='flee';
  else if(minD<400 && e.type===1) e.state='strafe';
  else if(minD<1000) e.state='chase';
  else e.state='wander';
  e.stateTimer=20+Math.random()*40;
}
let dx=0,dy=0;
let spd=e.speed;
if(activeEvent && activeEvent.name==='FRENZY') spd*=1.5;
if(target && minD<1500){
  let tx=target.x-e.x;let ty=target.y-e.y;
  let ang=Math.atan2(ty,tx);
  if(e.state==='chase'){
    dx=Math.cos(ang)*spd;dy=Math.sin(ang)*spd;
    if(e.type===0) {dx+=Math.cos(Date.now()/200)*2;dy+=Math.sin(Date.now()/200)*2;}
  }else if(e.state==='strafe'){
    dx=Math.cos(ang+Math.PI/2)*spd;dy=Math.sin(ang+Math.PI/2)*spd;
    if(Math.random()<0.05 && minD<500)bullets.push({id:Math.random(),owner:'enemy',x:e.x,y:e.y,vx:Math.cos(ang)*10,vy:Math.sin(ang)*10,damage:5+wave,life:100});
  }else if(e.state==='flee'){
    dx=-Math.cos(ang)*spd;dy=-Math.sin(ang)*spd;
  }
}else{
   dx=Math.cos(e.id)*1;dy=Math.sin(e.id)*1;
}
e.x+=dx;e.y+=dy;
resolveCollision(e,15);
});
for(let id in players){
let bot=players[id];
if(bot.isBot){
let owner=players[bot.owner];
if(!owner){delete players[id];continue;}
let target=null;let minD=Infinity;
enemies.forEach(e=>{let d=Math.hypot(e.x-bot.x,e.y-bot.y);if(d<minD){minD=d;target=e;}});
if(target && minD<600){
  let ang=Math.atan2(target.y-bot.y,target.x-bot.x);
  bot.turretAngle=ang;bot.isShooting=true;
  if(minD>300){bot.x+=Math.cos(ang)*bot.speed;bot.y+=Math.sin(ang)*bot.speed;}
  else{bot.x+=Math.cos(ang+Math.PI/2)*bot.speed;bot.y+=Math.sin(ang+Math.PI/2)*bot.speed;}
}else{
  bot.isShooting=false;
  let dToOwner=Math.hypot(owner.x-bot.x,owner.y-bot.y);
  if(dToOwner>150){
    let ang=Math.atan2(owner.y-bot.y,owner.x-bot.x);
    bot.x+=Math.cos(ang)*bot.speed;bot.y+=Math.sin(ang)*bot.speed;
    bot.angle=ang;
  }
}
for(let oid in players){
if(id!==oid && players[oid].isBot){
let dx=bot.x-players[oid].x;let dy=bot.y-players[oid].y;let d=Math.hypot(dx,dy);
if(d<50 && d>0){bot.x+=dx/d*2;bot.y+=dy/d*2;}
}
}
resolveCollision(bot,20);
}
}
for(let i=bullets.length-1;i>=0;i--){
let b=bullets[i];
if(b.owner==='enemy'){
for(let id in players){
let p=players[id];
if(Math.hypot(b.x-p.x,b.y-p.y)<20){
  // Player Damage Logic (Durability)
  let dmg = b.damage;
  let def = VEHICLE_DEFS[p.type] || VEHICLE_DEFS[0];

  // Resistance
  let type = b.type || 'KINETIC';
  let res = def.resistance[type] || 1.0;
  dmg /= res; // Higher res = less damage (e.g., 1.5 res = damage/1.5)

  p.lastHit = Date.now();

  // Durability Check
  if(p.reactive > 0){
    p.reactive--;
    dmg = 0; // Blocked
    io.to(p.id).emit('notification', 'REACTIVE ARMOR BLOCKED HIT');
  } else if(p.shield > 0){
    if(p.shield >= dmg){
      p.shield -= dmg;
      dmg = 0;
    } else {
      dmg -= p.shield;
      p.shield = 0;
    }
  } else if(p.armor > 0){
    let mitigation = def.durability.mitigation || 0;
    dmg *= (1 - mitigation);
    p.armor = Math.max(0, p.armor - dmg * 0.5); // Armor degrades slower than HP
  }

  p.hp-=dmg;
  bullets.splice(i,1);
if(p.hp<=0){
if(p.isBot){io.to(p.owner).emit('notification',`Chassis ${p.id.split('_')[2]} has died!`);delete players[id];}
else{io.to(id).emit('gameOver',p.score);delete players[id];for(let pid in players){if(players[pid].owner===id)delete players[pid];}}
}break;
}
}
for(let j=structures.length-1;j>=0;j--){let s=structures[j];if(Math.hypot(b.x-s.x,b.y-s.y)<30){s.hp-=b.damage;bullets.splice(i,1);if(s.hp<=0)structures.splice(j,1);break;}}
}else{
for(let j=enemies.length-1;j>=0;j--){
let e=enemies[j];
if(Math.hypot(b.x-e.x,b.y-e.y)<32){
let reduction=e.modifiers.includes('ARMORED')?0.5:1;
e.hp-=b.damage*reduction;
bullets.splice(i,1);
if(e.hp<=0){
enemies.splice(j,1);
if(e.modifiers.includes('EXPLOSIVE')){
  io.emit('explosion',{x:e.x,y:e.y});
  for(let id in players){if(Math.hypot(players[id].x-e.x,players[id].y-e.y)<150)players[id].hp-=40;}
}
let shooter=players[b.owner];if(shooter){shooter.score+=10+(e.isElite?20:0);threat+=2;}
// Wave Progression
if(waveState.spawned>=waveState.total && enemies.length===0){
  wave++;
  waveState.total=10 + wave*5;
  waveState.spawned=0;
  io.emit('wave',wave);
}
}break;
}
}
}
}
for(let id in players){
let p=players[id];
for(let j=enemies.length-1;j>=0;j--){let e=enemies[j];let d=Math.hypot(p.x-e.x,p.y-e.y);if(d<30){p.hp-=1;if(p.type===6&&p.speed>10){e.hp-=50;if(e.hp<=0)enemies.splice(j,1);}}}
for(let k=items.length-1;k>=0;k--){let it=items[k];if(Math.hypot(p.x-it.x,p.y-it.y)<30){if(it.type===0)p.hp=Math.min(p.hp+50,p.maxHp);if(it.type===1){p.buffs.speed=1.5;setTimeout(()=>p.buffs.speed=1,5000);}if(it.type===2){p.buffs.damage=1.5;setTimeout(()=>p.buffs.damage=1,5000);}items.splice(k,1);}}
}
io.emit('update',{players,bullets,enemies,items,wave,structures,destructibles,threat});
},33); // 30 TPS
const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>{console.log(`Server running on port ${PORT}`);});