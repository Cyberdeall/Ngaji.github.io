// =========================================================================
// LOGIN.JS - Modul Autentikasi Clerk & Sliding Panel UI
// Ngaos Al Falah Ploso
// =========================================================================

document.addEventListener("DOMContentLoaded", async function() {
    // 1. ELEMEN SLIDING UI
    const container = document.querySelector('.container');
    const registerBtn = document.querySelector('.register-btn');
    const loginBtn = document.querySelector('.login-btn');

    if (registerBtn && loginBtn && container) {
        registerBtn.addEventListener('click', () => {
            container.classList.add('active');
            clearErrorMessages();
        });

        loginBtn.addEventListener('click', () => {
            container.classList.remove('active');
            clearErrorMessages();
        });
    }

    // 2. ELEMEN FORM LOGIN & REGISTER
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");
    const messageOutput = document.getElementById("message");
    const regMessageOutput = document.getElementById("regMessage");
    const btnLogin = document.getElementById("btnLogin");
    const btnRegister = document.getElementById("btnRegister");
    const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

    // 3. TOGGLE LIHAT / SEMBUNYIKAN PASSWORD
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input && input.type === 'password') {
                input.type = 'text';
                this.classList.replace('bxs-lock-alt', 'bx-show');
            } else if (input) {
                input.type = 'password';
                this.classList.replace('bx-show', 'bxs-lock-alt');
            }
        });
    });

    // 4. INISIALISASI CLERK SDK BEBAS RACE-CONDITION
    const initClerk = async () => {
        return new Promise((resolve) => {
            if (window.Clerk && window.Clerk.isReady && window.Clerk.isReady()) {
                resolve();
                return;
            }
            const interval = setInterval(() => {
                if (window.Clerk) {
                    clearInterval(interval);
                    window.Clerk.load({
                        publishableKey: (typeof CONFIG !== 'undefined' && CONFIG.CLERK_PUBLISHABLE_KEY) 
                            ? CONFIG.CLERK_PUBLISHABLE_KEY 
                            : undefined
                    }).then(() => resolve()).catch(() => resolve());
                }
            }, 100);
        });
    };

    try {
        await initClerk();
    } catch (err) {
        console.error("Clerk init warn:", err);
    }

    // Auto-fill Remember Username
    if (usernameInput && rememberCheckbox && typeof CONFIG !== 'undefined') {
        const savedUsername = localStorage.getItem(CONFIG.REMEMBER_KEY);
        if (savedUsername) {
            usernameInput.value = savedUsername;
            rememberCheckbox.checked = true;
        }
    }

    // Auto-redirect Jika Sesi Masih Aktif
    if (typeof CONFIG !== 'undefined' && localStorage.getItem(CONFIG.SESSION_KEY)) {
        try {
            const session = JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY));
            if (Date.now() < session.expireTime) {
                window.location.href = CONFIG.PLAYER_PAGE;
                return;
            }
        } catch(e) {}
    }

    // 5. SISTEM PEMETA EROR RAMAH PENGGUNA (INDONESIA)
    function mapClerkError(err) {
        let code = "";
        let message = "";

        if (err && err.errors && err.errors.length > 0) {
            code = err.errors[0].code || "";
            message = err.errors[0].message || "";
        } else if (err && err.message) {
            message = err.message;
        }

        const codeLower = code.toLowerCase();
        const msgLower = message.toLowerCase();

        if (codeLower.includes("identifier_not_found") || msgLower.includes("couldn't find your account") || msgLower.includes("user not found")) {
            return {
                title: "Email Tidak Terdaftar",
                text: "Alamat email ini belum terdaftar di aplikasi Ngaos.",
                advice: "💡 Saran: Periksa kembali ejaan email Anda atau klik tombol 'Daftar Akun' untuk pendaftaran."
            };
        }

        if (codeLower.includes("form_password_incorrect") || msgLower.includes("password incorrect") || msgLower.includes("invalid password")) {
            return {
                title: "Kata Sandi Salah",
                text: "Kata sandi yang Anda masukkan tidak sesuai.",
                advice: "💡 Saran: Periksa tombol Caps Lock dan penulisan huruf besar/kecil kata sandi Anda."
            };
        }

        if (codeLower.includes("form_identifier_exists") || msgLower.includes("already exists") || msgLower.includes("email address is taken")) {
            return {
                title: "Email Sudah Terdaftar",
                text: "Alamat email ini sudah terdaftar di sistem.",
                advice: "💡 Saran: Silakan tekan tombol 'Masuk' untuk login menggunakan email tersebut."
            };
        }

        if (codeLower.includes("password_length") || msgLower.includes("minimum 8 characters") || msgLower.includes("password too short")) {
            return {
                title: "Kata Sandi Terlalu Pendek",
                text: "Kata sandi minimal terdiri dari 8 karakter.",
                advice: "💡 Saran: Buat kata sandi minimal 8 karakter agar akun Anda tetap aman."
            };
        }

        if (codeLower.includes("form_invalid_email") || msgLower.includes("email address must be valid")) {
            return {
                title: "Format Email Tidak Valid",
                text: "Penulisan alamat email tidak sesuai format.",
                advice: "💡 Saran: Pastikan format email benar (contoh: nama@gmail.com)."
            };
        }

        if (codeLower.includes("too_many_requests") || msgLower.includes("too many requests") || msgLower.includes("rate limit")) {
            return {
                title: "Terlalu Banyak Percobaan",
                text: "Akses dibatasi sementara demi keamanan.",
                advice: "💡 Saran: Silakan tunggu 1 - 2 menit sebelum mencoba masuk kembali."
            };
        }

        if (!navigator.onLine || msgLower.includes("network") || msgLower.includes("failed to fetch")) {
            return {
                title: "Koneksi Terputus",
                text: "Gagal terhubung ke server autentikasi.",
                advice: "💡 Saran: Periksa koneksi internet Wi-Fi / Seluler Anda lalu coba lagi."
            };
        }

        return {
            title: "Gagal Memproses",
            text: message || "Terjadi kendala saat menghubungkan akun.",
            advice: "💡 Saran: Silakan periksa data Anda atau muat ulang (refresh) halaman."
        };
    }

    function tampilkanErrorFormatted(containerEl, errObj) {
        if (!containerEl) return;
        containerEl.innerHTML = `
            <div class="friendly-error-card">
                <div class="error-title"><i class='bx bx-error-circle'></i> ${errObj.title}</div>
                <div class="error-text">${errObj.text}</div>
                <div class="error-advice">${errObj.advice}</div>
            </div>
        `;
    }

    function clearErrorMessages() {
        if (messageOutput) messageOutput.innerHTML = "";
        if (regMessageOutput) regMessageOutput.innerHTML = "";
    }

    function setButtonLoading(btn, isLoading) {
        if (!btn) return;
        const textSpan = btn.querySelector('.btn-text');
        const spinnerSpan = btn.querySelector('.btn-spinner');
        if (isLoading) {
            btn.disabled = true;
            if (textSpan) textSpan.style.display = 'none';
            if (spinnerSpan) spinnerSpan.style.display = 'inline-flex';
        } else {
            btn.disabled = false;
            if (textSpan) textSpan.style.display = 'inline';
            if (spinnerSpan) spinnerSpan.style.display = 'none';
        }
    }

    // 6. PROSES SUBMIT LOGIN
    if (loginForm) {
        loginForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            clearErrorMessages();

            const username = usernameInput ? usernameInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";

            if (!username || !password) {
                tampilkanErrorFormatted(messageOutput, {
                    title: "Data Belum Lengkap",
                    text: "Alamat email dan kata sandi wajib diisi.",
                    advice: "💡 Saran: Silakan lengkapi seluruh kolom di atas."
                });
                return;
            }

            setButtonLoading(btnLogin, true);

            try {
                if (window.Clerk && window.Clerk.client) {
                    const signInResponse = await window.Clerk.client.signIn.create({
                        identifier: username,
                        password: password
                    });

                    if (signInResponse.status === "complete") {
                        await window.Clerk.setActive({ session: signInResponse.createdSessionId });
                        cekPendengarDanRedirect(username);
                        return;
                    }
                }
                // Fallback login lokal jika Clerk offline / tidak dikonfigurasi
                cekPendengarDanRedirect(username);
            } catch (err) {
                setButtonLoading(btnLogin, false);
                const friendlyErr = mapClerkError(err);
                tampilkanErrorFormatted(messageOutput, friendlyErr);
            }
        });
    }

    // 7. PROSES SUBMIT REGISTER
    if (registerForm) {
        registerForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            clearErrorMessages();

            const regEmail = document.getElementById("regEmail") ? document.getElementById("regEmail").value.trim() : "";
            const regName = document.getElementById("regName") ? document.getElementById("regName").value.trim() : "";
            const regPassword = document.getElementById("regPassword") ? document.getElementById("regPassword").value : "";

            if (!regEmail || !regName || !regPassword) {
                tampilkanErrorFormatted(regMessageOutput, {
                    title: "Data Pendaftaran Belum Lengkap",
                    text: "Seluruh kolom formulir pendaftaran wajib diisi.",
                    advice: "💡 Saran: Pastikan Email, Nama, dan Kata Sandi telah terisi."
                });
                return;
            }

            if (regPassword.length < 8) {
                tampilkanErrorFormatted(regMessageOutput, {
                    title: "Kata Sandi Kurang Panjang",
                    text: "Kata sandi minimal 8 karakter.",
                    advice: "💡 Saran: Gunakan kombinasi huruf dan angka minimal 8 Karakter."
                });
                return;
            }

            setButtonLoading(btnRegister, true);

            try {
                if (window.Clerk && window.Clerk.client) {
                    const signUpResponse = await window.Clerk.client.signUp.create({
                        emailAddress: regEmail,
                        firstName: regName,
                        password: regPassword
                    });

                    if (signUpResponse.status === "complete") {
                        await window.Clerk.setActive({ session: signUpResponse.createdSessionId });
                        simpanSesiDanRedirect(regName || regEmail);
                        return;
                    }
                }
                // Fallback register lokal
                simpanSesiDanRedirect(regName || regEmail);
            } catch (err) {
                setButtonLoading(btnRegister, false);
                const friendlyErr = mapClerkError(err);
                tampilkanErrorFormatted(regMessageOutput, friendlyErr);
            }
        });
    }

    // 8. LUPA PASSWORD LINK HANDLER
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener("click", function(e) {
            e.preventDefault();
            tampilkanErrorFormatted(messageOutput, {
                title: "Lupa Kata Sandi",
                text: "Untuk mereset kata sandi Anda, silakan hubungi pengurus radio.",
                advice: "💡 Saran: Kirim pesan ke admin majlis atau lakukan pendaftaran ulang."
            });
        });
    }

    // 9. CEK LISTENERS ICECAST & REDIRECT
    function cekPendengarDanRedirect(username) {
        if (typeof CONFIG === 'undefined' || !CONFIG.STREAM_URL) {
            simpanSesiDanRedirect(username);
            return;
        }

        const statusUrl = CONFIG.STREAM_URL.replace("/radio", "/status-json.xsl");

        fetch(statusUrl + "?cb=" + Date.now())
            .then(res => res.json())
            .then(data => {
                let jumlahPendengarAktif = 0;
                if (data && data.icestats && data.icestats.source) {
                    const sources = Array.isArray(data.icestats.source) ? data.icestats.source : [data.icestats.source];
                    sources.forEach(src => {
                        if (src.listeners !== undefined) {
                            jumlahPendengarAktif = parseInt(src.listeners, 10);
                        }
                    });
                }
                simpanSesiDanRedirect(username);
            })
            .catch(err => {
                simpanSesiDanRedirect(username);
            });
    }

    function simpanSesiDanRedirect(username) {
        if (typeof Auth !== 'undefined') Auth.createSession(username);
        if (rememberCheckbox && rememberCheckbox.checked) {
            localStorage.setItem(CONFIG.REMEMBER_KEY, username);
        } else {
            localStorage.removeItem(CONFIG.REMEMBER_KEY);
        }
        window.location.href = CONFIG.PLAYER_PAGE;
    }
});

