import { 
  isFirebaseConfigured, 
  auth, 
  db, 
  storage, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  signOut, 
  onAuthStateChanged 
} from './firebase-config.js';

let selectedPhotoFile = null;
let photoBase64Data = null;
let selectedProjectFile = null;
let selectedProfileImageFile = null;
let selectedTrashIds = new Set();

let albums = ["International Tours", "General", "Aviation", "Creative"];

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

const defaultProjects = [
  {
    id: 'proj-1',
    title: 'Aeronautical Wing Rib & Spar Assembly',
    category: 'Aeronautical',
    shortDescription: 'High-strength structural wing rib designed for high-g loading and minimal structural mass.',
    fullDescription: 'Optimized through Finite Element Analysis (FEA) for mass reduction and aerodynamic performance.',
    technologies: ['SolidWorks 2024', 'ANSYS', 'FEA', 'Aluminum 7075-T6'],
    displayOrder: 1,
    featured: true,
    githubUrl: 'https://github.com/shzim',
    liveUrl: 'cad-projects.html',
    imageUrl: './img/img-13.webp',
    cadSpecs: { software: 'SolidWorks 2024', format: 'STEP / STL', materials: 'Aluminum 7075-T6', weight: '1.42 kg' }
  },
  {
    id: 'proj-2',
    title: 'Turbine Blade & Compressor Stage Design',
    category: 'Propulsion',
    shortDescription: 'Aerodynamically contoured axial compressor blade with internal cooling channels.',
    fullDescription: 'Designed for gas turbine propulsion research with internal cooling geometry.',
    technologies: ['ANSYS', 'SolidWorks', 'Titanium Ti-6Al-4V'],
    displayOrder: 2,
    featured: true,
    githubUrl: 'https://github.com/shzim',
    liveUrl: 'cad-projects.html',
    imageUrl: './img/img-14.webp',
    cadSpecs: { software: 'ANSYS / SolidWorks', format: 'STEP / IGES', materials: 'Titanium Ti-6Al-4V', weight: '0.88 kg' }
  },
  {
    id: 'proj-3',
    title: 'Autonomous UAV Airframe & Avionics Bay',
    category: 'Drone & UAV',
    shortDescription: 'Modular drone chassis featuring integrated vibration damping mounts.',
    fullDescription: 'Custom multirotor frame engineered for flight controller isolation and dual-power redundancy.',
    technologies: ['Fusion 360', 'Carbon Fiber', 'PETG'],
    displayOrder: 3,
    featured: true,
    githubUrl: 'https://github.com/shzim',
    liveUrl: 'cad-projects.html',
    imageUrl: './img/img-1.webp',
    cadSpecs: { software: 'Fusion 360', format: 'STL / OBJ / STEP', materials: 'Carbon Fiber / PETG', weight: '2.15 kg' }
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // Guard access using Firebase Auth or local fallback auth
  if (isFirebaseConfigured && auth) {
    onAuthStateChanged(auth, (user) => {
      if (!user && sessionStorage.getItem('zim_admin_auth') !== 'true') {
        window.location.href = 'admin.html';
      }
    });
  } else if (sessionStorage.getItem('zim_admin_auth') !== 'true') {
    window.location.href = 'admin.html';
    return;
  }

  setupTabNavigation();
  loadAlbums();
  loadPhotosAndTrash();
  loadProjects();
  loadProfileData();
  loadExperienceAndEducation();
  setupDashboardControls();
});

// ================= TAB NAVIGATION =================
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('#dashboard-tabs .filter-btn');
  const tabContents = document.querySelectorAll('.dashboard-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.remove('hidden');
          content.classList.add('active');
        } else {
          content.classList.add('hidden');
          content.classList.remove('active');
        }
      });
    });
  });
}

// ================= ALBUMS & PHOTOS =================
async function loadAlbums() {
  let customAlbums = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "albums"));
      snap.forEach(d => customAlbums.push(d.data().name));
    } catch (e) { console.warn("Albums Firestore fetch error:", e); }
  } else {
    customAlbums = JSON.parse(localStorage.getItem('zim_custom_albums') || '[]');
  }

  albums = Array.from(new Set([...albums, ...customAlbums]));

  const selectElem = document.getElementById('photo-album');
  const editSelectElem = document.getElementById('edit-photo-album');
  
  if (selectElem) selectElem.innerHTML = albums.map(a => `<option value="${a}">${a}</option>`).join('');
  if (editSelectElem) editSelectElem.innerHTML = albums.map(a => `<option value="${a}">${a}</option>`).join('');

  renderAlbumsList();
}

function renderAlbumsList() {
  const container = document.getElementById('album-list-container');
  if (!container) return;

  container.innerHTML = albums.map(albumName => `
    <div class="glass-panel" style="padding: 1.2rem 1.8rem; display: flex; align-items: center; gap: 1rem; border-radius: var(--radius-sm);">
      <span style="font-weight: 600;">📁 ${albumName}</span>
      <button onclick="editAlbumName('${albumName}')" style="background: none; border: none; color: var(--secondary-accent); cursor: pointer; font-size: 1.4rem;" title="Rename Album">✎ Edit</button>
    </div>
  `).join('');
}

window.editAlbumName = async function(oldName) {
  const newName = prompt(`Rename folder/album "${oldName}":`, oldName);
  if (!newName || newName.trim() === '' || newName === oldName) return;

  const trimmed = newName.trim();
  albums = albums.map(a => a === oldName ? trimmed : a);

  if (isFirebaseConfigured && db) {
    try {
      await addDoc(collection(db, "albums"), { name: trimmed, createdAt: new Date().toISOString() });
    } catch (e) { console.error(e); }
  } else {
    localStorage.setItem('zim_custom_albums', JSON.stringify(albums));
  }

  loadAlbums();
  loadPhotosAndTrash();
};

async function loadPhotosAndTrash() {
  let photos = [];
  let trash = [];

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(query(collection(db, "gallery_photos"), orderBy("rating", "desc")));
      snap.forEach(docSnap => {
        const item = { id: docSnap.id, ...docSnap.data() };
        if (item.deletedAt) {
          trash.push(item);
        } else {
          photos.push(item);
        }
      });
    } catch (err) {
      console.warn("Firestore error loading photos:", err);
    }
  }

  if (photos.length === 0 && trash.length === 0) {
    const localPhotos = JSON.parse(localStorage.getItem('zim_published_photos') || '[]');
    photos = localPhotos.length > 0 ? localPhotos : defaultPhotos;
    trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
  }

  const trashBadge = document.getElementById('trash-badge-count');
  if (trashBadge) trashBadge.textContent = trash.length;

  selectedTrashIds.clear();
  updateBulkActionButtons();

  renderPhotosGrid(photos);
  renderTrashGrid(trash);
}

function renderPhotosGrid(photos) {
  const container = document.getElementById('manage-photos-grid');
  if (!container) return;

  if (photos.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted);">No published photos found.</div>`;
    return;
  }

  container.innerHTML = photos.map(p => `
    <div class="glass-panel" style="overflow: hidden; display: flex; flex-direction: column; border-radius: var(--radius-sm);">
      <div style="height: 160px; overflow: hidden; background: #000;">
        <img src="${p.imageUrl}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div style="padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; gap: 0.8rem;">
        <div style="color: var(--gold-star); font-size: 1.4rem;">★ ${p.rating}</div>
        <h4 style="font-size: 1.6rem; font-weight: 700;">${p.title}</h4>
        <span style="color: var(--secondary-accent); font-size: 1.2rem;">📁 ${p.album}</span>
        
        <div style="margin-top: auto; display: flex; gap: 0.8rem; padding-top: 1rem;">
          <button onclick="openEditPhotoModal('${p.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; flex: 1;">Edit</button>
          <button onclick="softDeletePhoto('${p.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; color: #ef4444; border-color: #ef4444;">Trash</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTrashGrid(trash) {
  const container = document.getElementById('recycle-bin-container');
  if (!container) return;

  if (trash.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); padding: 3rem 0; text-align: center;">Recycle bin is empty. Items moved to trash are automatically purged after 90 days.</div>`;
    return;
  }

  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  container.innerHTML = trash.map(item => {
    const deletedMs = new Date(item.deletedAt || Date.now()).getTime();
    const elapsedDays = Math.floor((now - deletedMs) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 90 - elapsedDays);
    const isChecked = selectedTrashIds.has(item.id) ? 'checked' : '';

    return `
      <div class="glass-panel ${isChecked ? 'selected-card' : ''}" style="overflow: hidden; display: flex; flex-direction: column; border-radius: var(--radius-sm); border-color: rgba(239,68,68,0.3); position: relative;">
        <div style="position: absolute; top: 1rem; left: 1rem; z-index: 10; background: rgba(0,0,0,0.75); padding: 0.4rem 0.8rem; border-radius: 4px; display: flex; align-items: center; gap: 0.6rem;">
          <input type="checkbox" onchange="toggleTrashSelection('${item.id}', this.checked)" ${isChecked} style="width: 1.8rem; height: 1.8rem; cursor: pointer; accent-color: var(--primary-accent);">
          <span style="font-size: 1.2rem; font-weight: 600;">Select</span>
        </div>

        <div style="height: 150px; overflow: hidden; background: #000; position: relative;">
          <img src="${item.imageUrl}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.55;">
        </div>

        <div style="padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; gap: 0.6rem;">
          <h4 style="font-size: 1.5rem; font-weight: 700;">${item.title}</h4>
          <div style="color: #ef4444; font-size: 1.2rem; font-weight: 600;">⏳ Auto-deletes in ${remainingDays} days</div>
          
          <div style="margin-top: auto; display: flex; gap: 0.8rem; padding-top: 1rem;">
            <button onclick="restorePhoto('${item.id}')" class="cta-btn primary-btn" style="padding: 0.6rem 1rem; font-size: 1.2rem; flex: 1;">Restore</button>
            <button onclick="permanentDeletePhoto('${item.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1rem; font-size: 1.2rem; color: #ef4444; border-color: #ef4444;">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleTrashSelection = function(id, isChecked) {
  if (isChecked) selectedTrashIds.add(id);
  else selectedTrashIds.delete(id);
  updateBulkActionButtons();
};

function updateBulkActionButtons() {
  const restoreBtn = document.getElementById('restore-selected-btn');
  const deleteBtn = document.getElementById('delete-selected-btn');
  const count = selectedTrashIds.size;

  if (restoreBtn && deleteBtn) {
    if (count > 0) {
      restoreBtn.style.display = 'inline-flex';
      deleteBtn.style.display = 'inline-flex';
      restoreBtn.textContent = `Restore Selected (${count})`;
      deleteBtn.textContent = `Delete Selected (${count})`;
    } else {
      restoreBtn.style.display = 'none';
      deleteBtn.style.display = 'none';
    }
  }
}

window.softDeletePhoto = async function(id) {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, "gallery_photos", id), { deletedAt: new Date().toISOString() });
    } catch (e) { console.error(e); }
  } else {
    let localPhotos = JSON.parse(localStorage.getItem('zim_published_photos') || '[]');
    let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
    const idx = localPhotos.findIndex(p => p.id === id);
    if (idx !== -1) {
      const [item] = localPhotos.splice(idx, 1);
      item.deletedAt = new Date().toISOString();
      trash.unshift(item);
      localStorage.setItem('zim_published_photos', JSON.stringify(localPhotos));
      localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
    }
  }
  loadPhotosAndTrash();
};

window.restorePhoto = async function(id) {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, "gallery_photos", id), { deletedAt: null });
    } catch (e) { console.error(e); }
  } else {
    let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
    let localPhotos = JSON.parse(localStorage.getItem('zim_published_photos') || '[]');
    const idx = trash.findIndex(t => t.id === id);
    if (idx !== -1) {
      const [item] = trash.splice(idx, 1);
      delete item.deletedAt;
      localPhotos.unshift(item);
      localStorage.setItem('zim_published_photos', JSON.stringify(localPhotos));
      localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
    }
  }
  loadPhotosAndTrash();
};

window.permanentDeletePhoto = async function(id) {
  if (!confirm("Permanently delete this photo? This action cannot be undone.")) return;

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "gallery_photos", id));
    } catch (e) { console.error(e); }
  } else {
    let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
    trash = trash.filter(t => t.id !== id);
    localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
  }
  loadPhotosAndTrash();
};


// ================= PROJECTS MANAGER =================
async function loadProjects() {
  let projects = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(query(collection(db, "projects"), orderBy("displayOrder", "asc")));
      snap.forEach(d => projects.push({ id: d.id, ...d.data() }));
    } catch (e) { console.warn("Firestore error loading projects:", e); }
  }

  if (projects.length === 0) {
    projects = JSON.parse(localStorage.getItem('zim_projects') || '[]');
    if (projects.length === 0) projects = defaultProjects;
  }

  renderProjectsList(projects);
}

function renderProjectsList(projects) {
  const container = document.getElementById('projects-list-grid');
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted);">No projects created yet.</div>`;
    return;
  }

  container.innerHTML = projects.map(p => `
    <div class="glass-panel" style="overflow: hidden; display: flex; flex-direction: column; border-radius: var(--radius-sm);">
      <div style="height: 150px; overflow: hidden; background: #000;">
        <img src="${p.imageUrl || './img/img-13.webp'}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div style="padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; gap: 0.8rem;">
        <span class="project-tag" style="align-self: flex-start; font-size: 1.1rem;">${p.category} ${p.featured ? '⭐ Featured' : ''}</span>
        <h4 style="font-size: 1.6rem; font-weight: 700;">${p.title}</h4>
        <p style="font-size: 1.2rem; color: var(--text-muted); line-clamp: 2;">${p.shortDescription}</p>

        <div style="margin-top: auto; display: flex; gap: 0.8rem; padding-top: 1rem;">
          <button onclick="editProject('${p.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; flex: 1;">Edit</button>
          <button onclick="deleteProject('${p.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; color: #ef4444; border-color: #ef4444;">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.editProject = async function(id) {
  let project = null;
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, "projects", id));
      if (snap.exists()) project = { id: snap.id, ...snap.data() };
    } catch (e) { console.error(e); }
  }
  if (!project) {
    const localProjs = JSON.parse(localStorage.getItem('zim_projects') || '[]');
    project = [...localProjs, ...defaultProjects].find(p => p.id === id);
  }

  if (!project) return;

  document.getElementById('project-id').value = project.id;
  document.getElementById('project-title').value = project.title || '';
  document.getElementById('project-category').value = project.category || 'Aeronautical';
  document.getElementById('project-short-desc').value = project.shortDescription || '';
  document.getElementById('project-full-desc').value = project.fullDescription || '';
  document.getElementById('project-tech').value = (project.technologies || []).join(', ');
  document.getElementById('project-order').value = project.displayOrder || 1;
  document.getElementById('project-github').value = project.githubUrl || '';
  document.getElementById('project-live').value = project.liveUrl || '';
  document.getElementById('project-featured').checked = project.featured !== false;

  if (project.cadSpecs) {
    document.getElementById('cad-software').value = project.cadSpecs.software || '';
    document.getElementById('cad-format').value = project.cadSpecs.format || '';
    document.getElementById('cad-materials').value = project.cadSpecs.materials || '';
    document.getElementById('cad-weight').value = project.cadSpecs.weight || '';
  }

  window.scrollTo({ top: document.getElementById('project-form').offsetTop - 100, behavior: 'smooth' });
};

window.deleteProject = async function(id) {
  if (!confirm("Delete this project?")) return;

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (e) { console.error(e); }
  } else {
    let projects = JSON.parse(localStorage.getItem('zim_projects') || '[]');
    projects = projects.filter(p => p.id !== id);
    localStorage.setItem('zim_projects', JSON.stringify(projects));
  }
  loadProjects();
};


// ================= PROFILE & CONTACT =================
async function loadProfileData() {
  let profile = null;
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, "profile", "main"));
      if (snap.exists()) profile = snap.data();
    } catch (e) { console.warn("Firestore profile fetch error:", e); }
  }
  if (!profile) {
    profile = JSON.parse(localStorage.getItem('zim_profile_data') || 'null');
  }

  if (profile) {
    if (profile.fullName) document.getElementById('profile-name').value = profile.fullName;
    if (profile.tagline) document.getElementById('profile-tagline').value = profile.tagline;
    if (profile.heroTitleLine1) document.getElementById('hero-title-1').value = profile.heroTitleLine1;
    if (profile.heroTitleLine2) document.getElementById('hero-title-2').value = profile.heroTitleLine2;
    if (profile.heroDescription) document.getElementById('hero-description').value = profile.heroDescription;
    if (profile.aboutText) document.getElementById('about-text').value = profile.aboutText;
    if (profile.quoteText) document.getElementById('quote-text').value = profile.quoteText;
    if (profile.contactPhone) document.getElementById('profile-phone').value = profile.contactPhone;
    if (profile.contactEmail) document.getElementById('profile-email').value = profile.contactEmail;
    if (profile.contactLocation) document.getElementById('profile-location').value = profile.contactLocation;
    if (profile.resumeUrl) document.getElementById('profile-resume').value = profile.resumeUrl;

    if (profile.socialLinks) {
      if (profile.socialLinks.linkedin) document.getElementById('social-linkedin').value = profile.socialLinks.linkedin;
      if (profile.socialLinks.facebook) document.getElementById('social-facebook').value = profile.socialLinks.facebook;
      if (profile.socialLinks.twitter) document.getElementById('social-twitter').value = profile.socialLinks.twitter;
      if (profile.socialLinks.instagram) document.getElementById('social-instagram').value = profile.socialLinks.instagram;
    }
  }
}


// ================= EXPERIENCE & EDUCATION =================
async function loadExperienceAndEducation() {
  let experiences = [];
  let educationList = [];

  if (isFirebaseConfigured && db) {
    try {
      const expSnap = await getDocs(query(collection(db, "experience"), orderBy("displayOrder", "asc")));
      expSnap.forEach(d => experiences.push({ id: d.id, ...d.data() }));

      const eduSnap = await getDocs(query(collection(db, "education"), orderBy("displayOrder", "asc")));
      eduSnap.forEach(d => educationList.push({ id: d.id, ...d.data() }));
    } catch (e) { console.warn("Firestore exp/edu fetch error:", e); }
  }

  if (experiences.length === 0) experiences = JSON.parse(localStorage.getItem('zim_experience') || '[]');
  if (educationList.length === 0) educationList = JSON.parse(localStorage.getItem('zim_education') || '[]');

  renderExperienceList(experiences);
  renderEducationList(educationList);
}

function renderExperienceList(list) {
  const container = document.getElementById('experience-list-container');
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">No experience entries added.</div>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="glass-panel" style="padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; border-radius: var(--radius-sm);">
      <div>
        <h4 style="font-size: 1.6rem; font-weight: 700;">${item.role}</h4>
        <span style="color: var(--secondary-accent); font-size: 1.3rem;">${item.company} (${item.startDate} - ${item.endDate})</span>
        <p style="font-size: 1.2rem; color: var(--text-muted); margin-top: 0.4rem;">${item.description || ''}</p>
      </div>
      <button onclick="deleteExperience('${item.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; color: #ef4444; border-color: #ef4444;">Delete</button>
    </div>
  `).join('');
}

function renderEducationList(list) {
  const container = document.getElementById('education-list-container');
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">No education entries added.</div>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="glass-panel" style="padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; border-radius: var(--radius-sm);">
      <div>
        <h4 style="font-size: 1.6rem; font-weight: 700;">${item.degree}</h4>
        <span style="color: var(--primary-accent); font-size: 1.3rem;">${item.institution} (${item.startDate} - ${item.endDate})</span>
        <p style="font-size: 1.2rem; color: var(--text-muted); margin-top: 0.4rem;">${item.details || ''}</p>
      </div>
      <button onclick="deleteEducation('${item.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; color: #ef4444; border-color: #ef4444;">Delete</button>
    </div>
  `).join('');
}

window.deleteExperience = async function(id) {
  if (isFirebaseConfigured && db) {
    try { await deleteDoc(doc(db, "experience", id)); } catch(e){ console.error(e); }
  } else {
    let list = JSON.parse(localStorage.getItem('zim_experience') || '[]');
    list = list.filter(i => i.id !== id);
    localStorage.setItem('zim_experience', JSON.stringify(list));
  }
  loadExperienceAndEducation();
};

window.deleteEducation = async function(id) {
  if (isFirebaseConfigured && db) {
    try { await deleteDoc(doc(db, "education", id)); } catch(e){ console.error(e); }
  } else {
    let list = JSON.parse(localStorage.getItem('zim_education') || '[]');
    list = list.filter(i => i.id !== id);
    localStorage.setItem('zim_education', JSON.stringify(list));
  }
  loadExperienceAndEducation();
};


// ================= DASHBOARD FORM CONTROLS & LISTENERS =================
function setupDashboardControls() {
  const logoutBtn = document.getElementById('logout-btn');
  const openTrashModalBtn = document.getElementById('open-trash-modal-btn');
  const recycleBinClose = document.getElementById('recycle-bin-close');
  const recycleBinModal = document.getElementById('recycle-bin-modal');

  const createAlbumBtn = document.getElementById('create-album-btn');
  const selectAllBtn = document.getElementById('select-all-trash-btn');
  const restoreSelectedBtn = document.getElementById('restore-selected-btn');
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');
  const emptyTrashBtn = document.getElementById('empty-trash-btn');

  const dropZone = document.getElementById('drop-zone');
  const photoInput = document.getElementById('photo-input');
  const previewContainer = document.getElementById('image-preview-container');
  const dropZoneContent = document.getElementById('drop-zone-content');
  const imagePreview = document.getElementById('image-preview');
  const removeImgBtn = document.getElementById('remove-img-btn');
  const ratingInput = document.getElementById('photo-rating');
  const ratingValue = document.getElementById('rating-value');
  const starDisplay = document.getElementById('star-display');
  const uploadForm = document.getElementById('upload-form');

  const projectForm = document.getElementById('project-form');
  const projectImgInput = document.getElementById('project-image-input');
  const resetProjectBtn = document.getElementById('reset-project-form-btn');
  const profileForm = document.getElementById('profile-form');
  const profileImgInput = document.getElementById('profile-image-input');
  const expForm = document.getElementById('experience-form');
  const eduForm = document.getElementById('education-form');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('zim_admin_auth');
      if (isFirebaseConfigured && auth) signOut(auth);
      window.location.href = 'admin.html';
    });
  }

  if (openTrashModalBtn && recycleBinModal) {
    openTrashModalBtn.addEventListener('click', () => recycleBinModal.classList.add('active'));
  }
  if (recycleBinClose && recycleBinModal) {
    recycleBinClose.addEventListener('click', () => recycleBinModal.classList.remove('active'));
  }

  if (createAlbumBtn) {
    createAlbumBtn.addEventListener('click', async () => {
      const name = prompt("Enter new Album / Folder name:");
      if (name && name.trim()) {
        const trimmed = name.trim();
        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, "albums"), { name: trimmed, createdAt: new Date().toISOString() });
        } else {
          const custom = JSON.parse(localStorage.getItem('zim_custom_albums') || '[]');
          if (!custom.includes(trimmed)) custom.push(trimmed);
          localStorage.setItem('zim_custom_albums', JSON.stringify(custom));
        }
        loadAlbums();
      }
    });
  }

  // Photo Uploader File Select
  if (dropZone && photoInput) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length > 0) handlePhotoFileSelect(e.dataTransfer.files[0]);
    });
    photoInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handlePhotoFileSelect(e.target.files[0]);
    });
  }

  function handlePhotoFileSelect(file) {
    if (!file.type.startsWith('image/')) { alert('Select a valid image file.'); return; }
    selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      photoBase64Data = e.target.result;
      imagePreview.src = photoBase64Data;
      dropZoneContent.classList.add('hidden');
      previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  if (removeImgBtn) {
    removeImgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedPhotoFile = null;
      photoBase64Data = null;
      imagePreview.src = '';
      photoInput.value = '';
      previewContainer.classList.add('hidden');
      dropZoneContent.classList.remove('hidden');
    });
  }

  if (ratingInput) {
    ratingInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      ratingValue.textContent = `★ ${val.toFixed(1)}`;
      starDisplay.textContent = '★'.repeat(Math.floor(val)) + '☆'.repeat(5 - Math.floor(val));
    });
  }

  // Publish Photo Form Submit
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusMsg = document.getElementById('status-message');
      const progressBar = document.getElementById('upload-progress-bar');
      const progressFill = document.getElementById('progress-fill');

      if (!selectedPhotoFile && !photoBase64Data) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = 'Please select or drag-and-drop an image.';
        return;
      }

      const title = document.getElementById('photo-title').value.trim();
      const rating = parseFloat(ratingInput.value);
      const album = document.getElementById('photo-album').value;

      progressBar.classList.remove('hidden');
      progressFill.style.width = '30%';

      try {
        let imageUrl = photoBase64Data;
        let storagePath = '';

        if (isFirebaseConfigured && storage && selectedPhotoFile) {
          progressFill.style.width = '60%';
          storagePath = `gallery/${Date.now()}_${selectedPhotoFile.name}`;
          const storageRef = ref(storage, storagePath);
          const result = await uploadBytes(storageRef, selectedPhotoFile);
          imageUrl = await getDownloadURL(result.ref);
        }

        progressFill.style.width = '85%';

        const newPhoto = {
          title,
          rating,
          album,
          imageUrl,
          storagePath,
          createdAt: new Date().toISOString()
        };

        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, "gallery_photos"), newPhoto);
        } else {
          newPhoto.id = 'photo_' + Date.now();
          let local = JSON.parse(localStorage.getItem('zim_published_photos') || '[]');
          local.unshift(newPhoto);
          localStorage.setItem('zim_published_photos', JSON.stringify(local));
        }

        progressFill.style.width = '100%';
        statusMsg.className = 'status-msg success';
        statusMsg.textContent = `Published "${title}" successfully!`;

        setTimeout(() => {
          uploadForm.reset();
          if (removeImgBtn) removeImgBtn.click();
          progressBar.classList.add('hidden');
          progressFill.style.width = '0%';
          loadPhotosAndTrash();
        }, 1200);
      } catch (err) {
        console.error(err);
        progressBar.classList.add('hidden');
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = `Upload failed: ${err.message}`;
      }
    });
  }

  // Project Form Listeners
  if (projectImgInput) {
    projectImgInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) selectedProjectFile = e.target.files[0];
    });
  }

  if (resetProjectBtn) {
    resetProjectBtn.addEventListener('click', () => {
      projectForm.reset();
      document.getElementById('project-id').value = '';
    });
  }

  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusMsg = document.getElementById('project-status-msg');
      statusMsg.textContent = 'Saving project...';
      statusMsg.className = 'status-msg';

      const pid = document.getElementById('project-id').value;
      const title = document.getElementById('project-title').value.trim();
      const category = document.getElementById('project-category').value;
      const shortDescription = document.getElementById('project-short-desc').value.trim();
      const fullDescription = document.getElementById('project-full-desc').value.trim();
      const technologies = document.getElementById('project-tech').value.split(',').map(t => t.trim()).filter(Boolean);
      const displayOrder = parseInt(document.getElementById('project-order').value) || 1;
      const githubUrl = document.getElementById('project-github').value.trim();
      const liveUrl = document.getElementById('project-live').value.trim();
      const featured = document.getElementById('project-featured').checked;

      const cadSpecs = {
        software: document.getElementById('cad-software').value.trim(),
        format: document.getElementById('cad-format').value.trim(),
        materials: document.getElementById('cad-materials').value.trim(),
        weight: document.getElementById('cad-weight').value.trim()
      };

      try {
        let imageUrl = '';
        if (selectedProjectFile) {
          if (isFirebaseConfigured && storage) {
            const sRef = ref(storage, `projects/${Date.now()}_${selectedProjectFile.name}`);
            const res = await uploadBytes(sRef, selectedProjectFile);
            imageUrl = await getDownloadURL(res.ref);
          } else {
            imageUrl = await fileToBase64(selectedProjectFile);
          }
        }

        const projectData = {
          title,
          category,
          shortDescription,
          fullDescription,
          technologies,
          displayOrder,
          githubUrl,
          liveUrl,
          featured,
          cadSpecs,
          updatedAt: new Date().toISOString()
        };
        if (imageUrl) projectData.imageUrl = imageUrl;

        if (isFirebaseConfigured && db) {
          if (pid) {
            await updateDoc(doc(db, "projects", pid), projectData);
          } else {
            projectData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "projects"), projectData);
          }
        } else {
          let projects = JSON.parse(localStorage.getItem('zim_projects') || '[]');
          if (pid) {
            projects = projects.map(p => p.id === pid ? { ...p, ...projectData } : p);
          } else {
            projectData.id = 'proj_' + Date.now();
            projects.unshift(projectData);
          }
          localStorage.setItem('zim_projects', JSON.stringify(projects));
        }

        statusMsg.className = 'status-msg success';
        statusMsg.textContent = 'Project saved successfully!';
        projectForm.reset();
        document.getElementById('project-id').value = '';
        selectedProjectFile = null;
        loadProjects();
      } catch (err) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = `Error saving project: ${err.message}`;
      }
    });
  }

  // Profile Form Listeners
  if (profileImgInput) {
    profileImgInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) selectedProfileImageFile = e.target.files[0];
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusMsg = document.getElementById('profile-status-msg');
      statusMsg.className = 'status-msg';
      statusMsg.textContent = 'Saving profile...';

      let profileImageUrl = '';
      if (selectedProfileImageFile) {
        if (isFirebaseConfigured && storage) {
          const sRef = ref(storage, `profile/avatar_${Date.now()}`);
          const res = await uploadBytes(sRef, selectedProfileImageFile);
          profileImageUrl = await getDownloadURL(res.ref);
        } else {
          profileImageUrl = await fileToBase64(selectedProfileImageFile);
        }
      }

      const profileObj = {
        fullName: document.getElementById('profile-name').value.trim(),
        tagline: document.getElementById('profile-tagline').value.trim(),
        heroTitleLine1: document.getElementById('hero-title-1').value.trim(),
        heroTitleLine2: document.getElementById('hero-title-2').value.trim(),
        heroDescription: document.getElementById('hero-description').value.trim(),
        aboutText: document.getElementById('about-text').value.trim(),
        quoteText: document.getElementById('quote-text').value.trim(),
        contactPhone: document.getElementById('profile-phone').value.trim(),
        contactEmail: document.getElementById('profile-email').value.trim(),
        contactLocation: document.getElementById('profile-location').value.trim(),
        resumeUrl: document.getElementById('profile-resume').value.trim(),
        socialLinks: {
          linkedin: document.getElementById('social-linkedin').value.trim(),
          facebook: document.getElementById('social-facebook').value.trim(),
          twitter: document.getElementById('social-twitter').value.trim(),
          instagram: document.getElementById('social-instagram').value.trim()
        },
        updatedAt: new Date().toISOString()
      };
      if (profileImageUrl) profileObj.profileImageUrl = profileImageUrl;

      try {
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, "profile", "main"), profileObj, { merge: true });
        } else {
          localStorage.setItem('zim_profile_data', JSON.stringify(profileObj));
        }

        statusMsg.className = 'status-msg success';
        statusMsg.textContent = 'Profile updated successfully!';
      } catch (err) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = `Failed to save profile: ${err.message}`;
      }
    });
  }

  // Experience Form Submit
  if (expForm) {
    expForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const expData = {
        role: document.getElementById('exp-role').value.trim(),
        company: document.getElementById('exp-company').value.trim(),
        startDate: document.getElementById('exp-start').value.trim(),
        endDate: document.getElementById('exp-end').value.trim(),
        displayOrder: parseInt(document.getElementById('exp-order').value) || 1,
        description: document.getElementById('exp-desc').value.trim()
      };

      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, "experience"), expData);
      } else {
        expData.id = 'exp_' + Date.now();
        let list = JSON.parse(localStorage.getItem('zim_experience') || '[]');
        list.push(expData);
        localStorage.setItem('zim_experience', JSON.stringify(list));
      }
      expForm.reset();
      loadExperienceAndEducation();
    });
  }

  // Education Form Submit
  if (eduForm) {
    eduForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eduData = {
        degree: document.getElementById('edu-degree').value.trim(),
        institution: document.getElementById('edu-institution').value.trim(),
        startDate: document.getElementById('edu-start').value.trim(),
        endDate: document.getElementById('edu-end').value.trim(),
        displayOrder: parseInt(document.getElementById('edu-order').value) || 1,
        details: document.getElementById('edu-details').value.trim()
      };

      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, "education"), eduData);
      } else {
        eduData.id = 'edu_' + Date.now();
        let list = JSON.parse(localStorage.getItem('zim_education') || '[]');
        list.push(eduData);
        localStorage.setItem('zim_education', JSON.stringify(list));
      }
      eduForm.reset();
      loadExperienceAndEducation();
    });
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
