import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import sampleROI from "url:./rois/roi_01.ply"

// URLs for import
console.log(import.meta.url);
console.log(location.href);
console.log(sampleROI);

// THREE Basics
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

// Materials
const brainMaterial = new THREE.MeshStandardMaterial({
  color: 0xe0e0e0,
  transparent: true,   // 🔑 required
  opacity: 0.15,
  depthWrite: false,   // 🔑 critical
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

// Load Brain PLY
const loader = new PLYLoader();
const brainURL = new URL('./brain.ply', import.meta.url);

loader.load(brainURL, geometry => {
  geometry.computeVertexNormals();

  const brainMesh = new THREE.Mesh(geometry, brainMaterial);
  scene.add(brainMesh);
  brainMesh.renderOrder = 0;
  });


// Load ROIs
const N_ROIS = 19;

for (let i = 1; i < N_ROIS + 1; i++) {
  const url = new URL(`./rois/roi_${String(i).padStart(2, '0')}.ply`, import.meta.url);
  console.log(url);

  loader.load(url, geometry => {
    geometry.computeVertexNormals();

    const roi = new THREE.Mesh(geometry, roiBaseMaterial.clone());
    roi.material.color.setHSL(i / roiFiles.length, 1.0, 0.5);
    roi.name = `ROI_${i}`;

    scene.add(roi);
    //roi.renderOrder   = 1;
  });
}  

// Helpers and Lighting
scene.add(new THREE.AxesHelper(100));

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(1, 1, 1);
scene.add(light);



// Functions
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
