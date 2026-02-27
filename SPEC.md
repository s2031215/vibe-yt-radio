# YouTube Radio Player - Specification

## Project Overview
- **Project Name**: YouTube Radio Player
- **Type**: Single-page web application
- **Core Functionality**: A retro-styled radio music player that accepts YouTube URLs and plays audio in the background with a visual radio interface
- **Target Users**: Music enthusiasts who want a nostalgic radio experience

## UI/UX Specification

### Layout Structure
- **Container**: Centered card (max-width: 480px) with radio aesthetic
- **Header**: Radio brand/display area with frequency display
- **Main Area**: Input field for YouTube URL, playback controls
- **Visualizer**: Animated radio dial/visualizer that responds to playback
- **Footer**: Volume control and current track info

### Visual Design

#### Color Palette
- **Background**: `#1a1a2e` (deep navy)
- **Radio Body**: `#2d2d44` (dark purple-gray)
- **Radio Face**: `#f5e6d3` (warm cream/vintage beige)
- **Accent Primary**: `#e63946` (retro red)
- **Accent Secondary**: `#f4a261` (warm orange)
- **Glow/LED**: `#00ff88` (neon green for active states)
- **Text Dark**: `#1a1a2e`
- **Text Light**: `#f5e6d3`

#### Typography
- **Primary Font**: "Orbitron" (digital/futuristic for displays)
- **Secondary Font**: "Press Start 2P" (pixel style for labels)
- **Body Font**: "Outfit" (clean modern)

#### Visual Effects
- Subtle glow effects on active elements
- Vinyl record animation when playing
- Radio dial needle animation
- LED-style indicators
- Vintage radio texture overlays
- Smooth transitions on all interactive elements

### Components

1. **Radio Display Panel**
   - Digital frequency-style display showing current track
   - Animated glow when playing
   - Station name (fixed as "YOUTUBE FM")

2. **URL Input Section**
   - Styled input field with vintage aesthetic
   - "TUNE" button to load track
   - Placeholder text: "Paste YouTube URL here..."

3. **Playback Controls**
   - Large circular play/pause button (radio knob style)
   - Previous/Next track buttons (if playlist)
   - Stop button

4. **Visualizer**
   - Animated radio dial with moving needle
   - Frequency bars animation when playing

5. **Volume Control**
   - Rotary knob style slider
   - LED indicator showing volume level

6. **Track Info Display**
   - Scrolling marquee for long titles
   - Artist/Channel name

## Functionality Specification

### Core Features
1. **YouTube URL Input**
   - Accept full YouTube URLs and short youtu.be links
   - Extract video ID from various URL formats
   - Show loading state while fetching

2. **Background Playback**
   - Use YouTube IFrame API for playback
   - Continue playing when tab is not focused
   - Handle autoplay restrictions gracefully

3. **Playback Controls**
   - Play/Pause toggle
   - Stop (return to beginning)
   - Volume adjustment (0-100%)
   - Seek functionality

4. **Now Playing Display**
   - Show video title (fetched via oEmbed or from player)
   - Animated display when playing
   - "NO SIGNAL" state when stopped

### User Interactions
- Click "TUNE" to load YouTube URL
- Click play/pause to toggle playback
- Drag volume slider to adjust
- Click on radio dial to seek (optional)

### Edge Cases
- Invalid YouTube URL: Show error message
- Video unavailable: Show "SIGNAL LOST" message
- Autoplay blocked: Show "PRESS PLAY" prompt
- Network error: Show retry option

## Acceptance Criteria
1. ✓ User can paste a YouTube URL and click TUNE
2. ✓ Music plays in background (audio from YouTube video)
3. ✓ Radio-style UI with vintage aesthetics
4. ✓ Play/pause controls work correctly
5. ✓ Volume control adjusts audio level
6. ✓ Now playing info displays when available
7. ✓ Error states are handled gracefully
8. ✓ Responsive design works on mobile and desktop
