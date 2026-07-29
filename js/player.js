/**
 * =========================================
 * PLAYER.JS
 * Version 4.2.0 - Audio Player Logic
 * =========================================
 * Semua logika player untuk Ngaos Al Falah Ploso
 */

const Player = {
    // State variables
    audio: null,
    isPlaying: false,
    timerInterval: null,
    secondsElapsed: 0,
    speedIndex: 0,
    errorHandled: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    // Speed options
    speeds: CONSTANTS.PLAYBACK_SPEEDS || [1.0, 1.25, 1.5, 2.0],

    // DOM elements
    elements: {
        playBtn: null,
        playIcon: null,
        albumArt: null,
        dotLive: null,
        statusIndicator: null,
        streamTime: null,
        speedDisplay: null,
        btnLogout: null,
        btnRewind: null,
        btnForward: null,
        userDisplay: null,
        appTitle: null,
        appSub: null,
    },

    /**
     * Inisialisasi player
     */
    init: function() {
        try {
            // 1. PROTEKSI AKSES HALAMAN (WAJIB LOGIN)
            if (typeof Auth !== 'undefined' && !Auth.isSessionValid()) {
                window.location.href = CONFIG.LOGIN_PAGE || 'index.html';
                return false;
            }

            // 2. Cache DOM elements
            this.cacheElements();

            // 3. Setup event listeners
            this.setupEventListeners();

            // 4. Load user info
            this.loadUserInfo();

            // 5. Load config info
            this.loadConfigInfo();

            // 6. Setup media session API
            this.setupMediaSession();

            // 7. Register service worker
            this.registerServiceWorker();

            console.log('[Player] Initialized successfully');
            return true;
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.init' });
            return false;
        }
    },

    /**
     * Cache semua DOM elements
     */
    cacheElements: function() {
        this.elements = {
            playBtn: DOMUtils.id("playBtn"),
            playIcon: DOMUtils.id("playIcon"),
            albumArt: DOMUtils.id("albumArt"),
            dotLive: DOMUtils.id("dotLive"),
            statusIndicator: DOMUtils.id("statusIndicator"),
            streamTime: DOMUtils.id("streamTime"),
            speedDisplay: DOMUtils.id("speedDisplay"),
            btnLogout: DOMUtils.id("btnLogout"),
            btnRewind: DOMUtils.id("btnRewind"),
            btnForward: DOMUtils.id("btnForward"),
            userDisplay: DOMUtils.id("userDisplay"),
            appTitle: DOMUtils.id("appTitle"),
            appSub: DOMUtils.id("appSub"),
        };
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        }

        if (this.elements.btnLogout) {
            this.elements.btnLogout.addEventListener('click', () => this.handleLogout());
        }

        // Setup dual-action buttons
        if (this.elements.btnRewind) {
            this.setupDualActionButton(this.elements.btnRewind, 
                () => this.resetSpeed(),
                () => this.rewind30Seconds()
            );
        }

        if (this.elements.btnForward) {
            this.setupDualActionButton(this.elements.btnForward,
                () => this.changeSpeed(),
                () => this.liveSync()
            );
        }
    },

    /**
     * Load user info dari session
     */
    loadUserInfo: function() {
        try {
            if (!this.elements.userDisplay) return;

            const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
            if (session && session.username) {
                this.elements.userDisplay.textContent = session.username;
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.loadUserInfo' });
        }
    },

    /**
     * Load config info
     */
    loadConfigInfo: function() {
        try {
            if (typeof CONFIG === 'undefined') return;

            if (CONFIG.APP_NAME && this.elements.appTitle) {
                this.elements.appTitle.textContent = CONFIG.APP_NAME;
            }

            if (CONFIG.APP_DESC && this.elements.appSub) {
                this.elements.appSub.textContent = CONFIG.APP_DESC;
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.loadConfigInfo' });
        }
    },

    /**
     * Setup Media Session API untuk kontrol lock screen
     */
    setupMediaSession: function() {
        try {
            if (!('mediaSession' in navigator)) return;

            navigator.mediaSession.metadata = new MediaMetadata({
                title: CONFIG.APP_NAME || 'Ngaos Al Falah Ploso',
                artist: CONFIG.APP_DESC || 'Tafsir Jalalain & Shahih Bukhari',
                album: 'Al Falah Ploso Kediri',
                artwork: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('stop', () => this.stopStreaming());
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.setupMediaSession' });
        }
    },

    /**
     * Toggle play/stop
     */
    togglePlay: function() {
        try {
            if (this.isPlaying) {
                this.stopStreaming();
            } else {
                this.startStreaming();
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.togglePlay' });
        }
    },

    /**
     * Mulai streaming
     */
    startStreaming: function() {
        try {
            if (this.elements.statusIndicator) {
                this.elements.statusIndicator.textContent = "MENGHUBUNGKAN...";
            }

            // Destroy old audio object
            if (this.audio) {
                this.audio.pause();
                this.audio.src = "";
                this.audio = null;
            }

            // Get stream URL from config
            const streamUrl = (typeof CONFIG !== 'undefined' && CONFIG.STREAM_URL)
                ? CONFIG.STREAM_URL
                : CONSTANTS.STREAM.URL;

            // Create new audio with cache busting
            this.audio = new Audio(streamUrl + (CONSTANTS.STREAM.CACHE_QUERY ? "?cb=" + Date.now() : ""));
            this.audio.crossOrigin = "anonymous";
            this.audio.playbackRate = this.speeds[this.speedIndex];

            // Reset error flag
            this.errorHandled = false;
            this.reconnectAttempts = 0;

            // Try to play
            this.audio.play()
                .then(() => this.handlePlaySuccess())
                .catch(err => this.handlePlayError(err));

            // Setup error handler
            this.audio.onerror = () => this.handleAudioError();
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.startStreaming' });
            this.stopStreaming();
        }
    },

    /**
     * Handle play success
     */
    handlePlaySuccess: function() {
        try {
            this.isPlaying = true;
            if (this.elements.playIcon) this.elements.playIcon.className = "bx bx-pause";
            if (this.elements.playBtn) DOMUtils.addClass(this.elements.playBtn, "playing");
            if (this.elements.albumArt) DOMUtils.addClass(this.elements.albumArt, "playing");
            if (this.elements.dotLive) DOMUtils.addClass(this.elements.dotLive, "active");
            if (this.elements.statusIndicator) this.elements.statusIndicator.textContent = "SIARAN LIVE";

            this.startTimer();

            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = "playing";
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.handlePlaySuccess' });
        }
    },

    /**
     * Handle play error
     */
    handlePlayError: function(error) {
        try {
            if (!this.errorHandled) {
                this.errorHandled = true;
                ErrorLogger.log(error, { action: 'Player.handlePlayError' });
                this.stopStreaming();
                if (this.elements.statusIndicator) {
                    this.elements.statusIndicator.textContent = "GAGAL TERHUBUNG";
                }
            }
        } catch (err) {
            ErrorLogger.log(err, { action: 'Player.handlePlayError' });
        }
    },

    /**
     * Handle audio error dan auto-reconnect
     */
    handleAudioError: function() {
        try {
            if (!this.isPlaying || this.errorHandled) return;

            this.reconnectAttempts++;

            // Stop jika sudah mencoba terlalu banyak kali
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.errorHandled = true;
                if (this.elements.statusIndicator) {
                    this.elements.statusIndicator.textContent = "KONEKSI GAGAL";
                }
                this.stopStreaming();
                return;
            }

            if (this.elements.statusIndicator) {
                this.elements.statusIndicator.textContent = `MENYAMBUNG KEMBALI (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`;
            }

            // Auto-reconnect dengan delay
            setTimeout(() => {
                if (this.isPlaying) {
                    this.startStreaming();
                }
            }, CONSTANTS.UI.RECONNECT_DELAY);
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.handleAudioError' });
        }
    },

    /**
     * Stop streaming
     */
    stopStreaming: function() {
        try {
            if (this.audio) {
                this.audio.pause();
                this.audio.src = "";
                this.audio = null;
            }

            this.isPlaying = false;
            if (this.elements.playIcon) this.elements.playIcon.className = "bx bx-play";
            if (this.elements.playBtn) DOMUtils.removeClass(this.elements.playBtn, "playing");
            if (this.elements.albumArt) DOMUtils.removeClass(this.elements.albumArt, "playing");
            if (this.elements.dotLive) DOMUtils.removeClass(this.elements.dotLive, "active");
            if (this.elements.statusIndicator) this.elements.statusIndicator.textContent = "OFFLINE";

            this.stopTimer();

            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = "none";
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.stopStreaming' });
        }
    },

    /**
     * Start timer
     */
    startTimer: function() {
        this.stopTimer();
        this.secondsElapsed = 0;
        this.timerInterval = setInterval(() => {
            this.secondsElapsed++;
            if (this.elements.streamTime) {
                this.elements.streamTime.textContent = FormatUtils.formatTime(this.secondsElapsed);
            }
        }, 1000);
    },

    /**
     * Stop timer
     */
    stopTimer: function() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.elements.streamTime) {
            this.elements.streamTime.textContent = "0:00";
        }
    },

    /**
     * Setup dual-action button (click vs hold)
     */
    setupDualActionButton: function(element, clickAction, holdAction) {
        try {
            let holdTimer = null;
            let isHeld = false;

            const onStart = () => {
                isHeld = false;
                holdTimer = setTimeout(() => {
                    isHeld = true;
                    if (holdAction) holdAction();
                }, CONSTANTS.UI.TOUCH_HOLD_DURATION);
            };

            const onEnd = (e) => {
                clearTimeout(holdTimer);
                if (!isHeld) {
                    if (e.type === 'touchend') e.preventDefault();
                    if (clickAction) clickAction();
                }
            };

            element.addEventListener('mousedown', onStart);
            element.addEventListener('mouseup', onEnd);
            element.addEventListener('touchstart', onStart, { passive: true });
            element.addEventListener('touchend', onEnd, { passive: true });
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.setupDualActionButton' });
        }
    },

    /**
     * Reset kecepatan playback
     */
    resetSpeed: function() {
        try {
            this.speedIndex = 0;
            if (this.audio) this.audio.playbackRate = this.speeds[this.speedIndex];
            this.updateSpeedUI();
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.resetSpeed' });
        }
    },

    /**
     * Change kecepatan playback
     */
    changeSpeed: function() {
        try {
            this.speedIndex = (this.speedIndex + 1) % this.speeds.length;
            if (this.audio) this.audio.playbackRate = this.speeds[this.speedIndex];
            this.updateSpeedUI();
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.changeSpeed' });
        }
    },

    /**
     * Update speed UI
     */
    updateSpeedUI: function() {
        if (this.elements.speedDisplay) {
            this.elements.speedDisplay.textContent = this.speeds[this.speedIndex] + "x";
        }
    },

    /**
     * Rewind 30 detik
     */
    rewind30Seconds: function() {
        try {
            if (this.audio && this.isPlaying) {
                this.audio.currentTime = Math.max(0, this.audio.currentTime - 30);
                if (this.elements.statusIndicator) {
                    this.elements.statusIndicator.textContent = "↩ REPLAY 30s";
                    setTimeout(() => {
                        if (this.isPlaying && this.elements.statusIndicator) {
                            this.elements.statusIndicator.textContent = "SIARAN LIVE";
                        }
                    }, 2000);
                }
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.rewind30Seconds' });
        }
    },

    /**
     * Live sync / catch-up
     */
    liveSync: function() {
        try {
            if (this.isPlaying) {
                this.speedIndex = 0;
                this.updateSpeedUI();
                this.startStreaming();
                if (this.elements.statusIndicator) {
                    this.elements.statusIndicator.textContent = "⚡ CATCH-UP LIVE";
                }
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.liveSync' });
        }
    },

    /**
     * Handle logout
     */
    handleLogout: function() {
        try {
            if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
                this.stopStreaming();
                if (typeof Auth !== 'undefined') {
                    Auth.logout();
                } else {
                    StorageHelper.removeItem("radio_session");
                    window.location.href = "index.html";
                }
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.handleLogout' });
        }
    },

    /**
     * Register service worker
     */
    registerServiceWorker: function() {
        try {
            if (!('serviceWorker' in navigator)) return;

            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('[Player] Service Worker registered:', reg))
                    .catch(err => ErrorLogger.log(err, { action: 'ServiceWorker.register' }));
            });
        } catch (error) {
            ErrorLogger.log(error, { action: 'Player.registerServiceWorker' });
        }
    }
};

// Auto-initialize ketika DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Player.init());
} else {
    Player.init();
}
