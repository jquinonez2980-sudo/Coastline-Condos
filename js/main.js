/**
 * Coastline Condos — Main interactions
 * i18n · theme · nav · reveal · gallery · floor plans · form · parallax
 */
(function () {
  'use strict';

  /* ========================================================================
     Translations (EN / ES)
     ======================================================================== */
  const i18n = {
    en: {
      'nav.home': 'Home',
      'nav.residences': 'Residences',
      'nav.amenities': 'Amenities',
      'nav.location': 'Location',
      'nav.gallery': 'Gallery',
      'nav.about': 'About',
      'nav.contact': 'Contact',
      'nav.vip': 'VIP Access',
      'nav.tour': 'Virtual Tour',

      'hero.eyebrow': 'Playas, Ecuador · Km 5 Vía Data · Vista al Mar',
      'hero.title1': 'Live Where the Ocean',
      'hero.title2': 'Meets Elegance',
      'hero.subtitle':
        'A boutique 3-story ocean-view condominium development. Private balconies, panoramic Pacific vistas, and elevated coastal living.',
      'hero.cta1': 'Register for VIP Access',
      'hero.cta2': 'View Floor Plans',
      'hero.tagline': 'Oceanfront Living, Elevated.',
      'hero.scroll': 'Scroll',

      'discover.eyebrow': 'Discover Coastline Condos',
      'discover.title': 'Wake up to the Pacific. Live in timeless calm.',
      'discover.p1':
        'Nestled in the serene coastal town of Playas, Ecuador, Coastline Condos redefines boutique ocean living. Our intimate 3-story residence sits just one block from golden Pacific sands — close enough to hear the waves, elevated enough to savor uninterrupted horizons.',
      'discover.p2':
        'Modern architecture meets tropical elegance: floor-to-ceiling glass, open-concept interiors, and private balconies designed for sunrise coffee and sunset gatherings. Every residence is crafted for those who seek quiet luxury by the sea.',
      'discover.f1': '1 block to the beach',
      'discover.f2': 'Panoramic ocean views',
      'discover.f3': 'Boutique 3-story design',
      'discover.f4': 'Private ocean balconies',
      'discover.stat': 'Stories of refined coastal architecture',

      'res.eyebrow': 'Residences',
      'res.title': 'Thoughtfully designed homes for ocean living',
      'res.sub':
        'Eight residences across three levels — 2 to 4 bedrooms with open layouts, private terraces, and ocean-oriented living. Prices from $90,000.',
      'res.available': 'Available',
      'res.conditional': 'Conditionally sold',
      'res.sold': 'Sold',
      'res.featured': 'Featured',
      'res.viewplan': 'Explore Plan',
      'res.inquire': 'Inquire About This Unit',
      'res.planlabel': 'Interactive Floor Plan',
      'res.filterall': 'All units',
      'res.filteravail': 'Available only',
      'res.from': 'From',
      'res.unit': 'Unit',
      'res.apt': 'Interior',
      'res.terr': 'Terrace',
      'res.total': 'Total',
      'fp.mode2d': '2D Plan',
      'fp.mode3d': '2.5D View',
      'fp.roomhint': 'Hover or tap a room · Drag to pan · Scroll to zoom',
      'fp.reset': 'Reset',
      'fp.download': 'Download official plan (PDF)',
      'fp.front': 'Terrace · toward the sea',
      'fp.waitlist': 'Join the waitlist for a similar unit',

      'am.eyebrow': 'Amenities',
      'am.title': 'Elevated living, every day',
      'am.sub':
        'From the palm-framed pool courtyard to smart-home comfort — every detail is designed for a slower, richer coastal life.',
      'am.a1.t': 'Pool & Sun Deck',
      'am.a1.d': 'Resort-style courtyard pool with travertine deck and royal palms — sunrise swims a block from the sea.',
      'am.a2.t': 'Beach Club Access',
      'am.a2.d': 'Privileged access to beach club comforts — towels, seating, and a seamless sand-to-suite lifestyle.',
      'am.a3.t': 'Fitness Studio',
      'am.a3.d': 'A refined fitness area with ocean-facing equipment — train with the Pacific as your backdrop.',
      'am.a4.t': 'Secure Parking',
      'am.a4.d': 'Gated, assigned parking with controlled access for residents and guests.',
      'am.a5.t': 'Smart Home Features',
      'am.a5.d': 'Intelligent lighting, climate, and security controls — effortless comfort at your fingertips.',
      'am.a6.t': '24/7 Security',
      'am.a6.d': 'Monitored access, cameras, and professional oversight for peace of mind day and night.',

      'loc.eyebrow': 'Location & Lifestyle',
      'loc.title': 'Why Playas?',
      'loc.sub':
        'Playas (General Villamil) is Ecuador’s beloved Pacific escape — warm waters, year-round sun, fresh seafood, and a relaxed coastal rhythm. Coastline Condos places you one block from the beach, with Guayaquil within easy reach.',
      'loc.i1.t': 'One Block to the Beach',
      'loc.i1.d': 'Morning walks on the sand, afternoon surf sessions, evening strolls under coastal skies.',
      'loc.i2.t': 'Near Guayaquil',
      'loc.i2.d': 'International airport and metropolitan amenities approximately 1.5–2 hours away.',
      'loc.i3.t': 'Surf, Dining & Eco-Tours',
      'loc.i3.d': 'Local restaurants, markets, surfing breaks, and nature excursions along the Ecuadorian coast.',

      'gal.eyebrow': 'Gallery',
      'gal.title': 'A visual journey to the coast',
      'gal.ig': 'Follow the journey',
      'gal.igsub':
        'Instagram feed embed — replace with Elfsight, SnapWidget, or official IG embed for @coastline_condos',

      'tour.eyebrow': 'Virtual Experience',
      'tour.title': 'Experience the View',
      'tour.sub':
        'Real drone footage over the residences and the Playas shoreline. Feel the light, the surf, and the horizon — before you ever set foot in Playas.',
      'tour.f1': 'Drone flyover of the residences, filmed on site',
      'tour.f2': 'The Pacific surf, one block from your terrace',
      'tour.f3': 'Interactive 3D walkthroughs of every residence',
      'tour.cta': 'Request a Private Tour',
      'tour.placeholder': '360° / Matterport Tour',
      'tour.placeholderSub': 'Embed your interactive tour iframe here when ready',

      'buy.eyebrow': 'Your Path Home',
      'buy.title': 'Your Coastal Sanctuary Awaits',
      'buy.sub':
        'A refined, personal journey from first preview to keys in hand — designed around your pace and vision.',
      'buy.s1.t': 'VIP Preview',
      'buy.s1.d':
        'Register for exclusive access to floor plans, pricing, and early selection of preferred residences and views.',
      'buy.s2.t': 'Custom Selections',
      'buy.s2.d':
        'Personalize finishes, layouts where available, and design details with guidance from our concierge team.',
      'buy.s3.t': 'Move-In Support',
      'buy.s3.d':
        'From closing coordination to welcome packages — we ensure a seamless transition into oceanfront living.',
      'buy.cta': 'Begin Your Journey',

      'about.eyebrow': 'Why Coastline',
      'about.title': 'Built for lasting coastal beauty',
      'about.p1':
        'Coastline Condos is developed with a commitment to quality craftsmanship, climate-conscious design, and the quiet luxury that defines true beach living. We build not just residences — but legacies by the sea.',
      'about.p2':
        'Our standards include durable coastal materials, energy-efficient systems, and architecture that frames the Pacific without overwhelming the landscape. Sustainability and sophistication, hand in hand.',
      'about.s1': 'Coastal design',
      'about.s2': 'Buyer care',
      'about.s3': 'Ocean horizons',
      'about.t1.q':
        'Two of the eight residences are already sold — buyers chose Coastline before the first public listing.',
      'about.t1.a': '2 of 8 sold · 1 reserved',
      'about.t2.q':
        'A boutique building of just eight homes on three floors, one block from the sand at Km 5 Vía Data.',
      'about.t2.a': '8 residences · 3 floors · 1 block to the beach',

      'contact.eyebrow': 'Contact',
      'contact.title': 'Register for VIP Access',
      'contact.sub':
        'Be first to receive floor plans, pricing, and private preview invitations. Our team responds within one business day.',
      'contact.addr': 'Km 5 Vía Data, Playas (General Villamil), Ecuador · Vista al mar',

      'form.name': 'Full name',
      'form.email': 'Email',
      'form.phone': 'Phone / WhatsApp',
      'form.unit': 'Interested unit',
      'form.unitAny': 'Not sure yet / Any',
      'form.message': 'Message (optional)',
      'form.submit': 'Submit VIP Registration',
      'form.success':
        'Thank you! Your VIP registration has been received. We’ll be in touch shortly.',
      'form.error': 'Please complete all required fields with a valid email.',

      'footer.tagline':
        'Oceanfront Living, Elevated. Premium ocean-view residences at Km 5 Vía Data, Playas, Ecuador.',
      'footer.explore': 'Explore',
      'footer.legal': 'Legal',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Use',
      'footer.disclaimer': 'Disclaimer',
      'footer.copy': '© 2026 Coastline Condos. All rights reserved.',
      'footer.note':
        'Unit renderings may be conceptual. Lifestyle photos of Playas include free Wikimedia Commons imagery — full credits in assets/images/playas/CREDITS.md. Specs subject to change.',
    },

    es: {
      'nav.home': 'Inicio',
      'nav.residences': 'Residencias',
      'nav.amenities': 'Amenidades',
      'nav.location': 'Ubicación',
      'nav.gallery': 'Galería',
      'nav.about': 'Nosotros',
      'nav.contact': 'Contacto',
      'nav.vip': 'Acceso VIP',
      'nav.tour': 'Tour Virtual',

      'hero.eyebrow': 'Playas, Ecuador · Km 5 Vía Data · Vista al Mar',
      'hero.title1': 'Vive Donde el Océano',
      'hero.title2': 'Encuentra la Elegancia',
      'hero.subtitle':
        'Un condominio boutique de 3 pisos con vista al océano. Balcones privados, vistas panorámicas al Pacífico y vida costera elevada.',
      'hero.cta1': 'Regístrate para Acceso VIP',
      'hero.cta2': 'Ver Planos',
      'hero.tagline': 'Vida frente al mar, elevada.',
      'hero.scroll': 'Desliza',

      'discover.eyebrow': 'Descubre Coastline Condos',
      'discover.title': 'Despierta con el Pacífico. Vive en calma eterna.',
      'discover.p1':
        'Ubicado en el sereno pueblo costero de Playas, Ecuador, Coastline Condos redefine la vida boutique frente al mar. Nuestra residencia íntima de 3 pisos se encuentra a solo una cuadra de las arenas doradas del Pacífico — lo suficientemente cerca para escuchar las olas, lo suficientemente elevada para disfrutar horizontes sin interrupciones.',
      'discover.p2':
        'La arquitectura moderna se encuentra con la elegancia tropical: vidrio de piso a techo, interiores de concepto abierto y balcones privados diseñados para el café al amanecer y reuniones al atardecer. Cada residencia está hecha para quienes buscan lujo silencioso junto al mar.',
      'discover.f1': 'A 1 cuadra de la playa',
      'discover.f2': 'Vistas panorámicas al océano',
      'discover.f3': 'Diseño boutique de 3 pisos',
      'discover.f4': 'Balcones privados al mar',
      'discover.stat': 'Pisos de refinada arquitectura costera',

      'res.eyebrow': 'Residencias',
      'res.title': 'Hogares pensados para vivir frente al mar',
      'res.sub':
        'Ocho residencias en tres niveles — de 2 a 4 dormitorios con layouts abiertos, terrazas privadas y orientación al océano. Precios desde $90,000.',
      'res.available': 'Disponible',
      'res.conditional': 'Venta condicional',
      'res.sold': 'Vendido',
      'res.featured': 'Destacada',
      'res.viewplan': 'Explorar plano',
      'res.inquire': 'Consultar por esta unidad',
      'res.planlabel': 'Plano interactivo',
      'res.filterall': 'Todas las unidades',
      'res.filteravail': 'Solo disponibles',
      'res.from': 'Desde',
      'res.unit': 'Unidad',
      'res.apt': 'Interior',
      'res.terr': 'Terraza',
      'res.total': 'Total',
      'fp.mode2d': 'Plano 2D',
      'fp.mode3d': 'Vista 2.5D',
      'fp.roomhint': 'Pasa el cursor o toca una habitación · Arrastra para mover · Rueda para zoom',
      'fp.reset': 'Restablecer',
      'fp.download': 'Descargar plano oficial (PDF)',
      'fp.front': 'Terraza · hacia el mar',
      'fp.waitlist': 'Únete a la lista de espera por una unidad similar',

      'am.eyebrow': 'Amenidades',
      'am.title': 'Vivir elevado, cada día',
      'am.sub':
        'Desde la piscina en el patio con palmeras hasta el confort smart home — cada detalle está pensado para una vida costera más rica y serena.',
      'am.a1.t': 'Piscina y Solárium',
      'am.a1.d': 'Piscina estilo resort en el patio, con deck de travertino y palmas reales — a una cuadra del mar.',
      'am.a2.t': 'Acceso a Beach Club',
      'am.a2.d': 'Acceso privilegiado a comodidades de playa — toallas, asientos y un estilo de vida arena-suite sin fricción.',
      'am.a3.t': 'Estudio de Fitness',
      'am.a3.d': 'Área de fitness refinada con equipos frente al mar — entrena con el Pacífico de fondo.',
      'am.a4.t': 'Estacionamiento Seguro',
      'am.a4.d': 'Parqueadero asignado con acceso controlado para residentes e invitados.',
      'am.a5.t': 'Funciones Smart Home',
      'am.a5.d': 'Iluminación, clima y seguridad inteligentes — confort sin esfuerzo al alcance de tu mano.',
      'am.a6.t': 'Seguridad 24/7',
      'am.a6.d': 'Acceso monitoreado, cámaras y supervisión profesional para tu tranquilidad día y noche.',

      'loc.eyebrow': 'Ubicación y Estilo de Vida',
      'loc.title': '¿Por qué Playas?',
      'loc.sub':
        'Playas (General Villamil) es el escape del Pacífico preferido en Ecuador — aguas cálidas, sol todo el año, mariscos frescos y un ritmo costero relajado. Coastline Condos te ubica a una cuadra de la playa, con Guayaquil a fácil alcance.',
      'loc.i1.t': 'A una cuadra de la playa',
      'loc.i1.d': 'Caminatas matutinas en la arena, surf por la tarde, paseos bajo cielos costeros.',
      'loc.i2.t': 'Cerca de Guayaquil',
      'loc.i2.d': 'Aeropuerto internacional y amenidades metropolitanas a aproximadamente 1.5–2 horas.',
      'loc.i3.t': 'Surf, gastronomía y eco-tours',
      'loc.i3.d': 'Restaurantes locales, mercados, olas para surf y excursiones de naturaleza en la costa ecuatoriana.',

      'gal.eyebrow': 'Galería',
      'gal.title': 'Un viaje visual a la costa',
      'gal.ig': 'Sigue el camino',
      'gal.igsub':
        'Embed de Instagram — reemplaza con Elfsight, SnapWidget o el embed oficial de @coastline_condos',

      'tour.eyebrow': 'Experiencia Virtual',
      'tour.title': 'Vive la vista',
      'tour.sub':
        'Metraje real de dron sobre las residencias y la costa de Playas. Siente la luz, el oleaje y el horizonte — antes de pisar Playas.',
      'tour.f1': 'Sobrevuelo en dron de las residencias, filmado en sitio',
      'tour.f2': 'El oleaje del Pacífico, a una cuadra de tu terraza',
      'tour.f3': 'Recorridos 3D interactivos de cada residencia',
      'tour.cta': 'Solicitar tour privado',
      'tour.placeholder': 'Tour 360° / Matterport',
      'tour.placeholderSub': 'Inserta aquí el iframe de tu tour interactivo',

      'buy.eyebrow': 'Tu camino a casa',
      'buy.title': 'Tu santuario costero te espera',
      'buy.sub':
        'Un viaje refinado y personal desde la primera vista previa hasta las llaves en mano — a tu ritmo y visión.',
      'buy.s1.t': 'Vista previa VIP',
      'buy.s1.d':
        'Regístrate para acceso exclusivo a planos, precios y selección temprana de residencias y vistas preferidas.',
      'buy.s2.t': 'Selecciones personalizadas',
      'buy.s2.d':
        'Personaliza acabados, distribuciones cuando estén disponibles y detalles de diseño con nuestro equipo concierge.',
      'buy.s3.t': 'Soporte de mudanza',
      'buy.s3.d':
        'Desde la coordinación del cierre hasta paquetes de bienvenida — una transición fluida a la vida frente al mar.',
      'buy.cta': 'Comienza tu viaje',

      'about.eyebrow': 'Por qué Coastline',
      'about.title': 'Construido para la belleza costera duradera',
      'about.p1':
        'Coastline Condos se desarrolla con compromiso de calidad artesanal, diseño consciente del clima y el lujo silencioso que define la verdadera vida de playa. No solo construimos residencias — construimos legados junto al mar.',
      'about.p2':
        'Nuestros estándares incluyen materiales costeros duraderos, sistemas energéticamente eficientes y arquitectura que enmarca el Pacífico sin abrumar el paisaje. Sostenibilidad y sofisticación, de la mano.',
      'about.s1': 'Diseño costero',
      'about.s2': 'Atención al comprador',
      'about.s3': 'Horizontes oceánicos',
      'about.t1.q':
        'Dos de las ocho residencias ya están vendidas — hubo compradores que eligieron Coastline antes del primer anuncio público.',
      'about.t1.a': '2 de 8 vendidas · 1 reservada',
      'about.t2.q':
        'Un edificio boutique de solo ocho hogares en tres pisos, a una cuadra de la arena en el Km 5 Vía Data.',
      'about.t2.a': '8 residencias · 3 pisos · 1 cuadra a la playa',

      'contact.eyebrow': 'Contacto',
      'contact.title': 'Regístrate para Acceso VIP',
      'contact.sub':
        'Sé el primero en recibir planos, precios e invitaciones a previews privadas. Nuestro equipo responde en un día hábil.',
      'contact.addr': 'Km 5 Vía Data, Playas (General Villamil), Ecuador · Vista al mar',

      'form.name': 'Nombre completo',
      'form.email': 'Correo electrónico',
      'form.phone': 'Teléfono / WhatsApp',
      'form.unit': 'Unidad de interés',
      'form.unitAny': 'Aún no sé / Cualquiera',
      'form.message': 'Mensaje (opcional)',
      'form.submit': 'Enviar registro VIP',
      'form.success':
        '¡Gracias! Hemos recibido tu registro VIP. Nos pondremos en contacto pronto.',
      'form.error': 'Completa todos los campos obligatorios con un correo válido.',

      'footer.tagline':
        'Vida frente al mar, elevada. Residencias premium con vista al océano en Km 5 Vía Data, Playas, Ecuador.',
      'footer.explore': 'Explorar',
      'footer.legal': 'Legal',
      'footer.privacy': 'Política de privacidad',
      'footer.terms': 'Términos de uso',
      'footer.disclaimer': 'Aviso legal',
      'footer.copy': '© 2026 Coastline Condos. Todos los derechos reservados.',
      'footer.note':
        'Los renders de unidades pueden ser conceptuales. Fotos de estilo de vida de Playas incluyen imágenes libres de Wikimedia Commons — créditos en assets/images/playas/CREDITS.md. Las especificaciones pueden cambiar.',
    },
  };

  /* Merge extra keys registered by js/i18n-extra.js (experience layer) */
  if (window.CC_I18N_EXTRA) {
    Object.assign(i18n.en, window.CC_I18N_EXTRA.en || {});
    Object.assign(i18n.es, window.CC_I18N_EXTRA.es || {});
  }

  /* ========================================================================
     State — first visit auto-detects browser language (EN/ES)
     ======================================================================== */
  let lang =
    localStorage.getItem('cc-lang') ||
    ((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');


  /* ========================================================================
     Helpers
     ======================================================================== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function t(key) {
    return (i18n[lang] && i18n[lang][key]) || i18n.en[key] || key;
  }

  function applyLanguage(next) {
    lang = next;
    localStorage.setItem('cc-lang', lang);
    document.documentElement.lang = lang === 'es' ? 'es' : 'en';

    $$('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else if (el.tagName === 'OPTION') {
        el.textContent = val;
      } else {
        el.textContent = val;
      }
    });

    $$('.lang-btn').forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Notify experience modules (quiz, configurator, chat, 3D explorer)
    document.dispatchEvent(new CustomEvent('cc:langchange', { detail: { lang } }));
  }

  /* Lightweight conversion tracking — forwards to Vercel Web Analytics when the
     dashboard toggle is on (window.va queue is defined in index.html <head>). */
  function track(name, data) {
    try {
      window.va && window.va('event', { name: name, data: data || {} });
    } catch (_) {
      /* analytics must never break the page */
    }
  }

  /* Public API for the experience layer (js/effects.js, js/experience.js, …) */
  window.CC = {
    t,
    applyLanguage,
    track,
    get lang() {
      return lang;
    },
    openFloorPlan(unitId) {
      if (window.CC_FLOORPLAN) window.CC_FLOORPLAN.open(unitId);
    },
  };

  /* Delegated conversion-event listeners (WhatsApp, plan PDFs, 3D fullscreen) */
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;
    const href = el.getAttribute && (el.getAttribute('href') || '');
    const section = el.closest('section[id], footer, header');
    const source = section ? section.id || section.tagName.toLowerCase() : 'page';
    if (href && href.indexOf('wa.me') !== -1) track('whatsapp_click', { source });
    else if (href && /\.pdf(\?|#|$)/i.test(href)) track('plan_download', { file: href.split('/').pop(), source });
    else if (el.id === 'exp-fullscreen-btn') track('model3d_open', {});
  });

  /* ========================================================================
     Hero reveal (no full-screen preloader — it delayed LCP in PageSpeed)
     ======================================================================== */
  function initHeroReveal() {
    $$('.hero .reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* ========================================================================
     Theme (dark / light)
     ======================================================================== */
  function initTheme() {
    const stored = localStorage.getItem('cc-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : false; // default light for luxury sand feel
    document.documentElement.classList.toggle('dark', isDark);
    // unused prefersDark kept for future auto mode

    const btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('cc-theme', next ? 'dark' : 'light');
    });
  }

  /* ========================================================================
     Header scroll + mobile menu
     ======================================================================== */
  function initHeader() {
    const header = $('#site-header');
    const menuBtn = $('#mobile-menu-btn');
    const menu = $('#mobile-menu');
    if (!header) return;

    const onScroll = () => {
      const y = window.scrollY || 0;
      header.classList.toggle('is-scrolled', y > 40);

      // Light sections for header contrast (light mode)
      const lightSections = ['discover', 'residences', 'explorer', 'amenities', 'gallery', 'tour', 'design', 'journey', 'contact'];
      let onLight = false;
      for (const id of lightSections) {
        const sec = document.getElementById(id);
        if (!sec) continue;
        const r = sec.getBoundingClientRect();
        if (r.top <= 80 && r.bottom > 80) {
          onLight = true;
          break;
        }
      }
      // home/location/about are dark
      const darkIds = ['home', 'stats', 'location', 'about'];
      for (const id of darkIds) {
        const sec = document.getElementById(id);
        if (!sec) continue;
        const r = sec.getBoundingClientRect();
        if (r.top <= 80 && r.bottom > 80) {
          onLight = false;
          break;
        }
      }
      header.classList.toggle('on-light', onLight && y > 40);

      // Active nav link
      const sections = $$('main section[id]');
      let current = 'home';
      sections.forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (r.top <= 120 && r.bottom > 120) current = sec.id;
      });
      $$('.nav-link').forEach((a) => {
        const href = a.getAttribute('href') || '';
        a.classList.toggle('is-active', href === `#${current}`);
      });

      // Sticky CTA
      const sticky = $('#sticky-cta');
      if (sticky) {
        const show = y > window.innerHeight * 0.6;
        sticky.classList.toggle('is-visible', show);
        document.body.classList.toggle('has-sticky-cta', show);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (menuBtn && menu) {
      const openIcon = menuBtn.querySelector('.menu-open');
      const closeIcon = menuBtn.querySelector('.menu-close');

      const setOpen = (open) => {
        menu.classList.toggle('is-open', open);
        if (open) {
          menu.removeAttribute('hidden');
        } else {
          // allow animation then hide
          setTimeout(() => {
            if (!menu.classList.contains('is-open')) menu.setAttribute('hidden', '');
          }, 400);
        }
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (openIcon) openIcon.classList.toggle('hidden', open);
        if (closeIcon) closeIcon.classList.toggle('hidden', !open);
      };

      menuBtn.addEventListener('click', () => {
        setOpen(!menu.classList.contains('is-open'));
      });

      $$('.mobile-link, #mobile-menu .btn-primary').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
      });
    }
  }

  /* ========================================================================
     Language toggle
     ======================================================================== */
  function initLang() {
    $$('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => applyLanguage(btn.dataset.lang || 'en'));
    });
    applyLanguage(lang);
  }

  /* ========================================================================
     Scroll reveal
     ======================================================================== */
  let revealIO = null;

  function observeReveal(els) {
    const list = Array.isArray(els) ? els : Array.from(els || []);
    if (!list.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (!revealIO) {
      revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              revealIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
      );
    }

    list.forEach((el) => {
      if (el.closest('.hero')) return;
      // Already on-screen (or just injected below fold) — still observe so scroll reveals work
      revealIO.observe(el);
      // If already in viewport at inject time, force visible immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
        revealIO.unobserve(el);
      }
    });
  }

  function initReveal() {
    observeReveal($$('.reveal'));
  }

  /* ========================================================================
     Parallax (subtle)
     ======================================================================== */
  function initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = $$('[data-parallax]');
    if (!nodes.length) return;

    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      nodes.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-parallax') || '0.2');
        const rect = el.parentElement
          ? el.parentElement.getBoundingClientRect()
          : el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        el.style.transform = `translate3d(0, ${y * speed * 0.15}px, 0) scale(1.05)`;
      });
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ========================================================================
     Hero video — starts only after load + idle so LCP stays the poster image.
     Mobile gets the ~0.9MB ocean-hero-mobile.mp4, desktop the full clip;
     save-data / 2G / reduced-motion users keep the static poster.
     ======================================================================== */
  function initHeroVideo() {
    const video = $('#hero-video');
    if (!video) return;

    const markLoaded = () => {
      video.setAttribute('data-loaded', '');
      video.style.display = '';
    };

    video.addEventListener('loadeddata', markLoaded);
    video.addEventListener('canplay', markLoaded);
    video.addEventListener('error', () => {
      console.warn('[Coastline] Hero video failed to load:', video.currentSrc || video.src);
      video.style.display = 'none';
      video.removeAttribute('data-loaded');
    });

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = !!(conn && conn.saveData);
    const slowNet = !!(conn && /(^|-)2g/.test(conn.effectiveType || ''));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isNarrow = window.matchMedia('(max-width: 900px)').matches;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isMobile = isNarrow || isCoarse;

    // Data-saver / 2G / reduced-motion: static poster only, never fetch video
    if (saveData || slowNet || reduceMotion) {
      video.removeAttribute('src');
      video.removeAttribute('autoplay');
      video.preload = 'none';
      video.setAttribute('hidden', '');
      return;
    }

    // Phones get the compressed ~0.9MB clip; desktop the full one. Both start
    // only after load + idle, so LCP stays the poster image (PSI-safe).
    // ?v= busts /assets/(.*) being served Cache-Control: immutable, max-age=1y
    // (vercel.json) — bump this whenever the video file content changes, since
    // the filename itself doesn't, and immutable means browsers never revalidate.
    const HERO_VIDEO_VERSION = 'v2';
    const videoSrc =
      (isMobile ? 'assets/videos/ocean-hero-mobile.mp4' : 'assets/videos/ocean-hero.mp4') +
      '?v=' + HERO_VIDEO_VERSION;

    const startVideo = () => {
      if (video.getAttribute('data-src-set') === '1') return;
      video.setAttribute('data-src-set', '1');
      video.preload = 'metadata';
      video.src = videoSrc;
      video.load();
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (video.readyState >= 2) markLoaded();
        });
      }
    };

    // Desktop: wait until after load + idle so FCP/LCP are not contended
    const defer = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(startVideo, { timeout: 4000 });
      } else {
        setTimeout(startVideo, 2500);
      }
    };
    if (document.readyState === 'complete') defer();
    else window.addEventListener('load', defer, { once: true });
  }

  /* ========================================================================
     Lazy section videos — real footage loops (tour drone, beach cam, model
     residence reel). Each <video data-lazy-src> loads + plays only when it
     nears the viewport and pauses off-screen. Save-data / 2G / reduced-motion
     users keep the static posters and never fetch a byte of video.
     ======================================================================== */
  function initLazyVideos() {
    const vids = $$('video[data-lazy-src]');
    if (!vids.length) return;

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = !!(conn && conn.saveData);
    const slowNet = !!(conn && /(^|-)2g/.test(conn.effectiveType || ''));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (saveData || slowNet || reduceMotion) return;

    const start = (v) => {
      if (!v.getAttribute('src')) {
        v.src = v.dataset.lazySrc;
        v.load();
      }
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    if (!('IntersectionObserver' in window)) {
      vids.forEach(start);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting) start(v);
          else if (v.getAttribute('src')) v.pause();
        });
      },
      { rootMargin: '260px 0px' }
    );
    vids.forEach((v) => io.observe(v));
  }

  /* ========================================================================
     Inventory grid + form unit select (data from js/inventory.js)
     ======================================================================== */
  function initInventoryUI() {
    const inv = window.CC_INVENTORY;
    const grid = $('#unit-grid');
    const filterBar = $('#unit-filters');

    if (!inv) {
      console.error('[Coastline] inventory.js did not load — unit cards cannot render.');
      if (grid) {
        grid.innerHTML =
          '<p class="text-center opacity-70 col-span-full py-8">Inventory failed to load. Hard-refresh (Ctrl+F5) or open via start.bat / localhost.</p>';
      }
      return;
    }

    let filter = 'all';

    function renderCards() {
      if (!grid) return;
      const list =
        filter === 'available'
          ? inv.units.filter((u) => u.status === 'available')
          : inv.units.slice();

      grid.innerHTML = list
        .map((u) => {
          const statusKey =
            u.status === 'available'
              ? 'res.available'
              : u.status === 'conditional'
                ? 'res.conditional'
                : 'res.sold';
          const price =
            u.status === 'available'
              ? `<p class="unit-price">${inv.formatPrice(u.price, lang)}</p>`
              : '';
          // Responsive WebP/JPEG variants (generated by tools/optimize-images.py)
          const imgBase = String(u.image || '').replace(/\.jpe?g$/i, '');
          const imgHtml = imgBase
            ? `<picture>
                <source type="image/webp" srcset="${imgBase}-w480.webp 480w, ${imgBase}-w768.webp 768w, ${imgBase}-w1200.webp 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px" />
                <img src="${imgBase}-w768.jpg" srcset="${imgBase}-w480.jpg 480w, ${imgBase}-w768.jpg 768w, ${imgBase}-w1200.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px" width="1400" height="933" alt="${t('res.unit')} ${u.id}" loading="lazy" decoding="async" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='${u.image}'" />
              </picture>`
            : '';
          // is-visible: dynamic cards must be visible (reveal IO only saw elements at page load)
          return `
          <article class="unit-card reveal is-visible status-${u.status}" data-unit="${u.id}" tabindex="0" aria-label="${t('res.unit')} ${u.id}">
            <div class="unit-image img-placeholder" data-label="${t('res.unit')} ${u.id}">
              ${imgHtml}
              <span class="unit-badge status-${u.status}">${t(statusKey)}</span>
            </div>
            <div class="unit-body">
              <h3 class="font-display text-2xl mb-1">${t('res.unit')} ${u.id}</h3>
              <p class="text-champagne text-sm tracking-wide mb-2">${inv.unitTypeLine(u, lang)}</p>
              <p class="text-sm text-ocean-900/70 dark:text-sand-100/70 mb-3">${inv.floorLabel(u.floor, lang)} · ${inv.formatM2(u.totalM2)} total</p>
              <div class="unit-metrics">
                <span><strong>${inv.formatM2(u.areaM2)}</strong> ${t('res.apt')}</span>
                <span><strong>${inv.formatM2(u.terraceM2)}</strong> ${t('res.terr')}</span>
              </div>
              ${price}
              <button type="button" class="unit-cta mt-5">${t('res.viewplan')}</button>
            </div>
          </article>`;
        })
        .join('');
    }

    if (filterBar) {
      filterBar.classList.add('is-visible');
      filterBar.innerHTML = `
        <button type="button" class="unit-filter is-active" data-filter="all">${t('res.filterall')}</button>
        <button type="button" class="unit-filter" data-filter="available">${t('res.filteravail')}</button>
      `;
      filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        filter = btn.dataset.filter;
        $$('.unit-filter', filterBar).forEach((b) =>
          b.classList.toggle('is-active', b === btn)
        );
        renderCards();
      });
    }

    renderCards();
    document.addEventListener('cc:langchange', () => {
      if (filterBar) {
        const active = filter;
        filterBar.innerHTML = `
          <button type="button" class="unit-filter${active === 'all' ? ' is-active' : ''}" data-filter="all">${t('res.filterall')}</button>
          <button type="button" class="unit-filter${active === 'available' ? ' is-active' : ''}" data-filter="available">${t('res.filteravail')}</button>
        `;
      }
      renderCards();
      fillFormUnits();
    });

    fillFormUnits();
  }

  function fillFormUnits() {
    const inv = window.CC_INVENTORY;
    const sel = $('#unit');
    if (!inv || !sel) return;
    const current = sel.value;
    const any = t('form.unitAny');
    const opts = inv.units
      .filter((u) => u.status !== 'sold')
      .map((u) => {
        const status = inv.statusLabel(u.status, lang);
        const type = inv.unitTypeLine(u, lang);
        const label = `${t('res.unit')} ${u.id} · ${type} (${status})`;
        return `<option value="${u.id}">${label}</option>`;
      })
      .join('');
    sel.innerHTML = `<option value="">${any}</option>${opts}`;
    if (current && [...sel.options].some((o) => o.value === current)) {
      sel.value = current;
    }
  }

  /* Floor plan viewer is handled by js/floorplan.js */

  /* ========================================================================
     Gallery lightbox
     ======================================================================== */
  function initGallery() {
    const items = $$('.gallery-item');
    const lb = $('#lightbox');
    const img = $('#lightbox-img');
    const caption = $('#lightbox-caption');
    const closeBtn = $('#lightbox-close');
    const prevBtn = $('#lightbox-prev');
    const nextBtn = $('#lightbox-next');
    if (!items.length || !lb) return;

    let index = 0;
    const sources = items.map((btn) => ({
      src: btn.dataset.src,
      alt: btn.dataset.alt || '',
    }));

    const show = (i) => {
      index = (i + sources.length) % sources.length;
      const s = sources[index];
      // Gradient placeholder if image fails — still set src
      if (img) {
        img.src = s.src;
        img.alt = s.alt;
        img.onerror = function () {
          // Soft gradient canvas as fallback
          this.onerror = null;
          this.src =
            'data:image/svg+xml,' +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2A6868"/><stop offset="1" stop-color="#1E4E4E"/></linearGradient></defs><rect fill="url(#g)" width="100%" height="100%"/><text x="50%" y="50%" fill="rgba(255,255,255,0.4)" font-family="system-ui" font-size="24" text-anchor="middle">${s.alt || 'Image placeholder'}</text></svg>`
            );
        };
      }
      if (caption) caption.textContent = s.alt;
    };

    const open = (i) => {
      show(i);
      lb.removeAttribute('hidden');
      requestAnimationFrame(() => lb.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => lb.setAttribute('hidden', ''), 350);
    };

    items.forEach((btn, i) => btn.addEventListener('click', () => open(i)));
    closeBtn && closeBtn.addEventListener('click', close);
    prevBtn && prevBtn.addEventListener('click', () => show(index - 1));
    nextBtn && nextBtn.addEventListener('click', () => show(index + 1));
    lb.addEventListener('click', (e) => {
      if (e.target === lb) close();
    });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ========================================================================
     Contact form
     ======================================================================== */
  function initForm() {
    const form = $('#contact-form');
    if (!form) return;
    const success = $('#form-success');
    const error = $('#form-error');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      success && success.setAttribute('hidden', '');
      error && error.setAttribute('hidden', '');

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const phone = form.phone.value.trim();
      const unit = form.unit.value;
      const message = form.message.value.trim();

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      let valid = true;

      [form.name, form.email, form.phone].forEach((field) => {
        field.classList.remove('invalid');
      });

      if (!name) {
        form.name.classList.add('invalid');
        valid = false;
      }
      if (!emailOk) {
        form.email.classList.add('invalid');
        valid = false;
      }
      if (!phone) {
        form.phone.classList.add('invalid');
        valid = false;
      }

      if (!valid) {
        error && error.removeAttribute('hidden');
        return;
      }

      const payload = {
        name,
        email,
        phone,
        unit: unit || 'any',
        message,
        lang,
        source: 'coastline-condos-vip',
        timestamp: new Date().toISOString(),
      };

      // Belt-and-braces local copy (readable via localStorage['cc-leads'])
      try {
        const existing = JSON.parse(localStorage.getItem('cc-leads') || '[]');
        existing.push(payload);
        localStorage.setItem('cc-leads', JSON.stringify(existing));
      } catch (_) {
        /* ignore quota */
      }

      /* Lead delivery — FormSubmit.co (no account needed).
         ⚠ The FIRST submission emails an activation link to the address below;
         click it once and every later lead arrives as a formatted email.
         ⚠ AT LAUNCH: swap to the team inbox (e.g. info@coastlinecondos.vip once
         that mailbox exists), or use your FormSubmit alias hash to hide the address. */
      const LEAD_ENDPOINT = 'https://formsubmit.co/ajax/jquinonez2980@gmail.com';

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn && (submitBtn.disabled = true);

      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          Object.assign(
            {
              _subject: 'New VIP registration — Coastline Condos',
              _template: 'table',
              _captcha: 'false',
            },
            payload
          )
        ),
      })
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          track('lead_submit', { unit: payload.unit, lang: payload.lang, delivered: true });
        })
        .catch((err) => {
          // Lead is still in localStorage; surface in analytics so it isn't silent
          console.warn('[Coastline Condos] Lead email delivery failed:', err);
          track('lead_submit', { unit: payload.unit, lang: payload.lang, delivered: false });
        })
        .finally(() => {
          submitBtn && (submitBtn.disabled = false);
        });

      form.reset();
      success && success.removeAttribute('hidden');
      success && success.focus && success.focus();
    });
  }

  /* ========================================================================
     Smooth anchor offset (native scroll-padding handles most)
     ======================================================================== */
  function initSmoothAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', id);
      });
    });
  }

  /* ========================================================================
     Init
     ======================================================================== */
  function init() {
    initHeroReveal();
    initTheme();
    initHeader();
    initLang();
    initReveal();
    initParallax();
    initHeroVideo();
    initLazyVideos();
    initInventoryUI();
    initGallery();
    initForm();
    initSmoothAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
