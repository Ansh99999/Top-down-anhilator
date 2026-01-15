const socket=io();
const canvas=document.getElementById('gameCanvas');const ctx=canvas.getContext('2d');
const miniCanvas=document.getElementById('minimap');const miniCtx=miniCanvas.getContext('2d');
const menu=document.getElementById('menu');const gameUi=document.getElementById('game-ui');
const vehicleList=document.getElementById('vehicle-list');
const notifArea=document.getElementById('notification-area');
const threatFill=document.getElementById('threat-fill');
const eventBanner=document.getElementById('event-banner');
const eventName=document.getElementById('event-name');
const eventDesc=document.getElementById('event-desc');

// --- ASSET LOADER ---
const assets = {};
function loadAssets(){
  const list = [
    {key: 'DuneBuggy', src: 'assets/DuneBuggy.png'}
  ];
  list.forEach(item => {
    const img = new Image();
    img.src = item.src;
    img.onload = () => { assets[item.key] = img; };
  });
}
loadAssets();
// --------------------

let width,height;
function resize(){width=window.innerWidth;height=window.innerHeight;canvas.width=width;canvas.height=height;}
window.addEventListener('resize',resize);resize();
const vehicles=[
{name:'Dune Buggy',stats:{hp:80,damage:10,speed:5},desc:'Fast Scout',color:'#f39c12'},
{name:'Ranger Jeep',stats:{hp:100,damage:15,speed:4},desc:'Standard Issue',color:'#27ae60'},
{name:'Armored Truck',stats:{hp:120,damage:20,speed:3},desc:'Heavy Transport',color:'#7f8c8d'},
{name:'Battle Tank',stats:{hp:150,damage:25,speed:2},desc:'Main Battle Tank',color:'#2c3e50'},
{name:'Rocket Truck',stats:{hp:90,damage:40,speed:3},desc:'Artillery',color:'#8e44ad'},
{name:'Iron Fortress',stats:{hp:300,damage:20,speed:1.5},desc:'Mobile Base',color:'#34495e'},
{name:'Attack Chopper',stats:{hp:90,damage:12,speed:8},desc:'Air Support',color:'#16a085'},
{name:'Combat Engi',stats:{hp:110,damage:10,speed:3},desc:'Builder',color:'#d35400'}
];
vehicles.forEach((v,i)=>{
const el=document.createElement('div');el.className='vehicle-card';
el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label', `Select ${v.name}`);
el.innerHTML=`<h3>${v.name}</h3><div class="vehicle-preview" style="background:${v.color};border-color:#fff"></div><small>HP:${v.stats.hp}</small>`;
el.onclick=()=>startGame(i);
el.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();startGame(i);}};
vehicleList.appendChild(el);
});
let myId=null;let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let structures=[];let destructibles=[];
let mapRadius=2000;
let camX=0;let camY=0;
let joystick={active:false,id:null,cx:0,cy:0,angle:0};
let shootJoy={active:false,id:null,cx:0,cy:0,angle:0};
const joyEl=document.getElementById('joystick');const knobEl=document.getElementById('knob');
const shootEl=document.getElementById('shoot-joystick');const shootKnob=document.getElementById('shoot-knob');
const maxR=40;

// Physics State
let vx=0, vy=0;
let physicsAngle=0; // The direction the vehicle is facing
let VEHICLE_DEFS = {}; // Received from server

function handleTouch(e,obj,knob,isShoot){
e.preventDefault();
for(let i=0;i<e.changedTouches.length;i++){
let t=e.changedTouches[i];
if(!obj.active && (e.type==='touchstart')){
obj.active=true;obj.id=t.identifier;
let r=e.target.getBoundingClientRect();
obj.cx=r.left+r.width/2;obj.cy=r.top+r.height/2;
updateJoy(t,obj,knob,isShoot);
}else if(obj.active && t.identifier===obj.id){
if(e.type==='touchmove') updateJoy(t,obj,knob,isShoot);
if(e.type==='touchend' || e.type==='touchcancel'){
obj.active=false;obj.id=null;knob.style.transform=`translate(-50%,-50%)`;
if(isShoot) socket.emit('shootInput',{active:false,angle:obj.angle});
}
}
}
}
function updateJoy(t,obj,knob,isShoot){
let dx=t.clientX-obj.cx;let dy=t.clientY-obj.cy;
let dist=Math.hypot(dx,dy);
let angle=Math.atan2(dy,dx);obj.angle=angle;
if(dist>maxR){dx=Math.cos(angle)*maxR;dy=Math.sin(angle)*maxR;}
knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
if(isShoot) socket.emit('shootInput',{active:true,angle:obj.angle});
}
['touchstart','touchmove','touchend','touchcancel'].forEach(evt=>{
joyEl.addEventListener(evt,e=>handleTouch(e,joystick,knobEl,false));
shootEl.addEventListener(evt,e=>handleTouch(e,shootJoy,shootKnob,true));
});
// Mouse Support
function handleMouse(e,obj,knob,isShoot){
e.preventDefault();
if(e.type==='mousedown'){
obj.active=true;obj.id='mouse';
let r=e.target.getBoundingClientRect();
obj.cx=r.left+r.width/2;obj.cy=r.top+r.height/2;
updateJoy(e,obj,knob,isShoot);
}else if(obj.active && obj.id==='mouse'){
if(e.type==='mousemove') updateJoy(e,obj,knob,isShoot);
if(e.type==='mouseup' || e.type==='mouseleave'){
obj.active=false;obj.id=null;knob.style.transform=`translate(-50%,-50%)`;
if(isShoot) socket.emit('shootInput',{active:false,angle:obj.angle});
}
}
}
['mousedown','mousemove','mouseup','mouseleave'].forEach(evt=>{
joyEl.addEventListener(evt,e=>handleMouse(e,joystick,knobEl,false));
shootEl.addEventListener(evt,e=>handleMouse(e,shootJoy,shootKnob,true));
});
document.getElementById('ability-btn').addEventListener('touchstart',e=>{e.preventDefault();socket.emit('ability',{});});
document.addEventListener('keydown',e=>{if(e.code==='Space')socket.emit('shootInput',{active:true,angle:players[myId].turretAngle});if(e.code==='ShiftLeft')socket.emit('ability',{});});
document.addEventListener('keyup',e=>{if(e.code==='Space')socket.emit('shootInput',{active:false,angle:players[myId].turretAngle});});
let keys={};
document.addEventListener('keydown',e=>keys[e.key]=true);
document.addEventListener('keyup',e=>keys[e.key]=false);
function startGame(idx){
menu.style.display='none';gameUi.style.display='block';
let allyCount=parseInt(document.getElementById('copilot-count').value);
let mapId=parseInt(document.getElementById('map-select').value);
socket.emit('joinGame',{type:idx,stats:vehicles[idx].stats,allyCount,mapId});
}
socket.on('init',data=>{myId=data.id;players=data.players;obstacles=data.obstacles;destructibles=data.destructibles;mapRadius=data.mapRadius;items=data.items;structures=data.structures;VEHICLE_DEFS=data.vehicleDefs;initMapCanvas();});
socket.on('updatePlayers',p=>players=p);
socket.on('update',data=>{players=data.players;bullets=data.bullets;enemies=data.enemies;items=data.items;structures=data.structures;destructibles=data.destructibles;
document.getElementById('wave-val').innerText=data.wave;
threatFill.style.width=Math.min(100,data.threat)+'%';

// WEATHER EFFECT
if(data.weather === 'MONSOON'){
  canvas.style.filter = 'brightness(0.6) contrast(1.2)';
} else {
  canvas.style.filter = 'none';
}
window.currentWeather = data.weather; // Store for physics

if(players[myId]){
document.getElementById('hp-val').innerText=Math.floor(players[myId].hp);
document.getElementById('score-val').innerText=players[myId].score;
let cd=players[myId].abilityCd||10000;
let ready=Date.now()-(players[myId].lastAbility||0)>=cd;
document.getElementById('ability-btn').style.opacity=ready?1:0.5;
}
});
socket.on('notification',msg=>{
let el=document.createElement('div');el.className='notification';el.innerText=msg;
notifArea.appendChild(el);setTimeout(()=>el.remove(),3000);
});
socket.on('gameOver',score=>{alert('Game Over! Score: '+score);location.reload();});
socket.on('explosion',data=>{addParticle(data.x,data.y,'#e74c3c');shakeX=10;shakeY=10;});
socket.on('eventStart',ev=>{eventBanner.style.display='block';eventName.innerText=ev.name;eventDesc.innerText=ev.desc;});
socket.on('eventEnd',()=>{eventBanner.style.display='none';});

// Terrain Generation
let mapCanvas=document.createElement('canvas');let mapCtx=mapCanvas.getContext('2d');
function initMapCanvas(){
let s=mapRadius*2+200;
mapCanvas.width=s;mapCanvas.height=s;
mapCtx.translate(s/2,s/2);
// Base Ground
mapCtx.fillStyle='#2ecc71';mapCtx.beginPath();mapCtx.arc(0,0,mapRadius,0,Math.PI*2);mapCtx.fill();
mapCtx.strokeStyle='#145a32';mapCtx.lineWidth=20;mapCtx.stroke();
// Organic details
for(let i=0;i<300;i++){
mapCtx.fillStyle=Math.random()>0.5?'#27ae60':'#229954';
let r=Math.random()*mapRadius;let a=Math.random()*Math.PI*2;
let sz=50+Math.random()*150;
mapCtx.beginPath();mapCtx.ellipse(Math.cos(a)*r,Math.sin(a)*r,sz,sz*0.6,Math.random()*Math.PI,0,Math.PI*2);mapCtx.fill();
}
}
function drawVehicle(ctx,color,angle,turretAngle,type, p){
ctx.save();ctx.rotate(angle);
ctx.strokeStyle='#000';ctx.lineWidth=2;

// IMAGE DRAWING
if(type === 0 && assets['DuneBuggy']){
  // Draw the image centered and rotated
  // Assuming the sprite faces RIGHT by default. If it faces UP, we might need rotation adjustment.
  // Standard sprites often face Right (0 rad).
  try {
      ctx.drawImage(assets['DuneBuggy'], -25, -25, 50, 50);
  } catch(e) {
      // Fallback if draw fails
      ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-18,-16,36,32,6);ctx.fill();ctx.stroke();
  }
} else {
  // Detailed Cartoon Style
  ctx.fillStyle='#333';
  if(type===6){ // Chopper
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,25,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.arc(0,0,35,0,Math.PI*2);ctx.fill(); // Rotor blur
  }else{
    // Tracks
    ctx.beginPath();ctx.roundRect(-24,-22,48,44,4);ctx.fill();
    // Body
    ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-18,-16,36,32,6);ctx.fill();ctx.stroke();
    // Details
    ctx.fillStyle='rgba(255,255,255,0.2)';ctx.beginPath();ctx.rect(-10,-10,20,10);ctx.fill();
  }
}

// Visual Degradation (Smoke)
if(p.hp < p.maxHp * 0.3 || p.stress > p.maxStress * 0.8){
  ctx.fillStyle='rgba(0,0,0,0.5)';
  let s = (Date.now()%500)/500 * 20;
  ctx.beginPath();ctx.arc(-20,-10,s,0,Math.PI*2);ctx.fill();
}

// Shield Visual
if(p.shield > 0){
  ctx.strokeStyle='#3498db';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(0,0,32,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(52,152,219,0.2)';ctx.fill();
}
// Reactive Armor Visual
if(p.reactive > 0){
  ctx.strokeStyle='#f1c40f';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(0,0,35,0,Math.PI*2* (p.reactive/3));ctx.stroke();
}

ctx.restore();
ctx.save();ctx.rotate(turretAngle);
ctx.fillStyle=type===5?'#555':color;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle='#222';ctx.beginPath();ctx.rect(0,-4,32,8);ctx.fill();ctx.stroke(); // Barrel
ctx.restore();
}
function drawEnemy(ctx,e,angle){
ctx.rotate(angle);ctx.lineWidth=2;ctx.strokeStyle='#000';
let type=e.type;
if(type===10){ // JUNGLE BEHEMOTH (Boss)
  ctx.fillStyle='#2c3e50';
  ctx.beginPath();ctx.arc(0,0,60,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Boss details
  ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(20,-20,10,0,Math.PI*2);ctx.fill(); // Eye
  ctx.beginPath();ctx.arc(20,20,10,0,Math.PI*2);ctx.fill(); // Eye
  ctx.fillStyle='#7f8c8d';ctx.beginPath();ctx.rect(-40,-30,40,60);ctx.fill(); // Plate
}else if(type===0){ // Rusher
ctx.fillStyle='#c0392b';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-10,10);ctx.lineTo(-5,0);ctx.lineTo(-10,-10);ctx.fill();ctx.stroke();
}else if(type===1){ // Shooter
ctx.fillStyle='#27ae60';ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle='#f1c40f';ctx.beginPath();ctx.rect(5,-5,15,10);ctx.fill(); // Gun
}else if(type===3){ // Tank
ctx.fillStyle='#555';ctx.beginPath();ctx.rect(-20,-20,40,40);ctx.fill();ctx.stroke();
ctx.fillStyle='#333';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();
}else{ // Ambusher
ctx.fillStyle='#8e44ad';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-10,10);ctx.lineTo(-10,-10);ctx.fill();ctx.stroke();
}
// Elite Visuals
if(e.modifiers && e.modifiers.length>0){
  ctx.strokeStyle='#f1c40f';ctx.lineWidth=4;ctx.stroke();
  if(e.modifiers.includes('ARMORED')){ctx.strokeStyle='#95a5a6';ctx.stroke();}
  if(e.modifiers.includes('EXPLOSIVE')){ctx.fillStyle='#e67e22';ctx.fill();}
}
}
let particles=[];
function addParticle(x,y,c){for(let i=0;i<10;i++)particles.push({x,y,vx:Math.random()*10-5,vy:Math.random()*10-5,life:30,c});}
let shakeX=0,shakeY=0;
function draw(){
// Background
ctx.fillStyle='#1e272e';ctx.fillRect(0,0,width,height);
if(!myId || !players[myId])return requestAnimationFrame(draw);
let me=players[myId];
// Camera
if(shakeX>0)shakeX*=0.9;if(shakeY>0)shakeY*=0.9;
camX=me.x-width/2 + (Math.random()-0.5)*shakeX;
camY=me.y-height/2 + (Math.random()-0.5)*shakeY;
ctx.save();ctx.translate(-camX,-camY);
// Draw Terrain
ctx.drawImage(mapCanvas,-mapRadius-100,-mapRadius-100);

// Weather Effects (Rain)
if(window.currentWeather === 'MONSOON'){
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

// Obstacles
ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=20;
obstacles.forEach(o=>{
ctx.fillStyle='#1e8449';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#115e30';ctx.lineWidth=4;ctx.stroke();
// Tree Detail
ctx.fillStyle='#27ae60';ctx.beginPath();ctx.arc(o.x-o.r/3,o.y-o.r/3,o.r/2,0,Math.PI*2);ctx.fill();
});
// Destructibles
destructibles.forEach(d=>{
ctx.fillStyle='#d35400';ctx.fillRect(d.x-d.r,d.y-d.r,d.r*2,d.r*2);
ctx.strokeStyle='#a04000';ctx.lineWidth=3;ctx.strokeRect(d.x-d.r,d.y-d.r,d.r*2,d.r*2);
// Cracks
if(d.hp<d.maxHp/2){
ctx.beginPath();ctx.moveTo(d.x-10,d.y-10);ctx.lineTo(d.x+5,d.y+5);ctx.lineTo(d.x+10,d.y-5);ctx.stroke();
}
});
ctx.shadowBlur=0;
items.forEach(i=>{
ctx.fillStyle=i.type===0?'#e74c3c':i.type===1?'#3498db':'#f1c40f';
ctx.beginPath();ctx.arc(i.x,i.y,12,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
});
structures.forEach(s=>{ctx.fillStyle='#d35400';ctx.fillRect(s.x-15,s.y-15,30,30);ctx.strokeRect(s.x-15,s.y-15,30,30);});
// Bullets
bullets.forEach(b=>{
ctx.fillStyle=b.owner==='enemy'?'#c0392b':'#f1c40f';
if(b.damage>30)ctx.fillStyle='#8e44ad'; // Heavy shell
ctx.beginPath();
if(b.owner==='enemy') ctx.arc(b.x,b.y,6,0,Math.PI*2);
else ctx.ellipse(b.x,b.y,8,4,Math.atan2(b.vy,b.vx),0,Math.PI*2);
ctx.fill();
});
// Particles
particles.forEach((p,i)=>{
p.x+=p.vx;p.y+=p.vy;p.life--;
ctx.fillStyle=p.c;ctx.globalAlpha=p.life/30;ctx.fillRect(p.x,p.y,4,4);ctx.globalAlpha=1;
if(p.life<=0)particles.splice(i,1);
});
enemies.forEach(e=>{
ctx.save();ctx.translate(e.x,e.y);
drawEnemy(ctx,e,Math.atan2(players[myId].y-e.y,players[myId].x-e.x));
ctx.restore();
});
for(let id in players){
let p=players[id];
ctx.save();ctx.translate(p.x,p.y);
drawVehicle(ctx,id===myId?'#3498db':p.isBot?'#2ecc71':vehicles[p.type].color,p.angle,p.turretAngle,p.type, p);
ctx.restore();
// Health
ctx.fillStyle='#c0392b';ctx.fillRect(p.x-20,p.y-35,40,4);
ctx.fillStyle='#2ecc71';ctx.fillRect(p.x-20,p.y-35,40*(p.hp/p.maxHp),4);
// Armor (Gray)
if(p.armor > 0){
  ctx.fillStyle='#7f8c8d';ctx.fillRect(p.x-20,p.y-40,40*(p.armor/p.maxArmor),3);
}
// Stress (White/Flicker)
if(p.stress > 0){
  ctx.fillStyle=p.overload ? (Date.now()%200<100?'#e74c3c':'#fff') : '#ecf0f1';
  ctx.fillRect(p.x-20,p.y-30,40*(p.stress/p.maxStress),2);
}
}
ctx.restore();
miniCtx.clearRect(0,0,150,150);
miniCtx.fillStyle='rgba(0,0,0,0.5)';miniCtx.fillRect(0,0,150,150);
let s=150/(mapRadius*2.2);
miniCtx.translate(75,75);
miniCtx.fillStyle='#c0392b';enemies.forEach(e=>miniCtx.fillRect(e.x*s,e.y*s,3,3));
miniCtx.fillStyle='#3498db';miniCtx.fillRect(me.x*s,me.y*s,4,4);
miniCtx.fillStyle='#d35400';destructibles.forEach(d=>miniCtx.fillRect(d.x*s,d.y*s,3,3));
miniCtx.setTransform(1,0,0,1,0,0);
// Movement Logic (Physics Engine)
let inputAngle=null;
if(joystick.active){inputAngle=joystick.angle;}
else{
let dx=0,dy=0;
if(keys['ArrowUp']||keys['w'])dy=-1;if(keys['ArrowDown']||keys['s'])dy=1;
if(keys['ArrowLeft']||keys['a'])dx=-1;if(keys['ArrowRight']||keys['d'])dx=1;
if(dx!=0||dy!=0)inputAngle=Math.atan2(dy,dx);
}

// Default profile
let def = VEHICLE_DEFS[me.type] || { physics: { accel: 0.5, maxSpd: 5, turnSpd: 0.1, drift: 0.9, mass: 1 } };
let phys = def.physics;

if(inputAngle!==null){
  // Accelerate towards input
  let ax = Math.cos(inputAngle) * phys.accel;
  let ay = Math.sin(inputAngle) * phys.accel;

  // Turn towards input
  let diff = inputAngle - physicsAngle;
  while(diff < -Math.PI) diff += Math.PI*2;
  while(diff > Math.PI) diff -= Math.PI*2;
  physicsAngle += diff * phys.turnSpd; // Turn Inertia

  vx += ax; vy += ay;
}

// Friction / Drift
let drift = phys.drift;
if(window.currentWeather === 'MONSOON') drift = Math.min(0.99, drift + 0.05); // More slippery (closer to 1.0 means less friction loss per tick)
vx *= drift;
vy *= drift;

// Cap Speed
let spd = Math.hypot(vx,vy);
if(spd > phys.maxSpd){
  vx = (vx/spd) * phys.maxSpd;
  vy = (vy/spd) * phys.maxSpd;
}

let nx = me.x + vx;
let ny = me.y + vy;

// Client Side Collision
let hit=false;
if(Math.hypot(nx,ny)>mapRadius-25) hit=true;
for(let o of obstacles){if(Math.hypot(nx-o.x,ny-o.y)<o.r+25)hit=true;}
for(let d of destructibles){if(Math.hypot(nx-d.x,ny-d.y)<d.r+25)hit=true;}

if(hit){
  // Simple bounce/stop
  vx *= -0.5; vy *= -0.5;
  nx = me.x + vx; ny = me.y + vy;
}

me.x = nx; me.y = ny; me.angle = physicsAngle;
socket.emit('move',{x:nx,y:ny,angle:physicsAngle, vx, vy}); // Send vx/vy for passive logic

requestAnimationFrame(draw);
}
requestAnimationFrame(draw);