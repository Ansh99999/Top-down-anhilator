# Palette's Journal

## 2024-05-22 - Accessibility in Canvas Games
**Learning:** Even in canvas-heavy games, the surrounding UI (menus, HUDs) often suffers from "div-itis" where interactive elements are just `div`s with click handlers.
**Action:** Always check the "start game" or "lobby" screens first. Converting these to semantic HTML (`<button>`, `<form>`) provides huge accessibility wins for free (keyboard nav, screen reader support) without touching the complex canvas logic.
