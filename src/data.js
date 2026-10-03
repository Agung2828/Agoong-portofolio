// =====================================================================
// DATA PORTOFOLIO — diisi dari CV & Portfolio PDF Agung Kurniawan.
// Field yang dikosongkan ('') otomatis tidak ditampilkan di panel.
// =====================================================================

export const profile = {
    name: 'Agung Kurniawan',
    title: 'S.Tr.Kom',
    role: 'IT Engineer & Web Developer',
    location: 'Pekanbaru, Riau, Indonesia',
    description:
        'IT Engineer dan Web Developer dengan pengalaman dalam pengembangan aplikasi berbasis web, ' +
        'administrasi server, serta pengelolaan jaringan komputer. Menguasai PHP, Laravel, JavaScript, ' +
        'MySQL, C# (.NET Framework & .NET Core), dan konfigurasi MikroTik. Berpengalaman membangun dan mengoptimalkan sistem berbasis web, ' +
        'mengelola infrastruktur jaringan, serta memberikan solusi terhadap permasalahan teknis.',
    softSkills: [
        'Problem Solving', 'Cepat Beradaptasi', 'Komunikasi Efektif', 'Kerja Tim & Mandiri',
        'Manajemen Waktu', 'Berpikir Kreatif', 'Detail-oriented', 'Fast Learner',
    ],
};

export const skills = [
    { category: 'Web Development', items: ['PHP', 'Laravel', 'JavaScript', 'HTML & CSS'] },
    { category: 'C# & .NET', items: ['C#', '.NET Framework', '.NET Core'] },
    { category: 'Database', items: ['MySQL', 'phpMyAdmin'] },
    { category: '3D & Virtual Tour', items: ['3D Animation', 'Virtual Tour 360°'] },
    { category: 'Network & Server', items: ['MikroTik (MTCNA)', 'Cisco', 'Server Administration'] },
    { category: 'Tools & Deployment', items: ['VS Code', 'XAMPP', 'cPanel / Hostinger'] },
    { category: 'Design & Office', items: ['Figma', 'Photoshop', 'Microsoft Office', 'Google Analytics'] },
];

export const projects = [
    {
        title: 'Company Profile Dana Pensiun Bank Riau Kepri',
        description:
            'Membangun ulang website resmi Dana Pensiun Bank Riau Kepri dengan UI/UX baru yang modern, ' +
            'informatif, dan responsif agar akses informasi bagi peserta dana pensiun lebih jelas.',
        technologies: ['Laravel', 'PHP', 'MySQL', 'UI/UX'],
        year: '2025',
        github: '',
        demo: 'https://dapenbrk.co.id/',
    },
    {
        title: 'Sistem Pengajuan & Berita Acara — BRK Syariah',
        description:
            'Sistem terpusat untuk mengelola proses administrasi dan teknis divisi TSI (migrasi data, ' +
            'restore data, update aplikasi, perbaikan sistem) agar tercatat, tervalidasi, dan terdokumentasi.',
        technologies: ['Laravel', 'MySQL', 'UI/UX'],
        year: '2024',
        github: '',
        demo: '',
    },
    {
        title: 'Virtual Tour 360° Museum Sang Nila Utama',
        description:
            'Proyek tugas akhir: tur virtual panorama 360° agar pengunjung dapat menjelajah ruangan, ' +
            'membaca informasi artefak, dan berpindah antar-spot secara digital dan interaktif.',
        technologies: ['360° Panorama', 'Web'],
        year: '2025',
        github: '',
        demo: 'https://virtualsangnila.pocari.id/',
    },
    {
        title: 'Virtual Tour BGTK Provinsi Riau',
        description: 'Tur virtual interaktif untuk memperkenalkan lingkungan BGTK Provinsi Riau secara online.',
        technologies: ['360° Panorama', 'Web'],
        year: '2025',
        github: '',
        demo: 'https://bgtkriau.kemendikdasmen.go.id/virtualtourBGTK/virtualtourBGTK/index.htm',
    },
    {
        title: 'SIPANDAI',
        description: 'Sistem Informasi Pendataan & Integrasi Kegiatan BGTK Riau.',
        technologies: ['Laravel', 'MySQL'],
        year: '2026',
        github: '',
        demo: 'https://bgtkriau.kemendikdasmen.go.id/SIPANDAI/index.php',
    },
    {
        title: 'SIMPRO',
        description: 'Sistem Informasi Produk BGTK Riau.',
        technologies: ['Laravel', 'MySQL'],
        year: '2026',
        github: '',
        demo: 'https://bgtkriau.kemendikdasmen.go.id/SIMPRO/login',
    },
    {
        title: 'SIMKEG',
        description: 'Sistem Manajemen Kegiatan BGTK Riau.',
        technologies: ['Laravel', 'MySQL'],
        year: '2026',
        github: '',
        demo: 'https://bgtkriau.kemendikdasmen.go.id/SIMKEG/admin/kegiatan',
    },
    {
        title: 'Nurilmi',
        description: 'Media pembelajaran Agama Islam berbasis web.',
        technologies: ['Laravel', 'MySQL'],
        year: '2026',
        github: '',
        demo: 'https://hengkirasbumi.nurilmi.online/admin',
    },
    {
        title: 'SIMPEL+ BGTK Riau',
        description: 'Sistem pembelajaran untuk mendukung layanan BGTK Riau.',
        technologies: ['Laravel', 'MySQL'],
        year: '2026',
        github: '',
        demo: '',
    },
];

export const experience = [
    {
        company: 'Balai Guru dan Tenaga Kependidikan Provinsi Riau (MagangHub)',
        position: 'Pranata Komputer',
        period: 'Desember 2025 — Juni 2026',
        description: 'Mendukung transformasi digital layanan pendidikan melalui aplikasi web internal dan eksternal.',
        responsibilities: [
            'Mengembangkan dan memelihara aplikasi berbasis web untuk layanan internal dan eksternal BGTK Provinsi Riau.',
            'Merancang dan mengimplementasikan fitur baru, optimasi sistem, serta memperbaiki bug.',
            'Berkolaborasi dalam analisis kebutuhan, pengujian, deployment, dan pemeliharaan sistem.',
        ],
        technologies: ['Laravel', 'PHP', 'MySQL', 'cPanel'],
    },
    {
        company: 'PT. Bank Riau Kepri Syariah (Perseroda)',
        position: 'Programmer — Pengembang Web',
        period: 'Juli — Agustus 2024',
        description: 'Magang sebagai pengembang web di divisi TSI.',
        responsibilities: [
            'Mengembangkan sistem pengajuan dan berita acara berbasis web untuk mendukung proses operasional.',
            'Merancang struktur database serta antarmuka pengguna (UI/UX) yang responsif.',
            'Melakukan pemeliharaan dan pengembangan sistem sesuai kebutuhan pengguna.',
        ],
        technologies: ['Laravel', 'MySQL', 'UI/UX'],
    },
    {
        company: 'Himpunan Mahasiswa Teknik Informatika — Politeknik Caltex Riau',
        position: 'Koordinator Bidang',
        period: '2023 — 2024',
        description: 'Pengalaman organisasi kampus.',
        responsibilities: [
            'Membantu ketua mengoordinasikan program kerja himpunan dan mengawasi kegiatan akademik & nonakademik.',
            'Menjadi penghubung antara mahasiswa, dosen, dan pihak kampus.',
        ],
        technologies: ['Leadership', 'Koordinasi'],
    },
    {
        company: 'Himpunan Mahasiswa Teknik Informatika — Politeknik Caltex Riau',
        position: 'Koordinator Divisi Pengembangan Cisco',
        period: '2023 — 2024',
        description: 'Mengelola pelatihan jaringan komputer berbasis Cisco.',
        responsibilities: [
            'Mengelola pelatihan dan workshop jaringan komputer berbasis Cisco.',
            'Memfasilitasi pengembangan keterampilan anggota.',
        ],
        technologies: ['Cisco', 'Networking'],
    },
];

export const education = [
    {
        institution: 'Politeknik Caltex Riau (PCR)',
        degree: 'D4 (S.Tr.Kom)',
        field: 'Teknik Informatika',
        year: '2021 — 2025',
        info: 'IPK 3.32 / 4.00 · Pekanbaru, Riau.',
    },
];

export const certificates = [
    { title: 'Memulai Pemrograman dengan Python', issuer: 'Dicoding Indonesia', year: '2022', url: '' },
    { title: 'MTCNA', issuer: 'MikroTik', year: '2023', url: '' },
    { title: 'Sertifikat Kompetensi Programmer', issuer: 'BNSP · LSP P-1 Politeknik Caltex Riau', year: '2025', url: '' },
    { title: 'TOEIC', issuer: 'Politeknik Caltex Riau', year: '2025', url: '' },
    { title: 'Public Speaking Show', issuer: 'Alfalfa English Club', year: '2019', url: '' },
    { title: 'PKDTMII (Perkaderan)', issuer: '', year: '2022', url: '' },
    { title: 'Fasilitator', issuer: '', year: '2022', url: '' },
    { title: 'Program MagangHub', issuer: '', year: '2025 — 2026', url: '' },
];

export const stats = [
    { label: 'Projects Completed', value: projects.length, suffix: '+' },
    { label: 'Technologies', value: skills.flatMap((s) => s.items).length, suffix: '' },
    { label: 'Certifications', value: certificates.length, suffix: '' },
    { label: 'Years of Experience', value: 2, suffix: '+' },
];

export const resume = {
    // Taruh file PDF di folder public/ lalu sesuaikan nama file-nya
    url: '/CV_Agung_Kurniawan.pdf',
    fileName: 'CV_Agung_Kurniawan.pdf',
    portfolioUrl: '/Agung_Portfolio.pdf',
    portfolioFileName: 'Agung_Portfolio.pdf',
    note: 'Lihat CV langsung di tab baru atau unduh salinannya.',
};

export const contact = {
    email: 'mailto:aagungk28@gmail.com',
    linkedin: 'https://www.linkedin.com/in/aagungkurniawandev',
    whatsapp: 'https://wa.me/6282289880903',
    instagram: 'https://www.instagram.com/agung.krniawn',
    github: 'https://github.com/Agung2828', // isi jika ada, kosong = tombol disembunyikan
};

export const rest = {
    title: 'Beyond the Code',
    note: 'Area santai untuk mengisi ulang energi sebelum kembali ngoding — ditemani kopi, stik game, dan seekor kucing.',
    tags: ['Gaming', 'Musik', 'Nonton'],
};