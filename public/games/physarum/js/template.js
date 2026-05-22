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

  const shaders = {
    vertexShader: "/games/physarum/shaders/vertex.vert",
    fragmentShader: "/games/physarum/shaders/display.frag",
  };

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const uniforms = {
    u_resolution: { value: new THREE.Vector2(1, 1) },
    u_time: { value: 0.0 },
  };

  const loader = new THREE.FileLoader();
  let renderer;
  let scene;
  let camera;
  let material;
  let timeSinceStart = 0.0;

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

  function finishShaderLoading() {
    const canvas = document.getElementById("c");
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.fragmentShader,
    });

    scene.add(new THREE.Mesh(geometry, material));
    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);

    const clock = new THREE.Clock();
    animate(clock);
  }

  function onWindowResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height);
    uniforms.u_resolution.value.set(
      renderer.domElement.width,
      renderer.domElement.height,
    );
  }

  function animate(clock) {
    const deltaTime = clock.getDelta();
    timeSinceStart += deltaTime;
    uniforms.u_time.value = timeSinceStart;

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    requestAnimationFrame(() => animate(clock));
  }

  init();
}

start({
  onBackToLauncher: () => {
    window.location.href = "/";
  },
});
