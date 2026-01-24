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

## 2026-01-28 - Focus Loss on Re-render
**Learning:** In dynamic UIs where lists are rebuilt from scratch (like the Garage), selecting an item via keyboard triggers a re-render that destroys the focused element, causing focus to reset to `body`.
**Action:** When making dynamic lists accessible, implement focus management logic to restore focus to the selected item (or its replacement) after re-rendering, preserving the user's context.

## 2026-02-12 - CSS Specificity in Semantic Refactors
**Learning:** When converting `div.class` to `button.class` and adding a CSS reset rule for `button.class`, the reset rule (0-1-1) is more specific than the original class (0-1-0).
**Action:** Do NOT blindly add `border: none` or `background: none` to the reset block if the original class defines them, as this will wipe out the design. Only reset properties that differ between `div` and `button` (appearance, padding) and rely on the original class for visuals.
