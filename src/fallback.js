export function showFallback(reason = 'WebGL tidak tersedia di perangkat ini.') {
    document.getElementById('canvas-root')?.remove();
    document.getElementById('nav')?.remove();
    document.getElementById('audio-ui')?.remove();

    const box = document.createElement('main');
    box.id = 'fallback';
    box.innerHTML = `
    <h1>Portfolio</h1>
    <p>${reason}</p>
    <p class="muted">Versi 3D butuh WebGL. Coba browser lain, aktifkan hardware acceleration,
    atau buka lewat Chrome/Edge/Firefox terbaru.</p>
    <p><a href="/resume.pdf">Unduh resume (PDF)</a></p>
  `;
    document.body.appendChild(box);
}