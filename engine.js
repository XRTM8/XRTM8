/**
 * MASNA3 — Car Company Tycoon Engine
 * Pure deterministic game logic. Runs in Browser and Node (for tests/server validation).
 * Turn = one quarter. 1960 Q1 -> 2030 Q4.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Masna3 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ---------- RNG ----------
    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---------- STATIC DATA ----------
    const START_YEAR = 1960, END_YEAR = 2030;
    const START_CASH = 2_000_000;

    const BODIES = {
        city:   { name: 'سيارة مدينة', cost: 1800, weight: 850,  seats: 4, year: 1960, seg: 'economy',  prestige: 0,  space: 3, sport: 2 },
        sedan:  { name: 'سيدان',       cost: 2600, weight: 1200, seats: 5, year: 1960, seg: 'family',   prestige: 2,  space: 6, sport: 3 },
        wagon:  { name: 'ستيشن',       cost: 2900, weight: 1300, seats: 7, year: 1962, seg: 'family',   prestige: 1,  space: 8, sport: 2 },
        coupe:  { name: 'كوبيه رياضية', cost: 3400, weight: 1100, seats: 2, year: 1960, seg: 'sport',    prestige: 5,  space: 2, sport: 8 },
        pickup: { name: 'بيك أب',      cost: 2800, weight: 1500, seats: 3, year: 1960, seg: 'utility',  prestige: 1,  space: 9, sport: 1 },
        van:    { name: 'فان',          cost: 3200, weight: 1600, seats: 8, year: 1965, seg: 'utility',  prestige: 0,  space: 10, sport: 0 },
        luxury: { name: 'ليموزين فاخرة', cost: 6500, weight: 1800, seats: 5, year: 1960, seg: 'luxury',   prestige: 9,  space: 7, sport: 4 },
        suv:    { name: 'دفع رباعي SUV', cost: 4200, weight: 1700, seats: 7, year: 1985, seg: 'suv',      prestige: 4,  space: 8, sport: 3 },
        cross:  { name: 'كروس أوفر',    cost: 3600, weight: 1400, seats: 5, year: 1998, seg: 'suv',      prestige: 3,  space: 6, sport: 3 },
        super:  { name: 'سوبر كار',     cost: 14000, weight: 1300, seats: 2, year: 1975, seg: 'sport',    prestige: 10, space: 1, sport: 10 },
    };

    // Engines: hp, l/100km base (before weight), cost, reliability base, tech required
    const ENGINES = {
        i3_small:  { name: '3 سلندر 1.0L',     hp: 45,  fuel: 6.0,  cost: 600,  rel: 80, tech: null,        year: 1960, ev: false },
        i4:        { name: '4 سلندر 1.6L',     hp: 75,  fuel: 7.5,  cost: 900,  rel: 82, tech: null,        year: 1960, ev: false },
        i4_big:    { name: '4 سلندر 2.0L',     hp: 110, fuel: 8.5,  cost: 1200, rel: 80, tech: null,        year: 1960, ev: false },
        i6:        { name: '6 سلندر 3.0L',     hp: 160, fuel: 11,   cost: 1900, rel: 78, tech: null,        year: 1960, ev: false },
        v8:        { name: 'V8 5.0L',          hp: 260, fuel: 15,   cost: 2800, rel: 74, tech: null,        year: 1960, ev: false },
        v12:       { name: 'V12 6.0L',         hp: 400, fuel: 20,   cost: 6500, rel: 65, tech: 'v12',       year: 1965, ev: false },
        i4_turbo:  { name: '4 سلندر تيربو 2.0L', hp: 200, fuel: 8.0, cost: 1900, rel: 74, tech: 'turbo',     year: 1975, ev: false },
        v6_turbo:  { name: 'V6 تيربو 3.0L',    hp: 330, fuel: 10.5, cost: 3200, rel: 72, tech: 'turbo',     year: 1980, ev: false },
        diesel:    { name: 'ديزل 2.0L',        hp: 90,  fuel: 5.5,  cost: 1400, rel: 88, tech: 'diesel',    year: 1970, ev: false },
        hybrid:    { name: 'هجين 1.8L',        hp: 120, fuel: 4.2,  cost: 2600, rel: 84, tech: 'hybrid',    year: 1997, ev: false },
        ev_small:  { name: 'كهربائي 150kW',    hp: 200, fuel: 0,    cost: 4500, rel: 90, tech: 'ev',        year: 2008, ev: true },
        ev_perf:   { name: 'كهربائي 400kW',    hp: 540, fuel: 0,    cost: 8000, rel: 86, tech: 'ev2',       year: 2014, ev: true },
    };

    const GEARBOXES = {
        m3:  { name: 'يدوي 3 سرعات', cost: 300, comfort: 0, eff: 1.00, rel: 92, tech: null, year: 1960 },
        m4:  { name: 'يدوي 4 سرعات', cost: 400, comfort: 1, eff: 0.96, rel: 90, tech: null, year: 1960 },
        a3:  { name: 'أوتوماتيك 3',   cost: 700, comfort: 4, eff: 1.10, rel: 80, tech: null, year: 1960 },
        m5:  { name: 'يدوي 5 سرعات', cost: 500, comfort: 2, eff: 0.92, rel: 90, tech: 'gear2', year: 1970 },
        a4:  { name: 'أوتوماتيك 4',   cost: 900, comfort: 5, eff: 1.02, rel: 82, tech: 'gear2', year: 1975 },
        m6:  { name: 'يدوي 6 سرعات', cost: 650, comfort: 2, eff: 0.90, rel: 89, tech: 'gear3', year: 1990 },
        a6:  { name: 'أوتوماتيك 6',   cost: 1200, comfort: 7, eff: 0.94, rel: 84, tech: 'gear3', year: 1995 },
        cvt: { name: 'CVT',           cost: 1000, comfort: 6, eff: 0.88, rel: 76, tech: 'gear3', year: 1998 },
        dct: { name: 'DCT مزدوج',     cost: 1600, comfort: 6, eff: 0.87, rel: 78, tech: 'gear4', year: 2005 },
        a8:  { name: 'أوتوماتيك 8',   cost: 1700, comfort: 9, eff: 0.86, rel: 85, tech: 'gear4', year: 2008 },
        ev1: { name: 'ناقل كهربائي',  cost: 400, comfort: 9, eff: 1.0,  rel: 95, tech: 'ev', year: 2008 },
    };

    const INTERIORS = {
        basic:   { name: 'أساسي',  cost: 300,  comfort: 2, prestige: 0, year: 1960 },
        std:     { name: 'قياسي',  cost: 700,  comfort: 5, prestige: 1, year: 1960 },
        premium: { name: 'مميز',   cost: 1500, comfort: 7, prestige: 3, year: 1960 },
        lux:     { name: 'فاخر',   cost: 3500, comfort: 10, prestige: 6, year: 1960 },
    };

    // Safety packages, cumulative levels
    const SAFETY = [
        { id: 0, name: 'بدون',                 cost: 0,    safety: 1,  tech: null },
        { id: 1, name: 'أحزمة أمان',           cost: 80,   safety: 3,  tech: null },
        { id: 2, name: 'منطقة تهشم',           cost: 300,  safety: 5,  tech: 'crumple' },
        { id: 3, name: 'ABS + وسادة هوائية',    cost: 700,  safety: 7,  tech: 'abs' },
        { id: 4, name: 'ESC + وسائد جانبية',    cost: 1100, safety: 9,  tech: 'esc' },
        { id: 5, name: 'مساعدة القيادة ADAS',   cost: 1900, safety: 10, tech: 'adas' },
    ];

    // Research tree
    const TECHS = {
        v12:     { name: 'محرك V12',           cost: 400_000,  turns: 4,  year: 1963, req: [],           desc: 'يفتح محرك V12 للسيارات الفاخرة والرياضية' },
        gear2:   { name: 'نواقل الجيل الثاني', cost: 250_000,  turns: 3,  year: 1968, req: [],           desc: 'يدوي 5 سرعات وأوتوماتيك 4' },
        diesel:  { name: 'محرك ديزل',          cost: 350_000,  turns: 4,  year: 1968, req: [],           desc: 'اقتصادي جداً بالوقود، ممتاز بأوروبا' },
        crumple: { name: 'منطقة تهشم',         cost: 300_000,  turns: 3,  year: 1966, req: [],           desc: 'سلامة أعلى بتكلفة معقولة' },
        turbo:   { name: 'شاحن تيربو',         cost: 600_000,  turns: 5,  year: 1974, req: ['gear2'],    desc: 'قوة عالية من محركات صغيرة' },
        fi:      { name: 'حقن الوقود',         cost: 500_000,  turns: 4,  year: 1972, req: [],           desc: '-12% استهلاك و +5 موثوقية لكل المحركات' },
        abs:     { name: 'ABS ووسادة هوائية',  cost: 700_000,  turns: 5,  year: 1978, req: ['crumple'],  desc: 'سلامة مستوى 7' },
        robots:  { name: 'روبوتات المصنع',     cost: 900_000,  turns: 6,  year: 1980, req: [],           desc: 'يفتح مستويات الأتمتة 2-3' },
        gear3:   { name: 'نواقل الجيل الثالث', cost: 700_000,  turns: 4,  year: 1988, req: ['gear2'],    desc: 'يدوي 6، أوتوماتيك 6، CVT' },
        alu:     { name: 'هيكل ألومنيوم',      cost: 1_200_000, turns: 6, year: 1990, req: [],           desc: '-12% وزن = أداء واقتصاد أفضل' },
        esc:     { name: 'ثبات إلكتروني ESC',  cost: 900_000,  turns: 5,  year: 1994, req: ['abs'],      desc: 'سلامة مستوى 9' },
        hybrid:  { name: 'نظام هجين',          cost: 2_000_000, turns: 8, year: 1996, req: ['fi'],       desc: 'محرك هجين اقتصادي جداً' },
        gear4:   { name: 'DCT وأوتوماتيك 8',   cost: 1_300_000, turns: 5, year: 2004, req: ['gear3'],    desc: 'أفضل النواقل' },
        lean:    { name: 'إنتاج رشيق',         cost: 1_500_000, turns: 6, year: 1985, req: ['robots'],   desc: '-10% تكلفة إنتاج، +5 جودة' },
        ev:      { name: 'سيارات كهربائية',    cost: 4_000_000, turns: 10, year: 2006, req: ['hybrid'],  desc: 'محرك كهربائي 150kW وناقل كهربائي' },
        adas:    { name: 'مساعدة القيادة ADAS', cost: 2_500_000, turns: 8, year: 2012, req: ['esc'],     desc: 'سلامة مستوى 10' },
        ev2:     { name: 'بطاريات الجيل الثاني', cost: 6_000_000, turns: 10, year: 2013, req: ['ev'],    desc: 'كهربائي 400kW عالي الأداء، +مدى' },
        design:  { name: 'استوديو تصميم',      cost: 800_000,  turns: 4,  year: 1960, req: [],           desc: 'موديلاتك تشيخ أبطأ بـ 40%' },
    };

    // What buyers of each segment care about (multipliers on regional weights)
    const SEG_WEIGHTS = {
        economy: { eco: 1.6, rel: 1.3, perf: 0.5, prestige: 0.3, comfort: 0.7 },
        family:  { space: 1.5, safety: 1.4, rel: 1.2, perf: 0.7, prestige: 0.6 },
        sport:   { perf: 3.0, prestige: 1.3, eco: 0.3, space: 0.1, comfort: 0.6, safety: 0.6 },
        utility: { space: 2.0, rel: 1.6, perf: 0.6, prestige: 0.2, comfort: 0.4, eco: 0.9 },
        luxury:  { comfort: 2.0, prestige: 2.5, eco: 0.2, perf: 1.0, safety: 1.1 },
        suv:     { space: 1.3, safety: 1.2, perf: 0.9, prestige: 1.0, eco: 0.7 },
    };
    const SEGMENTS = ['economy', 'family', 'sport', 'utility', 'luxury', 'suv'];
    const SEG_NAMES = { economy: 'اقتصادية', family: 'عائلية', sport: 'رياضية', utility: 'تجارية', luxury: 'فاخرة', suv: 'دفع رباعي' };

    // Regions: base demand per quarter (units, all segments), income multiplier, preference weights (0-1) on stats
    const REGIONS = {
        na:   { name: 'أمريكا الشمالية', demand: 1_800_000, income: 1.4, w: { perf: 0.9, comfort: 0.9, eco: 0.3, safety: 0.6, rel: 0.7, prestige: 0.7, space: 0.9 }, segs: { economy: 0.10, family: 0.30, sport: 0.12, utility: 0.25, luxury: 0.08, suv: 0.15 }, fuelSens: 0.4 },
        eu:   { name: 'أوروبا',          demand: 1_600_000, income: 1.2, w: { perf: 0.6, comfort: 0.7, eco: 0.9, safety: 0.9, rel: 0.8, prestige: 0.6, space: 0.5 }, segs: { economy: 0.30, family: 0.30, sport: 0.08, utility: 0.12, luxury: 0.08, suv: 0.12 }, fuelSens: 1.0 },
        me:   { name: 'الشرق الأوسط',    demand: 250_000,   income: 1.1, w: { perf: 0.8, comfort: 0.9, eco: 0.2, safety: 0.4, rel: 0.9, prestige: 0.9, space: 0.7 }, segs: { economy: 0.12, family: 0.30, sport: 0.10, utility: 0.15, luxury: 0.15, suv: 0.18 }, fuelSens: 0.1 },
        asia: { name: 'آسيا',            demand: 900_000,   income: 0.6, w: { perf: 0.4, comfort: 0.5, eco: 0.9, safety: 0.5, rel: 1.0, prestige: 0.5, space: 0.5 }, segs: { economy: 0.45, family: 0.25, sport: 0.04, utility: 0.15, luxury: 0.04, suv: 0.07 }, fuelSens: 0.9 },
        sa:   { name: 'أمريكا الجنوبية', demand: 350_000,   income: 0.6, w: { perf: 0.5, comfort: 0.5, eco: 0.7, safety: 0.4, rel: 0.9, prestige: 0.4, space: 0.7 }, segs: { economy: 0.35, family: 0.25, sport: 0.05, utility: 0.25, luxury: 0.03, suv: 0.07 }, fuelSens: 0.7 },
        af:   { name: 'أفريقيا',         demand: 150_000,   income: 0.4, w: { perf: 0.4, comfort: 0.3, eco: 0.7, safety: 0.3, rel: 1.0, prestige: 0.3, space: 0.8 }, segs: { economy: 0.35, family: 0.20, sport: 0.02, utility: 0.35, luxury: 0.02, suv: 0.06 }, fuelSens: 0.6 },
    };

    // Era modifiers: market growth & segment shifts by year
    function eraModifiers(year) {
        const t = clamp((year - START_YEAR) / (END_YEAR - START_YEAR), 0, 1);
        const growth = Math.pow(1.025, year - START_YEAR); // market grows ~2.5%/yr
        const asiaBoom = year > 1990 ? Math.pow(1.05, year - 1990) : 1;
        const suvShift = year > 1995 ? clamp((year - 1995) / 20, 0, 1) : 0; // SUV takes share
        const safetyImportance = lerp(0.5, 1.4, t);
        const ecoImportance = lerp(0.7, 1.3, t);
        const evPref = year >= 2012 ? clamp((year - 2012) / 16, 0, 1) : 0; // 0..1 by 2028
        return { growth, asiaBoom, suvShift, safetyImportance, ecoImportance, evPref };
    }

    const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#ecf0f1', '#2c3e50', '#8e44ad', '#e67e22', '#95a5a6', '#1abc9c', '#000000', '#7f8c8d'];

    const COMPETITOR_NAMES = [
        { name: 'أوريون موتورز', home: 'na', style: 'big' },
        { name: 'فالكس',         home: 'eu', style: 'premium' },
        { name: 'كايتو',         home: 'asia', style: 'reliable' },
        { name: 'برافو أوتو',    home: 'eu', style: 'cheap' },
        { name: 'ستيرلنغ',       home: 'na', style: 'luxury' },
    ];

    const CAR_NAME_PARTS = ['نوفا', 'زينيث', 'أطلس', 'فيغا', 'أوركا', 'ساجا', 'ريو', 'كوبرا', 'تيتان', 'لونا', 'أوميغا', 'بولار', 'إيكو', 'سبرينت', 'فينيكس'];

    // ---------- CAR CALCULATION ----------
    function carSpec(design, techs, year) {
        const body = BODIES[design.body], eng = ENGINES[design.engine], gb = GEARBOXES[design.gearbox], intr = INTERIORS[design.interior];
        const saf = SAFETY[design.safety];
        const q = clamp(design.quality, 0, 100) / 100; // build quality investment 0-1
        const hasFI = techs.includes('fi'), hasAlu = techs.includes('alu'), hasLean = techs.includes('lean');

        let weight = body.weight + (eng.ev ? 350 : 0) + intr.cost / 20;
        if (hasAlu) weight *= 0.88;
        const powerToWeight = eng.hp / (weight / 1000);
        const perf = clamp(Math.sqrt(powerToWeight) / 2.2 * (1 + body.sport * 0.03) * (gb.eff < 0.95 ? 1.05 : 1), 0.5, 10); // 0..10

        let fuel = eng.fuel * (weight / 1200) * gb.eff;
        if (hasFI && !eng.ev) fuel *= 0.88;
        const eco = eng.ev ? 9.5 : clamp(12 - fuel * 0.45, 0.5, 10);

        const comfort = clamp(intr.comfort * 0.5 + gb.comfort * 0.3 + (body.prestige * 0.2) + (weight > 1400 ? 1 : 0), 0, 10);
        const safety = saf.safety;
        let rel = (eng.rel * 0.5 + gb.rel * 0.5) + (hasFI && !eng.ev ? 5 : 0) + q * 18 - 8 + (hasLean ? 5 : 0);
        rel = clamp(rel, 30, 99);
        const prestige = clamp(body.prestige * 0.5 + intr.prestige * 0.5 + (eng.hp > 250 ? 2 : 0) + q * 2, 0, 10);
        const space = body.space;

        let partsCost = body.cost + eng.cost + gb.cost + intr.cost + saf.cost;
        partsCost *= (0.85 + q * 0.5) * 0.5; // quality raises cost up to +35%
        if (hasAlu) partsCost += 200;
        // Inflation: 1960 dollars -> approx factor
        const infl = inflation(year);
        partsCost *= infl;

        return {
            perf: +perf.toFixed(2), eco: +eco.toFixed(2), comfort: +comfort.toFixed(2), safety, rel: Math.round(rel), prestige: +prestige.toFixed(2),
            space, weight: Math.round(weight), hp: eng.hp, fuel: eng.ev ? 0 : +fuel.toFixed(1), ev: eng.ev,
            partsCost: Math.round(partsCost), seg: body.seg, seats: body.seats
        };
    }

    function inflation(year) { return Math.pow(1.038, year - START_YEAR); }

    // Appeal of a model in a region: 0..~20
    function appeal(model, region, era, brand, awareness, year, fuelPrice) {
        const s = model.spec;
        const SW = SEG_WEIGHTS[s.seg] || {};
        const w = {}; for (const k in region.w) w[k] = region.w[k] * (SW[k] || 1);
        const ecoW = w.eco * era.ecoImportance * fuelPrice;
        const safW = w.safety * era.safetyImportance;
        let score = s.perf * w.perf + s.comfort * w.comfort + s.eco * ecoW + s.safety * safW + (s.rel / 10) * w.rel + s.prestige * w.prestige + s.space * w.space * 0.5;
        const wsum = w.perf + w.comfort + ecoW + safW + w.rel + w.prestige + w.space * 0.5;
        score = score / wsum * 10; // normalize 0..10
        // Price: compare to fair price for that stat level in region
        const fair = fairPrice(s, year) * region.income;
        const ratio = model.price / fair;
        // Steep price sensitivity: +25% over fair ≈ -45% appeal, +60% ≈ -80%; underpricing helps but with diminishing returns
        if (ratio > 1) score *= Math.exp(-(ratio - 1) * 2.4);
        else score *= 1 + Math.min(0.5, (1 - ratio) * 1.2);
        // Brand & awareness
        score += brand / 25; // 0..4
        score *= 0.35 + 0.65 * clamp(awareness, 0, 1);
        // Age decay
        score -= model.age * 0.15;
        // EV preference era
        if (era.evPref > 0) score += (s.ev ? era.evPref * 2.5 : -era.evPref * 1.5);
        else if (s.ev) score -= 1.5; // early EV skepticism
        return Math.max(0.01, score);
    }

    function fairPrice(spec, year) {
        // What buyers consider fair given stats (in current-year dollars)
        const base = (1200 + spec.perf * 180 + spec.comfort * 200 + spec.safety * 100 + spec.prestige * 350 + spec.eco * 50 + spec.rel * 6) * 0.65;
        return base * inflation(year);
    }

    // ---------- GAME STATE ----------
    function newGame(opts) {
        opts = opts || {};
        const seed = opts.seed != null ? opts.seed : (Date.now() % 2147483647);
        const g = {
            version: 1,
            seed,
            rngState: seed,
            companyName: opts.companyName || 'شركتي',
            home: opts.home || 'me',
            difficulty: opts.difficulty || 'normal',
            year: START_YEAR, quarter: 1, turn: 0,
            cash: START_CASH * (opts.difficulty === 'easy' ? 1.5 : opts.difficulty === 'hard' ? 0.6 : 1),
            brand: 10,
            techs: [],
            research: null, // {tech, progress}
            engineers: 10, marketers: 5,
            awareness: {}, // region -> 0..1
            models: [], // released models
            nextModelId: 1,
            factories: [],
            nextFactoryId: 1,
            loans: [],
            racing: { active: false, wins: 0, budget: 0 },
            fuelPrice: 1.0,
            recession: 0,
            competitors: [],
            news: [],
            events: [], // pending event choices
            history: [], // per-turn summary
            stats: { totalSold: 0, totalRevenue: 0, totalProfit: 0, bestQuarter: 0, modelsLaunched: 0 },
            gameOver: false, gameOverReason: null,
            achievements: [],
        };
        for (const r in REGIONS) g.awareness[r] = r === g.home ? 0.5 : 0.05;
        // starting factory in home region
        g.factories.push(makeFactory(g, g.home, 1));
        // competitors
        const rng = getRng(g);
        g.competitors = COMPETITOR_NAMES.map((c, i) => ({
            id: i, name: c.name, home: c.home, style: c.style,
            brand: 30 + Math.floor(rng() * 30),
            models: [],
        }));
        for (const c of g.competitors) for (let k = 0; k < 2; k++) c.models.push(makeCompetitorModel(g, c, rng));
        saveRng(g, rng);
        pushNews(g, `تأسست شركة ${g.companyName} في ${REGIONS[g.home].name} برأس مال ${fmtMoney(g.cash)}. صمّم أول سيارة من تبويب "التصميم".`, 'info');
        return g;
    }

    function getRng(g) { return mulberry32(g.rngState); }
    function saveRng(g, rng) { g.rngState = Math.floor(rng() * 2147483647); }

    function makeFactory(g, region, lines) {
        return { id: g.nextFactoryId++, region, lines, automation: 0, workers: lines * 600, quality: 50, assigned: null, name: `مصنع ${REGIONS[region].name} ${g.nextFactoryId - 1}` };
    }

    function factoryCapacity(f) {
        // units per quarter
        const perLine = 12_000 * (1 + f.automation * 0.35);
        return Math.round(f.lines * perLine);
    }

    function factoryUnitLaborCost(f, year) {
        const wage = 1500 * inflation(year); // per worker per quarter (~$1000 in 1960/qtr)
        const cap = factoryCapacity(f);
        return (f.workers * wage) / Math.max(1, cap);
    }

    function factoryFixedCost(f, year) {
        return f.lines * 250_000 * inflation(year) + f.automation * f.lines * 40_000 * inflation(year);
    }

    function makeCompetitorModel(g, c, rng) {
        const year = g.year;
        const available = Object.keys(BODIES).filter(b => BODIES[b].year <= year);
        let body;
        switch (c.style) {
            case 'big': body = pick(rng, available.filter(b => ['sedan', 'pickup', 'suv', 'wagon'].includes(b)) || available); break;
            case 'premium': body = pick(rng, available.filter(b => ['sedan', 'coupe', 'luxury', 'cross'].includes(b))); break;
            case 'reliable': body = pick(rng, available.filter(b => ['city', 'sedan', 'cross', 'van'].includes(b))); break;
            case 'cheap': body = pick(rng, available.filter(b => ['city', 'sedan', 'van', 'pickup'].includes(b))); break;
            case 'luxury': body = pick(rng, available.filter(b => ['luxury', 'coupe', 'super', 'suv'].includes(b))); break;
            default: body = pick(rng, available);
        }
        if (!body) body = 'sedan';
        // competitor stat level scales with era
        const t = clamp((year - START_YEAR) / 70, 0, 1);
        const lvl = lerp(3.5, 8, t) + (rng() - 0.5);
        const styleMod = { big: { perf: 1, space: 1 }, premium: { comfort: 1.5, prestige: 1 }, reliable: { rel: 12, eco: 1.5 }, cheap: { price: 0.8 }, luxury: { prestige: 3, comfort: 2, price: 1.8 } }[c.style];
        const spec = {
            perf: clamp(lvl + (styleMod.perf || 0) + (BODIES[body].sport - 4) * 0.3, 1, 10),
            comfort: clamp(lvl + (styleMod.comfort || 0), 1, 10),
            eco: clamp(lvl - 1 + (styleMod.eco || 0) + (year > 2015 ? 2 : 0), 1, 10),
            safety: clamp(Math.round(lerp(1, 10, t) + (rng() - 0.5) * 2), 1, 10),
            rel: clamp(Math.round(lerp(65, 92, t) + (styleMod.rel || 0)), 40, 99),
            prestige: clamp(BODIES[body].prestige * 0.6 + (styleMod.prestige || 0) + (rng() * 2), 0, 10),
            space: BODIES[body].space, seg: BODIES[body].seg,
            ev: year >= 2016 && rng() < clamp((year - 2015) / 12, 0, 0.8),
        };
        const price = Math.round(fairPrice(spec, year) * (styleMod.price || 1) * (0.95 + rng() * 0.15));
        return { id: `c${c.id}_${Math.floor(rng() * 1e6)}`, name: `${c.name} ${pick(rng, CAR_NAME_PARTS)}`, spec, price, age: 0, launchYear: year, owner: c.id };
    }

    function pick(rng, arr) { return arr && arr.length ? arr[Math.floor(rng() * arr.length)] : null; }

    // ---------- PLAYER ACTIONS ----------
    const ERR = (m) => ({ ok: false, error: m });
    const OK = (d) => Object.assign({ ok: true }, d || {});

    function availableParts(g) {
        const has = (t) => !t || g.techs.includes(t);
        const y = g.year;
        return {
            bodies: Object.keys(BODIES).filter(k => BODIES[k].year <= y),
            engines: Object.keys(ENGINES).filter(k => ENGINES[k].year <= y && has(ENGINES[k].tech)),
            gearboxes: Object.keys(GEARBOXES).filter(k => GEARBOXES[k].year <= y && has(GEARBOXES[k].tech)),
            interiors: Object.keys(INTERIORS),
            safety: SAFETY.filter(s => has(s.tech)).map(s => s.id),
        };
    }

    function validateDesign(g, d) {
        const av = availableParts(g);
        if (!av.bodies.includes(d.body)) return 'الهيكل غير متاح';
        if (!av.engines.includes(d.engine)) return 'المحرك غير متاح';
        if (!av.gearboxes.includes(d.gearbox)) return 'ناقل الحركة غير متاح';
        if (!av.interiors.includes(d.interior)) return 'الداخلية غير متاحة';
        if (!av.safety.includes(d.safety)) return 'حزمة السلامة غير متاحة';
        const evEng = ENGINES[d.engine].ev, evGb = d.gearbox === 'ev1';
        if (evEng !== evGb) return 'المحرك الكهربائي يحتاج ناقل كهربائي (والعكس)';
        if (!d.name || d.name.trim().length < 2) return 'اسم الموديل قصير';
        return null;
    }

    function developmentCost(g, d) {
        const spec = carSpec(d, g.techs, g.year);
        const base = 200_000 + spec.partsCost * 120;
        return Math.round(base * inflation(g.year) * 0.6);
    }

    function designCar(g, d) {
        if (g.gameOver) return ERR('اللعبة انتهت');
        const err = validateDesign(g, d);
        if (err) return ERR(err);
        const cost = developmentCost(g, d);
        if (g.cash < cost) return ERR(`تحتاج ${fmtMoney(cost)} لتطوير الموديل`);
        const spec = carSpec(d, g.techs, g.year);
        const price = Math.max(Math.round(spec.partsCost * 1.2), d.price | 0);
        const model = {
            id: g.nextModelId++, name: d.name.trim().slice(0, 24), design: { ...d }, spec, price,
            color: d.color || COLORS[0], launchYear: g.year, launchTurn: g.turn, age: 0,
            sold: 0, revenue: 0, lastSales: 0, lastProfit: 0, discontinued: false,
            regions: Object.fromEntries(Object.keys(REGIONS).map(r => [r, true])),
        };
        g.cash -= cost;
        g.models.push(model);
        g.stats.modelsLaunched++;
        // assign to first idle factory automatically
        const idle = g.factories.find(f => f.assigned == null);
        if (idle) idle.assigned = model.id;
        pushNews(g, `أطلقت ${g.companyName} موديل "${model.name}" (${BODIES[d.body].name}) بسعر ${fmtMoney(price)}.`, 'good');
        return OK({ model, cost });
    }

    function setPrice(g, modelId, price) {
        const m = g.models.find(x => x.id === modelId); if (!m) return ERR('موديل غير موجود');
        price = Math.round(price);
        if (price < m.spec.partsCost * 0.8) return ERR('السعر أقل بكثير من تكلفة القطع');
        m.price = price; return OK();
    }

    function discontinue(g, modelId) {
        const m = g.models.find(x => x.id === modelId); if (!m) return ERR('موديل غير موجود');
        m.discontinued = true;
        for (const f of g.factories) if (f.assigned === modelId) f.assigned = null;
        pushNews(g, `تم إيقاف إنتاج "${m.name}" بعد بيع ${m.sold.toLocaleString()} وحدة.`, 'info');
        return OK();
    }

    function facelift(g, modelId, newDesign) {
        // Refresh model: reset age partially with new parts; cheaper than new model
        const m = g.models.find(x => x.id === modelId); if (!m) return ERR('موديل غير موجود');
        const d = { ...m.design, ...newDesign, name: m.name };
        const err = validateDesign(g, d); if (err) return ERR(err);
        const cost = Math.round(developmentCost(g, d) * 0.45);
        if (g.cash < cost) return ERR(`تحتاج ${fmtMoney(cost)} للتحديث`);
        g.cash -= cost;
        m.design = d; m.spec = carSpec(d, g.techs, g.year); m.age = Math.max(0, m.age * 0.3);
        if (newDesign.color) m.color = newDesign.color;
        pushNews(g, `تحديث (فيس ليفت) لموديل "${m.name}".`, 'info');
        return OK({ cost });
    }

    function toggleRegion(g, modelId, region) {
        const m = g.models.find(x => x.id === modelId); if (!m) return ERR('موديل غير موجود');
        m.regions[region] = !m.regions[region]; return OK();
    }

    function assignFactory(g, factoryId, modelId) {
        const f = g.factories.find(x => x.id === factoryId); if (!f) return ERR('مصنع غير موجود');
        if (modelId != null) { const m = g.models.find(x => x.id === modelId && !x.discontinued); if (!m) return ERR('موديل غير صالح'); }
        f.assigned = modelId; return OK();
    }

    function buildFactory(g, region) {
        if (!REGIONS[region]) return ERR('منطقة غير معروفة');
        const cost = Math.round(3_000_000 * inflation(g.year) * (REGIONS[region].income < 0.7 ? 0.7 : 1));
        if (g.cash < cost) return ERR(`تحتاج ${fmtMoney(cost)} لبناء مصنع`);
        g.cash -= cost;
        const f = makeFactory(g, region, 1);
        g.factories.push(f);
        pushNews(g, `افتُتح ${f.name} بطاقة ${factoryCapacity(f).toLocaleString()} سيارة/ربع.`, 'good');
        return OK({ factory: f, cost });
    }

    function expandFactory(g, factoryId) {
        const f = g.factories.find(x => x.id === factoryId); if (!f) return ERR('مصنع غير موجود');
        if (f.lines >= 8) return ERR('الحد الأقصى 8 خطوط');
        const cost = Math.round(1_500_000 * inflation(g.year));
        if (g.cash < cost) return ERR(`تحتاج ${fmtMoney(cost)}`);
        g.cash -= cost; f.lines++; f.workers += 600; return OK({ cost });
    }

    function upgradeAutomation(g, factoryId) {
        const f = g.factories.find(x => x.id === factoryId); if (!f) return ERR('مصنع غير موجود');
        const maxA = g.techs.includes('robots') ? 3 : 1;
        if (f.automation >= maxA) return ERR(maxA === 1 ? 'تحتاج بحث "روبوتات المصنع" للمستوى التالي' : 'أقصى مستوى أتمتة');
        const cost = Math.round(1_000_000 * (f.automation + 1) * f.lines * 0.5 * inflation(g.year));
        if (g.cash < cost) return ERR(`تحتاج ${fmtMoney(cost)}`);
        g.cash -= cost; f.automation++;
        f.workers = Math.round(f.workers * 0.8); // fewer workers
        return OK({ cost });
    }

    function setFactoryQuality(g, factoryId, q) {
        const f = g.factories.find(x => x.id === factoryId); if (!f) return ERR('مصنع غير موجود');
        f.quality = clamp(Math.round(q), 0, 100); return OK();
    }

    function startResearch(g, techId) {
        const t = TECHS[techId]; if (!t) return ERR('تقنية غير معروفة');
        if (g.techs.includes(techId)) return ERR('مكتشفة مسبقاً');
        if (g.year < t.year) return ERR(`غير ممكن قبل عام ${t.year}`);
        for (const r of t.req) if (!g.techs.includes(r)) return ERR(`يتطلب: ${TECHS[r].name}`);
        if (g.research && g.research.tech === techId) return ERR('قيد البحث حالياً');
        const cost = Math.round(t.cost * inflation(g.year) * 0.5);
        if (g.cash < cost) return ERR(`تحتاج ${fmtMoney(cost)} كدفعة أولى`);
        g.cash -= cost;
        g.research = { tech: techId, progress: 0, paid: cost };
        return OK({ cost });
    }

    function hire(g, kind, delta) {
        if (kind === 'engineers') g.engineers = clamp(g.engineers + delta, 5, 500);
        else if (kind === 'marketers') g.marketers = clamp(g.marketers + delta, 0, 500);
        else return ERR('نوع غير معروف');
        return OK();
    }

    function takeLoan(g, amount) {
        amount = Math.round(amount);
        const maxLoan = companyValue(g) * 0.8 + 2_000_000 * inflation(g.year);
        const outstanding = g.loans.reduce((s, l) => s + l.balance, 0);
        if (amount <= 0) return ERR('مبلغ غير صالح');
        if (outstanding + amount > maxLoan) return ERR(`البنك يرفض. الحد الأقصى المتاح ${fmtMoney(Math.max(0, maxLoan - outstanding))}`);
        const rate = (0.06 + (g.year >= 1979 && g.year <= 1984 ? 0.08 : 0) + (g.brand < 30 ? 0.03 : 0)) / 4;
        g.loans.push({ id: Date.now() + Math.floor(Math.random() * 1000), balance: amount, rate, turnsLeft: 20 });
        g.cash += amount;
        pushNews(g, `حصلت على قرض ${fmtMoney(amount)} بفائدة ${(rate * 400).toFixed(1)}% سنوياً.`, 'info');
        return OK();
    }

    function repayLoan(g, loanId) {
        const l = g.loans.find(x => x.id === loanId); if (!l) return ERR('قرض غير موجود');
        if (g.cash < l.balance) return ERR('لا يوجد سيولة كافية');
        g.cash -= l.balance; g.loans = g.loans.filter(x => x !== l); return OK();
    }

    function setRacing(g, active, budget) {
        g.racing.active = !!active; g.racing.budget = clamp(Math.round(budget || 0), 0, 50_000_000);
        return OK();
    }

    function setMarketing(g, region, level) {
        // handled via marketers spread; store per-region focus 0-3
        g.marketingFocus = g.marketingFocus || {};
        g.marketingFocus[region] = clamp(level | 0, 0, 3); return OK();
    }

    function resolveEvent(g, eventId, choiceIdx) {
        const idx = g.events.findIndex(e => e.id === eventId); if (idx < 0) return ERR('حدث غير موجود');
        const ev = g.events[idx];
        const ch = ev.choices[choiceIdx]; if (!ch) return ERR('خيار غير صالح');
        applyEffects(g, ch.effects);
        pushNews(g, `${ev.title}: اخترت "${ch.label}".`, 'event');
        g.events.splice(idx, 1);
        return OK();
    }

    function applyEffects(g, eff) {
        if (!eff) return;
        if (eff.cash) g.cash += eff.cash;
        if (eff.brand) g.brand = clamp(g.brand + eff.brand, 0, 100);
        if (eff.awarenessAll) for (const r in g.awareness) g.awareness[r] = clamp(g.awareness[r] + eff.awarenessAll, 0, 1);
        if (eff.strike) g.strike = (g.strike || 0) + eff.strike;
        if (eff.relAll) for (const m of g.models) m.spec.rel = clamp(m.spec.rel + eff.relAll, 30, 99);
        if (eff.tech && !g.techs.includes(eff.tech)) g.techs.push(eff.tech);
        if (eff.fuel) g.fuelPrice = Math.max(0.5, g.fuelPrice + eff.fuel);
        if (eff.recession) g.recession = eff.recession;
    }

    // ---------- TURN PROCESSING ----------
    function endTurn(g) {
        if (g.gameOver) return ERR('اللعبة انتهت');
        if (g.events.length) return ERR('لديك أحداث تنتظر قرارك');
        const rng = getRng(g);
        const year = g.year, era = eraModifiers(year);
        const infl = inflation(year);
        const summary = { year, quarter: g.quarter, revenue: 0, costs: 0, profit: 0, sold: 0, salesByModel: {}, salesByRegion: {}, notes: [] };

        // 1. Scripted/random world events
        worldEvents(g, rng, summary);

        // 2. Age models & competitors, competitors release new models
        const designStudio = g.techs.includes('design');
        for (const m of g.models) if (!m.discontinued) m.age += designStudio ? 0.15 : 0.25;
        for (const c of g.competitors) {
            for (const m of c.models) m.age += 0.25;
            c.models = c.models.filter(m => m.age < 7);
            if (c.models.length < 3 || rng() < 0.08) c.models.push(makeCompetitorModel(g, c, rng));
            c.brand = clamp(c.brand + (rng() - 0.5) * 2, 20, 95);
        }

        // 3. Production capacity per model
        const capacity = {}; const prodCost = {}; let fixed = 0;
        for (const f of g.factories) {
            fixed += factoryFixedCost(f, year);
            if (f.assigned == null) continue;
            const m = g.models.find(x => x.id === f.assigned && !x.discontinued);
            if (!m) { f.assigned = null; continue; }
            let cap = factoryCapacity(f);
            if (g.strike && g.strike > 0) cap *= 0.3;
            cap *= (1 - (100 - f.quality) / 100 * 0.05); // low QC = slightly faster
            capacity[m.id] = (capacity[m.id] || 0) + Math.round(cap);
            const lean = g.techs.includes('lean') ? 0.9 : 1;
            const unit = (m.spec.partsCost * lean * (1 - f.automation * 0.06) + factoryUnitLaborCost(f, year)) * (1 + (f.quality - 50) / 100 * 0.15);
            prodCost[m.id] = unit; // last factory wins; fine
            // factory quality affects reliability of units this turn
            m.effRel = clamp(m.spec.rel + (f.quality - 50) * 0.2, 30, 99);
        }
        if (g.strike > 0) { g.strike--; summary.notes.push('إضراب العمال خفّض الإنتاج 70%'); }

        // 4. Market simulation per region/segment
        const demandBase = (g.recession > 0 ? 0.75 : 1);
        const allSellers = []; // {model, owner, brand, awareness}
        for (const m of g.models) if (!m.discontinued) allSellers.push({ m, owner: 'player', brand: g.brand });
        for (const c of g.competitors) for (const m of c.models) allSellers.push({ m, owner: c.id, brand: c.brand });

        const demandByModel = {};
        for (const rid in REGIONS) {
            const R = REGIONS[rid];
            let regionDemand = R.demand * era.growth * demandBase * 0.25; // quarterly (base numbers are annual-ish/4)
            if (rid === 'asia') regionDemand *= era.asiaBoom;
            regionDemand *= (0.95 + rng() * 0.1);
            summary.salesByRegion[rid] = 0;
            for (const seg of SEGMENTS) {
                let segShare = R.segs[seg];
                if (era.suvShift > 0) { // SUVs eat family/economy share
                    if (seg === 'suv') segShare += 0.25 * era.suvShift;
                    if (seg === 'family') segShare -= 0.15 * era.suvShift;
                    if (seg === 'economy') segShare -= 0.08 * era.suvShift;
                }
                if (year < 1985 && seg === 'suv') segShare = 0.02;
                if (segShare <= 0) continue;
                const segDemand = regionDemand * segShare;
                // sellers in this segment
                const list = allSellers.filter(s => s.m.spec.seg === seg && (s.owner !== 'player' || s.m.regions[rid]));
                if (!list.length) continue;
                // "generic others" baseline seller to absorb demand
                const scored = list.map(s => {
                    const aw = s.owner === 'player' ? g.awareness[rid] : (s.owner === g.competitors[s.owner].home ? 1 : 0.7);
                    const a = appeal(s.m, R, era, s.brand, s.owner === 'player' ? aw : 0.85, year, g.fuelPrice);
                    return { s, a: Math.pow(a, 3) };
                });
                const baselineA = Math.pow(5.5, 3) * 4; // unbranded/local competitors
                const total = scored.reduce((x, y) => x + y.a, 0) + baselineA;
                for (const sc of scored) {
                    const units = Math.round(segDemand * sc.a / total);
                    if (sc.s.owner === 'player') {
                        demandByModel[sc.s.m.id] = demandByModel[sc.s.m.id] || {};
                        demandByModel[sc.s.m.id][rid] = units;
                    }
                }
            }
        }

        // 5. Fulfill demand limited by capacity, compute revenue
        for (const m of g.models) {
            if (m.discontinued) continue;
            const dem = demandByModel[m.id] || {};
            const totalDem = Object.values(dem).reduce((a, b) => a + b, 0);
            const cap = capacity[m.id] || 0;
            const sold = Math.min(totalDem, cap);
            const ratio = totalDem > 0 ? sold / totalDem : 0;
            m.demandLast = totalDem; m.capLast = cap;
            m.lastSales = sold;
            for (const rid in dem) summary.salesByRegion[rid] += Math.round(dem[rid] * ratio);
            const unitCost = prodCost[m.id] || m.spec.partsCost * 1.3;
            const rev = sold * m.price;
            const cost = sold * unitCost;
            // shipping/tariff cost for foreign sales
            let ship = 0;
            for (const rid in dem) { const isHome = g.factories.some(f => f.assigned === m.id && f.region === rid); if (!isHome) ship += Math.round(dem[rid] * ratio) * 250 * infl; }
            m.lastProfit = rev - cost - ship;
            m.sold += sold; m.revenue += rev;
            summary.revenue += rev; summary.costs += cost + ship; summary.sold += sold;
            summary.salesByModel[m.id] = sold;
            // Awareness grows where you sell
            for (const rid in dem) if (dem[rid] > 0) g.awareness[rid] = clamp(g.awareness[rid] + Math.min(0.03, dem[rid] / 200000), 0, 1);
            // Reliability incidents
            const rel = m.effRel || m.spec.rel;
            if (sold > 2000 && rng() < (100 - rel) / 400) {
                const recallCost = Math.round(sold * 120 * infl * ((100 - rel) / 50));
                summary.costs += recallCost;
                g.brand = clamp(g.brand - 2, 0, 100);
                pushNews(g, `استدعاء لموديل "${m.name}" بسبب عيوب: كلّف ${fmtMoney(recallCost)} وأضر بالسمعة.`, 'bad');
            }
        }

        // 6. Fixed costs: factories, salaries, marketing, R&D, racing
        const salaries = (g.engineers * 6_000 + g.marketers * 4_500) * infl;
        let marketing = 0;
        g.marketingFocus = g.marketingFocus || {};
        for (const rid in REGIONS) {
            const lvl = g.marketingFocus[rid] || 0;
            if (lvl > 0) {
                const spend = lvl * 150_000 * infl * (REGIONS[rid].demand / 500_000);
                marketing += spend;
                const eff = (g.marketers / 20) * lvl * 0.02;
                g.awareness[rid] = clamp(g.awareness[rid] + eff, 0, 1);
            }
        }
        // awareness decays slowly without marketing
        for (const rid in g.awareness) g.awareness[rid] = clamp(g.awareness[rid] - 0.005, 0.02, 1);

        let racingCost = 0;
        if (g.racing.active) {
            racingCost = g.racing.budget;
            const bestPerf = Math.max(0, ...g.models.filter(m => !m.discontinued).map(m => m.spec.perf));
            const winChance = clamp(0.05 + (racingCost / (2_000_000 * infl)) * 0.1 + bestPerf * 0.03, 0.02, 0.6);
            if (rng() < winChance) {
                g.racing.wins++; g.brand = clamp(g.brand + 3, 0, 100);
                for (const rid in g.awareness) g.awareness[rid] = clamp(g.awareness[rid] + 0.04, 0, 1);
                pushNews(g, `🏆 فريق ${g.companyName} يفوز ببطولة سباقات! السمعة +3 وانتشار عالمي.`, 'good');
            }
        }

        // Research progress
        let rdCost = 0;
        if (g.research) {
            const t = TECHS[g.research.tech];
            rdCost = t.cost * infl * 0.5 / t.turns; // remaining half paid over duration
            const speed = clamp(g.engineers / 20, 0.4, 3);
            g.research.progress += speed / t.turns;
            if (g.research.progress >= 1) {
                g.techs.push(g.research.tech);
                pushNews(g, `🔬 اكتمل البحث: ${t.name}. ${t.desc}`, 'good');
                g.research = null;
                if (g.techs.length === 5) unlockAch(g, 'tech5', 'مبتكر: 5 تقنيات');
            }
        }

        // Loans
        let interest = 0;
        for (const l of g.loans) {
            const pay = l.balance * l.rate; interest += pay;
            const principal = Math.min(l.balance, l.balance / Math.max(1, l.turnsLeft));
            l.balance -= principal; l.turnsLeft--; interest += principal;
        }
        g.loans = g.loans.filter(l => l.balance > 1);

        const totalFixed = fixed + salaries + marketing + racingCost + rdCost + interest;
        summary.costs += totalFixed;
        summary.profit = summary.revenue - summary.costs;
        summary.fixedBreakdown = { factories: fixed, salaries, marketing, racing: racingCost, rd: rdCost, loans: interest };
        g.cash += summary.revenue - summary.costs;

        // Taxes on profit
        if (summary.profit > 0) { const tax = summary.profit * 0.2; g.cash -= tax; summary.tax = tax; summary.profit -= tax; }

        // Brand dynamics: sales growth & quality raise brand, no models lowers it
        const activeModels = g.models.filter(m => !m.discontinued);
        if (activeModels.length) {
            const avgRel = activeModels.reduce((s, m) => s + m.spec.rel, 0) / activeModels.length;
            const avgAge = activeModels.reduce((s, m) => s + m.age, 0) / activeModels.length;
            g.brand = clamp(g.brand + (avgRel - 75) * 0.02 + (summary.sold > 20000 ? 0.4 : 0) - (avgAge > 4 ? 0.5 : 0), 0, 100);
        } else g.brand = clamp(g.brand - 0.3, 0, 100);

        // Recession countdown, fuel drift
        if (g.recession > 0) g.recession--;
        g.fuelPrice = lerp(g.fuelPrice, 1 + (year > 2000 ? 0.3 : 0), 0.08);

        // Stats
        g.stats.totalSold += summary.sold; g.stats.totalRevenue += summary.revenue; g.stats.totalProfit += summary.profit;
        g.stats.bestQuarter = Math.max(g.stats.bestQuarter, summary.profit);
        if (g.stats.totalSold >= 100_000) unlockAch(g, 'sold100k', '100 ألف سيارة مباعة');
        if (g.stats.totalSold >= 1_000_000) unlockAch(g, 'sold1m', 'مليون سيارة!');
        if (g.brand >= 80) unlockAch(g, 'brand80', 'ماركة عالمية (سمعة 80)');
        if (g.factories.length >= 3) unlockAch(g, 'fac3', 'إمبراطورية صناعية: 3 مصانع');

        g.history.push({ y: year, q: g.quarter, cash: Math.round(g.cash), profit: Math.round(summary.profit), revenue: Math.round(summary.revenue), sold: summary.sold, brand: Math.round(g.brand), value: Math.round(companyValue(g)) });
        if (g.history.length > 400) g.history.shift();

        // Advance time
        g.turn++;
        g.quarter++;
        if (g.quarter > 4) { g.quarter = 1; g.year++; }

        // Bankruptcy
        const limit = -3_000_000 * infl;
        if (g.cash < limit) {
            g.negativeTurns = (g.negativeTurns || 0) + 1;
            if (g.negativeTurns >= 3) { g.gameOver = true; g.gameOverReason = 'bankrupt'; pushNews(g, `💀 أعلنت ${g.companyName} إفلاسها.`, 'bad'); }
            else pushNews(g, `⚠️ تحذير البنك: الديون تجاوزت الحد. ${3 - g.negativeTurns} أرباع قبل الإفلاس.`, 'bad');
        } else g.negativeTurns = 0;
        if (g.year > END_YEAR) { g.gameOver = true; g.gameOverReason = 'end'; pushNews(g, `🏁 وصلت لعام 2030! القيمة النهائية للشركة: ${fmtMoney(companyValue(g))}`, 'good'); }

        saveRng(g, rng);
        g.lastSummary = summary;
        return OK({ summary });
    }

    function unlockAch(g, id, name) { if (!g.achievements.find(a => a.id === id)) { g.achievements.push({ id, name, year: g.year }); pushNews(g, `🏅 إنجاز: ${name}`, 'good'); } }

    function worldEvents(g, rng, summary) {
        const y = g.year, q = g.quarter;
        const key = `${y}q${q}`;
        const scripted = {
            '1965q2': { title: 'قانون السلامة الأمريكي', text: 'الكونغرس يناقش فرض أحزمة الأمان. الرأي العام يهتم بالسلامة أكثر.', choices: [{ label: 'ندعم القانون علنياً (+سمعة، -$200k)', effects: { brand: 4, cash: -200_000 } }, { label: 'نتجاهل', effects: {} }] },
            '1973q4': { title: 'أزمة النفط 1973', text: 'حظر نفطي عربي. أسعار الوقود تضاعفت! المشترون يهربون من السيارات الكبيرة.', choices: [{ label: 'إعلان طارئ لسياراتنا الاقتصادية (-$500k, +انتشار)', effects: { cash: -500_000, awarenessAll: 0.08, fuel: 1.0 } }, { label: 'نتحمل العاصفة', effects: { fuel: 1.0 } }] },
            '1979q2': { title: 'أزمة النفط الثانية', text: 'الثورة الإيرانية تقطع الإمدادات. الوقود غالي مجدداً والفائدة البنكية ترتفع.', choices: [{ label: 'حسناً', effects: { fuel: 0.7, recession: 4 } }] },
            '1985q1': { title: 'موضة الـ SUV تبدأ', text: 'سوق الدفع الرباعي العائلي يبدأ بالنمو في أمريكا. الشركات المبكرة ستربح.', choices: [{ label: 'مفهوم', effects: {} }] },
            '1991q1': { title: 'انهيار الاتحاد السوفيتي', text: 'أسواق جديدة تنفتح في أوروبا الشرقية. الطلب الأوروبي يرتفع مؤقتاً.', choices: [{ label: 'نستثمر بحملة أوروبية (-$1M)', effects: { cash: -1_000_000, awarenessAll: 0.1 } }, { label: 'لا', effects: {} }] },
            '1997q3': { title: 'الأزمة المالية الآسيوية', text: 'انهيار العملات الآسيوية. الطلب في آسيا ينخفض لمدة سنة.', choices: [{ label: 'حسناً', effects: { recession: 3 } }] },
            '2008q3': { title: 'الأزمة المالية العالمية', text: 'انهيار ليمان براذرز. مبيعات السيارات تنهار عالمياً. الحكومات تعرض خطط إنقاذ.', choices: [{ label: 'نقبل إنقاذاً حكومياً (+$20M، -15 سمعة)', effects: { cash: 20_000_000, brand: -15, recession: 6 } }, { label: 'نصمد بأنفسنا (+8 سمعة)', effects: { brand: 8, recession: 6 } }] },
            '2015q3': { title: 'فضيحة انبعاثات الديزل', text: 'منافس كبير ضُبط يغش في اختبارات الانبعاثات. الثقة بالديزل تنهار، والاهتمام بالكهرباء يرتفع.', choices: [{ label: 'حسناً', effects: {} }] },
            '2020q1': { title: 'جائحة عالمية', text: 'إغلاقات عالمية. المصانع تتوقف والطلب ينخفض بشدة، ثم نقص رقائق.', choices: [{ label: 'نغلق مؤقتاً ونحافظ على العمال (-$5M, +5 سمعة)', effects: { cash: -5_000_000, brand: 5, recession: 4 } }, { label: 'نسرّح عمالاً (-8 سمعة)', effects: { brand: -8, recession: 4 } }] },
            '2022q1': { title: 'دعم حكومي للكهرباء', text: 'حوافز ضخمة لمشتري السيارات الكهربائية في أمريكا وأوروبا.', choices: [{ label: 'ممتاز', effects: {} }] },
        };
        if (scripted[key]) g.events.push({ id: key, ...scripted[key] });

        // Random events
        const r = rng();
        if (r < 0.04 && g.factories.length) {
            g.events.push({ id: 'strike' + g.turn, title: 'تهديد بإضراب', text: 'نقابة العمال تطالب بزيادة 15% في الأجور وإلا سيضرب العمال.', choices: [{ label: 'نوافق على الزيادة', effects: { cash: -Math.round(g.factories.length * 300_000 * inflation(g.year)) } }, { label: 'نرفض (إضراب ربعين)', effects: { strike: 2, brand: -3 } }] });
        } else if (r < 0.07 && g.models.some(m => !m.discontinued)) {
            g.events.push({ id: 'review' + g.turn, title: 'مجلة سيارات تطلب اختبار سياراتك', text: 'مجلة عالمية تريد مراجعة موديلاتك. النتيجة تعتمد على جودتك.', choices: [{ label: 'نوافق', effects: reviewEffect(g) }, { label: 'نرفض بأدب', effects: {} }] });
        } else if (r < 0.09) {
            g.events.push({ id: 'poach' + g.turn, title: 'مهندس عبقري متاح', text: 'كبير مهندسي منافس يعرض الانضمام إليك مقابل مكافأة توقيع.', choices: [{ label: `ندفع ${fmtMoney(800_000 * inflation(g.year))} (+15 مهندس)`, effects: { cash: -Math.round(800_000 * inflation(g.year)), engineers: 15 } }, { label: 'لا', effects: {} }] });
        } else if (r < 0.11 && g.brand > 40) {
            g.events.push({ id: 'movie' + g.turn, title: 'فيلم هوليوودي يريد سيارتك', text: 'استوديو سينمائي يريد استخدام إحدى سياراتك كسيارة البطل.', choices: [{ label: 'نعطيها مجاناً (+انتشار كبير)', effects: { awarenessAll: 0.15, brand: 3 } }, { label: 'نطلب أجراً (+$2M)', effects: { cash: Math.round(2_000_000 * inflation(g.year) * 0.3), awarenessAll: 0.05 } }] });
        }
    }

    function reviewEffect(g) {
        const active = g.models.filter(m => !m.discontinued);
        const best = active.reduce((b, m) => (m.spec.rel + m.spec.perf * 5 + m.spec.comfort * 5) > (b.spec.rel + b.spec.perf * 5 + b.spec.comfort * 5) ? m : b, active[0]);
        const score = best.spec.rel + best.spec.perf * 5 + best.spec.comfort * 5; // ~60..200
        return score > 140 ? { brand: 6, awarenessAll: 0.06 } : score > 100 ? { brand: 2 } : { brand: -4 };
    }

    // Apply extra event effects (engineers)
    const _applyEffects = applyEffects;
    applyEffects = function (g, eff) { _applyEffects(g, eff); if (eff && eff.engineers) g.engineers += eff.engineers; };

    function companyValue(g) {
        const infl = inflation(g.year);
        let v = g.cash;
        for (const f of g.factories) v += (f.lines * 2_000_000 + f.automation * 800_000) * infl;
        v += g.brand * 150_000 * infl;
        v += g.techs.length * 300_000 * infl;
        for (const m of g.models) if (!m.discontinued) v += m.lastProfit * 6;
        v -= g.loans.reduce((s, l) => s + l.balance, 0);
        return v;
    }

    function pushNews(g, text, type) {
        g.news.unshift({ text, type: type || 'info', year: g.year, quarter: g.quarter });
        if (g.news.length > 60) g.news.pop();
    }

    function fmtMoney(v) {
        const a = Math.abs(v); const sign = v < 0 ? '-' : '';
        if (a >= 1e9) return sign + '$' + (a / 1e9).toFixed(2) + 'B';
        if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(2) + 'M';
        if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(0) + 'K';
        return sign + '$' + Math.round(a);
    }

    // Market intelligence for UI: what each region wants right now
    function marketReport(g) {
        const era = eraModifiers(g.year);
        const out = {};
        for (const rid in REGIONS) {
            const R = REGIONS[rid];
            const segs = {};
            for (const seg of SEGMENTS) {
                let s = R.segs[seg];
                if (era.suvShift > 0) { if (seg === 'suv') s += 0.25 * era.suvShift; if (seg === 'family') s -= 0.15 * era.suvShift; if (seg === 'economy') s -= 0.08 * era.suvShift; }
                if (g.year < 1985 && seg === 'suv') s = 0.02;
                segs[seg] = Math.max(0, s);
            }
            let demand = R.demand * era.growth * 0.25 * (g.recession > 0 ? 0.75 : 1);
            if (rid === 'asia') demand *= era.asiaBoom;
            const wants = Object.entries({ ...R.w, eco: R.w.eco * era.ecoImportance * g.fuelPrice, safety: R.w.safety * era.safetyImportance }).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
            out[rid] = { name: R.name, demand: Math.round(demand), segs, wants, awareness: g.awareness[rid], income: R.income, competitors: g.competitors.flatMap(c => c.models.map(m => ({ ...m, company: c.name }))).slice(0, 6) };
        }
        return out;
    }

    // Estimate for the design screen: expected quarterly sales + margin per region at price
    function estimate(g, design, price) {
        const err = validateDesign(g, { ...design, name: design.name || 'xx' });
        if (err) return null;
        const spec = carSpec(design, g.techs, g.year);
        const era = eraModifiers(g.year);
        const fake = { spec, price, age: 0, regions: {} };
        const per = {};
        let total = 0;
        for (const rid in REGIONS) {
            const R = REGIONS[rid];
            const a = appeal(fake, R, era, g.brand, g.awareness[rid], g.year, g.fuelPrice);
            const rivals = g.competitors.flatMap(c => c.models.filter(m => m.spec.seg === spec.seg).map(m => Math.pow(appeal(m, R, era, c.brand, 0.85, g.year, g.fuelPrice), 3)));
            const baseline = Math.pow(5.5, 3) * 4;
            const total_ = rivals.reduce((x, y) => x + y, 0) + baseline + Math.pow(a, 3);
            let segShare = R.segs[spec.seg];
            if (era.suvShift > 0) { if (spec.seg === 'suv') segShare += 0.25 * era.suvShift; if (spec.seg === 'family') segShare -= 0.15 * era.suvShift; if (spec.seg === 'economy') segShare -= 0.08 * era.suvShift; }
            if (g.year < 1985 && spec.seg === 'suv') segShare = 0.02;
            let demand = R.demand * era.growth * 0.25 * segShare;
            if (rid === 'asia') demand *= era.asiaBoom;
            const units = Math.round(demand * Math.pow(a, 3) / total_);
            per[rid] = { units, appeal: a };
            total += units;
        }
        return { spec, per, total, fair: fairPrice(spec, g.year), margin: price - spec.partsCost * 1.25 };
    }

    return {
        START_YEAR, END_YEAR, BODIES, ENGINES, GEARBOXES, INTERIORS, SAFETY, TECHS, REGIONS, SEGMENTS, SEG_NAMES, COLORS,
        newGame, endTurn, designCar, setPrice, discontinue, facelift, toggleRegion, assignFactory, buildFactory, expandFactory,
        upgradeAutomation, setFactoryQuality, startResearch, hire, takeLoan, repayLoan, setRacing, setMarketing, resolveEvent,
        carSpec, availableParts, developmentCost, companyValue, fmtMoney, inflation, marketReport, estimate, factoryCapacity,
        factoryFixedCost, fairPrice, eraModifiers,
    };
});
