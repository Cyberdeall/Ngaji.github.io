# STRUKTUR KODE NGAJI v4.2.0

## Quick Reference

### File Organization
```
js/
├── constants.js     Magic numbers & configuration
├── utils.js         Shared utilities & helpers
├── config.js        Clerk & app configuration
├── crypto.js        Encryption functions
├── auth.js          Authentication & session
├── login.js         Login/Register page logic
└── player.js        Audio player logic
```

### Dependency Graph
```
index.html
  ├─ constants.js
  ├─ utils.js (depends on: constants)
  ├─ config.js (depends on: constants)
  ├─ crypto.js
  ├─ auth.js (depends on: utils, config)
  └─ login.js (depends on: all above + Clerk SDK)

player.html
  ├─ constants.js
  ├─ utils.js (depends on: constants)
  ├─ config.js (depends on: constants)
  ├─ crypto.js
  ├─ auth.js (depends on: utils, config)
  └─ player.js (depends on: all above)
```

### Script Loading Order
1. **constants.js** - Must load first (defines CONSTANTS)
2. **utils.js** - Depends on CONSTANTS
3. **config.js** - Depends on CONSTANTS  
4. **crypto.js** - Standalone
5. **auth.js** - Depends on utils, config
6. **login.js** or **player.js** - Feature files

---

## API Reference

### ErrorLogger
```javascript
ErrorLogger.log(error, context)      // Log error with context
ErrorLogger.warn(message, context)   // Log warning
```

### RateLimiter  
```javascript
RateLimiter.check(key, max, windowMs)  // Check if allowed
RateLimiter.reset(key)                 // Reset counter
RateLimiter.getRemaining(key, max)     // Get remaining attempts
```

### FormValidator
```javascript
FormValidator.isValidEmail(email)      // Check email format
FormValidator.isValidPassword(pwd)     // Check password length >= 8
FormValidator.isValidOTP(code)         // Check 6-digit OTP
FormValidator.isValidFullName(name)    // Check name length 3-100
```

### StorageHelper
```javascript
StorageHelper.setItem(key, value)      // Set with error handling
StorageHelper.getItem(key, parse?)     // Get with error handling
StorageHelper.removeItem(key)          // Remove item
StorageHelper.clear()                  // Clear all
```

### DOMUtils
```javascript
DOMUtils.id(elementId)                 // Get element by ID
DOMUtils.q(selector)                   // Query selector
DOMUtils.qa(selector)                  // Query selector all
DOMUtils.addClass(el, className)       // Add class
DOMUtils.removeClass(el, className)    // Remove class
DOMUtils.toggleClass(el, className)    // Toggle class
DOMUtils.hasClass(el, className)       // Check class
```

### Auth
```javascript
Auth.createSession(username)            // Create session
Auth.isSessionValid()                   // Check if session valid
Auth.getSession()                       // Get current session
Auth.logout()                           // Logout & redirect
Auth.destroySession()                   // Clear session only
Auth.refreshSession()                   // Extend session timeout
```

### Player
```javascript
Player.init()                           // Initialize player
Player.togglePlay()                     // Play/pause toggle
Player.startStreaming()                 // Start audio stream
Player.stopStreaming()                  // Stop audio stream
Player.changeSpeed()                    // Cycle through speeds
Player.resetSpeed()                     // Reset to 1.0x
Player.rewind30Seconds()                // Rewind 30 seconds
Player.liveSync()                       // Catch-up to live
Player.handleLogout()                   // Logout flow
```

### CryptoEngine
```javascript
await CryptoEngine.sha256(string)               // Hash string
await CryptoEngine.verifyPassword(pwd, hash)   // Verify password
CryptoEngine.generateRandomString(length)      // Generate random
```

### FormatUtils
```javascript
FormatUtils.formatTime(seconds)         // "1:05" format
FormatUtils.formatBytes(bytes)          // "2 KB" format
```

### PromiseHelper
```javascript
await PromiseHelper.delay(ms)          // Sleep/delay
await PromiseHelper.withTimeout(promise, ms)  // Promise with timeout
```

---

## Common Patterns

### Safe DOM Access
```javascript
const btn = DOMUtils.id('myButton');
if (btn) {
    btn.addEventListener('click', () => { ... });
}
```

### Safe Storage
```javascript
const value = StorageHelper.getItem('key');
if (value) {
    // Process value
}
```

### Error Handling
```javascript
try {
    // do something risky
} catch (error) {
    ErrorLogger.log(error, { action: 'what_you_were_doing' });
    // Show user-friendly message
}
```

### Input Validation
```javascript
if (!FormValidator.isValidEmail(email)) {
    showError("Invalid email format");
    return false;
}
```

### Rate Limiting
```javascript
if (!RateLimiter.check('login', 5, 60000)) {
    showError("Too many attempts. Wait 1 minute.");
    return;
}
```

---

## Debugging Tips

### Check logs
```javascript
// Console will show all errors with context
console.error('...')  // ErrorLogger output
```

### Check session
```javascript
const session = Auth.getSession();
console.log(session);  // Current session data
```

### Check rate limit status
```javascript
const remaining = RateLimiter.getRemaining('login', 5, 60000);
console.log(`Remaining attempts: ${remaining}`);
```

### Check storage
```javascript
const data = StorageHelper.getItem('radio_session');
console.log('Stored session:', data);
```

### Validate input
```javascript
console.log('Email valid?', FormValidator.isValidEmail(email));
console.log('Password valid?', FormValidator.isValidPassword(pwd));
```

---

## Performance Tips

1. **Use DOMUtils** - Safely cache DOM elements
2. **Use RateLimiter** - Prevent API overload
3. **Use StorageHelper** - Avoid storage errors
4. **Minimize DOM access** - Cache element references
5. **Use constants** - Don't hardcode values
6. **Error logging** - Track issues in production

---

## Version History

**v4.2.0** - Major Refactor
- ✅ Separated concerns (constants, utils, features)
- ✅ Added error logging
- ✅ Added rate limiting  
- ✅ Added input validation
- ✅ Improved service worker
- ✅ Fixed memory leaks
- ✅ Fixed double-promise issue
- ✅ Enhanced security

**v4.1.0** - Initial version (before refactor)

