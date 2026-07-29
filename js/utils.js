/**
 * =========================================
 * UTILS.JS
 * Version 4.2.0 - Utility Functions
 * =========================================
 */

// ========== ERROR LOGGER ==========
const ErrorLogger = {
    /**
     * Log error dengan context
     * @param {Error|string} error - Error object atau message
     * @param {Object} context - Context informasi tambahan
     */
    log: function(error, context = {}) {
        const errorData = {
            timestamp: new Date().toISOString(),
            message: error?.message || error,
            stack: error?.stack || null,
            context: context,
            userAgent: navigator.userAgent,
        };

        // Log ke console dalam development
        console.error('[ErrorLog]', errorData);
    },

    /**
     * Log warning
     */
    warn: function(message, context = {}) {
        console.warn('[Warning]', { message, context, timestamp: new Date().toISOString() });
    }
};

// ========== RATE LIMITER ==========
const RateLimiter = {
    attempts: {},

    /**
     * Check if action is rate limited
     * @param {string} key - Unique identifier
     * @param {number} maxAttempts - Max attempts allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} - true jika action diizinkan, false jika rate limited
     */
    check: function(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();
        
        if (!this.attempts[key]) {
            this.attempts[key] = [];
        }

        // Hapus attempts yang sudah di luar time window
        this.attempts[key] = this.attempts[key]
            .filter(time => now - time < windowMs);

        if (this.attempts[key].length >= maxAttempts) {
            return false; // Rate limited
        }

        this.attempts[key].push(now);
        return true; // OK
    },

    /**
     * Reset rate limit untuk key tertentu
     */
    reset: function(key) {
        if (this.attempts[key]) {
            delete this.attempts[key];
        }
    },

    /**
     * Get sisa attempts
     */
    getRemaining: function(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();
        
        if (!this.attempts[key]) {
            return maxAttempts;
        }

        const recentAttempts = this.attempts[key]
            .filter(time => now - time < windowMs);

        return Math.max(0, maxAttempts - recentAttempts.length);
    }
};

// ========== FORM VALIDATION ==========
const FormValidator = {
    /**
     * Validasi format email
     */
    isValidEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validasi password strength
     */
    isValidPassword: function(password, minLength = 8) {
        if (typeof password !== 'string') return false;
        return password.length >= minLength;
    },

    /**
     * Validasi OTP (6 digit)
     */
    isValidOTP: function(otp) {
        return /^\d{6}$/.test(otp);
    },

    /**
     * Validasi nama lengkap
     */
    isValidFullName: function(name) {
        return typeof name === 'string' && 
               name.trim().length >= 3 && 
               name.trim().length <= 100;
    }
};

// ========== LOCAL STORAGE HELPER ==========
const StorageHelper = {
    /**
     * Set item dengan error handling
     */
    setItem: function(key, value) {
        try {
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
            return true;
        } catch (e) {
            ErrorLogger.log(e, { action: 'StorageHelper.setItem', key });
            return false;
        }
    },

    /**
     * Get item dengan error handling
     */
    getItem: function(key, parse = false) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return null;
            
            if (parse) {
                return JSON.parse(value);
            }
            return value;
        } catch (e) {
            ErrorLogger.log(e, { action: 'StorageHelper.getItem', key });
            return null;
        }
    },

    /**
     * Remove item
     */
    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            ErrorLogger.log(e, { action: 'StorageHelper.removeItem', key });
            return false;
        }
    },

    /**
     * Clear all items
     */
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            ErrorLogger.log(e, { action: 'StorageHelper.clear' });
            return false;
        }
    }
};

// ========== DOM UTILITIES ==========
const DOMUtils = {
    /**
     * Safe query selector
     */
    q: function(selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            ErrorLogger.log(e, { action: 'DOMUtils.q', selector });
            return null;
        }
    },

    /**
     * Safe query selector all
     */
    qa: function(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (e) {
            ErrorLogger.log(e, { action: 'DOMUtils.qa', selector });
            return [];
        }
    },

    /**
     * Get element by ID
     */
    id: function(elementId) {
        const el = document.getElementById(elementId);
        if (!el) {
            ErrorLogger.warn(`Element with id "${elementId}" not found`);
        }
        return el;
    },

    /**
     * Add class dengan error handling
     */
    addClass: function(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    },

    /**
     * Remove class dengan error handling
     */
    removeClass: function(element, className) {
        if (element && element.classList) {
            element.classList.remove(className);
        }
    },

    /**
     * Toggle class
     */
    toggleClass: function(element, className) {
        if (element && element.classList) {
            element.classList.toggle(className);
        }
    },

    /**
     * Check apakah element punya class
     */
    hasClass: function(element, className) {
        if (element && element.classList) {
            return element.classList.contains(className);
        }
        return false;
    }
};

// ========== DELAY / PROMISE HELPERS ==========
const PromiseHelper = {
    /**
     * Delay execution dalam milliseconds
     */
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Promise dengan timeout
     */
    withTimeout: function(promise, timeoutMs, timeoutMessage = 'Operation timeout') {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
            )
        ]);
    }
};

// ========== FORMAT UTILITIES ==========
const FormatUtils = {
    /**
     * Format time dari seconds ke MM:SS
     */
    formatTime: function(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },

    /**
     * Format bytes ke readable size
     */
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};
