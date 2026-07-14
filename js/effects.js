/**
 * Coastline Condos — Cinematic effects layer
 * Ocean wave canvas · scroll progress · count-up stats · 3D tilt cards ·
 * magnetic buttons · cursor aura · drag-to-look panorama
 *
 * Zero dependencies. Every effect respects prefers-reduced-motion and
 * pauses when off-screen / tab hidden, so Core Web Vitals stay green.
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ========================================================================
     1) Scroll progress bar (thin champagne line under the header)
     ======================================================================== */
  function initScrollProgress() {
    const bar = $('#scroll-progress');
    if (!bar) return;
    let ticking = false;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ========================================================================
     2) Living ocean — layered gradient waves + light sparkles on canvas.
        Sits between the hero gradient and the dark overlay, so it reads as
        a slow, luminous sea even before the real drone video is added.
     ======================================================================== */
  function initOceanCanvas() {
    const canvas = $('#ocean-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = !!(conn && conn.saveData);
    const isNarrow = window.matchMedia('(max-width: 900px)').matches;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    // Skip canvas entirely on mobile / save-data — main-thread + GPU cost in PSI
    if (saveData || isNarrow || isCoarse || reducedMotion) {
      canvas.style.display = 'none';
      return;
    }

    let w = 0, h = 0, dpr = 1, t = 0, running = false, rafId = 0;
    // Fewer particles + lower DPR on mobile = less main-thread & GPU work
    const mobileLite = isNarrow || window.matchMedia('(pointer: coarse)').matches;
    const sparkCount = mobileLite ? 14 : 42;
    const stepX = mobileLite ? 12 : 6;
    const maxDpr = mobileLite ? 1 : 2;
    let lastFrame = 0;
    const minFrameMs = mobileLite ? 1000 / 24 : 0; // ~24fps on phones

    const sparks = Array.from({ length: sparkCount }, () => ({
      x: Math.random(), y: 0.55 + Math.random() * 0.4,
      r: 0.6 + Math.random() * 1.6, p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 0.8,
    }));

    function resize() {
      dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // One wave band: a slow travelling sine ridge filled to the bottom.
    function wave(baseY, amp, len, speed, color) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += stepX) {
        const y = baseY
          + Math.sin((x / len) + t * speed) * amp
          + Math.sin((x / (len * 0.53)) - t * speed * 1.4) * amp * 0.45;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function frame(now) {
      if (minFrameMs && now - lastFrame < minFrameMs) {
        if (running) rafId = requestAnimationFrame(frame);
        return;
      }
      lastFrame = now || 0;

      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, w, h);

      const horizon = h * 0.52;
      // Moon-lit vs sun-lit water tints
      const tints = dark
        ? ['rgba(86,150,146,0.16)', 'rgba(58,118,114,0.22)', 'rgba(24,72,70,0.30)']
        : ['rgba(96,168,162,0.20)', 'rgba(58,128,124,0.24)', 'rgba(22,84,82,0.30)'];

      wave(horizon + h * 0.06, h * 0.012, 240, 0.5, tints[0]);
      wave(horizon + h * 0.14, h * 0.018, 190, 0.75, tints[1]);
      if (!mobileLite) {
        wave(horizon + h * 0.24, h * 0.026, 150, 1.05, tints[2]);
      }

      // Glitter path (sun/moon reflection on the water)
      const gx = w * 0.5;
      for (const sp of sparks) {
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * sp.s + sp.p));
        const x = gx + (sp.x - 0.5) * w * (0.16 + (sp.y - 0.55) * 0.9);
        const y = horizon + (sp.y - 0.5) * h * 0.8;
        if (y < horizon) continue;
        ctx.beginPath();
        ctx.arc(x, y, sp.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(200,225,255,${0.35 * tw})`
          : `rgba(255,236,200,${0.45 * tw})`;
        ctx.fill();
      }

      t += mobileLite ? 0.022 : 0.016;
      if (running) rafId = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(rafId); }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    if (reducedMotion) { frame(0); return; } // single static frame

    // Only animate while the hero is on screen and the tab is visible.
    new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop()), { threshold: 0.02 })
      .observe(canvas);
    document.addEventListener('visibilitychange', () =>
      document.hidden ? stop() : start());
  }

  /* ========================================================================
     3) Count-up statistics (1 block · 3 stories · 360° · 24/7)
     ======================================================================== */
  function initCountUp() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      if (reducedMotion) { el.textContent = target; return; }
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
  }

  /* ========================================================================
     4) 3D tilt on unit cards (desktop only, subtle)
     ======================================================================== */
  function initTilt() {
    if (reducedMotion || !finePointer) return;
    $$('.unit-card, .cfg-preview-frame').forEach((card) => {
      let raf = 0;
      card.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
          const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.style.transform = '';
      });
    });
  }

  /* ========================================================================
     5) Magnetic primary buttons (desktop only)
     ======================================================================== */
  function initMagnetic() {
    if (reducedMotion || !finePointer) return;
    $$('.btn-primary').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.setProperty('--mx', `${x * 8}px`);
        btn.style.setProperty('--my', `${y * 6}px`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  /* ========================================================================
     6) Cursor aura — soft champagne glow that trails the pointer (desktop)
     ======================================================================== */
  function initCursorAura() {
    if (reducedMotion || !finePointer) return;
    const aura = document.createElement('div');
    aura.id = 'cursor-aura';
    aura.setAttribute('aria-hidden', 'true');
    document.body.appendChild(aura);
    let x = -200, y = -200, ax = x, ay = y, visible = false;
    document.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!visible) { visible = true; aura.style.opacity = '1'; }
    });
    document.addEventListener('pointerleave', () => {
      visible = false; aura.style.opacity = '0';
    });
    (function loop() {
      ax += (x - ax) * 0.12; ay += (y - ay) * 0.12;
      aura.style.transform = `translate(${ax}px, ${ay}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ========================================================================
     7) Drag-to-look panorama (Virtual Tour section)
        Renders a procedural Playas seascape 3× the viewport width and pans
        it with pointer drag + inertia. To use a REAL 360 photo, just set
        data-pano-src="assets/images/pano.jpg" on #pano-canvas — the image
        replaces the procedural scene automatically.
     ======================================================================== */
  function initPanorama() {
    const canvas = $('#pano-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1;
    let offset = 0, vel = 0, dragging = false, lastX = 0;
    let scene = null, sceneW = 0, running = false, rafId = 0, t = 0;
    let panoImg = null;

    const src = canvas.dataset.panoSrc;
    if (src) {
      const img = new Image();
      img.onload = () => { panoImg = img; };
      img.src = src;
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildScene();
    }

    // Pre-render the wide seascape once (sky, sun, ocean, beach, palms).
    function buildScene() {
      sceneW = w * 3;
      scene = document.createElement('canvas');
      scene.width = Math.round(sceneW * dpr);
      scene.height = Math.round(h * dpr);
      const c = scene.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      const horizon = h * 0.48;
      const sky = c.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#0b3a5e');
      sky.addColorStop(0.55, '#2678a8');
      sky.addColorStop(1, '#f0b06a');
      c.fillStyle = sky;
      c.fillRect(0, 0, sceneW, horizon);

      // Sun
      const sx = sceneW * 0.5, sy = horizon - h * 0.08;
      const glow = c.createRadialGradient(sx, sy, 4, sx, sy, h * 0.3);
      glow.addColorStop(0, 'rgba(255,220,160,0.95)');
      glow.addColorStop(1, 'rgba(255,190,120,0)');
      c.fillStyle = glow;
      c.fillRect(sx - h * 0.3, sy - h * 0.3, h * 0.6, h * 0.6);
      c.beginPath(); c.arc(sx, sy, h * 0.045, 0, Math.PI * 2);
      c.fillStyle = '#ffe6b8'; c.fill();

      // Ocean
      const sea = c.createLinearGradient(0, horizon, 0, h * 0.85);
      sea.addColorStop(0, '#c98d52');
      sea.addColorStop(0.12, '#1d6a96');
      sea.addColorStop(1, '#0c3d63');
      c.fillStyle = sea;
      c.fillRect(0, horizon, sceneW, h * 0.85 - horizon);

      // Wave streaks
      c.strokeStyle = 'rgba(255,255,255,0.10)';
      for (let i = 0; i < 90; i++) {
        const y = horizon + Math.pow(Math.random(), 1.6) * (h * 0.85 - horizon);
        const len = 20 + Math.random() * 120 * ((y - horizon) / (h * 0.4) + 0.2);
        const x = Math.random() * sceneW;
        c.lineWidth = 0.5 + (y - horizon) / (h * 0.3);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
      }

      // Beach
      const sand = c.createLinearGradient(0, h * 0.82, 0, h);
      sand.addColorStop(0, '#e8d5b0');
      sand.addColorStop(1, '#c9a86c');
      c.fillStyle = sand;
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= sceneW; x += 40) {
        c.lineTo(x, h * 0.85 + Math.sin(x / 300) * h * 0.02);
      }
      c.lineTo(sceneW, h); c.closePath(); c.fill();

      // Palm silhouettes
      c.fillStyle = 'rgba(8,30,48,0.85)';
      [0.12, 0.3, 0.72, 0.9, 1.55, 1.78, 2.3, 2.62].forEach((px, i) => {
        const bx = sceneW * (px / 3), by = h * 0.9, ph = h * (0.16 + (i % 3) * 0.03);
        c.save(); c.translate(bx, by);
        c.beginPath(); // trunk
        c.moveTo(0, 0);
        c.quadraticCurveTo(ph * 0.18, -ph * 0.55, ph * 0.1, -ph);
        c.lineTo(ph * 0.14, -ph);
        c.quadraticCurveTo(ph * 0.24, -ph * 0.5, ph * 0.07, 0);
        c.fill();
        for (let f = 0; f < 6; f++) { // fronds
          const a = (f / 6) * Math.PI * 1.5 - Math.PI * 1.25;
          c.beginPath();
          c.moveTo(ph * 0.12, -ph);
          c.quadraticCurveTo(
            ph * 0.12 + Math.cos(a) * ph * 0.4, -ph + Math.sin(a) * ph * 0.32 - ph * 0.1,
            ph * 0.12 + Math.cos(a) * ph * 0.62, -ph + Math.sin(a) * ph * 0.5
          );
          c.lineWidth = 3; c.strokeStyle = 'rgba(8,30,48,0.85)'; c.stroke();
        }
        c.restore();
      });
    }

    function frame() {
      if (!dragging) {
        vel *= 0.95;
        offset += vel;
        if (!reducedMotion) offset += 0.12; // gentle auto-drift
      }
      const iw = panoImg ? (panoImg.width * (h / panoImg.height)) : sceneW;
      offset = ((offset % iw) + iw) % iw;

      ctx.clearRect(0, 0, w, h);
      if (panoImg) {
        for (let x = -offset; x < w; x += iw) {
          ctx.drawImage(panoImg, x, 0, iw, h);
        }
      } else if (scene) {
        for (let x = -offset; x < w; x += iw) {
          ctx.drawImage(scene, x, 0, iw, h);
        }
        // Twinkling sun-path on top
        t += 0.02;
        ctx.fillStyle = `rgba(255,230,180,${0.08 + 0.04 * Math.sin(t)})`;
        ctx.fillRect(0, h * 0.5, w, h * 0.03);
      }
      if (running) rafId = requestAnimationFrame(frame);
    }

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; vel = 0;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      offset -= dx; vel = -dx;
    });
    const endDrag = () => { dragging = false; canvas.classList.remove('is-dragging'); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    resize();
    window.addEventListener('resize', resize);

    new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
      else { running = false; cancelAnimationFrame(rafId); }
    }, { threshold: 0.05 }).observe(canvas);
  }

  /* ======================================================================== */
  function init() {
    initScrollProgress();
    initOceanCanvas();
    initCountUp();
    initTilt();
    initMagnetic();
    initCursorAura();
    initPanorama();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
