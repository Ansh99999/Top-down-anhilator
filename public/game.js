const socket=io();
const canvas=document.getElementById('gameCanvas');const ctx=canvas.getContext('2d');
const miniCanvas=document.getElementById('minimap');const miniCtx=miniCanvas.getContext('2d');
const menu=document.getElementById('menu');const gameUi=document.getElementById('game-ui');
const vehicleList=document.getElementById('vehicle-list');
let width,height;
function resize(){width=window.innerWidth;height=window.innerHeight;canvas.width=width;canvas.height=height;miniCanvas.width=150;miniCanvas.height=150;}
window.addEventListener('resize',resize);resize();
const vehicles=[
{name:'Speedie',stats:{hp:80,damage:10,speed:5},desc:'Fast but fragile.',color:'#0ff'},
{name:'Normal',stats:{hp:100,damage:15,speed:4},desc:'Balanced.',color:'#fff'},
{name:'Medium',stats:{hp:120,damage:20,speed:3},desc:'Tougher.',color:'#ff0'},
{name:'Heavy',stats:{hp:150,damage:25,speed:2},desc:'Tanky.',color:'#f00'},
{name:'Bomber',stats:{hp:90,damage:40,speed:3},desc:'High damage.',color:'#f0f'}
];
vehicles.forEach((v,i)=>{
const el=document.createElement('div');el.className='vehicle-card';
el.innerHTML=`<h3>${v.name}</h3><div style="width:30px;height:30px;background:${v.color};margin:0 auto;border-radius:50%"></div><p>${v.desc}</p><small>HP:${v.stats.hp} DMG:${v.stats.damage} SPD:${v.stats.speed}</small>`;
el.onclick=()=>startGame(i);
vehicleList.appendChild(el);
});
let myId=null;let players={};let bullets=[];let enemies=[];let obstacles=[];
let mapW=4000;let mapH=4000;
let camX=0;let camY=0;
let joystick={active:false,x:0,y:0,angle:0};
const joyEl=document.getElementById('joystick');const knobEl=document.getElementById('knob');
const joyRect=joyEl.getBoundingClientRect();const joyCX=joyRect.left+joyRect.width/2;const joyCY=joyRect.top+joyRect.height/2;const maxR=40;
joyEl.addEventListener('touchstart',e=>{joystick.active=true;updateJoy(e.touches[0]);});
joyEl.addEventListener('touchmove',e=>{if(joystick.active)updateJoy(e.touches[0]);});
joyEl.addEventListener('touchend',e=>{joystick.active=false;knobEl.style.transform=`translate(-50%,-50%)`;socket.emit('move',{x:players[myId].x,y:players[myId].y,angle:joystick.angle});});
function updateJoy(touch){
let dx=touch.clientX-joyCX;let dy=touch.clientY-joyCY;
let dist=Math.hypot(dx,dy);
let angle=Math.atan2(dy,dx);joystick.angle=angle;
if(dist>maxR){dx=Math.cos(angle)*maxR;dy=Math.sin(angle)*maxR;}
knobEl.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
document.getElementById('shoot-btn').addEventListener('touchstart',()=>socket.emit('shoot',{}));
document.addEventListener('keydown',e=>{if(e.code==='Space')socket.emit('shoot',{});});
let keys={};
document.addEventListener('keydown',e=>keys[e.key]=true);
document.addEventListener('keyup',e=>keys[e.key]=false);
function startGame(idx){
menu.style.display='none';gameUi.style.display='block';
socket.emit('joinGame',{type:idx,stats:vehicles[idx].stats});
}
socket.on('init',data=>{myId=data.id;players=data.players;obstacles=data.obstacles;mapW=data.map.w;mapH=data.map.h;});
socket.on('updatePlayers',p=>players=p);
socket.on('update',data=>{players=data.players;bullets=data.bullets;enemies=data.enemies;
document.getElementById('wave-val').innerText=data.wave;
if(players[myId]){
document.getElementById('hp-val').innerText=Math.floor(players[myId].hp);
document.getElementById('score-val').innerText=players[myId].score;
}
});
socket.on('gameOver',score=>{alert('Game Over! Score: '+score);location.reload();});
function draw(){
ctx.fillStyle='#111';ctx.fillRect(0,0,width,height);
if(!myId || !players[myId])return requestAnimationFrame(draw);
let me=players[myId];
camX=me.x-width/2;camY=me.y-height/2;
camX=Math.max(0,Math.min(camX,mapW-width));camY=Math.max(0,Math.min(camY,mapH-height));
ctx.save();ctx.translate(-camX,-camY);
ctx.strokeStyle='#333';ctx.lineWidth=5;ctx.strokeRect(0,0,mapW,mapH);
ctx.fillStyle='#444';obstacles.forEach(o=>ctx.fillRect(o.x,o.y,o.w,o.h));
bullets.forEach(b=>{ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();});
enemies.forEach(e=>{
ctx.save();ctx.translate(e.x,e.y);
ctx.fillStyle=e.type===0?'#f00':e.type===1?'#0f0':'#00f';
ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-10,10);ctx.lineTo(-10,-10);ctx.fill();
ctx.restore();
});
for(let id in players){
let p=players[id];
ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
ctx.fillStyle=id===myId?'#fff':(vehicles[p.type]?vehicles[p.type].color:'#aaa');
ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-15,15);ctx.lineTo(-15,-15);ctx.fill();
ctx.restore();
ctx.fillStyle='#fff';ctx.font='12px Arial';ctx.fillText(`HP:${Math.floor(p.hp)}`,p.x-20,p.y-30);
}
ctx.restore();
miniCtx.clearRect(0,0,150,150);
miniCtx.fillStyle='#000';miniCtx.fillRect(0,0,150,150);
let s=150/Math.max(mapW,mapH);
miniCtx.fillStyle='#444';obstacles.forEach(o=>miniCtx.fillRect(o.x*s,o.y*s,o.w*s,o.h*s));
miniCtx.fillStyle='#f00';enemies.forEach(e=>miniCtx.fillRect(e.x*s,e.y*s,2,2));
for(let id in players){let p=players[id];miniCtx.fillStyle=id===myId?'#0f0':'#fff';miniCtx.fillRect(p.x*s,p.y*s,3,3);}
if(joystick.active){
let spd=me.speed;
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
let spd=me.speed;
let nx=me.x+Math.cos(angle)*spd;let ny=me.y+Math.sin(angle)*spd;
if(nx>0 && nx<mapW && ny>0 && ny<mapH){
let collide=obstacles.some(o=>nx>o.x-20 && nx<o.x+o.w+20 && ny>o.y-20 && ny<o.y+o.h+20);
if(!collide){socket.emit('move',{x:nx,y:ny,angle:angle});me.x=nx;me.y=ny;me.angle=angle;}
}
}
requestAnimationFrame(draw);
}
requestAnimationFrame(draw);