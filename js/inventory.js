/**
 * Coastline Condos — Master inventory (source of truth)
 * Areas & prices from CUADRO DE AREA APARTAMENTOS COASTLINE.xlsx
 * Room geometry traced from the architectural plans in "layout diagram/"
 * (COASTLINE PLANTA BAJA / 1ER PISO ALTO / 2DO PISO ALTO, esc. 1:75).
 * Status: 301 & 302 sold · 203 conditionally sold · rest available
 *
 * Loads before main.js. Exposed as window.CC_INVENTORY.
 */
(function () {
  'use strict';

  const M2_TO_SQFT = 10.7639;

  /** @typedef {'available'|'conditional'|'sold'} UnitStatus */

  /**
   * Building envelope shared by the floor-plan modal and both 3D models.
   * All values in meters, from the plan dimension chains.
   * x runs left→right along the facade (terraces/street side = front).
   */
  const BUILDING = {
    width: 30.0,           // overall facade, grid A–H
    depth: 12.2,           // main slab depth (excl. projecting terraces)
    terraceDepth: 1.8,     // projecting front terrace strip
    floorHeight: 3.0,
    grid: [3.9, 3.4, 2.6, 3.4, 3.5, 4.0, 5.2, 3.0], // A..H bay spacings (PB)
    floorWidths: { 1: 30.0, 2: 30.0, 3: 27.0 },     // level 3 is set back on the right
    stairHalls: [
      { x0: 7.5, x1: 11.1 },
      { x0: 18.6, x1: 22.2 },
    ],
    // Facade x-span of each unit (left edge → right edge)
    unitSpans: {
      101: [0, 7.5], 102: [11.1, 18.6], 103: [22.2, 30.0],
      201: [0, 7.5], 202: [11.1, 18.6], 203: [22.2, 30.0],
      301: [0, 7.5], 302: [11.1, 27.0],
    },
    // Site facts (Planta Baja)
    parkingStalls: 10,
    stallWidth: 2.55,
    pool: { zone: 'street-side left courtyard', approx: [3.5, 8.0] },
  };

  /**
   * Room geometry for interactive plans, defined in METERS and traced from
   * the plan PDFs (room proportions per the dimension chains; each layout's
   * envelope equals the official interior m² of the cuadro de áreas).
   * Origin top-left = rear-left of the unit; y grows toward the front
   * terrace. Converted once to SVG px below (PX_PER_M).
   */
  const PX_PER_M = 30;

  const METER_LAYOUTS = {
    /* 2BR left bay (101 / 201) — Planta Baja / 1er Piso Alto, grid A–C.
       Envelope 7.50 × 10.75 m ≈ 80.56 m²; terrace 5.15 × 1.80 = 9.28 m². */
    '2br-left': {
      size: [7.5, 12.55],
      rooms: [
        { id: 'd2', label: { en: 'Bedroom 2', es: 'Dormitorio 2' }, x: 0, y: 0, w: 3.2, h: 3.1, kind: 'bed' },
        { id: 'kitchen', label: { en: 'Kitchen', es: 'Cocina' }, x: 3.2, y: 0, w: 2.9, h: 3.1, kind: 'kitchen' },
        { id: 'laundry', label: { en: 'Laundry', es: 'Lavandería' }, x: 6.1, y: 0, w: 1.4, h: 3.1, kind: 'service' },
        { id: 'bath1', label: { en: 'Bath', es: 'Baño' }, x: 0, y: 3.1, w: 2.4, h: 1.55, kind: 'bath' },
        { id: 'bath2', label: { en: 'Bath', es: 'Baño' }, x: 0, y: 4.65, w: 2.4, h: 1.55, kind: 'bath' },
        { id: 'closet', label: { en: 'Closet', es: 'Closet' }, x: 2.4, y: 3.1, w: 0.8, h: 3.1, kind: 'service' },
        { id: 'dining', label: { en: 'Dining', es: 'Comedor' }, x: 3.2, y: 3.1, w: 2.9, h: 3.1, kind: 'living' },
        { id: 'hall', label: { en: 'Hall', es: 'Hall' }, x: 6.1, y: 3.1, w: 1.4, h: 3.1, kind: 'hall' },
        { id: 'd1', label: { en: 'Bedroom 1', es: 'Dormitorio 1' }, x: 0, y: 6.2, w: 3.7, h: 3.4, kind: 'bed' },
        { id: 'living', label: { en: 'Living', es: 'Sala' }, x: 3.7, y: 6.2, w: 3.8, h: 3.4, kind: 'living' },
        { id: 'entry', label: { en: 'Entry', es: 'Ingreso' }, x: 5.3, y: 9.6, w: 2.2, h: 1.15, kind: 'hall' },
        { id: 'terrace', label: { en: 'Terrace', es: 'Terraza' }, x: 0.15, y: 10.75, w: 5.15, h: 1.8, kind: 'terrace' },
      ],
    },
    /* 2BR center bay (102 / 202) — mirror twin of the left bay across the stair hall. */
    '2br-center': { mirrorOf: '2br-left' },
    /* 3BR right bay PB (103) — grid F–H. Envelope 7.80 × 11.45 m ≈ 89.42 m²;
       terrace 4.80 × 1.80 = 8.64 m². */
    '3br-right-pb': {
      size: [7.8, 13.25],
      rooms: [
        { id: 'kitchen', label: { en: 'Kitchen', es: 'Cocina' }, x: 0, y: 0, w: 2.7, h: 3.0, kind: 'kitchen' },
        { id: 'laundry', label: { en: 'Laundry', es: 'Lavandería' }, x: 2.7, y: 0, w: 1.3, h: 3.0, kind: 'service' },
        { id: 'd3', label: { en: 'Bedroom 3', es: 'Dormitorio 3' }, x: 4.0, y: 0, w: 3.8, h: 3.0, kind: 'bed' },
        { id: 'dining', label: { en: 'Dining', es: 'Comedor' }, x: 0, y: 3.0, w: 2.9, h: 3.1, kind: 'living' },
        { id: 'hall', label: { en: 'Hall', es: 'Hall' }, x: 2.9, y: 3.0, w: 1.6, h: 3.1, kind: 'hall' },
        { id: 'd2', label: { en: 'Bedroom 2', es: 'Dormitorio 2' }, x: 4.5, y: 3.0, w: 3.3, h: 3.1, kind: 'bed' },
        { id: 'living', label: { en: 'Living', es: 'Sala' }, x: 0, y: 6.1, w: 4.5, h: 3.4, kind: 'living' },
        { id: 'bath1', label: { en: 'Bath', es: 'Baño' }, x: 4.5, y: 6.1, w: 1.55, h: 1.9, kind: 'bath' },
        { id: 'bath2', label: { en: 'Bath', es: 'Baño' }, x: 6.05, y: 6.1, w: 1.75, h: 1.9, kind: 'bath' },
        { id: 'd1', label: { en: 'Bedroom 1', es: 'Dormitorio 1' }, x: 4.5, y: 8.0, w: 3.3, h: 3.45, kind: 'bed' },
        { id: 'entry', label: { en: 'Entry', es: 'Ingreso' }, x: 3.0, y: 9.5, w: 1.5, h: 1.95, kind: 'hall' },
        { id: 'terrace', label: { en: 'Terrace', es: 'Terraza' }, x: 0, y: 11.45, w: 4.8, h: 1.8, kind: 'terrace' },
      ],
    },
    /* 3BR right bay 1er (203) — same bay, deeper interior (95.92 m²). */
    '3br-right-1': {
      size: [7.8, 14.1],
      rooms: [
        { id: 'kitchen', label: { en: 'Kitchen', es: 'Cocina' }, x: 0, y: 0, w: 2.7, h: 3.2, kind: 'kitchen' },
        { id: 'laundry', label: { en: 'Laundry', es: 'Lavandería' }, x: 2.7, y: 0, w: 1.3, h: 3.2, kind: 'service' },
        { id: 'd3', label: { en: 'Bedroom 3', es: 'Dormitorio 3' }, x: 4.0, y: 0, w: 3.8, h: 3.2, kind: 'bed' },
        { id: 'dining', label: { en: 'Dining', es: 'Comedor' }, x: 0, y: 3.2, w: 2.9, h: 3.3, kind: 'living' },
        { id: 'hall', label: { en: 'Hall', es: 'Hall' }, x: 2.9, y: 3.2, w: 1.6, h: 3.3, kind: 'hall' },
        { id: 'd2', label: { en: 'Bedroom 2', es: 'Dormitorio 2' }, x: 4.5, y: 3.2, w: 3.3, h: 3.3, kind: 'bed' },
        { id: 'living', label: { en: 'Living', es: 'Sala' }, x: 0, y: 6.5, w: 4.5, h: 3.7, kind: 'living' },
        { id: 'bath1', label: { en: 'Bath', es: 'Baño' }, x: 4.5, y: 6.5, w: 1.55, h: 2.0, kind: 'bath' },
        { id: 'bath2', label: { en: 'Bath', es: 'Baño' }, x: 6.05, y: 6.5, w: 1.75, h: 2.0, kind: 'bath' },
        { id: 'd1', label: { en: 'Bedroom 1', es: 'Dormitorio 1' }, x: 4.5, y: 8.5, w: 3.3, h: 3.8, kind: 'bed' },
        { id: 'entry', label: { en: 'Entry', es: 'Ingreso' }, x: 3.0, y: 10.2, w: 1.5, h: 2.1, kind: 'hall' },
        { id: 'terrace', label: { en: 'Terrace', es: 'Terraza' }, x: 0, y: 12.3, w: 4.8, h: 1.8, kind: 'terrace' },
      ],
    },
    /* 3BR level 3 (301) — 2do Piso Alto left bay, 3 baths.
       Envelope 7.50 × 12.05 m ≈ 90.34 m²; terrace 7.40 × 2.18 ≈ 16.12 m². */
    '3br-301': {
      size: [7.5, 14.23],
      rooms: [
        { id: 'd2', label: { en: 'Bedroom 2', es: 'Dormitorio 2' }, x: 0, y: 0, w: 3.4, h: 3.2, kind: 'bed' },
        { id: 'kitchen', label: { en: 'Kitchen', es: 'Cocina' }, x: 3.4, y: 0, w: 2.7, h: 3.2, kind: 'kitchen' },
        { id: 'bath1', label: { en: 'Bath', es: 'Baño' }, x: 6.1, y: 0, w: 1.4, h: 1.6, kind: 'bath' },
        { id: 'laundry', label: { en: 'Laundry', es: 'Lavandería' }, x: 6.1, y: 1.6, w: 1.4, h: 1.6, kind: 'service' },
        { id: 'd3', label: { en: 'Bedroom 3', es: 'Dormitorio 3' }, x: 0, y: 3.2, w: 3.4, h: 3.1, kind: 'bed' },
        { id: 'dining', label: { en: 'Dining', es: 'Comedor' }, x: 3.4, y: 3.2, w: 2.7, h: 3.1, kind: 'living' },
        { id: 'hall', label: { en: 'Hall', es: 'Hall' }, x: 6.1, y: 3.2, w: 1.4, h: 3.1, kind: 'hall' },
        { id: 'd1', label: { en: 'Bedroom 1', es: 'Dormitorio 1' }, x: 0, y: 6.3, w: 3.7, h: 3.4, kind: 'bed' },
        { id: 'living', label: { en: 'Living', es: 'Sala' }, x: 3.7, y: 6.3, w: 3.8, h: 3.4, kind: 'living' },
        { id: 'bath2', label: { en: 'Bath', es: 'Baño' }, x: 0, y: 9.7, w: 2.0, h: 1.5, kind: 'bath' },
        { id: 'bath3', label: { en: 'Bath', es: 'Baño' }, x: 2.0, y: 9.7, w: 1.8, h: 1.5, kind: 'bath' },
        { id: 'entry', label: { en: 'Entry', es: 'Ingreso' }, x: 5.3, y: 9.7, w: 2.2, h: 1.35, kind: 'hall' },
        { id: 'terrace', label: { en: 'Terrace', es: 'Terraza' }, x: 0.05, y: 12.05, w: 7.4, h: 2.18, kind: 'terrace' },
      ],
    },
    /* 4BR flagship (302) — 2do Piso Alto, spans grid D–H (15.9 m wide).
       Envelope 15.90 × 9.12 m ≈ 145 m²; L-shaped terrace
       15.9 × 1.8 front + 3.0 × 4.5 right wing ≈ 42 m². */
    '4br-302': {
      size: [18.9, 10.92],
      rooms: [
        { id: 'd3', label: { en: 'Bedroom 3', es: 'Dormitorio 3' }, x: 0, y: 0, w: 3.7, h: 3.3, kind: 'bed' },
        { id: 'd1', label: { en: 'Bedroom 1', es: 'Dormitorio 1' }, x: 3.7, y: 0, w: 3.6, h: 3.3, kind: 'bed' },
        { id: 'bath1', label: { en: 'Bath', es: 'Baño' }, x: 7.3, y: 0, w: 1.5, h: 3.3, kind: 'bath' },
        { id: 'd2', label: { en: 'Bedroom 2', es: 'Dormitorio 2' }, x: 8.8, y: 0, w: 3.5, h: 3.3, kind: 'bed' },
        { id: 'd4', label: { en: 'Bedroom 4', es: 'Dormitorio 4' }, x: 12.3, y: 0, w: 3.6, h: 3.3, kind: 'bed' },
        { id: 'living', label: { en: 'Living', es: 'Sala' }, x: 0, y: 3.3, w: 5.2, h: 3.4, kind: 'living' },
        { id: 'dining', label: { en: 'Dining', es: 'Comedor' }, x: 5.2, y: 3.3, w: 3.4, h: 3.4, kind: 'living' },
        { id: 'kitchen', label: { en: 'Kitchen', es: 'Cocina' }, x: 8.6, y: 3.3, w: 3.0, h: 3.4, kind: 'kitchen' },
        { id: 'bath2', label: { en: 'Bath', es: 'Baño' }, x: 11.6, y: 3.3, w: 1.6, h: 1.7, kind: 'bath' },
        { id: 'closet', label: { en: 'Closet', es: 'Closet' }, x: 11.6, y: 5.0, w: 1.6, h: 1.7, kind: 'service' },
        { id: 'bath3', label: { en: 'Bath', es: 'Baño' }, x: 13.2, y: 3.3, w: 1.5, h: 1.7, kind: 'bath' },
        { id: 'hall', label: { en: 'Hall', es: 'Hall' }, x: 13.2, y: 5.0, w: 2.7, h: 1.7, kind: 'hall' },
        { id: 'entry', label: { en: 'Entry', es: 'Ingreso' }, x: 5.2, y: 6.7, w: 2.0, h: 2.42, kind: 'hall' },
        { id: 'terrace', label: { en: 'Terrace', es: 'Terraza' }, x: 0, y: 9.12, w: 15.9, h: 1.8, kind: 'terrace' },
        { id: 'terraceR', label: { en: 'Terrace', es: 'Terraza' }, x: 15.9, y: 4.6, w: 3.0, h: 4.52, kind: 'terrace' },
      ],
    },
  };

  /** Convert meter-space layouts to the SVG px space the viewer renders. */
  function toPxLayout(def) {
    const [mw, mh] = def.size;
    return {
      viewBox: [0, 0, Math.round(mw * PX_PER_M), Math.round(mh * PX_PER_M)],
      pxPerM: PX_PER_M,
      meters: [mw, mh],
      rooms: def.rooms.map((r) => ({
        id: r.id,
        label: r.label,
        kind: r.kind,
        mw: r.w,
        mh: r.h,
        areaM2: Math.round(r.w * r.h * 100) / 100,
        x: Math.round(r.x * PX_PER_M * 10) / 10,
        y: Math.round(r.y * PX_PER_M * 10) / 10,
        w: Math.round(r.w * PX_PER_M * 10) / 10,
        h: Math.round(r.h * PX_PER_M * 10) / 10,
      })),
    };
  }

  /** Mirror a px layout horizontally (center bay is the twin of the left bay). */
  function mirrorPxLayout(layout) {
    const vw = layout.viewBox[2];
    return {
      ...layout,
      rooms: layout.rooms.map((r) => ({ ...r, x: Math.round((vw - r.x - r.w) * 10) / 10 })),
    };
  }

  const LAYOUTS = {};
  Object.keys(METER_LAYOUTS).forEach((key) => {
    const def = METER_LAYOUTS[key];
    if (!def.mirrorOf) LAYOUTS[key] = toPxLayout(def);
  });
  Object.keys(METER_LAYOUTS).forEach((key) => {
    const def = METER_LAYOUTS[key];
    if (def.mirrorOf) LAYOUTS[key] = mirrorPxLayout(LAYOUTS[def.mirrorOf]);
  });

  const UNITS = [
    {
      id: '101',
      floor: 1,
      floorKey: 'pb',
      beds: 2,
      baths: 2,
      areaM2: 80.56,
      terraceM2: 9.28,
      price: 90000,
      status: 'available',
      layout: '2br-left',
      image: 'assets/images/unit-pacific-2br.jpg',
      position: 'left',
    },
    {
      id: '102',
      floor: 1,
      floorKey: 'pb',
      beds: 2,
      baths: 2,
      areaM2: 80.56,
      terraceM2: 9.28,
      price: 90000,
      status: 'available',
      layout: '2br-center',
      image: 'assets/images/unit-horizon-2br.jpg',
      position: 'center',
    },
    {
      id: '103',
      floor: 1,
      floorKey: 'pb',
      beds: 3,
      baths: 2,
      areaM2: 89.42,
      terraceM2: 8.64,
      price: 120000,
      status: 'available',
      layout: '3br-right-pb',
      image: 'assets/images/unit-azure-3br.jpg',
      position: 'right',
    },
    {
      id: '201',
      floor: 2,
      floorKey: 'p1',
      beds: 2,
      baths: 2,
      areaM2: 80.56,
      terraceM2: 9.28,
      price: 90000,
      status: 'available',
      layout: '2br-left',
      image: 'assets/images/unit-pacific-2br.jpg',
      position: 'left',
    },
    {
      id: '202',
      floor: 2,
      floorKey: 'p1',
      beds: 2,
      baths: 2,
      areaM2: 80.56,
      terraceM2: 9.28,
      price: 90000,
      status: 'available',
      layout: '2br-center',
      image: 'assets/images/unit-horizon-2br.jpg',
      position: 'center',
    },
    {
      id: '203',
      floor: 2,
      floorKey: 'p1',
      beds: 3,
      baths: 2,
      areaM2: 95.92,
      terraceM2: 8.64,
      price: 130000,
      status: 'conditional',
      layout: '3br-right-1',
      image: 'assets/images/unit-azure-3br.jpg',
      position: 'right',
    },
    {
      id: '301',
      floor: 3,
      floorKey: 'p2',
      beds: 3,
      baths: 3,
      areaM2: 90.34,
      terraceM2: 16.12,
      price: 130000,
      status: 'sold',
      layout: '3br-301',
      image: 'assets/images/unit-azure-3br.jpg',
      position: 'left',
    },
    {
      id: '302',
      floor: 3,
      floorKey: 'p2',
      beds: 4,
      baths: 3,
      areaM2: 145,
      terraceM2: 42,
      price: 160000,
      status: 'sold',
      layout: '4br-302',
      image: 'assets/images/unit-horizon-2br.jpg',
      position: 'right',
    },
  ];

  function sqft(m2) {
    return Math.round(m2 * M2_TO_SQFT * 100) / 100;
  }

  function totalM2(u) {
    return Math.round((u.areaM2 + u.terraceM2) * 100) / 100;
  }

  function formatPrice(n, lang) {
    const formatted = n.toLocaleString(lang === 'es' ? 'es-EC' : 'en-US');
    return lang === 'es' ? `Desde $${formatted}` : `From $${formatted}`;
  }

  function formatM2(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
  }

  function formatSqft(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' sq ft';
  }

  function getUnit(id) {
    return UNITS.find((u) => u.id === String(id)) || null;
  }

  function getUnitsByFloor(floor) {
    return UNITS.filter((u) => u.floor === Number(floor));
  }

  function getLayout(layoutId) {
    return LAYOUTS[layoutId] || null;
  }

  function availableUnits() {
    return UNITS.filter((u) => u.status === 'available');
  }

  function startingPrice() {
    const prices = availableUnits().map((u) => u.price);
    return prices.length ? Math.min(...prices) : null;
  }

  function statusLabel(status, lang) {
    const map = {
      en: { available: 'Available', conditional: 'Conditionally sold', sold: 'Sold' },
      es: { available: 'Disponible', conditional: 'Venta condicional', sold: 'Vendido' },
    };
    return (map[lang] || map.en)[status] || status;
  }

  function floorLabel(floor, lang) {
    const map = {
      en: { 1: 'Ground floor', 2: 'Level 2', 3: 'Level 3' },
      es: { 1: 'Planta baja', 2: '1er piso alto', 3: '2do piso alto' },
    };
    return (map[lang] || map.en)[floor] || String(floor);
  }

  function unitTypeLine(u, lang) {
    if (lang === 'es') {
      return `${u.beds} dormitorios · ${u.baths} baños`;
    }
    return `${u.beds} Bedroom · ${u.baths} Bath`;
  }

  function unitFeatures(u, lang) {
    const total = totalM2(u);
    if (lang === 'es') {
      return [
        `${formatM2(u.areaM2)} interiores`,
        `${formatM2(u.terraceM2)} terraza`,
        `${formatM2(total)} total`,
        unitTypeLine(u, 'es'),
        floorLabel(u.floor, 'es'),
        u.beds >= 3 ? 'Amplia zona social' : 'Sala-comedor abierta',
        'Terraza privada',
      ];
    }
    return [
      `${formatM2(u.areaM2)} interior`,
      `${formatM2(u.terraceM2)} terrace`,
      `${formatM2(total)} total`,
      unitTypeLine(u, 'en'),
      floorLabel(u.floor, 'en'),
      u.beds >= 3 ? 'Expansive entertaining space' : 'Open living-dining',
      'Private terrace',
    ];
  }

  function enrich(u) {
    return {
      ...u,
      areaSqft: sqft(u.areaM2),
      terraceSqft: sqft(u.terraceM2),
      totalM2: totalM2(u),
      totalSqft: sqft(totalM2(u)),
    };
  }

  window.CC_INVENTORY = {
    units: UNITS.map(enrich),
    layouts: LAYOUTS,
    building: BUILDING,
    getUnit: (id) => {
      const u = getUnit(id);
      return u ? enrich(u) : null;
    },
    getUnitsByFloor: (f) => getUnitsByFloor(f).map(enrich),
    getLayout,
    availableUnits: () => availableUnits().map(enrich),
    startingPrice,
    formatPrice,
    formatM2,
    formatSqft,
    statusLabel,
    floorLabel,
    unitTypeLine,
    unitFeatures,
    M2_TO_SQFT,
  };
})();
