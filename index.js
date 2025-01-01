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

// Create markers InstancedMesh
const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, 100); // Adjust max count as needed
scene.add(markers);

// Load JSON and create markers
fetch("./data/areas.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const areas = data.areas; // Access the areas array
    if (!Array.isArray(areas)) {
      throw new Error("Areas property is not an array.");
    }

    areas.forEach((area, i) => {
      // Parse the position as numbers
      const x = parseFloat(area.X);
      const y = parseFloat(area.Y);
      const z = parseFloat(area.Z);

      // Set marker position
      dummy.position
        .set(x, y, z)
        .normalize()
        .multiplyScalar(1.05);
      dummy.updateMatrix();
      markers.setMatrixAt(i, dummy.matrix);

      // Save marker position
      markerPositions.push(dummy.position.clone());
    });

    // Mark instance matrix as needing an update
    markers.instanceMatrix.needsUpdate = true;
    console.log("Markers added:", markerPositions);
  })
  .catch((error) => console.error("Error loading JSON:", error));


const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const popup = document.createElement("div");
popup.style.position = "absolute";
popup.style.background = "rgba(0, 0, 0, 0.7)";
popup.style.color = "white";
popup.style.padding = "10px";
popup.style.borderRadius = "5px";
popup.style.display = "none";
popup.style.width = "200px";
popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <span id="popup-content"></span>
        <button id="close-popup" style="background: none; border: none; color: white; cursor: pointer;">X</button>
    </div>
`;

document.body.appendChild(popup);

const closeButton = popup.querySelector("#close-popup");
closeButton.addEventListener("click", () => {
  popup.style.display = "none";
});

window.addEventListener("pointerdown", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(markers);

  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;
    if (instanceId !== undefined) {
      const position = markerPositions[instanceId];
      const content = popup.querySelector("#popup-content");
      content.innerHTML = `
                <strong>Marker Position:</strong><br>
                X: ${position.x.toFixed(2)}<br>
                Y: ${position.y.toFixed(2)}<br>
                Z: ${position.z.toFixed(2)}
            `;
      popup.style.display = "block";
      popup.style.left = `${event.clientX}px`;
      popup.style.top = `${event.clientY - 50}px`;
    }
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
window.addEventListener("resize", handleWindowResize, false);
