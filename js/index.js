var renderer, uniforms, vshader, fshader, camera, scene, mesh;
var loader = new THREE.FileLoader();
init();

async function init() {
  // Without targeting a specific element in the html document, the appendChild function can be used instead
  // renderer = new THREE.WebGLRenderer();
  // document.body.appendChild(renderer.domElement);
  const canvas = document.getElementById("c");
  renderer = new THREE.WebGLRenderer({ canvas });

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var numFilesLeft = 2;

  function continueIfReady() {
    numFilesLeft--;
    if (numFilesLeft === 0) {
      finishShaderLoading();
    }
  }

  await loader.load("../shaders/shader.frag", function (data) {
    fshader = data;
    continueIfReady();
  });
  await loader.load("../shaders/shader.vert", function (data) {
    vshader = data;
    continueIfReady();
  });
}

function finishShaderLoading() {
  const clock = new THREE.Clock();

  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    u_color_a: { value: new THREE.Color(0xff0000) },
    u_color_b: { value: new THREE.Color(0x00ffff) },
    u_time: { value: 0.0 },
    u_mouse: { value: { x: 0.0, y: 0.0 } },
    u_resolution: { value: { x: 0, y: 0 } },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vshader,
    fragmentShader: fshader,
  });

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  camera.position.z = 1;

  onWindowResize();
  if ("ontouchstart" in window) {
    document.addEventListener("touchmove", move);
  } else {
    window.addEventListener("resize", onWindowResize, false);
    document.addEventListener("mousemove", move);
  }

  function move(evt) {
    uniforms.u_mouse.value.x = evt.touches
      ? evt.touches[0].clientX
      : evt.clientX;
    uniforms.u_mouse.value.y = evt.touches
      ? evt.touches[0].clientY
      : evt.clientY;
  }

  animate();

  function onWindowResize(event) {
    const aspectRatio = window.innerWidth / window.innerHeight;
    let width, height;
    if (aspectRatio >= 1) {
      width = 1;
      height = (window.innerHeight / window.innerWidth) * width;
    } else {
      width = aspectRatio;
      height = 1;
    }
    camera.left = -width;
    camera.right = width;
    camera.top = height;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.x = window.innerWidth;
    uniforms.u_resolution.value.y = window.innerHeight;
  }

  function animate() {
    requestAnimationFrame(animate);
    uniforms.u_time.value += clock.getDelta();
    renderer.render(scene, camera);
  }
}
