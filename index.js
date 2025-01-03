import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

// <EARTH>
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
// </EARTH>

// <MARKERS>
const markerPositions = [];
const markerNames = [];

const markerGeometry = new THREE.SphereGeometry(0.01, 12, 12);
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

    areas.forEach((area) => {
      const x = parseFloat(area.X);
      const y = parseFloat(area.Y);
      const z = parseFloat(area.Z);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
        })
      );

      marker.position.set(x, y, z).normalize().multiplyScalar(1.05);
      marker.userData.name = area.strArea;
      scene.add(marker);

      markerPositions.push(marker.position.clone());
      markerNames.push(area.strArea);
    });
  })
  .catch((error) => console.error("Error loading JSON:", error));
// </MARKERS>

// <INTERACTION>
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const sidebar = document.createElement("div");
sidebar.className = "sidebar";
sidebar.innerHTML =
  "<h2>Recipe</h2><button class='close-btn' id='close-btn'>X</button><div class='details' id='details'></div>";
document.body.appendChild(sidebar);

window.addEventListener("pointerdown", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    if (clickedObject.userData.name) {
      console.log("Clicked on marker:", clickedObject.userData.name);
      document.getElementById(
        "details"
      ).innerHTML = `${clickedObject.userData.name} recipe`;
    }
  }
});
// </INTERACTION>

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
