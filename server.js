const express=require('express');const app=express();const http=require('http');const server=http.createServer(app);const {Server}=require("socket.io");const io=new Server(server);const path=require('path');
app.use(express.static(path.join(__dirname,'public')));
let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];
const MAP_WIDTH=4000;const MAP_HEIGHT=4000;
function generateObstacles(){for(let i=0;i<50;i++){obstacles.push({x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,w:50+Math.random()*100,h:50+Math.random()*100});}}
generateObstacles();
let wave=1;
let lastEnemySpawn=0;
io.on('connection',(socket)=>{
console.log('User connected:',socket.id);
socket.on('joinGame',(data)=>{
players[socket.id]={id:socket.id,x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,angle:0,type:data.type,hp:data.stats.hp,maxHp:data.stats.hp,speed:data.stats.speed,damage:data.stats.damage,score:0};
socket.emit('init',{id:socket.id,players,obstacles,map:{w:MAP_WIDTH,h:MAP_HEIGHT},wave});
io.emit('updatePlayers',players);
});
socket.on('move',(data)=>{if(players[socket.id]){players[socket.id].x=data.x;players[socket.id].y=data.y;players[socket.id].angle=data.angle;}});
socket.on('shoot',(data)=>{if(players[socket.id]){
let p=players[socket.id];
bullets.push({id:Math.random(),owner:socket.id,x:p.x,y:p.y,vx:Math.cos(p.angle)*20,vy:Math.sin(p.angle)*20,damage:p.damage,life:100});
}});
socket.on('disconnect',()=>{console.log('User disconnected:',socket.id);delete players[socket.id];io.emit('updatePlayers',players);});
});
setInterval(()=>{
bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
bullets=bullets.filter(b=>b.life>0);
if(Date.now()-lastEnemySpawn>2000 && enemies.length<wave*5){
let type=Math.floor(Math.random()*Math.min(wave,3));
let ex=Math.random()*MAP_WIDTH;let ey=Math.random()*MAP_HEIGHT;
enemies.push({id:Math.random(),x:ex,y:ey,type:type,hp:20+type*10,speed:2+type});
lastEnemySpawn=Date.now();
}
enemies.forEach(e=>{
let target=null;let minD=Infinity;
for(let id in players){let p=players[id];let d=Math.hypot(p.x-e.x,p.y-e.y);if(d<minD){minD=d;target=p;}}
if(target && minD<1000){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;}
});
for(let i=bullets.length-1;i>=0;i--){
let b=bullets[i];
for(let j=enemies.length-1;j>=0;j--){
let e=enemies[j];
if(Math.hypot(b.x-e.x,b.y-e.y)<20){
e.hp-=b.damage;
bullets.splice(i,1);
if(e.hp<=0){
enemies.splice(j,1);
if(players[b.owner])players[b.owner].score+=10;
if(enemies.length===0){wave++;io.emit('wave',wave);}
}
break;
}
}
}
for(let id in players){
let p=players[id];
enemies.forEach(e=>{if(Math.hypot(p.x-e.x,p.y-e.y)<30){p.hp-=1;if(p.hp<=0){io.to(id).emit('gameOver',p.score);delete players[id];}}});
}
io.emit('update',{players,bullets,enemies,wave});
},1000/60);
const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>{console.log(`Server running on port ${PORT}`);});