/**
 * Coastline Condos — Explorer section glue for the unified 3D engine.
 *
 * Boots js/coastline3d.js (ES module, three.js from /vendor via import map)
 * into #explorer-stage when the section scrolls near. The SAME instance is
 * portaled into the #model3d-viewer overlay for fullscreen — the small and
 * enlarged views are literally one canvas.
 *
 * Exposes window.CC_MODEL3D for the Design Studio (finishes + walkthrough).
 * Falls back to the static SVG elevation when WebGL/modules are unavailable.
 */
(function () {
  'use strict';

  const section = document.getElementById('explorer');
  if (!section) return;

  const stage = document.getElementById('explorer-stage');
  const fallback = document.getElementById('explorer-fallback');
  const hint = document.getElementById('exp-hint');
  const infoTitle = document.getElementById('exp-info-title');
  const infoDesc = document.getElementById('exp-info-desc');
  const infoCta = document.getElementById('exp-info-cta');
  const walkCta = document.getElementById('exp-walk-cta');
  const unitList = document.getElementById('exp-unit-list');
  const fsBtn = document.getElementById('exp-fullscreen-btn');
  const viewer = document.getElementById('model3d-viewer');
  const viewerClose = document.getElementById('model3d-close');

  const t = (k) => (window.CC && window.CC.t ? window.CC.t(k) : k);
  const lang = () => (window.CC ? window.CC.lang : 'en');
  const inv = () => window.CC_INVENTORY;
  const track = (ev, data) => { if (window.CC && window.CC.track) window.CC.track(ev, data); };

  const FLOOR_META = {
    1: { titleKey: 'exp.f1', descKey: 'exp.f1desc' },
    2: { titleKey: 'exp.f2', descKey: 'exp.f2desc' },
    3: { titleKey: 'exp.f3', descKey: 'exp.f3desc' },
  };

  let model = null;          // engine instance
  let booting = false;
  let bootFailed = false;
  let selectedFloor = null;
  let selectedUnit = null;
  let host = null;           // div the engine renders into (portaled for fullscreen)
  let pendingWalkthrough = null;

  /* ---------------------------- page UI state ---------------------------- */

  function selectFloor(floor, unitId) {
    selectedFloor = floor != null ? String(floor) : null;
    selectedUnit = unitId || null;
    const meta = FLOOR_META[selectedFloor];
    const inventory = inv();
    const L = lang();

    if (infoTitle) infoTitle.textContent = meta ? t(meta.titleKey) : '';

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
        if (walkCta) {
          walkCta.hidden = false;
          walkCta.dataset.unit = u.id;
          walkCta.textContent = t('exp.walkin');
        }
      }
    } else {
      if (infoDesc) infoDesc.textContent = meta ? t(meta.descKey) : t('exp.select');
      if (infoCta) { infoCta.hidden = true; infoCta.dataset.unit = ''; }
      if (walkCta) { walkCta.hidden = true; walkCta.dataset.unit = ''; }
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
    if (model) {
      if (userIntent) model.setUnitsOverlay(true); // reveal status volumes once units matter
      model.selectUnit(selectedUnit);
    }
  }
  let userIntent = false;

  function renderUnitList(floor, activeUnit) {
    if (!unitList) return;
    const inventory = inv();
    if (!inventory || !floor) { unitList.innerHTML = ''; return; }
    const units = inventory.getUnitsByFloor(Number(floor));
    const L = lang();
    unitList.innerHTML = units
      .map((u) => {
        const active = u.id === activeUnit ? ' is-active' : '';
        const price = u.status === 'available'
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

  document.addEventListener('cc:langchange', () => {
    if (selectedFloor) selectFloor(selectedFloor, selectedUnit);
    if (model) model.setLang(lang());
  });

  document.querySelectorAll('.exp-floor-btn').forEach((btn) => {
    btn.addEventListener('click', () => { userIntent = true; selectFloor(btn.dataset.floor, null); });
  });
  document.querySelectorAll('[data-svg-floor]').forEach((el) => {
    el.addEventListener('click', (e) => {
      userIntent = true;
      const unitEl = e.target.closest('[data-svg-unit]');
      if (unitEl) selectFloor(el.dataset.svgFloor, unitEl.dataset.svgUnit);
      else selectFloor(el.dataset.svgFloor, null);
    });
  });
  if (unitList) {
    unitList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-unit]');
      if (!btn) return;
      userIntent = true;
      selectFloor(btn.dataset.floor, btn.dataset.pickUnit);
    });
  }
  if (infoCta) {
    infoCta.addEventListener('click', () => {
      const id = infoCta.dataset.unit;
      if (!id) return;
      if (window.CC_FLOORPLAN) window.CC_FLOORPLAN.open(id);
    });
  }
  if (walkCta) {
    walkCta.addEventListener('click', () => {
      const id = walkCta.dataset.unit;
      if (id) walkthrough(id);
    });
  }

  /* ---------------------------- fullscreen portal ---------------------------- */

  let isFullscreen = false;
  let lastFocus = null;

  function openFullscreen() {
    if (!viewer || !host || isFullscreen) return;
    isFullscreen = true;
    lastFocus = document.activeElement;
    viewer.classList.remove('hidden');
    viewer.removeAttribute('hidden');
    const openIt = () => viewer.classList.add('is-open');
    requestAnimationFrame(openIt);
    setTimeout(openIt, 90); // rAF can be throttled in background/occluded tabs
    viewer.appendChild(host);          // portal: same canvas, same scene
    document.body.style.overflow = 'hidden';
    viewer.classList.add('is-3d-live');
    if (viewerClose) viewerClose.focus();
    track('model3d_open');
  }
  function closeFullscreen() {
    if (!viewer || !isFullscreen) return;
    isFullscreen = false;
    if (model && model.isWalking()) model.exitWalk();
    viewer.classList.remove('is-open');
    document.body.style.overflow = '';
    stage.appendChild(host);           // portal back into the section
    setTimeout(() => {
      viewer.classList.add('hidden');
      viewer.setAttribute('hidden', '');
    }, 350);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }
  fsBtn && fsBtn.addEventListener('click', () => { boot().then(() => openFullscreen()); });
  viewerClose && viewerClose.addEventListener('click', closeFullscreen);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isFullscreen) return;
    // first Escape exits a walkthrough (handled by the engine); second closes
    if (model && model.isWalking()) return;
    closeFullscreen();
  });

  /* ---------------------------- engine boot ---------------------------- */

  function webglOK() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (_) { return false; }
  }

  function boot() {
    if (model) return Promise.resolve(model);
    if (booting) return booting;
    if (bootFailed || !webglOK() || !stage) return Promise.reject(new Error('no-webgl'));

    host = document.createElement('div');
    host.id = 'cc3d-container';
    host.className = 'cc3d-container';
    stage.appendChild(host);

    booting = import('./coastline3d.js')
      .then((mod) => {
        model = mod.createCoastline3D(host, {
          hud: true,
          inventory: window.CC_INVENTORY || null,
          lang: lang(),
          unitsOverlay: false, // washes out the facade — enabled on floor/unit intent
        });
        model.on('unitpick', (u) => {
          selectFloor(u.floor, u.id);
        });
        model.on('walkthrough', (d) => track('walkthrough_start', { unit: d.unit }));
        stage.classList.add('is-3d');
        if (fallback) fallback.classList.add('is-replaced');
        if (hint) hint.textContent = t('exp.hint3d');
        if (pendingWalkthrough) {
          const p = pendingWalkthrough;
          pendingWalkthrough = null;
          model.setFinishes(p.palette, p.flooring);
          model.enterWalkthrough(p.unit);
        }
        return model;
      })
      .catch((err) => {
        console.warn('[Coastline 3D] engine failed, keeping SVG elevation:', err);
        bootFailed = true;
        booting = false;
        if (host) { host.remove(); host = null; }
        throw err;
      });
    return booting;
  }

  /* Walkthrough entry shared with the Design Studio */
  function walkthrough(unitId, finishes) {
    return boot()
      .then(() => {
        openFullscreen();
        if (finishes) model.setFinishes(finishes.palette, finishes.flooring);
        model.enterWalkthrough(unitId);
      })
      .catch(() => {});
  }

  /* Lazy boot when the section approaches */
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    boot().catch(() => {});
  }, { rootMargin: '400px' });
  io.observe(section);

  /* Public API (Design Studio + debug) */
  window.CC_MODEL3D = {
    boot,
    walkthrough,
    setFinishes: (p, f) => { if (model) model.setFinishes(p, f); },
    openFullscreen: () => boot().then(openFullscreen),
    closeFullscreen,
    get instance() { return model; },
  };

  // Default state: ground floor overview
  selectFloor(1, null);
})();
