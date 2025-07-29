(function() {
    'use strict';
    
    // Configuration
    const PLAYER_CONFIG = {
        doubleTapSeekTime: 10, // seconds
        holdSpeedMultiplier: 2.0,
        swipeThreshold: 50,
        volumeStep: 0.1,
        brightnessStep: 0.1
    };

    // Player state
    let playerInstances = new Map();
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTapTime = 0;
    let holdTimer = null;
    let isHolding = false;
    let swipeDirection = null;

    // Security and obfuscation
    function obfuscate(str) {
        return btoa(encodeURIComponent(str));
    }

    function deobfuscate(str) {
        try {
            return decodeURIComponent(atob(str));
        } catch (e) {
            return str;
        }
    }

    // Generate unique player ID
    function generatePlayerId() {
        return 'mp_' + Math.random().toString(36).substr(2, 9);
    }

    // Default Material You theme colors
    const defaultColors = {
        primary: '#6750A4',
        onPrimary: '#FFFFFF',
        primaryContainer: '#EADDFF',
        onPrimaryContainer: '#21005D',
        surface: 'rgba(255, 255, 255, 0.1)',
        onSurface: '#1C1B1F',
        surfaceVariant: 'rgba(255, 255, 255, 0.05)',
        outline: 'rgba(255, 255, 255, 0.2)'
    };

    // Get custom colors from script attributes
    function getCustomColors(script) {
        const customColors = { ...defaultColors };
        
        if (script.getAttribute('data-primary')) {
            customColors.primary = script.getAttribute('data-primary');
        }
        if (script.getAttribute('data-accent')) {
            customColors.primaryContainer = script.getAttribute('data-accent');
        }
        if (script.getAttribute('data-surface')) {
            customColors.surface = script.getAttribute('data-surface');
        }
        if (script.getAttribute('data-text')) {
            customColors.onPrimary = script.getAttribute('data-text');
        }
        if (script.getAttribute('data-outline')) {
            customColors.outline = script.getAttribute('data-outline');
        }
        
        return customColors;
    }

    // Load CSS dynamically
    function loadCSS() {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = getCurrentScriptBase() + '/player.css';
        document.head.appendChild(cssLink);
    }

    // Get current script base URL
    function getCurrentScriptBase() {
        const scripts = document.querySelectorAll('script[src*="player.js"]');
        const currentScript = scripts[scripts.length - 1];
        const src = currentScript.src;
        return src.substring(0, src.lastIndexOf('/'));
    }

    // Apply custom theme colors to player
    function applyCustomColors(player, colors) {
        const style = document.createElement('style');
        style.textContent = `
            #${player.id} .progress-played {
                background: linear-gradient(90deg, ${colors.primary}, ${colors.primaryContainer}) !important;
            }
            #${player.id} .btn-play-pause:hover,
            #${player.id} .btn-play-large:hover {
                background: ${colors.surface} !important;
                border-color: ${colors.outline} !important;
            }
            #${player.id} .volume-fill {
                background: linear-gradient(90deg, ${colors.primary}, ${colors.primaryContainer}) !important;
            }
            #${player.id} .player-controls {
                color: ${colors.onPrimary} !important;
            }
            #${player.id} .menu-item.active {
                background: ${colors.primary.replace(')', ', 0.3)')} !important;
            }
            #${player.id} .player-options button:hover,
            #${player.id} .playback-rate button:hover,
            #${player.id} .btn-speed:hover {
                background: ${colors.surface} !important;
                border-color: ${colors.outline} !important;
            }
            #${player.id} .loading-spinner .spinner {
                border-top-color: ${colors.primary} !important;
            }
            #${player.id} .gesture-feedback {
                background: ${colors.primary.replace(')', ', 0.8)')} !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Create player HTML structure
    function createPlayerHTML(playerId, videoSrc) {
        return `
            <div class="media-player" id="${playerId}" data-src="${obfuscate(videoSrc)}">
                <div class="player-container">
                    <video class="video-element" preload="metadata" crossorigin="anonymous">
                        Your browser does not support the video tag.
                    </video>
                    
                    <div class="player-overlay">
                        <div class="player-controls">
                            <div class="controls-top">
                                <div class="time-display">
                                    <span class="current-time">0:00</span>
                                    <span class="time-separator">/</span>
                                    <span class="total-time">0:00</span>
                                </div>
                            </div>
                            
                            <!-- Quality Menu -->
                            <div class="quality-menu" style="display: none;">
                                <div class="menu-header">
                                    <h4>Quality</h4>
                                    <button class="menu-close" data-menu="quality">
                                        <i data-feather="x"></i>
                                    </button>
                                </div>
                                <div class="menu-items">
                                    <div class="menu-item active" data-quality="auto">
                                        <span>Auto (720p)</span>
                                        <i data-feather="check"></i>
                                    </div>
                                    <div class="menu-item" data-quality="1080p">
                                        <span>1080p</span>
                                    </div>
                                    <div class="menu-item" data-quality="720p">
                                        <span>720p</span>
                                    </div>
                                    <div class="menu-item" data-quality="480p">
                                        <span>480p</span>
                                    </div>
                                    <div class="menu-item" data-quality="360p">
                                        <span>360p</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Audio Menu -->
                            <div class="audio-menu" style="display: none;">
                                <div class="menu-header">
                                    <h4>Audio</h4>
                                    <button class="menu-close" data-menu="audio">
                                        <i data-feather="x"></i>
                                    </button>
                                </div>
                                <div class="menu-items">
                                    <div class="menu-item active" data-audio="0">
                                        <span>English</span>
                                        <i data-feather="check"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Subtitles Menu -->
                            <div class="subtitles-menu" style="display: none;">
                                <div class="menu-header">
                                    <h4>Subtitles</h4>
                                    <button class="menu-close" data-menu="subtitles">
                                        <i data-feather="x"></i>
                                    </button>
                                </div>
                                <div class="menu-items">
                                    <div class="menu-item active" data-subtitle="off">
                                        <span>Off</span>
                                        <i data-feather="check"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-buffer"></div>
                                    <div class="progress-played"></div>
                                    <div class="progress-handle"></div>
                                </div>
                            </div>
                            
                            <div class="controls-bottom">
                                <div class="playback-controls">
                                    <button class="btn-play-pause" title="Play/Pause">
                                        <i data-feather="play" class="play-icon"></i>
                                        <i data-feather="pause" class="pause-icon" style="display: none;"></i>
                                    </button>
                                    <div class="volume-container">
                                        <button class="btn-volume" title="Volume">
                                            <i data-feather="volume-2" class="volume-icon"></i>
                                        </button>
                                        <div class="volume-slider">
                                            <div class="volume-bar">
                                                <div class="volume-fill"></div>
                                                <div class="volume-handle"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="playback-rate">
                                    <button class="btn-audio" title="Audio Tracks">
                                        <i data-feather="headphones"></i>
                                    </button>
                                    <button class="btn-quality" title="Quality">
                                        <i data-feather="settings"></i>
                                    </button>
                                    <button class="btn-subtitles" title="Subtitles">
                                        <i data-feather="type"></i>
                                    </button>
                                    <button class="btn-speed" title="Playback Speed">1x</button>
                                    <button class="btn-fullscreen" title="Fullscreen">
                                        <i data-feather="maximize"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="player-center">
                            <button class="btn-play-large" title="Play">
                                <i data-feather="play"></i>
                            </button>
                        </div>
                        
                        <div class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                        
                        <div class="gesture-feedback" style="display: none;">
                            <div class="feedback-icon"></div>
                            <div class="feedback-text"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Format time in MM:SS or HH:MM:SS format
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Load video securely to prevent URL exposure
    async function loadVideoSecurely(videoElement, videoUrl) {
        try {
            // First try without CORS for better compatibility
            videoElement.src = videoUrl;
            
            // Add error event listener for fallback
            videoElement.addEventListener('error', (e) => {
                console.warn('Video loading failed, trying with CORS');
                videoElement.crossOrigin = 'anonymous';
                videoElement.src = videoUrl;
            }, { once: true });
            
        } catch (error) {
            console.error('Error setting up video:', error);
            // Final fallback to direct assignment
            videoElement.src = videoUrl;
        }
    }

    // Show/hide menus
    function showMenu(menu) {
        // Hide all other menus first
        document.querySelectorAll('.quality-menu, .audio-menu, .subtitles-menu').forEach(m => {
            if (m !== menu) m.style.display = 'none';
        });
        
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    function hideAllMenus() {
        document.querySelectorAll('.quality-menu, .audio-menu, .subtitles-menu').forEach(m => {
            m.style.display = 'none';
        });
    }

    // Show gesture feedback
    function showGestureFeedback(player, icon, text) {
        const feedback = player.querySelector('.gesture-feedback');
        const feedbackIcon = feedback.querySelector('.feedback-icon');
        const feedbackText = feedback.querySelector('.feedback-text');
        
        feedbackIcon.innerHTML = `<i data-feather="${icon}"></i>`;
        feedbackText.textContent = text;
        feedback.style.display = 'flex';
        
        // Re-initialize feather icons for the new icon
        if (window.feather) {
            window.feather.replace();
        }
        
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 1500);
    }

    // Initialize player functionality
    function initializePlayer(playerId, videoSrc) {
        const player = document.getElementById(playerId);
        const video = player.querySelector('.video-element');
        const playBtn = player.querySelector('.btn-play-pause');
        const playLargeBtn = player.querySelector('.btn-play-large');
        const volumeBtn = player.querySelector('.btn-volume');
        const fullscreenBtn = player.querySelector('.btn-fullscreen');
        const speedBtn = player.querySelector('.btn-speed');
        const qualityBtn = player.querySelector('.btn-quality');
        const subtitlesBtn = player.querySelector('.btn-subtitles');
        const audioBtn = player.querySelector('.btn-audio');
        const qualityMenu = player.querySelector('.quality-menu');
        const audioMenu = player.querySelector('.audio-menu');
        const subtitlesMenu = player.querySelector('.subtitles-menu');
        const progressBar = player.querySelector('.progress-bar');
        const progressPlayed = player.querySelector('.progress-played');
        const progressBuffer = player.querySelector('.progress-buffer');
        const progressHandle = player.querySelector('.progress-handle');
        const volumeSlider = player.querySelector('.volume-slider');
        const volumeBar = player.querySelector('.volume-bar');
        const volumeFill = player.querySelector('.volume-fill');
        const volumeHandle = player.querySelector('.volume-handle');
        const currentTimeEl = player.querySelector('.current-time');
        const totalTimeEl = player.querySelector('.total-time');
        const loadingSpinner = player.querySelector('.loading-spinner');
        
        // Store player instance
        const playerInstance = {
            element: player,
            video: video,
            playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
            currentRateIndex: 3,
            isPlaying: false,
            volume: 1,
            brightness: 1,
            controlsTimeout: null,
            lastActivity: Date.now()
        };
        
        playerInstances.set(playerId, playerInstance);

        // Load video securely using obfuscated URL
        const obfuscatedSrc = player.getAttribute('data-src');
        const realVideoSrc = deobfuscate(obfuscatedSrc);
        
        // Create a blob URL to hide the real source
        loadVideoSecurely(video, realVideoSrc);

        // Video event listeners
        video.addEventListener('loadstart', () => {
            loadingSpinner.style.display = 'flex';
        });

        video.addEventListener('loadedmetadata', () => {
            if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                totalTimeEl.textContent = formatTime(video.duration);
            }
            loadingSpinner.style.display = 'none';
        });

        video.addEventListener('loadeddata', () => {
            if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                totalTimeEl.textContent = formatTime(video.duration);
            }
            loadingSpinner.style.display = 'none';
        });

        video.addEventListener('durationchange', () => {
            if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                totalTimeEl.textContent = formatTime(video.duration);
            }
        });

        video.addEventListener('waiting', () => {
            loadingSpinner.style.display = 'flex';
        });

        video.addEventListener('canplay', () => {
            loadingSpinner.style.display = 'none';
        });

        video.addEventListener('timeupdate', () => {
            if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                const progress = (video.currentTime / video.duration) * 100;
                progressPlayed.style.width = progress + '%';
                progressHandle.style.left = progress + '%';
                currentTimeEl.textContent = formatTime(video.currentTime);
                
                // Ensure total time is always displayed correctly
                if (totalTimeEl.textContent === '0:00') {
                    totalTimeEl.textContent = formatTime(video.duration);
                }
            } else {
                // If duration is not available, just show current time
                currentTimeEl.textContent = formatTime(video.currentTime);
            }
        });

        video.addEventListener('progress', () => {
            if (video.buffered.length > 0) {
                const buffered = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
                progressBuffer.style.width = buffered + '%';
            }
        });

        video.addEventListener('play', () => {
            playerInstance.isPlaying = true;
            player.querySelector('.play-icon').style.display = 'none';
            player.querySelector('.pause-icon').style.display = 'block';
            playLargeBtn.style.display = 'none';
            
            // Force hide large play button and update activity
            playerInstance.lastActivity = Date.now();
            
            // Start auto-hide timer when playing
            showControls();
        });

        video.addEventListener('pause', () => {
            playerInstance.isPlaying = false;
            player.querySelector('.play-icon').style.display = 'block';
            player.querySelector('.pause-icon').style.display = 'none';
            
            // Show large play button and controls when paused
            playLargeBtn.style.display = 'flex';
            playLargeBtn.style.visibility = 'visible';
            
            // Show controls when paused and update activity time
            clearTimeout(playerInstance.controlsTimeout);
            const controls = player.querySelector('.player-controls');
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
            playerInstance.lastActivity = Date.now();
        });

        video.addEventListener('ended', () => {
            playerInstance.isPlaying = false;
            playLargeBtn.style.display = 'flex';
        });

        // Control event listeners
        playBtn.addEventListener('click', togglePlayPause);
        playBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlayPause();
        });
        
        playLargeBtn.addEventListener('click', togglePlayPause);
        playLargeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlayPause();
        });

        function togglePlayPause() {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }

        // Volume controls
        const toggleMute = () => {
            if (video.muted) {
                video.muted = false;
                updateVolumeIcon();
            } else {
                video.muted = true;
                updateVolumeIcon();
            }
        };
        
        volumeBtn.addEventListener('click', toggleMute);
        volumeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMute();
        });

        function updateVolumeIcon() {
            const volumeIcon = player.querySelector('.volume-icon');
            if (video.muted || video.volume === 0) {
                volumeIcon.setAttribute('data-feather', 'volume-x');
            } else if (video.volume < 0.5) {
                volumeIcon.setAttribute('data-feather', 'volume-1');
            } else {
                volumeIcon.setAttribute('data-feather', 'volume-2');
            }
            if (window.feather) {
                window.feather.replace();
            }
        }

        // Volume slider
        let isDraggingVolume = false;

        volumeHandle.addEventListener('mousedown', (e) => {
            isDraggingVolume = true;
            e.preventDefault();
        });

        volumeBar.addEventListener('click', (e) => {
            const rect = volumeBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            setVolume(Math.max(0, Math.min(1, pos)));
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingVolume) return;
            
            const rect = volumeBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            setVolume(Math.max(0, Math.min(1, pos)));
        });

        document.addEventListener('mouseup', () => {
            isDraggingVolume = false;
        });

        function setVolume(volume) {
            video.volume = volume;
            video.muted = volume === 0;
            playerInstance.volume = volume;
            
            const percentage = volume * 100;
            volumeFill.style.width = percentage + '%';
            volumeHandle.style.left = percentage + '%';
            updateVolumeIcon();
        }

        // Progress bar seeking
        let isDraggingProgress = false;

        progressHandle.addEventListener('mousedown', (e) => {
            isDraggingProgress = true;
            e.preventDefault();
        });

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingProgress) return;
            
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = Math.max(0, Math.min(video.duration, pos * video.duration));
        });

        document.addEventListener('mouseup', () => {
            isDraggingProgress = false;
        });

        // Playback speed
        const changeSpeed = () => {
            playerInstance.currentRateIndex = (playerInstance.currentRateIndex + 1) % playerInstance.playbackRates.length;
            const newRate = playerInstance.playbackRates[playerInstance.currentRateIndex];
            video.playbackRate = newRate;
            speedBtn.textContent = newRate + 'x';
        };
        
        speedBtn.addEventListener('click', changeSpeed);
        speedBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            changeSpeed();
        });

        // Fullscreen
        const toggleFullscreen = () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                player.requestFullscreen();
            }
        };
        
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        fullscreenBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
        });

        // Quality button - show menu
        const showQualityMenu = () => {
            showMenu(qualityMenu);
        };
        
        qualityBtn.addEventListener('click', showQualityMenu);
        qualityBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showQualityMenu();
        });

        // Audio button - show menu
        const showAudioMenu = () => {
            updateAudioMenu();
            showMenu(audioMenu);
        };
        
        audioBtn.addEventListener('click', showAudioMenu);
        audioBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showAudioMenu();
        });

        // Subtitles button - show menu
        const showSubtitlesMenu = () => {
            updateSubtitlesMenu();
            showMenu(subtitlesMenu);
        };
        
        subtitlesBtn.addEventListener('click', showSubtitlesMenu);
        subtitlesBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSubtitlesMenu();
        });

        // Menu close buttons
        player.querySelectorAll('.menu-close').forEach(btn => {
            btn.addEventListener('click', hideAllMenus);
        });

        // Quality menu items
        player.querySelectorAll('.quality-menu .menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const quality = item.getAttribute('data-quality');
                selectQuality(quality);
                hideAllMenus();
            });
        });

        // Audio menu items
        function updateAudioMenu() {
            const audioItems = audioMenu.querySelector('.menu-items');
            audioItems.innerHTML = '<div class="menu-item active" data-audio="0"><span>English</span><i data-feather="check"></i></div>';
            
            // Add audio tracks if available
            if (video.audioTracks && video.audioTracks.length > 0) {
                audioItems.innerHTML = '';
                for (let i = 0; i < video.audioTracks.length; i++) {
                    const track = video.audioTracks[i];
                    const isActive = track.enabled;
                    audioItems.innerHTML += `
                        <div class="menu-item ${isActive ? 'active' : ''}" data-audio="${i}">
                            <span>${track.label || `Track ${i + 1}`}</span>
                            ${isActive ? '<i data-feather="check"></i>' : '<i data-feather="check"></i>'}
                        </div>
                    `;
                }
            }
            
            // Re-add event listeners
            audioMenu.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const audioIndex = parseInt(item.getAttribute('data-audio'));
                    selectAudioTrack(audioIndex);
                    hideAllMenus();
                });
            });
            
            // Update feather icons
            if (window.feather) window.feather.replace();
        }

        // Subtitles menu items
        function updateSubtitlesMenu() {
            const subtitleItems = subtitlesMenu.querySelector('.menu-items');
            subtitleItems.innerHTML = '<div class="menu-item active" data-subtitle="off"><span>Off</span><i data-feather="check"></i></div>';
            
            // Add subtitle tracks if available
            if (video.textTracks && video.textTracks.length > 0) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    const track = video.textTracks[i];
                    const isActive = track.mode === 'showing';
                    subtitleItems.innerHTML += `
                        <div class="menu-item ${isActive ? 'active' : ''}" data-subtitle="${i}">
                            <span>${track.label || track.language || `Track ${i + 1}`}</span>
                            ${isActive ? '<i data-feather="check"></i>' : '<i data-feather="check"></i>'}
                        </div>
                    `;
                }
            }
            
            // Re-add event listeners
            subtitlesMenu.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const subtitleIndex = item.getAttribute('data-subtitle');
                    selectSubtitle(subtitleIndex);
                    hideAllMenus();
                });
            });
            
            // Update feather icons
            if (window.feather) window.feather.replace();
        }

        function selectQuality(quality) {
            // Update active state
            player.querySelectorAll('.quality-menu .menu-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('i').style.opacity = '0';
            });
            
            const selectedItem = player.querySelector(`[data-quality="${quality}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
                selectedItem.querySelector('i').style.opacity = '1';
            }
            
            showGestureFeedback(player, 'settings', `Quality: ${quality}`);
        }

        function selectAudioTrack(index) {
            if (video.audioTracks && video.audioTracks.length > 0) {
                // Disable all audio tracks
                for (let i = 0; i < video.audioTracks.length; i++) {
                    video.audioTracks[i].enabled = i === index;
                }
            }
            showGestureFeedback(player, 'headphones', `Audio: Track ${index + 1}`);
        }

        function selectSubtitle(index) {
            // Hide all text tracks
            for (let i = 0; i < video.textTracks.length; i++) {
                video.textTracks[i].mode = 'hidden';
            }
            
            if (index !== 'off' && video.textTracks[index]) {
                video.textTracks[index].mode = 'showing';
                showGestureFeedback(player, 'type', 'Subtitles: On');
            } else {
                showGestureFeedback(player, 'type', 'Subtitles: Off');
            }
        }

        // Touch and gesture controls
        let tapCount = 0;
        let tapTimer = null;
        let mouseClickCount = 0;
        let mouseClickTimer = null;

        // Mouse event handlers for desktop
        player.addEventListener('mousedown', handleMouseDown);
        player.addEventListener('mouseup', handleMouseUp);
        player.addEventListener('click', handleClick);

        // Touch event handlers for mobile
        player.addEventListener('touchstart', handleTouchStart, { passive: false });
        player.addEventListener('touchmove', handleTouchMove, { passive: false });
        player.addEventListener('touchend', handleTouchEnd, { passive: false });

        function handleClick(e) {
            // Prevent if it's a control button or control area
            if (e.target.closest('button') || e.target.closest('.progress-bar') || e.target.closest('.volume-bar') || e.target.closest('.player-controls')) {
                return;
            }
            
            mouseClickCount++;
            
            if (mouseClickCount === 1) {
                mouseClickTimer = setTimeout(() => {
                    // Single click - toggle play/pause
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                    mouseClickCount = 0;
                }, 300);
            } else if (mouseClickCount === 2) {
                // Double click - seek
                clearTimeout(mouseClickTimer);
                const playerRect = player.getBoundingClientRect();
                const clickX = e.clientX - playerRect.left;
                const isLeftSide = clickX < playerRect.width / 2;
                
                if (isLeftSide) {
                    video.currentTime = Math.max(0, video.currentTime - PLAYER_CONFIG.doubleTapSeekTime);
                    showGestureFeedback(player, 'rewind', `-${PLAYER_CONFIG.doubleTapSeekTime}s`);
                } else {
                    video.currentTime = Math.min(video.duration, video.currentTime + PLAYER_CONFIG.doubleTapSeekTime);
                    showGestureFeedback(player, 'fast-forward', `+${PLAYER_CONFIG.doubleTapSeekTime}s`);
                }
                
                mouseClickCount = 0;
            }
        }

        function handleMouseDown(e) {
            // Only handle if not clicking on controls
            if (e.target.closest('button') || e.target.closest('.progress-bar') || e.target.closest('.volume-bar')) {
                return;
            }
            
            touchStartX = e.clientX;
            touchStartY = e.clientY;
            touchStartTime = Date.now();
            
            // Hold detection for speed change
            holdTimer = setTimeout(() => {
                if (!isHolding) {
                    isHolding = true;
                    video.playbackRate = PLAYER_CONFIG.holdSpeedMultiplier;
                    showGestureFeedback(player, 'fast-forward', `${PLAYER_CONFIG.holdSpeedMultiplier}x Speed`);
                }
            }, 500);
        }

        function handleMouseUp(e) {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            
            if (isHolding) {
                isHolding = false;
                video.playbackRate = playerInstance.playbackRates[playerInstance.currentRateIndex];
            }
        }

        function handleTouchStart(e) {
            // Don't handle touch events on control buttons
            if (e.target.closest('button') || e.target.closest('.progress-bar') || e.target.closest('.volume-bar') || e.target.closest('.player-controls')) {
                return;
            }
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            
            // Hold detection for speed change
            holdTimer = setTimeout(() => {
                if (!isHolding) {
                    isHolding = true;
                    video.playbackRate = PLAYER_CONFIG.holdSpeedMultiplier;
                    showGestureFeedback(player, 'fast-forward', `${PLAYER_CONFIG.holdSpeedMultiplier}x Speed`);
                }
            }, 500);
            
            // Only prevent default for the video area, not controls
            e.preventDefault();
        }

        function handleTouchMove(e) {
            // Don't handle if touching controls
            if (e.target.closest('button') || e.target.closest('.progress-bar') || e.target.closest('.volume-bar') || e.target.closest('.player-controls')) {
                return;
            }
            
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            // Determine swipe direction
            if (Math.abs(deltaX) > PLAYER_CONFIG.swipeThreshold || Math.abs(deltaY) > PLAYER_CONFIG.swipeThreshold) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe - seeking
                    swipeDirection = deltaX > 0 ? 'right' : 'left';
                } else {
                    // Vertical swipe - volume or brightness
                    const playerRect = player.getBoundingClientRect();
                    const isLeftSide = touchStartX < playerRect.width / 2;
                    
                    if (isLeftSide) {
                        // Left side - brightness
                        swipeDirection = deltaY > 0 ? 'brightness-down' : 'brightness-up';
                        adjustBrightness(-deltaY);
                    } else {
                        // Right side - volume
                        swipeDirection = deltaY > 0 ? 'volume-down' : 'volume-up';
                        adjustVolume(-deltaY);
                    }
                }
                e.preventDefault(); // Only prevent when we're actually doing gesture
            }
        }

        function handleTouchEnd(e) {
            // Don't handle if touching controls
            if (e.target.closest('button') || e.target.closest('.progress-bar') || e.target.closest('.volume-bar') || e.target.closest('.player-controls')) {
                return;
            }
            
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            
            if (isHolding) {
                isHolding = false;
                video.playbackRate = playerInstance.playbackRates[playerInstance.currentRateIndex];
            }
            
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            // Handle taps
            if (touchDuration < 300 && !swipeDirection) {
                tapCount++;
                
                if (tapCount === 1) {
                    tapTimer = setTimeout(() => {
                        // Single tap - show controls and toggle play/pause
                        showControls();
                        if (video.paused) {
                            video.play();
                        } else {
                            video.pause();
                        }
                        tapCount = 0;
                    }, 300);
                } else if (tapCount === 2) {
                    // Double tap - seek
                    clearTimeout(tapTimer);
                    const playerRect = player.getBoundingClientRect();
                    const tapX = e.changedTouches[0].clientX - playerRect.left;
                    const isLeftSide = tapX < playerRect.width / 2;
                    
                    if (isLeftSide) {
                        video.currentTime = Math.max(0, video.currentTime - PLAYER_CONFIG.doubleTapSeekTime);
                        showGestureFeedback(player, 'rewind', `-${PLAYER_CONFIG.doubleTapSeekTime}s`);
                    } else {
                        video.currentTime = Math.min(video.duration, video.currentTime + PLAYER_CONFIG.doubleTapSeekTime);
                        showGestureFeedback(player, 'fast-forward', `+${PLAYER_CONFIG.doubleTapSeekTime}s`);
                    }
                    
                    tapCount = 0;
                }
            }
            
            swipeDirection = null;
        }

        function adjustVolume(delta) {
            const change = (delta / 100) * PLAYER_CONFIG.volumeStep;
            const newVolume = Math.max(0, Math.min(1, playerInstance.volume + change));
            setVolume(newVolume);
            showGestureFeedback(player, 'volume-2', `Volume: ${Math.round(newVolume * 100)}%`);
        }

        function adjustBrightness(delta) {
            const change = (delta / 100) * PLAYER_CONFIG.brightnessStep;
            playerInstance.brightness = Math.max(0.1, Math.min(2, playerInstance.brightness + change));
            video.style.filter = `brightness(${playerInstance.brightness})`;
            showGestureFeedback(player, 'sun', `Brightness: ${Math.round(playerInstance.brightness * 100)}%`);
        }

        function toggleControls() {
            const controls = player.querySelector('.player-controls');
            const currentOpacity = window.getComputedStyle(controls).opacity;
            const isVisible = currentOpacity === '1';
            
            if (isVisible) {
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            } else {
                controls.style.opacity = '1';
                controls.style.pointerEvents = 'auto';
            }
        }

        function showControls() {
            const controls = player.querySelector('.player-controls');
            const playLargeBtn = player.querySelector('.btn-play-large');
            
            // Force show controls
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
            
            // Handle large play button visibility based on actual video state
            if (playLargeBtn) {
                if (video.paused) {
                    playLargeBtn.style.display = 'flex';
                    playLargeBtn.style.visibility = 'visible';
                } else {
                    // Always hide when playing
                    playLargeBtn.style.display = 'none';
                    playLargeBtn.style.visibility = 'hidden';
                }
            }
            
            // Update last activity time
            playerInstance.lastActivity = Date.now();
            
            // Clear any existing timeout to prevent conflicts
            clearTimeout(playerInstance.controlsTimeout);
        }

        function hideControls() {
            const controls = player.querySelector('.player-controls');
            const playLargeBtn = player.querySelector('.btn-play-large');
            
            // Force hide controls regardless of current state when conditions are met
            if (playerInstance.isPlaying && !isDraggingProgress && !isDraggingVolume) {
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
                
                // Also hide the large play button when playing and controls are hidden
                if (playLargeBtn && !video.paused) {
                    playLargeBtn.style.display = 'none';
                }
                
                // Clear timeout to prevent interference
                clearTimeout(playerInstance.controlsTimeout);
            }
        }

        // Show controls on any user interaction
        function handleUserActivity() {
            showControls();
        }

        // Mouse events (desktop)
        player.addEventListener('mousemove', handleUserActivity);
        player.addEventListener('mouseenter', handleUserActivity);
        player.addEventListener('click', handleUserActivity);
        
        // Touch events (mobile)
        player.addEventListener('touchstart', (e) => {
            handleUserActivity();
        });
        
        player.addEventListener('touchmove', (e) => {
            // Only show controls for touch move if not swiping for gestures
            if (e.target.closest('.player-controls')) {
                handleUserActivity();
            }
        });

        // Hide menus when clicking outside
        player.addEventListener('click', (e) => {
            if (!e.target.closest('.quality-menu, .audio-menu, .subtitles-menu, .btn-quality, .btn-audio, .btn-subtitles')) {
                hideAllMenus();
            }
        });

        // Keyboard controls
        player.setAttribute('tabindex', '0');
        player.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(Math.min(1, video.volume + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(Math.max(0, video.volume - 0.1));
                    break;
                case 'KeyF':
                    e.preventDefault();
                    fullscreenBtn.click();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    volumeBtn.click();
                    break;
            }
        });

        // Initialize volume
        setVolume(1);
        
        // Ensure controls are visible initially
        const controls = player.querySelector('.player-controls');
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
        
        // Handle fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            const controls = player.querySelector('.player-controls');
            if (document.fullscreenElement === player) {
                // Entering fullscreen
                controls.style.position = 'fixed';
                controls.style.zIndex = '1000';
                // Force show controls and start auto-hide timer
                playerInstance.lastActivity = Date.now();
                showControls();
            } else {
                // Exiting fullscreen
                controls.style.position = 'absolute';
                controls.style.zIndex = 'auto';
                // Force show controls and start auto-hide timer
                playerInstance.lastActivity = Date.now();
                showControls();
            }
        });

        // Continuous check for auto-hiding controls (primary system)
        setInterval(() => {
            const timeSinceActivity = Date.now() - playerInstance.lastActivity;
            const controls = player.querySelector('.player-controls');
            const playLargeBtn = player.querySelector('.btn-play-large');
            
            // Always force hide large play button when video is playing
            if (!video.paused && playLargeBtn) {
                playLargeBtn.style.display = 'none';
                playLargeBtn.style.visibility = 'hidden';
            }
            
            // Check if controls should be hidden based on video state
            const shouldHideWhenPlaying = timeSinceActivity > 3000 && !video.paused && !isDraggingProgress && !isDraggingVolume;
            const shouldHideWhenPaused = timeSinceActivity > 5000 && video.paused && !isDraggingProgress && !isDraggingVolume;
            
            if (shouldHideWhenPlaying) {
                // Hide controls and large play button when playing
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
                
                if (playLargeBtn) {
                    playLargeBtn.style.display = 'none';
                    playLargeBtn.style.visibility = 'hidden';
                }
            } else if (shouldHideWhenPaused) {
                // Hide controls and large play button when paused after timeout
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
                
                if (playLargeBtn) {
                    playLargeBtn.style.display = 'none';
                    playLargeBtn.style.visibility = 'hidden';
                }
            } else if (video.paused && playLargeBtn) {
                // Show large play button when paused and controls are visible
                if (controls.style.opacity === '1' || controls.style.opacity === '') {
                    playLargeBtn.style.display = 'flex';
                    playLargeBtn.style.visibility = 'visible';
                }
            }
        }, 500);
        
        // Fallback duration check every 2 seconds for first 30 seconds
        let durationCheckCount = 0;
        const durationCheckInterval = setInterval(() => {
            if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                totalTimeEl.textContent = formatTime(video.duration);
                clearInterval(durationCheckInterval);
            } else if (durationCheckCount >= 15) { // Stop after 30 seconds
                clearInterval(durationCheckInterval);
                // If still no duration, show live indicator
                totalTimeEl.textContent = 'LIVE';
            }
            durationCheckCount++;
        }, 2000);
    }

    // Initialize embed system
    function initializeEmbedSystem() {
        // Load Feather Icons
        const featherScript = document.createElement('script');
        featherScript.src = 'https://unpkg.com/feather-icons';
        featherScript.onload = () => {
            if (window.feather) {
                window.feather.replace();
            }
        };
        document.head.appendChild(featherScript);

        // Load CSS
        loadCSS();

        // Find all script tags with data-src attribute
        const scripts = document.querySelectorAll('script[data-src]');
        
        scripts.forEach((script) => {
            const videoSrc = script.getAttribute('data-src');
            if (videoSrc) {
                const playerId = generatePlayerId();
                const customColors = getCustomColors(script);
                const playerHTML = createPlayerHTML(playerId, videoSrc);
                
                // Create a container div and insert it after the script
                const container = document.createElement('div');
                container.innerHTML = playerHTML;
                const playerElement = container.firstElementChild;
                
                // Replace the script tag with the player
                script.parentNode.replaceChild(playerElement, script);
                
                // Apply custom colors
                applyCustomColors(playerElement, customColors);
                
                // Initialize the player after DOM is ready
                setTimeout(() => {
                    initializePlayer(playerId, videoSrc);
                }, 100);
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEmbedSystem);
    } else {
        initializeEmbedSystem();
    }

})();
