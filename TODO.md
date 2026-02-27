# YouTube Radio Player - TODO List

## Completed Features
- [x] **Core UI**: Radio interface, controls, and responsive layout
- [x] **YouTube Integration**: `script.js` handles IFrame API, loads videos, extracts IDs
- [x] **Playback Controls**: Play, Pause, Stop, Seek, Volume
- [x] **Visualizer**: Basic animation (simulated)
- [x] **Error Handling**: Basic error messages and loading states

## Next Steps / Backlog
- [x] **Enhance Visualizer**: Improve `Math.random()` animation to be more realistic or frequency-based (simulated with sine waves)
- [ ] **Playlist Support**: Implement "Next/Prev" buttons for playlist navigation
- [x] **Persist Settings**: Save volume and last played station to `localStorage`
- [x] **Keyboard Shortcuts**: Add Space (play/pause) and Arrow keys (volume/seek) support
- [ ] **Mobile Optimization**: Further refine touch targets for mobile users

## UI/UX Improvements (High Priority)
- [x] **Track Title Scrolling**: Implement scrolling for track titles that exceed the display width.
    - *Plan*: Check `scrollWidth > clientWidth` in `script.js` on play and add `.scrolling` class.
- [x] **Fit Frequency Bars**: Ensure frequency bars fill the visualizer container completely.
    - *Plan*: Use Flexbox (`flex: 1`) for bars in `style.css` and increase count in `script.js`.
