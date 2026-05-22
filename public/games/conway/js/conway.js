import {
  acorn,
  glider_gun,
  gosper_glider_gun,
  lwss,
  pulsar,
  r_pentomino,
  simkin_glider_gun,
  single_cell,
} from "./patterns.js";

/** 1×1 dead cell; brush mode never samples the pattern texture. */
const PATTERN_PLACEHOLDER = [1, 1, 0];

export function start({ onBackToLauncher } = {}) {
  const backBtn = document.getElementById("backToLauncherButton");
  if (backBtn) {
    backBtn.onclick = () => {
      if (typeof onBackToLauncher === "function") onBackToLauncher();
      else window.location.reload();
    };
  }

  let patternDataTexture = null;

  const PAINT_TOOLS = {
    brush: { pattern: PATTERN_PLACEHOLDER, brushMode: true },
    single_cell: { pattern: single_cell, brushMode: false },
    glider_gun: { pattern: glider_gun, brushMode: false },
    gosper_glider_gun: { pattern: gosper_glider_gun, brushMode: false },
    simkin_glider_gun: { pattern: simkin_glider_gun, brushMode: false },
    pulsar: { pattern: pulsar, brushMode: false },
    acorn: { pattern: acorn, brushMode: false },
    r_pentomino: { pattern: r_pentomino, brushMode: false },
    lwss: { pattern: lwss, brushMode: false },
  };

  let renderer,
    camera,
    scene,
    bufferScene,
    deltaTime,
    timeSinceStart,
    zoom;

  /** Pattern mode: set on pointer down; consumed on the next simulation step. */
  let stampPending = false;
  /** Brush mode: true while primary button held on canvas. */
  let brushPointerDown = false;
  let paused = false;
  let nextFrameRequested = false;
  let frameReady = true;
  let framerate = 61;
  let lastFrameTime = 0;

  const shaders = {
    vertexShader: "/games/conway/shaders/vertex.vert",
    fragmentShader: "/games/conway/shaders/game_of_life.frag",
    bufferShader: "/games/conway/shaders/buffer.frag",
    /** Basename under /images/; set from images/manifest.json in init(). */
    image: null,
  };

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const uniforms = {
    u_texture: { value: null },
    u_resolution: { value: null },
    u_image_resolution: { value: null },
    u_time: { value: 0.0 },
    u_mouse: { value: { x: 0, y: 0 } },
    u_zoom: { value: 1.0 },
    u_brush_size: { value: null },
    u_grid_enable: { value: false },
    u_paint: { value: false },
    u_brush_mode: { value: true },
    u_patternTex: { value: null },
    u_patternDims: { value: new THREE.Vector2(1, 1) },
  };

  const loader = new THREE.FileLoader();
  const texLoader = new THREE.TextureLoader();
  texLoader.setPath("/images/");

  function setPatternFromFlat(flat) {
    const w = flat[0];
    const h = flat[1];
    const cells = flat.slice(2);
    if (patternDataTexture) {
      patternDataTexture.dispose();
      patternDataTexture = null;
    }
    const data = new Uint8Array(w * h * 4);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const v = cells[row * w + col] ? 255 : 0;
        const idx = (row * w + col) * 4;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      }
    }
    patternDataTexture = new THREE.DataTexture(
      data,
      w,
      h,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    patternDataTexture.minFilter = THREE.NearestFilter;
    patternDataTexture.magFilter = THREE.NearestFilter;
    patternDataTexture.wrapS = THREE.ClampToEdgeWrapping;
    patternDataTexture.wrapT = THREE.ClampToEdgeWrapping;
    patternDataTexture.generateMipmaps = false;
    patternDataTexture.flipY = false;
    patternDataTexture.needsUpdate = true;
    uniforms.u_patternTex.value = patternDataTexture;
    uniforms.u_patternDims.value.set(w, h);
  }

  // Hamburger menu stuff
  const menuButton = document.getElementById("menuButton");
  const menuPanel = document.getElementById("menuPanel");
  const menu = document.getElementById("menu");
  const pauseText = document.getElementById("pauseAdditional");
  const framerateText = document.getElementById("fpsText");

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

  const zoomSlider = document.getElementById("zoomSlider");
  const brushSlider = document.getElementById("brushSlider");
  const brushSliderLabel = document.getElementById("brushSliderLabel");
  const paintToolSelect = document.getElementById("paintToolSelect");
  const speedSlider = document.getElementById("speedSlider");
  const pauseToggle = document.getElementById("pauseToggle");
  const gridToggle = document.getElementById("gridToggle");
  const imageSelect = document.getElementById("imageSelect");

  function doPause() {
    paused = !paused;
    if (pauseToggle) pauseToggle.checked = !pauseToggle.checked;
    if (pauseText) {
      pauseText.style.display =
        pauseText.style.display === "block" ? "none" : "block";
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "n") nextFrameRequested = true;
    else if (e.key === " ") doPause();
  });

  /** Matches selected tool; drives pointer + sim-step paint behavior. */
  let paintUsesBrush = true;

  function applyPaintTool() {
    const key = paintToolSelect?.value;
    const tool = PAINT_TOOLS[key] ?? PAINT_TOOLS.brush;
    paintUsesBrush = tool.brushMode;
    uniforms.u_brush_mode.value = tool.brushMode;
    setPatternFromFlat(tool.pattern ?? PATTERN_PLACEHOLDER);
    stampPending = false;
    brushPointerDown = false;
    if (brushSliderLabel) {
      brushSliderLabel.style.display = tool.brushMode ? "" : "none";
    }
  }

  if (paintToolSelect) {
    paintToolSelect.addEventListener("change", applyPaintTool);
  }

  const IMAGE_MANIFEST_URL = "/images/manifest.json";

  function imageEntryFile(entry) {
    return typeof entry === "string" ? entry : entry && entry.file;
  }

  function imageEntryLabel(entry) {
    if (typeof entry === "string") return entry;
    if (entry && entry.label) return entry.label;
    const f = imageEntryFile(entry);
    return f || "";
  }

  function applyLoadedImageTexture(tex) {
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    frameReady = false;
    uniforms.u_texture.value = tex;
    uniforms.u_image_resolution.value.set(tex.image.width, tex.image.height);
    uniforms.u_time.value = 0.0;
    timeSinceStart = 0.0;
  }

  async function loadImageManifest() {
    const fallback = {
      defaultFile: "flower_orange.jpg",
      images: ["flower_orange.jpg"],
    };
    try {
      const res = await fetch(IMAGE_MANIFEST_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      const manifest = JSON.parse(text);
      if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
        console.warn(
          "images/manifest.json: missing or empty images[] — using fallback",
        );
        return fallback;
      }
      return manifest;
    } catch (e) {
      console.error("Could not load images/manifest.json — using fallback list.", e);
      return fallback;
    }
  }

  function populateImageSelectFromManifest(manifest) {
    let entries = manifest.images.filter((e) => imageEntryFile(e));
    if (entries.length === 0) entries = ["flower_orange.jpg"];

    const files = entries.map((e) => imageEntryFile(e));
    let defaultFile = manifest.defaultFile || files[0];
    if (!files.includes(defaultFile)) defaultFile = files[0];

    shaders.image = defaultFile;

    if (imageSelect) {
      imageSelect.innerHTML = "";
      for (const entry of entries) {
        const file = imageEntryFile(entry);
        if (!file) continue;
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = imageEntryLabel(entry);
        imageSelect.appendChild(opt);
      }
      imageSelect.value = defaultFile;
    }
  }

  async function init() {
    const manifest = await loadImageManifest();
    populateImageSelectFromManifest(manifest);

    let files_loaded = 0;

    function continueIfReady(files, count) {
      count += 1;
      if (count === Object.keys(files).length) {
        finishShaderLoading();
      }
      return count;
    }

    for (const [shader, value] of Object.entries(shaders)) {
      if (shader !== "image") {
        loader.load(value, (data) => {
          shaders[shader] = data;
          files_loaded = continueIfReady(shaders, files_loaded);
        });
      } else {
        texLoader.load(value, (data) => {
          shaders[shader] = data;
          files_loaded = continueIfReady(shaders, files_loaded);
        });
      }
    }
  }

  function finishShaderLoading() {
    timeSinceStart = 0.0;
    zoom = 1.0;
    const canvas = document.getElementById("c");
    renderer = new THREE.WebGLRenderer({ canvas });

    scene = new THREE.Scene();
    bufferScene = new THREE.Scene();

    const geometry = new THREE.PlaneGeometry(2, 2);

    const imageResolution = new THREE.Vector2(
      shaders.image.image.width,
      shaders.image.image.height,
    );

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);

    let bufW = renderer.domElement.width;
    let bufH = renderer.domElement.height;
    const resolution = new THREE.Vector3(bufW, bufH, renderer.getPixelRatio());

    let renderBufferA = new THREE.WebGLRenderTarget(bufW, bufH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
    });

    let renderBufferB = new THREE.WebGLRenderTarget(bufW, bufH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
    });

    uniforms.u_texture.value = shaders.image;
    uniforms.u_resolution.value = resolution;
    uniforms.u_image_resolution.value = imageResolution;
    uniforms.u_brush_size.value = brushSlider ? brushSlider.value : 6;
    applyPaintTool();

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
    const clock = new THREE.Clock();

    onWindowResize();

    renderer.domElement.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (paintUsesBrush) brushPointerDown = true;
      else stampPending = true;
    });

    window.addEventListener("pointerup", () => {
      brushPointerDown = false;
    });
    window.addEventListener("pointercancel", () => {
      brushPointerDown = false;
    });

    window.addEventListener("resize", onWindowResize, false);
    if ("ontouchstart" in window) {
      document.addEventListener("touchmove", move);
      document.addEventListener("touchstart", move, { passive: true });
    } else {
      document.addEventListener("mousemove", move);
      document.addEventListener("wheel", handleWheel);
    }

    function doZoom(evt) {
      if (!zoomSlider) return;
      if (evt.deltaY < 0 && zoom >= 0.1) {
        zoom = Number((zoom - parseFloat(zoomSlider.step)).toFixed(3));
      } else if (evt.deltaY > 0 && zoom < 1) {
        zoom = Number((zoom + parseFloat(zoomSlider.step)).toFixed(3));
      }
      material.uniforms.u_zoom.value = zoom;
      bufferMaterial.uniforms.u_zoom.value = zoom;
    }

    function resizeBrush(evt) {
      if (!brushSlider) return;
      let brushSize = Number(brushSlider.value);
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

    function clientToBuffer(clientX, clientY) {
      const el = renderer.domElement;
      const rect = el.getBoundingClientRect();
      const scaleX = el.width / rect.width;
      const scaleY = el.height / rect.height;
      const bx = (clientX - rect.left) * scaleX;
      const by = el.height - (clientY - rect.top) * scaleY;
      return { x: bx, y: by };
    }

    function move(evt) {
      const cx = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const cy = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const p = clientToBuffer(cx, cy);
      material.uniforms.u_mouse.value.x = p.x;
      material.uniforms.u_mouse.value.y = p.y;
      bufferMaterial.uniforms.u_mouse.value.x = p.x;
      bufferMaterial.uniforms.u_mouse.value.y = p.y;
    }

    if (zoomSlider) {
      zoomSlider.addEventListener("input", (e) => {
        zoom = parseFloat(e.target.value);
        uniforms.u_zoom.value = zoom;
      });
    }

    if (brushSlider) {
      brushSlider.addEventListener("input", (e) => {
        uniforms.u_brush_size.value = parseFloat(e.target.value);
      });
    }

    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        framerate = parseFloat(e.target.value);
        if (framerateText) {
          framerateText.textContent = framerate !== 61 ? framerate : "INF";
        }
      });
    }

    if (pauseToggle) {
      pauseToggle.addEventListener("change", (e) => {
        paused = e.target.checked;
        if (pauseText) {
          pauseText.style.display =
            pauseText.style.display === "block" ? "none" : "block";
        }
      });
    }

    if (gridToggle) {
      gridToggle.addEventListener("change", (e) => {
        uniforms.u_grid_enable.value = e.target.checked;
      });
    }

    if (imageSelect) {
      imageSelect.addEventListener("change", (e) => {
        const selectedImage = e.target.value;
        texLoader.load(selectedImage, (tex) => {
          applyLoadedImageTexture(tex);
        });
      });
    }

    animate();

    function onWindowResize() {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(sizes.width, sizes.height);
      const w = renderer.domElement.width;
      const h = renderer.domElement.height;
      uniforms.u_resolution.value.set(w, h, renderer.getPixelRatio());
      renderBufferA.setSize(w, h);
      renderBufferB.setSize(w, h);
      bufW = w;
      bufH = h;
    }

    function animate() {
      if (zoomSlider) zoomSlider.value = zoom;
      frameReady = framerate === 61 ? true : 1 / framerate <= lastFrameTime;
      deltaTime = clock.getDelta();
      if ((!paused && frameReady) || nextFrameRequested) {
        const paintActive = paintUsesBrush ? brushPointerDown : stampPending;
        uniforms.u_paint.value = paintActive;
        renderer.setRenderTarget(renderBufferA);
        renderer.render(bufferScene, camera);
        uniforms.u_paint.value = false;
        if (!paintUsesBrush) stampPending = false;

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
    }
  }

  init();
}

start({
  onBackToLauncher: () => {
    window.location.href = "/";
  },
});

