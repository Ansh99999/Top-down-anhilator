
const ITERATIONS = 10000000;

console.log(`Benchmarking ${ITERATIONS} iterations...`);

// Data setup
const x1 = 100, y1 = 100;
const x2 = 250, y2 = 250;
const threshold = 200;
const thresholdSq = threshold * threshold;

// 1. Math.hypot
const startHypot = process.hrtime();
let hitsHypot = 0;
for (let i = 0; i < ITERATIONS; i++) {
    if (Math.hypot(x2 - x1, y2 - y1) < threshold) {
        hitsHypot++;
    }
}
const endHypot = process.hrtime(startHypot);
const timeHypot = endHypot[0] * 1000 + endHypot[1] / 1e6;
console.log(`Math.hypot: ${timeHypot.toFixed(2)}ms`);

// 2. Squared Distance
const startSq = process.hrtime();
let hitsSq = 0;
for (let i = 0; i < ITERATIONS; i++) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx * dx + dy * dy < thresholdSq) {
        hitsSq++;
    }
}
const endSq = process.hrtime(startSq);
const timeSq = endSq[0] * 1000 + endSq[1] / 1e6;
console.log(`Squared Distance: ${timeSq.toFixed(2)}ms`);

console.log(`Speedup: ${(timeHypot / timeSq).toFixed(2)}x`);
