(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 5;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Partículas rojas
  const geo1 = new THREE.BufferGeometry();
  const count1 = 240;
  const pos1 = new Float32Array(count1 * 3);
  for (let i = 0; i < count1 * 3; i++) pos1[i] = (Math.random() - 0.5) * 10;
  geo1.setAttribute('position', new THREE.BufferAttribute(pos1, 3));
  const mat1 = new THREE.PointsMaterial({ color: 0xe63946, size: 0.035, transparent: true, opacity: 0.6 });
  const particles1 = new THREE.Points(geo1, mat1);
  scene.add(particles1);

  // Partículas amarillas secundarias
  const geo2 = new THREE.BufferGeometry();
  const count2 = 120;
  const pos2 = new Float32Array(count2 * 3);
  for (let i = 0; i < count2 * 3; i++) pos2[i] = (Math.random() - 0.5) * 12;
  geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
  const mat2 = new THREE.PointsMaterial({ color: 0xffd60a, size: 0.022, transparent: true, opacity: 0.3 });
  const particles2 = new THREE.Points(geo2, mat2);
  scene.add(particles2);

  // Anillos wireframe
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.TorusGeometry(0.8 + Math.random() * 1.2, 0.008, 6, 80);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe63946, wireframe: true, transparent: true, opacity: 0.08 });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rings.push(ring);
    scene.add(ring);
  }

  // Mouse parallax
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let frameId;
  function animate() {
    frameId = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;

    particles1.rotation.y += 0.0015;
    particles1.rotation.x += 0.0006;
    particles2.rotation.y -= 0.001;
    particles2.rotation.x += 0.0004;

    rings.forEach((ring, i) => {
      ring.rotation.x += 0.003 * (i % 2 === 0 ? 1 : -1);
      ring.rotation.y += 0.002 * (i % 2 === 0 ? -1 : 1);
      ring.position.y += Math.sin(t * 0.5 + i) * 0.001;
    });

    camera.position.x += (mx * 0.3 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.2 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frameId);
    else animate();
  });

  animate();
})();
