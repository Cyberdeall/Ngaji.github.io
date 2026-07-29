/**
 * =========================================
 * AUTH.JS
 * Version 4.2.0 - Session & Authentication
 * =========================================
 * Session & Auth Management (Clerk & PWA)
 */

const Auth = {
    /**
     * Membuat sesi lokal baru setelah login/register berhasil
     * @param {string} username - Nama pengguna
     * @returns {boolean} - true jika berhasil
     */
    createSession: function(username) {
        try {
            if (typeof CONFIG === 'undefined') {
                ErrorLogger.warn('CONFIG not available', { action: 'Auth.createSession' });
                return false;
            }

            if (!username || typeof username !== 'string') {
                throw new Error('Invalid username');
            }

            const now = Date.now();
            const durationMs = (CONFIG.SESSION_HOURS || 4) * 60 * 60 * 1000;
            const sessionData = {
                username: username.trim(),
                loginTime: now,
                expireTime: now + durationMs
            };

            return StorageHelper.setItem(CONFIG.SESSION_KEY, sessionData);
        } catch (error) {
            ErrorLogger.log(error, { action: 'Auth.createSession' });
            return false;
        }
    },

    /**
     * Memeriksa apakah sesi pengguna masih valid
     * @returns {boolean}
     */
    isSessionValid: function() {
        try {
            if (typeof CONFIG === 'undefined') return false;

            const sessionRaw = StorageHelper.getItem(CONFIG.SESSION_KEY);
            if (!sessionRaw) return false;

            const session = typeof sessionRaw === 'string' 
                ? JSON.parse(sessionRaw) 
                : sessionRaw;

            if (!session || typeof session.expireTime !== 'number') {
                this.destroySession();
                return false;
            }

            if (Date.now() < session.expireTime) {
                return true;
            } else {
                this.destroySession(); // Hapus jika sudah kedaluwarsa
                return false;
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Auth.isSessionValid' });
            this.destroySession();
            return false;
        }
    },

    /**
     * Mengambil data sesi aktif
     * @returns {Object|null}
     */
    getSession: function() {
        try {
            if (!this.isSessionValid()) return null;
            
            const sessionRaw = StorageHelper.getItem(CONFIG.SESSION_KEY);
            return typeof sessionRaw === 'string' 
                ? JSON.parse(sessionRaw) 
                : sessionRaw;
        } catch (error) {
            ErrorLogger.log(error, { action: 'Auth.getSession' });
            this.destroySession();
            return null;
        }
    },

    /**
     * Menghapus sesi lokal & logout dari Clerk
     */
    logout: async function() {
        try {
            this.destroySession();

            // Logout dari Clerk jika SDK tersedia
            if (window.Clerk && typeof window.Clerk.signOut === 'function') {
                await window.Clerk.signOut();
            }
        } catch (error) {
            ErrorLogger.log(error, { action: 'Auth.logout' });
        } finally {
            // Redirect ke halaman login
            const loginPage = (typeof CONFIG !== 'undefined') 
                ? CONFIG.LOGIN_PAGE 
                : "index.html";
            window.location.href = loginPage;
        }
    },

    /**
     * Menghapus data sesi lokal saja
     */
    destroySession: function() {
        try {
            const key = (typeof CONFIG !== 'undefined') 
                ? CONFIG.SESSION_KEY 
                : "radio_session";
            
            StorageHelper.removeItem(key);
        } catch (error) {
            ErrorLogger.log(error, { action: 'Auth.destroySession' });
        }
    },

    /**
     * Extend sesi usia (refresh timeout)
     */
    refreshSession: function() {
        try {
            const session = this.getSession();
            if (session) {
                this.createSession(session.username);
                return true;
            }
            return false;
        } catch (error) {
            ErrorLogger.log(error, { action: 'Auth.refreshSession' });
            return false;
        }
    }
};
