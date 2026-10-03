import {
  profile, skills, projects, experience, education,
  certificates, stats, resume, contact, rest,
} from './data.js';
import { openGame } from './game.js';

const panel = document.querySelector('#panel');
const panelTitle = document.querySelector('#panel-title');
const panelBody = document.querySelector('#panel-body');
const closeBtn = document.querySelector('#panel-close');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let onCloseCb = null;
closeBtn.addEventListener('click', () => onCloseCb?.());

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const chips = (list, cls = '') =>
  `<div class="chips">${list.map((i) => `<span class="chip ${cls}">${esc(i)}</span>`).join('')}</div>`;

// Tombol hanya dibuat kalau link-nya terisi (bukan kosong / '#')
const hasLink = (u) => !!u && u !== '#';
const linkBtn = (label, url) =>
  hasLink(url) ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';

const views = {
  about: () => ({
    title: 'About Me',
    html: `
      <h3>${esc(profile.role)}</h3>
      <p><strong>${esc(profile.name)}, ${esc(profile.title)}</strong> · ${esc(profile.location)}</p>
      <p>${esc(profile.description)}</p>
      <h3>Soft Skills</h3>
      ${chips(profile.softSkills)}`,
  }),

  skills: () => ({
    title: 'Tech Stack',
    html: skills.map((s) => `<h3>${esc(s.category)}</h3>${chips(s.items)}`).join(''),
  }),

  projects: () => ({
    title: 'Featured Projects',
    html: projects.map((p) => {
      const links = linkBtn('Live Demo', p.demo) + linkBtn('GitHub', p.github);
      return `
      <div class="card">
        <h3>${esc(p.title)} <small>· ${esc(p.year)}</small></h3>
        <p>${esc(p.description)}</p>
        ${chips(p.technologies)}
        ${links ? `<p style="margin-top:10px">${links}</p>` : ''}
      </div>`;
    }).join(''),
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
    html: `<div class="cert-grid">${certificates.map((c) => {
      const meta = [c.issuer, c.year].filter(Boolean).join(' · ');
      const inner = `
        <span class="cert-seal">★</span>
        <strong>${esc(c.title)}</strong>
        <small>${esc(meta)}</small>`;
      return hasLink(c.url)
        ? `<a class="cert" href="${esc(c.url)}" target="_blank" rel="noopener"
             aria-label="Buka sertifikat ${esc(c.title)}">${inner}</a>`
        : `<div class="cert static">${inner}</div>`;
    }).join('')}</div>`,
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
      <p>
        <a class="btn" href="${esc(resume.url)}" target="_blank" rel="noopener">VIEW CV</a>
        <a class="btn" href="${esc(resume.url)}" download="${esc(resume.fileName)}">DOWNLOAD CV</a>
      </p>
      ${resume.portfolioUrl ? `<p>
        <a class="btn" href="${esc(resume.portfolioUrl)}" target="_blank" rel="noopener">VIEW PORTFOLIO PDF</a>
        <a class="btn" href="${esc(resume.portfolioUrl)}" download="${esc(resume.portfolioFileName)}">DOWNLOAD</a>
      </p>` : ''}`,
  }),

  contact: () => ({
    title: "Let's Connect",
    html: `
      <a class="btn" href="${esc(contact.email)}">Email</a>
      ${linkBtn('WhatsApp', contact.whatsapp)}
      ${linkBtn('LinkedIn', contact.linkedin)}
      ${linkBtn('GitHub', contact.github)}
      ${linkBtn('Instagram', contact.instagram)}`,
  }),

  // Chill Zone: ada tombol Play yang membuka pop up game edukasi
  rest: () => ({
    title: rest.title,
    html: `
      <p>${esc(rest.note)}</p>
      ${chips(rest.tags)}
      <h3>Main game sebentar?</h3>
      <p>Ada dua game mini seputar dunia programmer. Orang awam pun bisa main, dan kamu akan belajar istilah-istilah coding sambil santai.</p>
      <p><button type="button" class="btn gm-launch" data-play="menu">▶ PLAY GAME</button></p>`,
  }),
};

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
  panelBody.querySelectorAll('[data-play]').forEach((b) =>
    b.addEventListener('click', () => openGame(b.dataset.play)));
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