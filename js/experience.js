/**
 * Coastline Condos — Experience layer
 * "Find Your Perfect Unit" quiz · Residence Design Studio (configurator) ·
 * Concierge chat (WhatsApp hand-off) · PWA install + service worker
 *
 * Quiz & configurator use unit numbers from js/inventory.js.
 */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const t = (k) => (window.CC && window.CC.t ? window.CC.t(k) : k);
  const getLang = () => (window.CC ? window.CC.lang : 'en');
  const inv = () => window.CC_INVENTORY;

  const WHATSAPP = '593969943941';

  /* ========================================================================
     1) QUIZ — scores available units by beds / terrace preference
     ======================================================================== */
  const QUIZ = {
    en: {
      q: [
        {
          title: 'How will you use your residence?',
          a: [
            ['A vacation escape', { beds2: 1, beds3: 1 }],
            ['Full-time coastal living', { beds3: 1, terrace: 1 }],
            ['Investment / rental income', { beds2: 2 }],
          ],
        },
        {
          title: 'How much space do you need?',
          a: [
            ['2 bedrooms, cozy & smart', { beds2: 3 }],
            ['3 bedrooms for family', { beds3: 3 }],
            ['4 bedrooms — maximum space', { beds4: 3, terrace: 1 }],
          ],
        },
        {
          title: 'What matters most to you?',
          a: [
            ['Best value entry price', { value: 3 }],
            ['Larger terrace', { terrace: 3 }],
            ['More bedrooms', { beds3: 1, beds4: 2 }],
          ],
        },
        {
          title: 'When are you looking to decide?',
          a: [
            ['Within 6 months', {}],
            ['6–12 months', {}],
            ['Just exploring for now', {}],
          ],
        },
      ],
      resultIntro: 'Based on your answers, we recommend:',
    },
    es: {
      q: [
        {
          title: '¿Cómo usarás tu residencia?',
          a: [
            ['Un escape vacacional', { beds2: 1, beds3: 1 }],
            ['Vivir en la costa todo el año', { beds3: 1, terrace: 1 }],
            ['Inversión / renta', { beds2: 2 }],
          ],
        },
        {
          title: '¿Cuánto espacio necesitas?',
          a: [
            ['2 dormitorios, acogedor', { beds2: 3 }],
            ['3 dormitorios para familia', { beds3: 3 }],
            ['4 dormitorios — máximo espacio', { beds4: 3, terrace: 1 }],
          ],
        },
        {
          title: '¿Qué es lo más importante para ti?',
          a: [
            ['Mejor precio de entrada', { value: 3 }],
            ['Terraza más grande', { terrace: 3 }],
            ['Más dormitorios', { beds3: 1, beds4: 2 }],
          ],
        },
        {
          title: '¿Cuándo piensas decidir?',
          a: [
            ['En menos de 6 meses', {}],
            ['6–12 meses', {}],
            ['Solo explorando por ahora', {}],
          ],
        },
      ],
      resultIntro: 'Según tus respuestas, te recomendamos:',
    },
  };

  function scoreUnits(weights) {
    const inventory = inv();
    if (!inventory) return null;
    // Prefer available; fall back to all if none
    let pool = inventory.availableUnits();
    if (!pool.length) pool = inventory.units.filter((u) => u.status !== 'sold');
    if (!pool.length) pool = inventory.units;

    let best = null;
    let bestScore = -Infinity;
    pool.forEach((u) => {
      let s = 0;
      if (u.beds === 2) s += weights.beds2 || 0;
      if (u.beds === 3) s += weights.beds3 || 0;
      if (u.beds >= 4) s += weights.beds4 || 0;
      if (weights.terrace) s += (u.terraceM2 / 10) * weights.terrace;
      if (weights.value) s += (200000 - u.price) / 20000 * weights.value;
      // slight preference for lower floors for value, higher for terrace
      if (weights.terrace) s += u.floor * 0.3;
      if (s > bestScore) {
        bestScore = s;
        best = u;
      }
    });
    return best;
  }

  function initQuiz() {
    const modal = $('#quiz-modal');
    if (!modal) return;
    const body = $('#quiz-body');
    const closeBtn = $('#quiz-close');
    let step = 0;
    let weights = {};
    let picks = [];

    const open = () => {
      step = 0;
      weights = {};
      picks = [];
      render();
      modal.removeAttribute('hidden');
      requestAnimationFrame(() => modal.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      closeBtn && closeBtn.focus();
    };
    const close = () => {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => modal.setAttribute('hidden', ''), 350);
    };

    function render() {
      const data = QUIZ[getLang()] || QUIZ.en;
      body.innerHTML = '';

      if (step < data.q.length) {
        const q = data.q[step];
        const prog = document.createElement('div');
        prog.className = 'quiz-progress';
        prog.innerHTML = `<span style="width:${(step / data.q.length) * 100}%"></span>`;
        body.appendChild(prog);

        const h = document.createElement('h3');
        h.className = 'quiz-question font-display';
        h.textContent = q.title;
        body.appendChild(h);

        q.a.forEach(([label, w]) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'quiz-option';
          btn.textContent = label;
          btn.addEventListener('click', () => {
            Object.entries(w).forEach(([k, v]) => {
              weights[k] = (weights[k] || 0) + v;
            });
            picks.push(label);
            step++;
            render();
          });
          body.appendChild(btn);
        });

        if (step > 0) {
          const back = document.createElement('button');
          back.type = 'button';
          back.className = 'quiz-back';
          back.textContent = '← ' + t('quiz.back');
          back.addEventListener('click', () => {
            step--;
            picks.pop();
            // Recompute weights from picks is hard; reset and re-walk
            weights = {};
            const data2 = QUIZ[getLang()] || QUIZ.en;
            for (let i = 0; i < step; i++) {
              const chosen = picks[i];
              const opt = data2.q[i].a.find(([lab]) => lab === chosen);
              if (opt) {
                Object.entries(opt[1]).forEach(([k, v]) => {
                  weights[k] = (weights[k] || 0) + v;
                });
              }
            }
            render();
          });
          body.appendChild(back);
        }
      } else {
        const unit = scoreUnits(weights) || (inv() && inv().availableUnits()[0]);
        const L = getLang();
        const inventory = inv();
        if (!unit || !inventory) {
          body.innerHTML = `<p class="quiz-intro">${data.resultIntro}</p><p>…</p>`;
          return;
        }
        const type = inventory.unitTypeLine(unit, L);
        const floor = inventory.floorLabel(unit.floor, L);
        const price =
          unit.status === 'available' ? inventory.formatPrice(unit.price, L) : inventory.statusLabel(unit.status, L);
        body.innerHTML = `
          <p class="quiz-intro">${data.resultIntro}</p>
          <div class="quiz-result-card">
            <p class="section-eyebrow" style="margin-bottom:.35rem">${t('quiz.result')}</p>
            <h3 class="font-display quiz-result-name">${t('res.unit')} ${unit.id}</h3>
            <p class="quiz-result-type">${type} · ${floor}</p>
            <p class="quiz-result-desc">${inventory.formatM2(unit.totalM2)} total · ${price}</p>
          </div>
          <div class="quiz-actions">
            <button type="button" class="btn-outline" id="quiz-view">${t('quiz.cta1')}</button>
            <a href="#contact" class="btn-primary" id="quiz-register">${t('quiz.cta2')}</a>
          </div>
          <button type="button" class="quiz-back" id="quiz-restart">↻ ${t('quiz.restart')}</button>
        `;
        if (window.CC && window.CC.track) window.CC.track('quiz_result', { unit: unit.id });
        $('#quiz-view', body).addEventListener('click', () => {
          close();
          setTimeout(() => {
            if (window.CC_FLOORPLAN) window.CC_FLOORPLAN.open(unit.id);
            else {
              const card = document.querySelector(`.unit-card[data-unit="${unit.id}"]`);
              if (card) card.click();
            }
          }, 400);
        });
        $('#quiz-register', body).addEventListener('click', () => {
          prefillUnit(unit.id);
          close();
        });
        $('#quiz-restart', body).addEventListener('click', open);
      }
    }

    $$('[data-quiz-open]').forEach((el) => el.addEventListener('click', open));
    closeBtn && closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
    document.addEventListener('cc:langchange', () => {
      if (modal.classList.contains('is-open')) render();
    });
  }

  function prefillUnit(unitId) {
    const sel = $('#unit');
    if (sel) sel.value = unitId;
  }

  /* ========================================================================
     2) DESIGN STUDIO — live residence configurator
     ======================================================================== */
  const PALETTES = {
    p1: { wall: '#f2ebdd', sofa: '#c9b391', accent: '#c9a86c', nameKey: 'cfg.p1' },
    p2: { wall: '#e9f2f3', sofa: '#7ea8b8', accent: '#2678a8', nameKey: 'cfg.p2' },
    p3: { wall: '#ddd8d0', sofa: '#37475a', accent: '#a88b4a', nameKey: 'cfg.p3' },
  };
  const FLOORINGS = {
    fl1: { color: '#d9b98a', nameKey: 'cfg.fl1' },
    fl2: { color: '#cfc8bc', nameKey: 'cfg.fl2' },
  };
  const VIEW_LINES = {
    en: {
      1: 'garden-level light by the pool court',
      2: 'framed elevated ocean outlook',
      3: 'highest panoramic Pacific horizon',
    },
    es: {
      1: 'luz de nivel jardín junto al patio de la piscina',
      2: 'vistas elevadas enmarcadas al océano',
      3: 'horizonte panorámico total del Pacífico',
    },
  };

  function initConfigurator() {
    const root = $('#design');
    if (!root || !inv()) return;
    const preview = $('#cfg-preview');
    const summaryEl = $('#cfg-summary-text');
    const sentNote = $('#cfg-sent');
    const group = $('#cfg-unit-group');

    const available = inv().availableUnits();
    const defaultUnit = available[0] || inv().units[0];
    const state = {
      unit: defaultUnit ? defaultUnit.id : '101',
      palette: 'p1',
      flooring: 'fl1',
      level: defaultUnit ? defaultUnit.floor : 1,
    };

    function buildUnitButtons() {
      if (!group) return;
      const L = getLang();
      // Show available units first, then others (except sold can still design conceptually)
      const list = inv().units.filter((u) => u.status !== 'sold');
      group.innerHTML = list
        .map((u) => {
          const active = state.unit === u.id ? ' is-active' : '';
          const pressed = state.unit === u.id ? 'true' : 'false';
          const label = `${u.id} · ${u.beds}BR`;
          return `<button type="button" class="cfg-opt${active}" data-group="unit" data-value="${u.id}" data-floor="${u.floor}" aria-pressed="${pressed}">${label}</button>`;
        })
        .join('');
    }

    function apply() {
      const pal = PALETTES[state.palette];
      const fl = FLOORINGS[state.flooring];
      if (preview) {
        preview.style.setProperty('--cfg-wall', pal.wall);
        preview.style.setProperty('--cfg-sofa', pal.sofa);
        preview.style.setProperty('--cfg-accent', pal.accent);
        preview.style.setProperty('--cfg-floor', fl.color);
      }
      const sea = $('#cfg-sea');
      if (sea) {
        const heights = { 1: 26, 2: 42, 3: 58 };
        const H = heights[state.level] || 42;
        sea.setAttribute('y', String(150 - H));
        sea.setAttribute('height', String(H));
      }
      $$('.cfg-opt', root).forEach((b) => {
        const groupName = b.dataset.group;
        const on = String(state[groupName]) === b.dataset.value;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const unit = inv().getUnit(state.unit);
      const L = getLang();
      const view = (VIEW_LINES[L] || VIEW_LINES.en)[state.level] || '';
      if (summaryEl && unit) {
        const name = `${t('res.unit')} ${unit.id}`;
        summaryEl.textContent =
          L === 'es'
            ? `${name} · ${t('cfg.l' + state.level)} · paleta ${t(pal.nameKey)} con pisos de ${t(fl.nameKey)} — ${view}.`
            : `${name} · ${t('cfg.l' + state.level)} · ${t(pal.nameKey)} palette with ${t(fl.nameKey)} floors — ${view}.`;
      }
    }

    buildUnitButtons();

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.cfg-opt');
      if (!btn || !root.contains(btn)) return;
      const g = btn.dataset.group;
      if (g === 'level') {
        state.level = parseInt(btn.dataset.value, 10);
      } else if (g === 'unit') {
        state.unit = btn.dataset.value;
        const floor = parseInt(btn.dataset.floor, 10);
        if (floor) state.level = floor;
        // Sync level buttons
        $$('.cfg-opt[data-group="level"]', root).forEach((b) => {
          const on = String(state.level) === b.dataset.value;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      } else {
        state[g] = btn.dataset.value;
      }
      if (sentNote) sentNote.setAttribute('hidden', '');
      apply();
    });

    const send = $('#cfg-send');
    if (send) {
      send.addEventListener('click', () => {
        const msg = $('#message');
        if (msg) {
          const label = getLang() === 'es' ? 'Mi diseño' : 'My design';
          msg.value = `${label}: ${summaryEl ? summaryEl.textContent : ''}`;
        }
        prefillUnit(state.unit);
        if (sentNote) sentNote.removeAttribute('hidden');
        const contact = $('#contact');
        contact && contact.scrollIntoView({ behavior: 'smooth' });
      });
    }

    document.addEventListener('cc:langchange', () => {
      buildUnitButtons();
      apply();
    });
    apply();
  }

  /* ========================================================================
     3) CONCIERGE CHAT
     ======================================================================== */
  const CHAT = {
    en: {
      greeting: "Hola! 🌊 I'm the Coastline concierge. What would you like to know?",
      topics: [
        [
          'Pricing & availability',
          'Available residences start from $90,000 (2BR units 101, 102, 201, 202). Unit 103 is a 3BR from $120,000. 203 is conditionally sold; 301 and 302 are sold. Register for VIP access for full details.',
        ],
        [
          'Location & getting there',
          "We're at Km 5 Vía Data in Playas (General Villamil), one block from the beach — about 1.5–2 hours from Guayaquil's international airport.",
        ],
        [
          'Tours & visits',
          'We offer private on-site visits and video tours for international buyers. Tell us your dates and we\'ll arrange everything.',
        ],
        [
          'Payment plans',
          'Flexible pre-construction payment schedules are available, including staged payments during construction. Our team can tailor a plan to you.',
        ],
      ],
      waIntro: "Hello Coastline Condos! I'm interested in",
    },
    es: {
      greeting: '¡Hola! 🌊 Soy el concierge de Coastline. ¿Qué te gustaría saber?',
      topics: [
        [
          'Precios y disponibilidad',
          'Las residencias disponibles empiezan desde $90,000 (unidades 2 dorm. 101, 102, 201, 202). La 103 es 3 dorm. desde $120,000. La 203 está en venta condicional; 301 y 302 están vendidas. Regístrate para acceso VIP y te damos el detalle completo.',
        ],
        [
          'Ubicación y cómo llegar',
          'Estamos en el Km 5 Vía Data en Playas (General Villamil), a una cuadra de la playa — a 1.5–2 horas del aeropuerto internacional de Guayaquil.',
        ],
        [
          'Tours y visitas',
          'Ofrecemos visitas privadas en sitio y tours por video para compradores internacionales. Cuéntanos tus fechas y coordinamos todo.',
        ],
        [
          'Planes de pago',
          'Hay planes de pago flexibles en preventa, incluyendo pagos por etapas durante la construcción. Nuestro equipo puede armar un plan a tu medida.',
        ],
      ],
      waIntro: '¡Hola Coastline Condos! Me interesa',
    },
  };

  function initChat() {
    const fab = $('#chat-fab');
    const panel = $('#chat-panel');
    if (!fab || !panel) return;
    const log = $('#chat-log');
    const topicsEl = $('#chat-topics');
    const waLink = $('#chat-wa');
    let lastTopic = '';

    function bubble(text, who) {
      const div = document.createElement('div');
      div.className = 'chat-bubble ' + who;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function renderTopics() {
      const data = CHAT[getLang()] || CHAT.en;
      if (!topicsEl) return;
      topicsEl.innerHTML = '';
      data.topics.forEach(([label, answer]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-topic';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          bubble(label, 'user');
          lastTopic = label;
          setTimeout(() => bubble(answer, 'bot'), 350);
          if (waLink) {
            const intro = data.waIntro;
            waLink.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(intro + ' ' + label)}`;
          }
        });
        topicsEl.appendChild(btn);
      });
    }

    let greeted = false;
    const open = () => {
      panel.classList.add('is-open');
      panel.removeAttribute('hidden');
      fab.setAttribute('aria-expanded', 'true');
      if (!greeted) {
        bubble((CHAT[getLang()] || CHAT.en).greeting, 'bot');
        greeted = true;
      }
      renderTopics();
    };
    const close = () => {
      panel.classList.remove('is-open');
      fab.setAttribute('aria-expanded', 'false');
      setTimeout(() => panel.setAttribute('hidden', ''), 300);
    };

    fab.addEventListener('click', () => {
      if (panel.classList.contains('is-open')) close();
      else open();
    });
    const closeBtn = $('#chat-close');
    closeBtn && closeBtn.addEventListener('click', close);
    document.addEventListener('cc:langchange', () => {
      if (panel.classList.contains('is-open')) renderTopics();
    });
  }

  /* ========================================================================
     4) PWA install
     ======================================================================== */
  function initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    let deferred = null;
    const btn = $('#pwa-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      if (btn) btn.hidden = false;
    });
    if (btn) {
      btn.addEventListener('click', async () => {
        if (!deferred) return;
        deferred.prompt();
        await deferred.userChoice;
        deferred = null;
        btn.hidden = true;
      });
    }
  }

  function init() {
    initQuiz();
    initConfigurator();
    initChat();
    initPWA();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
