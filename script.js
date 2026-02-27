console.log('[YouTube FM] Initializing...');

const elements = {
    urlInput: document.getElementById('urlInput'),
    tuneBtn: document.getElementById('tuneBtn'),
    playBtn: document.getElementById('playBtn'),
    stopBtn: document.getElementById('stopBtn'),
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

function updatePlayButton() {
    if (isPlaying) {
        elements.playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else {
        elements.playIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    }
}

function setVisualizerActive(active) {
    console.log('[YouTube FM] Visualizer:', active ? 'active' : 'inactive');
    const bars = elements.freqBars.querySelectorAll('.freq-bar');
    bars.forEach((bar, index) => {
        if (active) {
            bar.classList.add('active');
            bar.style.animationDuration = `${0.2 + Math.random() * 0.3}s`;
        } else {
            bar.classList.remove('active');
            bar.style.height = '10px';
        }
    });
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
    if (!videoId) {
        showError('Invalid YouTube URL');
        return;
    }

    showLoading(true);
    currentVideoId = videoId;
    console.log('[YouTube FM] Calling loadVideoById with:', videoId);

    try {
        player.loadVideoById({
            videoId: videoId,
            startSeconds: 0
        });
    } catch (e) {
        console.error('[YouTube FM] Error loading video:', e);
        showError('Error loading video: ' + e.message);
        showLoading(false);
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
                void elements.trackTitle.offsetWidth; // Trigger reflow
                
                // Check if text overflows the container
                const containerWidth = elements.trackTitle.parentElement.clientWidth;
                const textWidth = elements.trackTitle.scrollWidth;

                if (textWidth > containerWidth) {
                    elements.trackTitle.classList.add('scrolling');
                    // Calculate duration based on speed: distance / speed
                    // Distance is roughly containerWidth + textWidth
                    // Target speed ~50px/sec
                    const duration = (textWidth + containerWidth) / 50;
                    elements.trackTitle.style.animationDuration = `${Math.max(10, duration)}s`;
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
                void elements.trackTitle.offsetWidth; // Force reflow

                const textWidth = elements.trackTitle.scrollWidth;
                const containerWidth = elements.trackTitle.parentElement.clientWidth;
                
                if (textWidth > containerWidth) {
                    elements.trackTitle.classList.add('scrolling');
                    // Distance is full width of element (padding + text) which is containerWidth + textWidth
                    // Speed = distance / duration => duration = distance / speed
                    // Let's target roughly 50px/sec speed for readability
                    const duration = (textWidth + containerWidth) / 50; 
                    elements.trackTitle.style.animationDuration = `${Math.max(10, duration)}s`;
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
            elements.trackTitle.classList.remove('scrolling');
            elements.progressFill.style.width = '0%';
            console.log('[YouTube FM] State: ENDED');
            break;
        case YT.PlayerState.CUED:
            showLoading(false);
            elements.playBtn.disabled = false;
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

elements.volumeSlider.value = 20;

console.log('[YouTube FM] Initialization complete');
