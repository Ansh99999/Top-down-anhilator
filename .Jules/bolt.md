## 2024-05-23 - Spatial Partitioning for Collision Detection
**Learning:** In a circular map with negative coordinates, simple grid partitioning works if implemented with `Math.floor` correctly. Integrating a spatial grid reduced O(N) collision checks significantly.
**Action:** When working with 2D physics engines in JS, always check for spatial partitioning usage. If absent and entity count is high (>100), it's a prime optimization candidate.

## 2024-05-24 - Socket.io Room Lookup Optimization
**Learning:** Iterating through all game rooms to find a player's session is O(N) and scales poorly.
**Action:** Store `roomId` directly on `socket.data` (Socket.IO v4+) or `socket` object to enable O(1) access for high-frequency events like movement.

## 2024-05-27 - Math.hypot Performance in Hot Loops
**Learning:** `Math.hypot` is significantly slower (approx 9x) than manual squared distance comparisons (`dx*dx + dy*dy`) in V8/Node.js, and somewhat slower than manual `Math.sqrt`. In hot loops (server tick ~30Hz with many entities), this adds up.
**Action:** Replace `Math.hypot(x,y)` with `x*x + y*y` for distance comparisons (e.g. collision, aggro range). For actual distance values, use `Math.sqrt(x*x + y*y)`. Avoid `Math.atan2` for simple vector normalization (clamping) by using `sqrt` + division.
