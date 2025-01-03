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

const hemilight = new THREE.HemisphereLight(0xffffff);
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
      marker.country = area.strArea;
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
  "<button class='close-btn' id='close-btn'>X</button><div class='details' id='details'></div>";
document.body.appendChild(sidebar);

window.addEventListener("pointerdown", async (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;

    if (clickedObject.country) {
      sidebar.style.display = "block";

      try {
        const areaResponse = await fetch(
          `https://www.themealdb.com/api/json/v1/1/filter.php?a=${clickedObject.country}`
        );

        if (!areaResponse.ok) {
          throw new Error(`HTTP error! status: ${areaResponse.status}`);
        }

        const areaData = await areaResponse.json();
        if (!areaData.meals || areaData.meals.length === 0) {
          throw new Error(
            `No meals found for country: ${clickedObject.country}`
          );
        }

        const mealId = areaData.meals[2].idMeal;

        const mealResponse = await fetch(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
        );

        if (!mealResponse.ok) {
          throw new Error(`HTTP error! status: ${mealResponse.status}`);
        }

        const mealData = await mealResponse.json();
        const recipe = mealData.meals[0];

        const country = clickedObject.country;
        const image = recipe.strMealThumb;
        const instructions = recipe.strInstructions.replace(/\r\n/g, "<br>");
        const name = recipe.strMeal;
        const ingredients = [];
        const flag = `/images/${country}.png`;

        for (let i = 1; i <= 20; i++) {
          const ingredient = recipe[`strIngredient${i}`];
          const measure = recipe[`strMeasure${i}`];

          if (ingredient && ingredient.trim() !== "") {
            ingredients.push(`<li>${measure} ${ingredient}</li>`);
          }
        }

        document.getElementById("details").innerHTML = `
        <div class="content">
          <div class="heading">
            <img src="${flag}" alt="${country}" class="flagImage">
            <h2>${
              country.charAt(0).toUpperCase() + country.slice(1)
            } recipe</h2>
          </div>
          <h3>${name}</h3>
          <div class="image-container">
            <img src="${image}" alt="${name}" class="mealImage">
          </div>
          <h4>Ingredients</h4>
          <ul class="ingredients">
          ${ingredients.join("")}
          </ul>
          <h4>Recipe</h4>
          ${instructions}
        </div>
        `;
      } catch (error) {
        document.getElementById("details").innerHTML = `
          <h2>Error</h2>
          <p>Could not load recipe for ${clickedObject.country}.</p>
        `;
      }
    }
  }
});

const closebutton = document.getElementById("close-btn");
closebutton.addEventListener("click", () => {
  if ((sidebar.style.display = "block")) {
    sidebar.style.display = "none";

    document.getElementById("details").innerHTML = "";
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
