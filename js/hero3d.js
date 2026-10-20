/* Home hero: a wireframe globe in the logo's red bands, rotating in 3D.
   Requires three.min.js (r158 UMD) loaded first. Falls back silently. */
(function () {
  "use strict";
  const host = document.getElementById("hero-canvas");
  if (!host || !window.THREE) return;
  const T = window.THREE;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { return; }   // no WebGL: the hero stays a clean black panel
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(0, 0, 9);

  const group = new T.Group();
  scene.add(group);

  // Globe: latitude / longitude lines with a red gradient by latitude (deep at the equator, light at the poles)
  const R = 2.6, cDeep = new T.Color(0xa81810), cMid = new T.Color(0xc84038), cLight = new T.Color(0xf08080);
  function tint(y) { const t = Math.abs(y) / R; return (t < .5 ? cDeep.clone().lerp(cMid, t * 2) : cMid.clone().lerp(cLight, (t - .5) * 2)); }
  function addLine(points) {
    const pos = [], col = [];
    points.forEach(p => { pos.push(p.x, p.y, p.z); const c = tint(p.y); col.push(c.r, c.g, c.b); });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    const m = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .55 });
    group.add(new T.Line(g, m));
  }
  const SEG = 96;
  for (let i = 1; i < 12; i++) {           // latitudes
    const phi = Math.PI * i / 12, r = R * Math.sin(phi), y = R * Math.cos(phi), pts = [];
    for (let j = 0; j <= SEG; j++) { const a = Math.PI * 2 * j / SEG; pts.push(new T.Vector3(r * Math.cos(a), y, r * Math.sin(a))); }
    addLine(pts);
  }
  for (let i = 0; i < 16; i++) {           // longitudes
    const a = Math.PI * i / 16, pts = [];
    for (let j = 0; j <= SEG; j++) { const phi = Math.PI * 2 * j / SEG; pts.push(new T.Vector3(R * Math.sin(phi) * Math.cos(a), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(a))); }
    addLine(pts);
  }
  // Inner translucent sphere for depth
  group.add(new T.Mesh(new T.SphereGeometry(R * .985, 48, 48), new T.MeshBasicMaterial({ color: 0x1a0a09, transparent: true, opacity: .55, depthWrite: false })));

  // Three orbit bands, like the logo's swoosh
  const bands = [];
  [[R * 1.25, 0xf08080, .35], [R * 1.42, 0xc84038, .3], [R * 1.6, 0xa81810, .25]].forEach(([r, c, o], k) => {
    const band = new T.Mesh(new T.TorusGeometry(r, .012, 8, 220), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o }));
    band.rotation.x = Math.PI / 2.4 + k * .12; band.rotation.y = k * .35;
    bands.push(band); scene.add(band);
  });

  // Service-area markers: NY, NJ, PA (lat/lon -> sphere)
  function ll(lat, lon, r) { const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180; return new T.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); }
  const markerMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const markers = [];
  [[40.71, -74.0], [40.06, -74.4], [40.27, -76.88]].forEach(([la, lo]) => {
    const m = new T.Mesh(new T.SphereGeometry(.045, 12, 12), markerMat); m.position.copy(ll(la, lo, R * 1.005)); group.add(m);
    const halo = new T.Mesh(new T.RingGeometry(.06, .11, 32), new T.MeshBasicMaterial({ color: 0xf08080, transparent: true, opacity: .7, side: T.DoubleSide }));
    halo.position.copy(m.position); halo.lookAt(new T.Vector3(0, 0, 0)); group.add(halo); markers.push(halo);
  });

  // Particles
  const N = 700, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const r = 5 + Math.random() * 9, a = Math.random() * Math.PI * 2, z = (Math.random() - .5) * 2; pp[i * 3] = r * Math.cos(a) * Math.sqrt(1 - z * z); pp[i * 3 + 1] = r * z; pp[i * 3 + 2] = r * Math.sin(a) * Math.sqrt(1 - z * z); }
  const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pp, 3));
  const particles = new T.Points(pg, new T.PointsMaterial({ color: 0xf08080, size: .035, transparent: true, opacity: .5 }));
  scene.add(particles);

  // Rotate so the US faces the camera
  group.rotation.y = 1.9; group.rotation.x = .25;

  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); }, { passive: true });

  function size() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const wide = w > 900;
    group.position.x = wide ? 2.2 : 0; group.position.y = wide ? 0 : 1.2;
    bands.forEach(b => b.position.copy(group.position)); particles.position.copy(group.position);
    camera.position.z = wide ? 9 : 11;
  }
  size(); window.addEventListener("resize", size);

  let visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(host);

  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    t += .005;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    group.rotation.y = 1.9 + t * .6 + mx * .5;
    group.rotation.x = .25 + my * .3;
    bands.forEach((b, k) => { b.rotation.z = t * (.3 + k * .1); });
    particles.rotation.y = -t * .15;
    markers.forEach((h, k) => { const s = 1 + .25 * Math.sin(t * 6 + k); h.scale.set(s, s, s); });
    renderer.render(scene, camera);
  }
  if (reduced) { renderer.render(scene, camera); } else frame();
})();
