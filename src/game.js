import './game.css';

// =====================================================================
// CHILL ZONE ARCADE
// Dua game mini bertema programmer. Orang awam pun bisa main, dan di
// akhir tiap game ada "yang kamu pelajari" supaya sambil belajar.
//   1. Tangkap Bug!   : arcade refleks (ketuk bug, hindari fitur bagus)
//   2. Detektif Bug   : puzzle logika (cari baris kode yang salah)
// Pemakaian:  openGame()  /  openGame('squash')  /  openGame('detective')
// =====================================================================

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, scope = document) => scope.querySelector(sel);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// ---------- Skor terbaik (localStorage boleh gagal, misalnya mode privat) ----------
const BEST_KEY = 'portfolio-chillzone-best';
function loadBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch { return {}; }
}
function saveBest(mode, score) {
    const all = loadBest();
    const prev = all[mode] || 0;
    const isNew = score > prev;
    if (isNew) {
        all[mode] = score;
        try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch { /* abaikan */ }
    }
    return { best: Math.max(prev, score), isNew };
}

// =====================================================================
// DATA GAME
// =====================================================================

// Game 1: bug yang harus ditangkap
const BUGS = [
    { emoji: '🐛', name: 'Typo', info: 'Salah ketik satu huruf saja bisa membuat program error.' },
    { emoji: '🌀', name: 'Infinite Loop', info: 'Program mengulang perintah tanpa henti sampai komputer macet.' },
    { emoji: '💥', name: 'Crash', info: 'Aplikasi tiba-tiba menutup sendiri karena ada yang tidak beres.' },
    { emoji: '🐌', name: 'Memory Leak', info: 'Memori tidak dibersihkan, jadi aplikasi makin lama makin lemot.' },
    { emoji: '🔢', name: 'Off-by-one', info: 'Salah hitung selisih satu angka, misalnya mengulang 9 kali padahal harusnya 10.' },
    { emoji: '🕳️', name: 'Celah Keamanan', info: 'Lubang di program yang bisa dimanfaatkan peretas untuk masuk.' },
    { emoji: '🧟', name: 'Zombie Process', info: 'Proses yang sudah selesai tapi tidak pernah dimatikan, jadi menumpuk.' },
];

// Bukan bug: jangan diketuk
const GOOD = [
    { emoji: '✨', name: 'Fitur Baru', info: 'Fitur yang dibuat dengan sengaja itu bukan bug. Jangan dibasmi.' },
    { emoji: '🗂️', name: 'Data Pelanggan', info: 'Data penting harus dijaga. Menghapusnya bisa jadi bencana.' },
    { emoji: '💾', name: 'Backup', info: 'Backup adalah penyelamat saat ada masalah. Jangan dibuang.' },
];

// Game 2: kasus untuk Detektif Bug. `bug` = indeks baris yang salah (mulai dari 0).
const CASES = [
    {
        title: 'Memasak mi instan',
        goal: 'Mi matang dan siap dimakan.',
        lines: [
            'rebus air sampai mendidih',
            'masukkan mi ke dalam air',
            'tunggu selama 3 jam',
            'tiriskan mi lalu tambahkan bumbu',
        ],
        bug: 2,
        term: 'Bug Logika',
        explain: 'Nilainya salah: harusnya 3 menit, bukan 3 jam. Programnya jalan lancar tapi hasilnya salah. Ini disebut bug logika, dan sering paling sulit dicari karena tidak ada pesan error.',
    },
    {
        title: 'Menyapa 5 kali',
        goal: 'Menampilkan "Halo" sebanyak 5 kali lalu berhenti.',
        lines: [
            'hitung = 1',
            'selama hitung <= 5:',
            '    tampilkan "Halo"',
            '    hitung = hitung - 1',
        ],
        bug: 3,
        term: 'Infinite Loop',
        explain: 'Hitungannya malah turun (1, 0, -1, ...), jadi tidak pernah melewati 5 dan perulangan tidak akan berhenti. Itu namanya infinite loop. Harusnya hitung = hitung + 1.',
    },
    {
        title: 'Mesin ATM',
        goal: 'Mengurangi saldo saat nasabah menarik uang.',
        lines: [
            'jika saldo >= jumlah_tarik:',
            '    saldo = saldo + jumlah_tarik',
            '    keluarkan uang tunai',
            'selain itu:',
            '    tampilkan "Saldo tidak cukup"',
        ],
        bug: 1,
        term: 'Operator Salah',
        explain: 'Tarik tunai harusnya mengurangi saldo (-), bukan menambah (+). Satu tanda saja yang salah bisa bikin bank rugi besar. Itu sebabnya programmer rajin membuat pengujian.',
    },
    {
        title: 'Menyapa pengguna',
        goal: 'Menampilkan "Halo Budi, umurmu 20 tahun".',
        lines: [
            'nama = "Budi"',
            'umur = 20',
            'tampilkan "Halo " + nme',
            'tampilkan "Umurmu " + umur + " tahun"',
        ],
        bug: 2,
        term: 'Typo Variabel',
        explain: 'Variabelnya bernama "nama", tapi di sini tertulis "nme". Komputer tidak bisa menebak maksudmu, jadi akan error. Komputer itu sangat teliti dan sangat harfiah.',
    },
    {
        title: 'Hitung harga diskon',
        goal: 'Harga Rp100.000 dengan diskon 20% harus jadi Rp80.000.',
        lines: [
            'harga = 100000',
            'diskon = 0.2',
            'potongan = harga * diskon',
            'total = harga * diskon',
            'tampilkan total',
        ],
        bug: 3,
        term: 'Bug Logika',
        explain: 'Rumusnya salah: harga * diskon hanya menghasilkan potongannya (20.000). Total bayar harusnya harga - potongan. Hasil program terlihat masuk akal tapi keliru.',
    },
    {
        title: 'Cek password',
        goal: 'Password benar boleh masuk, password salah ditolak.',
        lines: [
            'minta pengguna mengetik password',
            'jika password SAMA dengan yang tersimpan:',
            '    tampilkan "Akses ditolak"',
            'selain itu:',
            '    tampilkan "Selamat datang"',
        ],
        bug: 2,
        term: 'Logika Terbalik',
        explain: 'Hasilnya tertukar: yang benar malah ditolak dan yang salah malah masuk. Untung ketahuan sebelum dirilis. Dalam sistem sungguhan, bug seperti ini bisa fatal.',
    },
    {
        title: 'Daftar buah',
        goal: 'Menampilkan buah ketiga: "mangga".',
        lines: [
            'buah = ["apel", "jeruk", "mangga"]',
            'tampilkan buah[3]',
        ],
        bug: 1,
        term: 'Off-by-one',
        explain: 'Komputer mulai menghitung dari 0, bukan 1. Jadi apel = 0, jeruk = 1, mangga = 2. Menulis buah[3] berarti meminta buah keempat yang tidak ada. Kesalahan "meleset satu" ini sangat umum.',
    },
    {
        title: 'Rata-rata nilai',
        goal: 'Menghitung rata-rata dari nilai 80, 90, dan 100.',
        lines: [
            'nilai = [80, 90, 100]',
            'total = jumlah semua nilai',
            'rata_rata = total / 2',
            'tampilkan rata_rata',
        ],
        bug: 2,
        term: 'Bug Logika',
        explain: 'Ada 3 nilai, jadi pembaginya harus 3, bukan 2. Hasilnya jadi 135, bukan 90. Angka yang "ditulis mati" begini berbahaya, lebih aman pakai jumlah data yang sebenarnya.',
    },
];

const FUN_FACTS = [
    'Istilah "bug" populer sejak 1947, ketika seekor ngengat sungguhan ditemukan menyangkut di komputer Harvard Mark II.',
    'Programmer hebat pun menghabiskan banyak waktu mencari bug. Mencari kesalahan sering lebih lama daripada menulis kodenya.',
    'Hampir semua bahasa pemrograman mulai menghitung dari angka 0, bukan 1.',
    'Satu baris kode yang salah pernah membuat roket bernilai ratusan juta dolar gagal meluncur. Pengujian itu penting!',
    'Mencari bug dengan membaca kode baris demi baris disebut debugging. Beberapa programmer bicara pada bebek karet untuk membantu menemukannya.',
];

const RANKS = {
    squash: [
        [450, '🧙', 'Debugging Wizard'],
        [280, '🧑‍💻', 'Senior Dev'],
        [120, '👩‍💻', 'Junior Dev'],
        [0, '🐣', 'Anak Magang'],
    ],
    detective: [
        [6, '🧙', 'Debugging Wizard'],
        [4, '🧑‍💻', 'Senior Dev'],
        [2, '👩‍💻', 'Junior Dev'],
        [0, '🐣', 'Anak Magang'],
    ],
};
const rankOf = (mode, value) => RANKS[mode].find(([min]) => value >= min);

// =====================================================================
// KERANGKA POP UP
// =====================================================================
let root = null;
let screen = null;
let stopFn = null;
let lastFocus = null;

function teardown() {
    if (stopFn) { stopFn(); stopFn = null; }
}

// Escape menutup game saja (dan tidak sampai ke handler Escape milik main.js)
function onKey(e) {
    if (e.key !== 'Escape') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    closeGame();
}

export function openGame(mode = 'menu') {
    if (root) return;
    lastFocus = document.activeElement;

    root = document.createElement('div');
    root.className = 'gm-overlay';
    root.innerHTML = `
    <div class="gm-card" role="dialog" aria-modal="true" aria-label="Game Chill Zone">
      <button type="button" class="gm-close" aria-label="Tutup game">✕</button>
      <div class="gm-screen"></div>
    </div>`;
    document.body.appendChild(root);
    screen = $('.gm-screen', root);
    $('.gm-close', root).addEventListener('click', closeGame);
    window.addEventListener('keydown', onKey, true);

    if (mode === 'squash' || mode === 'detective') launch(mode, false);
    else showMenu();
}

export function closeGame() {
    if (!root) return;
    teardown();
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    root = null;
    screen = null;
    lastFocus?.focus?.({ preventScroll: true });
    lastFocus = null;
}

function launch(mode, skipIntro) {
    if (mode === 'squash') {
        if (skipIntro) startSquash();
        else showIntro({
            icon: '🐛',
            title: 'Tangkap Bug!',
            rules: [
                'Bug adalah <strong>kesalahan di dalam program</strong>. Tugasmu membasminya.',
                'Ketuk bug (🐛 🌀 💥) <strong>sebelum menyentuh lantai</strong>.',
                'Jangan ketuk <strong>✨ Fitur</strong>, <strong>🗂️ Data</strong>, dan <strong>💾 Backup</strong>. Itu bukan bug!',
                'Kamu punya 3 nyawa. Makin lama, bug makin cepat.',
            ],
        }, startSquash);
    } else {
        if (skipIntro) startDetective();
        else showIntro({
            icon: '🔎',
            title: 'Detektif Bug',
            rules: [
                'Kamu akan melihat <strong>potongan "kode"</strong> dengan bahasa sehari-hari.',
                'Satu baris di dalamnya salah dan bikin programnya bermasalah.',
                'Ketuk <strong>baris yang salah</strong>. Tidak perlu bisa coding, cukup teliti!',
                'Tiap jawaban ada penjelasannya, jadi kamu belajar istilah programmer.',
            ],
        }, startDetective);
    }
}

function showMenu() {
    teardown();
    const best = loadBest();
    screen.innerHTML = `
    <h2 class="gm-title">Chill Zone Arcade</h2>
    <p class="gm-sub">Santai dulu sambil kenalan dengan dunia programmer. Tidak perlu bisa coding.</p>
    <div class="gm-modes">
      <button type="button" class="gm-mode" data-mode="squash">
        <span class="gm-mode-ico" aria-hidden="true">🐛</span>
        <strong>Tangkap Bug!</strong>
        <small>Ketuk bug yang berjatuhan sebelum masuk ke aplikasi. Jangan salah ketuk fitur bagus.</small>
        <em>Skor terbaik: ${best.squash || 0}</em>
      </button>
      <button type="button" class="gm-mode" data-mode="detective">
        <span class="gm-mode-ico" aria-hidden="true">🔎</span>
        <strong>Detektif Bug</strong>
        <small>Temukan baris yang salah di dalam kode sederhana. Ada penjelasan di tiap jawaban.</small>
        <em>Skor terbaik: ${best.detective || 0}</em>
      </button>
    </div>`;
    screen.querySelectorAll('.gm-mode').forEach((b) =>
        b.addEventListener('click', () => launch(b.dataset.mode, false)));
    $('.gm-mode', screen).focus({ preventScroll: true });
}

function showIntro({ icon, title, rules }, onStart) {
    teardown();
    screen.innerHTML = `
    <div class="gm-intro">
      <div class="gm-big" aria-hidden="true">${icon}</div>
      <h2 class="gm-title">${esc(title)}</h2>
      <p class="gm-sub">Cara main</p>
      <ul class="gm-rules">${rules.map((r) => `<li>${r}</li>`).join('')}</ul>
      <div class="gm-actions">
        <button type="button" class="gm-btn" id="gm-go">Mulai main</button>
        <button type="button" class="gm-btn ghost" id="gm-back">Kembali ke menu</button>
      </div>
    </div>`;
    $('#gm-go', screen).addEventListener('click', onStart);
    $('#gm-back', screen).addEventListener('click', showMenu);
    $('#gm-go', screen).focus({ preventScroll: true });
}

// =====================================================================
// LAYAR HASIL (dipakai kedua game)
// =====================================================================
function showResult({ mode, score, rankValue, stats, learned }) {
    teardown();
    const { best, isNew } = saveBest(mode, score);
    const [, icon, name] = rankOf(mode, rankValue);
    const learnHtml = learned.length
        ? `<ul class="gm-learn">${learned.map((l) =>
            `<li><strong>${esc(l.name)}</strong><span>${esc(l.info)}</span></li>`).join('')}</ul>`
        : '<p class="gm-sub">Belum ada bug yang tertangkap. Coba lagi, pasti bisa!</p>';

    screen.innerHTML = `
    <div class="gm-result">
      <div class="gm-big" aria-hidden="true">${icon}</div>
      <h2 class="gm-title">${esc(name)}</h2>
      <p class="gm-score">${score} <small>poin</small></p>
      <p class="gm-best">${isNew ? '🎉 Rekor baru!' : `Skor terbaik: ${best}`}</p>
      <p class="gm-sub">${esc(stats)}</p>
      <h3 class="gm-h3">Yang kamu pelajari</h3>
      ${learnHtml}
      <p class="gm-fact">💡 ${esc(pick(FUN_FACTS))}</p>
      <div class="gm-actions">
        <button type="button" class="gm-btn" id="gm-again">Main lagi</button>
        <button type="button" class="gm-btn ghost" id="gm-menu">Menu game</button>
        <button type="button" class="gm-btn ghost" id="gm-exit">Tutup</button>
      </div>
    </div>`;
    $('#gm-again', screen).addEventListener('click', () => launch(mode, true));
    $('#gm-menu', screen).addEventListener('click', showMenu);
    $('#gm-exit', screen).addEventListener('click', closeGame);
    $('#gm-again', screen).focus({ preventScroll: true });
}

// =====================================================================
// GAME 1: TANGKAP BUG!
// =====================================================================
function startSquash() {
    teardown();
    const DURATION = 45;
    const MAX_LIVES = 3;

    screen.innerHTML = `
    <div class="gm-hud">
      <span>⏱ <b id="gm-time">${DURATION}</b> dtk</span>
      <span>⭐ <b id="gm-score">0</b></span>
      <span id="gm-lives" aria-label="Nyawa tersisa"></span>
      <span>🔥 <b id="gm-combo">x1</b></span>
    </div>
    <div class="gm-stage" id="gm-stage">
      <div class="gm-ground">Aplikasi live. Jangan sampai bug sampai sini!</div>
    </div>
    <p class="gm-toast" id="gm-toast" aria-live="polite">Ketuk bug, hindari fitur bagus!</p>`;

    const stage = $('#gm-stage', screen);
    const elTime = $('#gm-time', screen);
    const elScore = $('#gm-score', screen);
    const elLives = $('#gm-lives', screen);
    const elCombo = $('#gm-combo', screen);
    const elToast = $('#gm-toast', screen);

    let items = [];
    let score = 0;
    let lives = MAX_LIVES;
    let combo = 0;
    let caughtCount = 0;
    let timeLeft = DURATION;
    let spawnIn = 0.5;
    let last = performance.now();
    let raf = 0;
    let over = false;
    const learned = new Map();

    function hud() {
        elTime.textContent = Math.max(0, Math.ceil(timeLeft));
        elScore.textContent = score;
        elLives.textContent = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
        elCombo.textContent = 'x' + Math.max(1, combo);
    }

    function toast(text, kind) {
        elToast.textContent = text;
        elToast.className = 'gm-toast ' + kind;
    }

    function pop(it, text, kind) {
        const s = document.createElement('span');
        s.className = 'gm-pop ' + kind;
        s.textContent = text;
        s.style.left = it.x + 'px';
        s.style.top = Math.max(0, it.y) + 'px';
        stage.appendChild(s);
        setTimeout(() => s.remove(), 700);
    }

    function removeItem(it) {
        it.dead = true;
        it.el.remove();
    }

    function spawn() {
        const elapsed = DURATION - timeLeft;
        const good = Math.random() < 0.25;
        const def = good ? pick(GOOD) : pick(BUGS);

        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'gm-item ' + (good ? 'good' : 'bug');
        el.setAttribute('aria-label', (good ? 'Jangan ketuk: ' : 'Ketuk: ') + def.name);
        el.innerHTML = `<span class="e">${def.emoji}</span><span class="n">${esc(def.name)}</span>`;
        stage.appendChild(el);

        const width = el.offsetWidth || 90;
        const it = {
            el, def, good, dead: false,
            x: Math.random() * Math.max(1, stage.clientWidth - width),
            y: -70,
            vy: 70 + elapsed * 2.6 + Math.random() * 40, // piksel per detik
        };
        el.style.transform = `translate(${it.x}px, ${it.y}px)`;
        el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); hit(it); });
        items.push(it);
    }

    function hit(it) {
        if (over || it.dead) return;
        if (it.good) {
            lives--;
            combo = 0;
            score = Math.max(0, score - 15);
            pop(it, '-15', 'bad');
            toast(`Ups, ${it.def.name} bukan bug. ${it.def.info}`, 'bad');
        } else {
            combo++;
            caughtCount++;
            const pts = 10 + Math.min(combo - 1, 10) * 2;
            score += pts;
            pop(it, '+' + pts, 'ok');
            learned.set(it.def.name, { name: it.def.name, info: it.def.info });
            toast(`${it.def.name}: ${it.def.info}`, 'ok');
        }
        removeItem(it);
        hud();
        if (lives <= 0) finish();
    }

    function finish() {
        if (over) return;
        over = true;
        cancelAnimationFrame(raf);
        showResult({
            mode: 'squash',
            score,
            rankValue: score,
            stats: `Kamu menangkap ${caughtCount} bug dari ${learned.size} jenis berbeda.`,
            learned: [...learned.values()],
        });
    }

    function tick(now) {
        if (over) return;
        const dt = Math.min((now - last) / 1000, 0.05); // tab di-background = game seperti dijeda
        last = now;
        timeLeft -= dt;

        spawnIn -= dt;
        if (spawnIn <= 0) {
            spawn();
            const elapsed = DURATION - timeLeft;
            spawnIn = Math.max(0.45, 1.1 - elapsed * 0.014);
        }

        const floor = stage.clientHeight - 56;
        for (const it of items) {
            if (it.dead) continue;
            it.y += it.vy * dt;
            it.el.style.transform = `translate(${it.x}px, ${it.y}px)`;
            if (it.y >= floor) {
                removeItem(it);
                if (!it.good) {
                    lives--;
                    combo = 0;
                    toast(`${it.def.name} lolos ke aplikasi live! ${it.def.info}`, 'bad');
                    if (lives <= 0) { hud(); finish(); return; }
                }
            }
        }
        items = items.filter((it) => !it.dead);

        hud();
        if (timeLeft <= 0) { finish(); return; }
        raf = requestAnimationFrame(tick);
    }

    stopFn = () => { over = true; cancelAnimationFrame(raf); };
    hud();
    raf = requestAnimationFrame((t) => { last = t; tick(t); });
}

// =====================================================================
// GAME 2: DETEKTIF BUG
// =====================================================================
function startDetective() {
    teardown();
    const rounds = shuffle(CASES).slice(0, 6);
    let i = 0;
    let score = 0;
    let streak = 0;
    let solved = 0;
    let hints = 2;
    const learned = [];

    stopFn = () => { /* tidak ada timer yang perlu dihentikan */ };

    function render() {
        const c = rounds[i];
        let answered = false;
        let hintUsed = false;

        screen.innerHTML = `
      <div class="gm-hud">
        <span>🔎 Kasus <b>${i + 1}</b>/${rounds.length}</span>
        <span>⭐ <b>${score}</b></span>
        <span>🔥 x${Math.max(1, streak)}</span>
        <span>💡 ${hints}</span>
      </div>
      <h3 class="gm-case">${esc(c.title)}</h3>
      <p class="gm-goal">Tujuan program: ${esc(c.goal)}</p>
      <div class="gm-code">
        ${c.lines.map((l, n) => `
          <button type="button" class="gm-line" data-n="${n}">
            <span class="ln">${n + 1}</span><code>${esc(l)}</code>
          </button>`).join('')}
      </div>
      <p class="gm-ask">Ketuk baris yang bikin programnya bermasalah.</p>
      <div class="gm-actions">
        <button type="button" class="gm-btn ghost" id="gm-hint">💡 Petunjuk (${hints})</button>
      </div>
      <div class="gm-explain" id="gm-explain" aria-live="polite"></div>`;

        const lineEls = [...screen.querySelectorAll('.gm-line')];
        const hintBtn = $('#gm-hint', screen);
        const box = $('#gm-explain', screen);

        hintBtn.disabled = hints <= 0;
        hintBtn.addEventListener('click', () => {
            if (answered || hintUsed || hints <= 0) return;
            hintUsed = true;
            hints--;
            hintBtn.disabled = true;
            hintBtn.textContent = '💡 Petunjuk dipakai';
            const wrong = shuffle(lineEls.filter((_, n) => n !== c.bug));
            wrong.slice(0, Math.min(2, wrong.length - 1)).forEach((el) => el.classList.add('dim'));
        });

        lineEls.forEach((el) => el.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            const chosen = Number(el.dataset.n);
            const correct = chosen === c.bug;

            lineEls.forEach((l) => { l.disabled = true; });
            lineEls[c.bug].classList.add('right');
            if (!correct) el.classList.add('wrong');
            hintBtn.disabled = true;

            let gained = 0;
            if (correct) {
                streak++;
                solved++;
                gained = (hintUsed ? 60 : 100) + Math.min(streak - 1, 5) * 10;
                score += gained;
            } else {
                streak = 0;
            }
            learned.push({ name: c.term, info: c.explain });

            const last = i === rounds.length - 1;
            box.className = 'gm-explain show ' + (correct ? 'ok' : 'bad');
            box.innerHTML = `
        <p class="gm-verdict">${correct ? `Tepat! +${gained} poin` : 'Belum tepat. Baris yang salah ditandai hijau.'}</p>
        <p><span class="gm-tag">${esc(c.term)}</span> ${esc(c.explain)}</p>
        <div class="gm-actions">
          <button type="button" class="gm-btn" id="gm-next">${last ? 'Lihat hasil' : 'Kasus berikutnya'}</button>
        </div>`;
            const next = $('#gm-next', screen);
            next.addEventListener('click', () => {
                if (last) {
                    showResult({
                        mode: 'detective',
                        score,
                        rankValue: solved,
                        stats: `Kamu menemukan ${solved} dari ${rounds.length} bug dengan benar.`,
                        learned,
                    });
                } else {
                    i++;
                    render();
                }
            });
            next.focus({ preventScroll: true });
        }));
    }

    render();
}