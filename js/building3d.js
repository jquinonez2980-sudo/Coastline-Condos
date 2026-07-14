/**
 * Coastline Condos — Interactive 3D Building Explorer (multi-unit)
 *
 * Procedural Three.js model with suite footprints from the architectural
 * plans (CC_INVENTORY.building — 30 m facade, 12.2 m deep, level 3 set back
 * to 27 m, two open stair halls):
 *   Floor 1: 101 | 102 | 103
 *   Floor 2: 201 | 202 | 203
 *   Floor 3: 301 | 302 (+42 m² wrap terrace)
 * Ground courtyard pool + 10 parking stalls per Planta Baja. The building is
 * only 3 stories per the plans — there is no communal rooftop terrace or
 * pool; the roof above floor 3 is a plain service roof, and 302's wrap
 * terrace (modeled at level 3) is a private amenity, not a shared one.
 * Click a suite → inventory details + open interactive floor plan.
 * Day/night lighting. SVG elevation fallback when WebGL unavailable.
 */
(function () {
  'use strict';

  const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const section = document.getElementById('explorer');
  if (!section) return;

  const stage = document.getElementById('explorer-stage');
  const fallback = document.getElementById('explorer-fallback');
  const hint = document.getElementById('exp-hint');
  const infoTitle = document.getElementById('exp-info-title');
  const infoDesc = document.getElementById('exp-info-desc');
  const infoCta = document.getElementById('exp-info-cta');
  const unitList = document.getElementById('exp-unit-list');
  const dayBtn = document.getElementById('exp-day');
  const nightBtn = document.getElementById('exp-night');

  const t = (k) => (window.CC && window.CC.t ? window.CC.t(k) : k);
  const lang = () => (window.CC ? window.CC.lang : 'en');
  const inv = () => window.CC_INVENTORY;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FLOOR_META = {
    1: { titleKey: 'exp.f1', descKey: 'exp.f1desc' },
    2: { titleKey: 'exp.f2', descKey: 'exp.f2desc' },
    3: { titleKey: 'exp.f3', descKey: 'exp.f3desc' },
  };

  /* Status → mesh tint */
  const STATUS_COLOR = {
    available: 0xe8f4f0,
    conditional: 0xf5e6c8,
    sold: 0xc8c4bc,
  };
  const STATUS_EMISSIVE = {
    available: 0x2F8F8A,
    conditional: 0xC9714F,
    sold: 0x555555,
  };

  let selectedFloor = null;
  let selectedUnit = null;
  let three = null;

  function selectFloor(floor, unitId) {
    selectedFloor = String(floor);
    selectedUnit = unitId || null;
    const meta = FLOOR_META[selectedFloor];
    const inventory = inv();
    const L = lang();

    if (infoTitle) {
      infoTitle.textContent = meta ? t(meta.titleKey) : '';
    }

    if (selectedUnit && inventory) {
      const u = inventory.getUnit(selectedUnit);
      if (u) {
        if (infoDesc) {
          const bits = [
            inventory.unitTypeLine(u, L),
            inventory.formatM2(u.totalM2) + ' total',
            inventory.statusLabel(u.status, L),
          ];
          if (u.status === 'available') bits.push(inventory.formatPrice(u.price, L));
          infoDesc.textContent = bits.join(' · ');
        }
        if (infoCta) {
          infoCta.hidden = false;
          infoCta.dataset.unit = u.id;
          infoCta.textContent = t('exp.viewplan');
        }
      }
    } else {
      if (infoDesc) infoDesc.textContent = meta ? t(meta.descKey) : t('exp.select');
      if (infoCta) {
        infoCta.hidden = true;
        infoCta.dataset.unit = '';
      }
    }

    document.querySelectorAll('.exp-floor-btn').forEach((b) => {
      const on = b.dataset.floor === selectedFloor;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-svg-floor]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.svgFloor === selectedFloor);
    });
    document.querySelectorAll('[data-svg-unit]').forEach((el) => {
      el.classList.toggle('is-unit-active', el.dataset.svgUnit === selectedUnit);
    });

    renderUnitList(selectedFloor, selectedUnit);
    if (three) three.setSelection(selectedFloor, selectedUnit);
  }

  function renderUnitList(floor, activeUnit) {
    if (!unitList) return;
    const inventory = inv();
    if (!inventory || !floor) {
      unitList.innerHTML = '';
      return;
    }
    const units = inventory.getUnitsByFloor(Number(floor));
    const L = lang();
    unitList.innerHTML = units
      .map((u) => {
        const active = u.id === activeUnit ? ' is-active' : '';
        const price =
          u.status === 'available'
            ? `<span class="exp-unit-price">${inventory.formatPrice(u.price, L)}</span>`
            : `<span class="exp-unit-status status-${u.status}">${inventory.statusLabel(u.status, L)}</span>`;
        return `
          <button type="button" class="exp-unit-chip${active} status-${u.status}" data-pick-unit="${u.id}" data-floor="${u.floor}">
            <strong>${u.id}</strong>
            <span>${u.beds}BR · ${inventory.formatM2(u.areaM2)}</span>
            ${price}
          </button>`;
      })
      .join('');
  }

  function refreshTexts() {
    if (selectedFloor) selectFloor(selectedFloor, selectedUnit);
  }
  document.addEventListener('cc:langchange', refreshTexts);

  document.querySelectorAll('.exp-floor-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectFloor(btn.dataset.floor, null));
  });
  document.querySelectorAll('[data-svg-floor]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const unitEl = e.target.closest('[data-svg-unit]');
      if (unitEl) {
        selectFloor(el.dataset.svgFloor, unitEl.dataset.svgUnit);
      } else {
        selectFloor(el.dataset.svgFloor, null);
      }
    });
  });

  if (unitList) {
    unitList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-unit]');
      if (!btn) return;
      selectFloor(btn.dataset.floor, btn.dataset.pickUnit);
    });
  }

  if (infoCta) {
    infoCta.addEventListener('click', () => {
      const id = infoCta.dataset.unit;
      if (!id) return;
      if (window.CC_FLOORPLAN) window.CC_FLOORPLAN.open(id);
      else {
        const card = document.querySelector(`.unit-card[data-unit="${id}"]`);
        if (card) card.click();
      }
    });
  }

  let isNight = false;
  function setNight(night) {
    isNight = night;
    dayBtn && dayBtn.classList.toggle('is-active', !night);
    nightBtn && nightBtn.classList.toggle('is-active', night);
    section.classList.toggle('exp-night', night);
    if (three) three.setNight(night);
  }
  dayBtn && dayBtn.addEventListener('click', () => setNight(false));
  nightBtn && nightBtn.addEventListener('click', () => setNight(true));

  /* ---------- Fullscreen link-out to the full photo-matched 3D model ---------- */
  const fsBtn = document.getElementById('exp-fullscreen-btn');
  const model3dViewer = document.getElementById('model3d-viewer');
  const model3dFrame = document.getElementById('model3d-frame');
  const model3dClose = document.getElementById('model3d-close');
  let model3dLastFocus = null;

  function openModel3D() {
    if (!model3dViewer || !model3dFrame) return;
    model3dLastFocus = document.activeElement;
    // Absolute path so it works from any URL depth; cache-bust after deploys
    const src = new URL('3d-model/', window.location.href).href + '?v=2';
    model3dViewer.classList.remove('hidden');
    model3dViewer.removeAttribute('hidden');
    // Show shell first, then load iframe (avoids 0×0 WebGL boot in display:none)
    requestAnimationFrame(() => {
      model3dViewer.classList.add('is-open');
      if (model3dFrame.getAttribute('src') !== src) {
        model3dFrame.setAttribute('src', src);
      }
    });
    document.body.style.overflow = 'hidden';
    model3dClose && model3dClose.focus();
  }

  function closeModel3D() {
    if (!model3dViewer) return;
    model3dViewer.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      model3dViewer.classList.add('hidden');
      model3dViewer.setAttribute('hidden', '');
      model3dFrame && model3dFrame.removeAttribute('src'); // tear down the WebGL context
    }, 350);
    if (model3dLastFocus && typeof model3dLastFocus.focus === 'function') model3dLastFocus.focus();
    model3dLastFocus = null;
  }

  fsBtn && fsBtn.addEventListener('click', openModel3D);
  model3dClose && model3dClose.addEventListener('click', closeModel3D);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && model3dViewer && model3dViewer.classList.contains('is-open')) closeModel3D();
  });

  /* ---------- Lazy boot Three.js ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      boot().catch((err) => {
        console.warn('[Coastline 3D] Falling back to SVG elevation:', err);
        if (hint) hint.textContent = t('exp.hint');
      });
    },
    { rootMargin: '400px' }
  );
  io.observe(section);

  async function boot() {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no-webgl');

    const THREE = await import(THREE_CDN);
    if (!stage) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);
    renderer.domElement.classList.add('exp-canvas');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(13.5, 7, 17);
    camera.lookAt(0, 2.4, 0);

    const DAY = { sky: 0xbfe0ee, hemi: 0.9, sun: 1.6, fog: 0xbfe0ee };
    const NIGHT = { sky: 0x0a2424, hemi: 0.25, sun: 0.18, fog: 0x0a2424 };
    scene.background = new THREE.Color(DAY.sky);
    scene.fog = new THREE.Fog(DAY.fog, 40, 110);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x777d88, DAY.hemi);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, DAY.sun);
    sun.position.set(18, 22, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    scene.add(sun);

    const M = {
      white: new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.9 }),
      slab: new THREE.MeshStandardMaterial({ color: 0xe6ddcc, roughness: 0.85 }),
      glass: () =>
        new THREE.MeshStandardMaterial({
          color: 0x9cccdf,
          roughness: 0.15,
          metalness: 0.4,
          transparent: true,
          opacity: 0.55,
          emissive: 0x000000,
        }),
      rail: new THREE.MeshStandardMaterial({ color: 0xa8792f, roughness: 0.4, metalness: 0.6 }),
      sand: new THREE.MeshStandardMaterial({ color: 0xe3d2ac, roughness: 1 }),
      sea: new THREE.MeshStandardMaterial({
        color: 0x1f8f89,
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      }),
      pool: new THREE.MeshStandardMaterial({
        color: 0x39b6d8,
        roughness: 0.2,
        emissive: 0x0a4a5e,
        emissiveIntensity: 0.4,
      }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x2e7d54, roughness: 0.9 }),
    };

    const world = new THREE.Group();
    scene.add(world);

    const sandDisc = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.6, 48), M.sand);
    sandDisc.position.y = -0.3;
    sandDisc.receiveShadow = true;
    world.add(sandDisc);

    const seaGeo = new THREE.PlaneGeometry(140, 140, 48, 48);
    const sea = new THREE.Mesh(seaGeo, M.sea);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.55;
    world.add(sea);
    const seaPos = seaGeo.attributes.position;
    const seaBase = seaPos.array.slice();

    const building = new THREE.Group();
    world.add(building);

    /* Real geometry from the plans, scaled meters → world units. */
    const B = (inv() && inv().building) || {
      width: 30, depth: 12.2, terraceDepth: 1.8,
      floorWidths: { 1: 30, 2: 30, 3: 27 },
      stairHalls: [{ x0: 7.5, x1: 11.1 }, { x0: 18.6, x1: 22.2 }],
      unitSpans: {
        101: [0, 7.5], 102: [11.1, 18.6], 103: [22.2, 30],
        201: [0, 7.5], 202: [11.1, 18.6], 203: [22.2, 30],
        301: [0, 7.5], 302: [11.1, 27],
      },
    };
    const S = 0.35;                      // world units per meter (x/z)
    const FLOOR_H = 1.6;                 // vertical exaggeration for readability
    const DEPTH = B.depth * S;           // main slab depth
    const TERR = B.terraceDepth * S;     // projecting terrace strip
    const mx = (m) => (m - B.width / 2) * S; // meter x → centered world x
    // z: 0 at the facade line; body extends to -DEPTH, terraces to +TERR
    const glassMats = [];
    const floorGroups = {};
    const unitMeshes = {}; // unitId → mesh

    function addBox(group, geoArgs, mat, pos, castShadow = true) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...geoArgs), mat);
      m.position.set(...pos);
      m.castShadow = castShadow;
      m.receiveShadow = true;
      group.add(m);
      return m;
    }

    function unitMat(status) {
      return new THREE.MeshStandardMaterial({
        color: STATUS_COLOR[status] || STATUS_COLOR.available,
        roughness: 0.88,
        emissive: STATUS_EMISSIVE[status] || 0x000000,
        emissiveIntensity: status === 'available' ? 0.08 : status === 'conditional' ? 0.12 : 0.02,
      });
    }

    const hallMat = new THREE.MeshStandardMaterial({ color: 0xb08c6c, roughness: 0.95 });

    /** Build one floor: suite volumes at their true facade spans + stair halls. */
    function buildMultiUnitFloor(floorNum, unitIds) {
      const g = new THREE.Group();
      g.position.y = (floorNum - 1) * FLOOR_H;
      g.userData.floor = String(floorNum);

      const fw = (B.floorWidths[floorNum] || B.width) * S;
      const fx = mx(0) + fw / 2; // slab center (level 3 is set back on the right)
      addBox(g, [fw, 0.18, DEPTH + TERR], M.slab, [fx, 0.09, (-DEPTH + TERR) / 2]);

      unitIds.forEach((id) => {
        const span = B.unitSpans[id];
        if (!span) return;
        const inventory = inv();
        const unit = inventory ? inventory.getUnit(id) : null;
        const status = unit ? unit.status : 'available';
        const w = (span[1] - span[0]) * S - 0.04;
        const cx = mx((span[0] + span[1]) / 2);
        const mat = unitMat(status);
        const body = addBox(g, [w, FLOOR_H - 0.22, DEPTH], mat, [cx, FLOOR_H / 2 + 0.03, -DEPTH / 2]);
        body.userData.floor = String(floorNum);
        body.userData.unit = id;
        body.userData.baseMat = mat;
        unitMeshes[id] = body;

        // Glass slider on the facade
        const glass = M.glass();
        glassMats.push(glass);
        addBox(g, [w * 0.72, FLOOR_H * 0.62, 0.06], glass, [cx, FLOOR_H * 0.46, 0.02], false);

        // Private terrace deck + rail in front of the suite
        const tw = Math.min(w - 0.3, 5.2 * S * ((span[1] - span[0]) / 7.5));
        addBox(g, [tw, 0.1, TERR], M.slab, [cx, 0.14, TERR / 2]);
        addBox(g, [tw, 0.3, 0.05], M.rail, [cx, 0.42, TERR - 0.03], false);
      });

      // Open stair halls between suites (recessed, tan like the towers).
      // Skip halls beyond the floor's width or swallowed by a suite span
      // (on level 3, 302 wraps around the second stair core).
      B.stairHalls.forEach(({ x0, x1 }) => {
        if (x1 > (B.floorWidths[floorNum] || B.width)) return;
        const swallowed = unitIds.some((id) => {
          const s = B.unitSpans[id];
          return s && x0 >= s[0] && x1 <= s[1];
        });
        if (swallowed) return;
        const hw = (x1 - x0) * S - 0.06;
        const hx = mx((x0 + x1) / 2);
        addBox(g, [hw, FLOOR_H - 0.22, DEPTH - 0.5], hallMat, [hx, FLOOR_H / 2 + 0.03, -DEPTH / 2 - 0.22]);
      });

      building.add(g);
      floorGroups[floorNum] = g;
      return g;
    }

    buildMultiUnitFloor(1, ['101', '102', '103']);
    buildMultiUnitFloor(2, ['201', '202', '203']);
    buildMultiUnitFloor(3, ['301', '302']);

    // 302's L-shaped wrap terrace (over 103's roof, grid 27–30 m) at level 3
    {
      const f3 = floorGroups[3];
      const wingW = (B.width - (B.floorWidths[3] || 27)) * S;
      const wingX = mx((B.floorWidths[3] + B.width) / 2);
      addBox(f3, [wingW, 0.12, DEPTH + TERR], M.slab, [wingX, 0.1, (-DEPTH + TERR) / 2]);
      addBox(f3, [wingW, 0.3, 0.05], M.rail, [wingX, 0.4, TERR - 0.03], false);
      addBox(f3, [0.05, 0.3, DEPTH + TERR], M.rail, [mx(B.width) - 0.03, 0.4, (-DEPTH + TERR) / 2], false);
    }

    // Plain service roof over floor 3 (no communal rooftop terrace/pool)
    {
      const roofW = (B.floorWidths[3] || 27) * S;
      const roofX = mx(0) + roofW / 2;
      addBox(building, [roofW, 0.16, DEPTH], M.slab, [roofX, 3 * FLOOR_H + 0.08, -DEPTH / 2]);
    }

    /* Site per Planta Baja: courtyard slab, ground pool (left), 10 stalls (right). */
    {
      const site = new THREE.Group();
      building.add(site); // rotates with the building so the site stays aligned
      const courtD = 4.6;
      const courtMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
      addBox(site, [B.width * S + 1.2, 0.08, courtD], courtMat, [0, 0.04, TERR + courtD / 2], false);

      // Pool with coping, street-side left courtyard (PISCINA + cuarto de bomba)
      const px = mx(3.4);
      const pz = TERR + courtD / 2 + 0.15;
      addBox(site, [2.7, 0.1, 1.6], M.slab, [px, 0.09, pz], false);
      const pool = addBox(site, [2.4, 0.08, 1.3], M.pool, [px, 0.13, pz], false);
      site.userData.pool = pool;
      addBox(site, [0.5, 0.4, 0.4], M.white, [px - 1.7, 0.2, pz + 0.5]); // pump room

      // 10 parking stalls: white stripe pairs on the right half
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9 });
      const stallW = 2.55 * S;
      for (let i = 0; i <= 5; i++) {
        addBox(site, [0.045, 0.02, 1.55], stripeMat, [mx(15.4) + i * stallW, 0.09, TERR + 1.05], false);
      }
      for (let i = 0; i <= 4; i++) {
        addBox(site, [0.045, 0.02, 1.55], stripeMat, [mx(16.7) + i * stallW, 0.09, TERR + 3.4], false);
      }
    }

    function palm(x, z, s) {
      const p = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.16 * s, 2.6 * s, 8), M.trunk);
      trunk.position.y = 1.3 * s;
      trunk.castShadow = true;
      p.add(trunk);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 1.9 * s, 5), M.leaf);
        const a = (i / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.75 * s, 2.65 * s, Math.sin(a) * 0.75 * s);
        leaf.rotation.z = Math.cos(a) * 1.25;
        leaf.rotation.x = -Math.sin(a) * 1.25;
        leaf.castShadow = true;
        p.add(leaf);
      }
      p.position.set(x, 0, z);
      world.add(p);
    }
    palm(-8.5, 5.5, 1.15);
    palm(8.8, 4.4, 1);
    palm(-7.4, -5.8, 0.9);
    palm(9.4, -4.6, 1.05);

    /* Interaction */
    let targetRotY = 0.5;
    let rotY = 0.5;
    let dragging = false;
    let lastX = 0;
    let idle = 0;
    const el = renderer.domElement;
    el.style.touchAction = 'pan-y';

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      idle = 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      targetRotY += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
      idle = 0;
    });
    const stopDrag = () => {
      dragging = false;
    };
    el.addEventListener('pointerup', stopDrag);
    el.addEventListener('pointercancel', stopDrag);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt = null;
    el.addEventListener('pointerdown', (e) => {
      downAt = [e.clientX, e.clientY];
    });
    el.addEventListener('pointerup', (e) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      downAt = null;
      if (moved > 6) return;
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(building.children, true);
      for (const hit of hits) {
        let o = hit.object;
        while (o && !o.userData.floor && !o.userData.unit) o = o.parent;
        if (!o) continue;
        if (o.userData.unit) {
          selectFloor(o.userData.floor, o.userData.unit);
          break;
        }
        if (o.userData.floor) {
          selectFloor(o.userData.floor, null);
          break;
        }
      }
    });

    let selFloor = null;
    let selUnit = null;
    let nightMix = 0;
    let nightTarget = 0;

    function setSelection(floor, unitId) {
      selFloor = floor != null ? String(floor) : null;
      selUnit = unitId || null;
    }
    function setNightState(night) {
      nightTarget = night ? 1 : 0;
    }

    function resize() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(stage);

    let running = true;
    let rafId = 0;
    const clock = new THREE.Clock();

    function animate() {
      const dt = clock.getDelta();
      const time = clock.elapsedTime;

      idle += dt;
      if (!dragging && idle > 3 && !reducedMotion) targetRotY += dt * 0.12;
      rotY += (targetRotY - rotY) * 0.08;
      building.rotation.y = rotY;

      for (let i = 0; i < seaPos.count; i++) {
        const x = seaBase[i * 3];
        const y = seaBase[i * 3 + 1];
        seaPos.array[i * 3 + 2] =
          Math.sin(x * 0.25 + time * 1.1) * 0.18 + Math.cos(y * 0.3 + time * 0.8) * 0.14;
      }
      seaPos.needsUpdate = true;

      nightMix += (nightTarget - nightMix) * 0.05;
      const lerpC = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), nightMix);
      scene.background = lerpC(DAY.sky, NIGHT.sky);
      scene.fog.color = lerpC(DAY.fog, NIGHT.fog);
      hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * nightMix;
      sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * nightMix;
      glassMats.forEach((m) => {
        m.emissive.setHex(0xffca7a);
        m.emissiveIntensity = 0.85 * nightMix;
        m.opacity = 0.55 + 0.25 * nightMix;
      });
      M.pool.emissiveIntensity = 0.4 + 1.2 * nightMix;

      // Exploded floor selection — clear pull-forward so the level “expands”
      Object.entries(floorGroups).forEach(([key, g]) => {
        const on = key === String(selFloor);
        const targetZ = on ? 2.4 : -0.35;
        const baseY = (Number(key) - 1) * 1.6;
        const targetY = on ? baseY + 0.35 : baseY;
        g.position.z += (targetZ - g.position.z) * 0.12;
        g.position.y += (targetY - g.position.y) * 0.12;
        // Dim unselected floors slightly
        g.traverse((obj) => {
          if (!obj.isMesh || !obj.material || !obj.material.color) return;
          if (obj.userData._dimBase == null && obj.material.opacity != null) {
            obj.userData._dimBase = obj.material.opacity;
          }
        });
      });
      Object.entries(unitMeshes).forEach(([id, mesh]) => {
        const base = mesh.userData.baseMat;
        if (!base) return;
        const active = id === selUnit;
        const onFloor = inv() && inv().getUnit(id) && String(inv().getUnit(id).floor) === String(selFloor);
        base.emissiveIntensity = active
          ? 0.55
          : onFloor
            ? inv().getUnit(id).status === 'available'
              ? 0.14
              : inv().getUnit(id).status === 'conditional'
                ? 0.16
                : 0.04
            : 0.02;
        // Pull selected suite farther out
        const s = active ? 1.08 : onFloor ? 1.02 : 1;
        mesh.scale.x += (s - mesh.scale.x) * 0.14;
        mesh.scale.y += (s - mesh.scale.y) * 0.14;
        mesh.scale.z += (s - mesh.scale.z) * 0.14;
      });

      renderer.render(scene, camera);
      if (running) rafId = requestAnimationFrame(animate);
    }

    new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          if (!running) {
            running = true;
            clock.getDelta();
            rafId = requestAnimationFrame(animate);
          }
        } else {
          running = false;
          cancelAnimationFrame(rafId);
        }
      },
      { threshold: 0.02 }
    ).observe(stage);

    rafId = requestAnimationFrame(animate);
    stage.classList.add('is-3d');
    if (fallback) fallback.classList.add('is-replaced');

    three = { setSelection, setNight: setNightState };
    if (isNight) setNightState(true);
    if (selectedFloor) setSelection(selectedFloor, selectedUnit);
  }

  // Default: ground floor overview
  selectFloor(1, null);
})();
