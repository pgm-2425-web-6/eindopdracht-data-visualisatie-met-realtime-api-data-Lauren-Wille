import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

// <EARTH>
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);

const container = document.getElementById('threejs-container'); // Get the div by ID
container.appendChild(renderer.domElement); // Append the renderer to the div

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
import { GLTFLoader } from 'GLTFLoader';

const glftLoader = new GLTFLoader();
const markersMap = new Map();

let markerId = 0;

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

    glftLoader.load("./assets/fork.gltf", (gltf) => {
      const markerTemplate = gltf.scene;
    
      markerTemplate.scale.set(0.015, 0.015, 0.015);
    
      areas.forEach((area) => {
        const x = parseFloat(area.X);
        const y = parseFloat(area.Y);
        const z = parseFloat(area.Z);
    
        const marker = markerTemplate.clone();
    
        const position = new THREE.Vector3(x, y, z).normalize().multiplyScalar(1.10);
    
        if (!marker.position) {
          marker.traverse((child) => {
            if (child.isMesh) {
              child.position.copy(position);
            }
          });
        } else {
          marker.position.copy(position);
        }
    
        const normal = position.clone().normalize();

        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const correctionQuaternion = new THREE.Quaternion();
        correctionQuaternion.setFromEuler(new THREE.Euler(Math.PI/1.2, 0, 0)); 
        quaternion.multiply(correctionQuaternion);

        marker.quaternion.copy(quaternion);
    
        marker.country = area.strArea;

        marker.markerid = `marker-${markerId++}`;
    
        scene.add(marker);
    
        markersMap.set(marker, area.strArea);

         const markerElement = document.createElement("div");
          markerElement.id = marker.markerid; // Assign the same ID as the marker
          markerElement.className = "marker-dom";
          markerElement.style.position = "absolute";

          document.body.appendChild(markerElement);

          // Position the DOM element over the marker
          const canvasBounds = renderer.domElement.getBoundingClientRect();
          const screenPosition = marker.position.clone().project(camera);
          markerElement.style.left = `${(screenPosition.x * 0.5 + 0.5) * canvasBounds.width}px`;
          markerElement.style.top = `${(-screenPosition.y * 0.5 + 0.5) * canvasBounds.height}px`;
      });
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
  "<div class='buttons'> <button class='print-btn' id='print-btn'><img src='images/print.svg' alt='print'></button><button class='close-btn' id='close-btn'>X</button></div> <div class='details' id='details'></div>";
document.body.appendChild(sidebar);

let isFirstTimeSidebarOpened = true;

async function onDocumentMouseDown(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    let clickedObject = intersects[0].object;

    while (clickedObject && !clickedObject.country) {
      clickedObject = clickedObject.parent;
    }

    const country = clickedObject ? clickedObject.country : null;

    if (country) {
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

        const mealId = areaData.meals[0].idMeal;

        const mealResponse = await fetch(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
        );

        if (!mealResponse.ok) {
          throw new Error(`HTTP error! status: ${mealResponse.status}`);
        }

        const mealData = await mealResponse.json();

        const recipe = mealData.meals[0];

        const image = recipe.strMealThumb;
        const instructions = recipe.strInstructions.replace(/\r\n/g, "<br>");
        const name = recipe.strMeal;
        const ingredients = [];
        const flag = `images/${country}.png`;

        for (let i = 1; i <= 20; i++) {
          const ingredient = recipe[`strIngredient${i}`];
          const measure = recipe[`strMeasure${i}`];

          if (ingredient && ingredient.trim() !== "") {
            ingredients.push(`<li>${measure} ${ingredient}</li>`);
          }
        }

        document.getElementById("details").innerHTML = `
          <div class="content">
            <div class="sidebar_heading">
              <div class="heading_top">
                <img src="${flag}" alt="${country}" class="flagImage">
                <h2>${name}</h2>
              </div>
              <a class="audio-icon" id="audio-icon">
                Say hello: <img src="./images/audio.png" alt="Play Audio">
              </a>
            </div>
            <div class="image-container">
              <img src="${image}" alt="${name}" class="mealImage">
            </div>
            <div id="info-recipe">
              <h4>Ingredients</h4>
              <ul class="ingredients">
                ${ingredients.join("")}
              </ul>
              <h4>Recipe</h4>
              <p>${instructions}</p>
            </div>
          </div>
        `;

        const audioIcon = document.getElementById("audio-icon");
        if (audioIcon) {
          audioIcon.addEventListener("click", () => audioFunction(country));
        }

        // Start the sidebar tour only once
        if (isFirstTimeSidebarOpened) {
          sidebarDriving();
          isFirstTimeSidebarOpened = false;  
        }

      } catch (error) {
        document.getElementById("details").innerHTML = `
          <h2>Error</h2>
          <p>Could not load recipe for ${clickedObject.country}.</p>
        `;
      }
    }
  }
};

const sidebarDriving = () => {
  const sidebarDriver = driver({
    steps: [
      {element: '#info-recipe', popover: {title: 'Start cooking', description: 'Here are the ingredients and recipe.', side: "bottom", align: 'start'}},
      {element: '#print-btn', popover: {title: 'Print it', description: 'Save the recipe for later and print it.', side: "bottom", align: 'start'}},
      {element: '#audio-icon', popover: {title: 'Learn the language', description: 'Click this button to learn how to say "hello" in this country!', side: "bottom", align: 'start'}},
    ]
  });

  //sidebarDriver.drive();
}

document.addEventListener("mousedown", onDocumentMouseDown);

const closebutton = document.getElementById("close-btn");
closebutton.addEventListener("click", () => {
  if (sidebar.style.display === "block") {  // Use '===' for comparison
    sidebar.style.display = "none";
    document.getElementById("details").innerHTML = "";  // Clear details on close
  }
});


document.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  let hoveringFork = false;

  // Check if the mouse is hovering over a fork marker
  for (let i = 0; i < intersects.length; i++) {
    let intersectedObject = intersects[i].object;

    // Traverse up the object hierarchy to find the marker
    while (intersectedObject && !intersectedObject.country) {
      intersectedObject = intersectedObject.parent;
    }

    if (intersectedObject && intersectedObject.country) {
      hoveringFork = true;
      break;
    }
  }

  // Change the cursor based on hover state
  if (hoveringFork) {
    document.body.style.cursor = "pointer";  // Cursor when hovering over a fork
  } else {
    document.body.style.cursor = "default";  // Default cursor
  }
});

// </INTERACTION>

 // </AUTO ROTATE>
let clock = new THREE.Clock();

let globalUniforms = {
  time: { value: 0 },
};

let controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 5;
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed *= 0.25;

const globeElement = renderer.domElement;

globeElement.addEventListener("mouseenter", () => {
  controls.autoRotate = false;
});

globeElement.addEventListener("mouseleave", () => {
  controls.autoRotate = true;
});

renderer.setAnimationLoop(() => {
  let t = clock.getElapsedTime();
  globalUniforms.time.value = t;
  controls.update();
  renderer.render(scene, camera);
});
// </AUTO ROTATE>


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

// </PRINT>
document.getElementById("print-btn").addEventListener("click", () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.media = 'print';

  style.innerHTML = `
    @page {
      size: landscape;
    }
  `;

  document.head.appendChild(style);

  window.print();

  document.head.removeChild(style);
});
// </PRINT>

// <AUDIO>
function audioFunction(country) {
  const audioPath = `./audio/${country}.mp3`;

  const audio = new Audio(audioPath);

  audio
    .play()
    .then(() => {
      console.log(`Playing audio for ${country}`);
    })
    .catch((error) => {
      console.error(`Failed to play audio for ${country}:`, error);
    });
}
// </AUDIO>
