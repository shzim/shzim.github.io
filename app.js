import { isFirebaseConfigured, db, collection, getDocs, getDoc, doc, query, orderBy, where } from './firebase-config.js';

const defaultFeaturedProjects = [
  {
    id: 'proj-1',
    title: 'Aeronautical Wing Rib & Spar Assembly',
    category: 'Aeronautical',
    shortDescription: 'High-strength structural wing rib designed for high-g loading and minimal structural mass.',
    technologies: ['SolidWorks 2024', 'ANSYS', 'FEA', 'Aluminum 7075-T6'],
    imageUrl: './img/img-13.webp',
    liveUrl: 'cad-projects.html'
  },
  {
    id: 'proj-2',
    title: 'Turbine Blade & Compressor Stage Design',
    category: 'Propulsion',
    shortDescription: 'Aerodynamically contoured axial compressor blade with internal cooling channels.',
    technologies: ['ANSYS', 'SolidWorks', 'Titanium Ti-6Al-4V'],
    imageUrl: './img/img-14.webp',
    liveUrl: 'cad-projects.html'
  },
  {
    id: 'proj-3',
    title: 'Autonomous UAV Airframe & Avionics Bay',
    category: 'Drone & UAV',
    shortDescription: 'Modular drone chassis featuring integrated vibration damping mounts.',
    technologies: ['Fusion 360', 'Carbon Fiber', 'PETG'],
    imageUrl: './img/img-1.webp',
    liveUrl: 'cad-projects.html'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderAndNavigation();
  setupRevealObserver();

  // Load dynamic contents
  loadProfileContent();
  loadFeaturedProjects();
});

function setupHeaderAndNavigation() {
  const header = document.getElementById('header');
  const hamburger = document.getElementById('hamburger-menu');
  const navUl = document.getElementById('nav-ul');
  const navItems = document.querySelectorAll('.nav-item');

  // Sticky header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navUl.classList.toggle('active');
    });
  }

  // Close mobile menu when clicking nav links
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (hamburger && navUl.classList.contains('active')) {
        hamburger.classList.remove('active');
        navUl.classList.remove('active');
      }
    });
  });
}

function setupRevealObserver() {
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

// Dynamically populate Hero, About, Quote, Contact & Social links from Firestore
async function loadProfileContent() {
  let profile = null;

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, "profile", "main"));
      if (snap.exists()) profile = snap.data();
    } catch (err) {
      console.warn("Could not load profile from Firestore:", err);
    }
  }

  if (!profile) {
    profile = JSON.parse(localStorage.getItem('zim_profile_data') || 'null');
  }

  if (!profile) return;

  const badgeSpan = document.getElementById('hero-badge-span');
  const heroTitleEl = document.getElementById('hero-title-el');
  const heroDescEl = document.getElementById('hero-desc-el');
  const quoteTextEl = document.getElementById('quote-text-el');
  const aboutImgEl = document.getElementById('about-img-el');
  const resumeLinkEl = document.getElementById('resume-link-el');
  const aboutTextEl = document.getElementById('about-text-el');
  const phoneEl = document.getElementById('contact-phone-el');
  const emailEl = document.getElementById('contact-email-el');
  const locationEl = document.getElementById('contact-location-el');

  if (badgeSpan && profile.tagline) badgeSpan.textContent = profile.tagline;

  if (heroTitleEl && (profile.heroTitleLine1 || profile.heroTitleLine2)) {
    heroTitleEl.innerHTML = `
      <span>${profile.heroTitleLine1 || 'Visionary Creator'}</span>
      <span class="accent-text">& ${profile.heroTitleLine2 || 'Aviation Enthusiast'}</span>
    `;
  }

  if (heroDescEl && profile.heroDescription) heroDescEl.textContent = profile.heroDescription;
  if (quoteTextEl && profile.quoteText) quoteTextEl.textContent = `"${profile.quoteText.replace(/^"|"$/g, '')}"`;
  if (aboutImgEl && profile.profileImageUrl) aboutImgEl.src = profile.profileImageUrl;
  if (aboutTextEl && profile.aboutText) aboutTextEl.textContent = profile.aboutText;

  if (resumeLinkEl && profile.resumeUrl) {
    resumeLinkEl.href = profile.resumeUrl;
  }

  if (phoneEl && profile.contactPhone) {
    phoneEl.href = `tel:${profile.contactPhone}`;
    phoneEl.textContent = profile.contactPhone;
  }

  if (emailEl && profile.contactEmail) {
    emailEl.href = `mailto:${profile.contactEmail}`;
    emailEl.textContent = profile.contactEmail;
  }

  if (locationEl && profile.contactLocation) {
    locationEl.textContent = profile.contactLocation;
  }

  if (profile.socialLinks) {
    const li = document.getElementById('social-linkedin-el');
    const fb = document.getElementById('social-facebook-el');
    const tw = document.getElementById('social-twitter-el');
    const ig = document.getElementById('social-instagram-el');

    if (li && profile.socialLinks.linkedin) li.href = profile.socialLinks.linkedin;
    if (fb && profile.socialLinks.facebook) fb.href = profile.socialLinks.facebook;
    if (tw && profile.socialLinks.twitter) tw.href = profile.socialLinks.twitter;
    if (ig && profile.socialLinks.instagram) ig.href = profile.socialLinks.instagram;
  }
}

// Dynamically render Projects on Home Page
async function loadFeaturedProjects() {
  const container = document.getElementById('projects-grid-el');
  if (!container) return;

  let projects = [];

  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "projects"), where("featured", "==", true), orderBy("displayOrder", "asc"));
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        projects.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (err) {
      console.warn("Firestore projects query error:", err);
    }
  }

  if (projects.length === 0) {
    const local = JSON.parse(localStorage.getItem('zim_projects') || '[]');
    projects = local.length > 0 ? local.filter(p => p.featured !== false) : defaultFeaturedProjects;
  }

  container.innerHTML = projects.map(proj => {
    const techBadges = (proj.technologies || []).map(t => `<span class="project-tag">${t}</span>`).join(' ');

    return `
      <article class="glass-panel project-card reveal active">
        <div class="project-img-wrapper" style="height: 220px; overflow: hidden; background: #000;">
          <img src="${proj.imageUrl || './img/img-13.webp'}" alt="${proj.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async">
        </div>
        <div class="project-info" style="padding: 2rem;">
          <span class="project-tag" style="margin-bottom: 0.8rem; display: inline-block;">${proj.category || 'Engineering'}</span>
          <h3 class="project-title" style="font-size: 2.2rem; font-weight: 700; margin-bottom: 1rem;">${proj.title}</h3>
          <p class="project-desc" style="font-size: 1.4rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 1.5rem;">${proj.shortDescription || ''}</p>
          
          <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.5rem;">
            ${techBadges}
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: auto;">
            ${proj.liveUrl ? `<a href="${proj.liveUrl}" class="cta-btn primary-btn" style="padding: 0.8rem 1.6rem; font-size: 1.3rem; text-decoration: none;">View Project ↗</a>` : ''}
            ${proj.githubUrl ? `<a href="${proj.githubUrl}" target="_blank" class="cta-btn outline-btn" style="padding: 0.8rem 1.6rem; font-size: 1.3rem; text-decoration: none;">GitHub ↗</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }).join('');
}
