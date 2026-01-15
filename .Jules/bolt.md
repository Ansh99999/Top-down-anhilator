## 2024-05-23 - Spatial Partitioning for Collision Detection
**Learning:** In a circular map with negative coordinates, simple grid partitioning works if implemented with `Math.floor` correctly. Integrating a spatial grid reduced O(N) collision checks significantly.
**Action:** When working with 2D physics engines in JS, always check for spatial partitioning usage. If absent and entity count is high (>100), it's a prime optimization candidate.
