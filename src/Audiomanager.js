// =====================================================================
// AudioManager — semua suara DIBUAT LEWAT KODE (Web Audio API).
// Tidak ada file audio, jadi tidak ada masalah hak cipta dan tidak
// menambah beban loading.
//
// Lapisan suara:
//   ambience : dengung ruangan + angin malam (sangat pelan)
//   music    : lo-fi generatif (pad, bass, drum lembut, melodi jarang)
//   sfx      : ketikan keyboard, klik mouse, hover, buka/tutup panel, whoosh kamera
//
// Semua method aman dipanggil kapan saja: jika audio belum dimulai atau
// browser tidak mendukung, method tidak melakukan apa-apa.
// =====================================================================

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Progresi akor: Cmaj7 - Am7 - Dm7 - G7 (tiap akor = 1 bar)
const CHORDS = [
    { root: 48, notes: [60, 64, 67, 71] },
    { root: 45, notes: [57, 60, 64, 67] },
    { root: 50, notes: [62, 65, 69, 72] },
    { root: 43, notes: [59, 62, 65, 67] },
];
// Nada melodi (pentatonik C mayor)
const PENTA = [72, 74, 76, 79, 81, 84];

const STORAGE_KEY = 'portfolio-audio';

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = false;   // true setelah start() berhasil
        this.muted = false;
        this.volume = 0.7;      // 0..1
        this.bpm = 74;
        this._timer = null;
        this._loadPrefs();
    }

    // ------------------------------------------------------------------
    // Preferensi (disimpan di localStorage, aman jika diblokir browser)
    // ------------------------------------------------------------------
    _loadPrefs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const p = JSON.parse(raw);
            if (typeof p.volume === 'number') this.volume = Math.min(1, Math.max(0, p.volume));
            if (typeof p.muted === 'boolean') this.muted = p.muted;
        } catch { /* abaikan */ }
    }

    _savePrefs() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: this.volume, muted: this.muted }));
        } catch { /* abaikan */ }
    }

    // ------------------------------------------------------------------
    // Start — HARUS dipanggil dari event klik/tap pengguna (aturan autoplay)
    // ------------------------------------------------------------------
    start() {
        if (this.ctx) { this.ctx.resume().catch(() => { }); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
            this.ctx = new AC();
            this._build();
            this.enabled = true;
            this.ctx.resume().catch(() => { });
            this._applyVolume(0.8);
            this._startAmbience();
            this._startMusic();
        } catch (err) {
            console.warn('Audio tidak tersedia:', err);
            this.enabled = false;
            return;
        }
        if (!this._visBound) {
            this._visBound = true;
            document.addEventListener('visibilitychange', () => {
                if (!this.ctx) return;
                if (document.hidden) this.ctx.suspend().catch(() => { });
                else if (!this.muted) this.ctx.resume().catch(() => { });
            });
        }
    }

    // ------------------------------------------------------------------
    // Graf audio dasar: bus -> master -> compressor -> speaker
    // ------------------------------------------------------------------
    _build() {
        const c = this.ctx;

        this.master = c.createGain();
        this.master.gain.value = 0;
        const comp = c.createDynamicsCompressor();
        this.master.connect(comp);
        comp.connect(c.destination);

        this.musicBus = c.createGain();
        this.musicBus.gain.value = 0.5;
        this.ambBus = c.createGain();
        this.ambBus.gain.value = 0.6;
        this.sfxBus = c.createGain();
        this.sfxBus.gain.value = 0.9;

        // Musik dilewatkan lowpass supaya terdengar hangat ala kaset
        const tape = c.createBiquadFilter();
        tape.type = 'lowpass';
        tape.frequency.value = 6000;
        this.musicBus.connect(tape);
        tape.connect(this.master);
        this.ambBus.connect(this.master);
        this.sfxBus.connect(this.master);

        // Buffer noise 2 detik, dipakai ulang oleh semua efek
        const len = c.sampleRate * 2;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        // Echo untuk melodi (delay + feedback + lowpass)
        this.echoIn = c.createGain();
        this.echoIn.gain.value = 0.35;
        const delay = c.createDelay(1);
        delay.delayTime.value = 60 / this.bpm * 0.75;
        const feedback = c.createGain();
        feedback.gain.value = 0.35;
        const echoLP = c.createBiquadFilter();
        echoLP.type = 'lowpass';
        echoLP.frequency.value = 1800;
        this.echoIn.connect(delay);
        delay.connect(echoLP);
        echoLP.connect(feedback);
        feedback.connect(delay);
        echoLP.connect(this.musicBus);
    }

    _noiseSrc(loop = false) {
        const s = this.ctx.createBufferSource();
        s.buffer = this.noiseBuf;
        s.loop = loop;
        return s;
    }

    // Envelope sederhana: naik cepat lalu meluruh
    _env(gainNode, t, peak, attack, decay) {
        const g = gainNode.gain;
        g.setValueAtTime(0.0001, t);
        g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
        g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }

    // ------------------------------------------------------------------
    // Volume & mute
    // ------------------------------------------------------------------
    _applyVolume(smooth = 0.12) {
        if (!this.ctx) return;
        const target = this.muted ? 0 : Math.pow(this.volume, 2) * 0.9;
        this.master.gain.setTargetAtTime(target, this.ctx.currentTime, smooth);
    }

    setVolume(v) {
        this.volume = Math.min(1, Math.max(0, v));
        this._applyVolume();
        this._savePrefs();
    }

    setMuted(m) {
        this.muted = !!m;
        this._applyVolume();
        this._savePrefs();
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    // ------------------------------------------------------------------
    // AMBIENCE
    // ------------------------------------------------------------------
    _startAmbience() {
        const c = this.ctx;

        // Dengung ruangan (noise yang difilter sangat rendah)
        const room = this._noiseSrc(true);
        const roomLP = c.createBiquadFilter();
        roomLP.type = 'lowpass';
        roomLP.frequency.value = 380;
        const roomG = c.createGain();
        roomG.gain.value = 0.05;
        room.connect(roomLP);
        roomLP.connect(roomG);
        roomG.connect(this.ambBus);
        room.start(0, Math.random() * 1.5);

        // Dengung perangkat elektronik
        const hum = c.createOscillator();
        hum.type = 'sine';
        hum.frequency.value = 100;
        const humG = c.createGain();
        humG.gain.value = 0.012;
        hum.connect(humG);
        humG.connect(this.ambBus);
        hum.start();

        // Angin malam di luar ruangan: noise bandpass yang frekuensinya bergoyang pelan
        const wind = this._noiseSrc(true);
        const windBP = c.createBiquadFilter();
        windBP.type = 'bandpass';
        windBP.frequency.value = 700;
        windBP.Q.value = 0.6;
        const windG = c.createGain();
        windG.gain.value = 0.025;
        const lfo = c.createOscillator();
        lfo.frequency.value = 0.08;
        const lfoDepth = c.createGain();
        lfoDepth.gain.value = 250;
        lfo.connect(lfoDepth);
        lfoDepth.connect(windBP.frequency);
        wind.connect(windBP);
        windBP.connect(windG);
        windG.connect(this.ambBus);
        wind.start(0, Math.random() * 1.5);
        lfo.start();
    }

    // ------------------------------------------------------------------
    // MUSIK lo-fi generatif (dijadwalkan dengan "lookahead")
    // ------------------------------------------------------------------
    _startMusic() {
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.15;
        this._timer = setInterval(() => this._schedule(), 100);
    }

    _schedule() {
        const stepDur = 60 / this.bpm / 2; // satu langkah = not 1/8
        while (this.nextTime < this.ctx.currentTime + 0.25) {
            this._playStep(this.step, this.nextTime, stepDur);
            this.step++;
            this.nextTime += stepDur;
        }
    }

    _playStep(step, time, stepDur) {
        const s = step % 8; // posisi dalam bar (8 langkah)
        const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
        const t = time + (s % 2) * stepDur * 0.16; // swing halus

        if (s === 0) this._pad(chord, t, stepDur * 8);
        if (s === 0 || s === 4) { this._bass(chord.root, t); this._kick(t, 1); }
        if (s === 5 && Math.random() < 0.4) this._kick(t, 0.55);
        if (s === 2 || s === 6) this._snare(t);
        this._hat(t, s % 2 ? 0.02 : 0.035);
        if (s % 2 === 0 && Math.random() < 0.28) {
            this._pluck(PENTA[Math.floor(Math.random() * PENTA.length)], t);
        }
        if (Math.random() < 0.12) this._crackle(t); // derak piringan hitam
    }

    _pad(chord, t, dur) {
        const c = this.ctx;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1100;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.5);
        g.gain.setTargetAtTime(0.0001, t + dur - 0.4, 0.3);
        lp.connect(g);
        g.connect(this.musicBus);
        chord.notes.forEach((n, i) => {
            const o = c.createOscillator();
            o.type = i % 2 ? 'triangle' : 'sine';
            o.frequency.value = midi(n);
            o.detune.value = (Math.random() - 0.5) * 12;
            const og = c.createGain();
            og.gain.value = 0.25;
            o.connect(og);
            og.connect(lp);
            o.start(t);
            o.stop(t + dur + 1.5);
        });
    }

    _bass(root, t) {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = midi(root);
        const g = c.createGain();
        this._env(g, t, 0.22, 0.01, 0.7);
        o.connect(g);
        g.connect(this.musicBus);
        o.start(t);
        o.stop(t + 0.9);
    }

    _kick(t, v) {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(130, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
        const g = c.createGain();
        this._env(g, t, 0.5 * v, 0.003, 0.22);
        o.connect(g);
        g.connect(this.musicBus);
        o.start(t);
        o.stop(t + 0.3);
    }

    _snare(t) {
        const c = this.ctx;
        const n = this._noiseSrc();
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1800;
        bp.Q.value = 0.7;
        const g = c.createGain();
        this._env(g, t, 0.12, 0.002, 0.12);
        n.connect(bp);
        bp.connect(g);
        g.connect(this.musicBus);
        n.start(t, Math.random() * 1.5, 0.2);
    }

    _hat(t, v) {
        const c = this.ctx;
        const n = this._noiseSrc();
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        const g = c.createGain();
        this._env(g, t, v, 0.001, 0.04);
        n.connect(hp);
        hp.connect(g);
        g.connect(this.musicBus);
        n.start(t, Math.random() * 1.5, 0.08);
    }

    _pluck(note, t) {
        const c = this.ctx;
        const g = c.createGain();
        this._env(g, t, 0.07, 0.005, 1.1);
        g.connect(this.musicBus);
        g.connect(this.echoIn);
        [[1, 'sine', 1], [2, 'triangle', 0.25]].forEach(([mult, type, amp]) => {
            const o = c.createOscillator();
            o.type = type;
            o.frequency.value = midi(note) * mult;
            const og = c.createGain();
            og.gain.value = amp;
            o.connect(og);
            og.connect(g);
            o.start(t);
            o.stop(t + 1.3);
        });
    }

    _crackle(t) {
        const c = this.ctx;
        const n = this._noiseSrc();
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3000;
        const g = c.createGain();
        this._env(g, t, 0.03 * Math.random() + 0.005, 0.001, 0.008);
        n.connect(hp);
        hp.connect(g);
        g.connect(this.musicBus);
        n.start(t, Math.random() * 1.5, 0.03);
    }

    // ------------------------------------------------------------------
    // SFX
    // ------------------------------------------------------------------

    // Ketukan keyboard: klik noise pendek + "thock" rendah
    typeKey() {
        if (!this.enabled) return;
        const now = this.ctx.currentTime;
        if (now - (this._lastKey || 0) < 0.035) return;
        this._lastKey = now;
        const c = this.ctx;
        const t = c.currentTime;

        const n = this._noiseSrc();
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2200 + Math.random() * 1800;
        bp.Q.value = 1.2;
        const g = c.createGain();
        this._env(g, t, 0.18 * (0.7 + Math.random() * 0.5), 0.002, 0.035);
        n.connect(bp);
        bp.connect(g);
        g.connect(this.sfxBus);
        n.start(t, Math.random() * 1.5, 0.06);

        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(190, t);
        o.frequency.exponentialRampToValueAtTime(90, t + 0.05);
        const og = c.createGain();
        this._env(og, t, 0.06, 0.002, 0.05);
        o.connect(og);
        og.connect(this.sfxBus);
        o.start(t);
        o.stop(t + 0.08);
    }

    // Klik mouse: sangat halus
    click() {
        if (!this.enabled) return;
        const c = this.ctx;
        const t = c.currentTime;
        const n = this._noiseSrc();
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1500;
        const g = c.createGain();
        this._env(g, t, 0.08, 0.001, 0.02);
        n.connect(hp);
        hp.connect(g);
        g.connect(this.sfxBus);
        n.start(t, Math.random() * 1.5, 0.05);
    }

    // Hover objek: tik lembut
    hover() {
        if (!this.enabled) return;
        this._blip(1400, t0(this.ctx), 0.025, 0.05);
    }

    // Pilih objek: dua nada naik
    select() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        this._blip(523, t, 0.1, 0.25);
        this._blip(784, t + 0.07, 0.1, 0.3);
    }

    // Tutup panel: dua nada turun
    close() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        this._blip(784, t, 0.08, 0.2);
        this._blip(523, t + 0.07, 0.08, 0.28);
    }

    _blip(freq, t, peak, decay) {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3000;
        const g = c.createGain();
        this._env(g, t, peak, 0.005, decay);
        o.connect(lp);
        lp.connect(g);
        g.connect(this.sfxBus);
        o.start(t);
        o.stop(t + decay + 0.05);
    }

    // Suara kamera bergerak: desiran angin yang naik lalu turun
    whoosh(seconds) {
        if (!this.enabled) return;
        const c = this.ctx;
        const t = c.currentTime;
        const n = this._noiseSrc(true);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(250, t);
        bp.frequency.exponentialRampToValueAtTime(1400, t + seconds * 0.5);
        bp.frequency.exponentialRampToValueAtTime(300, t + seconds);
        const g = c.createGain();
        this._env(g, t, 0.06, seconds * 0.4, seconds * 0.6);
        n.connect(bp);
        bp.connect(g);
        g.connect(this.sfxBus);
        n.start(t, Math.random() * 1.5);
        n.stop(t + seconds + 0.1);
    }
}

function t0(ctx) {
    return ctx.currentTime;
}