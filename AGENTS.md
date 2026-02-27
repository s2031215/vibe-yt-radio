# YouTube Radio Player - Developer Guide

This repository contains a vanilla HTML/CSS/JS web application. There is no build step or package manager involved.

## 1. Build, Lint, and Test

Since this is a vanilla JavaScript project without a build system:

- **Build:** No build command is required. The source files (`index.html`, `style.css`, `script.js`) are served directly to the browser.
- **Run:** Open `index.html` in a modern web browser to run the application.
- **Lint:** No automated linter is configured. Developers should rely on their editor's built-in linting or standard ESLint recommendations for vanilla JS.
- **Test:**
    - **Manual Testing:** There are no automated tests. Features must be verified manually by opening the application in a browser.
    - **Debugging:** Use the browser's Developer Tools (F12). The application logs extensively to the console with the prefix `[YouTube FM]`.
    - **Verification:** When making changes, verify core flows:
        1.  Entering a valid YouTube URL/ID.
        2.  Playback controls (Play, Pause, Stop, Volume).
        3.  Playlist functionality (Add, Remove, Auto-advance).
        4.  Error handling (Invalid ID, Network error).

## 2. Code Style & Conventions

### JavaScript (`script.js`)
- **Type:** Vanilla ES6+ JavaScript. No frameworks (React, Vue, etc.) or bundlers (Webpack, Vite).
- **Structure:**
    -   Single file script.
    -   **DOM Elements:** All DOM references are cached in a constant `elements` object at the top of the file. Do not query the DOM repeatedly inside functions.
    -   **Global State:** State variables (`isPlaying`, `currentVideoId`, `customPlaylist`) are defined at the top level.
- **Formatting:**
    -   **Indentation:** 4 spaces.
    -   **Quotes:** Single quotes `'` for strings, backticks `` ` `` for template literals.
    -   **Semicolons:** Always use semicolons.
- **Naming Conventions:**
    -   **Variables/Functions:** `camelCase` (e.g., `updateVolume`, `isPlaying`).
    -   **Constants:** `UPPER_SNAKE_CASE` for configuration and storage keys (e.g., `STORAGE_KEY_VOLUME`).
    -   **CSS Classes/IDs:** `kebab-case` (e.g., `volume-slider`, `tune-btn`).
- **Logging:**
    -   All console logs must be prefixed with `[YouTube FM] ` to easily filter application logs.
    -   Example: `console.log('[YouTube FM] Loading video:', videoId);`
- **Error Handling:**
    -   Use `try...catch` blocks for all external API calls (YouTube Player API, fetch) and JSON parsing.
    -   Use the `showError(message)` helper function to display user-facing errors in the UI.
    -   Fail gracefully: If a video fails to load, the app should attempt to skip to the next track or reset state, rather than crashing.
- **Storage:**
    -   Use `localStorage` for persisting user preferences (volume) and state (playlist).
    -   Always handle `localStorage` operations in `try...catch` blocks.

### CSS (`style.css`)
- **Theming:** Use CSS variables defined in `:root` for colors and common values (e.g., `--bg-deep`, `--accent-red`).
- **Layout:** Flexbox is preferred for alignment. Grid is used where appropriate.
- **Responsiveness:** Ensure the UI scales down for mobile devices (max-width constraints).
- **Naming:** Class names should be descriptive and semantic.

### HTML (`index.html`)
- **Structure:** Semantic HTML5.
- **IDs:** Used for JavaScript hooks (referenced in the `elements` object).
- **Classes:** Used for styling.

## 3. Library Usage
- **YouTube IFrame Player API:** This is the core dependency, loaded via script tag. Do not wrap this in a custom library; use the global `YT` object and `onYouTubeIframeAPIReady` callback.
- **No External Packages:** Do not introduce `npm` packages. All logic should be contained within `script.js` or via CDN links in `index.html` if absolutely necessary (and approved).
