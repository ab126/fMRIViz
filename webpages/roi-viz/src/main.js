import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
//import roiFiles from "./roiFiles.js";
import roiFiles from '../public/datasets/mni/roiFiles.js';
//import * as roiFiles from '../public/datasets/mni/roiFiles.js';


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

const brainMaterial = new THREE.MeshStandardMaterial({
  color: 0xe0e0e0,
  transparent: true,   
  opacity: 0.15,
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

const select = document.getElementById("datasetSelect")
select.addEventListener("change", e => {
  loadDataset(e.target.value);
});

// initial load
loadDataset(select.value);

/*
const brainURL = new URL('./brain.ply', import.meta.url);

loader.load(brainURL, geometry => {
  geometry.computeVertexNormals();

  const brainMesh = new THREE.Mesh(geometry, brainMaterial);
  scene.add(brainMesh);
  brainMesh.renderOrder = 0;
});


// Load ROIs
// entries.forEach(([path, url], i) => {
roiFiles.forEach((url, i) => {
  loader.load(
    url,
    geometry => {
      geometry.computeVertexNormals();

      const roi = new THREE.Mesh(geometry, roiBaseMaterial.clone());
      roi.material.color.copy( vedoRainbow(i / (roiFiles.length - 1)) );
      roi.name = `ROI_${String(i).padStart(2, '0')}`;

      scene.add(roi);
      //roi.renderOrder   = 1;
      },
    undefined,
    err => console.error("Failed to load", path, err)
  );
});


// Labels
const labelsURL = new URL('./roi_labels.ply', import.meta.url);

loader.load(labelsURL, geometry => {
  geometry.computeVertexNormals();

  const labelsMesh = new THREE.Mesh(geometry, roiLabelsMaterial);
  scene.add(labelsMesh);
});
*/

/* ------------------------------------------------------------------
   UTILITIES
------------------------------------------------------------------ */

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

// Load Functions
async function loadDataset(datasetRoot) {
  // Clear scene
  clearScene();

  // Load metadata
  /*
  const metaURL2 = new URL(
    //`${datasetRoot}/meta.json`,
    '../public/datasets/mni/meta.json',
    import.meta.url
  );*/
  const metaURL = '/datasets/mni/meta.json';

  //console.log(await fetch(metaURL));
  /*
  const meta = await fetch(metaURL).then(r => {
    console.log(r);
    return r.json();
  });
  */

  loadBrain(`${datasetRoot}/${meta.brain}`);

  //meta.rois.forEach((roiPath, i) => {
  roiFiles.forEach((roiPath, i) => {

    loadROI(`${datasetRoot}/${roiPath}`, i, meta.rois.length);
  });
}

function loadBrain(path) {
  // --- Brain ---
  loader.load(
    new URL(path, import.meta.url),
    geometry => {
      geometry.computeVertexNormals();
      const brain = new THREE.Mesh(geometry, brainMaterial);
      brain.name = "brain";
      scene.add(brain);
      loadedObjects.push(brain);
      //brain.renderOrder = 0;
    }
  );
}

function loadROI(path, index, total) {
  loader.load(
    new URL(path, import.meta.url),
    geometry => {
      geometry.computeVertexNormals();
      const roi = new THREE.Mesh(
        geometry,
        roiBaseMaterial.clone()
      );
      roi.material.color.copy(
        vedoRainbow((index - 1) / (total - 1))
      );
      roi.name = `ROI_${String(i).padStart(2, '0')}`;
      //roi.renderOrder = 1;

      scene.add(roi);
      loadedObjects.push(roi);
    }
  );
}

// TODO: Load Labels

// Vedo-like Rainbow colormap
function vedoRainbow(t) {
  // t in [0,1]
  const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
  const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
  const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
  return new THREE.Color(r, g, b);
}


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
