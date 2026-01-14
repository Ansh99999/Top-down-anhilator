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
{name:'Speedie',stats:{hp:80,damage:10,speed:5},desc:'Fast & Agile. Ability: Dash',color:'#3498db'},
{name:'Normal',stats:{hp:100,damage:15,speed:4},desc:'Balanced Fighter. Ability: Heal',color:'#ecf0f1'},
{name:'Medium',stats:{hp:120,damage:20,speed:3},desc:'Heavy Assault. Ability: Dmg Boost',color:'#f1c40f'},
{name:'Heavy',stats:{hp:150,damage:25,speed:2},desc:'Tank Destroyer. Ability: Overheal',color:'#e74c3c'},
{name:'Bomber',stats:{hp:90,damage:40,speed:3},desc:'Nuke Specialist. Ability: Blast',color:'#9b59b6'},
{name:'Juggernaut',stats:{hp:300,damage:20,speed:1.5},desc:'Mobile Fortress. Ability: Mega Heal',color:'#2c3e50'},
{name:'Interceptor',stats:{hp:90,damage:12,speed:8},desc:'Momentum Fighter. Ability: Boost',color:'#1abc9c'},
{name:'Engineer',stats:{hp:110,damage:10,speed:3},desc:'Builder. Ability: Deploy Turret',color:'#e67e22'}
];
vehicles.forEach((v,i)=>{
const el=document.createElement('div');el.className='vehicle-card';
el.innerHTML=`<h3>${v.name}</h3><div class="vehicle-preview" style="background:${v.color};color:${v.color}"></div><p>${v.desc}</p><small>HP:${v.stats.hp} | DMG:${v.stats.damage} | SPD:${v.stats.speed}</small>`;
el.onclick=()=>startGame(i);
vehicleList.appendChild(el);
});
let myId=null;let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let structures=[];
let mapW=4000;let mapH=4000;
let camX=0;let camY=0;
let joystick={active:false,x:0,y:0,angle:0,cx:0,cy:0};
let shootJoy={active:false,x:0,y:0,angle:0,cx:0,cy:0};
const joyEl=document.getElementById('joystick');const knobEl=document.getElementById('knob');
const shootEl=document.getElementById('shoot-joystick');const shootKnob=document.getElementById('shoot-knob');
const maxR=40;
function setupJoystick(el,knob,obj,isShoot){
el.addEventListener('touchstart',e=>{
e.preventDefault();
obj.active=true;
const rect=el.getBoundingClientRect();
obj.cx=rect.left+rect.width/2;
obj.cy=rect.top+rect.height/2;
updateJoy(e.touches[0],obj,knob,isShoot);
});
el.addEventListener('touchmove',e=>{e.preventDefault();if(obj.active)updateJoy(e.touches[0],obj,knob,isShoot);});
el.addEventListener('touchend',e=>{
e.preventDefault();obj.active=false;knob.style.transform=`translate(-50%,-50%)`;
if(isShoot)socket.emit('shootInput',{active:false,angle:obj.angle});
});
}
function updateJoy(touch,obj,knob,isShoot){
let dx=touch.clientX-obj.cx;let dy=touch.clientY-obj.cy;
let dist=Math.hypot(dx,dy);
let angle=Math.atan2(dy,dx);obj.angle=angle;
if(dist>maxR){dx=Math.cos(angle)*maxR;dy=Math.sin(angle)*maxR;}
knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
if(!isShoot)socket.emit('move',{x:players[myId].x,y:players[myId].y,angle:obj.angle});
else socket.emit('shootInput',{active:true,angle:obj.angle});
}
setupJoystick(joyEl,knobEl,joystick,false);
setupJoystick(shootEl,shootKnob,shootJoy,true);
document.getElementById('ability-btn').addEventListener('touchstart',e=>{e.preventDefault();socket.emit('ability',{});});
document.addEventListener('keydown',e=>{if(e.code==='Space')socket.emit('shootInput',{active:true,angle:players[myId].turretAngle});if(e.code==='ShiftLeft')socket.emit('ability',{});});
document.addEventListener('keyup',e=>{if(e.code==='Space')socket.emit('shootInput',{active:false,angle:players[myId].turretAngle});});
let keys={};
document.addEventListener('keydown',e=>keys[e.key]=true);
document.addEventListener('keyup',e=>keys[e.key]=false);
function startGame(idx){
menu.style.display='none';gameUi.style.display='block';
let allyCount=parseInt(document.getElementById('copilot-count').value);
socket.emit('joinGame',{type:idx,stats:vehicles[idx].stats,allyCount});
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
ctx.save();
ctx.rotate(angle);
ctx.fillStyle=color;
ctx.shadowColor=color;ctx.shadowBlur=10;
// Chassis
if(type===5){ // Juggernaut
ctx.beginPath();ctx.rect(-25,-25,50,50);ctx.fill();
ctx.fillStyle='#111';ctx.fillRect(-30,-30,10,60);ctx.fillRect(20,-30,10,60);
} else if(type===6){ // Interceptor
ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(-20,15);ctx.lineTo(-10,0);ctx.lineTo(-20,-15);ctx.fill();
} else {
ctx.beginPath();
ctx.moveTo(25,10);ctx.lineTo(25,18);ctx.lineTo(-25,18);ctx.lineTo(-25,10); // Right tread
ctx.moveTo(25,-10);ctx.lineTo(25,-18);ctx.lineTo(-25,-18);ctx.lineTo(-25,-10); // Left tread
ctx.fillStyle='#555';ctx.fill();
ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-20,-12,40,24,5);ctx.fill();
}
ctx.restore();
// Turret
ctx.save();
ctx.rotate(turretAngle);
ctx.fillStyle='#333';
ctx.beginPath();ctx.arc(0,0,type===5?15:10,0,Math.PI*2);ctx.fill();
ctx.fillStyle=color;
ctx.fillRect(0,-4,30,8);
if(type===5) ctx.fillRect(0,-8,35,16); // Bigger gun
ctx.restore();
ctx.shadowBlur=0;
}
function drawEnemy(ctx,type,angle){
ctx.rotate(angle);
ctx.shadowBlur=15;
if(type===0){ // Rusher
ctx.fillStyle='#c0392b';ctx.shadowColor='#c0392b';
ctx.beginPath();ctx.ellipse(0,0,20,10,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#e74c3c';ctx.beginPath();ctx.arc(10,-5,3,0,Math.PI*2);ctx.arc(10,5,3,0,Math.PI*2);ctx.fill();
}else if(type===1){ // Shooter
ctx.fillStyle='#27ae60';ctx.shadowColor='#27ae60';
ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-10,15);ctx.lineTo(-5,0);ctx.lineTo(-10,-15);ctx.fill();
ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
}else{ // Ambusher
ctx.fillStyle='#8e44ad';ctx.shadowColor='#8e44ad';
ctx.beginPath();
for(let i=0;i<8;i++){let a=Math.PI*2/8*i;let r=i%2==0?20:10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
ctx.closePath();ctx.fill();
ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
}
ctx.shadowBlur=0;
}
function draw(){
ctx.fillStyle='#050505';ctx.fillRect(0,0,width,height);
if(!myId || !players[myId])return requestAnimationFrame(draw);
let me=players[myId];
camX=me.x-width/2;camY=me.y-height/2;
camX=Math.max(0,Math.min(camX,mapW-width));camY=Math.max(0,Math.min(camY,mapH-height));
ctx.save();ctx.translate(-camX,-camY);
ctx.strokeStyle='#1a252f';ctx.lineWidth=2;
for(let x=0;x<mapW;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,mapH);ctx.stroke();}
for(let y=0;y<mapH;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(mapW,y);ctx.stroke();}
ctx.strokeStyle='#3498db';ctx.lineWidth=5;ctx.strokeRect(0,0,mapW,mapH);
ctx.fillStyle='#2c3e50';obstacles.forEach(o=>{
ctx.shadowColor='#000';ctx.shadowBlur=10;
ctx.fillRect(o.x,o.y,o.w,o.h);ctx.shadowBlur=0;
ctx.fillStyle='#34495e';ctx.fillRect(o.x+5,o.y+5,o.w-10,o.h-10);ctx.fillStyle='#2c3e50';
});
items.forEach(i=>{
ctx.fillStyle=i.type===0?'#e74c3c':i.type===1?'#3498db':'#f1c40f';
ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=20;
ctx.beginPath();ctx.arc(i.x,i.y,12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
ctx.fillStyle='#fff';ctx.font='bold 10px Orbitron';ctx.textAlign='center';
ctx.fillText(i.type===0?'HP':i.type===1?'SPD':'DMG',i.x,i.y+4);
});
structures.forEach(s=>{
ctx.fillStyle='#e67e22';ctx.shadowColor='#e67e22';ctx.shadowBlur=10;
ctx.fillRect(s.x-10,s.y-10,20,20);
ctx.fillStyle='#d35400';ctx.beginPath();ctx.arc(s.x,s.y,8,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
});
bullets.forEach(b=>{
ctx.fillStyle=b.owner==='enemy'?'#e74c3c':'#f1c40f';
ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
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
ctx.fillStyle='#fff';ctx.font='12px Orbitron';ctx.textAlign='center';ctx.fillText(`HP:${Math.floor(p.hp)}`,p.x,p.y-35);
}
ctx.restore();
miniCtx.clearRect(0,0,150,150);
miniCtx.fillStyle='#000';miniCtx.fillRect(0,0,150,150);
let s=150/Math.max(mapW,mapH);
miniCtx.fillStyle='#34495e';obstacles.forEach(o=>miniCtx.fillRect(o.x*s,o.y*s,o.w*s,o.h*s));
miniCtx.fillStyle='#e74c3c';enemies.forEach(e=>miniCtx.fillRect(e.x*s,e.y*s,2,2));
miniCtx.fillStyle='#f1c40f';items.forEach(i=>miniCtx.fillRect(i.x*s,i.y*s,3,3));
miniCtx.fillStyle='#e67e22';structures.forEach(st=>miniCtx.fillRect(st.x*s,st.y*s,4,4));
for(let id in players){let p=players[id];miniCtx.fillStyle=id===myId?'#3498db':p.isBot?'#2ecc71':'#fff';miniCtx.fillRect(p.x*s,p.y*s,3,3);}
let spd=me.speed*(me.buffs?me.buffs.speed:1);
if(joystick.active){
let dx=Math.cos(joystick.angle)*spd;let dy=Math.sin(joystick.angle)*spd;
let nx=me.x+dx;let ny=me.y+dy;
if(nx>0 && nx<mapW && ny>0 && ny<mapH){
let collide=obstacles.some(o=>nx>o.x-20 && nx<o.x+o.w+20 && ny>o.y-20 && ny<o.y+o.h+20);
if(!collide){socket.emit('move',{x:nx,y:ny,angle:joystick.angle});me.x=nx;me.y=ny;}
}
}
let dx=0,dy=0;
if(keys['ArrowUp']||keys['w'])dy=-1;if(keys['ArrowDown']||keys['s'])dy=1;
if(keys['ArrowLeft']||keys['a'])dx=-1;if(keys['ArrowRight']||keys['d'])dx=1;
if(dx!=0||dy!=0){
let angle=Math.atan2(dy,dx);
let nx=me.x+Math.cos(angle)*spd;let ny=me.y+Math.sin(angle)*spd;
if(nx>0 && nx<mapW && ny>0 && ny<mapH){
let collide=obstacles.some(o=>nx>o.x-20 && nx<o.x+o.w+20 && ny>o.y-20 && ny<o.y+o.h+20);
if(!collide){socket.emit('move',{x:nx,y:ny,angle:angle});me.x=nx;me.y=ny;me.angle=angle;}
}
}
requestAnimationFrame(draw);
}
requestAnimationFrame(draw);