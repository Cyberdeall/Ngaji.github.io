/**
 * =========================================
 * CONSTANTS.JS
 * Version 4.2.0 - Centralized Constants
 * =========================================
 * Semua nilai constant untuk aplikasi
 */

const CONSTANTS = Object.freeze({
    // ========== UI CONSTANTS ==========
    UI: {
        TOUCH_HOLD_DURATION: 500,      // ms - durasi tahan tombol
        RECONNECT_DELAY: 3000,         // ms - delay sebelum reconnect
        TRANSITION_SPEED: 300,         // ms - durasi animasi
        ERROR_DISPLAY_TIME: 5000,      // ms - berapa lama error ditampilkan
    },

    // ========== SESSION CONSTANTS ==========
    SESSION: {
        HOURS: 4,                      // durasi session dalam jam
        KEY: "radio_session",
        REMEMBER_KEY: "remember_username",
    },

    // ========== PAGES ==========
    PAGES: {
        LOGIN: "index.html",
        PLAYER: "player.html",
    },

    // ========== AUDIO STREAM ==========
    STREAM: {
        URL: "https://b.alhastream.com:5125/radio",
        CACHE_QUERY: true,             // gunakan cache busting
    },

    // ========== APP INFO ==========
    APP: {
        NAME: "NGAOS AL FALAH PLOSO",
        DESC: "TAFSIR JALALAIN DAN SHAHIH BUKHARI",
        VERSION: "4.2.0",
    },

    // ========== PLAYBACK SPEEDS ==========
    PLAYBACK_SPEEDS: [1.0, 1.25, 1.5, 2.0],

    // ========== VALIDATION ==========
    VALIDATION: {
        PASSWORD_MIN_LENGTH: 8,
        OTP_LENGTH: 6,
    },

    // ========== RATE LIMITING ==========
    RATE_LIMIT: {
        LOGIN_ATTEMPTS: 5,
        LOGIN_WINDOW_MS: 60000,         // 1 menit
    },

    // ========== CACHE ==========
    CACHE: {
        NAME: 'ngaos-alfalah-v4.2.0',
        MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 jam
    },

    // ========== CLERK AUTH ==========
    CLERK: {
        PUBLISHABLE_KEY: "pk_test_ZGFzaGluZy1idWctNjMuY2xlcmsuYWNjb3VudHMuZGV2JA==",
        TIMEOUT_MS: 10000,              // timeout untuk Clerk API
    },
});

// Fallback jika CONSTANTS tidak tersedia
if (typeof CONFIG === 'undefined') {
    const CONFIG = {
        APP_NAME: CONSTANTS.APP.NAME,
        APP_DESC: CONSTANTS.APP.DESC,
        APP_VERSION: CONSTANTS.APP.VERSION,
        STREAM_URL: CONSTANTS.STREAM.URL,
        CLERK_PUBLISHABLE_KEY: CONSTANTS.CLERK.PUBLISHABLE_KEY,
        SESSION_HOURS: CONSTANTS.SESSION.HOURS,
        SESSION_KEY: CONSTANTS.SESSION.KEY,
        REMEMBER_KEY: CONSTANTS.SESSION.REMEMBER_KEY,
        LOGIN_PAGE: CONSTANTS.PAGES.LOGIN,
        PLAYER_PAGE: CONSTANTS.PAGES.PLAYER,
    };
}
