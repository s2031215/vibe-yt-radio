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
    playIcon: document.getElementById('playIcon'),
    // addToPlaylistBtn removed
    playlistContent: document.getElementById('playlistContent'),
    clearPlaylistBtn: document.getElementById('clearPlaylistBtn')
};

let player;
let isPlaying = false;
let currentVideoId = null;
let progressInterval;
let customPlaylist = [];
let customPlaylistIndex = -1;
let pendingPlaylistImport = false;
let targetVideoId = null; // Specific video to play after playlist import

const STORAGE_KEY_VOLUME = 'yt_radio_volume';
const STORAGE_KEY_LAST_VIDEO = 'yt_radio_last_video';
const STORAGE_KEY_PLAYLIST = 'yt_radio_custom_playlist';

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

function updateDialNeedle() {
    // If only one song or none, center the needle (50%)
    if (customPlaylist.length <= 1) {
        elements.dialNeedle.style.left = '50%';
        return;
    }

    // Guard against negative index (default to 0)
    let index = customPlaylistIndex;
    if (index < 0) index = 0;

    // Map current index to 5% - 95% range
    // index 0 -> 5%
    // index max -> 95%
    const percentage = index / (customPlaylist.length - 1);
    const position = 5 + (percentage * 90);
    
    elements.dialNeedle.style.left = `${position}%`;
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
    // Combined logic: TUNE button acts as Add+Play
    elements.tuneBtn.addEventListener('click', handleTuneButton);
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleTuneButton();
    });
    elements.playBtn.addEventListener('click', togglePlay);
    elements.stopBtn.addEventListener('click', stopVideo);
    elements.prevBtn.addEventListener('click', prevTrack);
    elements.nextBtn.addEventListener('click', nextTrack);
    elements.volumeSlider.addEventListener('input', updateVolume);
    elements.progressBar.addEventListener('click', seekTo);

    // Apply stored volume immediately
    updateVolume();

    // Load custom playlist
    loadPlaylist();

    // Auto-load last video if available
    const savedVideo = localStorage.getItem(STORAGE_KEY_LAST_VIDEO);
    if (savedVideo && !currentVideoId) {
        console.log('[YouTube FM] Auto-cueing last video:', savedVideo);
        currentVideoId = savedVideo;
        
        // Try to find this video in the restored playlist to set the correct index
        const savedIndex = customPlaylist.findIndex(item => item.id === savedVideo);
        if (savedIndex !== -1) {
            console.log('[YouTube FM] Restoring playlist index:', savedIndex);
            customPlaylistIndex = savedIndex;
            updateDialNeedle();
            renderPlaylist(); // Highlight the track
        }
        
        player.cueVideoById(savedVideo);
        elements.statusText.textContent = 'READY';
    }
}


// Modified to accept ID directly and play immediately
// (Duplicate function removed)

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
        
        if (playlistId) {
            // Playlist detected - queue for import
            console.log('[YouTube FM] Loading playlist for import:', playlistId);
            pendingPlaylistImport = true;
            targetVideoId = videoId; // Store the target video ID (if any)
            
            // Load the playlist to get the video IDs
            player.loadPlaylist({
                list: playlistId,
                listType: 'playlist',
                index: 0,
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

// --- Playlist Logic ---

function loadPlaylist() {
    const saved = localStorage.getItem(STORAGE_KEY_PLAYLIST);
    if (saved) {
        try {
            customPlaylist = JSON.parse(saved);
            renderPlaylist();
        } catch (e) {
            console.error('[YouTube FM] Error parsing playlist:', e);
        }
    }
}

function savePlaylist() {
    localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(customPlaylist));
}

async function fetchVideoTitle(videoId) {
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();
        if (data && data.title) {
            return data.title;
        }
    } catch (e) {
        console.warn('[YouTube FM] Error fetching video title:', e);
    }
    return null;
}

function handleTuneButton() {
    const url = elements.urlInput.value.trim();
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

    if (playlistId) {
        // If it's a playlist, load it (which triggers import)
        loadVideo();
        return;
    }

    if (videoId) {
        // Check if this video is already in our playlist
        const existingIndex = customPlaylist.findIndex(item => item.id === videoId);

        if (existingIndex !== -1) {
            // Already in playlist -> just play it
            console.log('[YouTube FM] Video already in playlist, jumping to it:', existingIndex);
            playCustomTrack(existingIndex);
            elements.urlInput.value = ''; // Clear input
        } else {
            // Not in playlist -> add it and play it
            console.log('[YouTube FM] New video, adding to playlist and playing');
            addToPlaylistAndPlay(videoId);
        }
    }
}

function addToPlaylistAndPlay(videoId) {
    // Default title
    let title = `Track ${customPlaylist.length + 1}`;
    
    // Add to array
    const newItem = {
        id: videoId,
        title: title,
        addedAt: Date.now()
    };
    
    customPlaylist.push(newItem);
    const newIndex = customPlaylist.length - 1; // Index of the newly added item

    savePlaylist();
    renderPlaylist();
    elements.urlInput.value = ''; // Clear input
    
    // Play immediately
    playCustomTrack(newIndex);
    
    // Fetch title in background
    fetchVideoTitle(videoId).then(fetchedTitle => {
        // We need to find the item again because playlist might have changed (e.g. removed/cleared)
        // But the object reference 'newItem' should still be valid if it's in the array
        if (fetchedTitle && customPlaylist.includes(newItem)) {
            newItem.title = fetchedTitle;
            savePlaylist();
            renderPlaylist();
            
            // If we are currently playing this exact track, update the main title display
            if (customPlaylistIndex === customPlaylist.indexOf(newItem)) {
                 elements.trackTitle.textContent = fetchedTitle;
            }
        }
    });
}

// Replaces old addToPlaylist logic
function addToPlaylist() {
    handleTuneButton();
}

function clearPlaylist() {
    if (confirm('Clear entire playlist?')) {
        customPlaylist = [];
        customPlaylistIndex = -1;
        savePlaylist();
        renderPlaylist();
    }
}

function renderPlaylist() {
    elements.playlistContent.innerHTML = '';
    
    if (customPlaylist.length === 0) {
        elements.playlistContent.innerHTML = '<div class="playlist-empty">QUEUE EMPTY</div>';
        return;
    }

    customPlaylist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = `playlist-item ${index === customPlaylistIndex ? 'playing' : ''}`;
        
        // If we don't have a real title yet, try to fetch thumbnail or just show ID
        const displayTitle = track.title.startsWith('Track') ? `Track ${index + 1} (${track.id})` : track.title;

        item.innerHTML = `
            <div class="item-title" title="${displayTitle}">${displayTitle}</div>
            <button class="item-remove" onclick="removeTrack(event, ${index})">×</button>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('item-remove')) {
                playCustomTrack(index);
            }
        });

        elements.playlistContent.appendChild(item);
    });

    updateDialNeedle();
}

function removeTrack(e, index) {
    e.stopPropagation();
    customPlaylist.splice(index, 1);
    
    // Adjust index if we removed the playing track or one before it
    if (index < customPlaylistIndex) {
        customPlaylistIndex--;
    } else if (index === customPlaylistIndex) {
        // We removed the currently playing track. 
        // We probably shouldn't stop playing immediately, but next track logic needs care.
        // For now, let's just reset index if it goes out of bounds.
        if (customPlaylistIndex >= customPlaylist.length) {
            customPlaylistIndex = -1; // End of list
        }
    }
    
    savePlaylist();
    renderPlaylist();
}
// Make removeTrack global so onclick works
window.removeTrack = removeTrack;

function playCustomTrack(index) {
    if (index < 0 || index >= customPlaylist.length) return;
    
    customPlaylistIndex = index;
    const track = customPlaylist[index];
    
    console.log('[YouTube FM] Playing custom track:', track.title);
    
    // Update UI highlighting
    renderPlaylist();
    updateDialNeedle();
    
    // Load the video
    elements.urlInput.value = `https://youtu.be/${track.id}`;
    loadVideo(); 
    // loadVideo will set currentVideoId and call player.loadVideoById
}

// --- End Playlist Logic ---

function prevTrack() {
    if (!player) return;
    console.log('[YouTube FM] Previous track');
    
    // Check if we are in a YouTube Playlist
    try {
        const playlist = player.getPlaylist();
        if (playlist && playlist.length > 1) {
            const currentIndex = player.getPlaylistIndex();
            if (currentIndex > 0) {
                player.previousVideo();
                return;
            }
        }
    } catch (e) {
        console.warn('Error checking YouTube playlist:', e);
    }

    // Check Custom Playlist
    if (customPlaylist.length > 0) {
        let prevIndex = customPlaylistIndex - 1;
        if (prevIndex < 0) prevIndex = customPlaylist.length - 1; // Loop
        
        console.log('[YouTube FM] Playing previous custom track:', prevIndex);
        playCustomTrack(prevIndex);
    }
}

function nextTrack() {
    if (!player) return;
    console.log('[YouTube FM] Next track');
    
    // Check if we are in a YouTube Playlist
    try {
        const playlist = player.getPlaylist();
        if (playlist && playlist.length > 1) {
             const currentIndex = player.getPlaylistIndex();
             // Only use native next if not at the end, or if loop is enabled (we assume linear for now)
             if (currentIndex < playlist.length - 1) {
                 player.nextVideo();
                 return;
             }
        }
    } catch (e) {
        console.warn('Error checking YouTube playlist:', e);
    }

    // Check Custom Playlist
    if (customPlaylist.length > 0) {
        let nextIndex = customPlaylistIndex + 1;
        if (nextIndex >= customPlaylist.length) nextIndex = 0; // Loop
        
        console.log('[YouTube FM] Playing next custom track:', nextIndex);
        playCustomTrack(nextIndex);
    }
}

function updateNavigationButtons() {
    let handled = false;

    // 1. Check Native YouTube Playlist
    if (player && player.getPlaylist) {
        try {
            const playlist = player.getPlaylist();
            const currentIndex = player.getPlaylistIndex();
            
            if (playlist && playlist.length > 1) {
                elements.prevBtn.disabled = (currentIndex === 0);
                elements.nextBtn.disabled = (currentIndex === playlist.length - 1);
                console.log(`[YouTube FM] Native Playlist update: ${currentIndex}/${playlist.length}`);
                handled = true;
            }
        } catch (e) {
            console.warn('[YouTube FM] Error updating nav buttons:', e);
        }
    }

    // 2. Check Custom Playlist (only if native didn't take over)
    if (!handled) {
        if (customPlaylist.length > 0) {
            // Always enable navigation for custom playlist (it loops)
            elements.prevBtn.disabled = false;
            elements.nextBtn.disabled = false;
            console.log('[YouTube FM] Custom Playlist active, buttons enabled');
            handled = true;
        } else {
            // No playlist active
            elements.prevBtn.disabled = true;
            elements.nextBtn.disabled = true;
        }
    }
}

function onPlayerStateChange(event) {
    console.log('[YouTube FM] Player state changed:', event.data);
    showLoading(false);

    // --- Playlist Import Logic ---
    if (pendingPlaylistImport && (event.data === YT.PlayerState.CUED || event.data === YT.PlayerState.PLAYING)) {
        const playlist = player.getPlaylist();
        if (playlist && playlist.length > 0) {
            console.log('[YouTube FM] Importing native playlist:', playlist.length, 'tracks');
            pendingPlaylistImport = false;
            
            // Clear existing custom playlist
            customPlaylist = [];
            customPlaylistIndex = -1;
            
            // Limit to 200 tracks to prevent performance issues and API spam
            const MAX_PLAYLIST_SIZE = 200;
            const tracksToImport = playlist.slice(0, MAX_PLAYLIST_SIZE);
            
            if (playlist.length > MAX_PLAYLIST_SIZE) {
                console.warn(`[YouTube FM] Playlist truncated from ${playlist.length} to ${MAX_PLAYLIST_SIZE} tracks`);
                showError(`Playlist truncated to first ${MAX_PLAYLIST_SIZE} tracks`);
            }

            // Populate with placeholders
            tracksToImport.forEach((id, index) => {
                customPlaylist.push({
                    id: id,
                    title: `Track ${index + 1} (Loading...)`,
                    addedAt: Date.now()
                });
            });
            
            savePlaylist();
            renderPlaylist();
            
            // Start fetching titles in background
            const currentPlaylistSnapshot = customPlaylist; // Capture current reference
            
            tracksToImport.forEach((id, index) => {
                // Add artificial delay to avoid hammering the proxy service too hard
                setTimeout(() => {
                    if (customPlaylist !== currentPlaylistSnapshot) return; // Playlist changed/cleared

                    fetchVideoTitle(id).then(title => {
                        if (title && customPlaylist[index] && customPlaylist[index].id === id) {
                            customPlaylist[index].title = title;
                            
                            // If currently playing this track, update main title immediately if generic
                            if (index === customPlaylistIndex && elements.trackTitle.textContent.includes('Loading...')) {
                                elements.trackTitle.textContent = title;
                            }
                            
                            renderPlaylist();
                            savePlaylist();
                        }
                    });
                }, index * 200); // Stagger requests by 200ms
            });

            // Play the target video or start from beginning
            let startIndex = 0;
            if (targetVideoId) {
                // Check if target is in our imported set
                const targetIndex = tracksToImport.indexOf(targetVideoId);
                if (targetIndex !== -1) {
                    startIndex = targetIndex;
                } else {
                    console.warn('[YouTube FM] Target video outside imported range, starting at 0');
                }
            }
            
            console.log('[YouTube FM] Starting imported playlist at index:', startIndex);
            playCustomTrack(startIndex);
            return; // Stop processing this event as we are restarting playback
        }
    }
    // --- End Playlist Import Logic ---

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
            updateDialNeedle();
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

            // Auto-advance logic for custom playlist
            try {
                const playlist = player.getPlaylist();
                // If native playlist is active and has >1 items, YouTube handles it (usually).
                // If it's a single video (length <= 1), check our custom playlist.
                if (!playlist || playlist.length <= 1) {
                    if (customPlaylist && customPlaylist.length > 0) {
                        console.log('[YouTube FM] Song ended, checking custom playlist...');
                        // Wait a moment for UX
                        setTimeout(() => {
                            nextTrack();
                        }, 1000);
                    }
                }
            } catch (e) {
                console.warn('Error in auto-advance logic:', e);
            }
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

    // Auto-skip unplayable videos (100, 101, 150)
    if (event.data === 100 || event.data === 101 || event.data === 150) {
        console.log('[YouTube FM] Unplayable video detected. Removing and skipping in 2s...');
        
        // Try to get title for better UX
        let title = '';
        let trackIndexToRemove = -1;

        // First check if we have it in our custom playlist state
        if (customPlaylistIndex >= 0 && customPlaylistIndex < customPlaylist.length) {
            title = customPlaylist[customPlaylistIndex].title;
            trackIndexToRemove = customPlaylistIndex;
        } 
        // Fallback to player data if available (often not available on error)
        else if (player && player.getVideoData) {
            const data = player.getVideoData();
            if (data && data.title) title = data.title;
        }

        const skipMsg = title ? `REMOVED: ${title}` : 'REMOVING TRACK...';
        elements.statusText.textContent = 'ERROR/REMOVE'; 
        elements.trackTitle.textContent = skipMsg; // Show full info in the scrolling text area
        
        // Clear any existing skip timer just in case
        if (window.skipTimer) clearTimeout(window.skipTimer);
        
        window.skipTimer = setTimeout(() => {
            console.log('[YouTube FM] Removing track and playing next.');
            
            if (trackIndexToRemove !== -1) {
                // Remove from playlist
                customPlaylist.splice(trackIndexToRemove, 1);
                
                // If we removed the last item, we need to loop to start or just stop
                if (customPlaylist.length === 0) {
                    customPlaylistIndex = -1;
                    stopVideo();
                    renderPlaylist();
                    savePlaylist();
                    elements.trackTitle.textContent = 'PLAYLIST EMPTY';
                    return;
                }

                // If we removed the last item in the list, loop to 0
                if (trackIndexToRemove >= customPlaylist.length) {
                    customPlaylistIndex = 0;
                } else {
                    // Otherwise, the next track is now at the same index
                    customPlaylistIndex = trackIndexToRemove;
                }
                
                savePlaylist();
                renderPlaylist();
                
                // Play the track at the new/same index
                playCustomTrack(customPlaylistIndex);
            } else {
                // Fallback if not in custom playlist mode
                nextTrack();
            }
        }, 2000);
    }
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
// elements.addToPlaylistBtn removed
elements.clearPlaylistBtn.addEventListener('click', clearPlaylist);

console.log('[YouTube FM] Initialization complete');
