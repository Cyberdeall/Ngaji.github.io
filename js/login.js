/**
 * =========================================
 * LOGIN.JS
 * Version 4.3.0 - Hybrid Verification (OTP & Magic Link Support)
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

        // ========== 4. INISIALISASI CLERK SDK ==========
        async function initClerk() {
            try {
                if (!window.Clerk) {
                    showError(messageOutput, "Gagal memuat SDK Keamanan. Periksa koneksi internet Anda.");
                    ErrorLogger.log(new Error('Clerk SDK not loaded'), { action: 'initClerk' });
                    return false;
                }

                if (!window.Clerk.loaded) {
                    await PromiseHelper.withTimeout(
                        window.Clerk.load({ 
                            publishableKey: CONFIG.CLERK_PUBLISHABLE_KEY 
                        }),
                        CONSTANTS.CLERK.TIMEOUT_MS,
                        'Clerk initialization timeout'
                    );
                }

                // Cek jika pengguna masuk via Magic Link (Link Verifikasi Email)
                if (window.Clerk.user) {
                    const user = window.Clerk.user;
                    saveSesiAndRedirect(user.fullName || user.primaryEmailAddress.emailAddress);
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

        // ========== 6. LOGIKA LOGIN (FLEKSIBEL OTP / MAGIC LINK) ==========
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

                    // A. Proses SignIn ke Clerk
                    const signInAttempt = await window.Clerk.client.signIn.create({
                        identifier: email,
                        password: password
                    });

                    // B. KONDISI 1: LANGSUNG LULUS (Tanpa Verifikasi Tambahan)
                    if (signInAttempt.status === "complete") {
                        await window.Clerk.setActive({ session: signInAttempt.createdSessionId });
                        
                        const user = window.Clerk.user;
                        const sessions = await user.getSessions();
                        const activeSessions = sessions.filter(s => s.status === "active");

                        if (activeSessions.length > 1) {
                            await window.Clerk.signOut();
                            showError(messageOutput, 
                                "⛔ GAGAL MASUK: AKUN SEDANG DIGUNAKAN\n\n" +
                                "Akun Anda saat ini sedang aktif di perangkat lain."
                            );
                            setLoading("btnLogin", false);
                            RateLimiter.reset('login');
                            return;
                        }

                        const isApproved = user.publicMetadata?.approved;
                        if (isApproved === false) {
                            await window.Clerk.signOut();
                            showError(messageOutput, 
                                "⏳ AKUN MENUNGGU PERSETUJUAN ADMIN\n\n" +
                                "Akun Anda masih dalam proses verifikasi oleh Admin."
                            );
                            setLoading("btnLogin", false);
                            return;
                        }

                        saveSesiAndRedirect(user.fullName || user.primaryEmailAddress.emailAddress);
                        RateLimiter.reset('login');

                    } 
                    // C. KONDISI 2: MEMBUTUHKAN VERIFIKASI (OTP ATAU MAGIC LINK)
                    else if (signInAttempt.status === "needs_first_factor" || signInAttempt.status === "needs_second_factor") {
                        currentSignInAttempt = signInAttempt;
                        authMode = 'login';

                        const factors = signInAttempt.supportedFirstFactors || signInAttempt.supportedSecondFactors || [];
                        const otpFactor = factors.find(f => f.strategy === "email_code");
                        const linkFactor = factors.find(f => f.strategy === "email_link");

                        // Jika Dashboard Menggunakan Kode OTP
                        if (otpFactor) {
                            if (signInAttempt.status === "needs_first_factor") {
                                await signInAttempt.prepareFirstFactor({ strategy: "email_code", emailAddressId: otpFactor.emailAddressId });
                            } else {
                                await signInAttempt.prepareSecondFactor({ strategy: "email_code" });
                            }

                            DOMUtils.removeClass(otpModal, "hidden");
                            showSuccess(otpMessageOutput, "🔑 Kode verifikasi (OTP) telah dikirim ke email Anda.");
                        } 
                        // Jika Dashboard Menggunakan Magic Link
                        else if (linkFactor) {
                            if (signInAttempt.status === "needs_first_factor") {
                                await signInAttempt.prepareFirstFactor({
                                    strategy: "email_link",
                                    emailAddressId: linkFactor.emailAddressId,
                                    redirectUrl: window.location.href
                                });
                            }

                            showSuccess(messageOutput, "📧 Link verifikasi telah dikirim ke email Anda. Silakan buka email Anda dan klik link tersebut untuk masuk.");
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

        // ========== 7. LOGIKA REGISTER (FLEKSIBEL OTP / MAGIC LINK) ==========
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

                    // Coba Mengirimkan Kode OTP Dulu
                    try {
                        await currentSignUpAttempt.prepareEmailAddressVerification({ strategy: "email_code" });
                        DOMUtils.removeClass(otpModal, "hidden");
                        showSuccess(otpMessageOutput, "✅ Kode OTP telah dikirim ke " + email);
                    } 
                    // Fallback Otomatis ke Magic Link jika OTP Tidak Aktif di Dashboard
                    catch (otpErr) {
                        await currentSignUpAttempt.prepareEmailAddressVerification({
                            strategy: "email_link",
                            redirectUrl: window.location.href
                        });
                        showSuccess(regMessageOutput, "📧 Link verifikasi pendaftaran telah dikirim ke " + email + ". Silakan cek email Anda untuk menyelesaikan pendaftaran.");
                    }

                } catch (err) {
                    ErrorLogger.log(err, { action: 'register_submit' });
                    showError(regMessageOutput, mapFriendlyError(err));
                } finally {
                    setLoading("btnRegister", false);
                }
            });
        }

        // ========== 8. VERIFIKASI KODE OTP (HANYA AKTIF SAAT MODE OTP) ==========
        if (btnVerifyOtp) {
            btnVerifyOtp.addEventListener("click", async function() {
                try {
                    const code = otpCodeInput.value.trim();
                    
                    if (!FormValidator.isValidOTP(code)) {
                        showError(otpMessageOutput, "❌ Silakan masukkan 6 angka kode OTP.");
                        return;
                    }

                    setLoading("btnVerifyOtp", true);

                    // A. Verifikasi OTP Register
                    if (authMode === 'signup' && currentSignUpAttempt) {
                        const verification = await currentSignUpAttempt.attemptEmailAddressVerification({ code });

                        if (verification.status === "complete") {
                            DOMUtils.addClass(otpModal, "hidden");
                            await window.Clerk.signOut();
                            DOMUtils.removeClass(container, "active");

                            showSuccess(messageOutput, 
                                "✅ PENDAFTARAN BERHASIL!\n\n" +
                                "Akun Anda telah terverifikasi. Silakan masuk menggunakan email dan kata sandi Anda."
                            );
                            otpCodeInput.value = '';
                        } else {
                            showError(otpMessageOutput, "❌ Kode verifikasi belum sesuai.");
                        }
                    } 
                    // B. Verifikasi OTP Login
                    else if (authMode === 'login' && currentSignInAttempt) {
                        let result;
                        if (currentSignInAttempt.status === 'needs_first_factor') {
                            result = await currentSignInAttempt.attemptFirstFactor({ strategy: 'email_code', code });
                        } else {
                            result = await currentSignInAttempt.attemptSecondFactor({ strategy: 'email_code', code });
                        }

                        if (result.status === "complete") {
                            await window.Clerk.setActive({ session: result.createdSessionId });
                            DOMUtils.addClass(otpModal, "hidden");
                            otpCodeInput.value = '';

                            const user = window.Clerk.user;
                            saveSesiAndRedirect(user.fullName || user.primaryEmailAddress.emailAddress);
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
                
                window.location.href = CONFIG.PLAYER_PAGE;
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

