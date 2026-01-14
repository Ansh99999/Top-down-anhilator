const express=require('express');const app=express();const http=require('http');const server=http.createServer(app);const {Server}=require("socket.io");const io=new Server(server);const path=require('path');
app.use(express.static(path.join(__dirname,'public')));
let players={};let bullets=[];let enemies=[];let obstacles=[];let items=[];let structures=[];
const MAP_SIZES={0:{w:4000,h:4000},1:{w:5000,h:3000},2:{w:3000,h:3000}}; // 0:Jungle, 1:River, 2:Mountain
let currentMap=0;
function generateObstacles(mapId){
obstacles=[];
let w=MAP_SIZES[mapId].w, h=MAP_SIZES[mapId].h;
let count=mapId===0?80:mapId===1?40:30;
for(let i=0;i<count;i++){obstacles.push({x:Math.random()*w,y:Math.random()*h,w:50+Math.random()*150,h:50+Math.random()*150});}
}
generateObstacles(0);
let wave=1;let lastEnemySpawn=0;let lastItemSpawn=0;let threat=0;
let adapt={speed:0,stat:0,kills:0};
io.on('connection',(socket)=>{
console.log('User connected:',socket.id);
socket.on('joinGame',(data)=>{
if(data.mapId!==undefined && data.mapId!==currentMap){currentMap=data.mapId;generateObstacles(currentMap);wave=1;enemies=[];items=[];structures=[];}
let stats=data.stats;
let fireRate=10;
if(data.type===0) fireRate=5;if(data.type===3 || data.type===5) fireRate=20;if(data.type===6) fireRate=8;
players[socket.id]={
id:socket.id,x:Math.random()*MAP_SIZES[currentMap].w,y:Math.random()*MAP_SIZES[currentMap].h,angle:0,turretAngle:0,
type:data.type,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,damage:stats.damage,
score:0,buffs:{speed:1,damage:1},isBot:false,
isShooting:false,fireCooldown:0,fireRate:fireRate
};
for(let i=0;i<data.allyCount;i++){
let allyId=`bot_${socket.id}_${i}`;
let rType=Math.floor(Math.random()*5);
players[allyId]={
id:allyId,owner:socket.id,x:players[socket.id].x+Math.random()*100-50,y:players[socket.id].y+Math.random()*100-50,
angle:0,turretAngle:0,type:rType,hp:100,maxHp:100,speed:4,damage:15,
score:0,buffs:{speed:1,damage:1},isBot:true,
isShooting:false,fireCooldown:0,fireRate:15
};
}
socket.emit('init',{id:socket.id,players,obstacles,map:MAP_SIZES[currentMap],wave,items,structures});
io.emit('updatePlayers',players);
});
socket.on('move',(data)=>{if(players[socket.id]){players[socket.id].x=data.x;players[socket.id].y=data.y;players[socket.id].angle=data.angle;}});
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
if(p.type===0){p.x+=Math.cos(p.angle)*200;p.y+=Math.sin(p.angle)*200;}
if(p.type===1){p.hp=Math.min(p.hp+30,p.maxHp);}
if(p.type===2){p.buffs.damage=2;setTimeout(()=>p.buffs.damage=1,3000);}
if(p.type===3){p.hp=Math.min(p.hp+50,p.maxHp*1.5);}
if(p.type===4){for(let i=0;i<10;i++){let a=Math.PI*2/10*i;bullets.push({id:Math.random(),owner:p.id,x:p.x,y:p.y,vx:Math.cos(a)*10,vy:Math.sin(a)*10,damage:p.damage*2,life:50});}}
if(p.type===5){p.hp=Math.min(p.hp+100,p.maxHp);threat+=5;}
if(p.type===6){p.speed=15;setTimeout(()=>p.speed=8,2000);}
if(p.type===7){structures.push({id:Math.random(),x:p.x,y:p.y,hp:100,owner:p.id,life:1000});}
}
setInterval(()=>{
let mapW=MAP_SIZES[currentMap].w, mapH=MAP_SIZES[currentMap].h;
let totalSpeed=0,count=0;
for(let id in players){if(!players[id].isBot){totalSpeed+=players[id].speed;count++;}}
if(count>0) adapt.speed=totalSpeed/count;
if(threat>0) threat-=0.05;
for(let id in players){
let p=players[id];
if(p.fireCooldown>0) p.fireCooldown--;
if(p.isShooting && p.fireCooldown<=0){
let dmg=p.damage*p.buffs.damage;
if(p.type===6) dmg+=p.speed;
bullets.push({id:Math.random(),owner:p.id,x:p.x,y:p.y,vx:Math.cos(p.turretAngle)*20,vy:Math.sin(p.turretAngle)*20,damage:dmg,life:100});
p.fireCooldown=p.fireRate;
}
}
structures.forEach(s=>{
s.life--;
if(s.life%30===0){
let target=null,minD=500;
enemies.forEach(e=>{let d=Math.hypot(e.x-s.x,e.y-s.y);if(d<minD){minD=d;target=e;}});
if(target){let a=Math.atan2(target.y-s.y,target.x-s.x);bullets.push({id:Math.random(),owner:s.owner,x:s.x,y:s.y,vx:Math.cos(a)*15,vy:Math.sin(a)*15,damage:10,life:60});}
}
});
structures=structures.filter(s=>s.life>0 && s.hp>0);
bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
bullets=bullets.filter(b=>b.life>0);
if(Date.now()-lastEnemySpawn>2000 && enemies.length<wave*10 + threat/5){
let r=Math.random();
let type=0;
if(adapt.speed>6 || threat>50) type=1;if(adapt.speed<3) type=0;if(Math.random()<0.3 + threat/200) type=2;
let ex=Math.random()*mapW;let ey=Math.random()*mapH;
enemies.push({id:Math.random(),x:ex,y:ey,type:type,hp:20+wave*5+threat,speed:type===0?5:type===1?3:4,state:'idle'});
lastEnemySpawn=Date.now();
}
if(Date.now()-lastItemSpawn>10000 && items.length<10){
items.push({x:Math.random()*mapW,y:Math.random()*mapH,type:Math.floor(Math.random()*3)});
lastItemSpawn=Date.now();
}
enemies.forEach(e=>{
let target=null;let minD=Infinity;
for(let id in players){let p=players[id];let d=Math.hypot(p.x-e.x,p.y-e.y);if(p.type===5)d/=2;if(d<minD){minD=d;target=p;}}
if(target && minD<1200){
if(e.type===0){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;}
else if(e.type===1){let angle=Math.atan2(target.y-e.y,target.x-e.x);if(minD>300){e.x+=Math.cos(angle)*e.speed;e.y+=Math.sin(angle)*e.speed;}if(Math.random()<0.03)bullets.push({id:Math.random(),owner:'enemy',x:e.x,y:e.y,vx:Math.cos(angle)*10,vy:Math.sin(angle)*10,damage:5+wave,life:100});}
else if(e.type===2){if(minD<300){let angle=Math.atan2(target.y-e.y,target.x-e.x);e.x+=Math.cos(angle)*e.speed*2;e.y+=Math.sin(angle)*e.speed*2;}}
}else{e.x+=Math.cos(e.id*100+Date.now()/1000)*2;e.y+=Math.sin(e.id*100+Date.now()/1000)*2;}
});
for(let id in players){
let bot=players[id];
if(bot.isBot){
// Bot Separation
for(let oid in players){
if(id!==oid && players[oid].isBot){
let dx=bot.x-players[oid].x;let dy=bot.y-players[oid].y;let d=Math.hypot(dx,dy);
if(d<50 && d>0){bot.x+=dx/d*2;bot.y+=dy/d*2;}
}
}
let owner=players[bot.owner];
if(!owner){delete players[id];continue;}
let dToOwner=Math.hypot(owner.x-bot.x,owner.y-bot.y);
if(dToOwner>200){let angle=Math.atan2(owner.y-bot.y,owner.x-bot.x);bot.x+=Math.cos(angle)*bot.speed;bot.y+=Math.sin(angle)*bot.speed;bot.angle=angle;}
let target=null;let minD=Infinity;
enemies.forEach(e=>{let d=Math.hypot(e.x-bot.x,e.y-bot.y);if(d<minD){minD=d;target=e;}});
if(target && minD<600){let angle=Math.atan2(target.y-bot.y,target.x-bot.x);bot.turretAngle=angle;bot.isShooting=true;}else bot.isShooting=false;
}
}
for(let i=bullets.length-1;i>=0;i--){
let b=bullets[i];
if(b.owner==='enemy'){
for(let id in players){
let p=players[id];
if(Math.hypot(b.x-p.x,b.y-p.y)<20){
p.hp-=b.damage;bullets.splice(i,1);
if(p.hp<=0){
if(p.isBot){io.to(p.owner).emit('notification',`Chassis ${p.id.split('_')[2]} has died!`);delete players[id];}
else{io.to(id).emit('gameOver',p.score);delete players[id];for(let pid in players){if(players[pid].owner===id)delete players[pid];}}
}break;
}
}
structures.forEach((s,idx)=>{if(Math.hypot(b.x-s.x,b.y-s.y)<30){s.hp-=b.damage;bullets.splice(i,1);if(s.hp<=0)structures.splice(idx,1);}});
}else{
for(let j=enemies.length-1;j>=0;j--){
let e=enemies[j];
if(Math.hypot(b.x-e.x,b.y-e.y)<20){
e.hp-=b.damage;bullets.splice(i,1);
if(e.hp<=0){
enemies.splice(j,1);let shooter=players[b.owner];if(shooter){shooter.score+=10;threat+=2;}
if(enemies.length===0){wave++;io.emit('wave',wave);}
}break;
}
}
}
}
for(let id in players){
let p=players[id];
enemies.forEach((e,idx)=>{let d=Math.hypot(p.x-e.x,p.y-e.y);if(d<30){p.hp-=1;if(p.type===6&&p.speed>10){e.hp-=50;if(e.hp<=0)enemies.splice(idx,1);}}});
for(let k=items.length-1;k>=0;k--){let it=items[k];if(Math.hypot(p.x-it.x,p.y-it.y)<30){if(it.type===0)p.hp=Math.min(p.hp+50,p.maxHp);if(it.type===1){p.buffs.speed=1.5;setTimeout(()=>p.buffs.speed=1,5000);}if(it.type===2){p.buffs.damage=1.5;setTimeout(()=>p.buffs.damage=1,5000);}items.splice(k,1);}}
}
io.emit('update',{players,bullets,enemies,items,wave,structures,threat});
},33); // 30 TPS
const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>{console.log(`Server running on port ${PORT}`);});