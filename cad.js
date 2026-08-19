// CAD Modeling & Aeronautical Design Interactive Showcase JS
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { isFirebaseConfigured, db, collection, getDocs, query, orderBy } from './firebase-config.js';

// Pre-seeded aeronautical CAD projects
const defaultCadProjects = [
  {
    id: 'cad-1',
    title: 'Aeronautical Wing Rib & Spar Assembly',
    category: 'Aeronautical',
    software: 'SolidWorks 2024',
    format: 'STEP / STL / SLDPRT',
    materials: 'Aluminum 7075-T6',
    weight: '1.42 kg',
    previewImg: './img/img-13.webp',
    stlUrl: '',
    description: 'High-strength structural wing rib designed for high-g loading and minimal structural mass. Optimized through Finite Element Analysis (FEA).'
  },
  {
    id: 'cad-2',
    title: 'Turbine Blade & Compressor Stage Design',
    category: 'Propulsion',
    software: 'ANSYS / SolidWorks',
    format: 'STEP / IGES',
    materials: 'Titanium Ti-6Al-4V',
    weight: '0.88 kg',
    previewImg: './img/img-14.webp',
    stlUrl: '',
    description: 'Aerodynamically contoured axial compressor blade with internal cooling channels for gas turbine propulsion testing.'
  },
  {
    id: 'cad-3',
    title: 'Autonomous UAV Airframe & Avionics Bay',
    category: 'Drone & UAV',
    software: 'Fusion 360',
    format: 'STL / OBJ / STEP',
    materials: 'Carbon Fiber / PETG',
    weight: '2.15 kg',
    previewImg: './img/img-1.webp',
    stlUrl: '',
    description: 'Modular drone chassis featuring integrated vibration damping mounts for flight controller and dual-redundant power distribution.'
  }
];

let allCadProjects = [];
let activeFilter = 'All';
let currentProject = null;

// Three.js 3D Viewer variables
let scene, camera, renderer, controls, currentMesh;
let isWireframe = false;
let isAutoRotate = true;

document.addEventListener('DOMContentLoaded', async () => {
  setupMobileMenu();
  setupFilters();
  await loadCadProjects();
  setup3DModal();
});

async function loadCadProjects() {
  let loaded = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(query(collection(db, "projects"), orderBy("displayOrder", "asc")));
      snap.forEach(d => {
        const item = d.data();
        loaded.push({
          id: d.id,
          title: item.title,
          category: item.category,
          software: (item.cadSpecs && item.cadSpecs.software) || 'SolidWorks',
          format: (item.cadSpecs && item.cadSpecs.format) || 'STEP / STL',
          materials: (item.cadSpecs && item.cadSpecs.materials) || 'Aluminum / Titanium',
          weight: (item.cadSpecs && item.cadSpecs.weight) || 'N/A',
          previewImg: item.imageUrl || './img/img-13.webp',
          description: item.shortDescription || item.fullDescription || ''
        });
      });
    } catch (err) {
      console.warn("Firestore cad query error:", err);
    }
  }

  if (loaded.length === 0) {
    const local = JSON.parse(localStorage.getItem('zim_projects') || '[]');
    if (local.length > 0) {
      loaded = local.map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        software: (item.cadSpecs && item.cadSpecs.software) || 'SolidWorks',
        format: (item.cadSpecs && item.cadSpecs.format) || 'STEP / STL',
        materials: (item.cadSpecs && item.cadSpecs.materials) || 'Aluminum',
        weight: (item.cadSpecs && item.cadSpecs.weight) || 'N/A',
        previewImg: item.imageUrl || './img/img-13.webp',
        description: item.shortDescription || item.fullDescription || ''
      }));
    } else {
      loaded = defaultCadProjects;
    }
  }

  allCadProjects = loaded;
  renderCadProjects();
}

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

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-category');
      renderCadProjects();
    });
  });
}

function renderCadProjects() {
  const grid = document.getElementById('cad-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = activeFilter === 'All' 
    ? allCadProjects 
    : allCadProjects.filter(p => (p.category || '').toLowerCase() === activeFilter.toLowerCase());

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem;">
        No CAD projects found in category "${activeFilter}".
      </div>
    `;
    return;
  }

  filtered.forEach(project => {
    const card = document.createElement('article');
    card.className = 'glass-panel cad-card';
    card.innerHTML = `
      <div class="cad-card-preview">
        <img src="${project.previewImg}" alt="${project.title}" loading="lazy" decoding="async">
        <div class="cad-3d-badge">
          <span>📦</span> 3D Interactive
        </div>
      </div>
      <div class="cad-card-body">
        <span class="project-tag" style="margin-bottom: 0.8rem;">${project.category}</span>
        <h3 class="project-title" style="font-size: 2rem;">${project.title}</h3>
        <p class="project-desc" style="font-size: 1.4rem; margin-bottom: 1rem;">${project.description}</p>
        
        <div class="cad-specs-list">
          <div class="cad-spec-item">
            <span class="cad-spec-label">Software</span>
            <span class="cad-spec-val">${project.software}</span>
          </div>
          <div class="cad-spec-item">
            <span class="cad-spec-label">Format</span>
            <span class="cad-spec-val">${project.format}</span>
          </div>
          <div class="cad-spec-item">
            <span class="cad-spec-label">Material</span>
            <span class="cad-spec-val">${project.materials}</span>
          </div>
          <div class="cad-spec-item">
            <span class="cad-spec-label">Est. Weight</span>
            <span class="cad-spec-val">${project.weight}</span>
          </div>
        </div>

        <div class="cad-actions">
          <button class="cad-btn cad-btn-primary view-3d-btn" data-id="${project.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Interactive 3D View
          </button>
        </div>
      </div>
    `;

    card.querySelector('.view-3d-btn').addEventListener('click', () => open3DModal(project));
    grid.appendChild(card);
  });
}

function setup3DModal() {
  const modal = document.getElementById('cad-modal');
  const closeBtn = document.getElementById('cad-modal-close');
  const wireframeBtn = document.getElementById('tool-wireframe');
  const rotateBtn = document.getElementById('tool-rotate');
  const resetBtn = document.getElementById('tool-reset');

  if (closeBtn) {
    closeBtn.addEventListener('click', close3DModal);
  }

  if (wireframeBtn) {
    wireframeBtn.addEventListener('click', () => {
      isWireframe = !isWireframe;
      wireframeBtn.classList.toggle('active', isWireframe);
      if (currentMesh) {
        currentMesh.material.wireframe = isWireframe;
      }
    });
  }

  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      isAutoRotate = !isAutoRotate;
      rotateBtn.classList.toggle('active', isAutoRotate);
      if (controls) {
        controls.autoRotate = isAutoRotate;
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (controls) {
        controls.reset();
      }
    });
  }
}

function open3DModal(project) {
  currentProject = project;
  const modal = document.getElementById('cad-modal');
  const titleEl = document.getElementById('modal-project-title');
  const softEl = document.getElementById('modal-spec-software');
  const fmtEl = document.getElementById('modal-spec-format');
  const matEl = document.getElementById('modal-spec-material');
  const descEl = document.getElementById('modal-project-desc');

  if (titleEl) titleEl.textContent = project.title;
  if (softEl) softEl.textContent = project.software;
  if (fmtEl) fmtEl.textContent = project.format;
  if (matEl) matEl.textContent = project.materials;
  if (descEl) descEl.textContent = project.description;

  modal.classList.add('active');
  init3DViewer();
}

function close3DModal() {
  const modal = document.getElementById('cad-modal');
  modal.classList.remove('active');
  if (renderer) {
    renderer.dispose();
    const container = document.getElementById('cad-canvas-container');
    if (container) container.innerHTML = '';
  }
}

function init3DViewer() {
  const container = document.getElementById('cad-canvas-container');
  if (!container) return;
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a101b);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(5, 4, 7);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = isAutoRotate;
  controls.autoRotateSpeed = 2.5;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x00e5ff, 2.0);
  dirLight1.position.set(10, 10, 10);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xdc143c, 1.5);
  dirLight2.position.set(-10, -10, -10);
  scene.add(dirLight2);

  // Create 3D Aeronautical CAD Model Geometric Mesh Showcase
  createAeronauticalCADGeometry();

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Responsive resize handler
  window.addEventListener('resize', () => {
    if (!renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function createAeronauticalCADGeometry() {
  // Generate a procedural aeronautical wing/rib CAD structural geometry
  const group = new THREE.Group();

  const mainMaterial = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    metalness: 0.8,
    roughness: 0.2,
    wireframe: isWireframe
  });

  const ribGeometry = new THREE.BoxGeometry(4.5, 0.15, 1.2);
  const mainRib = new THREE.Mesh(ribGeometry, mainMaterial);
  group.add(mainRib);

  // Cylindrical lightening holes (aeronautical structure style)
  const cylinderGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 32);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0xdc143c, metalness: 0.9, roughness: 0.1 });

  for (let x = -1.5; x <= 1.5; x += 1.0) {
    const hole = new THREE.Mesh(cylinderGeo, holeMat);
    hole.position.set(x, 0, 0);
    group.add(hole);
  }

  // Spar attachment caps
  const sparGeo = new THREE.BoxGeometry(0.2, 0.4, 1.4);
  const sparLeft = new THREE.Mesh(sparGeo, mainMaterial);
  sparLeft.position.set(-1.8, 0, 0);
  group.add(sparLeft);

  const sparRight = new THREE.Mesh(sparGeo, mainMaterial);
  sparRight.position.set(1.8, 0, 0);
  group.add(sparRight);

  currentMesh = mainRib;
  scene.add(group);
}
