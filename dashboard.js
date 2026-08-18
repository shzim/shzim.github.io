import { isFirebaseConfigured, auth, db, storage, ref, uploadBytes, getDownloadURL, collection, addDoc, signOut } from './firebase-config.js';

let selectedFile = null;
let imageBase64Data = null;
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

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('zim_admin_auth') !== 'true') {
    window.location.href = 'admin.html';
    return;
  }

  loadAlbums();
  loadPhotosAndTrash();
  setupDashboardControls();
});

function loadAlbums() {
  const customAlbums = JSON.parse(localStorage.getItem('zim_custom_albums') || '[]');
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

window.editAlbumName = function(oldName) {
  const newName = prompt(`Rename folder/album "${oldName}":`, oldName);
  if (!newName || newName.trim() === '' || newName === oldName) return;

  const trimmed = newName.trim();
  albums = albums.map(a => a === oldName ? trimmed : a);

  localStorage.setItem('zim_custom_albums', JSON.stringify(albums));

  let photos = getAllPhotosRaw();
  photos.forEach(p => {
    if (p.album === oldName) p.album = trimmed;
  });
  localStorage.setItem('zim_published_photos', JSON.stringify(photos));

  loadAlbums();
  loadPhotosAndTrash();
};

function getAllPhotosRaw() {
  const localItems = JSON.parse(localStorage.getItem('zim_published_photos') || '[]');
  return localItems.length > 0 ? localItems : defaultPhotos;
}

function loadPhotosAndTrash() {
  let photos = getAllPhotosRaw();
  let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');

  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  const initialTrashCount = trash.length;
  trash = trash.filter(item => {
    const deletedDate = new Date(item.deletedAt || Date.now()).getTime();
    return (now - deletedDate) < ninetyDaysMs;
  });

  if (trash.length !== initialTrashCount) {
    localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
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
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted);">No published photos yet.</div>`;
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
          <button onclick="openEditModal('${p.id}')" class="cta-btn outline-btn" style="padding: 0.6rem 1.2rem; font-size: 1.2rem; flex: 1;">Edit</button>
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
          <div style="color: #ef4444; font-size: 1.2rem; font-weight: 600;">
            ⏳ Auto-deletes in ${remainingDays} days
          </div>
          <span style="color: var(--text-dim); font-size: 1.1rem;">Deleted: ${new Date(item.deletedAt).toLocaleDateString()}</span>
          
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
  if (isChecked) {
    selectedTrashIds.add(id);
  } else {
    selectedTrashIds.delete(id);
  }
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

window.openEditModal = function(id) {
  const photos = getAllPhotosRaw();
  const photo = photos.find(p => p.id === id);
  if (!photo) return;

  document.getElementById('edit-photo-id').value = photo.id;
  document.getElementById('edit-photo-title').value = photo.title;
  document.getElementById('edit-photo-rating').value = photo.rating;
  document.getElementById('edit-rating-value').textContent = `★ ${photo.rating}`;
  document.getElementById('edit-photo-album').value = photo.album;

  document.getElementById('edit-photo-modal').classList.add('active');
};

window.softDeletePhoto = function(id) {
  let photos = getAllPhotosRaw();
  const index = photos.findIndex(p => p.id === id);
  if (index === -1) return;

  const [removed] = photos.splice(index, 1);
  removed.deletedAt = new Date().toISOString();

  let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
  trash.unshift(removed);

  localStorage.setItem('zim_published_photos', JSON.stringify(photos));
  localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
  loadPhotosAndTrash();
};

window.restorePhoto = function(id) {
  let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
  const index = trash.findIndex(t => t.id === id);
  if (index === -1) return;

  const [restored] = trash.splice(index, 1);
  delete restored.deletedAt;

  let photos = getAllPhotosRaw();
  photos.unshift(restored);

  localStorage.setItem('zim_published_photos', JSON.stringify(photos));
  localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
  loadPhotosAndTrash();
};

window.permanentDeletePhoto = function(id) {
  if (!confirm("Permanently delete this photo? This action cannot be undone.")) return;

  let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
  trash = trash.filter(t => t.id !== id);
  localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
  loadPhotosAndTrash();
};

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
  const editPhotoForm = document.getElementById('edit-photo-form');
  const editPhotoClose = document.getElementById('edit-photo-close');
  const editRatingInput = document.getElementById('edit-photo-rating');
  const editRatingValue = document.getElementById('edit-rating-value');
  const statusMsg = document.getElementById('status-message');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressFill = document.getElementById('progress-fill');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('zim_admin_auth');
      if (isFirebaseConfigured && auth) signOut(auth);
      window.location.href = 'admin.html';
    });
  }

  if (openTrashModalBtn && recycleBinModal) {
    openTrashModalBtn.addEventListener('click', () => {
      recycleBinModal.classList.add('active');
    });
  }

  if (recycleBinClose && recycleBinModal) {
    recycleBinClose.addEventListener('click', () => {
      recycleBinModal.classList.remove('active');
    });
  }

  if (recycleBinModal) {
    recycleBinModal.addEventListener('click', (e) => {
      if (e.target === recycleBinModal) recycleBinModal.classList.remove('active');
    });
  }

  if (createAlbumBtn) {
    createAlbumBtn.addEventListener('click', () => {
      const albumName = prompt("Enter new Album / Folder name:");
      if (albumName && albumName.trim() !== '') {
        const trimmed = albumName.trim();
        const customAlbums = JSON.parse(localStorage.getItem('zim_custom_albums') || '[]');
        if (!customAlbums.includes(trimmed)) {
          customAlbums.push(trimmed);
          localStorage.setItem('zim_custom_albums', JSON.stringify(customAlbums));
        }
        loadAlbums();
      }
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
      if (selectedTrashIds.size === trash.length && trash.length > 0) {
        selectedTrashIds.clear();
      } else {
        trash.forEach(t => selectedTrashIds.add(t.id));
      }
      renderTrashGrid(trash);
      updateBulkActionButtons();
    });
  }

  if (restoreSelectedBtn) {
    restoreSelectedBtn.addEventListener('click', () => {
      let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
      let photos = getAllPhotosRaw();

      const toRestore = trash.filter(t => selectedTrashIds.has(t.id));
      trash = trash.filter(t => !selectedTrashIds.has(t.id));

      toRestore.forEach(r => {
        delete r.deletedAt;
        photos.unshift(r);
      });

      localStorage.setItem('zim_published_photos', JSON.stringify(photos));
      localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
      loadPhotosAndTrash();
    });
  }

  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
      if (!confirm(`Permanently delete ${selectedTrashIds.size} selected photos? This action cannot be undone.`)) return;

      let trash = JSON.parse(localStorage.getItem('zim_recycle_bin') || '[]');
      trash = trash.filter(t => !selectedTrashIds.has(t.id));

      localStorage.setItem('zim_recycle_bin', JSON.stringify(trash));
      loadPhotosAndTrash();
    });
  }

  if (emptyTrashBtn) {
    emptyTrashBtn.addEventListener('click', () => {
      if (confirm("Empty all items in Recycle Bin permanently?")) {
        localStorage.removeItem('zim_recycle_bin');
        loadPhotosAndTrash();
      }
    });
  }

  if (editRatingInput) {
    editRatingInput.addEventListener('input', (e) => {
      editRatingValue.textContent = `★ ${parseFloat(e.target.value).toFixed(1)}`;
    });
  }

  if (editPhotoForm) {
    editPhotoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-photo-id').value;
      const title = document.getElementById('edit-photo-title').value.trim();
      const rating = parseFloat(document.getElementById('edit-photo-rating').value);
      const album = document.getElementById('edit-photo-album').value;

      let photos = getAllPhotosRaw();
      const photo = photos.find(p => p.id === id);
      if (photo) {
        photo.title = title;
        photo.rating = rating;
        photo.album = album;
        localStorage.setItem('zim_published_photos', JSON.stringify(photos));
      }

      document.getElementById('edit-photo-modal').classList.remove('active');
      loadPhotosAndTrash();
    });
  }

  if (editPhotoClose) {
    editPhotoClose.addEventListener('click', () => {
      document.getElementById('edit-photo-modal').classList.remove('active');
    });
  }

  // Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  });

  photoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  });

  function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      imageBase64Data = event.target.result;
      imagePreview.src = imageBase64Data;
      dropZoneContent.classList.add('hidden');
      previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  removeImgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    imageBase64Data = null;
    imagePreview.src = '';
    photoInput.value = '';
    previewContainer.classList.add('hidden');
    dropZoneContent.classList.remove('hidden');
  });

  ratingInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ratingValue.textContent = `★ ${val.toFixed(1)}`;
    const starsCount = Math.floor(val);
    starDisplay.textContent = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMsg.className = 'status-msg';
    statusMsg.textContent = '';

    if (!selectedFile && !imageBase64Data) {
      statusMsg.className = 'status-msg error';
      statusMsg.textContent = 'Please select or drag-and-drop an image file.';
      return;
    }

    const title = document.getElementById('photo-title').value.trim();
    const rating = parseFloat(ratingInput.value);
    const album = document.getElementById('photo-album').value;

    progressBar.classList.remove('hidden');
    progressFill.style.width = '30%';

    try {
      let finalImageUrl = imageBase64Data;

      if (isFirebaseConfigured && storage && selectedFile) {
        progressFill.style.width = '60%';
        const storageRef = ref(storage, `gallery_photos/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      progressFill.style.width = '85%';

      const newPhoto = {
        id: 'photo_' + Date.now(),
        title: title,
        rating: rating,
        album: album,
        imageUrl: finalImageUrl,
        createdAt: new Date().toISOString()
      };

      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, "gallery_photos"), newPhoto);
      } else {
        let photos = getAllPhotosRaw();
        photos.unshift(newPhoto);
        localStorage.setItem('zim_published_photos', JSON.stringify(photos));
      }

      progressFill.style.width = '100%';
      statusMsg.className = 'status-msg success';
      statusMsg.textContent = `Successfully published "${title}"!`;

      setTimeout(() => {
        uploadForm.reset();
        removeImgBtn.click();
        progressBar.classList.add('hidden');
        progressFill.style.width = '0%';
        ratingValue.textContent = '★ 5.0';
        starDisplay.textContent = '★★★★★';
        loadPhotosAndTrash();
      }, 1500);

    } catch (err) {
      console.error("Publishing error:", err);
      progressBar.classList.add('hidden');
      statusMsg.className = 'status-msg error';
      statusMsg.textContent = `Upload failed: ${err.message || 'Error publishing photo'}`;
    }
  });
}
