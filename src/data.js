// =====================================================================
// DATA PORTOFOLIO — semua isi di sini adalah PLACEHOLDER.
// Ganti dengan datamu sendiri. Tampilan (panel) otomatis mengikuti.
// =====================================================================

export const profile = {
    name: 'Agung Kurniawan',
    role: 'Full Stack Developer',
    location: 'Isi lokasimu',
    description: 'Tulis perkenalan singkat tentang dirimu di sini.',
};

export const skills = [
    { category: 'Frontend', items: ['HTML', 'CSS', 'JavaScript'] },
    { category: 'Backend', items: ['Laravel', 'PHP', '.NET', 'REST API'] },
    { category: 'Database', items: ['MySQL', 'SQL Server'] },
    { category: 'Tools', items: ['Git', 'GitHub', 'VS Code'] },
];

export const projects = [
    {
        title: 'Nama Proyek 1',
        description: 'Deskripsi singkat proyek.',
        technologies: ['Laravel', 'MySQL'],
        year: '2026',
        github: '#',
        demo: '#',
    },
];

export const experience = [
    {
        company: 'Nama Perusahaan',
        position: 'Posisi / Jabatan',
        period: '2025 — Sekarang',
        description: 'Deskripsi singkat peranmu di sini.',
        responsibilities: ['Tanggung jawab pertama', 'Tanggung jawab kedua'],
        technologies: ['Laravel', 'MySQL'],
    },
];

export const education = [
    {
        institution: 'Nama Institusi',
        degree: 'Jenjang / Gelar',
        field: 'Bidang Studi',
        year: '2023 — 2027',
        info: 'Informasi tambahan (IPK, organisasi, prestasi, dll).',
    },
];

export const certificates = [
    {
        title: 'Nama Sertifikat',
        issuer: 'Penerbit',
        year: '2026',
        url: '#', // link ke sertifikat (halaman verifikasi / gambar / PDF)
    },
];

// Angka yang bisa dihitung otomatis dari data lain dibuat otomatis.
// Isi sendiri angka yang tidak bisa dihitung (tahun pengalaman, repo GitHub).
export const stats = [
    { label: 'Years of Experience', value: 0, suffix: '+' },     // ← isi sendiri
    { label: 'Projects Completed', value: projects.length, suffix: '' },
    { label: 'Technologies', value: skills.flatMap((s) => s.items).length, suffix: '' },
    { label: 'GitHub Repositories', value: 0, suffix: '' },      // ← isi sendiri
    { label: 'Certifications', value: certificates.length, suffix: '' },
];

export const resume = {
    url: '#', // ganti dengan link file resume (misalnya /resume.pdf di folder public)
    fileName: 'resume.pdf',
    note: 'Lihat resume langsung di tab baru atau unduh salinannya.',
};

export const contact = {
    email: 'mailto:email@kamu.com',
    linkedin: '#',
    github: '#',
    instagram: '#',
};