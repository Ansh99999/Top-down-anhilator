# Palette's Journal

## 2024-05-22 - Accessibility in Canvas Games
**Learning:** Even in canvas-heavy games, the surrounding UI (menus, HUDs) often suffers from "div-itis" where interactive elements are just `div`s with click handlers.
**Action:** Always check the "start game" or "lobby" screens first. Converting these to semantic HTML (`<button>`, `<form>`) provides huge accessibility wins for free (keyboard nav, screen reader support) without touching the complex canvas logic.

## 2024-05-24 - Focus Visibility in Dark Themes
**Learning:** Default browser focus rings are often invisible against dark backgrounds common in games like Jungle Militia.
**Action:** Always define a high-contrast custom `:focus-visible` style (e.g., using the game's highlight color) for interactive elements in dark-themed UIs.

## 2026-01-15 - Semantic Buttons in Hybrid Controls
**Learning:** Converting `div` buttons to `<button>` tags requires careful handling of hybrid touch/mouse events. `touchstart` with `preventDefault` suppresses `click`, breaking the button for mouse/keyboard users if a separate `click` listener isn't added.
**Action:** When refactoring to semantic HTML, always ensure a `click` listener exists for mouse/keyboard activation and explicitly reset User Agent styles (border, background, padding) to match the original design.

## 2024-10-27 - DOM Reuse for Focus Management
**Learning:** In dynamic game UIs (like vehicle selection), re-rendering the entire list on every interaction destroys the DOM node holding keyboard focus, disorienting screen reader and keyboard users.
**Action:** Instead of clearing and rebuilding the DOM, update attributes (`aria-pressed`, classes) on existing nodes. This preserves focus and provides a smoother experience.
