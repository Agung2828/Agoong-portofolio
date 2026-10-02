// Deteksi WebGL
export function hasWebGL() {
    try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch { return false; }
}

// Profil kualitas otomatis. Paksa lewat URL: ?q=low atau ?q=high
export function getQuality() {
    const forced = new URLSearchParams(location.search).get('q');
    const coarse = matchMedia('(pointer: coarse)').matches;
    const small = Math.min(innerWidth, innerHeight) < 700;
    const lowCores = (navigator.hardwareConcurrency || 4) <= 4;
    const lowMem = (navigator.deviceMemory || 8) <= 4;

    let level = (coarse || small || lowCores || lowMem) ? 'low' : 'high';
    if (forced === 'low' || forced === 'high') level = forced;

    const dpr = window.devicePixelRatio || 1;
    return level === 'low'
        ? { level, antialias: false, shadows: false, shadowSize: 512, pixelRatio: Math.min(dpr, 1.25) }
        : { level, antialias: true, shadows: true, shadowSize: 2048, pixelRatio: Math.min(dpr, 2) };
}

// Penurun resolusi otomatis jika FPS rendah (panggil sekali per frame)
export function createAutoScaler(renderer, minRatio = 0.75) {
    let frames = 0, last = performance.now(), warmup = 2; // lewati 2 periode awal (loading)
    return function tick() {
        frames++;
        const now = performance.now();
        if (now - last < 2000) return;
        const fps = (frames * 1000) / (now - last);
        frames = 0; last = now;
        if (warmup-- > 0) return;
        const r = renderer.getPixelRatio();
        if (fps < 30 && r > minRatio) {
            renderer.setPixelRatio(Math.max(minRatio, r - 0.25));
            renderer.setSize(innerWidth, innerHeight);
        }
    };
}