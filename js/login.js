document.addEventListener("DOMContentLoaded", async function() {
    // 1. ELEMEN UI & SLIDER
    const container = document.querySelector('.container');
    const registerBtn = document.querySelector('.register-btn');
    const loginBtn = document.querySelector('.login-btn');

    if (registerBtn && loginBtn && container) {
        registerBtn.addEventListener('click', () => container.classList.add('active'));
        loginBtn.addEventListener('click', () => container.classList.remove('active'));
    }

    // 2. TOGGLE PASSWORD EYE ICON
    document.querySelectorAll('.toggle-pwd').forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                this.classList.replace('bx-hide', 'bx-show');
            } else {
                targetInput.type = 'password';
                this.classList.replace('bx-show', 'bx-hide');
            }
        });
    });

    // 3. ELEMEN FORM & MODAL OTP
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");
    const messageOutput = document.getElementById("message");
    const regMessageOutput = document.getElementById("regMessage");

    const otpModal = document.getElementById("otpModal");
    const otpCodeInput = document.getElementById("otpCode");
    const otpMessageOutput = document.getElementById("otpMessage");
    const btnVerifyOtp = document.getElementById("btnVerifyOtp");
    const btnCancelOtp = document.getElementById("btnCancelOtp");

    let currentSignUpAttempt = null;

    // Load username jika pernah dicentang "Ingat Saya"
    if (rememberCheckbox && localStorage.getItem(CONFIG.REMEMBER_KEY)) {
        usernameInput.value = localStorage.getItem(CONFIG.REMEMBER_KEY);
        rememberCheckbox.checked = true;
    }

    // 4. INISIALISASI CLERK SDK
    async function initClerk() {
        if (!window.Clerk) {
            tampilkanError(messageOutput, "Gagal memuat SDK Keamanan. Periksa koneksi internet Anda.");
            return false;
        }
        if (!window.Clerk.isReady()) {
            await window.Clerk.load({ publishableKey: CONFIG.CLERK_PUBLISHABLE_KEY });
        }
        return true;
    }

    // 5. PEMETA PESAN EROR RAMAH PENGGUNA
    function mapFriendlyError(err) {
        const code = err?.errors?.[0]?.code || err?.message || "";
        
        switch (code) {
            case "form_identifier_not_found":
                return "⛔ Email tidak terdaftar. Silakan periksa kembali email Anda atau klik 'Daftar Akun'.";
            case "form_password_incorrect":
                return "⛔ Kata sandi yang Anda masukkan salah. Silakan periksa kembali huruf besar/kecil kata sandi Anda.";
            case "form_identifier_exists":
                return "ℹ️ Email ini sudah terdaftar. Silakan pindah ke halaman 'Masuk' untuk login.";
            case "form_password_length_too_short":
                return "⚠️ Kata sandi terlalu pendek. Gunakan minimal 8 karakter demi keamanan akun Anda.";
            case "form_code_incorrect":
                return "❌ Kode OTP yang Anda masukkan salah. Silakan periksa kembali email Anda.";
            case "too_many_requests":
                return "⏳ Terlalu banyak percobaan. Demi keamanan, silakan tunggu 1-2 menit sebelum mencoba kembali.";
            default:
                if (typeof err === "string") return err;
                return "⚠️ Terjadi kendala saat memproses permintaan. Pastikan koneksi internet Anda stabil.";
        }
    }

    // 6. LOGIKA LOGIN (STRICT SINGLE-DEVICE & ADMIN APPROVAL)
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            setLoading("btnLogin", true);
            sembunyikanPesan(messageOutput);

            const isClerkReady = await initClerk();
            if (!isClerkReady) { setLoading("btnLogin", false); return; }

            const email = usernameInput.value.trim();
            const password = passwordInput.value;

            try {
                // A. Proses SignIn ke Clerk
                const signInAttempt = await window.Clerk.client.signIn.create({
                    identifier: email,
                    password: password
                });

                if (signInAttempt.status === "complete") {
                    await window.Clerk.setActive({ session: signInAttempt.createdSessionId });
                    
                    // B. PREVENT MULTI-DEVICE (STRICT SINGLE DEVICE BLOCK)
                    const user = window.Clerk.user;
                    const sessions = await user.getSessions();
                    const activeSessions = sessions.filter(s => s.status === "active");

                    if (activeSessions.length > 1) {
                        // Tolak & Keluar dari sesi baru
                        await window.Clerk.signOut();
                        tampilkanError(messageOutput, 
                            "⛔ GAGAL MASUK: AKUN SEDANG DIGUNAKAN\n\n" +
                            "Akun Anda saat ini sedang aktif di perangkat lain. Satu akun hanya dapat digunakan pada 1 perangkat dalam satu waktu.\n\n" +
                            "💡 Anjuran:\n" +
                            "• Silakan logout dari aplikasi di perangkat Anda sebelumnya.\n" +
                            "• Jika Anda merasa tidak login di perangkat lain, atur ulang kata sandi Anda."
                        );
                        setLoading("btnLogin", false);
                        return;
                    }

                    // C. CEK PERSETUJUAN ADMIN (ADMIN APPROVAL)
                    const isApproved = user.publicMetadata?.approved;
                    if (isApproved === false) {
                        await window.Clerk.signOut();
                        tampilkanError(messageOutput, 
                            "⏳ AKUN MENUNGGU PERSETUJUAN ADMIN\n\n" +
                            "Pendaftaran Anda telah berhasil, namun akun Anda masih dalam proses verifikasi oleh Admin.\n\n" +
                            "💡 Anjuran: Silakan hubungi Admin Al Falah Ploso untuk pengaktifan akun."
                        );
                        setLoading("btnLogin", false);
                        return;
                    }

                    // Success -> Simpan Sesi & Redirect ke Player
                    simpanSesiDanRedirect(user.fullName || user.primaryEmailAddress.emailAddress);
                } else {
                    tampilkanError(messageOutput, "Proses masuk memerlukan langkah verifikasi tambahan.");
                }
            } catch (err) {
                tampilkanError(messageOutput, mapFriendlyError(err));
            } finally {
                setLoading("btnLogin", false);
            }
        });
    }

    // 7. LOGIKA REGISTER (HEADLESS + EMAIL OTP)
    if (registerForm) {
        registerForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            setLoading("btnRegister", true);
            sembunyikanPesan(regMessageOutput);

            const isClerkReady = await initClerk();
            if (!isClerkReady) { setLoading("btnRegister", false); return; }

            const fullName = document.getElementById("regFullName").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;

            try {
                // Buat Pendaftaran Baru via Headless API
                currentSignUpAttempt = await window.Clerk.client.signUp.create({
                    firstName: fullName,
                    emailAddress: email,
                    password: password
                });

                // Kirim Kode OTP ke Email
                await currentSignUpAttempt.prepareEmailAddressVerification({ strategy: "email_code" });

                // Tampilkan Modal OTP
                otpModal.classList.remove("hidden");
                tampilkanSukses(otpMessageOutput, "Kode OTP telah dikirim ke " + email);

            } catch (err) {
                tampilkanError(regMessageOutput, mapFriendlyError(err));
            } finally {
                setLoading("btnRegister", false);
            }
        });
    }

    // 8. VERIFIKASI KODE OTP
    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener("click", async function() {
            const code = otpCodeInput.value.trim();
            if (code.length < 6) {
                tampilkanError(otpMessageOutput, "Silakan masukkan 6 angka kode OTP.");
                return;
            }

            try {
                const verification = await currentSignUpAttempt.attemptEmailAddressVerification({ code });

                if (verification.status === "complete") {
                    otpModal.classList.add("hidden");
                    
                    // Keluar dari sesi otomatis agar user WAJIB LOGIN KEMBALI
                    await window.Clerk.signOut();

                    // Switch Slider ke Form Login
                    container.classList.remove("active");

                    tampilkanSukses(messageOutput, 
                        "✅ PENDAFTARAN BERHASIL!\n\n" +
                        "Akun Anda telah terverifikasi. Silakan masuk menggunakan email dan kata sandi yang baru Anda daftarkan."
                    );
                } else {
                    tampilkanError(otpMessageOutput, "Kode verifikasi belum sesuai. Periksa kembali email Anda.");
                }
            } catch (err) {
                tampilkanError(otpMessageOutput, mapFriendlyError(err));
            }
        });
    }

    if (btnCancelOtp) {
        btnCancelOtp.addEventListener("click", () => otpModal.classList.add("hidden"));
    }

    // HELPER FUNCTIONS
    function simpanSesiDanRedirect(username) {
        if (typeof Auth !== 'undefined') Auth.createSession(username);
        if (rememberCheckbox && rememberCheckbox.checked) {
            localStorage.setItem(CONFIG.REMEMBER_KEY, username);
        } else {
            localStorage.removeItem(CONFIG.REMEMBER_KEY);
        }
        window.location.href = CONFIG.PLAYER_PAGE;
    }

    function tampilkanError(element, teks) {
        if (!element) return;
        element.innerText = teks;
        element.className = "alert-box error";
    }

    function tampilkanSukses(element, teks) {
        if (!element) return;
        element.innerText = teks;
        element.className = "alert-box success";
    }

    function sembunyikanPesan(element) {
        if (!element) return;
        element.className = "alert-box";
        element.innerText = "";
    }

    function setLoading(btnId, isLoading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        if (isLoading) {
            btn.disabled = true;
            if (text) text.classList.add('hidden');
            if (loader) loader.classList.remove('hidden');
        } else {
            btn.disabled = false;
            if (text) text.classList.remove('hidden');
            if (loader) loader.classList.add('hidden');
        }
    }
});

