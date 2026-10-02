export function initAudioUI(audio) {
    const btn = document.getElementById('audio-toggle');
    const vol = document.getElementById('audio-volume');
    if (!btn || !vol) return;

    const render = () => {
        btn.textContent = audio.muted || audio.volume === 0 ? '🔇' : '🔊';
        btn.setAttribute('aria-pressed', String(audio.muted));
        btn.setAttribute('aria-label', audio.muted ? 'Nyalakan suara' : 'Matikan suara');
        vol.value = Math.round(audio.volume * 100);
    };

    btn.addEventListener('click', () => { audio.toggleMute(); audio.click(); render(); });
    vol.addEventListener('input', () => {
        audio.setVolume(vol.value / 100);
        if (audio.muted && vol.value > 0) audio.setMuted(false);
        render();
    });
    render();
}