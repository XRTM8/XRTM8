/**
 * Progression.js
 * Persistent Player Profile, Experience Points (XP), Level Progression (1-50),
 * Rank Titles, and Achievement-driven Neon Skins.
 */

const SKINS = [
    {
        id: 'cyan',
        name: 'Cyber Cyan',
        color: '#00f0ff',
        glow: 'rgba(0, 240, 255, 0.6)',
        reqLevel: 1,
        reqKills: 0,
        reqParries: 0,
        desc: 'Standard operative neon issue'
    },
    {
        id: 'gold',
        name: 'Cyber Gold',
        color: '#ffb703',
        glow: 'rgba(255, 183, 3, 0.6)',
        reqLevel: 5,
        reqKills: 25,
        reqParries: 0,
        desc: 'Unlocked at Level 5 or 25 Kills'
    },
    {
        id: 'ruby',
        name: 'Blood Ruby',
        color: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.6)',
        reqLevel: 10,
        reqKills: 50,
        reqParries: 0,
        desc: 'Unlocked at Level 10 or 50 Kills'
    },
    {
        id: 'void',
        name: 'Void Violet',
        color: '#d946ef',
        glow: 'rgba(217, 70, 239, 0.6)',
        reqLevel: 15,
        reqKills: 0,
        reqParries: 15,
        desc: 'Unlocked at Level 15 or 15 Parries'
    },
    {
        id: 'emerald',
        name: 'Emerald Glitch',
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.6)',
        reqLevel: 25,
        reqKills: 100,
        reqParries: 0,
        desc: 'Unlocked at Level 25'
    }
];

class ProgressionManager {
    constructor() {
        this.storageKey = 'neon_clash_player_data';
        this.data = {
            name: 'Operator',
            level: 1,
            xp: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalParries: 0,
            totalWins: 0,
            matchesPlayed: 0,
            selectedSkin: 'cyan',
            unlockedSkins: ['cyan'],
            weaponMastery: {
                blaster: { level: 1, xp: 0, kills: 0 },
                shotgun: { level: 1, xp: 0, kills: 0 },
                sniper: { level: 1, xp: 0, kills: 0 },
                vortex: { level: 1, xp: 0, kills: 0 },
                blade: { level: 1, xp: 0, kills: 0 }
            }
        };

        this.load();
        this.checkUnlocks();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.data = {
                    ...this.data,
                    ...parsed,
                    weaponMastery: {
                        ...this.data.weaponMastery,
                        ...(parsed.weaponMastery || {})
                    }
                };
            }
        } catch (e) {
            console.warn('Could not load profile from localStorage:', e);
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Could not save profile to localStorage:', e);
        }
    }

    getXpForLevel(lvl) {
        return Math.floor(120 * Math.pow(lvl, 1.3));
    }

    getTitle() {
        const lvl = this.data.level;
        if (lvl >= 50) return 'Apex Legend';
        if (lvl >= 35) return 'Phantom';
        if (lvl >= 20) return 'Ghost';
        if (lvl >= 10) return 'Vanguard';
        if (lvl >= 5) return 'Operative';
        return 'Recruit';
    }

    getSelectedSkin() {
        return SKINS.find(s => s.id === this.data.selectedSkin) || SKINS[0];
    }

    checkUnlocks() {
        const newUnlocks = [];
        for (let s of SKINS) {
            if (!this.data.unlockedSkins.includes(s.id)) {
                const byLevel = this.data.level >= s.reqLevel;
                const byKills = s.reqKills > 0 && this.data.totalKills >= s.reqKills;
                const byParries = s.reqParries > 0 && this.data.totalParries >= s.reqParries;

                if (byLevel || byKills || byParries) {
                    this.data.unlockedSkins.push(s.id);
                    newUnlocks.push(s);
                }
            }
        }
        if (newUnlocks.length > 0) this.save();
        return newUnlocks;
    }

    selectSkin(skinId) {
        if (this.data.unlockedSkins.includes(skinId)) {
            this.data.selectedSkin = skinId;
            this.save();
            return true;
        }
        return false;
    }

    setName(newName) {
        if (newName && newName.trim()) {
            this.data.name = newName.trim();
            this.save();
        }
    }

    /**
     * Record match finish and award XP
     */
    recordMatch(kills, deaths, parries, isWin, score) {
        this.data.matchesPlayed++;
        this.data.totalKills += kills;
        this.data.totalDeaths += deaths;
        this.data.totalParries += parries;
        if (isWin) this.data.totalWins++;

        // Calculate XP: 150 per kill, 80 per parry, 400 for winning, 50 participation
        let gainedXP = (kills * 150) + (parries * 80) + (isWin ? 400 : 80) + Math.round(score * 0.1);
        this.data.xp += gainedXP;

        const oldLevel = this.data.level;
        let leveledUp = false;

        // Level Up Loop
        while (this.data.level < 50) {
            const req = this.getXpForLevel(this.data.level);
            if (this.data.xp >= req) {
                this.data.xp -= req;
                this.data.level++;
                leveledUp = true;
            } else {
                break;
            }
        }

        const newUnlocks = this.checkUnlocks();
        this.save();

        return {
            gainedXP: gainedXP,
            oldLevel: oldLevel,
            newLevel: this.data.level,
            leveledUp: leveledUp,
            currentXP: this.data.xp,
            neededXP: this.getXpForLevel(this.data.level),
            newUnlocks: newUnlocks
        };
    }

    getStats() {
        const kd = this.data.totalDeaths > 0
            ? (this.data.totalKills / this.data.totalDeaths).toFixed(2)
            : this.data.totalKills.toFixed(2);

        const winrate = this.data.matchesPlayed > 0
            ? Math.round((this.data.totalWins / this.data.matchesPlayed) * 100)
            : 0;

        return {
            level: this.data.level,
            title: this.getTitle(),
            xp: this.data.xp,
            xpNeeded: this.getXpForLevel(this.data.level),
            kills: this.data.totalKills,
            deaths: this.data.totalDeaths,
            kd: kd,
            parries: this.data.totalParries,
            wins: this.data.totalWins,
            matches: this.data.matchesPlayed,
            winrate: `${winrate}%`
        };
    }

    // Phase 6: Weapon Mastery Tracking
    getWeaponMastery(weaponId) {
        if (!this.data.weaponMastery) {
            this.data.weaponMastery = {
                blaster: { level: 1, xp: 0, kills: 0 },
                shotgun: { level: 1, xp: 0, kills: 0 },
                sniper: { level: 1, xp: 0, kills: 0 },
                vortex: { level: 1, xp: 0, kills: 0 },
                blade: { level: 1, xp: 0, kills: 0 }
            };
        }
        const m = this.data.weaponMastery[weaponId] || { level: 1, xp: 0, kills: 0 };
        const tierNames = ['Standard', 'Tactical', 'Apex'];
        const tierName = tierNames[Math.min(2, Math.max(0, m.level - 1))];
        return {
            level: m.level,
            xp: m.xp,
            kills: m.kills,
            tier: {
                tier: m.level,
                name: tierName
            }
        };
    }

    addWeaponXp(weaponId, xpGained, killsGained = 0) {
        if (!this.data.weaponMastery) {
            this.getWeaponMastery(weaponId);
        }
        const m = this.data.weaponMastery[weaponId] || (this.data.weaponMastery[weaponId] = { level: 1, xp: 0, kills: 0 });
        m.xp += xpGained;
        m.kills += killsGained;
        let leveledUp = false;

        // Mastery Tiers: Tier 1 (0 XP), Tier 2 (300 XP), Tier 3 (750 XP)
        const xpThresholds = [0, 300, 750];
        if (m.level < 3 && m.xp >= xpThresholds[m.level]) {
            m.level++;
            leveledUp = true;
        }
        this.save();
        const tierNames = ['Standard', 'Tactical', 'Apex'];
        const tierName = tierNames[Math.min(2, Math.max(0, m.level - 1))];
        return {
            leveledUp,
            newLevel: m.level,
            totalXp: m.xp,
            kills: m.kills,
            tier: {
                tier: m.level,
                name: tierName
            }
        };
    }
}

window.SKINS = SKINS;
window.ProgressionManager = new ProgressionManager();
