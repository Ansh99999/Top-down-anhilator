const express=require('express');const app=express();const http=require('http');const server=http.createServer(app);const {Server}=require("socket.io");const io=new Server(server);const path=require('path');
const SpatialGrid=require('./spatial-grid');
app.use(express.static(path.join(__dirname,'public')));
let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];
const MAP_WIDTH=4000;const MAP_HEIGHT=4000;
const grid=new SpatialGrid(MAP_WIDTH,MAP_HEIGHT,200);
function generateObstacles(){for(let i=0;i<50;i++){obstacles.push({x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,w:50+Math.random()*100,h:50+Math.random()*100});}}
generateObstacles();
let wave=1;let lastEnemySpawn=0;let lastItemSpawn=0;
io.on('connection',(socket)=>{
console.log('User connected:',socket.id);
socket.on('joinGame',(data)=>{
players[socket.id]={id:socket.id,x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,angle:0,type:data.type,hp:data.stats.hp,maxHp:data.stats.hp,speed:data.stats.speed,damage:data.stats.damage,score:0,buffs:{speed:1,damage:1}};
socket.emit('init',{id:socket.id,players,obstacles,map:{w:MAP_WIDTH,h:MAP_HEIGHT},wave,items});
io.emit('updatePlayers',players);
});
socket.on('move',(data)=>{if(players[socket.id]){players[socket.id].x=data.x;players[socket.id].y=data.y;players[socket.id].angle=data.angle;}});
socket.on('shoot',(data)=>{if(players[socket.id]){
let p=players[socket.id];
let dmg=p.damage*p.buffs.damage;
bullets.push({id:Math.random(),owner:socket.id,x:p.x,y:p.y,vx:Math.cos(p.angle)*20,vy:Math.sin(p.angle)*20,damage:dmg,life:100});
}});
socket.on('ability',()=>{if(players[socket.id])useAbility(players[socket.id]);});
socket.on('disconnect',()=>{console.log('User disconnected:',socket.id);delete players[socket.id];io.emit('updatePlayers',players);});
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
grid.clear();
Object.values(players).forEach(p=>grid.insert(p));
enemies.forEach(e=>grid.insert(e));
bullets.forEach(b=>grid.insert(b));
items.forEach(i=>grid.insert(i));
bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
bullets=bullets.filter(b=>b.life>0);
if(Date.now()-lastEnemySpawn>2000&&enemies.length<wave*10){
let type=Math.floor(Math.random()*3);
let ex=Math.random()*MAP_WIDTH;let ey=Math.random()*MAP_HEIGHT;
enemies.push({id:Math.random(),x:ex,y:ey,type:type,hp:20+wave*5,speed:type===0?5:type===1?3:4,state:'idle'});
lastEnemySpawn=Date.now();
}
if(Date.now()-lastItemSpawn>10000&&items.length<10){
items.push({id:Math.random(),x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,type:Math.floor(Math.random()*3)});
lastItemSpawn=Date.now();
}
enemies.forEach(e=>{
let target=null;let minD=Infinity;
let nearby=grid.query(e.x-1000,e.y-1000,2000,2000);
for(const o of nearby){
if(o.maxHp!==undefined){
let d=Math.hypot(o.x-e.x,o.y-e.y);
if(d<minD){minD=d;target=o;}
}
}
if(target){
if(e.type===0){if(minD<1000){let a=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(a)*e.speed;e.y+=Math.sin(a)*e.speed;}}
else if(e.type===1){if(minD<600&&minD>300){let a=Math.atan2(target.y-e.y,target.x-e.x);if(Math.random()<0.02)bullets.push({id:Math.random(),owner:'enemy',x:e.x,y:e.y,vx:Math.cos(a)*10,vy:Math.sin(a)*10,damage:5+wave,life:100});}else if(minD>600){let a=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(a)*e.speed;e.y+=Math.sin(a)*e.speed;}}
else if(e.type===2){if(minD<200){let a=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(a)*e.speed*2;e.y+=Math.sin(a)*e.speed*2;}}
}
});
let bulletsToRemove=new Set();
let enemiesToRemove=new Set();
let itemsToRemove=new Set();
for(let i=bullets.length-1;i>=0;i--){
let b=bullets[i];
if(bulletsToRemove.has(b.id))continue;
let nearby=grid.query(b.x-20,b.y-20,40,40);
if(b.owner==='enemy'){
for(const o of nearby){
if(o.maxHp!==undefined){
if(Math.hypot(b.x-o.x,b.y-o.y)<20){
o.hp-=b.damage;bulletsToRemove.add(b.id);
if(o.hp<=0){io.to(o.id).emit('gameOver',o.score);delete players[o.id];}
break;
}
}
}
}else{
for(const o of nearby){
if(o.hp!==undefined&&o.maxHp===undefined){
if(Math.hypot(b.x-o.x,b.y-o.y)<20){
o.hp-=b.damage;bulletsToRemove.add(b.id);
if(o.hp<=0){
enemiesToRemove.add(o.id);
if(players[b.owner])players[b.owner].score+=10;
if(enemies.length-enemiesToRemove.size===0){wave++;io.emit('wave',wave);}
}
break;
}
}
}
}
}
for(let id in players){
let p=players[id];
if(!p)continue;
let nearby=grid.query(p.x-30,p.y-30,60,60);
for(const o of nearby){
if(o.hp!==undefined&&o.maxHp===undefined&&!enemiesToRemove.has(o.id)){
if(Math.hypot(p.x-o.x,p.y-o.y)<30){
p.hp-=1;
if(p.hp<=0){io.to(id).emit('gameOver',p.score);delete players[id];break;}
}
}else if(o.type!==undefined&&o.hp===undefined&&!itemsToRemove.has(o.id)){
if(Math.hypot(p.x-o.x,p.y-o.y)<30){
if(o.type===0)p.hp=Math.min(p.hp+50,p.maxHp);
if(o.type===1){p.buffs.speed=1.5;setTimeout(()=>p.buffs.speed=1,5000);}
if(o.type===2){p.buffs.damage=1.5;setTimeout(()=>p.buffs.damage=1,5000);}
itemsToRemove.add(o.id);
}
}
}
if(p.hp<=0)continue;
}
bullets=bullets.filter(b=>!bulletsToRemove.has(b.id));
enemies=enemies.filter(e=>!enemiesToRemove.has(e.id));
items=items.filter(i=>!itemsToRemove.has(i.id));
io.emit('update',{players,bullets,enemies,items,wave});
},1000/60);
const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>{console.log(`Server running on port ${PORT}`);});