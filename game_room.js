/**
 * Hyper-Lane Tactics Online - Game Room & Deterministic Engine
 * Universal Module: Runs natively in Browser and in Node.js WebSocket Server.
 * 20 Ticks/sec (50ms per tick) with pure serializable state.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TacticalGameRoom = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // --- ARENA CONSTANTS (1080 x 1920 Virtual Resolution) ---
    const ARENA = {
        WIDTH: 1080,
        HEIGHT: 1920,
        LANES: {
            0: { id: 0, name: 'Left Flank', x: 230, width: 220, speedMultiplier: 1.0 },
            1: { id: 1, name: 'Hyper-Lane', x: 540, width: 240, speedMultiplier: 1.4 },
            2: { id: 2, name: 'Right Flank', x: 850, width: 220, speedMultiplier: 1.0 }
        },
        RELAY_CORE: { x: 540, y: 820, radius: 60, cooldownDuration: 240 }, // 12 seconds = 240 ticks
        DEPLOY_ZONE_DEFAULT: 900, // Visible arena deployment zone (above card dock)
        DEPLOY_ZONE_EXTENDED: 580, // If enemy flank tower is destroyed
        TICK_RATE: 20, // 20 Ticks/s
        TICK_INTERVAL_MS: 50, // 50ms per tick
        MATCH_DURATION_TICKS: 2400, // 120 seconds = 2400 ticks
        DOUBLE_ENERGY_TICK: 1200, // 60 seconds mark
        OVERTIME_MAX_TICKS: 1200 // 60 seconds overtime
    };

    // --- CARD DATABASE CONTRACT ---
    const CARD_DATABASE = {
        scout_drone: {
            id: 'scout_drone',
            name: 'Scout Drone',
            role: 'striker',
            cost: 2,
            hp: 420,
            damage: 115,
            attackSpeed: 0.85, // Fast twin lasers
            range: 210,
            speed: 155, // High-speed flyer
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: false,
            description: 'طائرة استطلاع نفاثة فائقة السرعة بليزر مزدوج سريع الإطلاق؛ ممتازة لاصطياد الدبابات البطيئة ومطاردة الأهداف.',
            rarity: 'common',
            fusionTarget: 'plasma_mod',
            fusesInto: 'railgun_drone'
        },
        cyber_trooper: {
            id: 'cyber_trooper',
            name: 'Cyber Trooper',
            role: 'striker',
            cost: 3,
            hp: 950,
            damage: 135,
            attackSpeed: 0.85,
            range: 85, // Carbine & energy bayonet
            speed: 95,
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: false,
            description: 'مقاتل خط أول مدرع؛ يجمع بين كثافة النيران والدفاع الصلب، ويشكل عماد أي هجوم متوازن.',
            rarity: 'common',
            fusionTarget: 'nano_repair',
            fusesInto: 'shield_vanguard'
        },
        mech_titan: {
            id: 'mech_titan',
            name: 'Mech Titan',
            role: 'vanguard',
            cost: 5,
            hp: 3200,
            damage: 260,
            attackSpeed: 1.7,
            range: 85,
            speed: 55,
            targetPref: 'structures_only',
            splashRadius: 0,
            isHeavy: true,
            description: 'عملاق فولاذي كاسح بدروع ثقيلة تمتص 18% من الضرر؛ يتجاهل المشاة ويسحق قلاع وأبراج العدو بضربات ساحقة.',
            rarity: 'epic',
            fusionTarget: 'emp_overcharge',
            fusesInto: 'siege_colossus'
        },
        plasma_caster: {
            id: 'plasma_caster',
            name: 'Plasma Caster',
            role: 'striker',
            cost: 4,
            hp: 620,
            damage: 210,
            attackSpeed: 1.5,
            range: 270, // Long-range mortar
            speed: 75,
            targetPref: 'first_in_line',
            splashRadius: 100,
            isHeavy: false,
            description: 'مدفعية بلازما ثقيلة بعيدة المدى؛ تقصف الأعداء من خلف النهر وتفجر الحشود بكرة بلازمية متوهجة.',
            rarity: 'rare',
            fusionTarget: 'plasma_mod',
            fusesInto: 'super_caster'
        },
        swarm_droids: {
            id: 'swarm_droids',
            name: 'Swarm Droids',
            role: 'disruptor',
            cost: 3,
            count: 4,
            hp: 190,
            damage: 85,
            attackSpeed: 0.75,
            range: 55,
            speed: 145,
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: false,
            description: 'سرب هجومي سريع مكون من 4 درويدات قاطعة؛ تلتف حول العمالقة وتفتك بهم، وتتأثر بالهجمات المتفجرة.',
            rarity: 'common',
            fusionTarget: null
        },
        plasma_mod: {
            id: 'plasma_mod',
            name: 'Plasma Strike',
            role: 'catalyst',
            cost: 3,
            isSpell: true,
            rarity: 'rare',
            description: 'تعويذة ضربة البلازما المتفجرة (نطاق 340px): تفجير فوري بقوة 420 ضرر يطيح بالمشاة الخفيفة، مع إشعال الأرض بنيران البلازما الحارقة التي تستمر 3 ثوانٍ وتصهر الأسراب، وتسريع هجوم الحلفاء.',
            catalystFor: ['scout_drone', 'plasma_caster', 'ghost_sniper', 'mortar_cannon']
        },
        nano_repair: {
            id: 'nano_repair',
            name: 'Nano Aegis',
            role: 'catalyst',
            cost: 2,
            isSpell: true,
            rarity: 'rare',
            description: 'تعويذة درع النانو الفائق (نطاق 340px): إزالة فورية لأي تجميد أو صعق عن جنودك، ومنح درع نانوي صلب 650 نقطة وتسريع، وترميم 450 نقطة للأبراج المتضررة.',
            catalystFor: ['cyber_trooper', 'sentry_bunker', 'aero_repairer']
        },
        emp_overcharge: {
            id: 'emp_overcharge',
            name: 'EMP Cascade',
            role: 'tactical_spell',
            cost: 3,
            isSpell: true,
            rarity: 'legendary',
            description: 'تعويذة العاصفة الكهرومغناطيسية (نطاق 340px): صعقة فتاكة بـ 320 ضرر تشل حركة الأعداء لمدة 2.8 ثانية، تدمر جميع دروعهم فوراً، وتعطل أبراج العدو وتعيد ضبط شحنها لمدة 3 ثوانٍ.',
            catalystFor: ['mech_titan']
        },
        ghost_sniper: {
            id: 'ghost_sniper',
            name: 'Ghost Marksman',
            role: 'sniper',
            cost: 4,
            hp: 480,
            damage: 340,
            attackSpeed: 2.1,
            range: 360,
            speed: 70,
            targetPref: 'highest_hp',
            splashRadius: 0,
            isHeavy: false,
            stealthDuration: 2.5,
            rarity: 'epic',
            description: 'قناص شبحي فائق المدى بطلقات كهرومغناطيسية خارقة؛ يستهدف أضخم الأعداء كأولوية ويملك تمويهاً خفياً عند النزول.',
            fusionTarget: 'plasma_mod',
            fusesInto: 'vortex_sniper'
        },
        sentry_bunker: {
            id: 'sentry_bunker',
            name: 'Sentry Bunker',
            role: 'defense',
            cost: 3,
            hp: 1400,
            damage: 52,
            attackSpeed: 0.32,
            range: 520, // 360° defensive perimeter covering entire friendly zone & bridges
            minRange: 0,
            speed: 0,
            isBuilding: true,
            omniTargeting: true, // Targets across all lanes, prioritizing bridge intruders!
            decayTimer: 35,
            targetPref: 'omni_defense',
            splashRadius: 0,
            isHeavy: true,
            rarity: 'rare',
            description: 'برج دفاعي سيبراني ثماني الأضلاع يمسح كامل منطقتك 360 درجة؛ يتعقب ويطلق نيرانه على أي عدو يعبر أي جسر بدون التقيد بمسار محدد برشاش ليزري غاتلينغ فائق السرعة.',
            fusionTarget: 'nano_repair',
            fusesInto: 'fortress_turret'
        },
        mortar_cannon: {
            id: 'mortar_cannon',
            name: 'Mortar Cannon',
            role: 'siege',
            cost: 4,
            hp: 1350,
            damage: 280,
            attackSpeed: 3.5,
            range: 650, // Long-range siege bombardment!
            minRange: 140, // Blind spot (deadzone for close enemies)
            speed: 0,
            isBuilding: true,
            omniTargeting: true, // Targets across lanes
            decayTimer: 32,
            targetPref: 'ground_units_and_towers',
            splashRadius: 130, // Wide AoE explosion
            isHeavy: true,
            rarity: 'epic',
            description: 'مدفع هاون حصار ثقيل بعيد المدى؛ يطلق قذائف بلازما متفجرة مقوسة على الأعداء والمباني بضرر جماعي واسع، مع نقطة عمياء في محيطه المباشر.',
            fusionTarget: 'plasma_mod',
            fusesInto: 'hellfire_mortar'
        },
        orbital_salvo: {
            id: 'orbital_salvo',
            name: 'Orbital Barrage',
            role: 'tactical_spell',
            cost: 4,
            isSpell: true,
            rarity: 'epic',
            description: 'تعويذة القصف الصاروخي المداري (نطاق 340px): انهمار وابل من 6 صواريخ حرارية عالية الانفجار تلحق 160 ضرر لكل صاروخ (إجمالي 960 ضرر) مع مضاعف ضرر تدميري للمباني وهزة عنيفة.',
            catalystFor: []
        },
        aero_repairer: {
            id: 'aero_repairer',
            name: 'Aero-Medic Drone',
            role: 'support',
            cost: 3,
            hp: 520,
            damage: 0,
            attackSpeed: 0.5,
            range: 240,
            speed: 110,
            healer: true,
            healRate: 70,
            targetPref: 'friendly_injured',
            splashRadius: 0,
            isHeavy: false,
            rarity: 'rare',
            description: 'طائرة دعم لوجستي حليفة طائرة؛ ترسل شعاع ليزر نانوي مستمر لترميم وتطبيب القوات الصديقة في الميدان.',
            fusionTarget: 'nano_repair',
            fusesInto: 'overcharge_drone'
        },
        drone_factory: {
            id: 'drone_factory',
            name: 'Drone Hub',
            role: 'spawner',
            cost: 4,
            hp: 1150,
            damage: 0,
            attackSpeed: 0,
            range: 0,
            speed: 0,
            isBuilding: true,
            isSpawner: true,
            spawnCardId: 'scout_drone',
            spawnCount: 2,
            spawnInterval: 7.0,
            decayTimer: 30,
            isHeavy: true,
            rarity: 'epic',
            description: 'مصنع درونات عسكري مستقل؛ يطلق زوجاً من طائرات الدرون الهجومية كل 7 ثوانٍ نحو مسار العدو مع مدة بقاء 30 ثانية.',
            fusionTarget: null
        },
        cryo_freeze: {
            id: 'cryo_freeze',
            name: 'Absolute Zero Freeze',
            role: 'tactical_spell',
            cost: 3,
            isSpell: true,
            freezeDuration: 4.0,
            freezeRadius: 170,
            damage: 160,
            description: 'تعويذة التجميد المطلق (نطاق 340px): تجميد كامل وفوري لجميع جنود وأبراج الخصم لمدة 4.0 ثوانٍ، يسحق الأسراب الضعيفة أقل من 250 HP لشظايا ثلجية، ويترك الأعداء بطيئين بنسبة 40% لمدة ثانيتين بعد الذوبان.',
            rarity: 'epic',
            catalystFor: []
        },
        inferno_tower: {
            id: 'inferno_tower',
            name: 'Inferno Tower',
            role: 'defender',
            cost: 5,
            hp: 1450,
            damage: 40,
            attackSpeed: 0.25,
            range: 240,
            speed: 0,
            isBuilding: true,
            isRamping: true,
            maxRampDamage: 850,
            decayTimer: 35,
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: true,
            rarity: 'legendary',
            description: 'برج ليزري حراري أسطوري؛ يطلق شعاعاً متصلاً يتصاعد ضرره بمرور الوقت ليدمر أعتى المدرعات، وتتم إعادة ضبطه عند الصعق أو تغير الهدف.',
            fusionTarget: null
        },
        electro_striker: {
            id: 'electro_striker',
            name: 'Electro Striker',
            role: 'disruptor',
            cost: 4,
            hp: 820,
            damage: 130,
            attackSpeed: 1.1,
            range: 165,
            speed: 110,
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: false,
            isTwinZap: true,
            rarity: 'legendary',
            description: 'مقاتل تكتيكي أسطوري سريع؛ يطلق صدمات صعق كهربائية مزدوجة تعطل الأعداء لمدة 0.5 ثانية (Micro-Stun) وتعيد ضبط شحن هجماتهم.',
            fusionTarget: null
        }
    };

    // --- FUSION RESULT DEFINITIONS ---
    const FUSION_UNITS = {
        railgun_drone: {
            id: 'railgun_drone',
            name: 'Railgun Drone',
            role: 'striker',
            hp: 580,
            damage: 250,
            attackSpeed: 0.95,
            range: 340,
            speed: 145,
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: false,
            fusionTier: 1
        },
        shield_vanguard: {
            id: 'shield_vanguard',
            name: 'Shield Vanguard',
            role: 'striker',
            hp: 1600,
            damage: 175,
            attackSpeed: 0.95,
            range: 85,
            speed: 90,
            targetPref: 'first_in_line',
            splashRadius: 0,
            isHeavy: false,
            fusionTier: 1
        },
        siege_colossus: {
            id: 'siege_colossus',
            name: 'Siege Colossus',
            role: 'vanguard',
            hp: 4400,
            damage: 360,
            attackSpeed: 1.6,
            range: 90,
            speed: 55,
            targetPref: 'structures_only',
            splashRadius: 120,
            isHeavy: true,
            fusionTier: 1
        },
        super_caster: {
            id: 'super_caster',
            name: 'Super Caster',
            role: 'striker',
            hp: 800,
            damage: 280,
            attackSpeed: 1.3,
            range: 290,
            speed: 75,
            targetPref: 'first_in_line',
            splashRadius: 140,
            isHeavy: false,
            fusionTier: 1
        },
        vortex_sniper: {
            id: 'vortex_sniper',
            name: 'Vortex Sniper',
            role: 'sniper',
            hp: 680,
            damage: 450,
            attackSpeed: 1.9,
            range: 380,
            speed: 75,
            targetPref: 'highest_hp',
            splashRadius: 75,
            isHeavy: false,
            fusionTier: 1
        },
        fortress_turret: {
            id: 'fortress_turret',
            name: 'Fortress Bastion',
            role: 'defense',
            hp: 2400,
            damage: 85,
            attackSpeed: 0.28,
            range: 560,
            minRange: 0,
            speed: 0,
            isBuilding: true,
            omniTargeting: true,
            decayTimer: 45,
            targetPref: 'omni_defense',
            splashRadius: 0,
            isHeavy: true,
            fusionTier: 1
        },
        hellfire_mortar: {
            id: 'hellfire_mortar',
            name: 'Hellfire Mortar',
            role: 'siege',
            hp: 1850,
            damage: 380,
            attackSpeed: 3.2,
            range: 700,
            minRange: 130,
            speed: 0,
            isBuilding: true,
            omniTargeting: true,
            decayTimer: 40,
            targetPref: 'ground_units_and_towers',
            splashRadius: 160,
            isHeavy: true,
            fusionTier: 1
        },
        overcharge_drone: {
            id: 'overcharge_drone',
            name: 'Overcharge Drone',
            role: 'support',
            hp: 850,
            damage: 0,
            attackSpeed: 0.4,
            range: 280,
            speed: 120,
            healer: true,
            healRate: 110,
            targetPref: 'friendly_injured',
            splashRadius: 0,
            isHeavy: false,
            fusionTier: 1
        }
    };

    class TacticalGameRoom {
        constructor(config = {}) {
            this.roomId = config.roomId || 'local_room_' + Math.floor(Math.random() * 10000);
            this.isLocal = config.isLocal !== undefined ? config.isLocal : true;
            this.onEvent = config.onEvent || function () {}; // Audio/FX hook

            this.state = 'WAITING'; // 'WAITING', 'RUNNING', 'OVER'
            this.currentTick = 0;
            this.overtime = false;
            this.winner = null; // 1 (P1), 2 (P2/Bot), 'TIE'

            // Player level and card levels (Levels 1 to 10)
            this.p1Level = Math.min(10, Math.max(1, config.p1Level || 1));
            this.p1CardLevels = config.p1CardLevels ? { ...config.p1CardLevels } : {};

            // Fair matchmaking parity: bot strictly mirrors player levels for local matches
            if (this.isLocal || !config.p2Level) {
                this.p2Level = this.p1Level;
                this.p2CardLevels = { ...this.p1CardLevels };
            } else {
                this.p2Level = Math.min(10, Math.max(1, config.p2Level || 1));
                this.p2CardLevels = config.p2CardLevels ? { ...config.p2CardLevels } : {};
            }

            // Tournament Standard Mode (Cap account and card levels at 5 for pure tactical skill)
            this.isTournamentMode = Boolean(config.isTournamentMode || false);
            if (this.isTournamentMode) {
                this.p1Level = Math.min(5, this.p1Level);
                this.p2Level = Math.min(5, this.p2Level);
                for (let k in this.p1CardLevels) {
                    this.p1CardLevels[k] = Math.min(5, this.p1CardLevels[k]);
                }
                for (let k in this.p2CardLevels) {
                    this.p2CardLevels[k] = Math.min(5, this.p2CardLevels[k]);
                }
            }

            // Default 8-card standard deck
            const standardDeck = [
                'scout_drone', 'cyber_trooper', 'mech_titan', 'plasma_caster',
                'swarm_droids', 'plasma_mod', 'nano_repair', 'emp_overcharge'
            ];
            const defaultBotDeck = [
                'scout_drone', 'cyber_trooper', 'mech_titan', 'ghost_sniper',
                'sentry_bunker', 'plasma_mod', 'nano_repair', 'orbital_salvo'
            ];

            // Player 1 (Blue - bottom)
            this.p1 = this.createPlayerState(1, config.p1Deck || standardDeck);
            // Player 2 / Bot (Red - top)
            this.p2 = this.createPlayerState(2, config.p2Deck || defaultBotDeck);

            // Neutral Relay Core (Center of Hyper-lane)
            this.relayCore = {
                x: ARENA.RELAY_CORE.x,
                y: ARENA.RELAY_CORE.y,
                radius: ARENA.RELAY_CORE.radius,
                owner: 0, // 0: neutral, 1: P1, 2: P2
                cooldownTicks: 0
            };

            // Entity Containers
            this.units = [];
            this.projectiles = [];
            this.nextUnitId = 1;

            // Combat Log feed for the desktop cockpit
            this.combatFeed = [];

            // Tactical Bot AI timer: 3.5s head start for human player
            this.botAITickCooldown = 70;

            // Cannon cooldowns
            this.p1.cannonCooldown = 0;
            this.p2.cannonCooldown = 0;

            // Dynamic Arena Hazard event schedule: once between tick 650 and 1050
            this.hazardTriggerTick = 650 + Math.floor(Math.random() * 400);
            this.hazardTriggered = false;

            // Triple Elixir 3X Mode
            this.isTripleElixirMode = Boolean(config.isTripleElixir || false);
        }

        createPlayerState(playerNum, deckList) {
            const shuffled = [...deckList].sort(() => Math.random() - 0.5);
            const hand = shuffled.slice(0, 4);
            const queue = shuffled.slice(4);

            const isP1 = playerNum === 1;
            const pLevel = isP1 ? (this.p1Level || 1) : (this.p2Level || 1);
            // Tower HP and Damage scale +8% per account level above Lv 1
            const towerMult = 1 + (pLevel - 1) * 0.08;
            const flankHp = Math.round(2200 * towerMult);
            const mainHp = Math.round(3500 * towerMult);
            const flankDmg = Math.round(130 * towerMult);
            const mainDmg = Math.round(165 * towerMult);

            return {
                id: playerNum,
                name: isP1 ? `COMMANDER [Lv.${pLevel}]` : `TACTICAL BOT [Lv.${pLevel}]`,
                level: pLevel,
                energy: 5.0,
                maxEnergy: 10.0,
                energyDebt: 0, // 0 to -2
                isRedline: false,
                deck: [...deckList],
                hand: hand,
                queue: queue,
                cannonCooldown: 0,
                towers: {
                    left: {
                        id: `t_${playerNum}_left`,
                        owner: playerNum,
                        isTower: true,
                        lane: 0,
                        x: ARENA.LANES[0].x,
                        y: isP1 ? 1160 : 450,
                        hp: flankHp,
                        maxHp: flankHp,
                        range: 260,
                        damage: flankDmg,
                        attackCooldown: 0,
                        freezeTimer: 0,
                        alive: true
                    },
                    main: {
                        id: `t_${playerNum}_main`,
                        owner: playerNum,
                        isTower: true,
                        lane: 1,
                        x: ARENA.LANES[1].x,
                        y: isP1 ? 1280 : 330,
                        hp: mainHp,
                        maxHp: mainHp,
                        range: 310,
                        damage: mainDmg,
                        attackCooldown: 0,
                        freezeTimer: 0,
                        alive: true
                    },
                    right: {
                        id: `t_${playerNum}_right`,
                        owner: playerNum,
                        isTower: true,
                        lane: 2,
                        x: ARENA.LANES[2].x,
                        y: isP1 ? 1160 : 450,
                        hp: flankHp,
                        maxHp: flankHp,
                        range: 260,
                        damage: flankDmg,
                        attackCooldown: 0,
                        freezeTimer: 0,
                        alive: true
                    }
                }
            };
        }

        start() {
            this.state = 'RUNNING';
            this.currentTick = 0;
            if (this.isTripleElixirMode) {
                this.addCombatLog('⚡ بدأت المعركة بنمط جنون الإكسير الثلاثي (TRIPLE ELIXIR 3X)!');
                this.emitEvent('triple_energy_start', {});
            } else {
                this.addCombatLog('بدء المعركة التكتيكية: الساحة جاهزة.');
                this.emitEvent('battle_start', {});
            }
        }

        addCombatLog(text) {
            const timeSeconds = Math.floor(this.currentTick / ARENA.TICK_RATE);
            const mm = String(Math.floor(timeSeconds / 60)).padStart(2, '0');
            const ss = String(timeSeconds % 60).padStart(2, '0');
            this.combatFeed.unshift(`[${mm}:${ss}] ${text}`);
            if (this.combatFeed.length > 30) this.combatFeed.pop();
        }

        emitEvent(type, payload) {
            if (this.onEvent) {
                this.onEvent({ type, tick: this.currentTick, ...payload });
            }
        }

        // --- TICK UPDATE PIPELINE (Deterministic 50ms) ---
        update() {
            if (this.state !== 'RUNNING') return;

            this.currentTick++;
            const dt = 1 / ARENA.TICK_RATE; // 0.05s

            // Stage 1: Energy & Timers
            if (this.currentTick === ARENA.DOUBLE_ENERGY_TICK) {
                this.addCombatLog('⚡ بدأت مضاعفة الإكسير (Double Elixir 2X)! تسارع وتيرة المعركة.');
                this.emitEvent('double_energy_start', {});
            }

            // Stage 1.5: Dynamic Arena Hazard Check (Triggers once between tick 650-1050)
            if (!this.hazardTriggered && this.currentTick >= this.hazardTriggerTick) {
                this.hazardTriggered = true;
                this.triggerArenaHazard();
            }

            this.updateEnergy(this.p1, dt);
            this.updateEnergy(this.p2, dt);

            if (this.p1.cannonCooldown > 0) this.p1.cannonCooldown--;
            if (this.p2.cannonCooldown > 0) this.p2.cannonCooldown--;

            // Stage 2: Relay Core Update
            this.updateRelayCore();

            // Stage 3: Bot AI Logic
            this.updateBotAI();

            // Stage 4: Unit State Machine & Movement
            this.updateUnits(dt);

            // Stage 5: Defensive Tower Attacks
            this.updateTowers(this.p1, this.p2);
            this.updateTowers(this.p2, this.p1);

            // Stage 6: Projectile Movement & Collision
            this.updateProjectiles(dt);

            // Stage 7: Clean-up & Victory Check
            this.cleanDeadUnits();
            this.checkVictoryCondition();
        }

        updateEnergy(player, dt) {
            // Base regeneration: 1 energy per 1.15s for player, 1 per 1.35s for bot
            let rate = player.id === 1 ? (1.0 / 1.15) : (1.0 / 1.35);

            // Triple Elixir 3X Mode or Sudden death double speed
            if (this.isTripleElixirMode) {
                rate *= 3.0;
            } else if (this.currentTick >= ARENA.DOUBLE_ENERGY_TICK) {
                rate *= 2.0;
            }

            // Redline penalty: 50% slower recharge
            if (player.isRedline) {
                rate *= 0.5;
            }

            player.energy += rate * dt;

            // Pay back energy debt first if in redline
            if (player.energyDebt < 0) {
                if (player.energy >= 0) {
                    player.energyDebt += player.energy;
                    if (player.energyDebt >= 0) {
                        player.energy = player.energyDebt;
                        player.energyDebt = 0;
                        player.isRedline = false;
                        this.emitEvent('redline_cleared', { playerId: player.id });
                    } else {
                        player.energy = 0;
                    }
                }
            } else {
                player.energy = Math.min(player.energy, player.maxEnergy);
            }
        }

        updateRelayCore() {
            if (this.relayCore.cooldownTicks > 0) {
                this.relayCore.cooldownTicks--;
                if (this.relayCore.cooldownTicks === 0) {
                    this.relayCore.owner = 0;
                    this.emitEvent('relay_reset', {});
                }
                return;
            }

            // Check if any unit crossed the Relay Core
            for (const unit of this.units) {
                if (!unit.alive) continue;
                if (unit.lane !== 1) continue; // Must be in Hyper-Lane

                const dist = Math.hypot(unit.x - this.relayCore.x, unit.y - this.relayCore.y);
                if (dist <= this.relayCore.radius) {
                    // Unit captured the core!
                    this.relayCore.owner = unit.owner;
                    this.relayCore.cooldownTicks = ARENA.RELAY_CORE.cooldownDuration;

                    const player = unit.owner === 1 ? this.p1 : this.p2;
                    player.energy = Math.min(player.energy + 1.0, player.maxEnergy);

                    // Grant unit a plasma barrier absorbing first 300 damage
                    unit.shieldHp = 300;

                    this.addCombatLog(`[سيطرة] اللاعب ${unit.owner === 1 ? 'القائد' : 'الخصم'} استولى على مكثف المسار الأوسط! (+1 طاقة ودرع)`);
                    this.emitEvent('relay_captured', { owner: unit.owner, unitId: unit.id });

                    // In Overtime, seizing Relay Core fires a decisive orbital strike at the lowest enemy tower!
                    if (this.overtime) {
                        const enemy = unit.owner === 1 ? this.p2 : this.p1;
                        let targetTower = enemy.towers.main;
                        if (enemy.towers.left.alive && enemy.towers.left.hp < targetTower.hp) targetTower = enemy.towers.left;
                        if (enemy.towers.right.alive && enemy.towers.right.hp < targetTower.hp) targetTower = enemy.towers.right;

                        this.applyDamage(targetTower, 260, null);
                        this.addCombatLog(`[صدمة حاسمة] مكثف المسار الأوسط يقصف برج الخصم مباشرة (260 ضرر)!`);
                        this.emitEvent('orbital_strike', { fromX: 540, fromY: 820, toX: targetTower.x, toY: targetTower.y, owner: unit.owner });
                    }
                    break;
                }
            }
        }

        updateUnits(dt) {
            for (const unit of this.units) {
                if (!unit.alive) continue;

                // Handle decay timer for deployable defense structures
                if (unit.isBuilding && unit.decayTimer > 0) {
                    unit.decayTimer -= dt;
                    if (unit.decayTimer <= 0) {
                        unit.alive = false;
                        unit.hp = 0;
                        this.emitEvent('building_decayed', { id: unit.id, x: unit.x, y: unit.y });
                        continue;
                    }
                }

                // Handle stealth duration
                if (unit.stealthTimer > 0) {
                    unit.stealthTimer -= dt;
                    if (unit.stealthTimer <= 0) {
                        unit.isStealth = false;
                    }
                }

                // Handle spawner logic for Drone Hub (drone_factory)
                if (unit.isBuilding && unit.isSpawner && unit.alive && (!unit.freezeTimer || unit.freezeTimer <= 0)) {
                    unit.spawnTimer = (unit.spawnTimer || 0) + dt;
                    if (unit.spawnTimer >= (unit.spawnInterval || 7.0)) {
                        unit.spawnTimer = 0;
                        this.spawnFromBuilding(unit);
                    }
                }

                // Handle freeze
                if (unit.freezeTimer > 0) {
                    unit.freezeTimer -= dt;
                    if (unit.isRamping) {
                        unit.beamTargetId = null;
                        unit.beamDuration = 0;
                    }
                    continue;
                }

                // Handle stun
                if (unit.stunTimer > 0) {
                    unit.stunTimer -= dt;
                    if (unit.isRamping) {
                        unit.beamTargetId = null;
                        unit.beamDuration = 0;
                    }
                    continue;
                }

                // Attack cooldown decay
                if (unit.attackCooldown > 0) {
                    unit.attackCooldown -= dt;
                }

                // Adrenaline boost decay
                if (unit.adrenalineTimer > 0) {
                    unit.adrenalineTimer -= dt;
                }

                // Healer Support Behavior (Aero-Medic Drone)
                if (unit.healer) {
                    let healTarget = null;
                    let lowestPct = 1.0;
                    for (const ally of this.units) {
                        if (!ally.alive || ally.owner !== unit.owner || ally.id === unit.id || ally.isBuilding) continue;
                        const pct = ally.hp / ally.maxHp;
                        if (pct < 1.0 && pct < lowestPct) {
                            const d = Math.hypot(ally.x - unit.x, ally.y - unit.y);
                            if (d <= unit.range) {
                                lowestPct = pct;
                                healTarget = ally;
                            }
                        }
                    }

                    if (healTarget) {
                        unit.state = 'HEAL';
                        unit.healingTargetId = healTarget.id;
                        unit.targetAngle = Math.atan2(healTarget.y - unit.y, healTarget.x - unit.x);
                        healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + unit.healRate * dt);
                    } else {
                        unit.healingTargetId = null;
                        unit.state = 'MOVE';
                    }
                }

                // Target acquisition
                const target = this.findTargetForUnit(unit);

                if (target) {
                    // Target in range: Stop & Attack!
                    unit.state = 'ATTACK';
                    unit.targetAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
                    if (unit.attackCooldown <= 0) {
                        this.executeUnitAttack(unit, target);
                        const effectiveAtkSpeed = unit.adrenalineTimer > 0
                            ? unit.attackSpeed * 0.85
                            : unit.attackSpeed;
                        unit.attackCooldown = effectiveAtkSpeed;
                    }
                } else if (unit.isBuilding) {
                    // Deployable defensive structures remain firmly planted in place
                    unit.state = 'IDLE';
                } else {
                    // No target in attack range: Move towards bridge or enemy structures
                    if (!unit.healer || unit.state !== 'HEAL') {
                        unit.state = 'MOVE';
                    }
                    const bridgeX = ARENA.LANES[unit.lane].x;
                    let destX = bridgeX;
                    let destY = 820;

                    if (unit.owner === 1) {
                        // P1 unit
                        if (unit.y > 860) {
                            // On friendly side: move to bridge
                            destX = bridgeX;
                            destY = 820;
                        } else {
                            // Crossing bridge or in enemy territory: aim for enemy tower
                            const enemyTower = this.p2.towers[unit.lane === 0 ? 'left' : (unit.lane === 2 ? 'right' : 'main')];
                            if (enemyTower && enemyTower.alive) {
                                destX = enemyTower.x;
                                destY = enemyTower.y;
                            } else {
                                destX = this.p2.towers.main.x;
                                destY = this.p2.towers.main.y;
                            }
                        }
                    } else {
                        // P2 unit
                        if (unit.y < 780) {
                            // On friendly side: move to bridge
                            destX = bridgeX;
                            destY = 820;
                        } else {
                            // In player territory: aim for player tower
                            const playerTower = this.p1.towers[unit.lane === 0 ? 'left' : (unit.lane === 2 ? 'right' : 'main')];
                            if (playerTower && playerTower.alive) {
                                destX = playerTower.x;
                                destY = playerTower.y;
                            } else {
                                destX = this.p1.towers.main.x;
                                destY = this.p1.towers.main.y;
                            }
                        }
                    }

                    const toDestX = destX - unit.x;
                    const toDestY = destY - unit.y;
                    const dist = Math.hypot(toDestX, toDestY);

                    let speed = unit.speed;
                    // Hyper-Lane speed boost (1.4x for non-heavy units)
                    if (unit.lane === 1 && !unit.isHeavy) {
                        speed *= ARENA.LANES[1].speedMultiplier;
                    }

                    let moveVx = dist > 0 ? (toDestX / dist) * speed : 0;
                    let moveVy = dist > 0 ? (toDestY / dist) * speed : (unit.owner === 1 ? -speed : speed);
                    unit.targetAngle = Math.atan2(moveVy, moveVx);

                    let nextX = unit.x + moveVx * dt;
                    let nextY = unit.y + moveVy * dt;

                    // Physical body blocking & collision with opposing units
                    for (const other of this.units) {
                        if (!other.alive || other.owner === unit.owner) continue;
                        const d = Math.hypot(other.x - nextX, other.y - nextY);
                        const minGap = 42;
                        if (d < minGap) {
                            nextX = unit.x;
                            nextY = unit.y;
                            break;
                        }
                    }

                    unit.x = nextX;
                    unit.y = nextY;
                }

                // Smooth dynamic rotation towards target or movement vector (360 degrees)
                let desiredAngle = unit.targetAngle !== undefined ? unit.targetAngle : (unit.owner === 1 ? -Math.PI / 2 : Math.PI / 2);
                if (target) {
                    desiredAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
                }
                let diff = desiredAngle - (unit.angle !== undefined ? unit.angle : desiredAngle);
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                unit.angle = (unit.angle !== undefined ? unit.angle : desiredAngle) + diff * Math.min(1.0, 12.0 * dt);
            }
        }

        findTargetForUnit(unit) {
            // Healers do not attack enemies
            if (unit.healer) return null;

            const enemyPlayer = unit.owner === 1 ? this.p2 : this.p1;
            const dir = unit.owner === 1 ? -1 : 1;

            // Inferno Tower / Ramping Units: maintain target lock if target is still valid and in range
            if (unit.isRamping && unit.beamTargetId) {
                const lockedUnit = this.units.find(u => u.id === unit.beamTargetId);
                if (lockedUnit && lockedUnit.alive && !lockedUnit.isStealth) {
                    const dist = Math.hypot(lockedUnit.x - unit.x, lockedUnit.y - unit.y);
                    if (dist <= unit.range + 20) {
                        return lockedUnit;
                    }
                }
                for (const tKey of ['left', 'main', 'right']) {
                    const t = enemyPlayer.towers[tKey];
                    if (t && t.id === unit.beamTargetId && t.alive) {
                        const dist = Math.hypot(t.x - unit.x, t.y - unit.y);
                        if (dist <= unit.range + 20) {
                            return t;
                        }
                    }
                }
                unit.beamTargetId = null;
                unit.beamDuration = 0;
            }

            // Vanguard targets towers primarily, BUT if physically blocked by an enemy, it defends itself!
            if (unit.targetPref === 'structures_only') {
                const tower = this.findTowerTargetInLane(unit, enemyPlayer);
                if (tower) return tower;

                // If no tower in range, attack any enemy unit directly blocking its path
                for (const other of this.units) {
                    if (!other.alive || other.owner === unit.owner || other.lane !== unit.lane || other.isStealth) continue;
                    const dist = Math.hypot(other.x - unit.x, other.y - unit.y);
                    if (dist <= unit.range + 20) {
                        return other;
                    }
                }
                return null;
            }

            // Ghost Marksman / Precision Snipers: Prioritize highest-HP enemy in range
            if (unit.targetPref === 'highest_hp') {
                let highestEnemy = null;
                let maxHp = -1;
                for (const other of this.units) {
                    if (!other.alive || other.owner === unit.owner || other.isStealth) continue;
                    const dist = Math.hypot(other.x - unit.x, other.y - unit.y);
                    if (dist <= unit.range + 25 && other.hp > maxHp) {
                        maxHp = other.hp;
                        highestEnemy = other;
                    }
                }
                if (highestEnemy) return highestEnemy;
            }

            // Sentry Bunker, Mortar Cannon & Defensive/Omni-targeting Buildings
            // ATTACKS ENEMIES ANYWHERE IN THE ZONE / CROSSING BRIDGES - NOT RESTRICTED BY LANE!
            if (unit.omniTargeting || unit.isBuilding) {
                let bestTarget = null;
                let bestScore = -Infinity;
                const isP1 = unit.owner === 1;

                for (const other of this.units) {
                    if (!other.alive || other.owner === unit.owner || other.isStealth) continue;

                    const dist = Math.hypot(other.x - unit.x, other.y - unit.y);
                    if (unit.minRange && dist < unit.minRange) continue;
                    if (dist > unit.range) continue;

                    // Priority bonus if enemy has crossed the bridge / entered friendly territory!
                    // For P1 (friendly side y >= 780), for P2 (bot side y <= 860):
                    const hasCrossedRiver = isP1 ? (other.y >= 780) : (other.y <= 860);
                    let score = 1200 - dist;
                    if (hasCrossedRiver) {
                        score += 2500; // MASSIVE priority to intruders crossing the bridges!
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = other;
                    }
                }

                if (bestTarget) return bestTarget;

                // If no enemy unit in range, check if enemy towers are in range (e.g. Mortar siege)
                for (const tKey of ['left', 'right', 'main']) {
                    const tower = enemyPlayer.towers[tKey];
                    if (tower && tower.alive) {
                        const dist = Math.hypot(tower.x - unit.x, tower.y - unit.y);
                        if ((!unit.minRange || dist >= unit.minRange) && dist <= unit.range) {
                            return tower;
                        }
                    }
                }

                return null;
            }

            // Striker / Disruptor / Turret targets nearest enemy in range
            let nearestEnemyUnit = null;
            let minDistance = Infinity;

            for (const other of this.units) {
                if (!other.alive || other.owner === unit.owner || other.lane !== unit.lane || other.isStealth) continue;

                const dist = Math.hypot(other.x - unit.x, other.y - unit.y);
                if (dist <= unit.range + 25 && dist < minDistance) {
                    minDistance = dist;
                    nearestEnemyUnit = other;
                }
            }

            if (nearestEnemyUnit) return nearestEnemyUnit;

            // If no enemy unit in range, target the lane tower
            return this.findTowerTargetInLane(unit, enemyPlayer);
        }

        findTowerTargetInLane(unit, enemyPlayer) {
            let targetTower = null;
            const towers = enemyPlayer.towers;

            if (unit.lane === 0 && towers.left.alive) targetTower = towers.left;
            else if (unit.lane === 2 && towers.right.alive) targetTower = towers.right;
            else if (towers.main.alive) targetTower = towers.main;

            if (!targetTower) {
                if (towers.main.alive) targetTower = towers.main;
            }

            if (targetTower) {
                const dist = Math.hypot(targetTower.x - unit.x, targetTower.y - unit.y);
                if (dist <= unit.range) {
                    return targetTower;
                }
            }

            return null;
        }

        executeUnitAttack(attacker, target) {
            attacker.state = 'ATTACK';
            if (attacker.isStealth) {
                attacker.isStealth = false;
                attacker.stealthTimer = 0;
            }

            let damage = attacker.damage;

            // Ramping Laser Mechanics (Inferno Tower)
            if (attacker.isRamping) {
                if (attacker.beamTargetId === target.id) {
                    attacker.beamDuration = (attacker.beamDuration || 0) + attacker.attackSpeed;
                } else {
                    attacker.beamTargetId = target.id;
                    attacker.beamDuration = 0;
                }
                const rampProgress = Math.min(1.0, attacker.beamDuration / 4.0);
                const mult = 1 + (attacker.level - 1) * 0.10;
                const maxDmg = (attacker.maxRampDamage || 850) * mult;
                damage = Math.round(attacker.damage + (maxDmg - attacker.damage) * Math.pow(rampProgress, 2));

                this.emitEvent('inferno_beam_tick', {
                    attackerId: attacker.id,
                    targetId: target.id,
                    attackerX: attacker.x,
                    attackerY: attacker.y,
                    targetX: target.x,
                    targetY: target.y,
                    beamDuration: attacker.beamDuration,
                    damage: damage,
                    owner: attacker.owner
                });
            }

            // Audio / Visual hooks for specialized unit weapons
            if (attacker.cardId === 'ghost_sniper' || attacker.cardId === 'vortex_sniper') {
                this.emitEvent('sniper_fire', { attackerId: attacker.id, targetId: target.id, x: attacker.x, y: attacker.y, targetX: target.x, targetY: target.y, owner: attacker.owner });
            } else if (attacker.cardId === 'mortar_cannon' || attacker.cardId === 'hellfire_mortar') {
                this.emitEvent('mortar_fire', {
                    attackerId: attacker.id,
                    targetId: target.id,
                    x: attacker.x,
                    y: attacker.y,
                    targetX: target.x,
                    targetY: target.y,
                    splashRadius: attacker.splashRadius || 130,
                    owner: attacker.owner
                });
            } else if (attacker.isTwinZap) {
                // Secondary target search
                let secondaryTarget = null;
                let secMinDist = Infinity;
                for (const other of this.units) {
                    if (!other.alive || other.owner === attacker.owner || other.id === target.id || other.isStealth) continue;
                    const d = Math.hypot(other.x - attacker.x, other.y - attacker.y);
                    if (d <= attacker.range + 30 && d < secMinDist) {
                        secMinDist = d;
                        secondaryTarget = other;
                    }
                }
                if (!secondaryTarget) {
                    const enemyP = attacker.owner === 1 ? this.p2 : this.p1;
                    for (const tKey of ['left', 'main', 'right']) {
                        const t = enemyP.towers[tKey];
                        if (t && t.alive && t.id !== target.id) {
                            const d = Math.hypot(t.x - attacker.x, t.y - attacker.y);
                            if (d <= attacker.range + 30 && d < secMinDist) {
                                secMinDist = d;
                                secondaryTarget = t;
                            }
                        }
                    }
                }

                // Micro-stun (0.5s) on primary target & resets ramping beam
                target.stunTimer = Math.max(target.stunTimer || 0, 0.5);
                if (target.isRamping) {
                    target.beamTargetId = null;
                    target.beamDuration = 0;
                }

                // If secondary target found, damage and micro-stun it as well
                if (secondaryTarget) {
                    this.applyDamage(secondaryTarget, damage, attacker);
                    secondaryTarget.stunTimer = Math.max(secondaryTarget.stunTimer || 0, 0.5);
                    if (secondaryTarget.isRamping) {
                        secondaryTarget.beamTargetId = null;
                        secondaryTarget.beamDuration = 0;
                    }
                }

                this.emitEvent('twin_zap_strike', {
                    attackerId: attacker.id,
                    attackerX: attacker.x,
                    attackerY: attacker.y,
                    target1X: target.x,
                    target1Y: target.y,
                    target2X: secondaryTarget ? secondaryTarget.x : null,
                    target2Y: secondaryTarget ? secondaryTarget.y : null,
                    owner: attacker.owner
                });
            } else if (attacker.isBuilding && !attacker.isRamping) {
                this.emitEvent('turret_fire', { attackerId: attacker.id, targetId: target.id, x: attacker.x, y: attacker.y, targetX: target.x, targetY: target.y, owner: attacker.owner });
            }

            // Calculate splash damage if applicable
            if (attacker.splashRadius > 0) {
                this.applyDamage(target, damage, attacker);
                for (const potential of this.units) {
                    if (!potential.alive || potential.owner === attacker.owner || potential.id === target.id) continue;
                    const splashDist = Math.hypot(potential.x - target.x, potential.y - target.y);
                    if (splashDist <= attacker.splashRadius) {
                        this.applyDamage(potential, damage, attacker);
                    }
                }
            } else {
                this.applyDamage(target, damage, attacker);
            }

            this.emitEvent('unit_attack', {
                attackerId: attacker.id,
                targetX: target.x,
                targetY: target.y,
                attackerX: attacker.x,
                attackerY: attacker.y,
                splash: attacker.splashRadius > 0
            });
        }

        applyDamage(entity, amount, source) {
            if (!entity) return;

            const isTower = Boolean(entity.isTower || (typeof entity.id === 'string' && entity.id.startsWith('t_')));

            // Heavy armor damage reduction (Mech Titan & Siege Colossus take 18% less damage)
            if (entity.isHeavy) {
                amount *= 0.82;
            }

            // Tower vulnerability during Redline
            if (isTower) {
                const ownerNum = entity.owner || (typeof entity.id === 'string' && entity.id.startsWith('t_1') ? 1 : 2);
                const owner = ownerNum === 1 ? this.p1 : this.p2;
                if (owner && owner.isRedline) {
                    amount *= 1.15; // 15% extra damage during debt
                }
            }

            // Shield absorption
            if (entity.shieldHp && entity.shieldHp > 0) {
                if (entity.shieldHp >= amount) {
                    entity.shieldHp -= amount;
                    this.emitEvent('shield_hit', { entityId: entity.id, absorbed: amount });
                    this.emitEvent('damage_dealt', { x: entity.x, y: entity.y, amount: Math.round(amount), isShield: true });
                    return;
                } else {
                    amount -= entity.shieldHp;
                    entity.shieldHp = 0;
                }
            }

            entity.hp -= amount;
            this.emitEvent('damage_dealt', { x: entity.x, y: entity.y, amount: Math.round(amount), isShield: false, isTower });

            if (entity.hp <= 0) {
                entity.alive = false;
                entity.hp = 0;
                if (isTower) {
                    this.addCombatLog(`[تدمير] سقوط برج دفاعي!`);
                    this.emitEvent('tower_destroyed', { towerId: entity.id, x: entity.x, y: entity.y, owner: entity.owner });
                } else {
                    this.emitEvent('unit_died', { unitId: entity.id, x: entity.x, y: entity.y });
                }
            }
        }

        updateTowers(friendlyPlayer, enemyPlayer) {
            const towers = [friendlyPlayer.towers.left, friendlyPlayer.towers.main, friendlyPlayer.towers.right];

            for (const tower of towers) {
                if (!tower.alive) continue;

                if (tower.freezeTimer > 0) {
                    tower.freezeTimer -= (1 / ARENA.TICK_RATE);
                    continue;
                }

                if (tower.attackCooldown > 0) {
                    tower.attackCooldown -= (1 / ARENA.TICK_RATE);
                    continue;
                }

                // Find closest enemy unit in range
                let closestEnemy = null;
                let minDist = Infinity;

                for (const unit of this.units) {
                    if (!unit.alive || unit.owner === friendlyPlayer.id) continue;
                    const dist = Math.hypot(unit.x - tower.x, unit.y - tower.y);
                    if (dist <= tower.range && dist < minDist) {
                        minDist = dist;
                        closestEnemy = unit;
                    }
                }

                if (closestEnemy) {
                    this.applyDamage(closestEnemy, tower.damage, tower);
                    tower.attackCooldown = 0.8; // Fires every 0.8s

                    this.emitEvent('tower_laser_fire', {
                        fromX: tower.x,
                        fromY: tower.y,
                        toX: closestEnemy.x,
                        toY: closestEnemy.y,
                        owner: friendlyPlayer.id
                    });
                }
            }
        }

        updateProjectiles(dt) {
            // Hook for projectile entities
        }

        cleanDeadUnits() {
            this.units = this.units.filter(u => u.alive);
            for (const u of this.units) {
                if (u.isRamping && u.beamTargetId) {
                    const targetAlive = this.units.some(o => o.id === u.beamTargetId) ||
                        Object.values(this.p1.towers).some(t => t.id === u.beamTargetId && t.alive) ||
                        Object.values(this.p2.towers).some(t => t.id === u.beamTargetId && t.alive);
                    if (!targetAlive) {
                        u.beamTargetId = null;
                        u.beamDuration = 0;
                    }
                }
            }
        }

        checkVictoryCondition() {
            // Main Command Core Destruction
            if (!this.p1.towers.main.alive) {
                this.finishMatch(2); // P2 won
                return;
            }
            if (!this.p2.towers.main.alive) {
                this.finishMatch(1); // P1 won
                return;
            }

            // In Sudden Death Overtime: First tower destroyed wins instantly (Golden Goal)!
            if (this.overtime) {
                const p1TowersLost = (!this.p1.towers.left.alive ? 1 : 0) + (!this.p1.towers.right.alive ? 1 : 0);
                const p2TowersLost = (!this.p2.towers.left.alive ? 1 : 0) + (!this.p2.towers.right.alive ? 1 : 0);

                if (p1TowersLost < p2TowersLost) {
                    this.finishMatch(1);
                    return;
                } else if (p2TowersLost < p1TowersLost) {
                    this.finishMatch(2);
                    return;
                }

                // Final 15 seconds of overtime: Sudden Death Tiebreaker Drain!
                const ticksIntoOvertime = this.currentTick - ARENA.MATCH_DURATION_TICKS;
                const overtimeRemaining = ARENA.OVERTIME_MAX_TICKS - ticksIntoOvertime;
                if (overtimeRemaining <= 300) { // Last 15 seconds (300 ticks)
                    this.drainTiebreaker(0.0025);
                }

                if (this.currentTick >= ARENA.MATCH_DURATION_TICKS + ARENA.OVERTIME_MAX_TICKS) {
                    // Overtime completely expired: Player with highest total HP wins
                    const p1TotalHp = this.p1.towers.left.hp + this.p1.towers.main.hp + this.p1.towers.right.hp;
                    const p2TotalHp = this.p2.towers.left.hp + this.p2.towers.main.hp + this.p2.towers.right.hp;

                    if (p1TotalHp > p2TotalHp) {
                        this.finishMatch(1);
                    } else if (p2TotalHp > p1TotalHp) {
                        this.finishMatch(2);
                    } else {
                        this.finishMatch('TIE');
                    }
                    return;
                }
            } else if (this.currentTick >= ARENA.MATCH_DURATION_TICKS) {
                // Regular time expired
                const p1TowersLost = (!this.p1.towers.left.alive ? 1 : 0) + (!this.p1.towers.right.alive ? 1 : 0);
                const p2TowersLost = (!this.p2.towers.left.alive ? 1 : 0) + (!this.p2.towers.right.alive ? 1 : 0);

                if (p1TowersLost < p2TowersLost) {
                    this.finishMatch(1);
                } else if (p2TowersLost < p1TowersLost) {
                    this.finishMatch(2);
                } else {
                    // Enter Sudden Death Overtime!
                    this.overtime = true;
                    this.addCombatLog('[وقت حاسم] تعادل! أول برج يسقط يحسم الفوز فوراً!');
                    this.emitEvent('sudden_death_start', {});
                }
            }
        }

        drainTiebreaker(pct) {
            const towers = [
                this.p1.towers.left, this.p1.towers.main, this.p1.towers.right,
                this.p2.towers.left, this.p2.towers.main, this.p2.towers.right
            ];
            for (const t of towers) {
                if (t.alive) {
                    const dmg = Math.max(2, Math.round(t.maxHp * pct));
                    this.applyDamage(t, dmg, null);
                }
            }
        }

        finishMatch(winner) {
            this.state = 'OVER';
            this.winner = winner;
            const msg = winner === 'TIE' ? 'انتهت المعركة بالتعادل!' : `نصر حاسم: الفائز هو اللاعب ${winner === 1 ? 'القائد' : 'الخصم'}`;
            this.addCombatLog(msg);
            this.emitEvent('match_over', { winner });
        }

        // --- DEPLOYMENT & FUSION SYSTEM ---
        playCard(playerNum, cardId, laneOrX, targetY = null) {
            return this.deployCard(playerNum, cardId, laneOrX, targetY);
        }

        deployCard(playerNum, cardId, laneOrX, targetY = null) {
            if (this.state !== 'RUNNING') return { success: false, reason: 'Game not running' };

            const player = playerNum === 1 ? this.p1 : this.p2;
            const cardData = CARD_DATABASE[cardId];
            if (!cardData) return { success: false, reason: 'Card not found' };

            // Check if card is in hand
            const handIndex = player.hand.indexOf(cardId);
            if (handIndex === -1) return { success: false, reason: 'Card not in hand' };

            // Check energy & redline logic
            let cost = cardData.cost;
            let needed = cost - player.energy;

            if (needed > 0) {
                // Need to use Redline Debt
                if (needed <= 2.0 && !player.isRedline) {
                    // Enter Redline!
                    player.isRedline = true;
                    player.energyDebt = -needed;
                    player.energy = 0;
                    this.addCombatLog(`Player ${playerNum} entered REDLINE DEBT (-${needed.toFixed(1)} Energy)!`);
                    this.emitEvent('redline_entered', { playerId: playerNum, debt: player.energyDebt });
                } else {
                    return { success: false, reason: 'Insufficient energy (Max -2 debt)' };
                }
            } else {
                player.energy -= cost;
            }

            // Cycle hand: remove card, take from queue, push old card to queue
            player.hand.splice(handIndex, 1);
            if (player.queue.length > 0) {
                const nextCard = player.queue.shift();
                player.hand.push(nextCard);
                player.queue.push(cardId);
            } else {
                player.hand.push(cardId);
            }

            // Handle Free-form Coordinates vs Lane Index
            let customX = null;
            let customY = null;
            let laneIndex = 1;

            if (targetY !== null && typeof targetY === 'number') {
                customX = Math.max(80, Math.min(1000, laneOrX));
                customY = targetY;
                if (!cardData.isSpell) {
                    if (playerNum === 1) {
                        customY = Math.max(860, Math.min(1380, customY));
                    } else {
                        customY = Math.max(200, Math.min(780, customY));
                    }
                } else {
                    customY = Math.max(180, Math.min(1600, customY));
                }
                // Determine closest bridge/lane
                if (customX < 385) laneIndex = 0;
                else if (customX > 695) laneIndex = 2;
                else laneIndex = 1;
            } else {
                laneIndex = typeof laneOrX === 'number' && ARENA.LANES[laneOrX] ? laneOrX : 1;
            }

            // Execute card deployment or spell action
            if (cardData.isSpell) {
                this.executeSpell(playerNum, cardData, laneIndex, customX, customY);
            } else if (cardData.count && cardData.count > 1) {
                // Swarm deployment
                this.spawnSwarm(playerNum, cardData, laneIndex, customX, customY);
            } else {
                // Standard unit deployment
                this.spawnUnit(playerNum, cardData, laneIndex, 0, false, customX, customY);
            }

            this.emitEvent('card_played', { playerNum, cardId, laneIndex, x: customX, y: customY });
            return { success: true };
        }

        spawnUnit(playerNum, cardData, laneIndex, lateralOffset = 0, isFusion = false, customX = null, customY = null) {
            const lane = ARENA.LANES[laneIndex];
            const isP1 = playerNum === 1;
            const defaultY = isP1 ? 1140 : 440;
            const spawnX = customX !== null ? customX + lateralOffset : lane.x + lateralOffset;
            const spawnY = customY !== null ? customY : defaultY;
            const initAngle = isP1 ? -Math.PI / 2 : Math.PI / 2;

            // Scale unit HP, damage, and healRate based on card level (Level 1 to 10)
            const cardLevels = isP1 ? this.p1CardLevels : this.p2CardLevels;
            const unitLevel = Math.min(10, Math.max(1, (cardLevels && cardLevels[cardData.id]) ? cardLevels[cardData.id] : 1));
            const mult = 1 + (unitLevel - 1) * 0.10;
            const scaledHp = Math.round(cardData.hp * mult);
            const scaledDamage = Math.round(cardData.damage * mult);
            const scaledHeal = cardData.healRate ? Math.round(cardData.healRate * mult) : 0;

            const unit = {
                id: this.nextUnitId++,
                owner: playerNum,
                cardId: cardData.id,
                name: cardData.name,
                role: cardData.role,
                lane: laneIndex,
                x: spawnX,
                y: spawnY,
                angle: initAngle,
                targetAngle: initAngle,
                lateralOffset: lateralOffset,
                level: unitLevel,
                hp: scaledHp,
                maxHp: scaledHp,
                shieldHp: 0,
                damage: scaledDamage,
                attackSpeed: cardData.attackSpeed,
                range: cardData.range,
                speed: cardData.speed,
                targetPref: cardData.targetPref,
                splashRadius: cardData.splashRadius || 0,
                isHeavy: cardData.isHeavy || false,
                isBuilding: cardData.isBuilding || false,
                minRange: cardData.minRange || 0,
                omniTargeting: Boolean(cardData.omniTargeting || cardData.isBuilding),
                decayTimer: cardData.decayTimer || 0,
                healer: cardData.healer || false,
                healRate: scaledHeal,
                healingTargetId: null,
                stealthTimer: cardData.stealthDuration || 0,
                isStealth: (cardData.stealthDuration || 0) > 0,
                attackCooldown: 0,
                stunTimer: 0,
                freezeTimer: 0,
                isSpawner: cardData.isSpawner || false,
                spawnCardId: cardData.spawnCardId || null,
                spawnCount: cardData.spawnCount || 2,
                spawnInterval: cardData.spawnInterval || 7.0,
                spawnTimer: 0,
                adrenalineTimer: (playerNum === 1 ? this.p1 : this.p2).isRedline ? 3.0 : 0,
                fusionTier: isFusion ? 1 : 0,
                isRamping: Boolean(cardData.isRamping),
                maxRampDamage: cardData.maxRampDamage || 0,
                beamTargetId: null,
                beamDuration: 0,
                isTwinZap: Boolean(cardData.isTwinZap),
                alive: true
            };

            this.units.push(unit);
            const laneNames = ['الأيسر', 'الأوسط (فائق)', 'الأيمن'];
            const ownerName = playerNum === 1 ? 'القائد' : 'الخصم';
            this.addCombatLog(`[استدعاء] ${ownerName}: ${unit.name} (Lv.${unitLevel}) (مسار ${laneNames[laneIndex]})`);
            return unit;
        }

        spawnSwarm(playerNum, cardData, laneIndex, customX = null, customY = null) {
            const offsets = [-36, -12, 12, 36];
            for (let i = 0; i < cardData.count; i++) {
                this.spawnUnit(playerNum, cardData, laneIndex, offsets[i] || 0, false, customX, customY);
            }
        }

        spawnFromBuilding(building) {
            const spawnCardId = building.spawnCardId || 'scout_drone';
            const cardData = CARD_DATABASE[spawnCardId];
            if (!cardData) return;
            const count = building.spawnCount || 2;
            const offsets = [-24, 24];
            const laneIndex = (building.lane !== undefined && building.lane !== null) ? building.lane : 1;
            const spawnY = building.owner === 1 ? building.y - 45 : building.y + 45;
            for (let i = 0; i < count; i++) {
                this.spawnUnit(building.owner, cardData, laneIndex, offsets[i] || 0, false, building.x + (offsets[i] || 0), spawnY);
            }
            this.emitEvent('spawner_deploy', {
                buildingId: building.id,
                x: building.x,
                y: building.y,
                owner: building.owner
            });
            this.addCombatLog(`[مصنع الدرونات] انطلاق سرب درونات استطلاع تكتيكي من المصنع!`);
        }

        executeSpell(playerNum, spellCard, laneIndex, targetX = null, targetY = null) {
            const lane = ARENA.LANES[laneIndex];
            const isP1 = playerNum === 1;
            const effectX = targetX !== null ? targetX : lane.x;
            const effectY = targetY !== null ? targetY : (isP1 ? 680 : 960);
            const SPELL_RADIUS = 340; // Overhauled 340px tactical impact circle!
            const enemyPlayer = playerNum === 1 ? this.p2 : this.p1;
            const friendlyPlayer = playerNum === 1 ? this.p1 : this.p2;

            // Spell potency scales +10% per card level above Lv 1
            const cardLevels = isP1 ? this.p1CardLevels : this.p2CardLevels;
            const spellLevel = Math.min(10, Math.max(1, (cardLevels && cardLevels[spellCard.id]) ? cardLevels[spellCard.id] : 1));
            const mult = 1 + (spellLevel - 1) * 0.10;

            if (spellCard.id === 'emp_overcharge') {
                // EMP Cascade: 320 burst dmg + 2.8s stun + strips all shields + 3s tower shutdown
                const empDmg = Math.round(320 * mult);
                for (const u of this.units) {
                    if (!u.alive || u.owner === playerNum) continue;
                    const dist = Math.hypot(u.x - effectX, u.y - effectY);
                    if (dist <= SPELL_RADIUS) {
                        u.stunTimer = Math.max(u.stunTimer || 0, 2.8);
                        u.shieldHp = 0; // Completely strip shields!
                        if (u.isRamping) {
                            u.beamTargetId = null;
                            u.beamDuration = 0;
                        }
                        this.applyDamage(u, empDmg, null);
                    }
                }
                const towerEmpDmg = Math.round(220 * mult);
                for (const t of Object.values(enemyPlayer.towers)) {
                    if (t.alive && Math.hypot(t.x - effectX, t.y - effectY) <= SPELL_RADIUS) {
                        this.applyDamage(t, towerEmpDmg, null);
                        t.attackCooldown = Math.max(t.attackCooldown, 3.0); // 3.0s tower EMP shutdown!
                        t.freezeTimer = 0; // EMP clears freeze to establish electric stun
                    }
                }
                this.emitEvent('emp_blast', { x: effectX, y: effectY, radius: SPELL_RADIUS });
                this.addCombatLog(`[العاصفة الكهرومغناطيسية Lv.${spellLevel}] صعق وتجريد دروع وتعطيل أبراج العدو (320 ضرر) بنطاق 340px!`);
            } else if (spellCard.id === 'nano_repair') {
                // Nano Aegis: Cleanses stun & freeze + 650 shield + 200 heal + 4s +35% attack speed + repairs tower 450 HP
                const shieldAmount = Math.round(650 * mult);
                const unitHeal = Math.round(200 * mult);
                for (const u of this.units) {
                    if (!u.alive || u.owner !== playerNum) continue;
                    const dist = Math.hypot(u.x - effectX, u.y - effectY);
                    if (dist <= SPELL_RADIUS) {
                        u.shieldHp = (u.shieldHp || 0) + shieldAmount;
                        u.stunTimer = 0; // Cleanse EMP stun
                        u.freezeTimer = 0; // Cleanse cryo freeze
                        u.slowTimer = 0; // Cleanse slow
                        u.hp = Math.min(u.maxHp, u.hp + unitHeal);
                        u.adrenalineTimer = Math.max(u.adrenalineTimer || 0, 4.0); // Overdrive attack speed!
                        this.emitEvent('damage_dealt', { x: u.x, y: u.y, amount: unitHeal, isShield: true });
                    }
                }
                // Repair friendly towers in radius
                const towerHeal = Math.round(450 * mult);
                for (const t of Object.values(friendlyPlayer.towers)) {
                    if (t.alive && Math.hypot(t.x - effectX, t.y - effectY) <= SPELL_RADIUS) {
                        t.hp = Math.min(t.maxHp, t.hp + towerHeal);
                        t.freezeTimer = 0; // Cleanse tower freeze
                        this.emitEvent('damage_dealt', { x: t.x, y: t.y, amount: towerHeal, isShield: true, isTower: true });
                    }
                }
                this.emitEvent('nano_shield_aoe', { x: effectX, y: effectY, radius: SPELL_RADIUS });
                this.addCombatLog(`[درع النانو Lv.${spellLevel}] درع +${shieldAmount} وشفاء الأبراج +${towerHeal} وإزالة الصعق والتجميد بنطاق 340px!`);
            } else if (spellCard.id === 'plasma_mod') {
                // Plasma Strike: Instant 420 burst damage + knockback light units + 3s lingering fire + ally overdrive
                const plasmaDmg = Math.round(420 * mult);
                const knockbackDir = playerNum === 1 ? -1 : 1;
                for (const u of this.units) {
                    if (!u.alive) continue;
                    const dist = Math.hypot(u.x - effectX, u.y - effectY);
                    if (dist <= SPELL_RADIUS) {
                        if (u.owner === playerNum) {
                            u.adrenalineTimer = Math.max(u.adrenalineTimer || 0, 4.0);
                        } else {
                            this.applyDamage(u, plasmaDmg, null);
                            // Knockback light units
                            if (!u.isHeavy && !u.isBuilding) {
                                u.y = Math.max(200, Math.min(1700, u.y + knockbackDir * 40));
                            }
                            // Burn effect slow
                            u.slowTimer = Math.max(u.slowTimer || 0, 3.0);
                        }
                    }
                }
                // Tower Burn Damage
                const towerBurn = Math.round(320 * mult);
                for (const t of Object.values(enemyPlayer.towers)) {
                    if (t.alive && Math.hypot(t.x - effectX, t.y - effectY) <= SPELL_RADIUS) {
                        this.applyDamage(t, towerBurn, null);
                    }
                }
                this.emitEvent('plasma_blast', { x: effectX, y: effectY, radius: SPELL_RADIUS });
                this.addCombatLog(`[ضربة البلازما Lv.${spellLevel}] تفجير فوري بقوة ${plasmaDmg} ضرر ونيران حارقة ودفع للأعداء بنطاق 340px!`);
            } else if (spellCard.id === 'orbital_salvo') {
                // Orbital Barrage: 6 tactical warheads dealing 160 each (960 total) + 1.5x structural demolition
                const impactCount = 6;
                const baseDmg = Math.round(160 * mult);
                for (let i = 0; i < impactCount; i++) {
                    const delayMs = i * 150;
                    setTimeout(() => {
                        if (this.state !== 'RUNNING') return;
                        const randOffsetX = (Math.random() - 0.5) * 280;
                        const randOffsetY = (Math.random() - 0.5) * 280;
                        const hitX = effectX + randOffsetX;
                        const hitY = effectY + randOffsetY;

                        for (const u of this.units) {
                            if (!u.alive || u.owner === playerNum) continue;
                            const dist = Math.hypot(u.x - hitX, u.y - hitY);
                            if (dist <= 190) {
                                const unitDmg = u.isBuilding ? Math.round(baseDmg * 1.5) : baseDmg;
                                this.applyDamage(u, unitDmg, null);
                            }
                        }

                        for (const t of Object.values(enemyPlayer.towers)) {
                            if (t.alive && Math.hypot(t.x - hitX, t.y - hitY) <= 180) {
                                const towerDmg = Math.round(baseDmg * 1.15);
                                t.hp = Math.max(0, t.hp - towerDmg);
                                this.emitEvent('damage_dealt', { x: t.x, y: t.y, amount: towerDmg, isTower: true });
                                if (t.hp === 0) {
                                    t.alive = false;
                                    this.emitEvent('tower_destroyed', { towerId: t.id, x: t.x, y: t.y, owner: t.owner });
                                }
                            }
                        }

                        this.emitEvent('orbital_impact', { x: hitX, y: hitY, index: i });
                    }, delayMs);
                }
                this.emitEvent('orbital_target_locked', { x: effectX, y: effectY, radius: SPELL_RADIUS });
                this.addCombatLog(`[القصف المداري Lv.${spellLevel}] وابل صواريخ مدارية مكثف (6 قذائف x ${baseDmg}) يغطي دائرة 340px!`);
            } else if (spellCard.id === 'cryo_freeze') {
                // Absolute Zero Freeze: 4.0s freeze + 160 dmg + shatter light swarms <= 250 HP instantly + 40% slow after thaw
                const freezeDur = 4.0;
                const baseDmg = Math.round(160 * mult);
                for (const u of this.units) {
                    if (!u.alive || u.owner === playerNum) continue;
                    const dist = Math.hypot(u.x - effectX, u.y - effectY);
                    if (dist <= SPELL_RADIUS) {
                        u.freezeTimer = Math.max(u.freezeTimer || 0, freezeDur);
                        u.slowTimer = Math.max(u.slowTimer || 0, freezeDur + 2.0); // Slow persists after freeze
                        this.applyDamage(u, baseDmg, null);

                        // Instant Shatter for swarms under 250 HP
                        if (u.alive && u.hp <= 250 && !u.isBuilding && !u.isHeavy) {
                            u.alive = false;
                            u.hp = 0;
                            this.emitEvent('cryo_shatter', { x: u.x, y: u.y, id: u.id });
                        }
                    }
                }
                for (const t of Object.values(enemyPlayer.towers)) {
                    if (t.alive && Math.hypot(t.x - effectX, t.y - effectY) <= SPELL_RADIUS) {
                        t.freezeTimer = Math.max(t.freezeTimer || 0, freezeDur);
                        this.applyDamage(t, Math.round(baseDmg * 0.8), null);
                    }
                }
                this.emitEvent('cryo_freeze_pulse', { x: effectX, y: effectY, radius: SPELL_RADIUS, duration: freezeDur });
                this.addCombatLog(`[التجميد المطلق Lv.${spellLevel}] تجميد كامل للأعداء والأبراج لمدة ${freezeDur} ثوانٍ مع تفتيت الأسراب!`);
            }
        }

        // --- DYNAMIC ARENA HAZARD EVENTS ---
        triggerArenaHazard() {
            const isStorm = Math.random() < 0.5;
            const hazardType = isStorm ? 'plasma_storm' : 'core_resonance';

            if (hazardType === 'plasma_storm') {
                // Plasma Storm hits the bridges & central divide zone (Y: 700 to 940)
                for (const u of this.units) {
                    if (!u.alive) continue;
                    if (u.y >= 700 && u.y <= 940) {
                        u.stunTimer = Math.max(u.stunTimer || 0, 1.4);
                        this.applyDamage(u, 65, null);
                    }
                }
                this.addCombatLog('⚠️ [إنذار بيئي] عاصفة بلازما مشحونة ضربت منطقة الجسور! صعق وأضرار للوحدات المارة.');
                this.emitEvent('arena_hazard', {
                    hazardType: 'plasma_storm',
                    title: 'عاصفة بلازما مشحونة',
                    desc: 'صعق وتفريغ طاقة على منطقة الجسور (1.4 ثانية)!'
                });
            } else {
                // Core Resonance: Overcharge flare giving 4.5s adrenaline boost & +1.5 bonus energy
                for (const u of this.units) {
                    if (!u.alive) continue;
                    u.adrenalineTimer = Math.max(u.adrenalineTimer || 0, 4.5);
                }
                this.p1.energy = Math.min(this.p1.maxEnergy, this.p1.energy + 1.5);
                this.p2.energy = Math.min(this.p2.maxEnergy, this.p2.energy + 1.5);
                this.addCombatLog('⚠️ [إنذار بيئي] رنين النواة التكتيكية! تسارع هجومي فائق ومنح +1.5 طاقة للطرفين.');
                this.emitEvent('arena_hazard', {
                    hazardType: 'core_resonance',
                    title: 'رنين النواة التكتيكية',
                    desc: 'تسارع هجومي فائق (4.5s) وطاقة فورية لكلا الطرفين!'
                });
            }
        }

        // --- FIELD FUSION ATTEMPT ---
        attemptFusion(playerNum, catalystCardId, targetUnitId) {
            const targetUnit = this.units.find(u => u.id === targetUnitId && u.alive && u.owner === playerNum);
            if (!targetUnit) return { success: false, reason: 'Target unit not found' };

            const catalyst = CARD_DATABASE[catalystCardId];
            if (!catalyst || !catalyst.isSpell) return { success: false, reason: 'Invalid catalyst' };

            const baseCard = CARD_DATABASE[targetUnit.cardId];
            if (!baseCard || baseCard.fusionTarget !== catalystCardId) {
                return { success: false, reason: 'Units incompatible for fusion' };
            }

            const fusionResultKey = baseCard.fusesInto;
            const fusedData = FUSION_UNITS[fusionResultKey];
            if (!fusedData) return { success: false, reason: 'No fusion blueprint' };

            const player = playerNum === 1 ? this.p1 : this.p2;
            const handIndex = player.hand.indexOf(catalystCardId);
            if (handIndex === -1) return { success: false, reason: 'Catalyst not in hand' };

            // Deduct energy
            if (player.energy < catalyst.cost) {
                return { success: false, reason: 'Not enough energy for fusion' };
            }
            player.energy -= catalyst.cost;

            // Cycle hand
            player.hand.splice(handIndex, 1);
            if (player.queue.length > 0) {
                const nextCard = player.queue.shift();
                player.hand.push(nextCard);
                player.queue.push(catalystCardId);
            } else {
                player.hand.push(catalystCardId);
            }

            // Transform target unit into fused elite form
            targetUnit.name = fusedData.name;
            targetUnit.cardId = fusedData.id;
            targetUnit.hp = Math.min(targetUnit.hp + (fusedData.hp - baseCard.hp), fusedData.hp);
            targetUnit.maxHp = fusedData.hp;
            targetUnit.damage = fusedData.damage;
            targetUnit.attackSpeed = fusedData.attackSpeed;
            targetUnit.range = fusedData.range;
            targetUnit.speed = fusedData.speed;
            targetUnit.splashRadius = fusedData.splashRadius || 0;
            targetUnit.fusionTier = 1;
            targetUnit.shieldHp = (targetUnit.shieldHp || 0) + 200;

            this.addCombatLog(`FUSION EVOLUTION: ${targetUnit.name} forged!`);
            this.emitEvent('unit_fused', { unitId: targetUnit.id, fusionName: targetUnit.name, x: targetUnit.x, y: targetUnit.y, owner: targetUnit.owner });
            return { success: true };
        }

        // --- COMMAND CANNON STRIKE ---
        triggerCommandCannon(playerNum, laneIndex) {
            const player = playerNum === 1 ? this.p1 : this.p2;
            if (player.cannonCooldown > 0) return { success: false, reason: 'Cannon on cooldown' };
            if (player.energy < 2.0) return { success: false, reason: 'Cannon requires 2 energy' };

            player.energy -= 2.0;
            player.cannonCooldown = 300; // 15 seconds cooldown

            const lane = ARENA.LANES[laneIndex];

            // Sweep entire lane with EMP shock
            for (const u of this.units) {
                if (!u.alive || u.owner === playerNum || u.lane !== laneIndex) continue;
                u.stunTimer = 2.0;
                this.applyDamage(u, 140, null);
            }

            this.addCombatLog(`Player ${playerNum} fired Command Turret on Lane ${laneIndex}!`);
            this.emitEvent('cannon_fired', { playerNum, laneIndex, x: lane.x });
            return { success: true };
        }

        // --- HEURISTIC TACTICAL BOT AI ---
        updateBotAI() {
            if (this.botAITickCooldown > 0) {
                this.botAITickCooldown--;
                return;
            }

            // Humanized Bot: acts every 3.2 - 4.5 seconds (65-90 ticks)
            // In Triple Elixir mode, bot reacts much faster (20-32 ticks) to match 300% elixir flow
            if (this.isTripleElixirMode) {
                this.botAITickCooldown = 20 + Math.floor(Math.random() * 12);
                if (this.p2.energy < 3.0) return;
            } else {
                this.botAITickCooldown = 65 + Math.floor(Math.random() * 25);
                // Conservative behavior: Wait until at least 5 energy
                if (this.p2.energy < 5.0) return;
            }

            // 1. Analyze threat lanes: Does P1 have units threatening top towers?
            let threatLane = null;
            for (const u of this.units) {
                if (u.alive && u.owner === 1 && u.y < 800) {
                    threatLane = u.lane;
                    break;
                }
            }

            // 2. Decide lane to play
            let chosenLane = threatLane !== null ? threatLane : Math.floor(Math.random() * 3);

            // 3. Contest Relay Core: Moderate priority (30%)
            if (this.relayCore.cooldownTicks === 0 && Math.random() < 0.3) {
                chosenLane = 1;
            }

            // 4. Tactical spell usage: if bot has orbital_salvo or emp_overcharge and player has clustered units
            const spellCard = this.p2.hand.find(id => {
                const c = CARD_DATABASE[id];
                return c && c.isSpell && c.cost <= this.p2.energy;
            });

            if (spellCard && threatLane !== null && Math.random() < 0.35) {
                const targetX = ARENA.LANES[threatLane].x;
                const targetY = 700;
                this.deployCard(2, spellCard, targetX, targetY);
                return;
            }

            // 5. Playable unit deployment
            const playableCards = this.p2.hand.filter(cardId => {
                const c = CARD_DATABASE[cardId];
                return c && !c.isSpell && c.cost <= this.p2.energy;
            });

            if (playableCards.length > 0) {
                const selectedCard = playableCards[Math.floor(Math.random() * playableCards.length)];
                const cData = CARD_DATABASE[selectedCard];
                const botSpawnY = (cData && cData.isBuilding) ? 440 : 360 + Math.floor(Math.random() * 80);
                const botSpawnX = ARENA.LANES[chosenLane].x + (Math.random() - 0.5) * 60;
                this.deployCard(2, selectedCard, botSpawnX, botSpawnY);
            }
        }

        // --- SERIALIZATION FOR CLIENT INTERPOLATION ---
        getSnapshot() {
            const overtimeRemaining = this.overtime
                ? Math.max(0, Math.floor((ARENA.MATCH_DURATION_TICKS + ARENA.OVERTIME_MAX_TICKS - this.currentTick) / ARENA.TICK_RATE))
                : 0;

            const regularRemaining = Math.max(0, Math.floor((ARENA.MATCH_DURATION_TICKS - this.currentTick) / ARENA.TICK_RATE));

            return {
                tick: this.currentTick,
                state: this.state,
                winner: this.winner,
                overtime: this.overtime,
                isOvertime: this.overtime,
                isDoubleEnergy: (this.currentTick >= ARENA.DOUBLE_ENERGY_TICK || this.overtime || this.isTripleElixirMode),
                isTripleElixirMode: this.isTripleElixirMode,
                overtimeRemaining: overtimeRemaining,
                timeRemaining: this.overtime ? overtimeRemaining : regularRemaining,
                p1: {
                    energy: this.p1.energy,
                    maxEnergy: this.p1.maxEnergy,
                    energyDebt: this.p1.energyDebt,
                    isRedline: this.p1.isRedline,
                    hand: [...this.p1.hand],
                    nextCard: this.p1.queue[0] || null,
                    cannonCooldown: Math.ceil(this.p1.cannonCooldown / ARENA.TICK_RATE),
                    towers: {
                        left: { x: this.p1.towers.left.x, y: this.p1.towers.left.y, hp: this.p1.towers.left.hp, maxHp: this.p1.towers.left.maxHp, alive: this.p1.towers.left.alive, isFrozen: (this.p1.towers.left.freezeTimer || 0) > 0 },
                        main: { x: this.p1.towers.main.x, y: this.p1.towers.main.y, hp: this.p1.towers.main.hp, maxHp: this.p1.towers.main.maxHp, alive: this.p1.towers.main.alive, isFrozen: (this.p1.towers.main.freezeTimer || 0) > 0 },
                        right: { x: this.p1.towers.right.x, y: this.p1.towers.right.y, hp: this.p1.towers.right.hp, maxHp: this.p1.towers.right.maxHp, alive: this.p1.towers.right.alive, isFrozen: (this.p1.towers.right.freezeTimer || 0) > 0 }
                    }
                },
                p2: {
                    energy: this.p2.energy,
                    maxEnergy: this.p2.maxEnergy,
                    isRedline: this.p2.isRedline,
                    cannonCooldown: Math.ceil(this.p2.cannonCooldown / ARENA.TICK_RATE),
                    towers: {
                        left: { x: this.p2.towers.left.x, y: this.p2.towers.left.y, hp: this.p2.towers.left.hp, maxHp: this.p2.towers.left.maxHp, alive: this.p2.towers.left.alive, isFrozen: (this.p2.towers.left.freezeTimer || 0) > 0 },
                        main: { x: this.p2.towers.main.x, y: this.p2.towers.main.y, hp: this.p2.towers.main.hp, maxHp: this.p2.towers.main.maxHp, alive: this.p2.towers.main.alive, isFrozen: (this.p2.towers.main.freezeTimer || 0) > 0 },
                        right: { x: this.p2.towers.right.x, y: this.p2.towers.right.y, hp: this.p2.towers.right.hp, maxHp: this.p2.towers.right.maxHp, alive: this.p2.towers.right.alive, isFrozen: (this.p2.towers.right.freezeTimer || 0) > 0 }
                    }
                },
                relayCore: {
                    owner: this.relayCore.owner,
                    cooldown: Math.ceil(this.relayCore.cooldownTicks / ARENA.TICK_RATE)
                },
                units: this.units.map(u => ({
                    id: u.id,
                    owner: u.owner,
                    cardId: u.cardId,
                    name: u.name,
                    role: u.role,
                    lane: u.lane,
                    x: Math.round(u.x),
                    y: Math.round(u.y),
                    angle: Math.round((u.angle || (u.owner === 1 ? -Math.PI / 2 : Math.PI / 2)) * 100) / 100,
                    hp: Math.round(u.hp),
                    maxHp: u.maxHp,
                    shieldHp: Math.round(u.shieldHp || 0),
                    isHeavy: u.isHeavy,
                    fusionTier: u.fusionTier,
                    isFrozen: (u.freezeTimer || 0) > 0,
                    isStunned: u.stunTimer > 0,
                    hasAdrenaline: u.adrenalineTimer > 0,
                    isStealth: !!u.isStealth,
                    isBuilding: !!u.isBuilding,
                    healer: !!u.healer,
                    healingTargetId: u.healingTargetId || null,
                    level: u.level || 1,
                    state: u.state
                })),
                combatFeed: this.combatFeed.slice(0, 15)
            };
        }
    }

    // Expose constants and class
    TacticalGameRoom.ARENA = ARENA;
    TacticalGameRoom.CARD_DATABASE = CARD_DATABASE;
    TacticalGameRoom.FUSION_UNITS = FUSION_UNITS;

    return TacticalGameRoom;
}));
