/* ================================================
   MILITIA INC. — main.js
   ================================================ */

'use strict';

/* --- Navbar: scroll effect + active link --- */
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMenu   = document.getElementById('navMenu');
const navLinks  = document.querySelectorAll('.nav-link');

function onScroll() {
  /* Scrolled class for background blur */
  navbar.classList.toggle('scrolled', window.scrollY > 60);

  /* Active nav link based on current section */
  let current = '';
  document.querySelectorAll('section[id]').forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === `#${current}`);
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll(); // run once on load

/* --- Mobile menu toggle --- */
navToggle.addEventListener('click', () => {
  const isOpen = navToggle.classList.toggle('open');
  navMenu.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

navMenu.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* --- Parallax hero background --- */
const heroBg = document.querySelector('.hero-bg');
if (heroBg) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY * 0.35;
    heroBg.style.transform = `translateY(${y}px) scale(1.08)`;
  }, { passive: true });
}

/* --- Reveal on scroll (IntersectionObserver) --- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -48px 0px'
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* --- Stagger delays for grid children --- */
document.querySelectorAll('.members-grid, .photo-grid, .videos-grid, .rep-list, .contact-channels').forEach(grid => {
  grid.querySelectorAll('.reveal, .member-card, .photo-item, .video-item, .rep-band, .channel-link').forEach((item, i) => {
    if (!item.style.transitionDelay) {
      item.style.transitionDelay = `${i * 0.07}s`;
    }
  });
});

/* --- Contact form: mailto fallback --- */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    const name    = (document.getElementById('name')?.value    || '').trim();
    const email   = (document.getElementById('email')?.value   || '').trim();
    const phone   = (document.getElementById('phone')?.value   || '').trim();
    const subject = (document.getElementById('subject')?.value || '');
    const message = (document.getElementById('message')?.value || '').trim();

    if (!name || !email || !message) {
      alert('Por favor completa los campos obligatorios: Nombre, Correo y Mensaje.');
      return;
    }

    const body = [
      `Nombre: ${name}`,
      `Teléfono: ${phone || 'No proporcionado'}`,
      `Tipo de evento: ${subject || 'No especificado'}`,
      '',
      'Mensaje:',
      message
    ].join('\n');

    const mailto = `mailto:felifade@gmail.com`
      + `?subject=${encodeURIComponent(`Contacto Militia Inc. — ${name}`)}`
      + `&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
}

/* --- Smooth anchor offset (compensate for fixed nav) --- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY
               - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10)
               - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
