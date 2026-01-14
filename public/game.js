const socket=io();
const canvas=document.getElementById('gameCanvas');const ctx=canvas.getContext('2d');
const miniCanvas=document.getElementById('minimap');const miniCtx=miniCanvas.getContext('2d');
const menu=document.getElementById('menu');const gameUi=document.getElementById('game-ui');
const vehicleList=document.getElementById('vehicle-list');
let width,height;
function resize(){width=window.innerWidth;height=window.innerHeight;canvas.width=width;canvas.height=height;miniCanvas.width=150;miniCanvas.height=150;}
window.addEventListener('resize',resize);resize();
const vehicles=[
{name:'Speedie',stats:{hp:80,damage:10,speed:5},desc:'Fast & Agile. Ability: Dash',color:'#3498db'},
{name:'Normal',stats:{hp:100,damage:15,speed:4},desc:'Balanced Fighter. Ability: Heal',color:'#ecf0f1'},
{name:'Medium',stats:{hp:120,damage:20,speed:3},desc:'Heavy Assault. Ability: Dmg Boost',color:'#f1c40f'},
{name:'Heavy',stats:{hp:150,damage:25,speed:2},desc:'Tank Destroyer. Ability: Overheal',color:'#e74c3c'},
{name:'Bomber',stats:{hp:90,damage:40,speed:3},desc:'Nuke Specialist. Ability: Blast',color:'#9b59b6'}
];
vehicles.forEach((v,i)=>{
const el=document.createElement('div');el.className='vehicle-card';
el.innerHTML=`<h3>${v.name}</h3><div class="vehicle-preview" style="background:${v.color};color:${v.color}"></div><p>${v.desc}</p><small>HP:${v.stats.hp} | DMG:${v.stats.damage} | SPD:${v.stats.speed}</small>`;
el.onclick=()=>startGame(i);
vehicleList.appendChild(el);
});
let myId=null;let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let particles=[];
let mapW=4000;let mapH=4000;
let camX=0;let camY=0;
let joystick={active:false,x:0,y:0,angle:0,cx:0,cy:0};
const joyEl=document.getElementById('joystick');const knobEl=document.getElementById('knob');
const maxR=40;
joyEl.addEventListener('touchstart',e=>{
e.preventDefault();
joystick.active=true;
const rect=joyEl.getBoundingClientRect();
joystick.cx=rect.left+rect.width/2;
joystick.cy=rect.top+rect.height/2;
updateJoy(e.touches[0]);
});
joyEl.addEventListener('touchmove',e=>{e.preventDefault();if(joystick.active)updateJoy(e.touches[0]);});
joyEl.addEventListener('touchend',e=>{e.preventDefault();joystick.active=false;knobEl.style.transform=`translate(-50%,-50%)`;socket.emit('move',{x:players[myId].x,y:players[myId].y,angle:joystick.angle});});
function updateJoy(touch){
let dx=touch.clientX-joystick.cx;let dy=touch.clientY-joystick.cy;
let dist=Math.hypot(dx,dy);
let angle=Math.atan2(dy,dx);joystick.angle=angle;
if(dist>maxR){dx=Math.cos(angle)*maxR;dy=Math.sin(angle)*maxR;}
knobEl.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
document.getElementById('shoot-btn').addEventListener('touchstart',e=>{e.preventDefault();socket.emit('shoot',{});});
document.getElementById('ability-btn').addEventListener('touchstart',e=>{e.preventDefault();socket.emit('ability',{});});
document.addEventListener('keydown',e=>{if(e.code==='Space')socket.emit('shoot',{});if(e.code==='ShiftLeft')socket.emit('ability',{});});
let keys={};
document.addEventListener('keydown',e=>keys[e.key]=true);
document.addEventListener('keyup',e=>keys[e.key]=false);
function startGame(idx){
menu.style.display='none';gameUi.style.display='block';
socket.emit('joinGame',{type:idx,stats:vehicles[idx].stats});
}
socket.on('init',data=>{myId=data.id;players=data.players;obstacles=data.obstacles;mapW=data.map.w;mapH=data.map.h;items=data.items;});
socket.on('updatePlayers',p=>players=p);
socket.on('update',data=>{players=data.players;bullets=data.bullets;enemies=data.enemies;items=data.items;
document.getElementById('wave-val').innerText=data.wave;
if(players[myId]){
document.getElementById('hp-val').innerText=Math.floor(players[myId].hp);
document.getElementById('score-val').innerText=players[myId].score;
}
});
socket.on('gameOver',score=>{alert('Game Over! Score: '+score);location.reload();});
function drawVehicle(ctx,color,angle){
ctx.rotate(angle);
ctx.fillStyle=color;
ctx.shadowColor=color;ctx.shadowBlur=15;
ctx.beginPath();ctx.roundRect(-20,-15,40,30,5);ctx.fill();
ctx.shadowBlur=0;
ctx.fillStyle='#111';
ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
ctx.fillStyle=color;
ctx.fillRect(0,-4,25,8);
}
function drawEnemy(ctx,type,angle){
ctx.rotate(angle);
if(type===0){ // Rusher
ctx.fillStyle='#c0392b';ctx.shadowColor='#c0392b';ctx.shadowBlur=10;
ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-15,15);ctx.lineTo(-5,0);ctx.lineTo(-15,-15);ctx.fill();
}else if(type===1){ // Shooter
ctx.fillStyle='#27ae60';ctx.shadowColor='#27ae60';ctx.shadowBlur=10;
ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-15,15);ctx.lineTo(-15,-15);ctx.fill();
ctx.fillStyle='#2ecc71';ctx.fillRect(0,-3,20,6);
}else{ // Ambusher
ctx.fillStyle='#8e44ad';ctx.shadowColor='#8e44ad';ctx.shadowBlur=10;
ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#9b59b6';ctx.lineWidth=2;ctx.stroke();
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
ctx.fillRect(o.x,o.y,o.w,o.h);
ctx.shadowBlur=0;
ctx.fillStyle='#34495e';ctx.fillRect(o.x+5,o.y+5,o.w-10,o.h-10);ctx.fillStyle='#2c3e50';
});
items.forEach(i=>{
ctx.fillStyle=i.type===0?'#e74c3c':i.type===1?'#3498db':'#f1c40f';
ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=20;
ctx.beginPath();ctx.arc(i.x,i.y,12,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
ctx.fillStyle='#fff';ctx.font='bold 10px Orbitron';ctx.textAlign='center';
ctx.fillText(i.type===0?'HP':i.type===1?'SPD':'DMG',i.x,i.y+4);
});
bullets.forEach(b=>{
ctx.fillStyle=b.owner==='enemy'?'#e74c3c':'#f1c40f';
ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
});
enemies.forEach(e=>{
ctx.save();ctx.translate(e.x,e.y);
drawEnemy(ctx,e.type,Math.atan2(players[myId].y-e.y,players[myId].x-e.x));
ctx.restore();
});
for(let id in players){
let p=players[id];
ctx.save();ctx.translate(p.x,p.y);
drawVehicle(ctx,id===myId?'#3498db':(vehicles[p.type]?vehicles[p.type].color:'#aaa'),p.angle);
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
for(let id in players){let p=players[id];miniCtx.fillStyle=id===myId?'#3498db':'#fff';miniCtx.fillRect(p.x*s,p.y*s,3,3);}
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