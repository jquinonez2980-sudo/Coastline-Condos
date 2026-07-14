/**
 * Coastline Condos — Interactive floor plan viewer
 * 2D SVG (pan / zoom / room hotspots) + 2.5D Three.js extruded view
 */
(function () {
  'use strict';

  const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const INV = () => window.CC_INVENTORY;
  const t = (k) => (window.CC && window.CC.t ? window.CC.t(k) : k);
  const lang = () => (window.CC ? window.CC.lang : 'en');

  const KIND_FILL = {
    bed: 'rgba(47, 143, 138, 0.14)',
    living: 'rgba(168, 121, 47, 0.12)',
    kitchen: 'rgba(201, 113, 79, 0.12)',
    bath: 'rgba(30, 78, 78, 0.08)',
    terrace: 'rgba(57, 182, 216, 0.18)',
    hall: 'rgba(30, 78, 78, 0.04)',
    service: 'rgba(30, 78, 78, 0.06)',
  };

  let state = {
    unitId: null,
    mode: '2d', // '2d' | '3d'
    zoom: 1,
    panX: 0,
    panY: 0,
    activeRoom: null,
    three: null,
  };

  function $(s, c = document) {
    return c.querySelector(s);
  }

  let lastFocus = null;

  function openUnit(unitId) {
    const inv = INV();
    if (!inv) return;
    const unit = inv.getUnit(unitId);
    if (!unit) return;
    lastFocus = document.activeElement;
    state.unitId = unit.id;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.activeRoom = null;
    state.mode = '2d';

    const viewer = $('#floorplan-viewer');
    if (!viewer) return;

    renderMeta(unit);
    render2D(unit);
    setMode('2d');
    dispose3D();

    viewer.classList.remove('hidden');
    viewer.removeAttribute('hidden');
    requestAnimationFrame(() => viewer.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    const closeBtn = $('#fp-close');
    closeBtn && closeBtn.focus();
  }

  function close() {
    const viewer = $('#floorplan-viewer');
    if (!viewer) return;
    viewer.classList.remove('is-open');
    document.body.style.overflow = '';
    dispose3D();
    setTimeout(() => {
      viewer.classList.add('hidden');
      viewer.setAttribute('hidden', '');
    }, 350);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function renderMeta(unit) {
    const inv = INV();
    const L = lang();
    const title = $('#fp-title');
    const sub = $('#fp-subtitle');
    const features = $('#fp-features');
    const badge = $('#fp-status');
    const priceEl = $('#fp-price');
    const inquire = $('#fp-inquire');

    if (title) title.textContent = L === 'es' ? `Unidad ${unit.id}` : `Unit ${unit.id}`;
    if (sub) {
      sub.textContent = [
        inv.unitTypeLine(unit, L),
        inv.floorLabel(unit.floor, L),
        inv.formatM2(unit.totalM2) + ' total',
      ].join(' · ');
    }
    if (badge) {
      badge.textContent = inv.statusLabel(unit.status, L);
      badge.className = 'unit-badge fp-status-badge status-' + unit.status;
    }
    if (priceEl) {
      if (unit.status === 'available') {
        priceEl.hidden = false;
        priceEl.textContent = inv.formatPrice(unit.price, L);
      } else {
        priceEl.hidden = true;
      }
    }
    if (features) {
      features.innerHTML = '';
      inv.unitFeatures(unit, L).forEach((f) => {
        const li = document.createElement('li');
        li.textContent = '· ' + f;
        features.appendChild(li);
      });
    }
    if (inquire) {
      inquire.dataset.unit = unit.id;
      inquire.hidden = false;
      if (unit.status === 'sold') {
        // Sold: offer the waitlist over WhatsApp instead of a dead end
        const msg = lang() === 'es'
          ? `Hola, la unidad ${unit.id} está vendida — quiero unirme a la lista de espera por una unidad similar en Coastline Condos.`
          : `Hi, unit ${unit.id} is sold — I'd like to join the waitlist for a similar unit at Coastline Condos.`;
        inquire.href = `https://wa.me/593969943941?text=${encodeURIComponent(msg)}`;
        inquire.target = '_blank';
        inquire.rel = 'noopener';
        inquire.textContent = t('fp.waitlist');
      } else {
        inquire.href = '#contact';
        inquire.removeAttribute('target');
        inquire.removeAttribute('rel');
        inquire.textContent = t('res.inquire');
      }
    }
    const download = $('#fp-download');
    if (download) {
      const PLAN_PDF = {
        pb: 'assets/plans/planta-baja.pdf',
        p1: 'assets/plans/planta-1er-piso.pdf',
        p2: 'assets/plans/planta-2do-piso.pdf',
      };
      download.href = PLAN_PDF[unit.floorKey] || PLAN_PDF.pb;
      download.textContent = t('fp.download');
    }

    // Mode toggle labels
    const m2d = $('#fp-mode-2d');
    const m3d = $('#fp-mode-3d');
    if (m2d) m2d.textContent = t('fp.mode2d');
    if (m3d) m3d.textContent = t('fp.mode3d');
    const roomHint = $('#fp-room-hint');
    if (roomHint) roomHint.textContent = t('fp.roomhint');
  }

  function render2D(unit) {
    const inv = INV();
    const layout = inv.getLayout(unit.layout);
    const svg = $('#fp-svg');
    const stage = $('#fp-2d-stage');
    if (!svg || !layout) return;

    const [vx, vy, vw, vh] = layout.viewBox;
    // Padding for the dimension strips around the meter-accurate plan
    const PAD = 34;
    svg.setAttribute('viewBox', `${vx - PAD} ${vy - PAD} ${vw + PAD * 2} ${vh + PAD * 2 + 14}`);
    svg.innerHTML = '';

    // Soft background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', vx - 6);
    bg.setAttribute('y', vy - 6);
    bg.setAttribute('width', vw + 12);
    bg.setAttribute('height', vh + 12);
    bg.setAttribute('fill', 'rgba(255,255,255,0.35)');
    bg.setAttribute('rx', '8');
    svg.appendChild(bg);

    const gRooms = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gRooms.setAttribute('class', 'fp-rooms');
    svg.appendChild(gRooms);

    layout.rooms.forEach((room) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'fp-room');
      g.setAttribute('data-room', room.id);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      const label = room.label[lang()] || room.label.en;
      g.setAttribute('aria-label', label);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', room.x);
      rect.setAttribute('y', room.y);
      rect.setAttribute('width', room.w);
      rect.setAttribute('height', room.h);
      rect.setAttribute('rx', room.kind === 'terrace' ? 6 : 3);
      rect.setAttribute('fill', KIND_FILL[room.kind] || KIND_FILL.hall);
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('stroke-opacity', '0.45');
      g.appendChild(rect);

      if (room.kind === 'terrace') {
        // Tile hatch suggestion
        const hatch = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        hatch.setAttribute('x', room.x + 4);
        hatch.setAttribute('y', room.y + 4);
        hatch.setAttribute('width', Math.max(0, room.w - 8));
        hatch.setAttribute('height', Math.max(0, room.h - 8));
        hatch.setAttribute('fill', 'none');
        hatch.setAttribute('stroke', 'rgba(57,182,216,0.35)');
        hatch.setAttribute('stroke-width', '1');
        hatch.setAttribute('stroke-dasharray', '4 3');
        hatch.setAttribute('rx', '4');
        g.appendChild(hatch);
      }

      // Label (skipped on closet-sized rooms — the tooltip still names them)
      if (room.w >= 44 && room.h >= 28) {
        const hasArea = room.areaM2 && room.w >= 80 && room.h >= 58;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', room.x + room.w / 2);
        text.setAttribute('y', room.y + room.h / 2 + (hasArea ? -2 : 4));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'fp-room-label');
        text.setAttribute('fill', 'currentColor');
        text.setAttribute('font-size', room.w < 70 ? '9' : '12');
        text.setAttribute('font-weight', '500');
        text.setAttribute('pointer-events', 'none');
        text.textContent = label;
        g.appendChild(text);
        if (hasArea) {
          const area = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          area.setAttribute('x', room.x + room.w / 2);
          area.setAttribute('y', room.y + room.h / 2 + 12);
          area.setAttribute('text-anchor', 'middle');
          area.setAttribute('fill', 'currentColor');
          area.setAttribute('font-size', '9');
          area.setAttribute('opacity', '0.6');
          area.setAttribute('pointer-events', 'none');
          area.textContent = room.areaM2.toFixed(1).replace(/\.0$/, '') + ' m²';
          g.appendChild(area);
        }
      }

      const activate = () => {
        state.activeRoom = room.id;
        gRooms.querySelectorAll('.fp-room').forEach((el) => el.classList.toggle('is-active', el === g));
        const tip = $('#fp-room-tip');
        if (tip) {
          tip.hidden = false;
          tip.textContent = room.mw
            ? `${label} · ${room.mw.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} × ${room.mh.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} m · ${room.areaM2.toFixed(1)} m²`
            : label;
        }
      };
      g.addEventListener('mouseenter', activate);
      g.addEventListener('focus', activate);
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        activate();
      });

      gRooms.appendChild(g);
    });

    // Outer shell
    const shell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    shell.setAttribute('x', vx);
    shell.setAttribute('y', vy);
    shell.setAttribute('width', vw);
    shell.setAttribute('height', vh);
    shell.setAttribute('fill', 'none');
    shell.setAttribute('stroke', 'currentColor');
    shell.setAttribute('stroke-width', '2');
    shell.setAttribute('stroke-opacity', '0.25');
    shell.setAttribute('rx', '4');
    shell.setAttribute('pointer-events', 'none');
    svg.appendChild(shell);

    // True dimension strips (from the meter-space layout)
    if (layout.meters) {
      const [mw, mh] = layout.meters;
      const dims = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      dims.setAttribute('pointer-events', 'none');
      dims.setAttribute('stroke', 'currentColor');
      dims.setAttribute('stroke-opacity', '0.4');
      dims.setAttribute('fill', 'currentColor');

      function dimLine(x1, y1, x2, y2) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1);
        l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        dims.appendChild(l);
      }
      function dimText(x, y, str, rotate) {
        const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tx.setAttribute('x', x); tx.setAttribute('y', y);
        tx.setAttribute('text-anchor', 'middle');
        tx.setAttribute('font-size', '10');
        tx.setAttribute('stroke', 'none');
        tx.setAttribute('opacity', '0.75');
        if (rotate) tx.setAttribute('transform', `rotate(-90 ${x} ${y})`);
        tx.textContent = str;
        dims.appendChild(tx);
      }
      const fmt = (m) => m.toFixed(2).replace(/0$/, '') + ' m';
      // Top: overall width
      dimLine(vx, vy - 16, vx + vw, vy - 16);
      dimLine(vx, vy - 21, vx, vy - 11);
      dimLine(vx + vw, vy - 21, vx + vw, vy - 11);
      dimText(vx + vw / 2, vy - 21, fmt(mw));
      // Left: overall depth
      dimLine(vx - 16, vy, vx - 16, vy + vh);
      dimLine(vx - 21, vy, vx - 11, vy);
      dimLine(vx - 21, vy + vh, vx - 11, vy + vh);
      dimText(vx - 21, vy + vh / 2, fmt(mh), true);
      svg.appendChild(dims);

      // Ocean-side indicator under the terrace edge
      const front = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      front.setAttribute('x', vx + vw / 2);
      front.setAttribute('y', vy + vh + 22);
      front.setAttribute('text-anchor', 'middle');
      front.setAttribute('font-size', '11');
      front.setAttribute('fill', 'currentColor');
      front.setAttribute('opacity', '0.55');
      front.setAttribute('letter-spacing', '2');
      front.setAttribute('pointer-events', 'none');
      front.textContent = '▿ ' + t('fp.front') + ' ▿';
      svg.appendChild(front);
    }

    applyTransform();
    if (stage) stage.hidden = false;
    const c3d = $('#fp-3d-canvas');
    if (c3d) c3d.hidden = true;
  }

  function applyTransform() {
    const svg = $('#fp-svg');
    const zoomLabel = $('#fp-zoom-label');
    if (svg) {
      svg.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }
    if (zoomLabel) zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  }

  function setMode(mode) {
    state.mode = mode;
    const m2d = $('#fp-mode-2d');
    const m3d = $('#fp-mode-3d');
    m2d && m2d.classList.toggle('is-active', mode === '2d');
    m3d && m3d.classList.toggle('is-active', mode === '3d');
    m2d && m2d.setAttribute('aria-pressed', mode === '2d' ? 'true' : 'false');
    m3d && m3d.setAttribute('aria-pressed', mode === '3d' ? 'true' : 'false');

    const stage = $('#fp-2d-stage');
    const c3d = $('#fp-3d-canvas');
    const zoomCtrls = $('#fp-zoom-controls');

    if (mode === '2d') {
      if (stage) stage.hidden = false;
      if (c3d) c3d.hidden = true;
      if (zoomCtrls) zoomCtrls.hidden = false;
      dispose3D();
      const unit = INV().getUnit(state.unitId);
      if (unit) render2D(unit);
    } else {
      if (stage) stage.hidden = true;
      if (c3d) c3d.hidden = false;
      if (zoomCtrls) zoomCtrls.hidden = true;
      boot3D().catch((err) => {
        console.warn('[Coastline Floorplan 2.5D]', err);
        setMode('2d');
      });
    }
  }

  function dispose3D() {
    if (!state.three) return;
    try {
      state.three.dispose();
    } catch (_) { /* ignore */ }
    state.three = null;
    const host = $('#fp-3d-canvas');
    if (host) host.innerHTML = '';
  }

  async function boot3D() {
    const unit = INV().getUnit(state.unitId);
    const layout = unit && INV().getLayout(unit.layout);
    const host = $('#fp-3d-canvas');
    if (!unit || !layout || !host) throw new Error('no-unit');

    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no-webgl');

    dispose3D();
    host.innerHTML = '';
    const THREE = await import(THREE_CDN);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.classList.add('fp-webgl');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    // Frame the camera to the unit's actual size (layouts are meter-scaled)
    const span = Math.max(layout.viewBox[2], layout.viewBox[3]) * 0.04;
    camera.position.set(0, span * 1.05, span * 1.25);
    camera.lookAt(0, 0.6, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xfff2dd, 1.1);
    dir.position.set(12, 24, 10);
    scene.add(dir);

    const root = new THREE.Group();
    scene.add(root);

    const [, , vw, vh] = layout.viewBox;
    const scale = 0.04;
    const cx = vw / 2;
    const cy = vh / 2;
    const wx = (px) => (px - cx) * scale;
    const wz = (py) => (py - cy) * scale;
    const PXM = layout.pxPerM || 30;          // px per meter
    const DOOR = 0.9 * PXM;                   // 0.9 m door leaf
    const EPS = 1.5;                          // px tolerance for shared edges

    const rooms = layout.rooms;
    const interior = rooms.filter((r) => r.kind !== 'terrace');
    const terraces = rooms.filter((r) => r.kind === 'terrace');

    // Envelope = bounding box of the interior rooms (the built volume)
    let ex0 = Infinity, ey0 = Infinity, ex1 = -Infinity, ey1 = -Infinity;
    interior.forEach((r) => {
      ex0 = Math.min(ex0, r.x); ey0 = Math.min(ey0, r.y);
      ex1 = Math.max(ex1, r.x + r.w); ey1 = Math.max(ey1, r.y + r.h);
    });

    const wallH = 2.4;
    const wallT = 0.09;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x9cccdf, transparent: true, opacity: 0.4, roughness: 0.12, metalness: 0.3,
    });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x333638, roughness: 0.4, metalness: 0.6 });
    const KIND_TINT = {
      bed: 0xbfe0da, living: 0xe6d9be, kitchen: 0xe9ccba,
      bath: 0xd7e2e6, hall: 0xece7db, service: 0xdfd9cd, terrace: 0xcfe6d8,
    };

    // Floor plate under the envelope
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry((ex1 - ex0) * scale + 0.25, 0.15, (ey1 - ey0) * scale + 0.25),
      new THREE.MeshStandardMaterial({ color: 0xe8dfd0, roughness: 0.9 })
    );
    plate.position.set(wx((ex0 + ex1) / 2), -0.02, wz((ey0 + ey1) / 2));
    root.add(plate);

    // Room floor tints (+ terrace deck slabs and rails)
    rooms.forEach((room, i) => {
      const isTerrace = room.kind === 'terrace';
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(room.w * scale - 0.015, isTerrace ? 0.1 : 0.05, room.h * scale - 0.015),
        new THREE.MeshStandardMaterial({ color: KIND_TINT[room.kind] || 0xece7db, roughness: 0.9 })
      );
      slab.position.set(wx(room.x + room.w / 2), 0.09 + i * 0.0006, wz(room.y + room.h / 2));
      slab.userData.room = room.id;
      root.add(slab);

      if (isTerrace) {
        // Rail on terrace edges that don't touch the built envelope
        const edges = [
          { x: room.x + room.w / 2, z: room.y, len: room.w, horiz: true, touch: Math.abs(room.y - ey1) < EPS },
          { x: room.x + room.w / 2, z: room.y + room.h, len: room.w, horiz: true, touch: false },
          { x: room.x, z: room.y + room.h / 2, len: room.h, horiz: false, touch: Math.abs(room.x - ex1) < EPS },
          { x: room.x + room.w, z: room.y + room.h / 2, len: room.h, horiz: false, touch: false },
        ];
        edges.forEach((e) => {
          if (e.touch) return;
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(e.horiz ? e.len * scale : 0.045, 0.06, e.horiz ? 0.045 : e.len * scale),
            railMat
          );
          bar.position.set(wx(e.x), 0.62, wz(e.z));
          root.add(bar);
          const mid = new THREE.Mesh(
            new THREE.BoxGeometry(e.horiz ? e.len * scale : 0.03, 0.03, e.horiz ? 0.03 : e.len * scale),
            railMat
          );
          mid.position.set(wx(e.x), 0.36, wz(e.z));
          root.add(mid);
        });
      }
    });

    /* ---- walls ---- */
    const OPEN = { living: 1, kitchen: 1, hall: 1 }; // open-plan kinds (dining uses 'living')

    function wallSeg(x0p, z0p, x1p, z1p, horiz) {
      const len = (horiz ? x1p - x0p : z1p - z0p) * scale;
      if (len <= 0.02) return;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(horiz ? len : wallT, wallH, horiz ? wallT : len),
        wallMat
      );
      m.position.set(wx((x0p + x1p) / 2), wallH / 2 + 0.08, wz((z0p + z1p) / 2));
      m.castShadow = true;
      root.add(m);
    }

    // Wall along a shared edge with a centered door gap
    function wallWithDoor(a0, a1, fixed, horiz, withDoor) {
      if (withDoor && a1 - a0 >= DOOR + 14) {
        const mid = (a0 + a1) / 2;
        if (horiz) {
          wallSeg(a0, fixed, mid - DOOR / 2, fixed, true);
          wallSeg(mid + DOOR / 2, fixed, a1, fixed, true);
        } else {
          wallSeg(fixed, a0, fixed, mid - DOOR / 2, false);
          wallSeg(fixed, mid + DOOR / 2, fixed, a1, false);
        }
      } else if (horiz) {
        wallSeg(a0, fixed, a1, fixed, true);
      } else {
        wallSeg(fixed, a0, fixed, a1, false);
      }
    }

    // Interior walls from room adjacency
    for (let i = 0; i < interior.length; i++) {
      for (let j = 0; j < interior.length; j++) {
        if (i === j) continue;
        const a = interior[i], b = interior[j];
        const bothOpen = OPEN[a.kind] && OPEN[b.kind];
        // a's right edge against b's left edge
        if (Math.abs(a.x + a.w - b.x) < EPS) {
          const o0 = Math.max(a.y, b.y), o1 = Math.min(a.y + a.h, b.y + b.h);
          if (o1 - o0 > 10 && !bothOpen) wallWithDoor(o0, o1, a.x + a.w, false, true);
        }
        // a's bottom edge against b's top edge (matches once per pair: a above b)
        if (Math.abs(a.y + a.h - b.y) < EPS) {
          const o0 = Math.max(a.x, b.x), o1 = Math.min(a.x + a.w, b.x + b.w);
          if (o1 - o0 > 10 && !bothOpen) wallWithDoor(o0, o1, a.y + a.h, true, true);
        }
      }
    }

    // Perimeter walls; glass where a terrace adjoins the facade
    function boundary(a0, a1, fixed, horiz, edgeKey) {
      // find terrace spans adjoining this edge from outside
      const spans = [];
      terraces.forEach((tr) => {
        let touches = false, s0, s1;
        if (horiz) {
          touches = Math.abs(tr.y - fixed) < EPS || Math.abs(tr.y + tr.h - fixed) < EPS;
          s0 = Math.max(a0, tr.x); s1 = Math.min(a1, tr.x + tr.w);
        } else {
          touches = Math.abs(tr.x - fixed) < EPS || Math.abs(tr.x + tr.w - fixed) < EPS;
          s0 = Math.max(a0, tr.y); s1 = Math.min(a1, tr.y + tr.h);
        }
        if (touches && s1 - s0 > 10) spans.push([s0, s1]);
      });
      spans.sort((p, q) => p[0] - q[0]);
      let cur = a0;
      spans.forEach(([s0, s1]) => {
        if (s0 > cur) {
          if (horiz) wallSeg(cur, fixed, s0, fixed, true);
          else wallSeg(fixed, cur, fixed, s0, false);
        }
        // glass slider across the terrace span
        const len = (s1 - s0) * scale;
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(horiz ? len : wallT * 0.7, wallH * 0.92, horiz ? wallT * 0.7 : len),
          glassMat
        );
        glass.position.set(
          horiz ? wx((s0 + s1) / 2) : wx(fixed),
          (wallH * 0.92) / 2 + 0.08,
          horiz ? wz(fixed) : wz((s0 + s1) / 2)
        );
        root.add(glass);
        cur = s1;
      });
      if (cur < a1) horiz ? wallSeg(cur, fixed, a1, fixed, true) : wallSeg(fixed, cur, fixed, a1, false);
    }

    boundary(ex0, ex1, ey0, true);   // rear
    boundary(ex0, ex1, ey1, true);   // facade (terrace side → glass)
    boundary(ey0, ey1, ex0, false);  // left
    boundary(ey0, ey1, ex1, false);  // right (302: glass at wrap terrace)

    // Floating room labels
    function labelSprite(text) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const g = c.getContext('2d');
      g.font = '600 26px Poppins, system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(20,40,40,0.82)';
      const w = Math.min(244, g.measureText(text).width + 26);
      g.beginPath();
      g.roundRect(128 - w / 2, 8, w, 48, 12);
      g.fill();
      g.fillStyle = '#f7f3ea';
      g.fillText(text, 128, 34);
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sp.scale.set(1.7, 0.42, 1);
      return sp;
    }
    const L = lang();
    rooms.forEach((room) => {
      if (room.w < 55 || room.h < 34) return;
      if (room.kind === 'bath' || room.kind === 'service') return;
      const sp = labelSprite(room.label[L] || room.label.en);
      sp.position.set(wx(room.x + room.w / 2), room.kind === 'terrace' ? 0.95 : wallH + 0.42, wz(room.y + room.h / 2));
      root.add(sp);
    });

    root.rotation.x = -0.12;

    function resize() {
      const w = host.clientWidth || 480;
      const h = host.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    let rotY = 0.35;
    let targetRot = 0.35;
    let dragging = false;
    let lastX = 0;
    let raf = 0;
    let running = true;

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      targetRot += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
    });
    const stop = () => {
      dragging = false;
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);

    function animate() {
      rotY += (targetRot - rotY) * 0.08;
      if (!dragging) targetRot += 0.002;
      root.rotation.y = rotY;
      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    state.three = {
      dispose() {
        running = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.dispose();
        host.innerHTML = '';
      },
    };
  }

  function init() {
    const viewer = $('#floorplan-viewer');
    if (!viewer || !INV()) return;

    // Delegate open from unit cards / explorer
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.unit-card[data-unit]');
      if (card && !e.target.closest('a')) {
        e.preventDefault();
        openUnit(card.dataset.unit);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest && e.target.closest('.unit-card[data-unit]');
      if (card) {
        e.preventDefault();
        openUnit(card.dataset.unit);
      }
    });

    $('#fp-close') && $('#fp-close').addEventListener('click', close);
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && viewer.classList.contains('is-open')) close();
    });

    // Focus trap while the dialog is open
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !viewer.classList.contains('is-open')) return;
      const focusables = Array.from(
        viewer.querySelectorAll('button, a[href], select, input, [tabindex="0"]')
      ).filter((el) => !el.hidden && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!viewer.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    });

    $('#fp-mode-2d') &&
      $('#fp-mode-2d').addEventListener('click', () => setMode('2d'));
    $('#fp-mode-3d') &&
      $('#fp-mode-3d').addEventListener('click', () => setMode('3d'));

    $('#fp-zoom-in') &&
      $('#fp-zoom-in').addEventListener('click', () => {
        state.zoom = Math.min(2.4, state.zoom + 0.15);
        applyTransform();
      });
    $('#fp-zoom-out') &&
      $('#fp-zoom-out').addEventListener('click', () => {
        state.zoom = Math.max(0.6, state.zoom - 0.15);
        applyTransform();
      });
    $('#fp-zoom-reset') &&
      $('#fp-zoom-reset').addEventListener('click', () => {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
        applyTransform();
      });

    // Pan + pinch-zoom on 2D stage (multi-pointer aware)
    const stage = $('#fp-2d-stage');
    if (stage) {
      const pointers = new Map();
      let pinchDist = 0;
      let lx = 0;
      let ly = 0;
      stage.style.touchAction = 'none';
      stage.addEventListener('pointerdown', (e) => {
        if (state.mode !== '2d') return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        lx = e.clientX;
        ly = e.clientY;
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        }
        stage.setPointerCapture(e.pointerId);
      });
      stage.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDist > 0) {
            state.zoom = Math.min(2.4, Math.max(0.6, state.zoom * (d / pinchDist)));
            applyTransform();
          }
          pinchDist = d;
          return;
        }
        state.panX += e.clientX - lx;
        state.panY += e.clientY - ly;
        lx = e.clientX;
        ly = e.clientY;
        applyTransform();
      });
      const lift = (e) => {
        pointers.delete(e.pointerId);
        pinchDist = 0;
        const rest = [...pointers.values()][0];
        if (rest) { lx = rest.x; ly = rest.y; }
      };
      stage.addEventListener('pointerup', lift);
      stage.addEventListener('pointercancel', lift);
      stage.addEventListener(
        'wheel',
        (e) => {
          if (state.mode !== '2d') return;
          e.preventDefault();
          state.zoom = Math.min(2.4, Math.max(0.6, state.zoom + (e.deltaY > 0 ? -0.08 : 0.08)));
          applyTransform();
        },
        { passive: false }
      );
    }

    const inquire = $('#fp-inquire');
    if (inquire) {
      inquire.addEventListener('click', () => {
        // Waitlist (sold) opens WhatsApp in a new tab; just close the modal
        if (inquire.target === '_blank') {
          close();
          return;
        }
        const unitId = inquire.dataset.unit;
        const sel = $('#unit');
        if (sel && unitId) sel.value = unitId;
        close();
      });
    }

    document.addEventListener('cc:langchange', () => {
      if (state.unitId && viewer.classList.contains('is-open')) {
        const unit = INV().getUnit(state.unitId);
        if (unit) {
          renderMeta(unit);
          if (state.mode === '2d') render2D(unit);
        }
      }
    });

    // Public API
    window.CC_FLOORPLAN = { open: openUnit, close };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
