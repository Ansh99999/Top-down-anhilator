const express=require('express');const app=express();const http=require('http');const server=http.createServer(app);const {Server}=require("socket.io");const io=new Server(server);const path=require('path');
app.use(express.static(path.join(__dirname,'public')));
let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];
const MAP_WIDTH=4000;const MAP_HEIGHT=4000;
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
if(p.type===0){p.x+=Math.cos(p.angle)*200;p.y+=Math.sin(p.angle)*200;} // Speedie: Dash
if(p.type===1){p.hp=Math.min(p.hp+30,p.maxHp);} // Normal: Heal
if(p.type===2){p.buffs.damage=2;setTimeout(()=>p.buffs.damage=1,3000);} // Medium: Dmg Boost
if(p.type===3){p.hp=Math.min(p.hp+50,p.maxHp*1.5);} // Heavy: Overheal
if(p.type===4){ // Bomber: Blast
for(let i=0;i<10;i++){let a=Math.PI*2/10*i;bullets.push({id:Math.random(),owner:p.id,x:p.x,y:p.y,vx:Math.cos(a)*10,vy:Math.sin(a)*10,damage:p.damage*2,life:50});}
}
}
setInterval(()=>{
bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
bullets=bullets.filter(b=>b.life>0);
if(Date.now()-lastEnemySpawn>2000 && enemies.length<wave*10){
let type=Math.floor(Math.random()*3); // 0:Rusher, 1:Shooter, 2:Ambusher
let ex=Math.random()*MAP_WIDTH;let ey=Math.random()*MAP_HEIGHT;
enemies.push({id:Math.random(),x:ex,y:ey,type:type,hp:20+wave*5,speed:type===0?5:type===1?3:4,state:'idle'});
lastEnemySpawn=Date.now();
}
if(Date.now()-lastItemSpawn>10000 && items.length<10){
items.push({x:Math.random()*MAP_WIDTH,y:Math.random()*MAP_HEIGHT,type:Math.floor(Math.random()*3)}); // 0:HP, 1:Speed, 2:Dmg
lastItemSpawn=Date.now();
}
enemies.forEach(e=>{
let target=null;let minDSq=Infinity;
for(let id in players){let p=players[id];let dx=p.x-e.x;let dy=p.y-e.y;let dSq=dx*dx+dy*dy;if(dSq<minDSq){minDSq=dSq;target=p;}}
if(target){
if(e.type===0){ // Rusher
if(minDSq<1000000){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;}
}else if(e.type===1){ // Shooter
if(minDSq<360000 && minDSq>90000){let angle=Math.atan2(target.y-e.y,target.x-e.x);if(Math.random()<0.02)bullets.push({id:Math.random(),owner:'enemy',x:e.x,y:e.y,vx:Math.cos(angle)*10,vy:Math.sin(angle)*10,damage:5+wave,life:100});}
else if(minDSq>360000){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;}
}else if(e.type===2){ // Ambusher
if(minDSq<40000){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed*2;e.y+=Math.sin(angle)*e.speed*2;} // Rush when close
}
}
});
for(let i=bullets.length-1;i>=0;i--){
let b=bullets[i];
if(b.owner==='enemy'){
for(let id in players){
let p=players[id];
let dx=b.x-p.x;let dy=b.y-p.y;
if(dx*dx+dy*dy<400){p.hp-=b.damage;bullets.splice(i,1);if(p.hp<=0){io.to(id).emit('gameOver',p.score);delete players[id];}break;}
}
}else{
for(let j=enemies.length-1;j>=0;j--){
let e=enemies[j];
let dx=b.x-e.x;let dy=b.y-e.y;
if(dx*dx+dy*dy<400){
e.hp-=b.damage;bullets.splice(i,1);
if(e.hp<=0){
enemies.splice(j,1);if(players[b.owner])players[b.owner].score+=10;
if(enemies.length===0){wave++;io.emit('wave',wave);}
}
break;
}
}
}
}
for(let id in players){
let p=players[id];
enemies.forEach(e=>{let dx=p.x-e.x;let dy=p.y-e.y;if(dx*dx+dy*dy<900){p.hp-=1;if(p.hp<=0){io.to(id).emit('gameOver',p.score);delete players[id];}}});
for(let k=items.length-1;k>=0;k--){
let it=items[k];
let dx=p.x-it.x;let dy=p.y-it.y;
if(dx*dx+dy*dy<900){
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