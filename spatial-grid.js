class SpatialGrid{
constructor(w,h,cellSize){
this.width=w;this.height=h;this.cellSize=cellSize;
this.grid=new Map();
this.cols=Math.ceil(w/cellSize);
this.rows=Math.ceil(h/cellSize);
}
clear(){this.grid.clear();}
insert(o){
let x=Math.floor(o.x/this.cellSize);
let y=Math.floor(o.y/this.cellSize);
let key=`${x},${y}`;
if(!this.grid.has(key))this.grid.set(key,[]);
this.grid.get(key).push(o);
}
query(x,y,w,h){
let result=[];
let startX=Math.floor(x/this.cellSize);
let startY=Math.floor(y/this.cellSize);
let endX=Math.floor((x+w)/this.cellSize);
let endY=Math.floor((y+h)/this.cellSize);
for(let i=startX;i<=endX;i++){
for(let j=startY;j<=endY;j++){
let key=`${i},${j}`;
if(this.grid.has(key)){result.push(...this.grid.get(key));}
}
}
return result;
}
}
module.exports=SpatialGrid;
