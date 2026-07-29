/**
 * =========================================
 * CRYPTO.JS
 * Version 4.2.0 - Encryption & Hash Functions
 * =========================================
 * Mesin enkripsi SHA-256 untuk pengamanan validasi kata sandi
 */

const CryptoEngine = {
    /**
     * Hash string dengan SHA-256 (async)
     * @param {string} string - String yang akan di-hash
     * @returns {Promise<string>} - Hex string hasil hash
     */
    sha256: async function(string) {
        try {
            if (typeof string !== 'string') {
                throw new Error('Input must be a string');
            }

            const utf8 = new TextEncoder().encode(string);
            const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            return hashHex;
        } catch (error) {
            ErrorLogger.log(error, { action: 'CryptoEngine.sha256' });
            throw error;
        }
    },

    /**
     * Verify password dengan SHA-256
     * @param {string} password - Password yang akan di-verify
     * @param {string} hash - Hash yang akan di-compare
     * @returns {Promise<boolean>}
     */
    verifyPassword: async function(password, hash) {
        try {
            const passwordHash = await this.sha256(password);
            return passwordHash === hash;
        } catch (error) {
            ErrorLogger.log(error, { action: 'CryptoEngine.verifyPassword' });
            throw error;
        }
    },

    /**
     * Generate random string
     * @param {number} length - Panjang string
     * @returns {string}
     */
    generateRandomString: function(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        
        for (let i = 0; i < length; i++) {
            result += chars[array[i] % chars.length];
        }
        
        return result;
    }
};
