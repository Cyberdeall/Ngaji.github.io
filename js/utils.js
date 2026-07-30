/**
 * =========================================
 * UTILS.JS
 * Version 4.2.2 - Robust Error Filtering
 * =========================================
 */

// ========== ERROR LOGGER ==========
const ErrorLogger = {
    /**
     * Log error dengan context
     * @param {Error|string|Object} error - Error object atau message
     * @param {Object} context - Context informasi tambahan
     */
    log: function(error, context = {}) {
        // Konversi error ke bentuk string dengan aman
        let strError = '';
        try {
            if (typeof error === 'string') {
                strError = error;
            } else if (error?.message) {
                strError = error.message;
            } else {
                strError = JSON.stringify(error || '');
            }
        } catch (e) {
            strError = String(error || '');
        }

        // 💡 Saring semua intervensi otomatis dan warning jaringan dari Chrome
        if (
            !error ||
            strError.includes('[Intervention]') || 
            strError.includes('Slow network') ||
            strError.includes('Fallback font') ||
            strError.includes('unpkg.com')
        ) {
            return; // Abaikan log ini
        }

        const errorData = {
            timestamp: new Date().toISOString(),
            message: error?.message || error,
            stack: error?.stack || null,
            context: context,
            userAgent: navigator.userAgent,
        };

        // Log ke console hanya jika error sistem asli
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

    check: function(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();
        
        if (!this.attempts[key]) {
            this.attempts[key] = [];
        }

        this.attempts[key] = this.attempts[key]
            .filter(time => now - time < windowMs);

        if (this.attempts[key].length >= maxAttempts) {
            return false;
        }

        this.attempts[key].push(now);
        return true;
    },

    reset: function(key) {
        if (this.attempts[key]) {
            delete this.attempts[key];
        }
    },

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
    isValidEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    isValidPassword: function(password, minLength = 8) {
        if (typeof password !== 'string') return false;
        return password.length >= minLength;
    },

    isValidOTP: function(otp) {
        return /^\d{6}$/.test(otp);
    },

    isValidFullName: function(name) {
        return typeof name === 'string' && 
               name.trim().length >= 3 && 
               name.trim().length <= 100;
    }
};

// ========== LOCAL STORAGE HELPER ==========
const StorageHelper = {
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

    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            ErrorLogger.log(e, { action: 'StorageHelper.removeItem', key });
            return false;
        }
    },

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
    q: function(selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            ErrorLogger.log(e, { action: 'DOMUtils.q', selector });
            return null;
        }
    },

    qa: function(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (e) {
            ErrorLogger.log(e, { action: 'DOMUtils.qa', selector });
            return [];
        }
    },

    id: function(elementId) {
        const el = document.getElementById(elementId);
        if (!el) {
            ErrorLogger.warn(`Element with id "${elementId}" not found`);
        }
        return el;
    },

    addClass: function(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    },

    removeClass: function(element, className) {
        if (element && element.classList) {
            element.classList.remove(className);
        }
    },

    toggleClass: function(element, className) {
        if (element && element.classList) {
            element.classList.toggle(className);
        }
    },

    hasClass: function(element, className) {
        if (element && element.classList) {
            return element.classList.contains(className);
        }
        return false;
    }
};

// ========== DELAY / PROMISE HELPERS ==========
const PromiseHelper = {
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

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
    formatTime: function(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },

    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};

