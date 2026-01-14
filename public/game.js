const socket=io();
const canvas=document.getElementById('gameCanvas');const ctx=canvas.getContext('2d');
const miniCanvas=document.getElementById('minimap');const miniCtx=miniCanvas.getContext('2d');
const menu=document.getElementById('menu');const gameUi=document.getElementById('game-ui');
const vehicleList=document.getElementById('vehicle-list');
const notifArea=document.getElementById('notification-area');
const threatFill=document.getElementById('threat-fill');
let width,height;
function resize(){width=window.innerWidth;height=window.innerHeight;canvas.width=width;canvas.height=height;miniCanvas.width=150;miniCanvas.height=150;}
window.addEventListener('resize',resize);resize();
const vehicles=[
{name:'Dune Buggy',stats:{hp:80,damage:10,speed:5},desc:'Fast Scout. Ability: Nitro Dash',color:'#f39c12'},
{name:'Ranger Jeep',stats:{hp:100,damage:15,speed:4},desc:'Standard Issue. Ability: Field Med',color:'#27ae60'},
{name:'Armored Truck',stats:{hp:120,damage:20,speed:3},desc:'Heavy Transport. Ability: Dmg Up',color:'#7f8c8d'},
{name:'Battle Tank',stats:{hp:150,damage:25,speed:2},desc:'Main Battle Tank. Ability: Repair',color:'#2c3e50'},
{name:'Rocket Truck',stats:{hp:90,damage:40,speed:3},desc:'Artillery. Ability: Barrage',color:'#8e44ad'},
{name:'Iron Fortress',stats:{hp:300,damage:20,speed:1.5},desc:'Mobile Base. Ability: Mega Repair',color:'#34495e'},
{name:'Attack Chopper',stats:{hp:90,damage:12,speed:8},desc:'Air Support. Ability: Afterburner',color:'#16a085'},
{name:'Combat Engi',stats:{hp:110,damage:10,speed:3},desc:'Builder. Ability: Sentry Gun',color:'#d35400'}
];
vehicles.forEach((v,i)=>{
const el=document.createElement('div');el.className='vehicle-card';
el.innerHTML=`<h3>${v.name}</h3><div class="vehicle-preview" style="background:${v.color};border-color:#fff"></div><p>${v.desc}</p><small>HP:${v.stats.hp} | DMG:${v.stats.damage} | SPD:${v.stats.speed}</small>`;
el.onclick=()=>startGame(i);
vehicleList.appendChild(el);
});
let myId=null;let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let structures=[];
let mapW=4000;let mapH=4000;
let camX=0;let camY=0;
let joystick={active:false,id:null,cx:0,cy:0,angle:0};
let shootJoy={active:false,id:null,cx:0,cy:0,angle:0};
const joyEl=document.getElementById('joystick');const knobEl=document.getElementById('knob');
const shootEl=document.getElementById('shoot-joystick');const shootKnob=document.getElementById('shoot-knob');
const maxR=40;
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
socket.on('init',data=>{myId=data.id;players=data.players;obstacles=data.obstacles;mapW=data.map.w;mapH=data.map.h;items=data.items;structures=data.structures;});
socket.on('updatePlayers',p=>players=p);
socket.on('update',data=>{players=data.players;bullets=data.bullets;enemies=data.enemies;items=data.items;structures=data.structures;
document.getElementById('wave-val').innerText=data.wave;
threatFill.style.width=Math.min(100,data.threat)+'%';
if(players[myId]){
document.getElementById('hp-val').innerText=Math.floor(players[myId].hp);
document.getElementById('score-val').innerText=players[myId].score;
}
});
socket.on('notification',msg=>{
let el=document.createElement('div');el.className='notification';el.innerText=msg;
notifArea.appendChild(el);setTimeout(()=>el.remove(),3000);
});
socket.on('gameOver',score=>{alert('Game Over! Score: '+score);location.reload();});
function drawVehicle(ctx,color,angle,turretAngle,type){
ctx.save();ctx.rotate(angle);
ctx.strokeStyle='#000';ctx.lineWidth=2;
// Cartoon Style
if(type===6){ // Chopper
ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,25,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle='#333';ctx.beginPath();ctx.rect(-5,-25,10,50);ctx.fill(); // Blades
} else {
// Treads
ctx.fillStyle='#333';ctx.beginPath();ctx.roundRect(-25,-20,50,40,5);ctx.fill();ctx.stroke();
// Body
ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-20,-15,40,30,5);ctx.fill();ctx.stroke();
}
ctx.restore();
// Turret
ctx.save();ctx.rotate(turretAngle);
ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle='#111';ctx.beginPath();ctx.rect(0,-5,35,10);ctx.fill();ctx.stroke(); // Gun
ctx.restore();
}
function drawEnemy(ctx,type,angle){
ctx.rotate(angle);ctx.strokeStyle='#000';ctx.lineWidth=2;
if(type===0){ // Rusher - Guerilla
ctx.fillStyle='#e74c3c';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle='#f1c40f';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill(); // Helmet
}else if(type===1){ // Shooter - Merc
ctx.fillStyle='#27ae60';ctx.beginPath();ctx.rect(-15,-15,30,30);ctx.fill();ctx.stroke();
ctx.fillStyle='#2c3e50';ctx.beginPath();ctx.rect(0,-3,25,6);ctx.fill(); // Rifle
}else{ // Ambusher - Ninja
ctx.fillStyle='#8e44ad';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-10,15);ctx.lineTo(-10,-15);ctx.fill();ctx.stroke();
}
}
function draw(){
// Jungle Grass Background
ctx.fillStyle='#2ecc71';ctx.fillRect(0,0,width,height);
ctx.save();
ctx.fillStyle='#27ae60';
for(let i=0;i<width;i+=200)for(let j=0;j<height;j+=200)ctx.fillRect(i,j,100,100); // Checkered grass pattern
ctx.restore();
if(!myId || !players[myId])return requestAnimationFrame(draw);
let me=players[myId];
camX=me.x-width/2;camY=me.y-height/2;
camX=Math.max(0,Math.min(camX,mapW-width));camY=Math.max(0,Math.min(camY,mapH-height));
ctx.save();ctx.translate(-camX,-camY);
// Map Border
ctx.strokeStyle='#145a32';ctx.lineWidth=20;ctx.strokeRect(0,0,mapW,mapH);
// Shadows
ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=15;ctx.shadowOffsetY=10;
// Obstacles (Trees)
obstacles.forEach(o=>{
ctx.fillStyle='#1e8449';ctx.beginPath();ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w/2,0,Math.PI*2);ctx.fill(); // Leaves
ctx.strokeStyle='#145a32';ctx.lineWidth=5;ctx.stroke();
});
ctx.shadowBlur=0;ctx.shadowOffsetY=0;
items.forEach(i=>{
ctx.fillStyle=i.type===0?'#e74c3c':i.type===1?'#3498db':'#f1c40f';
ctx.beginPath();ctx.arc(i.x,i.y,15,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';
ctx.fillText(i.type===0?'HP':i.type===1?'SPD':'DMG',i.x,i.y+5);
});
structures.forEach(s=>{
ctx.fillStyle='#d35400';ctx.fillRect(s.x-15,s.y-15,30,30);
ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.strokeRect(s.x-15,s.y-15,30,30);
});
bullets.forEach(b=>{
ctx.fillStyle=b.owner==='enemy'?'#c0392b':'#f1c40f';
ctx.beginPath();ctx.arc(b.x,b.y,8,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.stroke();
});
enemies.forEach(e=>{
ctx.save();ctx.translate(e.x,e.y);
drawEnemy(ctx,e.type,Math.atan2(players[myId].y-e.y,players[myId].x-e.x));
ctx.restore();
});
for(let id in players){
let p=players[id];
ctx.save();ctx.translate(p.x,p.y);
drawVehicle(ctx,id===myId?'#3498db':p.isBot?'#2ecc71':(vehicles[p.type]?vehicles[p.type].color:'#aaa'),p.angle,p.turretAngle,p.type);
ctx.restore();
// Health Bar
ctx.fillStyle='#c0392b';ctx.fillRect(p.x-20,p.y-40,40,5);
ctx.fillStyle='#2ecc71';ctx.fillRect(p.x-20,p.y-40,40*(p.hp/p.maxHp),5);
}
ctx.restore();
// Minimap
miniCtx.clearRect(0,0,150,150);
miniCtx.fillStyle='#27ae60';miniCtx.fillRect(0,0,150,150);
let s=150/Math.max(mapW,mapH);
miniCtx.fillStyle='#145a32';obstacles.forEach(o=>miniCtx.beginPath()||miniCtx.arc((o.x+o.w/2)*s,(o.y+o.h/2)*s,o.w*s/2,0,Math.PI*2)||miniCtx.fill());
miniCtx.fillStyle='#c0392b';enemies.forEach(e=>miniCtx.fillRect(e.x*s,e.y*s,3,3));
for(let id in players){let p=players[id];miniCtx.fillStyle=id===myId?'#3498db':p.isBot?'#2ecc71':'#fff';miniCtx.fillRect(p.x*s,p.y*s,4,4);}
// Movement Input
let spd=me.speed*(me.buffs?me.buffs.speed:1);
let moveAngle=null;
if(joystick.active){moveAngle=joystick.angle;}
else{
let dx=0,dy=0;
if(keys['ArrowUp']||keys['w'])dy=-1;if(keys['ArrowDown']||keys['s'])dy=1;
if(keys['ArrowLeft']||keys['a'])dx=-1;if(keys['ArrowRight']||keys['d'])dx=1;
if(dx!=0||dy!=0)moveAngle=Math.atan2(dy,dx);
}
if(moveAngle!==null){
let nx=me.x+Math.cos(moveAngle)*spd;let ny=me.y+Math.sin(moveAngle)*spd;
if(nx>0 && nx<mapW && ny>0 && ny<mapH){
socket.emit('move',{x:nx,y:ny,angle:moveAngle});me.x=nx;me.y=ny;me.angle=moveAngle;
}
}
requestAnimationFrame(draw);
}
requestAnimationFrame(draw);