import * as THREE from 'three';

// =====================================================================
// Layar "Visual Studio Code" yang digambar lewat <canvas>.
// - Kode diketik huruf demi huruf, lalu diulang dari awal.
// - Warna sintaks sederhana (keyword, string, variabel, komentar, dll).
// - Hasilnya berupa THREE.CanvasTexture yang dipakai sebagai map + emissive.
// =====================================================================

const COL = {
    bg: '#1e1e1e', plain: '#d4d4d4', comment: '#6a9955', string: '#ce9178',
    variable: '#9cdcfe', number: '#b5cea8', fn: '#dcdcaa', kw: '#569cd6',
    ctrl: '#c586c0', cls: '#4ec9b0',
};
const KEYWORDS = new Set([
    'public', 'private', 'protected', 'function', 'class', 'namespace', 'const', 'let',
    'var', 'new', 'static', 'extends', 'fn', 'true', 'false', 'null', 'async', 'from',
    'import', 'export', 'default', 'as',
]);
const CONTROL = new Set(['use', 'return', 'if', 'else', 'foreach', 'for', 'while', 'await', 'try', 'catch']);

// grup: 1 komentar | 2 string | 3 $variabel | 4 angka | 5 pemanggilan fungsi | 6 identifier | 7 spasi | 8 simbol
const TOKEN_RE = /(\/\/.*|#.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\$\w+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+)|(.)/g;

function tokenize(line) {
    if (line.startsWith('<?php')) return [{ t: '<?php', c: COL.kw }];
    const out = [];
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(line))) {
        const [t, cm, str, vr, num, call, id] = m;
        let c = COL.plain;
        if (cm) c = COL.comment;
        else if (str) c = COL.string;
        else if (vr) c = COL.variable;
        else if (num) c = COL.number;
        else if (call) c = COL.fn;
        else if (id) c = CONTROL.has(id) ? COL.ctrl : KEYWORDS.has(id) ? COL.kw : /^[A-Z]/.test(id) ? COL.cls : COL.plain;
        out.push({ t, c });
    }
    return out;
}

// ---------------------------------------------------------------------
// Isi layar. Ukuran w x h SEBANDING dengan bidang layar di scene:
//   monitor 2.4 x 1.3  -> 1180 x 640
//   laptop  1.18 x 0.73 -> 1034 x 640
// ---------------------------------------------------------------------
export const MONITOR_PRESET = {
    w: 1180, h: 640, font: 22, cps: 18,
    file: 'PengajuanController.php', lang: 'PHP', fileColor: '#8892bf',
    tree: [
        { n: 'PORTFOLIO', i: 0, folder: true },
        { n: 'app', i: 1, folder: true },
        { n: 'PengajuanController.php', i: 2, active: true },
        { n: 'Pengajuan.php', i: 2 },
        { n: 'resources', i: 1, folder: true },
        { n: 'routes', i: 1, folder: true },
        { n: '.env', i: 1 },
        { n: 'composer.json', i: 1 },
    ],
    lines: [
        '<?php',
        '',
        'namespace App\\Http\\Controllers;',
        '',
        'use App\\Models\\Pengajuan;',
        'use Illuminate\\Http\\Request;',
        '',
        'class PengajuanController extends Controller',
        '{',
        '    // Simpan pengajuan baru dari divisi TSI',
        '    public function store(Request $request)',
        '    {',
        '        $data = $request->validate([',
        "            'nama'    => 'required|string|max:100',",
        "            'layanan' => 'required|in:migrasi,restore',",
        "            'catatan' => 'nullable|string',",
        '        ]);',
        '',
        "        $data['status'] = 'menunggu';",
        '        $pengajuan = Pengajuan::create($data);',
        '',
        '        return redirect()',
        "            ->route('pengajuan.index')",
        "            ->with('success', 'Pengajuan tercatat!');",
        '    }',
        '}',
    ],
};

export const LAPTOP_PRESET = {
    w: 1034, h: 640, font: 20, cps: 15,
    file: 'web.php', lang: 'PHP', fileColor: '#8892bf',
    tree: [
        { n: 'SIMKEG', i: 0, folder: true },
        { n: 'app', i: 1, folder: true },
        { n: 'database', i: 1, folder: true },
        { n: 'routes', i: 1, folder: true },
        { n: 'web.php', i: 2, active: true },
        { n: 'api.php', i: 2 },
        { n: 'public', i: 1, folder: true },
        { n: 'artisan', i: 1 },
    ],
    lines: [
        '<?php',
        '',
        'use Illuminate\\Support\\Facades\\Route;',
        'use App\\Http\\Controllers\\KegiatanController;',
        '',
        "Route::middleware('auth')->group(function () {",
        "  Route::get('/', fn () => view('dashboard'));",
        "  Route::resource('kegiatan', KegiatanController::class);",
        '});',
        '',
        '// Dikembangkan untuk BGTK Provinsi Riau',
        '// Deploy: cPanel / Hostinger',
    ],
};

// ---------------------------------------------------------------------
export function createCodeScreen(preset, { res = 1, reduceMotion = false, maxAniso = 1, phase = 0 } = {}) {
    const w = Math.round(preset.w * res);
    const h = Math.round(preset.h * res);
    const u = h / 640; // satuan skala: semua ukuran dikali u

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAniso;

    // ----- ukuran layout -----
    const tb = 34 * u;      // title bar
    const tabH = 38 * u;    // tab file
    const sb = 28 * u;      // status bar
    const ab = 46 * u;      // activity bar
    const sw = 218 * u;     // sidebar explorer
    const gutter = 54 * u;  // nomor baris
    const codeX0 = ab + sw;
    const editorTop = tb + tabH;
    const editorBottom = h - sb;
    const fs = preset.font * u;
    const lh = fs * 1.5;
    const visible = Math.floor((editorBottom - editorTop - 8 * u) / lh);
    const codeFont = `${fs}px "Cascadia Code","Fira Code",Consolas,Menlo,monospace`;
    const ui = (px, wt = '') => `${wt} ${px * u}px system-ui, -apple-system, "Segoe UI", sans-serif`;

    // ----- bagian statis (digambar sekali) -----
    const chrome = document.createElement('canvas');
    chrome.width = w;
    chrome.height = h;
    const c = chrome.getContext('2d');
    c.textBaseline = 'middle';

    c.fillStyle = COL.bg;
    c.fillRect(0, 0, w, h);

    // title bar
    c.fillStyle = '#323233';
    c.fillRect(0, 0, w, tb);
    ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc((18 + i * 20) * u, tb / 2, 6 * u, 0, Math.PI * 2);
        c.fill();
    });
    c.fillStyle = '#cccccc';
    c.font = ui(14);
    c.textAlign = 'center';
    c.fillText(`${preset.file} — portfolio — Visual Studio Code`, w / 2, tb / 2);
    c.textAlign = 'left';

    // activity bar
    c.fillStyle = '#333333';
    c.fillRect(0, tb, ab, h - tb - sb);
    for (let i = 0; i < 5; i++) {
        const y = tb + (24 + i * 46) * u;
        c.strokeStyle = i === 0 ? '#ffffff' : '#858585';
        c.lineWidth = 2 * u;
        c.strokeRect(14 * u, y - 10 * u, 18 * u, 20 * u);
    }
    c.fillStyle = '#ffffff';
    c.fillRect(0, tb + 10 * u, 2 * u, 28 * u);

    // sidebar explorer
    c.fillStyle = '#252526';
    c.fillRect(ab, tb, sw, h - tb - sb);
    c.fillStyle = '#bbbbbb';
    c.font = ui(12);
    c.fillText('EXPLORER', ab + 16 * u, tb + 22 * u);
    preset.tree.forEach((it, i) => {
        const y = tb + (54 + i * 26) * u;
        if (it.active) {
            c.fillStyle = '#37373d';
            c.fillRect(ab, y - 13 * u, sw, 26 * u);
        }
        c.save();
        c.beginPath();
        c.rect(ab, y - 13 * u, sw - 6 * u, 26 * u);
        c.clip();
        c.fillStyle = it.active ? '#ffffff' : '#cccccc';
        c.font = ui(14);
        c.fillText((it.folder ? '▾ ' : '   ') + it.n, ab + (14 + it.i * 14) * u, y);
        c.restore();
    });

    // tab file
    c.fillStyle = '#2d2d2d';
    c.fillRect(codeX0, tb, w - codeX0, tabH);
    c.font = ui(14);
    const tabW = c.measureText(preset.file).width + 58 * u;
    c.fillStyle = COL.bg;
    c.fillRect(codeX0, tb, tabW, tabH);
    c.fillStyle = '#3fa9f5';
    c.fillRect(codeX0, tb, tabW, 2 * u);
    c.fillStyle = preset.fileColor;
    c.beginPath();
    c.arc(codeX0 + 16 * u, tb + tabH / 2 + 1 * u, 5 * u, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.fillText(preset.file, codeX0 + 30 * u, tb + tabH / 2 + 1 * u);

    // status bar
    c.fillStyle = '#007acc';
    c.fillRect(0, h - sb, w, sb);
    c.fillStyle = '#ffffff';
    c.font = ui(13);
    c.fillText('  ⎇ main     ⊗ 0   ⚠ 0', 8 * u, h - sb / 2);
    c.textAlign = 'right';
    c.fillText(`${preset.lang}     UTF-8     Spaces: 4   `, w - 8 * u, h - sb / 2);
    c.textAlign = 'left';

    // ----- bagian dinamis (kode yang diketik) -----
    const tokens = preset.lines.map(tokenize);
    const total = preset.lines.reduce((a, l) => a + l.length + 1, 0) - 1;
    const cycle = total / preset.cps + 4; // 4 detik jeda setelah selesai
    let charW = 0;

    function draw(typed, t) {
        ctx.drawImage(chrome, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(codeX0, editorTop, w - codeX0, editorBottom - editorTop);
        ctx.clip();
        ctx.font = codeFont;
        ctx.textBaseline = 'middle';
        if (!charW) charW = ctx.measureText('M').width;

        // posisi kursor (baris & kolom) dari jumlah huruf yang sudah diketik
        let rem = typed;
        let curLine = 0;
        let curCol = 0;
        for (let i = 0; i < preset.lines.length; i++) {
            const len = preset.lines[i].length;
            if (rem <= len) { curLine = i; curCol = rem; break; }
            rem -= len + 1;
            if (i === preset.lines.length - 1) { curLine = i; curCol = len; }
        }

        const first = Math.max(0, curLine - visible + 2); // gulir otomatis
        for (let li = first; li <= curLine; li++) {
            const y = editorTop + 8 * u + (li - first + 0.5) * lh;
            if (li === curLine) {
                ctx.fillStyle = '#2a2d2e';
                ctx.fillRect(codeX0, y - lh / 2, w - codeX0, lh);
            }
            ctx.fillStyle = li === curLine ? '#c6c6c6' : '#6e7681';
            ctx.textAlign = 'right';
            ctx.fillText(String(li + 1), codeX0 + gutter - 14 * u, y);
            ctx.textAlign = 'left';

            let x = codeX0 + gutter;
            let left = li === curLine ? curCol : Infinity;
            for (const tk of tokens[li]) {
                if (left <= 0) break;
                const s = tk.t.length <= left ? tk.t : tk.t.slice(0, left);
                left -= s.length;
                ctx.fillStyle = tk.c;
                ctx.fillText(s, x, y);
                x += s.length * charW;
            }
            if (li === curLine && (typed < total || Math.floor(t * 2) % 2 === 0)) {
                ctx.fillStyle = '#aeafad';
                ctx.fillRect(x, y - lh * 0.38, 2 * u, lh * 0.76);
            }
        }
        ctx.restore();
        texture.needsUpdate = true;
    }

    // gambar awal supaya layar tidak kosong sebelum animasi berjalan
    draw(reduceMotion ? total : Math.floor(total * 0.4), 0);

    let last = -1;
    function update(t) {
        if (reduceMotion || t - last < 1 / 12) return; // ~12 fps cukup untuk teks
        last = t;
        const e = (t + phase) % cycle;
        draw(Math.min(total, Math.floor(e * preset.cps)), t);
    }

    return { texture, update };
}