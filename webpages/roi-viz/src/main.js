import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import metaData from './assets/datasets/mni/metaData.js'
import regionsMeta from './assets/datasets/mni/bna/metaData.js'

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

const atlasRegionMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  transparent: true,
  opacity: 0.35
})

const select = document.getElementById("datasetSelect")
select.addEventListener("change", e => {
  loadDataset(e.target.value);
});

// initial load
loadDataset(select.value);

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

// Load Functions //TODO: select from the path here
async function loadDataset(datasetRoot) {
  // Clear scene
  clearScene();

  // Load metadata
  loadBrain(metaData.brainURL);
  
  metaData.roiURLs.forEach((roiPath, i) => {
    loadROI(roiPath, i, metaData.roiURLs.length);
  });

  loadROILabels(metaData.roiLabelsURL);

  loadAtlas(`${datasetRoot}/bna`);
}

function loadBrain(brainURL) {
  // --- Brain ---
  loader.load(
    brainURL,
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

function loadROI(roiURL, index, total) {
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
        vedoRainbow((index - 1) / (total - 1))
      );
      roi.name = `ROI_${String(index).padStart(2, '0')}`;
      //roi.renderOrder = 1;
      
      roiGroup.add(roi);
      loadedObjects.push(roi);
    }
  );
}

function loadROILabels(roiLabelsURL){
  loader.load(roiLabelsURL, geometry => {
    geometry.computeVertexNormals();

    const labelsMesh = new THREE.Mesh(geometry, roiLabelsMaterial);
    roiGroup.add(labelsMesh);
    loadedObjects.push(labelsMesh);
    //labelsMesh.renderOrder = 1;
  });
}

async function loadAtlas(atlasRoot) { // TODO: Fetch doesnt work, gotta do with exports

  regionsMeta.forEach( (region, i) => {
    loader.load(
      new URL(`./assets/datasets/mni/bna/${region.file}`, import.meta.url), // This dont work either
      (gltf) => {
        const mesh = gltf.scene;
        mesh.name = region.id; //`${region.name}: ${region.desc}`;
        mesh.userData = region;

        mesh.traverse(obj => {
          if (obj.isMesh) {
            obj.material = atlasRegionMaterial.clone();
            obj.material.color.copy(
              vedoRainbow((i - 1) / (regionsMeta.length - 1))
            );
          }
        });

        atlasGroup.add(mesh);
      }
    );
  })
}


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
