## 2024-05-23 - Spatial Partitioning for Collision Detection
**Learning:** In a circular map with negative coordinates, simple grid partitioning works if implemented with `Math.floor` correctly. Integrating a spatial grid reduced O(N) collision checks significantly.
**Action:** When working with 2D physics engines in JS, always check for spatial partitioning usage. If absent and entity count is high (>100), it's a prime optimization candidate.

## 2024-05-24 - Socket.io Room Lookup Optimization
**Learning:** Iterating through all game rooms to find a player's session is O(N) and scales poorly.
**Action:** Store `roomId` directly on `socket.data` (Socket.IO v4+) or `socket` object to enable O(1) access for high-frequency events like movement.

## 2024-10-27 - Math.hypot Performance Optimization
**Learning:** `Math.hypot(dx, dy)` is significantly slower (~30-60x) than `Math.sqrt(dx*dx + dy*dy)` or squared distance comparisons `(dx*dx + dy*dy < r*r)` in Node.js environments.
**Action:** Replace `Math.hypot` with squared distance comparisons for collision checks, AI targeting, and range queries in high-frequency loops. Use `Math.sqrt(sqDist)` only when the actual scalar value is strictly needed.
