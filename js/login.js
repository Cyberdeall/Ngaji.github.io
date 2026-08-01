/**
 * =========================================
 * LOGIN.JS
 * Version 4.5.1 - Dynamic Clerk SDK Loader & Direct Player Redirect
 * =========================================
 */

document.addEventListener("DOMContentLoaded", async function() {
    try {
        // ========== 1. ELEMEN UI & SLIDER ==========
        const container = DOMUtils.q('.container');
        const registerBtn = DOMUtils.q('.register-btn');
        const loginBtn = DOMUtils.q('.login-btn');

        if (registerBtn && loginBtn && container) {
            registerBtn.addEventListener('click', () => {
                DOMUtils.addClass(container, 'active');
            });
            loginBtn.addEventListener('click', () => {
                DOMUtils.removeClass(container, 'active');
            });
        }

        // ========== 2. TOGGLE PASSWORD EYE ICON ==========
        DOMUtils.qa('.toggle-pwd').forEach(icon => {
            icon.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const targetInput = DOMUtils.id(targetId);
                
                if (targetInput) {
                    const isPassword = targetInput.type === 'password';
                    targetInput.type = isPassword ? 'text' : 'password';
                    
                    if (isPassword) {
                        DOMUtils.removeClass(this, 'bx-hide');
                        DOMUtils.addClass(this, 'bx-show');
                    } else {
                        DOMUtils.removeClass(this, 'bx-show');
                        DOMUtils.addClass(this, 'bx-hide');
                    }
                }
            });
        });

        // ========== 3. ELEMEN FORM & MODAL OTP ==========
        const loginForm = DOMUtils.id("loginForm");
        const registerForm = DOMUtils.id("registerForm");
        const usernameInput = DOMUtils.id("username");
        const passwordInput = DOMUtils.id("password");
        const rememberCheckbox = DOMUtils.id("remember");
        const messageOutput = DOMUtils.id("message");
        const regMessageOutput = DOMUtils.id("regMessage");

        const otpModal = DOMUtils.id("otpModal");
        const otpCodeInput = DOMUtils.id("otpCode");
        const otpMessageOutput = DOMUtils.id("otpMessage");
        const btnVerifyOtp = DOMUtils.id("btnVerifyOtp");
        const btnCancelOtp = DOMUtils.id("btnCancelOtp");

        let currentSignUpAttempt = null;
        let currentSignInAttempt = null;
        let authMode = 'signup'; // 'signup' atau 'login'

        // Load username jika pernah dicentang "Ingat Saya"
        if (rememberCheckbox && usernameInput) {
            const savedUsername = StorageHelper.getItem(CONFIG.REMEMBER_KEY);
            if (savedUsername) {
                usernameInput.value = savedUsername;
                rememberCheckbox.checked = true;
            }
        }

        // ========== 4. INISIALISASI CLERK SDK (DYNAMIC LOAD) ==========
        
        // Helper untuk memuat script Clerk secara otomatis dari JavaScript
        function loadClerkSDK() {
            return new Promise((resolve, reject) => {
                if (window.Clerk) {
                    return resolve(true);
                }

                let script = document.querySelector('script[src*="clerk.browser.js"]');
                if (!script) {
                    script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
                    script.async = true;
                    script.crossOrigin = 'anonymous';
                    if (typeof CONFIG !== 'undefined' && CONFIG.CLERK_PUBLISHABLE_KEY) {
                        script.setAttribute('data-clerk-publishable-key', CONFIG.CLERK_PUBLISHABLE_KEY);
                    }
                    document.head.appendChild(script);
                }

                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('Gagal mengunduh SDK Clerk dari CDN.'));
            });
        }

        async function initClerk() {
            try {
                // 1. Muat script Clerk secara dinamis jika belum ada di halaman
                await loadClerkSDK();

                // 2. Tunggu sebentar hingga window.Clerk benar-benar siap
                let retries = 0;
                while (!window.Clerk && retries < 20) {
                    await PromiseHelper.delay(100);
                    retries++;
                }

                if (!window.Clerk) {
                    showError(messageOutput, "Gagal memuat SDK Keamanan. Periksa koneksi internet Anda.");
                    ErrorLogger.log(new Error('Clerk SDK not loaded'), { action: 'initClerk' });
                    return false;
                }

                // 3. Inisialisasi Clerk jika belum loaded
                if (!window.Clerk.loaded) {
                    await PromiseHelper.withTimeout(
                        window.Clerk.load({ 
                            publishableKey: CONFIG.CLERK_PUBLISHABLE_KEY 
                        }),
                        CONSTANTS.CLERK.TIMEOUT_MS,
                        'Clerk initialization timeout'
                    );
                }

                // Jika pengguna sudah memiliki sesi aktif, langsung redirect ke player
                if (window.Clerk.user) {
                    const user = window.Clerk.user;
                    saveSesiAndRedirect(user.fullName || user.primaryEmailAddress?.emailAddress);
                    return true;
                }

                return true;
            } catch (error) {
                ErrorLogger.log(error, { action: 'initClerk' });
                return false;
            }
        }

        // Jalankan inisialisasi Clerk saat halaman dimuat
        await initClerk();

        // ========== 5. PEMETA PESAN ERROR RAMAH PENGGUNA ==========
        function mapFriendlyError(err) {
            const code = err?.errors?.[0]?.code || err?.message || "";
            
            const errorMap = {
                'form_identifier_not_found': '⛔ Email tidak terdaftar. Silakan periksa kembali email Anda atau klik "Daftar Akun".',
                'form_password_incorrect': '⛔ Kata sandi yang Anda masukkan salah. Silakan periksa kembali huruf besar/kecil kata sandi Anda.',
                'form_identifier_exists': 'ℹ️ Email ini sudah terdaftar. Silakan pindah ke halaman "Masuk" untuk login.',
                'form_password_length_too_short': '⚠️ Kata sandi terlalu pendek. Gunakan minimal 8 karakter demi keamanan akun Anda.',
                'form_code_incorrect': '❌ Kode OTP yang Anda masukkan salah. Silakan periksa kembali email Anda.',
                'too_many_requests': '⏳ Terlalu banyak percobaan. Demi keamanan, silakan tunggu 1-2 menit sebelum mencoba kembali.',
            };

            return errorMap[code] || 
                (typeof err === "string" ? err : "⚠️ Terjadi kendala saat memproses permintaan. Pastikan koneksi internet Anda stabil.");
        }

        // ========== 6. LOGIKA LOGIN ==========
        if (loginForm) {
            loginForm.addEventListener("submit", async function(e) {
                e.preventDefault();
                
                try {
                    if (!RateLimiter.check('login', CONSTANTS.RATE_LIMIT.LOGIN_ATTEMPTS, CONSTANTS.RATE_LIMIT.LOGIN_WINDOW_MS)) {
                        showError(messageOutput, "⏳ Terlalu banyak percobaan login. Tunggu beberapa menit.");
                        return;
                    }

                    setLoading("btnLogin", true);
                    hideMessage(messageOutput);

                    const email = usernameInput.value.trim();
                    const password = passwordInput.value;

                    if (!FormValidator.isValidEmail(email)) {
                        showError(messageOutput, "❌ Format email tidak valid.");
                        setLoading("btnLogin", false);
                        return;
                    }

                    if (!FormValidator.isValidPassword(password)) {
                        showError(messageOutput, "❌ Kata sandi minimal 8 karakter.");
                        setLoading("btnLogin", false);
                        return;
                    }

                    const isClerkReady = await initClerk();
                    if (!isClerkReady) {
                        setLoading("btnLogin", false);
                        return;
                    }

                    const signInAttempt = await window.Clerk.client.signIn.create({
                        identifier: email,
                        password: password
                    });

                    if (signInAttempt.status === "complete") {
                        await window.Clerk.setActive({ session: signInAttempt.createdSessionId });
                        
                        const user = window.Clerk.user;
                        const sessions = await user.getSessions();
                        const activeSessions = sessions.filter(s => s.status === "active");

                        if (activeSessions.length > 1) {
                            await window.Clerk.signOut({ redirectUrl: window.location.pathname });
                            showError(messageOutput, 
                                "⛔ GAGAL MASUK: AKUN SEDANG DIGUNAKAN\n\n" +
                                "Akun Anda saat ini sedang aktif di perangkat lain. Satu akun hanya dapat digunakan pada 1 perangkat dalam satu waktu."
                            );
                            setLoading("btnLogin", false);
                            RateLimiter.reset('login');
                            return;
                        }

                        saveSesiAndRedirect(user.fullName || user.primaryEmailAddress?.emailAddress);
                        RateLimiter.reset('login');

                    } else if (
                        signInAttempt.status === "needs_first_factor" || 
                        signInAttempt.status === "needs_second_factor" || 
                        signInAttempt.status === "needs_client_trust"
                    ) {
                        currentSignInAttempt = signInAttempt;
                        authMode = 'login';

                        const factors = signInAttempt.supportedFirstFactors || signInAttempt.supportedSecondFactors || [];
                        const otpFactor = factors.find(f => f.strategy === "email_code");

                        if (otpFactor) {
                            if (signInAttempt.status === "needs_second_factor") {
                                await signInAttempt.prepareSecondFactor({ strategy: "email_code" });
                            } else {
                                await signInAttempt.prepareFirstFactor({ strategy: "email_code", emailAddressId: otpFactor.emailAddressId });
                            }

                            DOMUtils.removeClass(otpModal, "hidden");
                            showSuccess(otpMessageOutput, "🔑 Kode verifikasi (OTP) telah dikirim ke email Anda.");
                        } else {
                            showError(messageOutput, "⚠️ Metode verifikasi tidak didukung.");
                        }
                    } else {
                        showError(messageOutput, "⚠️ Status autentikasi tidak dikenal: " + signInAttempt.status);
                    }
                } catch (err) {
                    ErrorLogger.log(err, { action: 'login_submit' });
                    showError(messageOutput, mapFriendlyError(err));
                } finally {
                    setLoading("btnLogin", false);
                }
            });
        }

        // ========== 7. LOGIKA REGISTER ==========
        if (registerForm) {
            registerForm.addEventListener("submit", async function(e) {
                e.preventDefault();
                
                try {
                    setLoading("btnRegister", true);
                    hideMessage(regMessageOutput);

                    const fullName = DOMUtils.id("regFullName").value.trim();
                    const email = DOMUtils.id("regEmail").value.trim();
                    const password = DOMUtils.id("regPassword").value;

                    if (!FormValidator.isValidFullName(fullName)) {
                        showError(regMessageOutput, "❌ Nama lengkap minimal 3 karakter.");
                        setLoading("btnRegister", false);
                        return;
                    }

                    if (!FormValidator.isValidEmail(email)) {
                        showError(regMessageOutput, "❌ Format email tidak valid.");
                        setLoading("btnRegister", false);
                        return;
                    }

                    if (!FormValidator.isValidPassword(password)) {
                        showError(regMessageOutput, "❌ Kata sandi minimal 8 karakter.");
                        setLoading("btnRegister", false);
                        return;
                    }

                    const isClerkReady = await initClerk();
                    if (!isClerkReady) {
                        setLoading("btnRegister", false);
                        return;
                    }

                    currentSignUpAttempt = await window.Clerk.client.signUp.create({
                        firstName: fullName,
                        emailAddress: email,
                        password: password
                    });

                    authMode = 'signup';

                    await currentSignUpAttempt.prepareEmailAddressVerification({ strategy: "email_code" });
                    DOMUtils.removeClass(otpModal, "hidden");
                    showSuccess(otpMessageOutput, "✅ Kode OTP telah dikirim ke " + email);

                } catch (err) {
                    ErrorLogger.log(err, { action: 'register_submit' });
                    showError(regMessageOutput, mapFriendlyError(err));
                } finally {
                    setLoading("btnRegister", false);
                }
            });
        }

        // ========== 8. VERIFIKASI KODE OTP ==========
        if (btnVerifyOtp) {
            btnVerifyOtp.addEventListener("click", async function() {
                try {
                    const code = otpCodeInput.value.trim();
                    
                    if (!FormValidator.isValidOTP(code)) {
                        showError(otpMessageOutput, "❌ Silakan masukkan 6 angka kode OTP.");
                        return;
                    }

                    setLoading("btnVerifyOtp", true);

                    // A. Verifikasi OTP Register -> LANGSUNG MASUK KE PLAYER
                    if (authMode === 'signup' && currentSignUpAttempt) {
                        const verification = await currentSignUpAttempt.attemptEmailAddressVerification({ code });

                        if (verification.status === "complete") {
                            DOMUtils.addClass(otpModal, "hidden");
                            otpCodeInput.value = '';

                            // 1. Aktifkan Sesi di Clerk
                            if (verification.createdSessionId) {
                                await window.Clerk.setActive({ session: verification.createdSessionId });
                            }

                            // 2. Ambil data nama/email pengguna
                            const user = window.Clerk.user;
                            const userIdentifier = user ? (user.fullName || user.primaryEmailAddress?.emailAddress) : "Pengguna";

                            // 3. Simpan Sesi Lokal & Langsung Redirect ke player.html
                            saveSesiAndRedirect(userIdentifier);
                        } else {
                            showError(otpMessageOutput, "❌ Kode verifikasi belum sesuai.");
                        }
                    } 
                    // B. Verifikasi OTP Login
                    else if (authMode === 'login' && currentSignInAttempt) {
                        let result;
                        if (currentSignInAttempt.status === 'needs_second_factor') {
                            result = await currentSignInAttempt.attemptSecondFactor({ strategy: 'email_code', code });
                        } else {
                            result = await currentSignInAttempt.attemptFirstFactor({ strategy: 'email_code', code });
                        }

                        if (result.status === "complete") {
                            await window.Clerk.setActive({ session: result.createdSessionId });
                            DOMUtils.addClass(otpModal, "hidden");
                            otpCodeInput.value = '';

                            const user = window.Clerk.user;
                            saveSesiAndRedirect(user.fullName || user.primaryEmailAddress?.emailAddress);
                        } else {
                            showError(otpMessageOutput, "❌ Kode verifikasi belum sesuai.");
                        }
                    }

                } catch (err) {
                    ErrorLogger.log(err, { action: 'verify_otp' });
                    showError(otpMessageOutput, mapFriendlyError(err));
                } finally {
                    setLoading("btnVerifyOtp", false);
                }
            });
        }

        if (btnCancelOtp) {
            btnCancelOtp.addEventListener("click", () => {
                DOMUtils.addClass(otpModal, "hidden");
                otpCodeInput.value = '';
                hideMessage(otpMessageOutput);
            });
        }

        // ========== HELPER FUNCTIONS ==========
        function saveSesiAndRedirect(username) {
            try {
                if (typeof Auth !== 'undefined') {
                    Auth.createSession(username);
                }
                
                if (rememberCheckbox && rememberCheckbox.checked) {
                    StorageHelper.setItem(CONFIG.REMEMBER_KEY, username);
                } else {
                    StorageHelper.removeItem(CONFIG.REMEMBER_KEY);
                }
                
                window.location.href = CONFIG.PLAYER_PAGE || './player.html';
            } catch (error) {
                ErrorLogger.log(error, { action: 'saveSesiAndRedirect' });
            }
        }

        function showError(element, text) {
            if (!element) return;
            element.textContent = text;
            DOMUtils.removeClass(element, 'success');
            DOMUtils.addClass(element, 'error');
        }

        function showSuccess(element, text) {
            if (!element) return;
            element.textContent = text;
            DOMUtils.removeClass(element, 'error');
            DOMUtils.addClass(element, 'success');
        }

        function hideMessage(element) {
            if (!element) return;
            DOMUtils.removeClass(element, 'error');
            DOMUtils.removeClass(element, 'success');
            element.textContent = '';
        }

        function setLoading(btnId, isLoading) {
            const btn = DOMUtils.id(btnId);
            if (!btn) return;
            
            const text = btn.querySelector('.btn-text');
            const loader = btn.querySelector('.btn-loader');
            
            if (isLoading) {
                btn.disabled = true;
                if (text) DOMUtils.addClass(text, 'hidden');
                if (loader) DOMUtils.removeClass(loader, 'hidden');
            } else {
                btn.disabled = false;
                if (text) DOMUtils.removeClass(text, 'hidden');
                if (loader) DOMUtils.addClass(loader, 'hidden');
            }
        }

    } catch (error) {
        ErrorLogger.log(error, { action: 'login_page_init' });
        console.error('Fatal error in login.js:', error);
    }
});
