## 2024-05-23 - Spatial Partitioning for Collision Detection
**Learning:** In a circular map with negative coordinates, simple grid partitioning works if implemented with `Math.floor` correctly. Integrating a spatial grid reduced O(N) collision checks significantly.
**Action:** When working with 2D physics engines in JS, always check for spatial partitioning usage. If absent and entity count is high (>100), it's a prime optimization candidate.

## 2024-05-24 - Socket.io Room Lookup Optimization
**Learning:** Iterating through all game rooms to find a player's session is O(N) and scales poorly.
**Action:** Store `roomId` directly on `socket.data` (Socket.IO v4+) or `socket` object to enable O(1) access for high-frequency events like movement.

## 2024-05-25 - Math.hypot vs Squared Distance
**Learning:** `Math.hypot` is significantly slower (~9x) than manual squared distance calculations (`x*x + y*y`) in Node.js 22. Even `Math.sqrt(x*x + y*y)` is ~20x faster than `Math.hypot` for 2 arguments.
**Action:** In hot paths like collision detection loops, avoid `Math.hypot`. Use squared distance comparisons for thresholds (`distSq < r*r`) and explicit `Math.sqrt` when the actual value is needed.
