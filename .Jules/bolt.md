## 2024-05-23 - Spatial Partitioning for Collision Detection
**Learning:** In a circular map with negative coordinates, simple grid partitioning works if implemented with `Math.floor` correctly. Integrating a spatial grid reduced O(N) collision checks significantly.
**Action:** When working with 2D physics engines in JS, always check for spatial partitioning usage. If absent and entity count is high (>100), it's a prime optimization candidate.

## 2024-05-24 - Socket.io Room Lookup Optimization
**Learning:** Iterating through all game rooms to find a player's session is O(N) and scales poorly.
**Action:** Store `roomId` directly on `socket.data` (Socket.IO v4+) or `socket` object to enable O(1) access for high-frequency events like movement.

## 2024-05-25 - Euclidean Distance Overhead
**Learning:** `Math.hypot` and `Math.sqrt` are significantly slower (approx 8x in Node v20) than simple squared distance comparisons (`dx*dx + dy*dy`) for collision detection.
**Action:** In hot loops (game ticks, physics steps), always favor `distSq < radiusSq` over `Math.hypot(dx, dy) < radius`. Only calculate the root when the exact scalar distance is needed (e.g., normalization).
