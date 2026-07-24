// =========================================
// CONFIG.JS
// Version 4.0 - Clerk Integration
// =========================================

const CONFIG = Object.freeze({

    // Informasi Aplikasi
    APP_NAME: "NGAOS AL FALAH PLOSO",
    APP_DESC: "TAFSIR JALALAIN DAN SHAHIH BUKHARI",
    APP_VERSION: "4.0.0",

    // Audio Stream
    STREAM_URL: "https://b.alhastream.com:5125/radio",

    // Clerk Authentication
    // PASTE PUBLISHABLE KEY CLERK ANDA DI SINI
    CLERK_PUBLISHABLE_KEY: "pk_test_ZnVuLXBpZ2Vvbi02Mi5jbGVyay5hY2NvdW50cy5kZXYk",

    // Session & Cache
    SESSION_HOURS: 4,
    SESSION_KEY: "radio_session",
    REMEMBER_KEY: "remember_username",

    // Redirect Pages
    LOGIN_PAGE: "index.html",
    PLAYER_PAGE: "player.html"

});
