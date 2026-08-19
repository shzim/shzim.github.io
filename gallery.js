import { isFirebaseConfigured, db, collection, getDocs, query, orderBy } from './firebase-config.js';

// Pre-seeded initial portfolio photos for instant visual richness
const defaultPhotos = [
  {
    id: 'demo-1',
    title: 'ICEP Maldives XX1 Camp Delegation',
    album: 'International Tours',
    rating: 5,
    imageUrl: './img/img-11.webp'
  },
  {
    id: 'demo-2',
    title: 'NCC Night Photography - Emotion & Storytelling',
    album: 'General',
    rating: 5,
    imageUrl: './img/img-1.webp'
  },
  {
    id: 'demo-3',
    title: 'Aviation Engineering & Cockpit Heritage',
    album: 'Aviation',
    rating: 4.5,
    imageUrl: './img/img-13.webp'
  },
  {
    id: 'demo-4',
    title: 'Creative Visual Composition',
    album: 'Creative',
    rating: 4,
    imageUrl: './img/img-14.webp'
  }
];

let allPhotos = [];
let currentFilter = 'All';

document.addEventListener('DOMContentLoaded', async () => {
  setupMobileMenu();
  setupFilters();
  setupLightbox();
  await loadPhotos();
  renderDynamicAlbumFilterButtons();
});

function setupMobileMenu() {
  const hamburger = document.getElementById('hamburger-menu');
  const navUl = document.getElementById('nav-ul');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navUl.classList.toggle('active');
    });
  }
}

function renderDynamicAlbumFilterButtons() {
  const filterContainer = document.getElementById('album-filters');
  if (!filterContainer) return;

  const customAlbums = JSON.parse(localStorage.getItem('zim_custom_albums') || '[]');
  const defaultAlbums = ["International Tours", "General", "Aviation", "Creative"];
  const deletedAlbums = JSON.parse(localStorage.getItem('zim_deleted_albums') || '[]');

  const allAlbums = Array.from(new Set([...defaultAlbums, ...customAlbums])).filter(a => !deletedAlbums.includes(a));

  filterContainer.innerHTML = `<button class="filter-btn active" data-album="All">All Albums</button>` +
    allAlbums.map(a => `<button class="filter-btn" data-album="${a}">${a}</button>`).join('');
  
  setupFilters();
}

async function loadPhotos() {
  let loadedPhotos = [];
  const localItems = JSON.parse(localStorage.getItem('zim_published_photos') || '[]');

  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "gallery_photos"), orderBy("rating", "desc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        if (!item.deletedAt) loadedPhotos.push(item);
      });
    } catch (err) {
      console.warn("Failed to fetch from Firebase, using fallback photos:", err);
    }
  }

  const combinedMap = new Map();
  const rawList = loadedPhotos.length > 0 ? loadedPhotos : (localItems.length > 0 ? localItems : defaultPhotos);
  
  rawList.filter(p => !p.deletedAt).forEach(photo => {
    if (!combinedMap.has(photo.id)) {
      combinedMap.set(photo.id, photo);
    }
  });

  allPhotos = Array.from(combinedMap.values());
  allPhotos.sort((a, b) => Number(b.rating) - Number(a.rating));

  renderGallery();
}

function renderGallery() {
  const gridContainer = document.getElementById('gallery-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  const filteredPhotos = currentFilter === 'All' 
    ? allPhotos 
    : allPhotos.filter(p => p.album.toLowerCase() === currentFilter.toLowerCase());

  if (filteredPhotos.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem;">
        No photos found in "${currentFilter}" album.
      </div>
    `;
    return;
  }

  filteredPhotos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'glass-panel gallery-card';
    
    const fullStars = '★'.repeat(Math.floor(photo.rating));
    const starDisplay = `${fullStars} ${photo.rating}`;

    card.innerHTML = `
      <img src="${photo.imageUrl}" alt="${photo.title}" loading="lazy" decoding="async">
      <div class="gallery-card-overlay">
        <div class="gallery-rating">${starDisplay}</div>
        <h3 class="gallery-card-title">${photo.title}</h3>
        <span class="gallery-card-album">${photo.album}</span>
      </div>
    `;

    card.addEventListener('click', () => openLightbox(photo));
    gridContainer.appendChild(card);
  });
}

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-album');
      renderGallery();
    });
  });
}

function setupLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const closeBtn = document.getElementById('lightbox-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
}

function openLightbox(photo) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const title = document.getElementById('lightbox-title');
  const album = document.getElementById('lightbox-album');
  const rating = document.getElementById('lightbox-rating');

  if (!modal) return;
  img.src = photo.imageUrl;
  title.textContent = photo.title;
  album.textContent = `Album: ${photo.album}`;
  rating.textContent = '★'.repeat(Math.floor(photo.rating)) + ` ${photo.rating}`;

  modal.classList.add('active');
}
