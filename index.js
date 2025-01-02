import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

new OrbitControls(camera, renderer.domElement);

const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, 12);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/earth.jpg"),
});
const earthMesh = new THREE.Mesh(geometry, material);
scene.add(earthMesh);

const hemilight = new THREE.HemisphereLight(0xffffff, 0x444444);
scene.add(hemilight);

const dummy = new THREE.Object3D();
const markerPositions = [];
const markerNames = []; // To store strArea values

const markerGeometry = new THREE.SphereGeometry(0.1, 32, 32);
const markerMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
});
const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, 100);
scene.add(markers);

fetch("./data/areas.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const areas = data.areas;
    if (!Array.isArray(areas)) {
      throw new Error("Areas property is not an array.");
    }

    areas.forEach((area, i) => {
      const x = parseFloat(area.X);
      const y = parseFloat(area.Y);
      const z = parseFloat(area.Z);

      dummy.position.set(x, y, z).normalize().multiplyScalar(1.05);
      dummy.updateMatrix();
      markers.setMatrixAt(i, dummy.matrix);

      markerPositions.push(dummy.position.clone());
      markerNames.push(area.strArea); // Save strArea
    });

    markers.instanceMatrix.needsUpdate = true;
    markerGeometry.computeBoundingBox();
    markerGeometry.computeBoundingSphere();
    markers.updateMatrixWorld(true);
  })
  .catch((error) => console.error("Error loading JSON:", error));

const sidebar = document.createElement("div");
sidebar.style.position = "fixed";
sidebar.style.right = "0";
sidebar.style.top = "0";
sidebar.style.width = "300px";
sidebar.style.height = "100%";
sidebar.style.background = "rgba(0, 0, 0, 0.8)";
sidebar.style.color = "white";
sidebar.style.padding = "20px";
sidebar.style.display = "none";
sidebar.style.overflow = "auto";
sidebar.innerHTML = "<h2>Marker Details</h2><div id='marker-details'></div>";
document.body.appendChild(sidebar);

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

raycaster.params.Points = { threshold: 1 };

 window.addEventListener("pointerdown", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersection = raycaster.intersectObject( markers );

  if (intersection.length > 0) {
    const iid = intersection[0].instanceId;
    const areaName = markerNames[iid];
    const position = markerPositions[iid];
    sidebar.innerHTML = `Area: <b>${areaName}</b><br>ID: <b>${iid}</b><br>Position: <b>${position
      .toArray()
      .join(", ")}</b>`;
    sidebar.style.display = "block";
  } else {
    console.log("No intersection detected");
  }
}); 
 

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", handleWindowResize);

console.log(markerGeometry);
