/* =========================================
   PLAYER.JS - Logic & Interactivity
   Ngaos Al Falah Ploso
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Referensi Elemen DOM
    const audio = document.getElementById('audioStream');
    const btnPlay = document.getElementById('btnPlay');
    const playIcon = document.getElementById('playIcon');
    const playerLogo = document.getElementById('playerLogo');
    const playerVideo = document.getElementById('playerVideo');
    const speedSelect = document.getElementById('speedSelect');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const btnRewind = document.getElementById('btnRewind');
    const btnFF = document.getElementById('btnFF');

    let isPlaying = false;
    let holdInterval = null;

    // 1. Toggle Play/Pause & Berganti Visual Display (Logo / Video Loop)
    function togglePlay() {
        if (isPlaying) {
            audio.pause();
            playerVideo.pause();
            playerVideo.classList.add('hidden');
            playerLogo.classList.remove('hidden');
            playIcon.className = 'bx bx-play';
            isPlaying = false;
        } else {
            audio.play().then(() => {
                playerLogo.classList.add('hidden');
                playerVideo.classList.remove('hidden');
                playerVideo.currentTime = 0;
                playerVideo.play();
                playIcon.className = 'bx bx-pause';
                isPlaying = true;
            }).catch(err => {
                console.error("Gagal memutar audio:", err);
            });
        }
    }

    btnPlay.addEventListener('click', togglePlay);

    // 2. Pengaturan Kecepatan Pemutaran (Playback Speed)
    speedSelect.addEventListener('change', (e) => {
        audio.playbackRate = parseFloat(e.target.value);
    });

    // 3. Update Progress Bar & Format Waktu secara Real-time
    audio.addEventListener('timeupdate', () => {
        if (audio.duration && !isNaN(audio.duration)) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
            durationEl.textContent = formatTime(audio.duration);
        } else {
            currentTimeEl.textContent = formatTime(audio.currentTime);
            durationEl.textContent = "LIVE";
        }
    });

    // Reset saat audio selesai
    audio.addEventListener('ended', () => {
        isPlaying = false;
        playerVideo.pause();
        playerVideo.classList.add('hidden');
        playerLogo.classList.remove('hidden');
        playIcon.className = 'bx bx-play';
        progressBar.style.width = '0%';
    });

    // 4. Seek Pemutaran via Klik pada Progress Bar
    progressContainer.addEventListener('click', (e) => {
        if (!audio.duration || isNaN(audio.duration)) return;
        const width = progressContainer.clientWidth;
        const clickX = e.offsetX;
        audio.currentTime = (clickX / width) * audio.duration;
    });

    // 5. Fitur Hold Gesture (Tahan Tombol) Rewind & Fast-Forward
    function startSeeking(seconds) {
        seekAudio(seconds);
        holdInterval = setInterval(() => {
            seekAudio(seconds);
        }, 200);
    }

    function stopSeeking() {
        if (holdInterval) {
            clearInterval(holdInterval);
            holdInterval = null;
        }
    }

    function seekAudio(seconds) {
        const maxDuration = audio.duration || Infinity;
        audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, maxDuration));
    }

    // Event Listener Rewind (-10 Detik)
    btnRewind.addEventListener('mousedown', () => startSeeking(-10));
    btnRewind.addEventListener('mouseup', stopSeeking);
    btnRewind.addEventListener('mouseleave', stopSeeking);
    btnRewind.addEventListener('touchstart', (e) => { e.preventDefault(); startSeeking(-10); });
    btnRewind.addEventListener('touchend', stopSeeking);

    // Event Listener Fast-Forward (+10 Detik)
    btnFF.addEventListener('mousedown', () => startSeeking(10));
    btnFF.addEventListener('mouseup', stopSeeking);
    btnFF.addEventListener('mouseleave', stopSeeking);
    btnFF.addEventListener('touchstart', (e) => { e.preventDefault(); startSeeking(10); });
    btnFF.addEventListener('touchend', stopSeeking);

    // 6. Utility Helper: Format Waktu ke MM:SS
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
});
