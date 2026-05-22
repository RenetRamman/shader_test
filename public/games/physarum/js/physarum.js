export function start({ onBackToLauncher } = {}) {
  const backBtn = document.getElementById("backToLauncherButton");
  if (backBtn) {
    backBtn.onclick = () => {
      if (typeof onBackToLauncher === "function") onBackToLauncher();
      else window.location.reload();
    };
  }

  const menuButton = document.getElementById("menuButton");
  const menuPanel = document.getElementById("menuPanel");
  const menu = document.getElementById("menu");
  const thresholdSlider = document.getElementById("thresholdSlider");
  const thresholdText = document.getElementById("thresholdText");
  const generateSeedButton = document.getElementById("generateSeedButton");

  if (menuButton && menuPanel) {
    menuButton.addEventListener("click", () => {
      menuPanel.style.display =
        menuPanel.style.display === "block" ? "none" : "block";
    });
  }
  if (menu && menuPanel) {
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) {
        menuPanel.style.display = "none";
      }
    });
  }

  function updateThresholdLabel() {
    if (!thresholdSlider || !thresholdText) return;
    thresholdText.textContent = Number(thresholdSlider.value).toFixed(2);
  }

  if (thresholdSlider) {
    thresholdSlider.addEventListener("input", updateThresholdLabel);
    updateThresholdLabel();
  }

  const shaders = {
    vertexShader: "/games/physarum/shaders/vertex.vert",
    fragmentShader: "/games/physarum/shaders/display.frag",
    bufferShader: "/games/physarum/shaders/buffer.frag",
    seedShader: "/games/physarum/shaders/seed.frag",
  };

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const uniforms = {
    u_texture: { value: null },
    u_resolution: { value: new THREE.Vector2(1, 1) },
    u_threshold: { value: 0.5 },
    u_seed: { value: 0.0 },
  };

  const loader = new THREE.FileLoader();
  let renderer;
  let scene;
  let bufferScene;
  let seedScene;
  let camera;
  let displayMaterial;
  let bufferMaterial;
  let seedMaterial;
  let renderBufferA;
  let renderBufferB;
  let hasSeed = false;
  let simulating = false;

  function init() {
    let filesLoaded = 0;

    function continueIfReady(count) {
      count += 1;
      if (count === Object.keys(shaders).length) {
        finishShaderLoading();
      }
      return count;
    }

    for (const [key, path] of Object.entries(shaders)) {
      loader.load(path, (data) => {
        shaders[key] = data;
        filesLoaded = continueIfReady(filesLoaded);
      });
    }
  }

  function createRenderTarget(width, height) {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
    });
  }

  function finishShaderLoading() {
    const canvas = document.getElementById("c");
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);

    scene = new THREE.Scene();
    bufferScene = new THREE.Scene();
    seedScene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const bufW = renderer.domElement.width;
    const bufH = renderer.domElement.height;

    renderBufferA = createRenderTarget(bufW, bufH);
    renderBufferB = createRenderTarget(bufW, bufH);
    uniforms.u_resolution.value.set(bufW, bufH);

    displayMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.fragmentShader,
    });

    bufferMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.bufferShader,
    });

    seedMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.seedShader,
    });

    scene.add(new THREE.Mesh(geometry, displayMaterial));
    bufferScene.add(new THREE.Mesh(geometry, bufferMaterial));
    seedScene.add(new THREE.Mesh(geometry, seedMaterial));

    clearState();
    fillBuffersBlack();
    window.addEventListener("resize", onWindowResize, false);

    if (generateSeedButton) {
      generateSeedButton.addEventListener("click", generateSeed);
    }

    animate();
  }

  function clearState() {
    hasSeed = false;
    simulating = false;
  }

  function fillBuffersBlack() {
    uniforms.u_threshold.value = 0.0;
    uniforms.u_seed.value = 0.0;

    renderer.setRenderTarget(renderBufferA);
    renderer.render(seedScene, camera);

    renderer.setRenderTarget(renderBufferB);
    renderer.render(seedScene, camera);

    renderer.setRenderTarget(null);
    displayMaterial.uniforms.u_texture.value = renderBufferA.texture;
    bufferMaterial.uniforms.u_texture.value = renderBufferA.texture;
  }

  function generateSeed() {
    if (!renderer) return;

    uniforms.u_threshold.value = thresholdSlider
      ? parseFloat(thresholdSlider.value)
      : 0.5;
    uniforms.u_seed.value = Math.random() * 10000.0;

    renderer.setRenderTarget(renderBufferA);
    renderer.render(seedScene, camera);
    renderer.setRenderTarget(null);

    displayMaterial.uniforms.u_texture.value = renderBufferA.texture;
    bufferMaterial.uniforms.u_texture.value = renderBufferA.texture;

    hasSeed = true;
    simulating = false;
  }

  function onWindowResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);

    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    uniforms.u_resolution.value.set(w, h);

    renderBufferA.setSize(w, h);
    renderBufferB.setSize(w, h);
    clearState();
    fillBuffersBlack();
  }

  function stepSimulation() {
    bufferMaterial.uniforms.u_texture.value = renderBufferA.texture;
    renderer.setRenderTarget(renderBufferB);
    renderer.render(bufferScene, camera);
    renderer.setRenderTarget(null);

    displayMaterial.uniforms.u_texture.value = renderBufferB.texture;

    const temp = renderBufferA;
    renderBufferA = renderBufferB;
    renderBufferB = temp;
  }

  function animate() {
    if (hasSeed && simulating) {
      stepSimulation();
    }

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  init();
}

start({
  onBackToLauncher: () => {
    window.location.href = "/";
  },
});
