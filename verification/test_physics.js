
const { GameInstance } = require('../server');

// Mock socket for addPlayer
const mockSocket = { id: 'test_player', join: () => {}, emit: () => {}, data: {} };

// Setup
const game = new GameInstance('test_room', 'test_player', { mapId: 3 }); // Arena (Open)
game.addPlayer(mockSocket, { type: 0, stats: { hp: 100, speed: 10, damage: 10 }, allyCount: 0 });
const p = game.players['test_player'];

// 1. Test Map Boundary Clamping
console.log('Testing Map Boundary Clamping...');
p.x = 3000; // Way outside (Map 3 R=2200)
p.y = 0;
game.resolveCollision(p, 20); // Radius 20

// Expected: clamped to 2200 - 20 = 2180
const expectedX = 2180;
const diff = Math.abs(p.x - expectedX);
if (diff < 0.1) {
    console.log('PASS: Player clamped to map boundary correctly.');
} else {
    console.error(`FAIL: Player not clamped correctly. x=${p.x}, expected=${expectedX}`);
    process.exit(1);
}

// 2. Test Obstacle Collision (Non-zero overlap)
console.log('Testing Obstacle Collision (Standard Overlap)...');
// Add a test obstacle manually
const obs = { x: 500, y: 500, r: 50 };
game.obstacleGrid.clear();
game.obstacleGrid.insert(obs);

// Place player partially inside obstacle
// Center dist 50. (Touch point would be dist 70).
p.x = 550; // 50 units right of center
p.y = 500;
// Resolve
game.resolveCollision(p, 20); // Player R=20. MinDist = 70.
// Current Dist = 50.
// Push = 70 - 50 = 20.
// Direction (1, 0).
// New Pos = 550 + 20 = 570.
// Expected Dist = 70.

const distSq = (p.x - 500)**2 + (p.y - 500)**2;
const dist = Math.sqrt(distSq);

if (Math.abs(dist - 70) < 0.1) {
    console.log(`PASS: Player pushed out of obstacle correctly. Dist=${dist}`);
} else {
    console.error(`FAIL: Player collision resolution failed. Dist=${dist}, expected=70`);
    process.exit(1);
}

console.log('All Physics Verification Passed.');
process.exit(0);
