var renderer,
  uniforms,
  vshader,
  fshader,
  camera,
  scene,
  bufferScene,
  mesh,
  deltaTime,
  zoom,
  brushSize;

var paused = false;
var nextFrameRequested = false;
var shaders = {
  vertexShader: "shaders/vertex.vert",
  fragmentShader: "shaders/game_of_life.frag",
  bufferShader: "shaders/buffer.frag",
  image: "images/christmas.jpg", // TODO: add option to easily change input image
};
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
var loader = new THREE.FileLoader();
var texLoader = new THREE.TextureLoader();

// Hamburger menu stuff
const menuButton = document.getElementById("menuButton");
const menuPanel = document.getElementById("menuPanel");
const pauseText = document.getElementById("pauseAdditional");

menuButton.addEventListener("click", () => {
  menuPanel.style.display =
    menuPanel.style.display === "block" ? "none" : "block";
});
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target)) {
    menuPanel.style.display = "none";
  }
});
window.addEventListener("keydown", (e) => {
  if (e.key === "n") nextFrameRequested = true;
});

// Control hooks
const zoomSlider = document.getElementById("zoomSlider");
const brushSlider = document.getElementById("brushSlider");
const pauseToggle = document.getElementById("pauseToggle");

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
  deltaTime = 0.0;
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

  const uniforms = {
    u_texture: {
      value: shaders.image,
    },
    u_resolution: { value: resolution },
    u_time: { value: 0.0 },
    u_mouse: { value: { x: 0, y: 0 } },
    u_zoom: { value: 1.0 },
    u_brush_size: { value: 1.0 },
  };

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
    document.addEventListener("wheel", doZoom);
  }

  // FIXME: inaccurate scroll wheel zoom due to floating point errors.
  // Use integers divided by 10 instead?
  function doZoom(evt) {
    if (evt.deltaY < 0 && zoom >= 0.2) {
      zoom -= 0.1;
    } else if (evt.deltaY > 0 && zoom < 1) {
      zoom += 0.1;
    }
    material.uniforms.u_zoom.value = zoom;
    bufferMaterial.uniforms.u_zoom.value = zoom;
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

  pauseToggle.addEventListener("change", (e) => {
    paused = e.target.checked;
    pauseText.style.display =
      pauseText.style.display === "block" ? "none" : "block";
  });

  animate();

  function onWindowResize(event) {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    material.uniforms.u_resolution.value.x = sizes.width;
    material.uniforms.u_resolution.value.y = sizes.height;
    bufferMaterial.uniforms.u_resolution.value.x = sizes.width;
    bufferMaterial.uniforms.u_resolution.value.y = sizes.height;
  }

  // TODO: add framerate limiter, optionally make it ajustabe mid-simulation
  // possibly add option to pause and progress simulation by one frame on demand
  function animate() {
    zoomSlider.value = zoom;
    if (!paused || nextFrameRequested) {
      renderer.setRenderTarget(renderBufferA);
      renderer.render(bufferScene, camera);
      mesh.material.uniforms.u_texture.value = renderBufferA.texture;

      // ping-pong buffering
      const temp = renderBufferA;
      renderBufferA = renderBufferB;
      renderBufferB = temp;
      bufferMaterial.uniforms.u_texture.value = renderBufferB.texture;
      nextFrameRequested = false;
    }

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
    deltaTime += clock.getDelta();
    material.uniforms.u_time.value = deltaTime;
    bufferMaterial.uniforms.u_time.value = deltaTime;
    // console.log(mesh.material.uniforms.u_time.value);
    // console.log(mesh.material.uniforms.u_mouse.value);
    // console.log(mesh.material.uniforms.u_resolution);
  }
}
