import {
    profile, skills, projects, experience, education,
    certificates, stats, resume, contact,
} from './data.js';

const panel = document.querySelector('#panel');
const panelTitle = document.querySelector('#panel-title');
const panelBody = document.querySelector('#panel-body');
const closeBtn = document.querySelector('#panel-close');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let onCloseCb = null;
closeBtn.addEventListener('click', () => onCloseCb?.());

// Escape HTML supaya data tidak bisa menyisipkan tag
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const chips = (list) =>
    `<div class="chips">${list.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>`;

const views = {
    about: () => ({
        title: 'About Me',
        html: `
      <h3>${esc(profile.role)}</h3>
      <p><strong>${esc(profile.name)}</strong> · ${esc(profile.location)}</p>
      <p>${esc(profile.description)}</p>`,
    }),

    skills: () => ({
        title: 'Tech Stack',
        html: skills.map((s) => `<h3>${esc(s.category)}</h3>${chips(s.items)}`).join(''),
    }),

    projects: () => ({
        title: 'Featured Projects',
        html: projects.map((p) => `
      <div class="card">
        <h3>${esc(p.title)} <small>· ${esc(p.year)}</small></h3>
        <p>${esc(p.description)}</p>
        ${chips(p.technologies)}
        <p style="margin-top:10px">
          <a class="btn" href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a>
          <a class="btn" href="${esc(p.demo)}" target="_blank" rel="noopener">Live Demo</a>
        </p>
      </div>`).join(''),
    }),

    experience: () => ({
        title: 'Experience',
        html: `<div class="timeline">${experience.map((e) => `
      <div class="tl-item">
        <span class="tl-dot"></span>
        <p class="tl-period">${esc(e.period)}</p>
        <h3>${esc(e.position)} · ${esc(e.company)}</h3>
        <p>${esc(e.description)}</p>
        <ul>${e.responsibilities.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        ${chips(e.technologies)}
      </div>`).join('')}</div>`,
    }),

    education: () => ({
        title: 'Education',
        html: education.map((e) => `
      <div class="card">
        <h3>${esc(e.institution)}</h3>
        <p><strong>${esc(e.degree)}</strong> · ${esc(e.field)}</p>
        <p class="muted">${esc(e.year)}</p>
        <p>${esc(e.info)}</p>
      </div>`).join(''),
    }),

    certificates: () => ({
        title: 'Certifications',
        html: `<div class="cert-grid">${certificates.map((c) => `
      <a class="cert" href="${esc(c.url)}" target="_blank" rel="noopener"
         aria-label="Buka sertifikat ${esc(c.title)}">
        <span class="cert-seal">★</span>
        <strong>${esc(c.title)}</strong>
        <small>${esc(c.issuer)} · ${esc(c.year)}</small>
      </a>`).join('')}</div>`,
    }),

    stats: () => ({
        title: 'Developer Stats',
        html: `<div class="stat-grid">${stats.map((s) => `
      <div class="stat">
        <span class="stat-num" data-count="${Number(s.value) || 0}" data-suffix="${esc(s.suffix || '')}">0</span>
        <small>${esc(s.label)}</small>
      </div>`).join('')}</div>`,
    }),

    resume: () => ({
        title: 'Resume',
        html: `
      <p>${esc(resume.note)}</p>
      <a class="btn" href="${esc(resume.url)}" target="_blank" rel="noopener">VIEW RESUME</a>
      <a class="btn" href="${esc(resume.url)}" download="${esc(resume.fileName)}">DOWNLOAD RESUME</a>`,
    }),

    contact: () => ({
        title: "Let's Connect",
        html: `
      <a class="btn" href="${esc(contact.email)}">Email</a>
      <a class="btn" href="${esc(contact.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
      <a class="btn" href="${esc(contact.github)}" target="_blank" rel="noopener">GitHub</a>
      <a class="btn" href="${esc(contact.instagram)}" target="_blank" rel="noopener">Instagram</a>`,
    }),
};

// Angka naik dari 0 ke nilai akhir (dimatikan jika reduced motion)
function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    if (reduceMotion || target === 0) {
        el.textContent = target + suffix;
        return;
    }
    const start = performance.now();
    const duration = 1200;
    (function step(now) {
        const k = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (k < 1) requestAnimationFrame(step);
    })(start);
}

export function openPanel(id, onClose) {
    const view = views[id]?.();
    if (!view) return;
    onCloseCb = onClose;
    panelTitle.textContent = view.title;
    panelBody.innerHTML = view.html;
    panelBody.querySelectorAll('[data-count]').forEach(countUp);
    panel.scrollTop = 0;
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('open');
    setTimeout(() => closeBtn.focus({ preventScroll: true }), 400);
}

export function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
}