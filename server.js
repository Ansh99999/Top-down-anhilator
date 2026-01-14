const express=require('express');const app=express();const http=require('http');const server=http.createServer(app);const {Server}=require("socket.io");const io=new Server(server);const path=require('path');
app.use(express.static(path.join(__dirname,'public')));
let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let notifications=[];
const MAP_WIDTH=4000;const MAP_HEIGHT=4000;
function generateObstacles(){for(let i=0;i<50;i++){obstacles.push({x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,w:50+Math.random()*100,h:50+Math.random()*100});}}
generateObstacles();
let wave=1;let lastEnemySpawn=0;let lastItemSpawn=0;
io.on('connection',(socket)=>{
console.log('User connected:',socket.id);
socket.on('joinGame',(data)=>{
let stats=data.stats;
players[socket.id]={id:socket.id,x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,angle:0,turretAngle:0,type:data.type,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,damage:stats.damage,score:0,buffs:{speed:1,damage:1},isBot:false};
// AI Allies
for(let i=0;i<data.allyCount;i++){
let allyId=`bot_${socket.id}_${i}`;
let rType=Math.floor(Math.random()*5); // Random vehicle for bot
players[allyId]={id:allyId,owner:socket.id,x:players[socket.id].x+Math.random()*100-50,y:players[socket.id].y+Math.random()*100-50,angle:0,turretAngle:0,type:rType,hp:100,maxHp:100,speed:4,damage:15,score:0,buffs:{speed:1,damage:1},isBot:true};
}
socket.emit('init',{id:socket.id,players,obstacles,map:{w:MAP_WIDTH,h:MAP_HEIGHT},wave,items});
io.emit('updatePlayers',players);
});
socket.on('move',(data)=>{
if(players[socket.id]){players[socket.id].x=data.x;players[socket.id].y=data.y;players[socket.id].angle=data.angle;}
});
socket.on('shootInput',(data)=>{
if(players[socket.id]){
players[socket.id].turretAngle=data.angle;
if(data.active){
let p=players[socket.id];
let dmg=p.damage*p.buffs.damage;
bullets.push({id:Math.random(),owner:socket.id,x:p.x,y:p.y,vx:Math.cos(p.turretAngle)*20,vy:Math.sin(p.turretAngle)*20,damage:dmg,life:100});
}
}
});
socket.on('ability',()=>{if(players[socket.id])useAbility(players[socket.id]);});
socket.on('disconnect',()=>{
console.log('User disconnected:',socket.id);
// Remove player and their bots
delete players[socket.id];
for(let id in players){if(players[id].isBot && players[id].owner===socket.id)delete players[id];}
io.emit('updatePlayers',players);
});
});
function useAbility(p){
if(p.type===0){p.x+=Math.cos(p.angle)*200;p.y+=Math.sin(p.angle)*200;}
if(p.type===1){p.hp=Math.min(p.hp+30,p.maxHp);}
if(p.type===2){p.buffs.damage=2;setTimeout(()=>p.buffs.damage=1,3000);}
if(p.type===3){p.hp=Math.min(p.hp+50,p.maxHp*1.5);}
if(p.type===4){
for(let i=0;i<10;i++){let a=Math.PI*2/10*i;bullets.push({id:Math.random(),owner:p.id,x:p.x,y:p.y,vx:Math.cos(a)*10,vy:Math.sin(a)*10,damage:p.damage*2,life:50});}
}
}
setInterval(()=>{
bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
bullets=bullets.filter(b=>b.life>0);
// Enemy Spawning
if(Date.now()-lastEnemySpawn>2000 && enemies.length<wave*10){
let type=Math.floor(Math.random()*3);
let ex=Math.random()*MAP_WIDTH;let ey=Math.random()*MAP_HEIGHT;
enemies.push({id:Math.random(),x:ex,y:ey,type:type,hp:20+wave*5,speed:type===0?5:type===1?3:4,state:'idle'});
lastEnemySpawn=Date.now();
}
if(Date.now()-lastItemSpawn>10000 && items.length<10){
items.push({x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,type:Math.floor(Math.random()*3)});
lastItemSpawn=Date.now();
}
// AI Logic (Bots & Enemies)
enemies.forEach(e=>{
let target=null;let minD=Infinity;
// Find nearest player (or bot)
for(let id in players){let p=players[id];let d=Math.hypot(p.x-e.x,p.y-e.y);if(d<minD){minD=d;target=p;}}
if(target && minD<1200){
if(e.type===0){ // Rusher
let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;
}else if(e.type===1){ // Shooter
let angle=Math.atan2(target.y-e.y,target.x-e.x);
if(minD>300){e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;}
if(Math.random()<0.03)bullets.push({id:Math.random(),owner:'enemy',x:e.x,y:e.y,vx:Math.cos(angle)*10,vy:Math.sin(angle)*10,damage:5+wave,life:100});
}else if(e.type===2){ // Ambusher
if(minD<300){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed*2;e.y+=Math.sin(angle)*e.speed*2;}
}
} else {
// Flocking/Patrol when idle
e.x+=Math.cos(e.id*100+Date.now()/1000)*2;e.y+=Math.sin(e.id*100+Date.now()/1000)*2;
}
});
// Bot AI
for(let id in players){
let bot=players[id];
if(bot.isBot){
let owner=players[bot.owner];
if(!owner){ // Owner left
delete players[id];continue;
}
// Follow owner
let dToOwner=Math.hypot(owner.x-bot.x,owner.y-bot.y);
if(dToOwner>200){
let angle=Math.atan2(owner.y-bot.y,owner.x-bot.x);
bot.x+=Math.cos(angle)*bot.speed;bot.y+=Math.sin(angle)*bot.speed;bot.angle=angle;
}
// Attack enemies
let target=null;let minD=Infinity;
enemies.forEach(e=>{let d=Math.hypot(e.x-bot.x,e.y-bot.y);if(d<minD){minD=d;target=e;}});
if(target && minD<600){
let angle=Math.atan2(target.y-bot.y,target.x-bot.x);
bot.turretAngle=angle;
if(Math.random()<0.05)bullets.push({id:Math.random(),owner:bot.id,x:bot.x,y:bot.y,vx:Math.cos(angle)*20,vy:Math.sin(angle)*20,damage:bot.damage,life:100});
}
}
}
// Collisions
for(let i=bullets.length-1;i>=0;i--){
let b=bullets[i];
if(b.owner==='enemy'){
for(let id in players){
let p=players[id];
if(Math.hypot(b.x-p.x,b.y-p.y)<20){
p.hp-=b.damage;bullets.splice(i,1);
if(p.hp<=0){
if(p.isBot){
io.to(p.owner).emit('notification',`Chassis ${p.id.split('_')[2]} has died!`);
delete players[id];
}else{
io.to(id).emit('gameOver',p.score);delete players[id];
// remove bots owned by this player
for(let pid in players){if(players[pid].owner===id)delete players[pid];}
}
}
break;
}
}
}else{
for(let j=enemies.length-1;j>=0;j--){
let e=enemies[j];
if(Math.hypot(b.x-e.x,b.y-e.y)<20){
e.hp-=b.damage;bullets.splice(i,1);
if(e.hp<=0){
enemies.splice(j,1);
let shooter=players[b.owner];if(shooter)shooter.score+=10;
if(enemies.length===0){wave++;io.emit('wave',wave);}
}
break;
}
}
}
}
for(let id in players){
let p=players[id];
enemies.forEach(e=>{if(Math.hypot(p.x-e.x,p.y-e.y)<30){p.hp-=1;}});
for(let k=items.length-1;k>=0;k--){
let it=items[k];
if(Math.hypot(p.x-it.x,p.y-it.y)<30){
if(it.type===0)p.hp=Math.min(p.hp+50,p.maxHp);
if(it.type===1){p.buffs.speed=1.5;setTimeout(()=>p.buffs.speed=1,5000);}
if(it.type===2){p.buffs.damage=1.5;setTimeout(()=>p.buffs.damage=1,5000);}
items.splice(k,1);
}
}
}
io.emit('update',{players,bullets,enemies,items,wave});
},1000/60);
const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>{console.log(`Server running on port ${PORT}`);});