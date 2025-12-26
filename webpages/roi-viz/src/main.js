import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import metaData from './assets/datasets/mni/metaData.js'
import regionsMetaData from './assets/datasets/mni/bna/19roiAtlasMetaData.js'

/* ------------------------------------------------------------------
   BASIC THREE SETUP
------------------------------------------------------------------ */

const canvas = document.getElementById("c");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.up.set(0, 0, 1);

const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(141, -141, 90);
controls.update();

/* ------------------------------------------------------------------
   LIGHTING AND HELPERS
------------------------------------------------------------------ */

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(1, 1, 1);
scene.add(light);

scene.add(new THREE.AxesHelper(100));

/* ------------------------------------------------------------------
   LOADERS & MATERIALS
------------------------------------------------------------------ */

const loader = new PLYLoader();
const loadedObjects = [];
const atlasGroup = new THREE.Group();
scene.add(atlasGroup);
const roiGroup = new THREE.Group();
scene.add(roiGroup);

const brainMaterial = new THREE.MeshStandardMaterial({
  color: 0xe0e0e0,
  transparent: true,   
  opacity: 0.25, // 0.15
  depthWrite: false,   
  roughness: 0.8,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const roiBaseMaterial = new THREE.MeshStandardMaterial({
  transparent: true,
  color: 0xff0000,
  opacity: 0.80,
  side: THREE.DoubleSide,
  depthWrite: true
});
//roiBaseMaterial.emissive = new THREE.Color(0x330000); // Slight emissive glow on ROIs

const roiLabelsMaterial = new THREE.LineBasicMaterial({
  transparent: true,
  color: 0x000000,
  opacity: 0.80,
  side: THREE.DoubleSide
});

const atlasRegionMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.35,
  emissive: new THREE.Color(0x000000),
  depthWrite: true
})

const selectRegionMaterial = new THREE.MeshStandardMaterial({
  color: '#57db0a',
  transparent: true,
  opacity: 0.35,
  emissive: new THREE.Color('#fbf8f8'),
  depthWrite: true
})

const select = document.getElementById("datasetSelect")
select.addEventListener("change", e => {
  loadDataset(e.target.value);
});

// initial load
loadDataset(select.value);

/* ------------------------------------------------------------------
   RAY CASTING / HOVERING / INTERACTING
------------------------------------------------------------------ */

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const tooltip = document.getElementById("tooltip");
let hoveredMesh = null;

// Hover
renderer.domElement.addEventListener("mousemove", (event) => {
  const hits = getIntersections(event, atlasGroup.children);

  if (hits.length > 0) {
    const mesh = hits[0].object;

    if (hoveredMesh !== mesh ) { // New hit
      if (hoveredMesh && (hoveredMesh !== selectedMesh || selectedMesh === null)) { // Restore previous hover
        hoveredMesh.material.emissive.copy(
          hoveredMesh.userData.baseEmissive
        );
      }

      hoveredMesh = mesh;
       if (hoveredMesh !== selectedMesh){ // Apply hover highlight (unless selected)
        hoveredMesh.material.emissive?.set('#fbf8f8');
      }
    }

    tooltip.style.display = "block";
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    const r = mesh.userData;
    tooltip.innerHTML = `
      <b>${r.gyrus ?? ""}</b><br/>
      ${r.desc ?? ""}<br/>
      <small>${r.atlas ?? ""}</small>
    `;
  } else { // No hit
    tooltip.style.display = "none";

    if (hoveredMesh && (hoveredMesh !== selectedMesh || selectedMesh === null)) { // Restore previous hover
      hoveredMesh.material.emissive.copy(
        hoveredMesh.userData.baseEmissive
      ); 
    }

    hoveredMesh = null;
  }
});

// Click
let selectedMesh = null;
let restoreMaterial = null;

renderer.domElement.addEventListener("click", (event) => {
  const hits = getIntersections(event, atlasGroup.children);

  if (!hits.length) return;

  const mesh = hits[0].object;

  // Clicking the same region → unselect
  if (selectedMesh === mesh) {
    mesh.material.color.copy(mesh.userData.baseColor);
    mesh.material.emissive.copy(mesh.userData.baseEmissive);

    selectedMesh = null;

    clearRegionPanel();   
    return;
  }  

  // Restore previous object material
  if (selectedMesh) { 
    selectedMesh.material.color.copy(
      selectedMesh.userData.baseColor
    );
    selectedMesh.material.emissive.copy(
      selectedMesh.userData.baseEmissive
    );
  }

  selectedMesh = mesh; // New select

  selectedMesh.material.color.set('#ffffff');
  selectedMesh.material.emissive.set('#fbf8f8');

  showRegionPanel(mesh.userData);
});

/* ------------------------------------------------------------------
   UTILITIES
------------------------------------------------------------------ */

function getIntersections(event, objects) {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(objects, true);
}

function showRegionPanel(region) {
  const panel = document.getElementById("region-panel");
  const hemi = region.desc.split(" ")[0] === "R" ? "Right": (region.desc.split(" ")[0] === "L" ? "Left": "Undefined");

  panel.innerHTML = `
    <h3>${region.gyrus}</h3>
    <p>${region.desc}</p>
    <ul>
      <li><b>Atlas:</b> Brainnetome Atlas</li>
      <li><b>ID:</b> ${region.id}</li>
      <li><b>Hemisphere:</b> ${hemi}</li>
    </ul>
  `;
}

async function verifyFile(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    console.log(`File exists! First 5 lines:\n${text.split("\n").slice(0,5).join("\n")}`);
    return true;
  } catch (err) {
    console.error("File not found or cannot be read:", err);
    return false;
  }
}

// Scene Management
function clearScene() {
  for (const obj of loadedObjects) {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  loadedObjects.length = 0;
}

function clearRegionPanel() {
  const panel = document.getElementById("region-panel");
  panel.innerHTML = "<small>Click an anatomical region</small>";
}

// Load Functions //TODO: select from the path here
async function loadDataset(datasetRoot) {
  // Clear scene
  clearScene();

  // Load metadata
  loadBrain(metaData.brainURL);

  loadAtlas(`${datasetRoot}/bna`);
  
  metaData.roiURLs.forEach((roiPath, i) => {
    loadROI(roiPath, i, metaData.roiURLs.length);
  });

  loadROILabels(metaData.roiLabelsURL);
  
}

async function loadBrain(brainURL) {
  // --- Brain ---
  loader.load(
    brainURL,
    geometry => {
      geometry.computeVertexNormals();
      const brain = new THREE.Mesh(geometry, brainMaterial);
      brain.name = "brain";
      scene.add(brain);
      loadedObjects.push(brain);
      //brain.renderOrder = 1;
    }
  );
}

async function loadROI(roiURL, index, total) {
  loader.load(
    //new URL(path, import.meta.url),
    roiURL,
    geometry => {
      geometry.computeVertexNormals();
      const roi = new THREE.Mesh(
        geometry,
        roiBaseMaterial.clone()
      );
      roi.material.color.copy(
        hslQualitativeColor((index) / (total - 1)) // twilightNonCyclic rainbowColormap hslQualitativeColor
      );
      roi.name = `ROI_${String(index).padStart(2, '0')}`;
      roi.renderOrder = 0;
      
      roiGroup.add(roi);
      loadedObjects.push(roi);
    }
  );
}

async function loadROILabels(roiLabelsURL){
  loader.load(roiLabelsURL, geometry => {
    geometry.computeVertexNormals();

    const labelsMesh = new THREE.Mesh(geometry, roiLabelsMaterial);
    roiGroup.add(labelsMesh);
    loadedObjects.push(labelsMesh);
    labelsMesh.renderOrder = 0;
  });
}

async function loadAtlas(atlasRoot, atlasName = null) { 

  const total = regionsMetaData.regionsMeta.length;

  regionsMetaData.regionURLs.forEach( (regionURL, i) => {  
    
    if (i >= 300) {
      return;
    }
    const region = regionsMetaData.regionsMeta[i];
    loader.load(
      regionURL, 
      (geometry) => {
        //geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, atlasRegionMaterial.clone());
        mesh.material.color.copy(
          fireColormap(i/total) // winterColormap twilightNonCyclic fireColormap
        );
        mesh.name = `${region.name}: ${region.desc}`;
        mesh.regionID = i;
        mesh.userData = region;
        mesh.userData.name = mesh.userData.gyrus;
        mesh.userData.baseColor = mesh.material.color.clone();
        mesh.userData.baseEmissive = mesh.material.emissive.clone();
        mesh.userData.atlas = atlasName;
        mesh.renderOrder = 1;

        atlasGroup.add(mesh);
      }
    );
  })
}


// Colormaps
function rainbowColormap(t) {
  // t in [0,1]
  const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
  const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
  const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
  return new THREE.Color(r, g, b);
}

function viridisColormap(t) {
  // t in [0,1]
  t = Math.min(1, Math.max(0, t));

  const r =
    0.277727 + 0.105093 * t + 0.585332 * t**2 - 0.444481 * t**3;
  const g =
    0.005407 + 1.404613 * t - 1.703593 * t**2 + 0.745394 * t**3;
  const b =
    0.334099 + 1.384590 * t - 2.058563 * t**2 + 0.750006 * t**3;

  return new THREE.Color(
    Math.min(1, Math.max(0, r)),
    Math.min(1, Math.max(0, g)),
    Math.min(1, Math.max(0, b))
  );
}

function winterColormap(t) {
  // t in [0,1]
  t = Math.max(0, Math.min(1, t));

  const r = 0.0;
  const g = t;
  const b = 1.0 - 0.5 * t;

  return new THREE.Color(r, g, b);
}

function twilightNonCyclic(t) {
  // t in [0, 1]
  // clamp
  t = Math.max(0, Math.min(1, t));

  // Manually chosen anchor points approximating twilight
  // Hue in degrees, Saturation %, Lightness %
  const stops = [
    { t: 0.0, h: 250, s: 60, l: 25 }, // deep blue-purple
    { t: 0.35, h: 200, s: 70, l: 45 }, // cyan-blue
    { t: 0.65, h: 40, s: 80, l: 55 },  // warm yellow-orange
    { t: 1.0, h: 300, s: 60, l: 70 }   // soft magenta-gray
  ];

  // find segment
  let i = 0;
  while (i < stops.length - 1 && t > stops[i + 1].t) i++;

  const a = stops[i];
  const b = stops[i + 1];
  const u = (t - a.t) / (b.t - a.t);

  // interpolate
  const h = a.h + u * (b.h - a.h);
  const s = a.s + u * (b.s - a.s);
  const l = a.l + u * (b.l - a.l);

  const color = new THREE.Color();
  color.setHSL(h / 360, s / 100, l / 100);
  return color;
}

function fireColormap(t) {
  // t in [0,1]
  t = Math.min(Math.max(t, 0), 1);

  let r, g, b;

  if (t < 0.33) {
    // black → red
    r = t / 0.33;
    g = 0;
    b = 0;
  } else if (t < 0.66) {
    // red → yellow
    r = 1;
    g = (t - 0.33) / 0.33;
    b = 0;
  } else {
    // yellow → white
    r = 1;
    g = 1;
    b = (t - 0.66) / 0.34;
  }

  return new THREE.Color(r, g, b);
}

function hslQualitativeColor(t) {
  // Golden angle ensures good separation even for many regions. i is integer
  // t in [0, 1]
  const goldenAngle = 137.508; // degrees

  // Hue in [0, 360)
  const hue = t * 360 //(i * goldenAngle) % 360;

  // Fixed saturation/lightness → stable under lighting & opacity
  const saturation = 0.95; // .55
  const lightness = 0.25;  // .55

  const color = new THREE.Color();
  color.setHSL(hue / 360, saturation, lightness);
  return color;
}

// Three.js Basics
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
