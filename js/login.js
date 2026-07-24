document.addEventListener("DOMContentLoaded", async function() {
    // 1. ELEMEN SLIDING UI
    const container = document.querySelector('.container');
    const registerBtn = document.querySelector('.register-btn');
    const loginBtn = document.querySelector('.login-btn');

    if (registerBtn && loginBtn && container) {
        registerBtn.addEventListener('click', () => {
            container.classList.add('active');
        });

        loginBtn.addEventListener('click', () => {
            container.classList.remove('active');
        });
    }

    // 2. ELEMEN FORM LOGIN & REGISTER
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const usernameInput = document.getElementById("username");
    const rememberCheckbox = document.getElementById("remember");
    const messageOutput = document.getElementById("message");
    const regMessageOutput = document.getElementById("regMessage");

    // 3. INISIALISASI CLERK SDK
    const waitForClerk = () => {
        return new Promise((resolve) => {
            if (window.Clerk && window.Clerk.isReady && window.Clerk.isReady()) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.Clerk && window.Clerk.isReady && window.Clerk.isReady()) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    };

    try {
        await waitForClerk();
        await window.Clerk.load();
    } catch (err) {
        console.error("Clerk Init Error:", err);
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

    // 4. PROSES SUBMIT LOGIN (CLERK)
    if (loginForm) {
        loginForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            if (messageOutput) messageOutput.style.display = "none";

            const usernameVal = usernameInput ? usernameInput.value.trim() : "";
            const passwordVal = document.getElementById("password") ? document.getElementById("password").value : "";

            if (!usernameVal || !passwordVal) {
                tampilkanError(messageOutput, "Username dan Password wajib diisi!");
                return;
            }

            try {
                const signInAttempt = await window.Clerk.client.signIn.create({
                    identifier: usernameVal,
                    password: passwordVal,
                });

                if (signInAttempt.status === "complete") {
                    await window.Clerk.setActive({ session: signInAttempt.createdSessionId });
                    prosesVerifikasiIcecast(usernameVal);
                } else {
                    tampilkanError(messageOutput, "Proses login belum selesai.");
                }
            } catch (err) {
                console.error("Clerk Login Error:", err);
                const errorMsg = err.errors && err.errors[0] ? err.errors[0].message : "Username atau Password salah!";
                tampilkanError(messageOutput, errorMsg);
            }
        });
    }

    // 5. PROSES SUBMIT REGISTRASI (CLERK)
    if (registerForm) {
        registerForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            if (regMessageOutput) regMessageOutput.style.display = "none";

            const regUsername = document.getElementById("regUsername") ? document.getElementById("regUsername").value.trim() : "";
            const regEmail = document.getElementById("regEmail") ? document.getElementById("regEmail").value.trim() : "";
            const regPassword = document.getElementById("regPassword") ? document.getElementById("regPassword").value : "";

            if (!regUsername || !regEmail || !regPassword) {
                tampilkanError(regMessageOutput, "Semua kolom wajib diisi!");
                return;
            }

            try {
                const signUpAttempt = await window.Clerk.client.signUp.create({
                    username: regUsername,
                    emailAddress: regEmail,
                    password: regPassword,
                });

                if (signUpAttempt.status === "complete") {
                    await window.Clerk.setActive({ session: signUpAttempt.createdSessionId });
                    if (typeof Auth !== 'undefined') Auth.createSession(regUsername);
                    window.location.href = CONFIG.PLAYER_PAGE;
                } else {
                    tampilkanError(regMessageOutput, "Pendaftaran butuh verifikasi tambahan via email.");
                }
            } catch (err) {
                console.error("Clerk Register Error:", err);
                const errorMsg = err.errors && err.errors[0] ? err.errors[0].message : "Gagal mendaftar!";
                tampilkanError(regMessageOutput, errorMsg);
            }
        });
    }

    // 6. PROTEKSI MULTI-DEVICE VIA ICECAST
    function prosesVerifikasiIcecast(username) {
        if (typeof CONFIG === 'undefined') return;
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

            if (jumlahPendengarAktif > 1) {
                tampilkanError(messageOutput, "Akun sedang aktif di perangkat lain!");
            } else {
                simpanSesiDanRedirect(username);
            }
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

    function tampilkanError(element, teks) {
        if (!element) return;
        element.innerText = teks;
        element.style.display = "block";
    }
});

