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

/* --- Events View Logic & Google Calendar API --- */
const eventsTabs = document.querySelectorAll('.events-tab');
const viewCards = document.getElementById('view-cards');
const viewCalendar = document.getElementById('view-calendar');

// Toggle between Cards and Calendar view
eventsTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active class on tabs
    eventsTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show selected view
    const targetView = tab.getAttribute('data-view');
    if (targetView === 'cards') {
      viewCards.style.display = 'block';
      viewCalendar.style.display = 'none';
    } else {
      viewCards.style.display = 'none';
      viewCalendar.style.display = 'block';
    }
  });
});

// Google Calendar API config
const GOOGLE_CALENDAR_API_KEY = ''; // TODO: Agrega tu API Key aquí
const CALENDAR_ID = '0lncu26mmc32cf8rtoagmtmg4v3aokqh@import.calendar.google.com';

// Render event cards
function renderEventCards(events) {
  const container = document.getElementById('events-container');
  const loading = document.getElementById('events-loading');
  const empty = document.getElementById('events-empty');
  
  loading.style.display = 'none';
  
  if (!events || events.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  const formatterMes = new Intl.DateTimeFormat('es-MX', { month: 'short' });
  
  const cardsHtml = events.map(ev => {
    const d = new Date(ev.start);
    const day = d.getDate();
    const month = formatterMes.format(d);
    
    const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const title = ev.summary || 'Evento Militia Inc.';
    const location = ev.location || 'Pachuca, Hidalgo';

    return `
      <div class="event-card">
        <div class="event-date">
          <span class="event-date-day">${day}</span>
          <span class="event-date-month">${month}</span>
        </div>
        <div class="event-info">
          <h3 class="event-title">${title}</h3>
          <div class="event-meta">
            <div class="event-meta-item">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-.76 1.08z"/></svg>
              <span>${time} hrs</span>
            </div>
            <div class="event-meta-item">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${location}</span>
            </div>
          </div>
        </div>
        <div class="event-action">
          <a href="#contacto" class="btn btn-outline">Reservar</a>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = cardsHtml;
}

// Fetch from API or load Mocks
async function fetchEvents() {
  // If no API Key is set, show mock data so the UI can be previewed!
  if (!GOOGLE_CALENDAR_API_KEY) {
    setTimeout(() => {
      renderEventCards([
        {
          summary: "Militia Inc. en Festival Rock Local",
          start: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          location: "Auditorio Gota de Plata, Pachuca"
        },
        {
          summary: "Tarde de Covers: Rock en Español",
          start: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 21).toISOString(),
          location: "Bar Revolución, Centro Histórico"
        },
        {
          summary: "Evento Privado - Tributo Clásico",
          start: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 45).toISOString(),
          location: "Pachuca, Hidalgo"
        }
      ]);
    }, 700);
    return;
  }

  // Real fetch implementation (will be active once API KEY is set)
  try {
    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${GOOGLE_CALENDAR_API_KEY}&timeMin=${timeMin}&singleEvents=true&orderBy=startTime&maxResults=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items) {
      // Map API items to our object format
      const events = data.items.map(item => ({
        summary: item.summary,
        start: item.start.dateTime || item.start.date,
        location: item.location
      }));
      renderEventCards(events);
    } else {
      renderEventCards([]);
    }
  } catch (err) {
    console.error("Error fetching calendar:", err);
    document.getElementById('events-loading').style.display = 'none';
    document.getElementById('events-empty').style.display = 'block';
    document.getElementById('events-empty').innerText = 'Ocurrió un error al cargar los eventos.';
  }
}

// Init fetching on DOM load
document.addEventListener('DOMContentLoaded', fetchEvents);
