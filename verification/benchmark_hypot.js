
const ITERATIONS = 10_000_000;

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

// Random coordinates
const x1 = Math.random() * 1000;
const y1 = Math.random() * 1000;
const x2 = Math.random() * 1000;
const y2 = Math.random() * 1000;
const dx = x2 - x1;
const dy = y2 - y1;

// 1. Math.hypot
const startHypot = process.hrtime.bigint();
let sumHypot = 0;
for (let i = 0; i < ITERATIONS; i++) {
    sumHypot += Math.hypot(dx, dy);
}
const endHypot = process.hrtime.bigint();

// 2. Squared Distance (Manual)
const startSq = process.hrtime.bigint();
let sumSq = 0;
for (let i = 0; i < ITERATIONS; i++) {
    sumSq += (dx * dx + dy * dy);
}
const endSq = process.hrtime.bigint();

// 3. Squared Distance with Math.sqrt (to get actual distance)
const startSqrt = process.hrtime.bigint();
let sumSqrt = 0;
for (let i = 0; i < ITERATIONS; i++) {
    sumSqrt += Math.sqrt(dx * dx + dy * dy);
}
const endSqrt = process.hrtime.bigint();

const timeHypot = Number(endHypot - startHypot) / 1e6; // ms
const timeSq = Number(endSq - startSq) / 1e6; // ms
const timeSqrt = Number(endSqrt - startSqrt) / 1e6; // ms

console.log(`Math.hypot: ${timeHypot.toFixed(2)}ms`);
console.log(`dx*dx + dy*dy: ${timeSq.toFixed(2)}ms`);
console.log(`Math.sqrt(dx*dx + dy*dy): ${timeSqrt.toFixed(2)}ms`);

console.log(`\nSpeedup (Sq vs Hypot): ${(timeHypot / timeSq).toFixed(2)}x`);
console.log(`Speedup (Sqrt vs Hypot): ${(timeHypot / timeSqrt).toFixed(2)}x`);

/*
RESULTS (Node v22.21.1):
Running benchmark with 10000000 iterations...
Math.hypot: 711.94ms
dx*dx + dy*dy: 20.47ms
Math.sqrt(dx*dx + dy*dy): 18.95ms

Speedup (Sq vs Hypot): 34.78x
Speedup (Sqrt vs Hypot): 37.58x
*/
