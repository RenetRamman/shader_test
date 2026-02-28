import { glider_gun, gosper_glider_gun } from "./patterns.js";

console.log(gosper_glider_gun);

var renderer,
  vshader,
  fshader,
  camera,
  scene,
  bufferScene,
  mesh,
  deltaTime,
  timeSinceStart,
  zoom;

var paint = false;
var paused = false;
var nextFrameRequested = false;
var frameReady = true;
var framerate = 61;
var lastFrameTime = 0;
var images = Array();
var shaders = {
  vertexShader: "shaders/vertex.vert",
  fragmentShader: "shaders/game_of_life.frag",
  bufferShader: "shaders/buffer.frag",
  image: "christmas.jpg", // TODO: add option to easily change input image
};
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const uniforms = {
  u_texture: {
    value: null,
  },
  u_resolution: { value: null },
  u_image_resolution: { value: null },
  u_time: { value: 0.0 },
  u_mouse: { value: { x: 0, y: 0 } },
  u_zoom: { value: 1.0 },
  u_brush_size: { value: null },
  u_grid_enable: { value: false },
  u_paint: { value: paint },
  u_pattern: { value: null },
};
var loader = new THREE.FileLoader();
var texLoader = new THREE.TextureLoader();
texLoader.setPath("/images/");

// Hamburger menu stuff
const menuButton = document.getElementById("menuButton");
const menuPanel = document.getElementById("menuPanel");
const pauseText = document.getElementById("pauseAdditional");
const framerateText = document.getElementById("fpsText");

menuButton.addEventListener("click", () => {
  menuPanel.style.display =
    menuPanel.style.display === "block" ? "none" : "block";
});
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target)) {
    menuPanel.style.display = "none";
  }
});

function doPause() {
  paused = !paused;
  pauseToggle.checked = !pauseToggle.checked;
  pauseText.style.display =
    pauseText.style.display === "block" ? "none" : "block";
}

window.addEventListener("keydown", (e) => {
  if (e.key === "n") nextFrameRequested = true;
  else if (e.key === " ") doPause();
});

window.addEventListener("mousedown", () => {
  uniforms.u_paint.value = true;
});

window.addEventListener("mouseup", () => {
  uniforms.u_paint.value = false;
});

// Control hooks
const zoomSlider = document.getElementById("zoomSlider");
const brushSlider = document.getElementById("brushSlider");
const speedSlider = document.getElementById("speedSlider");
const pauseToggle = document.getElementById("pauseToggle");
const gridToggle = document.getElementById("gridToggle");
const imageSelect = document.getElementById("imageSelect");

async function init() {
  var files_loaded = 0;

  function continueIfReady(files, count) {
    count += 1;
    if (count === Object.keys(files).length) {
      finishShaderLoading();
    }
    return count;
  }

  // TODO: Refac this mess. Add loader or file type to dict
  for (let [shader, value] of Object.entries(shaders)) {
    if (shader != "image") {
      await loader.load(value, function (data) {
        shaders[shader] = data;
        files_loaded = continueIfReady(shaders, files_loaded);
      });
    } else {
      await texLoader.load(value, function (data) {
        shaders[shader] = data;
        files_loaded = continueIfReady(shaders, files_loaded);
      });
    }
  }
}

init();

function finishShaderLoading() {
  timeSinceStart = 0.0;
  zoom = 1.0;
  const canvas = document.getElementById("c");
  renderer = new THREE.WebGLRenderer({ canvas });

  scene = new THREE.Scene();
  bufferScene = new THREE.Scene();

  const geometry = new THREE.PlaneGeometry(2, 2);

  const resolution = new THREE.Vector3(
    sizes.width,
    sizes.height,
    window.devicePixelRatio,
  );

  const imageResolution = new THREE.Vector2(
    shaders.image.image.width,
    shaders.image.image.height,
  );

  var renderBufferA = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    stencilBuffer: false,
  });

  var renderBufferB = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    stencilBuffer: false,
  });

  uniforms.u_texture.value = shaders.image;
  uniforms.u_resolution.value = resolution;
  uniforms.u_image_resolution.value = imageResolution;
  uniforms.u_brush_size.value = brushSlider.value;
  uniforms.u_pattern.value = gosper_glider_gun;

  const bufferMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shaders.vertexShader,
    fragmentShader: shaders.bufferShader,
  });

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shaders.vertexShader,
    fragmentShader: shaders.fragmentShader,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const bufferMesh = new THREE.Mesh(geometry, bufferMaterial);
  bufferScene.add(bufferMesh);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;
  renderer.setSize(window.innerWidth, window.innerHeight);
  const clock = new THREE.Clock();

  onWindowResize();
  if ("ontouchstart" in window) {
    document.addEventListener("touchmove", move);
  } else {
    window.addEventListener("resize", onWindowResize, false);
    document.addEventListener("mousemove", move);
    document.addEventListener("wheel", handleWheel);
  }

  function doZoom(evt) {
    if (evt.deltaY < 0 && zoom >= 0.1) {
      zoom = Number((zoom - parseFloat(zoomSlider.step)).toFixed(3));
    } else if (evt.deltaY > 0 && zoom < 1) {
      zoom = Number((zoom + parseFloat(zoomSlider.step)).toFixed(3));
    }
    material.uniforms.u_zoom.value = zoom;
    bufferMaterial.uniforms.u_zoom.value = zoom;
  }

  function resizeBrush(evt) {
    var brushSize = Number(brushSlider.value);
    if (evt.deltaY < 0 && brushSize > brushSlider.min) {
      brushSize = brushSize - Number(brushSlider.step);
    } else if (evt.deltaY > 0 && brushSize < brushSlider.max) {
      brushSize = brushSize + Number(brushSlider.step);
    }
    uniforms.u_brush_size.value = brushSize;
    brushSlider.value = brushSize;
  }

  function handleWheel(evt) {
    evt.preventDefault();
    if (evt.shiftKey) resizeBrush(evt);
    else doZoom(evt);
  }

  function move(evt) {
    material.uniforms.u_mouse.value.x = evt.touches
      ? evt.touches[0].clientX
      : evt.clientX;
    material.uniforms.u_mouse.value.y = evt.touches
      ? evt.touches[0].clientY
      : resolution.y - evt.clientY;
    bufferMaterial.uniforms.u_mouse.value.x = evt.touches
      ? evt.touches[0].clientX
      : evt.clientX;
    bufferMaterial.uniforms.u_mouse.value.y = evt.touches
      ? evt.touches[0].clientY
      : resolution.y - evt.clientY;
    return;
  }

  zoomSlider.addEventListener("input", (e) => {
    zoom = parseFloat(e.target.value);
    uniforms.u_zoom.value = zoom;
  });

  brushSlider.addEventListener("input", (e) => {
    uniforms.u_brush_size.value = parseFloat(e.target.value);
  });

  speedSlider.addEventListener("input", (e) => {
    framerate = parseFloat(e.target.value);
    framerateText.textContent = framerate != 61 ? framerate : "INF";
  });

  pauseToggle.addEventListener("change", (e) => {
    paused = e.target.checked;
    pauseText.style.display =
      pauseText.style.display === "block" ? "none" : "block";
  });

  gridToggle.addEventListener("change", (e) => {
    uniforms.u_grid_enable.value = e.target.checked;
  });

  imageSelect.addEventListener("change", (e) => {
    const selectedImage = e.target.value;
    texLoader.load(selectedImage, function (data) {
      data.minFilter = THREE.NearestFilter;
      data.magFilter = THREE.NearestFilter;
      frameReady = false;
      uniforms.u_texture.value = data;
      uniforms.u_time.value = 0.0;
      timeSinceStart = 0;
    });
  });

  animate();

  // FIXME: This messes up the simulation
  function onWindowResize(event) {
    console.log(renderer.context.drawingBufferWidth);
    console.log(window.innerWidth);
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);
    uniforms.u_resolution.value.x = sizes.width;
    uniforms.u_resolution.value.y = sizes.height;
  }

  function animate() {
    zoomSlider.value = zoom;
    frameReady = framerate === 61 ? true : 1 / framerate <= lastFrameTime;
    deltaTime = clock.getDelta();
    if ((!paused && frameReady) || nextFrameRequested) {
      renderer.setRenderTarget(renderBufferA);
      renderer.render(bufferScene, camera);
      mesh.material.uniforms.u_texture.value = renderBufferA.texture;

      // ping-pong buffering
      const temp = renderBufferA;
      renderBufferA = renderBufferB;
      renderBufferB = temp;
      bufferMaterial.uniforms.u_texture.value = renderBufferB.texture;
      nextFrameRequested = false;
      lastFrameTime = 0;
    }
    lastFrameTime += deltaTime;

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
    timeSinceStart += deltaTime;
    material.uniforms.u_time.value = timeSinceStart;
    bufferMaterial.uniforms.u_time.value = timeSinceStart;
    // console.log(mesh.material.uniforms.u_time.value);
    // console.log(mesh.material.uniforms.u_mouse.value);
    // console.log(mesh.material.uniforms.u_resolution);

    // console.log(uniforms.u_mouse.value);
  }
}
