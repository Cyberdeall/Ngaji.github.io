/**
 * =========================================
 * PLAYER.JS
 * Version 4.4.0 - Engine Preserved & Media Visualizer Integrated
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
    speeds: (typeof CONSTANTS !== 'undefined' && CONSTANTS.PLAYBACK_SPEEDS) 
            ? CONSTANTS.PLAYBACK_SPEEDS 
            : [1.0, 1.25, 1.5, 2.0],

    // DOM elements
    elements: {},

    /**
     * Inisialisasi player
     */
    init: function() {
        try {
            // 1. PROTEKSI AKSES HALAMAN (WAJIB LOGIN)
            if (typeof Auth !== 'undefined' && typeof Auth.isSessionValid === 'function' && !Auth.isSessionValid()) {
                window.location.href = (typeof CONFIG !== 'undefined' && CONFIG.LOGIN_PAGE) ? CONFIG.LOGIN_PAGE : 'index.html';
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

            console.log('[Player] Initialized successfully with Visualizer Support');
            return true;
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.init' });
            else console.error('[Player.init]', error);
            return false;
        }
    },

    /**
     * Cache semua DOM elements
     */
    cacheElements: function() {
        const getEl = (id) => (typeof DOMUtils !== 'undefined' && DOMUtils.id) ? DOMUtils.id(id) : document.getElementById(id);

        this.elements = {
            playBtn: getEl("playBtn"),
            playIcon: getEl("playIcon"),
            albumArt: getEl("albumArt"),
            dotLive: getEl("dotLive"),
            statusIndicator: getEl("statusIndicator"),
            streamTime: getEl("streamTime"),
            speedDisplay: getEl("speedDisplay"),
            btnLogout: getEl("btnLogout"),
            btnRewind: getEl("btnRewind"),
            btnForward: getEl("btnForward"),
            userDisplay: getEl("userDisplay"),
            appTitle: getEl("appTitle"),
            appSub: getEl("appSub"),
            staticLogo: getEl("staticLogo"),
            liveVideo: getEl("liveVideo")
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

            const session = (typeof Auth !== 'undefined' && typeof Auth.getSession === 'function') ? Auth.getSession() : null;
            if (session && session.username) {
                this.elements.userDisplay.textContent = session.username;
            }
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.loadUserInfo' });
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
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.loadConfigInfo' });
        }
    },

    /**
     * Setup Media Session API
     */
    setupMediaSession: function() {
        try {
            if (!('mediaSession' in navigator)) return;

            const appName = (typeof CONFIG !== 'undefined' && CONFIG.APP_NAME) ? CONFIG.APP_NAME : 'Ngaos Al Falah Ploso';
            const appDesc = (typeof CONFIG !== 'undefined' && CONFIG.APP_DESC) ? CONFIG.APP_DESC : 'Tafsir Jalalain & Shahih Bukhari';

            navigator.mediaSession.metadata = new MediaMetadata({
                title: appName,
                artist: appDesc,
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
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.setupMediaSession' });
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
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.togglePlay' });
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

            const streamUrl = (typeof CONFIG !== 'undefined' && CONFIG.STREAM_URL)
                ? CONFIG.STREAM_URL
                : (typeof CONSTANTS !== 'undefined' && CONSTANTS.STREAM?.URL ? CONSTANTS.STREAM.URL : "");

            const cacheQuery = (typeof CONSTANTS !== 'undefined' && CONSTANTS.STREAM?.CACHE_QUERY !== undefined)
                ? CONSTANTS.STREAM.CACHE_QUERY
                : true;

            // Flag state sementara
            this.isPlaying = true;
            this.errorHandled = false;

            this.audio = new Audio(streamUrl + (cacheQuery ? "?cb=" + Date.now() : ""));
            this.audio.crossOrigin = "anonymous";
            this.audio.playbackRate = this.speeds[this.speedIndex];

            this.audio.play()
                .then(() => {
                    // Safe guard anti race condition
                    if (!this.isPlaying) {
                        if (this.audio) {
                            this.audio.pause();
                            this.audio.src = "";
                        }
                        return;
                    }
                    this.handlePlaySuccess();
                })
                .catch(err => this.handlePlayError(err));

            this.audio.onerror = () => this.handleAudioError();
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.startStreaming' });
            this.stopStreaming();
        }
    },

    /**
     * Handle play success (Termasuk Pergantian Visual Logo -> Video)
     */
    handlePlaySuccess: function() {
        try {
            this.isPlaying = true;
            this.reconnectAttempts = 0; // Reset koneksi ulang setelah berhasil

            if (this.elements.playIcon) this.elements.playIcon.className = "bx bx-pause";
            
            this.addClass(this.elements.playBtn, "playing");
            this.addClass(this.elements.albumArt, "playing");
            this.addClass(this.elements.dotLive, "active");

            if (this.elements.statusIndicator) this.elements.statusIndicator.textContent = "SIARAN LIVE";

            // FITUR BARU: Sembunyikan Logo Statis & Putar Video
            if (this.elements.staticLogo) this.elements.staticLogo.style.display = 'none';
            if (this.elements.liveVideo) {
                this.elements.liveVideo.style.display = 'block';
                this.elements.liveVideo.play().catch(e => console.log('[Player] Autoplay Video Warning:', e));
            }

            this.startTimer();

            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = "playing";
            }
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.handlePlaySuccess' });
        }
    },

    /**
     * Handle play error
     */
    handlePlayError: function(error) {
        try {
            if (!this.errorHandled) {
                this.errorHandled = true;
                if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.handlePlayError' });
                this.stopStreaming();
                if (this.elements.statusIndicator) {
                    this.elements.statusIndicator.textContent = "GAGAL TERHUBUNG";
                }
            }
        } catch (err) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(err, { action: 'Player.handlePlayError' });
        }
    },

    /**
     * Handle audio error dan auto-reconnect
     */
    handleAudioError: function() {
        try {
            if (!this.isPlaying || this.errorHandled) return;

            this.reconnectAttempts++;

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

            const delay = (typeof CONSTANTS !== 'undefined' && CONSTANTS.UI?.RECONNECT_DELAY) ? CONSTANTS.UI.RECONNECT_DELAY : 3000;

            setTimeout(() => {
                if (this.isPlaying) {
                    this.startStreaming();
                }
            }, delay);
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.handleAudioError' });
        }
    },

    /**
     * Stop streaming (Termasuk Pergantian Visual Video -> Logo Statis)
     */
    stopStreaming: function() {
        try {
            this.isPlaying = false;

            if (this.audio) {
                this.audio.pause();
                this.audio.src = "";
                this.audio = null;
            }

            if (this.elements.playIcon) this.elements.playIcon.className = "bx bx-play";

            this.removeClass(this.elements.playBtn, "playing");
            this.removeClass(this.elements.albumArt, "playing");
            this.removeClass(this.elements.dotLive, "active");

            if (this.elements.statusIndicator) this.elements.statusIndicator.textContent = "OFFLINE";

            // FITUR BARU: Hentikan Video & Tampilkan Kembali Logo Statis
            if (this.elements.liveVideo) {
                this.elements.liveVideo.pause();
                this.elements.liveVideo.style.display = 'none';
            }
            if (this.elements.staticLogo) {
                this.elements.staticLogo.style.display = 'block';
            }

            this.stopTimer();

            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = "none";
            }
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.stopStreaming' });
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
                const mins = Math.floor(this.secondsElapsed / 60);
                const secs = this.secondsElapsed % 60;
                this.elements.streamTime.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
     * Setup dual-action button
     */
    setupDualActionButton: function(element, clickAction, holdAction) {
        try {
            let holdTimer = null;
            let isHeld = false;
            const duration = (typeof CONSTANTS !== 'undefined' && CONSTANTS.UI?.TOUCH_HOLD_DURATION) ? CONSTANTS.UI.TOUCH_HOLD_DURATION : 600;

            const onStart = () => {
                isHeld = false;
                holdTimer = setTimeout(() => {
                    isHeld = true;
                    if (holdAction) holdAction();
                }, duration);
            };

            const onEnd = (e) => {
                clearTimeout(holdTimer);
                if (!isHeld) {
                    if (e.type === 'touchend') e.preventDefault();
                    if (clickAction) clickAction();
                }
            };

            const onCancel = () => {
                clearTimeout(holdTimer);
                isHeld = false;
            };

            element.addEventListener('mousedown', onStart);
            element.addEventListener('mouseup', onEnd);
            element.addEventListener('touchstart', onStart, { passive: true });
            element.addEventListener('touchend', onEnd, { passive: false });
            element.addEventListener('touchmove', onCancel, { passive: true });
            element.addEventListener('touchcancel', onCancel, { passive: true });
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.setupDualActionButton' });
        }
    },

    /**
     * Reset kecepatan
     */
    resetSpeed: function() {
        try {
            this.speedIndex = 0;
            if (this.audio) this.audio.playbackRate = this.speeds[this.speedIndex];
            this.updateSpeedUI();
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.resetSpeed' });
        }
    },

    /**
     * Change kecepatan
     */
    changeSpeed: function() {
        try {
            this.speedIndex = (this.speedIndex + 1) % this.speeds.length;
            if (this.audio) this.audio.playbackRate = this.speeds[this.speedIndex];
            this.updateSpeedUI();
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.changeSpeed' });
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
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.rewind30Seconds' });
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
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.liveSync' });
        }
    },

    /**
     * Handle logout
     */
    handleLogout: function() {
        try {
            if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
                this.stopStreaming();
                if (typeof Auth !== 'undefined' && typeof Auth.logout === 'function') {
                    Auth.logout();
                } else {
                    localStorage.removeItem("radio_session");
                    window.location.href = (typeof CONFIG !== 'undefined' && CONFIG.LOGIN_PAGE) ? CONFIG.LOGIN_PAGE : "index.html";
                }
            }
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.handleLogout' });
        }
    },

    /**
     * Register service worker
     */
    registerServiceWorker: function() {
        try {
            if (!('serviceWorker' in navigator)) return;

            const register = () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('[Player] Service Worker registered:', reg))
                    .catch(err => {
                        if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(err, { action: 'ServiceWorker.register' });
                    });
            };

            if (document.readyState === 'complete') {
                register();
            } else {
                window.addEventListener('load', register);
            }
        } catch (error) {
            if (typeof ErrorLogger !== 'undefined') ErrorLogger.log(error, { action: 'Player.registerServiceWorker' });
        }
    },

    // Helper DOM Class Utilities
    addClass: function(el, cls) {
        if (!el) return;
        if (typeof DOMUtils !== 'undefined' && DOMUtils.addClass) DOMUtils.addClass(el, cls);
        else el.classList.add(cls);
    },

    removeClass: function(el, cls) {
        if (!el) return;
        if (typeof DOMUtils !== 'undefined' && DOMUtils.removeClass) DOMUtils.removeClass(el, cls);
        else el.classList.remove(cls);
    }
};

// Auto-initialize ketika DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Player.init());
} else {
    Player.init();
}
