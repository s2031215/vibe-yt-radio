console.log('[YouTube FM] Initializing...');

const elements = {
    urlInput: document.getElementById('urlInput'),
    tuneBtn: document.getElementById('tuneBtn'),
    playBtn: document.getElementById('playBtn'),
    stopBtn: document.getElementById('stopBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeValue: document.getElementById('volumeValue'),
    trackTitle: document.getElementById('trackTitle'),
    statusText: document.getElementById('statusText'),
    ledIndicator: document.getElementById('ledIndicator'),
    dialNeedle: document.getElementById('dialNeedle'),
    freqBars: document.getElementById('freqBars'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    errorMessage: document.getElementById('errorMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    playIcon: document.getElementById('playIcon')
};

let player;
let isPlaying = false;
let currentVideoId = null;
let progressInterval;

const STORAGE_KEY_VOLUME = 'yt_radio_volume';
const STORAGE_KEY_LAST_VIDEO = 'yt_radio_last_video';

console.log('[YouTube FM] Creating frequency bars...');
for (let i = 0; i < 32; i++) {
    const bar = document.createElement('div');
    bar.className = 'freq-bar';
    bar.style.height = '10px';
    bar.style.animationDelay = `${i * 0.05}s`;
    elements.freqBars.appendChild(bar);
}

function showError(message) {
    console.error('[YouTube FM] Error:', message);
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add('show');
    setTimeout(() => {
        elements.errorMessage.classList.remove('show');
    }, 5000);
}

function showLoading(show) {
    console.log('[YouTube FM] Loading:', show);
    elements.loadingOverlay.classList.toggle('show', show);
}

function extractVideoId(url) {
    console.log('[YouTube FM] Extracting video ID from:', url);
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            console.log('[YouTube FM] Video ID found:', match[1]);
            return match[1];
        }
    }
    console.warn('[YouTube FM] No video ID found in URL');
    return null;
}

function extractPlaylistId(url) {
    console.log('[YouTube FM] Extracting playlist ID from:', url);
    const patterns = [
        /[?&]list=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            console.log('[YouTube FM] Playlist ID found:', match[1]);
            return match[1];
        }
    }
    return null;
}

function updatePlayButton() {
    if (isPlaying) {
        elements.playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else {
        elements.playIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    }
}

let visualizerAnimationFrame;

function updateVisualizerBars() {
    if (!isPlaying) {
        visualizerAnimationFrame = null;
        return;
    }

    const bars = elements.freqBars.querySelectorAll('.freq-bar');
    const time = Date.now() / 1000;

    bars.forEach((bar, index) => {
        // Multi-wave simulation for more organic movement
        const wave1 = Math.sin(time * 3 + index * 0.2);
        const wave2 = Math.cos(time * 5 + index * 0.5);
        const wave3 = Math.sin(time * 7 + index * 0.1);

        // Combine waves
        let heightFactor = (wave1 + wave2 + wave3) / 3;

        // Add absolute value for bounce
        heightFactor = Math.abs(heightFactor);

        // Add some random jitter
        heightFactor += (Math.random() * 0.2);

        // Scale to 0-1
        heightFactor = Math.min(1, Math.max(0.1, heightFactor));

        // Random "beat" spikes
        if (Math.random() > 0.95) heightFactor = 1.0;

        // Apply height (5px to 45px)
        const h = 5 + (heightFactor * 40);

        bar.style.height = `${h}px`;
    });

    visualizerAnimationFrame = requestAnimationFrame(updateVisualizerBars);
}

function setVisualizerActive(active) {
    console.log('[YouTube FM] Visualizer:', active ? 'active' : 'inactive');
    const bars = elements.freqBars.querySelectorAll('.freq-bar');

    if (active) {
        bars.forEach(bar => bar.classList.add('active'));
        if (!visualizerAnimationFrame) {
            updateVisualizerBars();
        }
    } else {
        bars.forEach(bar => {
            bar.classList.remove('active');
            bar.style.height = '10px';
        });
        if (visualizerAnimationFrame) {
            cancelAnimationFrame(visualizerAnimationFrame);
            visualizerAnimationFrame = null;
        }
    }
}

function updateProgress() {
    if (player && player.getCurrentTime && player.getDuration) {
        try {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();

            if (duration > 0) {
                const percent = (currentTime / duration) * 100;
                elements.progressFill.style.width = `${percent}%`;
                elements.currentTime.textContent = formatTime(currentTime);
                elements.duration.textContent = formatTime(duration);
            }
        } catch (e) {
            console.warn('[YouTube FM] Error getting progress:', e.message);
        }
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function onYouTubeIframeAPIReady() {
    console.log('[YouTube FM] YouTube API ready, creating player...');
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log('[YouTube FM] Player ready!');
    elements.tuneBtn.addEventListener('click', loadVideo);
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadVideo();
    });
    elements.playBtn.addEventListener('click', togglePlay);
    elements.stopBtn.addEventListener('click', stopVideo);
    elements.prevBtn.addEventListener('click', prevTrack);
    elements.nextBtn.addEventListener('click', nextTrack);
    elements.volumeSlider.addEventListener('input', updateVolume);
    elements.progressBar.addEventListener('click', seekTo);
}

function loadVideo() {
    const url = elements.urlInput.value.trim();
    console.log('[YouTube FM] Loading video from URL:', url);

    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }

    const videoId = extractVideoId(url);
    const playlistId = extractPlaylistId(url);
    
    if (!videoId && !playlistId) {
        showError('Invalid YouTube URL');
        return;
    }

    showLoading(true);
    // Reset buttons
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;

    // Save to localStorage
    try {
        if (videoId) {
            localStorage.setItem(STORAGE_KEY_LAST_VIDEO, videoId);
        }
    } catch (e) {
        console.warn('[YouTube FM] Could not save last video:', e);
    }

    try {
        updateVolume();
        
        if (playlistId && !videoId) {
            // Playlist only
            console.log('[YouTube FM] Loading playlist:', playlistId);
            currentVideoId = null; // Will be set by onStateChange
            player.loadPlaylist({
                list: playlistId,
                listType: 'playlist',
                index: 0,
                startSeconds: 0
            });
        } else if (playlistId && videoId) {
             // Both: Load video first, user won't have prev/next immediately 
             // unless we can find the index. For MVP, we load the video.
             // Improvement: We can try to load the playlist BUT we don't know the index.
             // Compromise: Load the video directly. If the user wants the full playlist experience,
             // they should use the playlist link or we just accept that deep-linking 
             // into a playlist without index is hard without API key.
             console.log('[YouTube FM] Loading video (ignoring playlist context for now):', videoId);
             currentVideoId = videoId;
             player.loadVideoById({
                 videoId: videoId,
                 startSeconds: 0
             });
        } else {
            // Video only
            console.log('[YouTube FM] Loading video:', videoId);
            currentVideoId = videoId;
            player.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });
        }
    } catch (e) {
        console.error('[YouTube FM] Error loading video:', e);
        showError('Error loading video: ' + e.message);
        showLoading(false);
    }
}

function prevTrack() {
    if (!player) return;
    console.log('[YouTube FM] Previous track');
    try {
        player.previousVideo();
    } catch (e) {
        console.error('Error going to previous track:', e);
    }
}

function nextTrack() {
    if (!player) return;
    console.log('[YouTube FM] Next track');
    try {
        player.nextVideo();
    } catch (e) {
        console.error('Error going to next track:', e);
    }
}

function updateNavigationButtons() {
    if (!player || !player.getPlaylist) return;
    
    try {
        const playlist = player.getPlaylist();
        const currentIndex = player.getPlaylistIndex();
        
        if (!playlist || playlist.length <= 1) {
            elements.prevBtn.disabled = true;
            elements.nextBtn.disabled = true;
            return;
        }

        // Enable/disable based on position
        elements.prevBtn.disabled = (currentIndex === 0);
        // YouTube playlists might loop, but standard behavior usually has an end
        // unless loop is enabled. Let's assume linear navigation.
        elements.nextBtn.disabled = (currentIndex === playlist.length - 1);
        
        console.log(`[YouTube FM] Playlist update: Index ${currentIndex}/${playlist.length}`);
    } catch (e) {
        console.warn('[YouTube FM] Error updating nav buttons:', e);
    }
}

function onPlayerStateChange(event) {
    console.log('[YouTube FM] Player state changed:', event.data);
    showLoading(false);

    switch (event.data) {
        case YT.PlayerState.BUFFERING:
            showLoading(true);
            console.log('[YouTube FM] State: BUFFERING');
            break;
        case YT.PlayerState.PLAYING:
            isPlaying = true;
            elements.playBtn.disabled = false;
            elements.stopBtn.disabled = false;
            updateNavigationButtons(); // Check prev/next buttons
            elements.statusText.textContent = 'ON AIR';
            elements.ledIndicator.classList.remove('stopped');
            elements.ledIndicator.classList.add('playing');
            elements.dialNeedle.style.left = `${30 + Math.random() * 40}%`;
            updatePlayButton();
            setVisualizerActive(true);

            try {
                const title = player.getVideoData().title;
                console.log('[YouTube FM] Now playing:', title);
                elements.trackTitle.textContent = title || 'Unknown Track';

                // Add scrolling logic for long titles
                elements.trackTitle.classList.remove('scrolling');
                elements.trackTitle.style.animationDuration = ''; // Reset duration
                elements.trackTitle.style.setProperty('--scroll-dist', '0px');
                void elements.trackTitle.offsetWidth; // Trigger reflow

                // Check if text overflows the container
                const containerWidth = elements.trackTitle.parentElement.clientWidth;
                const textWidth = elements.trackTitle.scrollWidth;

                if (textWidth > containerWidth) {
                    const scrollDist = textWidth - containerWidth;
                    elements.trackTitle.style.setProperty('--scroll-dist', `${scrollDist}px`);
                    elements.trackTitle.classList.add('scrolling');
                    // Same duration logic as the delayed check
                    const scrollTime = scrollDist / 50;
                    const totalDuration = scrollTime / 0.8;
                    elements.trackTitle.style.animationDuration = `${Math.max(3, totalDuration)}s`;
                }
            } catch (e) {
                console.warn('[YouTube FM] Could not get video title:', e.message);
                elements.trackTitle.textContent = 'Now Playing';
            }

            if (progressInterval) clearInterval(progressInterval);
            progressInterval = setInterval(updateProgress, 100);

            // Re-check scrolling after a short delay to ensure rendering is complete
            setTimeout(() => {
                // Ensure fresh measurements by removing scrolling class first
                elements.trackTitle.classList.remove('scrolling');
                elements.trackTitle.style.animationDuration = '';
                elements.trackTitle.style.setProperty('--scroll-dist', '0px');
                void elements.trackTitle.offsetWidth; // Force reflow

                const textWidth = elements.trackTitle.scrollWidth;
                const containerWidth = elements.trackTitle.parentElement.clientWidth;

                if (textWidth > containerWidth) {
                    const scrollDist = textWidth - containerWidth;
                    elements.trackTitle.style.setProperty('--scroll-dist', `${scrollDist}px`);
                    elements.trackTitle.classList.add('scrolling');

                    // Duration calculation:
                    // 1. Scroll distance: scrollDist
                    // 2. Speed: 50px/sec
                    // 3. Pause at end: ~1s (We'll pad the duration to include this)
                    // Let's say we want 80% of time scrolling, 20% waiting at end.
                    // scrollTime = scrollDist / 50
                    // totalTime = scrollTime / 0.8
                    const scrollTime = scrollDist / 50;
                    const totalDuration = scrollTime / 0.8;

                    elements.trackTitle.style.animationDuration = `${Math.max(3, totalDuration)}s`;
                }
            }, 500);

            console.log('[YouTube FM] State: PLAYING');
            break;
        case YT.PlayerState.PAUSED:
            isPlaying = false;
            updatePlayButton();
            setVisualizerActive(false);
            elements.statusText.textContent = 'PAUSED';
            elements.ledIndicator.classList.remove('playing');
            elements.trackTitle.classList.remove('scrolling');
            console.log('[YouTube FM] State: PAUSED');
            break;
        case YT.PlayerState.ENDED:
            isPlaying = false;
            updatePlayButton();
            setVisualizerActive(false);
            elements.statusText.textContent = 'ENDED';
            elements.ledIndicator.classList.remove('playing');
    elements.ledIndicator.classList.add('stopped');
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.trackTitle.classList.remove('scrolling');
            elements.progressFill.style.width = '0%';
            console.log('[YouTube FM] State: ENDED');
            break;
        case YT.PlayerState.CUED:
            showLoading(false);
            elements.playBtn.disabled = false;
            updateNavigationButtons();
            elements.statusText.textContent = 'READY';
            elements.trackTitle.textContent = 'Press PLAY to start';
            console.log('[YouTube FM] State: CUED (ready to play)');
            break;
        case -1:
            console.log('[YouTube FM] State: UNSTARTED');
            break;
        default:
            console.log('[YouTube FM] Unknown state:', event.data);
    }
}

function onPlayerError(event) {
    console.error('[YouTube FM] Player error:', event.data);
    showLoading(false);
    const errors = {
        2: 'Invalid video ID',
        5: 'Video playback error',
        100: 'Video not found',
        101: 'Embedding not allowed',
        150: 'Embedding not allowed'
    };
    const errorMsg = errors[event.data] || 'Playback error';
    showError(errorMsg);
    elements.statusText.textContent = 'ERROR';
}

function togglePlay() {
    console.log('[YouTube FM] Toggle play, current state:', isPlaying);
    if (!player || !currentVideoId) {
        console.warn('[YouTube FM] Cannot toggle: no player or no video loaded');
        return;
    }

    try {
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    } catch (e) {
        console.error('[YouTube FM] Error toggling play:', e);
    }
}

function stopVideo() {
    console.log('[YouTube FM] Stopping video');
    if (!player) return;

    try {
        player.stopVideo();
    } catch (e) {
        console.error('[YouTube FM] Error stopping video:', e);
    }

    isPlaying = false;
    updatePlayButton();
    setVisualizerActive(false);
    elements.statusText.textContent = 'STOPPED';
    elements.ledIndicator.classList.remove('playing');
    elements.ledIndicator.classList.add('stopped');
    elements.trackTitle.classList.remove('scrolling');
    elements.trackTitle.textContent = '---';
    elements.progressFill.style.width = '0%';
    elements.currentTime.textContent = '0:00';
    if (progressInterval) clearInterval(progressInterval);
}

function updateVolume() {
    const volume = elements.volumeSlider.value;
    elements.volumeValue.textContent = `${volume}%`;

    // Save to localStorage
    try {
        localStorage.setItem(STORAGE_KEY_VOLUME, volume);
    } catch (e) {
        console.warn('[YouTube FM] Could not save volume:', e);
    }

    if (player && player.setVolume) {
        try {
            player.setVolume(volume);
        } catch (e) {
            console.warn('[YouTube FM] Error setting volume:', e.message);
        }
    }
}

function seekTo(e) {
    console.log('[YouTube FM] Seeking...');
    if (!player || !player.getDuration) return;

    try {
        const rect = elements.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const seekTime = percent * player.getDuration();
        player.seekTo(seekTime, true);
        console.log('[YouTube FM] Seeked to:', formatTime(seekTime));
    } catch (e) {
        console.error('[YouTube FM] Error seeking:', e);
    }
}

function loadSettings() {
    console.log('[YouTube FM] Loading settings...');
    try {
        const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
        if (savedVolume !== null) {
            elements.volumeSlider.value = savedVolume;
            elements.volumeValue.textContent = `${savedVolume}%`;
        } else {
            elements.volumeSlider.value = 20; // Default
            elements.volumeValue.textContent = '20%';
        }

        const savedVideo = localStorage.getItem(STORAGE_KEY_LAST_VIDEO);
        if (savedVideo) {
            console.log('[YouTube FM] Found last video:', savedVideo);
            elements.urlInput.value = `https://youtu.be/${savedVideo}`;
            // If we have a valid video ID, we could potentially set currentVideoId
            // but we shouldn't auto-play without user interaction policy check.
            // Let's just leave it populated for easy "Tune" button click.
        }
    } catch (e) {
        console.warn('[YouTube FM] Could not load settings:', e);
        elements.volumeSlider.value = 20;
        elements.volumeValue.textContent = '20%';
    }
}

function handleKeyboardControls(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Volume controls should work even if not playing, as long as slider exists
    if (e.code === 'ArrowUp') {
        e.preventDefault();
        let vol = parseInt(elements.volumeSlider.value);
        vol = Math.min(100, vol + 5);
        elements.volumeSlider.value = vol;
        updateVolume();
        return;
    }
    if (e.code === 'ArrowDown') {
        e.preventDefault();
        let vol = parseInt(elements.volumeSlider.value);
        vol = Math.max(0, vol - 5);
        elements.volumeSlider.value = vol;
        updateVolume();
        return;
    }

    if (!player || !currentVideoId) return;

    switch (e.code) {
        case 'Space':
        case 'KeyK': // YouTube standard shortcut
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowRight':
            if (player.getCurrentTime) {
                e.preventDefault();
                player.seekTo(player.getCurrentTime() + 5, true);
            }
            break;
        case 'ArrowLeft':
            if (player.getCurrentTime) {
                e.preventDefault();
                player.seekTo(player.getCurrentTime() - 5, true);
            }
            break;
        case 'KeyM': // Mute toggle (optional but nice)
            if (player.isMuted()) {
                player.unMute();
            } else {
                player.mute();
            }
            break;
    }
}

// Initialize
loadSettings();
document.addEventListener('keydown', handleKeyboardControls);

console.log('[YouTube FM] Initialization complete');
