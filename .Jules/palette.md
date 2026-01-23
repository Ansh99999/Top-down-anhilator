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

## 2026-10-28 - Converting Icon Divs to Buttons
**Learning:** When converting icon-only `div`s to `<button>`s to improve accessibility, browser User Agent styles (padding, appearance, border) often clash with existing custom styles (like circular borders).
**Action:** Explicitly reset `appearance: none`, `padding: 0`, and `font-family: inherit` on the button class. Do NOT blindly set `border: none` or `background: none` if the existing class relies on them for the visual design; instead, ensure the class styles override the UA defaults (which they usually do due to specificity/author origin).
