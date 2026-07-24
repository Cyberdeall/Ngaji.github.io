// =========================================
// AUTH.JS
// Session & Auth Management (Clerk & PWA)
// Ngaos Al Falah Ploso
// =========================================

const Auth = {
    /**
     * Membuat sesi lokal baru setelah login/register berhasil
     * @param {string} username - Nama pengguna
     */
    createSession: function(username) {
        if (typeof CONFIG === 'undefined') return;

        const now = Date.now();
        const durationMs = (CONFIG.SESSION_HOURS || 4) * 60 * 60 * 1000;
        const sessionData = {
            username: username,
            loginTime: now,
            expireTime: now + durationMs
        };

        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(sessionData));
    },

    /**
     * Memeriksa apakah sesi pengguna masih valid
     * @returns {boolean}
     */
    isSessionValid: function() {
        if (typeof CONFIG === 'undefined') return false;

        const sessionRaw = localStorage.getItem(CONFIG.SESSION_KEY);
        if (!sessionRaw) return false;

        try {
            const session = JSON.parse(sessionRaw);
            if (Date.now() < session.expireTime) {
                return true;
            } else {
                this.destroySession(); // Hapus jika sudah kedaluwarsa
                return false;
            }
        } catch (e) {
            this.destroySession();
            return false;
        }
    },

    /**
     * Mengambil data sesi aktif
     * @returns {Object|null}
     */
    getSession: function() {
        if (!this.isSessionValid()) return null;
        return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY));
    },

    /**
     * Menghapus sesi lokal & logout dari Clerk
     */
    logout: async function() {
        this.destroySession();

        // Logout dari Clerk jika SDK tersedia
        try {
            if (window.Clerk && window.Clerk.signOut) {
                await window.Clerk.signOut();
            }
        } catch (err) {
            console.error("Clerk Logout Error:", err);
        }

        // Redirect ke halaman login
        if (typeof CONFIG !== 'undefined') {
            window.location.href = CONFIG.LOGIN_PAGE;
        } else {
            window.location.href = "index.html";
        }
    },

    /**
     * Menghapus data sesi lokal saja
     */
    destroySession: function() {
        if (typeof CONFIG !== 'undefined') {
            localStorage.removeItem(CONFIG.SESSION_KEY);
        } else {
            localStorage.removeItem("radio_session");
        }
    }
};
