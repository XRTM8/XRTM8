
// ===================================================================
// MOBILE TOUCH AUTO-DETECTION, COORDINATE MAPPING & FULLSCREEN CONTROLS
// ===================================================================
function isMobileTouchActive() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0) || 
           (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 
           (window.innerWidth <= 1024);
}

function updateMobileControlsVisibility() {
    const touchContainer = document.getElementById('touch-controls-container');
    const isTouch = isMobileTouchActive();
    if (isTouch && !isGameOver && player) {
        if (touchContainer) {
            touchContainer.style.display = 'block';
            touchContainer.classList.remove('hidden');
        }
        if (joystickBase) joystickBase.style.display = 'flex';
        if (joystickAimBase) joystickAimBase.style.display = 'flex';
        if (hudInstructions) hudInstructions.style.display = 'none';
    } else {
        if (touchContainer) {
            touchContainer.style.display = 'none';
        }
        if (joystickBase) joystickBase.style.display = 'none';
        if (joystickAimBase) joystickAimBase.style.display = 'none';
        if (hudInstructions && !isGameOver && player) {
            hudInstructions.style.display = 'block';
        }
    }
}

// Convert screen viewport coordinates (clientX, clientY) to internal canvas space
function getCanvasTouchCoords(clientX, clientY) {
    const cvs = document.getElementById('gameCanvas');
    if (!cvs) return { canvasX: clientX, canvasY: clientY, screenX: clientX, screenY: clientY };
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / (rect.width || 1);
    const scaleY = cvs.height / (rect.height || 1);
    return {
        canvasX: (clientX - rect.left) * scaleX,
        canvasY: (clientY - rect.top) * scaleY,
        screenX: clientX - rect.left,
        screenY: clientY - rect.top
    };
}

// Seamless cross-browser fullscreen toggler for mobile & desktop
function toggleFullScreen() {
    try {
        const doc = window.document;
        const docEl = doc.documentElement;
        const requestFullScreen = docEl.requestFullscreen || 
                                  docEl.mozRequestFullScreen || 
                                  docEl.webkitRequestFullScreen || 
                                  docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || 
                                 doc.mozCancelFullScreen || 
                                 doc.webkitExitFullscreen || 
                                 doc.msExitFullscreen;

        if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            if (requestFullScreen) {
                requestFullScreen.call(docEl).catch(err => {
                    console.warn('Fullscreen request bypassed/rejected:', err);
                });
            }
        } else {
            if (cancelFullScreen) {
                cancelFullScreen.call(doc).catch(err => {
                    console.warn('Fullscreen exit error:', err);
                });
            }
        }
    } catch (e) {
        console.warn('Fullscreen toggle failed:', e);
    }
}


// Safe LocalStorage JSON Parser Shield
function safeGetJson(key, defaultVal = null) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultVal;
        return JSON.parse(item);
    } catch (e) {
        console.warn('Recovered from corrupted LocalStorage key:', key);
        return defaultVal;
    }
}


// ===================================================================
// ADVANCED MATHEMATICAL SAFETY & ZERO-DIVISION SHIELDS
// ===================================================================
function safeDist(d, fallback = 1) {
    return (typeof d === 'number' && !isNaN(d) && Math.abs(d) > 0.0001) ? d : fallback;
}

function safeNormalize(dx, dy) {
    const d = Math.hypot(dx, dy);
    if (!d || isNaN(d) || d < 0.0001) return { x: 0, y: 0 };
    return { x: dx / d, y: dy / d };
}

function resumeAudioCtx() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}
window.addEventListener('click', resumeAudioCtx, { passive: true });
window.addEventListener('keydown', resumeAudioCtx, { passive: true });
window.addEventListener('touchstart', resumeAudioCtx, { passive: true });

        const WORLD_W = 8000, WORLD_H = 8000;
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
        const distSq = (x1, y1, x2, y2) => (x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1);

        const colors = {
            bg: '#030407', player: '#00f3ff', dash: '#ffffff', playerBullet: '#00ffff',
            enemySniper: '#ff2a5f', enemyDasher: '#ff9100', enemyBurst: '#b700ff', enemyBoss: '#ff0055',
            enemyDrone: '#00ffcc', enemyPistol: '#2bfb73', enemyElite: '#ffd700',
            enemySplitter: '#00d4ff', enemyPhantom: '#a855f7', enemyOrbiter: '#ec4899', enemyJuggernaut: '#e11d48',
            enemyArchitect: '#d97706', enemyTurret: '#f59e0b', enemyFlanker: '#10b981', 
            enemyMirror: '#94a3b8', enemySwarmQueen: '#4c1d95', enemyMicroSwarm: '#8b5cf6',
            enemyLeech: '#10b981', enemyChronomancer: '#3b82f6', enemyTether: '#ef4444',
            // --- ألوان المرحلة الثالثة ---
            enemyArtillery: '#be123c', enemyHacker: '#059669', enemyVolatile: '#f43f5e',
            // -----------------------------
            energy: '#00ff88', anomaly: '#9900ff', gold: '#ffd700', relic: '#ff00a0', synergy: '#00f3ff', ult: '#ffaa00', portal: '#bd00ff', grid: 'rgba(0, 243, 255, 0.06)'
        };

        

// ===================================================================
// RELEASE POLISH ENGINES: PWA, GAMEPAD, HAPTICS, SYNTH BGM & DAILY REWARDS
// ===================================================================

// 1. PWA Installation & Service Worker Registration
let deferredPwaPrompt = null;

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            console.log(' [PWA] Service Worker registered successfully:', reg.scope);
        }).catch((err) => {
            console.log('PWA Service Worker registration skipped:', err);
        });
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'flex';
});

window.triggerPwaInstall = function() {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    deferredPwaPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) installBtn.style.display = 'none';
        }
        deferredPwaPrompt = null;
    });
};

// 2. Haptic Feedback Engine
function triggerHaptic(type) {
    if (!gameSettings || gameSettings.haptic === false) return;
    if (!navigator || typeof navigator.vibrate !== 'function') return;

    try {
        if (type === 'shoot') navigator.vibrate(10);
        else if (type === 'crit') navigator.vibrate(20);
        else if (type === 'dash') navigator.vibrate(25);
        else if (type === 'hit') navigator.vibrate([40, 25, 40]);
        else if (type === 'kill') navigator.vibrate([30, 20, 50]);
        else if (type === 'nova') navigator.vibrate([90, 40, 110]);
        else if (type === 'gameover') navigator.vibrate([150, 60, 200]);
    } catch (e) {}
}

// 3. Procedural Cyberpunk Synthwave BGM Generator (Web Audio API)
let bgmGainNode = null;
let isBgmPlaying = false;
let bgmInterval = null;

function initProceduralBgm() {
    if (!audioCtx || bgmGainNode) return;
    try {
        bgmGainNode = audioCtx.createGain();
        let vol = (gameSettings && gameSettings.bgmVolume !== undefined) ? gameSettings.bgmVolume : 0.65;
        bgmGainNode.gain.setValueAtTime(vol * 0.18, audioCtx.currentTime);
        bgmGainNode.connect(audioCtx.destination);
    } catch (e) {}
}

function startProceduralBgm() {
    if (isBgmPlaying || !audioCtx) return;
    initProceduralBgm();
    isBgmPlaying = true;

    // Cyberpunk Pentatonic Progression: D minor [D, F, G, A, C]
    const bassFrequencies = [73.42, 87.31, 98.00, 110.00]; // D2, F2, G2, A2
    const leadFrequencies = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33]; // D4, F4, G4, A4, C5, D5
    let step = 0;

    bgmInterval = setInterval(() => {
        if (!isBgmPlaying || !audioCtx || audioCtx.state !== 'running' || !bgmGainNode) return;

        const now = audioCtx.currentTime;
        const bassFreq = bassFrequencies[Math.floor(step / 8) % bassFrequencies.length];

        // 1. Synth Bass Pulse (Sawtooth with Low-Pass Filter)
        if (step % 2 === 0) {
            let osc = audioCtx.createOscillator();
            let filter = audioCtx.createBiquadFilter();
            let gain = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(bassFreq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320 + Math.sin(step) * 100, now);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(bgmGainNode);

            osc.start(now);
            osc.stop(now + 0.2);
        }

        // 2. Cosmic Lead Chime (Sine wave with Reverb Tail)
        if (step % 4 === 0 || (step % 4 === 3 && Math.random() > 0.4)) {
            let leadFreq = leadFrequencies[Math.floor(Math.random() * leadFrequencies.length)];
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(leadFreq, now);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(bgmGainNode);

            osc.start(now);
            osc.stop(now + 0.36);
        }

        step++;
    }, 140); // 107 BPM Cyber Beat
}

function updateBgmVolume(val) {
    let num = parseFloat(val) / 100;
    gameSettings.bgmVolume = num;
    const valTag = document.getElementById('bgm-vol-val');
    if (valTag) valTag.innerText = `${Math.round(num * 100)}%`;
    if (bgmGainNode && audioCtx) {
        bgmGainNode.gain.setValueAtTime(num * 0.18, audioCtx.currentTime);
    }
    saveGameSettings();
}
window.updateBgmVolume = updateBgmVolume;

// 4. Gamepad Controller Engine (Xbox / PlayStation / Generic)
let connectedGamepadIndex = null;
let lastGamepadButtonState = {};

window.addEventListener('gamepadconnected', (e) => {
    connectedGamepadIndex = e.gamepad.index;
    console.log(' [Gamepad] Connected:', e.gamepad.id);
    const toast = document.getElementById('gamepad-toast');
    const nameVal = document.getElementById('gamepad-name-val');
    if (toast) {
        if (nameVal) nameVal.innerText = e.gamepad.id.split('(')[0].trim() || 'Game Controller';
        toast.classList.remove('hidden');
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }
    triggerHaptic('dash');
});

window.addEventListener('gamepaddisconnected', (e) => {
    if (connectedGamepadIndex === e.gamepad.index) {
        connectedGamepadIndex = null;
        console.log(' [Gamepad] Disconnected');
    }
});

function pollGamepadInput() {
    if (connectedGamepadIndex === null || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[connectedGamepadIndex];
    if (!gp || !gp.connected || !player || isGameOver) return;

    // 1. Left Stick Movement (Axes 0 & 1)
    const deadzone = 0.18;
    const axisX = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
    const axisY = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

    if (axisX !== 0 || axisY !== 0) {
        player.vx += axisX * player.accel * 1.1;
        player.vy += axisY * player.accel * 1.1;
    }

    // 2. Right Stick Aiming & Auto-Shoot (Axes 2 & 3)
    const aimX = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
    const aimY = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;

    if (Math.hypot(aimX, aimY) > 0.3) {
        let aimAngle = Math.atan2(aimY, aimX);
        mouseWorldX = player.x + Math.cos(aimAngle) * 400;
        mouseWorldY = player.y + Math.sin(aimAngle) * 400;
        isMouseDown = true;
    }

    // 3. Buttons Mapping
    const isPressed = (btnIdx) => gp.buttons[btnIdx] && gp.buttons[btnIdx].pressed;
    const justPressed = (btnIdx) => {
        const p = isPressed(btnIdx);
        const was = !!lastGamepadButtonState[btnIdx];
        lastGamepadButtonState[btnIdx] = p;
        return p && !was;
    };

    // Button 0 (A / Cross): Dash
    if (justPressed(0) || justPressed(6)) {
        if (typeof player.dash === 'function') player.dash();
        triggerHaptic('dash');
    }

    // Button 1 (B / Circle): Class Skill (E)
    if (justPressed(1)) {
        if (selectedChassis === 'assault') activateSprintSkill();
        else if (selectedChassis === 'sniper') activateSniperRecon();
        else if (selectedChassis === 'engineer') deployEngineerTurret();
        else if (selectedChassis === 'support') deploySupportSmoke();
    }

    // Button 2 (X / Square): Reload (R)
    if (justPressed(2)) {
        if (player && typeof player.reload === 'function') player.reload();
    }

    // Button 3 (Y / Triangle): Swap Weapon (Q / 1-2)
    if (justPressed(3)) {
        swapEquippedWeaponSlot();
    }

    // Button 5 (RB / R1) or Button 4 (LB): Super Nova (Z)
    if (justPressed(5) || justPressed(4)) {
        triggerOverchargeEMP();
    }

    // Button 7 (RT / R2): Shoot
    if (isPressed(7)) {
        isMouseDown = true;
    }

    // Button 9 (Start / Options): Pause
    if (justPressed(9)) {
        togglePause();
    }

    // Button 8 (Select / Touchpad): Map
    if (justPressed(8)) {
        toggleTacticalMapModal();
    }
}

// 5. Daily Login Rewards Matrix Engine
const DAILY_REWARDS_TABLE = [
    { day: 1, type: 'credits', val: 150, icon: '<svg class="c-icon c-icon-gold"><use href="#icon-crystal"></use></svg>', label: '150 Credits' },
    { day: 2, type: 'trophies', val: 25, icon: '<svg class="c-icon c-icon-cyan"><use href="#icon-trophy"></use></svg>', label: '25 Trophies' },
    { day: 3, type: 'skin', val: 'skin_neon_berserker', icon: '<svg class="c-icon c-icon-red"><use href="#icon-flame"></use></svg>', label: 'Neon Berserker' },
    { day: 4, type: 'credits', val: 400, icon: '<svg class="c-icon c-icon-gold"><use href="#icon-crystal"></use></svg>', label: '400 Credits' },
    { day: 5, type: 'trophies', val: 60, icon: '<svg class="c-icon c-icon-purple"><use href="#icon-crown"></use></svg>', label: '60 Trophies' },
    { day: 6, type: 'credits', val: 800, icon: '<svg class="c-icon c-icon-gold"><use href="#icon-zap"></use></svg>', label: '800 Credits' },
    { day: 7, type: 'legendary', val: 'skin_apex_overlord', icon: '<svg class="c-icon c-icon-purple"><use href="#icon-crown"></use></svg>', label: 'Apex Overlord (Legendary)' }
];

let dailyLoginData = {
    lastClaimDate: null,
    streakCount: 1,
    claimedDays: []
};

try {
    const savedDaily = localStorage.getItem('chrono_daily_rewards');
    if (savedDaily) dailyLoginData = JSON.parse(savedDaily);
} catch (e) {}

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

window.openDailyRewardsModal = function() {
    const modal = document.getElementById('daily-rewards-modal');
    const grid = document.getElementById('daily-rewards-grid');
    const streakCountTag = document.getElementById('daily-streak-count');
    const claimBtn = document.getElementById('claim-daily-btn');
    if (!modal || !grid) return;

    const today = getTodayString();
    const isClaimedToday = dailyLoginData.lastClaimDate === today;

    if (streakCountTag) streakCountTag.innerText = `اليوم ${dailyLoginData.streakCount} من 7 `;
    if (claimBtn) {
        if (isClaimedToday) {
            claimBtn.innerText = '[OK] تم استلام مكافأة اليوم';
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.6';
        } else {
            claimBtn.innerText = ' استلام مكافأة اليوم ';
            claimBtn.disabled = false;
            claimBtn.style.opacity = '1';
        }
    }

    let html = '';
    DAILY_REWARDS_TABLE.forEach((r, idx) => {
        const isClaimed = dailyLoginData.claimedDays.includes(r.day);
        const isToday = (dailyLoginData.streakCount === r.day);
        const cardClass = 'daily-day-card' + (isClaimed ? ' day-claimed' : '') + (isToday ? ' day-today' : '') + (r.day === 7 ? ' day-legendary' : '');

        html += `
            <div class="${cardClass}">
                ${isClaimed ? '<span class="daily-claimed-badge">[OK] تم</span>' : ''}
                <div class="daily-day-label">Day ${r.day}</div>
                <div class="daily-reward-icon">${r.icon}</div>
                <div class="daily-reward-val">${r.label}</div>
            </div>
        `;
    });

    grid.innerHTML = html;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.closeDailyRewardsModal = function() {
    const modal = document.getElementById('daily-rewards-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.claimDailyReward = function() {
    const today = getTodayString();
    if (dailyLoginData.lastClaimDate === today) {
        alert('[OK] لقد استلمت مكافأة اليوم بالفعل! عد غداً للمكافأة التالية.');
        return;
    }

    const currentReward = DAILY_REWARDS_TABLE[dailyLoginData.streakCount - 1] || DAILY_REWARDS_TABLE[0];

    if (currentReward.type === 'credits') {
        metaCurrency += currentReward.val;
        saveGameProgress();
        spawnFloatingText(width / 2, height / 2, `+${currentReward.val} CR Credits!`, '#ffd700');
    } else if (currentReward.type === 'trophies') {
        playerTrophies += currentReward.val;
        updatePlayerRankCardUI();
        spawnFloatingText(width / 2, height / 2, `+${currentReward.val} PTS Trophies!`, '#ffd700');
    } else if (currentReward.type === 'skin' || currentReward.type === 'legendary') {
        if (!unlockedSkins.includes(currentReward.val)) {
            unlockedSkins.push(currentReward.val);
            saveGameProgress();
        }
        spawnFloatingText(width / 2, height / 2, ` مظهر أسطوري مفتوح: ${currentReward.label}`, '#bd00ff');
    }

    dailyLoginData.claimedDays.push(dailyLoginData.streakCount);
    dailyLoginData.lastClaimDate = today;
    if (dailyLoginData.streakCount < 7) dailyLoginData.streakCount++;
    else { dailyLoginData.streakCount = 1; dailyLoginData.claimedDays = []; }

    localStorage.setItem('chrono_daily_rewards', JSON.stringify(dailyLoginData));

    playSound('gold');
    triggerHaptic('nova');
    openDailyRewardsModal();
};

// Check for auto-prompting daily rewards on launch
setTimeout(() => {
    const today = getTodayString();
    if (dailyLoginData.lastClaimDate !== today) {
        openDailyRewardsModal();
    }
}, 1200);


// ===================================================================
// BILINGUAL LOCALIZATION ENGINE & XSS PROTECTION (i18n)
// ===================================================================
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const I18N_DICTIONARY = {
    ar: {
        gameTitlePrimary: 'الانجراف الزمني',
        gameTitleSub: 'CHRONO DRIFT',
        onlineAgentsLabel: 'العملاء المتصلون:',
        agentLevelLabel: 'مستوى العميل:',
        xpLabel: 'الخبرة (XP):',
        tacticalUsernameLabel: ' اسم العميل التكتيكي (Tactical Username):',
        usernamePlaceholder: 'أدخل اسمك القتالي...',
        readyForBattle: 'جاهز للقتال',
        tabPlay: 'الساحة والأنماط',
        tabArsenal: 'الترسانة والكلاسات',
        tabShop: 'المتجر والتخصيص ',
        tabPerks: 'البيركات التلقائية',
        tabMissions: 'المهمات والتحديات',
        tabSettings: 'الإعدادات والتحكم',
        btnRank: 'الرانك',
        btnAccount: 'الحساب',
        btnLeaderboard: 'PTS الليدربورد',
        menuDescTxt: 'اختر نمط المعركة التكتيكي للانطلاق في الساحة السيبرانية:',
        modeSoloTitle: 'فردي أوفلاين (Solo Offline)',
        modeSoloDesc: 'خض معركة البقاء الفردية مع نظام تمدد الوقت (Time Dilation).',
        modeBossRushTitle: 'قتال الزعماء (Boss Rush)',
        modeBossRushDesc: 'مواجهة فورية ومتتالية لأعتى زعماء الذكاء الاصطناعي الخارق.',
        modeCoopTitle: 'تعاوني أونلاين (Co-Op PVE)',
        modeCoopDesc: 'شكل فرقة مع العملاء الآخرين واقضوا معاً على أسراب الأعداء.',
        modePvPTitle: 'ساحة النزاع (Arena PVP)',
        modePvPDesc: 'قتال مباشر ضد اللاعبين الآخرين! البقاء للأسرع والأدق.',
        modeBossRaidTitle: 'غارات الزعماء الكونية (Boss Raid)',
        modeBossRaidDesc: 'معركة ملحمية جماعية لإسقاط زعماء الفضاء المتوحشين والحصول على جوائز أسطورية.',
        modeFreeRoamTitle: 'الاستكشاف الحر (Free Roam)',
        modeFreeRoamDesc: 'ساحة حرة مفتوحة لتجربة السفن والأسلحة والتناور مع الزملاء بحرية.',
        modeCustomTitle: 'غرفة مخصصة (Custom Room)',
        modeCustomDesc: 'أنشئ غرفتك الخاصة بكود سري، وحدد القواعد والخرائط والعب مع أصدقائك!',
        arsenalHeader: ' عتاد المعركة ومصفوفة الكلاسات (Combat Loadout & 3D Hangar)',
        classAssault: 'الهجومي (Assault)',
        classSniper: 'القناص (Sniper)',
        classSupport: 'الدعم (Support)',
        classEngineer: 'المهندس (Engineer)',
        wepPrimaryLabel: ' الأساسي:',
        wepSecondaryLabel: ' الثانوي:',
        equippedBtn: 'مجهز حالياً [OK]',
        selectClassBtn: 'اختيار الكلاس',
        weaponPickerTitle: ' ترسانة الأسلحة الأساسية (Choose Primary Weapon)',
        shopTitle: ' متجر التخصيص السيبراني (Cybernetic Vault)',
        availableBalance: 'الرصيد المتاح:',
        equipCosmeticBtn: 'تجهيز المظهر',
        shopCatSkins: ' سكنات المركبة',
        shopCatWeapons: ' طلاءات الأسلحة',
        shopCatTrails: ' مسارات المحركات',
        shopCatAbilities: ' تأثيرات القدرات',
        perksTitle: ' منظومة البيركات التلقائية (Auto-Progression Perks)',
        perksDesc: 'تتطور البيركات المجهزة تلقائياً داخل المعركة مع كل موجة ينجو منها العميل:',
        missionsTitle: ' سجل المهمات والعقود التكتيكية الموحد',
        missionsDesc: 'أكمل التحديات القتالية والعقود لكسب مكعبات الكريستال ونقاط الخبرة (XP):',
        achievementsTitle: 'PTS الإنجازات التكتيكية الدائمة',
        contractsTitle: ' العقود والمهمات القتالية',
        settingsTitle: ' مركز الإعدادات وتخصيص التحكم والرسوميات',
        currentLangLabel: 'لغة الواجهة الحالية:',
        settingsJoyGroup: ' التحكم وحساسية اللمس',
        joySensLabel: 'حساسية الجويستك (Joystick Sens):',
        aimAssistLabel: 'مساعد التصويب (Aim Assist):',
        floatingJoyLabel: 'الجويستيك العائم (Dynamic Joystick):',
        pauseAimAssist: 'مساعد التصويب للموبايل',
        pauseFloatingJoy: 'الجويستيك العائم للموبايل',
        masterVolLabel: 'مستوى الصوت العام (Master Volume):',
        settingsGraphicsGroup: ' الرسوميات وتحسين الأداء (Performance)',
        lowEndLabel: 'وضع الأجهزة الضعيفة (Low-End Mode):',
        bloomLabel: 'تأثير التوهج النيوني (Bloom/Glow):',
        shakeLabel: 'اهتزاز الشاشة عند الضربات (Screen Shake):',
        refreshRateLabel: 'تردد الإطارات (Refresh Rate):',
        showFpsLabel: 'إظهار عداد الإطارات (FPS Tag):',
        disabled: 'معطل',
        enabled: 'مفعل',
        keybindingsTitle: ' أزرار التحكم للحاسب (PC Keybindings)',
        customRoomHeader: ' الغرف المخصصة وسيرفرات الفرق (Custom Lobbies)',
        crTabCreate: 'إنشاء غرفة جديدة ',
        crTabJoin: 'انضمام بكود الغرفة ',
        crModeLabel: 'نمط المعركة في الغرفة:',
        crMaxPlayersLabel: 'الحد الأقصى للاعبين:',
        crAnomalyLabel: 'كثافة الظواهر والانجرافات الزمنية:',
        crPinLabel: 'رمز PIN السري للغرفة (اختياري للخصوصية):',
        crCreateActionBtn: ' إنشاء وتدشين الغرفة الآن',
        crCodeInputLabel: 'كود الغرفة المكون من 6 خانات (Room Code):',
        crJoinPinLabel: 'رمز PIN السري (إذا كانت الغرفة خاصة):',
        crJoinActionBtn: ' انضمام للغرفة والمعركة',
        lobbySquadTitle: ' تشكيلة الفريق وأعضاء الغرفة',
        lobbyWelcomeMsg: 'مرحباً بك في الغرفة! استعدوا للانطلاق في المعركة.',
        sendBtn: 'إرسال',
        readyToggleBtn: ' أنا جاهز (Ready)',
        startMatchBtn: ' بدء المعركة (Host Launch)',
        leaveRoomBtn: 'مغادرة الغرفة',
        perkModalTitle: 'ترقية تكتيكية للجولة',
        perkModalSubtitle: 'تم تطهير الموجة بنجاح! اختر ترقية نوعية لعتادك القتالي:',
        relicModalTitle: ' أثر أسطوري للزعيم ',
        relicModalSubtitle: 'سقط الزعيم! اختر غنيمة أسطورية فائقة التردد:',
        pauseTitle: 'اللعبة متوقفة',
        pauseSubtitle: 'الزمن متجمد مؤقتاً في الساحة السيبرانية.',
        resumeBtn: '1. مواصلة اللعب (Resume)',
        settingsBtn: '2. الإعدادات (Settings)',
        quitToMenuBtn: '3. العودة للقائمة الرئيسية',
        quickSettings: 'الإعدادات السريعة',
        tacticalMapTitle: 'مصفوفة الرادار التكتيكي (Tactical Sector Map)',
        contractsActive: ' التحديات والعقود النشطة',
        leaderboardPanelTitle: ' المتصدرون والتحليل القتالي',
        equippedPerksDock: ' البيركات والآثار التكتيكية المجهزة:',
        controlsBarHelp: ' دليل التحكم: WASD: حركة | الفأرة: تصويب وإطلاق | Tab: لوحة المعركة | V: إشارات | 1/2: أسلحة | M: خريطة',
        fallenTitle: 'سقطت في الساحة!',
        eliminatedBy: 'تم القضاء عليك بواسطة:',
        respawnShieldHint: ' ستنال درع حصانة لمدة 3 ثوانٍ فور إعادة النشر!',
        respawnNowBtn: 'نشر فوري الآن ',
        destroyedTitle: 'تم تدميرك',
        highestWave: 'أعلى موجة وصلت لها:',
        survivalTime: 'زمن الصمود الكلي:',
        xpEarned: 'الخبرة المكتسبة (XP):',
        totalCubes: 'الرصيد الكلي من الكريستال:',
        roundCubes: 'المكعبات المجمعة في الجولة:',
        telemetryTitle: ' التحليل القتالي للجولة (Telemetry)',
        telParries: 'عمليات الصد الفوري (Parry):',
        telGrazes: 'المراوغات الملاصقة (Graze):',
        telSubkills: 'ضحايا الأسلحة المساندة:',
        telUlts: 'القدرات المطلقة المنفذة:',
        returnToMainMenuBtn: 'القائمة الرئيسية',
        announcementBadge: ' بث القيادة العليا (Server Broadcast)',
        giftTitle: 'هدية خاصة من المطور (Gift Received!)',
        cloudModalTitle: ' الحساب السحابي والمزامنة (Cloud Profile)',
        cloudModalDesc: 'سجّل دخولك أو أنشئ حسابك لحفظ الرصيد الموحد والمظاهر والمستوى سحابياً ومجاناً:',
        agentUsernameLabel: 'اسم العميل (Agent Username):',
        agentPinLabel: 'رمز الحساب السري (4-8 PIN):',
        cloudLoginBtn: 'دخول / تسجيل سحابي ',
        cancelBtn: 'إلغاء',
        radialArsenalTitle: 'ترسانة العتاد',
        radialArsenalSub: 'اختر السلاح',
        rankModalTitle: 'PTS دوري أبطال الساحة (Apex Global League)',
        tierBronzeTag: ' برونزي (0+)',
        tierSilverTag: ' فضي (500+)',
        tierGoldTag: ' ذهبي (1000+)',
        tierDiamondTag: ' دياموند (2000+)',
        tierMasterTag: ' غراند ماستر (3500+)',
        rankThRank: 'الترتيب',
        rankThAgent: 'العميل',
        rankThTier: 'الرتبة',
        rankThTrophies: 'الكؤوس PTS',
        rankThPvpKills: 'قتلات PVP',
        rankThPveRevives: 'إنعاش PVE',
        rankLoading: 'جاري جلب إحصائيات الأبطال...',
        closeAndContinueBtn: 'إغلاق ومتابعة القتال',
        podiumTitle: ' منصة تتويج المعركة (MATCH PODIUM)',
        podiumSub: 'ساحة الأبطال // نصر ساحق',
        continueBtn: 'متابعة',
        hudDash: 'DASH',
        hudReady: 'جاهز',
        hudSprint: 'SPRINT',
        hudSmoke: 'دخان',
        hudReload: 'RELOAD',
        stealthActive: ' وضع التخفي مفعّل (Stealth Active)',
        bountyTitle: 'الهدف الملكي المطلوب (APEX BOUNTY TARGET)',
        streakLabel: 'سلسلة:',
        downedTitle: 'استغاثة: زميلك سقط في المعركة!',
        downedNeedsRevive: 'بحاجة لإنعاش فوري',
        secSuffix: 'ث',
        wheelTitle: 'تواصل تكتيكي',
        wheelShortcut: '[V] للفتح',
        pingAttack: 'هجوم',
        pingDefend: 'دعم',
        pingGroup: 'تجمع',
        pingGG: 'كفو',
        pingHype: 'حماس',
        pingSmash: 'سحق',
        spectatorMode: ' نمط المشاهدة الحية',
        agentsSuffix: 'عملاء',
        sbRank: 'الترتيب',
        sbAgent: 'العميل',
        sbClass: 'الكلاس',
        sbKills: 'قتلات ',
        sbDeaths: 'وفيات ',
        sbRevives: 'إنعاش ',
        sbScore: 'النقاط PTS',
        sbPing: 'الـ Ping ',
        sbHint: 'اضغط [Tab] للإغلاق • خادم الزمن الفائق 20Hz',
        hazardWarning: ' تحذير: نشاط بيئي غير مستقر في الساحة ',
        bossWarning: ' تحذير: اقتراب الزعيم ',
        legendYou: 'أنت',
        legendEnemies: 'أعداء',
        legendBoss: 'زعيم',
        legendOasis: 'واحة',
        legendPortals: 'بوابات',
        legendCrystal: 'كريستال'
    },
    en: {
            gameTitle: 'Chrono Drift', rotatePhoneTitle: 'Please Rotate Device to Landscape', rotatePhoneDesc: 'For the optimal full-screen tactical combat experience',
        gameTitlePrimary: 'CHRONO DRIFT',
        gameTitleSub: 'الانجراف الزمني',
        onlineAgentsLabel: 'Connected Agents:',
        agentLevelLabel: 'Agent Level:',
        xpLabel: 'Experience (XP):',
        tacticalUsernameLabel: ' Tactical Username:',
        usernamePlaceholder: 'Enter your callsign...',
        readyForBattle: 'Ready for Battle',
        tabPlay: 'Arena & Modes',
        tabArsenal: 'Arsenal & Classes',
        tabShop: 'Shop & Vault ',
        tabPerks: 'Auto Perks',
        tabMissions: 'Missions & Bounties',
        tabSettings: 'Settings & Controls',
        btnRank: 'Rank',
        btnAccount: 'Profile',
        btnLeaderboard: 'PTS Leaderboard',
        menuDescTxt: 'Select your tactical combat mode to launch into the cybernetic arena:',
        modeSoloTitle: 'Solo Offline',
        modeSoloDesc: 'Single-player survival mode with dynamic time-dilation mechanics.',
        modeBossRushTitle: 'Boss Rush',
        modeBossRushDesc: 'Immediate consecutive battles against hyper-advanced AI bosses.',
        modeCoopTitle: 'Online Co-Op (PvE)',
        modeCoopDesc: 'Squad up with other agents and eliminate infinite enemy swarms.',
        modePvPTitle: 'Arena PvP Warzone',
        modePvPDesc: 'Direct combat against real players! Survival of the fastest and sharpest.',
        modeBossRaidTitle: 'Quantum Boss Raid',
        modeBossRaidDesc: 'Epic multi-agent raid against colossal space titans with shared boss health.',
        modeFreeRoamTitle: 'Free Roam Sandbox',
        modeFreeRoamDesc: 'Open sandbox to test ships, drift mechanics, and duel friends freely.',
        modeCustomTitle: 'Custom Room & Squad',
        modeCustomDesc: 'Create private or public rooms with custom rules, codes, and friends!',
        arsenalHeader: ' Combat Loadout & 3D Hangar Matrix',
        classAssault: 'Assault',
        classSniper: 'Sniper',
        classSupport: 'Support',
        classEngineer: 'Engineer',
        wepPrimaryLabel: ' Primary:',
        wepSecondaryLabel: ' Secondary:',
        equippedBtn: 'Equipped [OK]',
        selectClassBtn: 'Select Class',
        weaponPickerTitle: ' Primary Weapon Arsenal',
        shopTitle: ' Cybernetic Customization Vault',
        availableBalance: 'Available Balance:',
        equipCosmeticBtn: 'Equip Cosmetic',
        shopCatSkins: ' Ship Skins',
        shopCatWeapons: ' Weapon Wraps',
        shopCatTrails: ' Engine Trails',
        shopCatAbilities: ' Ability FX',
        perksTitle: ' Auto-Progression Perks Matrix',
        perksDesc: 'Equipped perks evolve automatically during combat with every wave survived:',
        missionsTitle: ' Tactical Mission Log & Contracts',
        missionsDesc: 'Complete combat challenges and contracts to earn Meta-Cubes and XP:',
        achievementsTitle: 'PTS Lifetime Tactical Achievements',
        contractsTitle: ' Combat Contracts & Bounties',
        settingsTitle: ' Settings Center & Controls Customization',
        currentLangLabel: 'Interface Language:',
        settingsJoyGroup: ' Controls & Touch Sensitivity',
        joySensLabel: 'Joystick Sensitivity:',
        aimAssistLabel: 'Mobile Aim Assist:',
        floatingJoyLabel: 'Dynamic Floating Joystick:',
        pauseAimAssist: 'Mobile Aim Assist',
        pauseFloatingJoy: 'Dynamic Floating Joystick',
        masterVolLabel: 'Master Audio Volume:',
        settingsGraphicsGroup: ' Graphics & Performance',
        lowEndLabel: 'Low-End Device Mode:',
        bloomLabel: 'Neon Bloom / Glow:',
        shakeLabel: 'Hit Screen Shake:',
        refreshRateLabel: 'Refresh Rate Target:',
        showFpsLabel: 'Show FPS Counter:',
        disabled: 'Disabled',
        enabled: 'Enabled',
        keybindingsTitle: ' PC Keybindings',
        customRoomHeader: ' Custom Squad Lobbies & Dedicated Rooms',
        crTabCreate: 'Create Room ',
        crTabJoin: 'Join by Code ',
        crModeLabel: 'Battle Game Mode:',
        crMaxPlayersLabel: 'Max Player Capacity:',
        crAnomalyLabel: 'Time Anomaly Density:',
        crPinLabel: 'Room PIN (Optional for Privacy):',
        crCreateActionBtn: ' Launch & Create Room',
        crCodeInputLabel: '6-Character Room Code:',
        crJoinPinLabel: 'Room PIN (If Private):',
        crJoinActionBtn: ' Join Room Battle',
        lobbySquadTitle: ' Squad Roster & Room Members',
        lobbyWelcomeMsg: 'Welcome to the squad lobby! Get ready for launch.',
        sendBtn: 'Send',
        readyToggleBtn: ' Ready Up',
        startMatchBtn: ' Launch Match (Host)',
        leaveRoomBtn: 'Leave Room',
        perkModalTitle: 'Tactical Round Upgrade',
        perkModalSubtitle: 'Wave cleared! Select a qualitative combat upgrade:',
        relicModalTitle: ' Legendary Boss Relic ',
        relicModalSubtitle: 'Boss defeated! Claim an ultra-frequency relic:',
        pauseTitle: 'Game Paused',
        pauseSubtitle: 'Time is temporarily frozen in the cyber arena.',
        resumeBtn: '1. Resume Game',
        settingsBtn: '2. Settings',
        quitToMenuBtn: '3. Quit to Main Menu',
        quickSettings: 'Quick Settings',
        tacticalMapTitle: 'Tactical Sector Radar Map',
        contractsActive: ' Active Contracts & Bounties',
        leaderboardPanelTitle: ' Combat Telemetry & Leaders',
        equippedPerksDock: ' Equipped Tactical Perks & Relics:',
        controlsBarHelp: ' Controls: WASD: Move | Mouse: Aim/Shoot | Tab: Scoreboard | V: Pings | 1/2: Weapons | M: Map',
        fallenTitle: 'Fallen in Combat!',
        eliminatedBy: 'Eliminated by:',
        respawnShieldHint: ' You will receive 3s invulnerability upon redeployment!',
        respawnNowBtn: 'Instant Deploy ',
        destroyedTitle: 'Vessel Destroyed',
        highestWave: 'Highest Wave Reached:',
        survivalTime: 'Total Survival Time:',
        xpEarned: 'XP Earned:',
        totalCubes: 'Total Meta-Cubes Balance:',
        roundCubes: 'Cubes Collected in Round:',
        telemetryTitle: ' Combat Telemetry Analysis',
        telParries: 'Active Parries:',
        telGrazes: 'Graze Adrenaline Surges:',
        telSubkills: 'Support Weapon Eliminations:',
        telUlts: 'Ultimate Abilities Deployed:',
        returnToMainMenuBtn: 'Main Menu',
        announcementBadge: ' High Command Broadcast',
        giftTitle: 'Special Developer Gift Received!',
        cloudModalTitle: ' Cloud Account & Sync Profile',
        cloudModalDesc: 'Sign in or register to save your credits, cosmetics, and level safely in the cloud:',
        agentUsernameLabel: 'Agent Username:',
        agentPinLabel: 'Secret PIN (4-8 digits):',
        cloudLoginBtn: 'Cloud Sign In / Register ',
        cancelBtn: 'Cancel',
        radialArsenalTitle: 'Combat Arsenal',
        radialArsenalSub: 'Select Weapon',
        rankModalTitle: 'PTS Apex Global League Championship',
        tierBronzeTag: ' Bronze (0+)',
        tierSilverTag: ' Silver (500+)',
        tierGoldTag: ' Gold (1000+)',
        tierDiamondTag: ' Diamond (2000+)',
        tierMasterTag: ' Grandmaster (3500+)',
        rankThRank: 'Rank',
        rankThAgent: 'Agent',
        rankThTier: 'Tier',
        rankThTrophies: 'Trophies PTS',
        rankThPvpKills: 'PvP Kills',
        rankThPveRevives: 'PvE Revives',
        rankLoading: 'Fetching champion telemetry...',
        closeAndContinueBtn: 'Close & Continue',
        podiumTitle: ' MATCH VICTORY PODIUM',
        podiumSub: 'Arena of Champions // Decisive Victory',
        continueBtn: 'Continue',
        hudDash: 'DASH',
        hudReady: 'READY',
        hudSprint: 'SPRINT',
        hudSmoke: 'SMOKE',
        hudReload: 'RELOAD',
        stealthActive: ' Stealth Active',
        bountyTitle: 'APEX BOUNTY TARGET',
        streakLabel: 'Streak:',
        downedTitle: 'Distress: Ally Down in Combat!',
        downedNeedsRevive: 'Needs Immediate Revive',
        secSuffix: 's',
        wheelTitle: 'Tactical Comms',
        wheelShortcut: '[V] to Open',
        pingAttack: 'Attack',
        pingDefend: 'Defend',
        pingGroup: 'Regroup',
        pingGG: 'Nice!',
        pingHype: 'Hyped',
        pingSmash: 'Smash',
        spectatorMode: ' SPECTATOR MODE',
        agentsSuffix: 'Agents',
        sbRank: 'Rank',
        sbAgent: 'Agent',
        sbClass: 'Class',
        sbKills: 'Kills ',
        sbDeaths: 'Deaths ',
        sbRevives: 'Revives ',
        sbScore: 'Score PTS',
        sbPing: 'Ping ',
        sbHint: 'Hold [Tab] to View • Authoritative 20Hz Engine',
        hazardWarning: ' Warning: Unstable Environmental Hazard ',
        bossWarning: ' Warning: Colossal Boss Approaching ',
        legendYou: 'You',
        legendEnemies: 'Enemies',
        legendBoss: 'Boss',
        legendOasis: 'Oasis',
        legendPortals: 'Portals',
        legendCrystal: 'Crystal'
    }
};

let currentLanguage = localStorage.getItem('chrono_drift_lang') || 'ar';

function t(key, fallback) {
    const langObj = I18N_DICTIONARY[currentLanguage] || I18N_DICTIONARY.ar;
    return langObj[key] || fallback || key;
}

function setAppLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') lang = 'ar';
    currentLanguage = lang;
    localStorage.setItem('chrono_drift_lang', lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar' ? 'rtl' : 'ltr');

    // Title branding
    const titlePrimary = document.getElementById('game-title-primary');
    const titleSub = document.getElementById('game-title-sub');
    if (titlePrimary) titlePrimary.innerText = (lang === 'ar' ? 'الانجراف الزمني' : 'CHRONO DRIFT');
    if (titleSub) titleSub.innerText = (lang === 'ar' ? 'CHRONO DRIFT' : 'الانجراف الزمني');

    document.title = (lang === 'ar' ? 'الانجراف الزمني' : 'Chrono Drift');

    // Badge indicator in header
    const langBadge = document.getElementById('lang-badge-txt');
    if (langBadge) langBadge.innerText = (lang === 'ar' ? 'EN' : 'AR');

    // Update settings buttons active state
    const btnAr = document.getElementById('btn-lang-ar');
    const btnEn = document.getElementById('btn-lang-en');
    const pBtnAr = document.getElementById('p-btn-lang-ar');
    const pBtnEn = document.getElementById('p-btn-lang-en');
    if (btnAr) btnAr.className = 'toggle-btn' + (lang === 'ar' ? ' active' : '');
    if (btnEn) btnEn.className = 'toggle-btn' + (lang === 'en' ? ' active' : '');
    if (pBtnAr) pBtnAr.className = 'toggle-btn' + (lang === 'ar' ? ' active' : '');
    if (pBtnEn) pBtnEn.className = 'toggle-btn' + (lang === 'en' ? ' active' : '');

    // Translate all static DOM elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && (I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key])) {
            el.innerText = I18N_DICTIONARY[lang][key];
        }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key && (I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key])) {
            el.setAttribute('placeholder', I18N_DICTIONARY[lang][key]);
        }
    });

    // Refresh dynamic views if functions exist
    if (typeof updateArsenalUI === 'function') updateArsenalUI();
    if (typeof updatePlayerRankCardUI === 'function') updatePlayerRankCardUI();
}

window.setAppLanguage = setAppLanguage;
window.toggleLanguage = function() {
    setAppLanguage(currentLanguage === 'ar' ? 'en' : 'ar');
};

// ===================================================================
// MULTIPLAYER CUSTOM ROOMS, TIME ANOMALIES & SPECTATOR SYSTEM
// ===================================================================
let activeCustomRoom = null; // { roomId, roomCode, mode, isHost, players }
let activeTimeAnomalies = [];
let isTabScoreboardOpen = false;
let spectatorTargetIndex = 0;
let isSpectating = false;

window.openCustomRoomModal = function() {
    const modal = document.getElementById('custom-room-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeCustomRoomModal = function() {
    const modal = document.getElementById('custom-room-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.switchCustomRoomTab = function(tab) {
    const createBtn = document.getElementById('cr-tab-create-btn');
    const joinBtn = document.getElementById('cr-tab-join-btn');
    const createView = document.getElementById('cr-view-create');
    const joinView = document.getElementById('cr-view-join');

    if (tab === 'create') {
        if (createBtn) createBtn.classList.add('active');
        if (joinBtn) joinBtn.classList.remove('active');
        if (createView) createView.style.display = 'block';
        if (joinView) joinView.style.display = 'none';
    } else {
        if (joinBtn) joinBtn.classList.add('active');
        if (createBtn) createBtn.classList.remove('active');
        if (joinView) joinView.style.display = 'block';
        if (createView) createView.style.display = 'none';
    }
};

window.executeCreateCustomRoom = function() {
    const modeSelect = document.getElementById('cr-mode-select');
    const maxPlayersSelect = document.getElementById('cr-max-players');
    const anomalySelect = document.getElementById('cr-anomaly-density');
    const pinInput = document.getElementById('cr-pin-input');

    const mode = modeSelect ? modeSelect.value : 'online_coop';
    const maxPlayers = maxPlayersSelect ? maxPlayersSelect.value : 8;
    const anomalyDensity = anomalySelect ? anomalySelect.value : 'normal';
    const pin = pinInput ? pinInput.value.trim() : '';

    initMultiplayerSocket(true);

    if (socket) {
        socket.emit('create_custom_room', {
            mode: mode,
            maxPlayers: maxPlayers,
            anomalyDensity: anomalyDensity,
            pin: pin
        });
    }
};

window.executeJoinCustomRoomByCode = function() {
    const codeInput = document.getElementById('cr-join-code-input');
    const pinInput = document.getElementById('cr-join-pin-input');
    const errorTag = document.getElementById('cr-join-error-msg');

    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!code) {
        if (errorTag) { errorTag.innerText = ' يرجى إدخال كود الغرفة!'; errorTag.style.color = '#ff0055'; }
        return;
    }

    initMultiplayerSocket(true);

    if (socket) {
        socket.emit('join_custom_room_by_code', {
            code: code,
            pin: pin
        });
    }
};

window.copyLobbyRoomCode = function() {
    if (!activeCustomRoom || !activeCustomRoom.roomCode) return;
    navigator.clipboard.writeText(activeCustomRoom.roomCode).then(() => {
        alert(`[OK] تم نسخ كود الغرفة (${activeCustomRoom.roomCode}) بنجاح! شاركه مع أصدقائك.`);
    }).catch(() => {
        prompt('انسخ كود الغرفة:', activeCustomRoom.roomCode);
    });
};

window.toggleLobbyReadyStatus = function() {
    if (socket && isSocketConnected) {
        socket.emit('toggle_lobby_ready');
    }
};

window.hostLaunchCustomMatch = function() {
    if (socket && isSocketConnected && activeCustomRoom && activeCustomRoom.isHost) {
        socket.emit('host_start_custom_match');
    }
};

window.leaveCustomLobbyRoom = function() {
    const lobbyModal = document.getElementById('custom-lobby-modal');
    if (lobbyModal) {
        lobbyModal.classList.add('hidden');
        lobbyModal.style.display = 'none';
    }
    activeCustomRoom = null;
    if (socket && isSocketConnected) {
        socket.disconnect();
        initMultiplayerSocket(true);
    }
};

window.sendLobbyChatMessage = function() {
    const input = document.getElementById('lobby-chat-input');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';

    if (socket && isSocketConnected) {
        socket.emit('send_lobby_chat', { message: msg });
    }
};

// Tactical Scoreboard Toggle
window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') {
        e.preventDefault();
        const sbModal = document.getElementById('tab-scoreboard-modal');
        if (sbModal) {
            isTabScoreboardOpen = true;
            sbModal.classList.remove('hidden');
            sbModal.style.display = 'flex';
            renderTabScoreboard();
        }
    }
    if (e.code === 'KeyV' && !isModalActive && !isGameOver && player) {
        toggleTacticalPingWheel();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Tab') {
        const sbModal = document.getElementById('tab-scoreboard-modal');
        if (sbModal) {
            isTabScoreboardOpen = false;
            sbModal.classList.add('hidden');
            sbModal.style.display = 'none';
        }
    }
});

function renderTabScoreboard() {
    const tbody = document.getElementById('sb-table-body');
    if (!tbody) return;

    let playersList = [];
    if (player) {
        playersList.push({
            id: socket ? socket.id : 'local',
            username: tacticalUsername || 'Apex_Agent',
            chassis: selectedChassis || 'assault',
            kills: playerKillsInRound || 0,
            deaths: 0,
            revives: 0,
            score: Math.round(gameScore || 0),
            ping: currentClientPing || 20,
            isLocal: true
        });
    }

    if (remotePlayers && remotePlayers.size > 0) {
        remotePlayers.forEach(rp => {
            playersList.push({
                id: rp.id,
                username: rp.username || 'Agent',
                chassis: rp.chassis || 'assault',
                kills: rp.kills || 0,
                deaths: rp.deaths || 0,
                revives: rp.revives || 0,
                score: rp.score || 0,
                ping: rp.ping || 24,
                isLocal: false
            });
        });
    }

    playersList.sort((a, b) => (b.score + b.kills * 100) - (a.score + a.kills * 100));

    let html = '';
    playersList.forEach((p, idx) => {
        const pingClass = p.ping < 60 ? 'ping-green' : (p.ping < 120 ? 'ping-yellow' : 'ping-red');
        html += `
            <tr class="${p.isLocal ? 'is-local-player' : ''}">
                <td><strong>#${idx + 1}</strong></td>
                <td><strong style="color: ${p.isLocal ? '#00f3ff' : '#ffffff'};">${escapeHtml(p.username)} ${p.isLocal ? '(أنت)' : ''}</strong></td>
                <td><span style="color:#00ff88; text-transform:uppercase; font-size:0.75rem;">${p.chassis}</span></td>
                <td><strong style="color:#ffd700;">${p.kills}</strong></td>
                <td>${p.deaths}</td>
                <td>${p.revives}</td>
                <td><strong style="color:#00f3ff;">${p.score}</strong></td>
                <td><span class="${pingClass}">${p.ping}ms</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    const countVal = document.getElementById('sb-count-val');
    if (countVal) countVal.innerText = playersList.length;
}

let currentClientPing = 20;
setInterval(() => {
    if (socket && isSocketConnected) {
        socket.emit('latency_ping', Date.now());
    }
}, 2500);

// Spectator Mode helpers
window.spectatorCycleNext = function() {
    const list = Array.from(remotePlayers.values()).filter(p => (p.hp || 100) > 0);
    if (list.length === 0) return;
    spectatorTargetIndex = (spectatorTargetIndex + 1) % list.length;
    updateSpectatorHUD(list[spectatorTargetIndex]);
};

window.spectatorCyclePrev = function() {
    const list = Array.from(remotePlayers.values()).filter(p => (p.hp || 100) > 0);
    if (list.length === 0) return;
    spectatorTargetIndex = (spectatorTargetIndex - 1 + list.length) % list.length;
    updateSpectatorHUD(list[spectatorTargetIndex]);
};

function updateSpectatorHUD(targetPlayer) {
    const overlay = document.getElementById('spectator-hud-overlay');
    const nameEl = document.getElementById('spectator-target-name');
    if (!overlay || !targetPlayer) return;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    if (nameEl) nameEl.innerText = targetPlayer.username || 'Agent';
}


const tacticalMapModal = document.getElementById('tactical-map-modal');
        const expandedMapCanvas = document.getElementById('expandedMapCanvas');
        const expandedMapCtx = expandedMapCanvas ? expandedMapCanvas.getContext('2d') : null;
        const mapContractsContainer = document.getElementById('map-contracts-container');
        const mapLeaderboardContainer = document.getElementById('map-leaderboard-container');
        const mapActivePerksContainer = document.getElementById('map-active-perks-container');
        const mapWaveInfo = document.getElementById('map-wave-info');
        const mapPlayerCoords = document.getElementById('map-player-coords');
        const swapBtnIcon = document.getElementById('swap-btn-icon');
        let isTacticalMapOpen = false;
        let tacticalZones = [];

        const joystickBase = document.getElementById('joystick-base');
        const joystickThumb = document.getElementById('joystick-thumb');
        const joystickAimBase = document.getElementById('joystick-aim-base');
        const joystickAimThumb = document.getElementById('joystick-aim-thumb');
        const dashBtnHud = document.getElementById('dash-btn-hud');
        const reloadBtnHud = document.getElementById('reload-btn-hud');
        const superEmpBtnHud = document.getElementById('super-emp-btn-hud');
        
        const ultBtnHud = document.getElementById('ult-btn-hud');
        const dashBtnSub = document.getElementById('dash-btn-sub');
        const superEmpBtnSub = document.getElementById('super-emp-btn-sub');
        
        const ultBtnSub = document.getElementById('ult-btn-sub');

        const mainMenu = document.getElementById('main-menu');
        const pauseMenu = document.getElementById('pause-menu');
        const perkModal = document.getElementById('perk-modal');
        const perkCardsContainer = document.getElementById('perk-cards-container');
        const relicModal = document.getElementById('relic-modal');
        const relicCardsContainer = document.getElementById('relic-cards-container');
        const activePerksDock = document.getElementById('active-perks-dock');
        const bossWarningBanner = document.getElementById('boss-warning-banner');
        const hazardWarningBanner = document.getElementById('hazard-warning-banner');
        const bossHudContainer = document.getElementById('boss-hud-container');
        const bossNameLabel = document.getElementById('boss-name-label');
        const bossHpBar = document.getElementById('boss-hp-bar');
        const bossStaggerBar = document.getElementById('boss-stagger-bar');
        const cleanWaveDisplay = document.getElementById('clean-wave-display');
        const fpsHudTag = document.getElementById('fps-hud-tag');
        const hudInstructions = document.getElementById('hud-instructions');
        const bountyBanner = document.getElementById('bounty-banner');
        const gameOverScreen = document.getElementById('game-over-screen');
        const uiFinalWave = document.getElementById('final-wave-val');
        const uiFinalScore = document.getElementById('final-score-val');
        const uiFinalXp = document.getElementById('final-xp-val');
        const uiTotalMeta = document.getElementById('total-meta-cubes-val');
        const uiFinalCubes = document.getElementById('final-cubes-val');
        const classSkillBtnHud = document.getElementById('class-skill-btn-hud');
        const classSkillBtnTxt = document.getElementById('class-skill-btn-txt');
        const classSkillBtnSub = document.getElementById('class-skill-btn-sub');
        const classSkill2BtnHud = document.getElementById('class-skill2-btn-hud');
        const classSkill2BtnTxt = document.getElementById('class-skill2-btn-txt');
        const classSkill2BtnSub = document.getElementById('class-skill2-btn-sub');
        const swapWeaponBtnHud = document.getElementById('swap-weapon-btn-hud');
        const swapBtnTxt = document.getElementById('swap-btn-txt');
        const swapBtnSub = document.getElementById('swap-btn-sub');
        const stealthIndicatorTag = document.getElementById('stealth-indicator-tag');
        const empFlash = document.getElementById('emp-flash');
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let player = null;
        let enemies = [], bullets = [], bulletPool = [], playerBullets = [], playerBulletPool = [];
        let enemyTimeBubbles = []; 
        let mortarWarnings = []; 
        let toxicPools = [];
        const RICOCHET_MAX_ACTIVE = 7;      // أقصى عدد طلقات ترتد في نفس الوقت
        const RICOCHET_LIFESPAN_MS = 5000;  // مدة بقاء الطلقة الارتدادية قبل اختفائها
        let activeRicochetCount = 0;        // عداد الطلقات الارتدادية الحالية
        let particles = [], particlePool = [], floatingTexts = [], floatingTextPool = [];
        let energyCubes = [], goldenCubes = [], activeTacticalZone = null, portals = [];
        let playerMines = [], playerMinePool = [];
        let smokeClouds = [];
        let playerTurrets = [];
        let isReconActive = false;
        let reconTimer = 0;
        let teslaRenderArcs = [], arenaLaserWalls = [], temporalRifts = [], shockwaves = [], shockwavePool = [];

        const SAVE_VERSION = '_v75_overhaul';
        let metaCurrency = parseInt(localStorage.getItem('chrono_meta_currency' + SAVE_VERSION)) || 0;
        let playerXP = parseInt(localStorage.getItem('chrono_player_xp' + SAVE_VERSION)) || 0;
        let playerLevel = parseInt(localStorage.getItem('chrono_player_level' + SAVE_VERSION)) || 1;
        let highestWaveRecord = parseInt(localStorage.getItem('chrono_highest_wave' + SAVE_VERSION)) || 1;
        let metaUpgrades = JSON.parse(localStorage.getItem('chrono_meta_upgrades' + SAVE_VERSION)) || { 
            dash: 0, shield: 0, ultGain: 0, magnet: 0, damage: 0
        };
        let unlockedItems = JSON.parse(localStorage.getItem('chrono_unlocked_items' + SAVE_VERSION)) || {
            weapons: { blaster: true, shotgun: false, rapid: false, railgun: false },
            attachments: { none: true, heavy: false, thermal: false, magnet: false },
            loadouts: { shield: true, emp: false, agile: false }
        };
        let weaponLevels = JSON.parse(localStorage.getItem('chrono_weapon_levels' + SAVE_VERSION)) || {
            blaster: 1, shotgun: 1, rapid: 1, railgun: 1
        };

        // مصفوفة البيركات التكتيكية النشطة (3 مجهزة فقط) وتطويراتها الثلاثية
        let equippedPerks = JSON.parse(localStorage.getItem('chrono_equipped_perks' + SAVE_VERSION)) || ['shield_core', 'hyper_fire', 'chrono_drift'];
        let perkLevels = JSON.parse(localStorage.getItem('chrono_perk_levels' + SAVE_VERSION)) || {
            shield_core: 1, evo_plasma: 1, evo_frost: 1, sub_drone: 1, sub_tesla: 1, sub_mines: 1,
            hyper_fire: 1, kinetic_blast: 1, chrono_drift: 1, vampiric_siphon: 1, ricochet_flak: 1, orbital_crest: 1
        };

        const CLASS_EXCLUSIVE_WEAPONS = {
            assault: { id: 'blaster', name: 'البندقية الهجومية (AR)', role: 'بندقية هجومية متوازنة وعالية الدقة' },
            sniper: { id: 'railgun', name: 'قناصة البلازما (Sniper)', role: 'قناصة طاقة خارقة وثاقبة للمدى البعيد' },
            support: { id: 'lmg', name: 'الرشاش الثقيل (LMG)', role: 'رشاش ثقيل بسعة مخزن ضخمة وقمع نيراني مستمر' },
            engineer: { id: 'rapid', name: 'الرشاش الخفيف (SMG)', role: 'رشاش خفيف سريع جداً للمناورات والمدى القريب' }
        };

        let selectedClass = localStorage.getItem('chrono_selected_class' + SAVE_VERSION) || 'assault';
        let selectedChassis = selectedClass;
        let classWeapons = JSON.parse(localStorage.getItem('chrono_class_weapons' + SAVE_VERSION)) || {
            assault: 'blaster',
            sniper: 'railgun',
            support: 'lmg',
            engineer: 'rapid'
        };
        let selectedWeapon = classWeapons[selectedClass] || CLASS_EXCLUSIVE_WEAPONS[selectedClass].id;
        let selectedAttachment = 'none';
        let selectedLoadout = 'shield';
        let activeGameMode = 'offline'; // 'offline' | 'boss_rush' | 'online_pve' | 'online_pvp'

function isMultiplayerMode() {
    return activeGameMode && (activeGameMode.startsWith('online_') || activeGameMode.startsWith('custom_'));
}

function isPvPMode() {
    return activeGameMode === 'online_pvp';
}


        // متغيرات وحالة اللعب الجماعي وشبكة Socket.IO
        let socket = null;
        let isSocketConnected = false;
        let remotePlayers = new Map();
        let lastNetworkSyncTime = 0;
        let tacticalUsername = localStorage.getItem('chrono_tactical_username') || 'Apex_Agent_' + Math.floor(Math.random() * 899 + 100);
        let unlockedCosmeticSkins = new Set(JSON.parse(localStorage.getItem('chrono_skins' + SAVE_VERSION)) || ['default']);
        let ownedCosmeticSkins = Array.from(unlockedCosmeticSkins);
        let activeCosmeticSkin = 'default';
        let rawSettings = JSON.parse(localStorage.getItem('chrono_settings_v74')) || {};
        let gameSettings = {
            sound: rawSettings.sound !== undefined ? rawSettings.sound : true,
            shake: rawSettings.shake !== undefined ? rawSettings.shake : true,
            floating: rawSettings.floating !== undefined ? rawSettings.floating : true,
            highRefresh: rawSettings.highRefresh !== undefined ? rawSettings.highRefresh : true,
            showFps: rawSettings.showFps !== undefined ? rawSettings.showFps : false,
            lowEnd: rawSettings.lowEnd !== undefined ? rawSettings.lowEnd : false,
            bloom: rawSettings.bloom !== undefined ? rawSettings.bloom : true,
            haptic: rawSettings.haptic !== undefined ? rawSettings.haptic : true,
            aimAssist: rawSettings.aimAssist !== undefined ? rawSettings.aimAssist : true,
            floatingJoystick: rawSettings.floatingJoystick !== undefined ? rawSettings.floatingJoystick : true
        };

        let achievements = JSON.parse(localStorage.getItem('chrono_achievements' + SAVE_VERSION)) || {
            survivor: { title: "ناجي الزمن", desc: "اصمد لمدة 60 ثانية في جولة واحدة", unlocked: false, reward: 20 },
            brawler: { title: "صائد الأعداء", desc: "دمر 15 عدواً في جولة واحدة", unlocked: false, reward: 15 },
            collector: { title: "جامع الكريستال", desc: "اجمع 50 مكعب كريستال إجمالاً", unlocked: false, reward: 25 },
            waveMaster: { title: "قاهر الموجات", desc: "تغلب على الزعيم واصل للموجة 6", unlocked: false, reward: 30 },
            apexOverlord: { title: "سيد الأبعاد المطلق", desc: "تغلب على زعيم الموجة 20 بنجاح", unlocked: false, reward: 50 }
        };

        let contracts = JSON.parse(localStorage.getItem('chrono_contracts' + SAVE_VERSION)) || {
            c_survive: { title: "عقد البقاء", desc: "اصمد لمدة 45 ثانية في جولة واحدة", unlocked: false, reward: 15 },
            c_parry: { title: "عقد الصد الفوري", desc: "نفذ 3 عمليات Parry في جولة واحدة", unlocked: false, reward: 20 },
            c_energy: { title: "عقد طاقة النبض", desc: "اجمع 5 مكعبات طاقة في جولة واحدة", unlocked: false, reward: 10 }
        };

        // ====================================================================
        // مصفوفة الكلاسات الأربعة الموزونة بدقة (The 4 Balanced Classes)
        // ====================================================================
        const CLASSES_CONFIG = {
            assault: {
                id: 'assault',
                name: 'الهجومي (Assault)',
                title: 'المهاجم الخفيف والسريع',
                desc: 'خفيف وسريع، صحة/درع أقل، +10% ضرر. زر مهارة: ركض بسرعة مضاعفة (Adrenaline Sprint).',
                baseSpeed: 7.6,
                hp: 85,
                shieldCharges: 1,
                dmgMultiplier: 1.10,
                magMultiplier: 1.0,
                cooldownMultiplier: 1.0,
                visionMultiplier: 1.0,
                icon: '',
                color: '#00f3ff',
                skillName: 'SPRINT',
                skillKey: 'E',
                skillDesc: 'ركض بسرعة مضاعفة 2x',
                skillCooldown: 10000
            },
            support: {
                id: 'support',
                name: 'الدعم (Support)',
                title: 'الحصن الثقيل والممدد',
                desc: 'ثقيل وبطيء، صحة/درع أعلى، +10% سعة رصاص. زر مهارة: رمي سموك 5ث يخفي ويعالج، وزر إمداد ذخيرة.',
                baseSpeed: 5.2,
                hp: 130,
                shieldCharges: 3,
                dmgMultiplier: 1.0,
                magMultiplier: 1.10,
                cooldownMultiplier: 1.0,
                visionMultiplier: 1.0,
                icon: '',
                color: '#00ff88',
                skillName: 'SMOKE',
                skillKey: 'E',
                skillDesc: 'رمي سموك 5ث (تخفي وعلاج)',
                skillCooldown: 14000,
                skill2Name: 'AMMO+',
                skill2Key: 'C',
                skill2Desc: 'إمداد فوري للذخيرة والدرع',
                skill2Cooldown: 12000
            },
            engineer: {
                id: 'engineer',
                name: 'المهندس (Engineer)',
                title: 'المهندس التكتيكي المتوازن',
                desc: 'متوازن، +10% سرعة شحن معدات وقدرات. زر مهارة: نشر مدفع آلي (Turret) يطلق النار تلقائياً.',
                baseSpeed: 6.2,
                hp: 100,
                shieldCharges: 2,
                dmgMultiplier: 1.0,
                magMultiplier: 1.0,
                cooldownMultiplier: 0.90, // +10% faster cooldowns
                visionMultiplier: 1.0,
                icon: '',
                color: '#ffd700',
                skillName: 'TURRET',
                skillKey: 'E',
                skillDesc: 'نشر مدفع آلي دفاعي (12ث)',
                skillCooldown: 15000
            },
            sniper: {
                id: 'sniper',
                name: 'القناص (Sniper)',
                title: 'القناص الشبح والمستطلع',
                desc: 'سرعة متوسطة لمنع استغلال الركض، +10% مدى رؤية، أقل صحة/درع. ميزة تلقائية: التخفي عند الثبات لثانيتين. زر مهارة: كشف الأعداء.',
                baseSpeed: 5.8, // Strictly medium speed to eliminate speed running exploit
                hp: 75,
                shieldCharges: 1,
                dmgMultiplier: 1.0,
                magMultiplier: 1.0,
                cooldownMultiplier: 1.0,
                visionMultiplier: 1.10, // +10% vision
                icon: '',
                color: '#bd00ff',
                skillName: 'RECON',
                skillKey: 'E',
                skillDesc: 'كشف الأعداء ومضاعفة الضرر',
                skillCooldown: 14000,
                passiveName: 'Stealth',
                passiveDesc: 'تخفي تام عند الثبات لـ 2 ثانية'
            }
        };

        // مصفوفة الأسلحة المعتمدة الأساسية والمسدس الثانوي (Weapons Overhaul)
        const WEAPON_CONFIGS = {
            blaster: {
                id: 'blaster',
                name: 'البندقية النبضية (Blaster)',
                category: 'بندقية هجومية (Rifle)',
                type: 'balanced',
                baseDmg: 24,
                speed: 25,
                interval: 130,
                baseMag: 30,
                reloadTime: 1200,
                piercing: false,
                recoil: 1.2,
                pellets: 1,
                icon: '',
                color: '#00f3ff'
            },
            rapid: {
                id: 'rapid',
                name: 'الرشاش الخفيف (SMG)',
                category: 'رشاش خفيف (SMG)',
                type: 'rapid',
                baseDmg: 11,
                speed: 23,
                interval: 75,
                baseMag: 45,
                reloadTime: 1000,
                piercing: false,
                recoil: 0.7,
                pellets: 1,
                icon: '',
                color: '#00ff88'
            },
            lmg: {
                id: 'lmg',
                name: 'الرشاش الثقيل (LMG)',
                category: 'رشاش ثقيل (LMG)',
                type: 'heavy',
                baseDmg: 18,
                speed: 22,
                interval: 110,
                baseMag: 80,
                reloadTime: 2200,
                piercing: false,
                recoil: 1.8,
                pellets: 1,
                icon: '',
                color: '#ffaa00'
            },
            shotgun: {
                id: 'shotgun',
                name: 'شوتجان البلازما (Shotgun)',
                category: 'شوتجان (Shotgun)',
                type: 'heavy',
                baseDmg: 16,
                pellets: 6,
                speed: 19,
                interval: 480,
                baseMag: 8,
                reloadTime: 1600,
                piercing: false,
                recoil: 3.2,
                icon: '',
                color: '#ff5500'
            },
            railgun: {
                id: 'railgun',
                name: 'قناصة البلازما (Railgun)',
                category: 'قناصة (Sniper Rifle)',
                type: 'heavy',
                baseDmg: 120,
                speed: 38,
                interval: 700,
                baseMag: 5,
                reloadTime: 1800,
                piercing: true,
                recoil: 4.2,
                pellets: 1,
                icon: '',
                color: '#bd00ff'
            },
            secondary_pistol: {
                id: 'secondary_pistol',
                name: 'المسدس التكتيكي (Sidearm)',
                category: 'مسدس ثانوي (Pistol)',
                type: 'sidearm',
                baseDmg: 18,
                speed: 24,
                interval: 180,
                baseMag: 15,
                reloadTime: 900,
                piercing: false,
                recoil: 1.0,
                pellets: 1,
                icon: '',
                color: '#00f3ff'
            }
        };

        // ====================================================================
        // مصفوفة السكنات والمظاهر والأطقم المتناسقة الكاملة (Cosmetics & Matching Sets)
        // ====================================================================
        const COSMETICS_CATALOG = {
            skins: [
                { id: 'default', title: 'الهيكل الافتراضي (Standard)', desc: 'الهيكل السيبراني التكتيكي الأساسي المتوازن.', price: 0, icon: '', rarity: 'common', setId: 'default' },
                { id: 'skin_golden_striker', title: 'المهاجم الذهبي (Solid Gold)', desc: 'دروع مصقولة بذهب التيتانيوم الخالص عيار 24 مع بريق ملكي.', price: 100, icon: '', rarity: 'legendary', setId: 'skin_golden_striker' },
                { id: 'skin_glacial_spectre', title: 'طيف الصقيع (Glacial Spectre)', desc: 'هيكل ماسي كريستالي مع 3 شظايا جليد سابحة في فلكه.', price: 80, icon: '', rarity: 'epic', setId: 'skin_glacial_spectre' },
                { id: 'skin_obsidian_dragon', title: 'تنين الأوبسيديان (Obsidian Dragon)', desc: 'تيتانيوم أسود مصفح مع عيون حمراء وزخارف ياقوتية حارقة.', price: 200, icon: '', rarity: 'mythic', setId: 'skin_obsidian_dragon' },
                { id: 'skin_solar_phoenix', title: 'فينيق البلازما الشمسي (Solar Phoenix)', desc: 'طائر النار الشمسي بأجنحة لهب بلازما متموجة وطاقة حارقة.', price: 180, icon: '', rarity: 'mythic', setId: 'skin_solar_phoenix' },
                { id: 'skin_quantum_void', title: 'سيد الفراغ الكمي (Quantum Void)', desc: 'هيكل كمي أرجواني يولد ثقباً أسود مصغراً في مركزه.', price: 120, icon: '', rarity: 'legendary', setId: 'skin_quantum_void' },
                { id: 'skin_cyber_phantom', title: 'الشبح التكتيكي (Cyber Phantom)', desc: 'مقاتلة شبحية كربونية مع مسارات دارات كهربائية نيونية.', price: 65, icon: '', rarity: 'epic', setId: 'skin_cyber_phantom' },
                { id: 'skin_neon_berserker', title: 'الهائج النيوني (Neon Berserker)', desc: 'هيكل هجومي مجهز بشفرات نيونية حادة وطاقة قرمزية.', price: 45, icon: '', rarity: 'rare', setId: 'skin_neon_berserker' },
                { id: 'skin_apex_overlord', title: 'الإمبراطور السيبراني (Apex Overlord)', desc: 'هيكل حربي مذهب يعلوه تاج الطاقة الإمبراطوري.', price: 150, icon: '', rarity: 'legendary', setId: 'skin_apex_overlord' }
            ],
            weapons: [
                { id: 'wep_default', title: 'البلازما القياسية (Standard)', desc: 'مظهر الإطلاق الكهرومغناطيسي القياسي.', price: 0, icon: '', rarity: 'common', setId: 'default' },
                { id: 'wep_goldengun', title: 'السلاح الذهبي (Solid Gold)', desc: 'رصاص مذهب فخم يتلألأ بشعاع ذهبي خالص عيار 24.', price: 90, icon: 'CR', rarity: 'legendary', setId: 'skin_golden_striker' },
                { id: 'wep_frost_shard', title: 'شظايا الصقيع (Frost Shard)', desc: 'مقذوفات جليدية حادة تدمر وتبطئ الأعداء.', price: 60, icon: '', rarity: 'epic', setId: 'skin_glacial_spectre' },
                { id: 'wep_dragonfire', title: 'لهب التنين (Dragonfire)', desc: 'مقذوفات بلازما نارية شديدة الاشتعال بحبيبات حارقة.', price: 50, icon: '', rarity: 'rare', setId: 'skin_obsidian_dragon' },
                { id: 'wep_solar_flare', title: 'توهج الشمس (Solar Flare)', desc: 'مقذوفات بلازما شمسية نقية شديدة الحرارة.', price: 85, icon: '', rarity: 'mythic', setId: 'skin_solar_phoenix' },
                { id: 'wep_voidray', title: 'شعاع الفراغ (Void Ray)', desc: 'حزم ليزر بنفسجية نفاذة تخترق الأبعاد.', price: 75, icon: '', rarity: 'epic', setId: 'skin_quantum_void' },
                { id: 'wep_toxic_surge', title: 'الحمض السام (Toxic Surge)', desc: 'مقذوفات حمضية خضراء متوهجة تذيب دروع الأعداء.', price: 65, icon: '', rarity: 'epic', setId: 'skin_cyber_phantom' },
                { id: 'wep_neon_fury', title: 'غضب النيون (Neon Fury)', desc: 'مقذوفات قرمزية حادة تتوهج بنبضات النيون.', price: 40, icon: '', rarity: 'rare', setId: 'skin_neon_berserker' },
                { id: 'wep_plasma_comet', title: 'مذنب البلازما الكوني (Plasma Comet)', desc: 'مقذوفات نجمية متعددة الأطياف تشق الفضاء.', price: 110, icon: '', rarity: 'mythic', setId: 'skin_apex_overlord' }
            ],
            trails: [
                { id: 'trail_default', title: 'المسار الكلاسيكي (Cyan Stream)', desc: 'مسار نيون أزرق انسيابي وناعم.', price: 0, icon: '', rarity: 'common', setId: 'default' },
                { id: 'trail_golden', title: 'لهب الذهب (Golden Flame)', desc: 'انبعاثات جزيئات ذهبية متطايرة كنجوم ساطعة.', price: 45, icon: '', rarity: 'rare', setId: 'skin_golden_striker' },
                { id: 'trail_frost_mist', title: 'ضباب الصقيع (Frost Mist)', desc: 'مسار جليدي أزرق يترك سحابة بلورات ثلجية.', price: 50, icon: '', rarity: 'epic', setId: 'skin_glacial_spectre' },
                { id: 'trail_dragon_ember', title: 'جمرات التنين (Dragon Embers)', desc: 'شرارات نارية بركانية قرمزية متساقطة.', price: 60, icon: '', rarity: 'mythic', setId: 'skin_obsidian_dragon' },
                { id: 'trail_solar_flare', title: 'توهج الشمس (Solar Corona)', desc: 'شواظ شمسية ملتهبة وشرارات نارية ممتدة.', price: 90, icon: '', rarity: 'mythic', setId: 'skin_solar_phoenix' },
                { id: 'trail_dark_matter', title: 'المادة المظلمة (Dark Matter)', desc: 'فراغ أرجواني مظلم يبتلع الضوء في مساره.', price: 70, icon: '', rarity: 'legendary', setId: 'skin_quantum_void' },
                { id: 'trail_matrix', title: 'شفرة المصفوفة (Matrix Code)', desc: 'سيل من الرموز الخضراء الرقمية المتساقطة.', price: 35, icon: '[ONLINE]', rarity: 'rare', setId: 'skin_cyber_phantom' },
                { id: 'trail_neon_pulse', title: 'نبضات النيون (Neon Pulse)', desc: 'أمواج وردية متتابعة خلف السفينة.', price: 40, icon: '', rarity: 'rare', setId: 'skin_neon_berserker' },
                { id: 'trail_rainbow', title: 'طيف النيون (Rainbow Starlight)', desc: 'ألوان الطيف النيونية تتلألأ خلف اندفاع السفينة.', price: 55, icon: '', rarity: 'epic', setId: 'skin_apex_overlord' }
            ],
            abilities: [
                { id: 'nova_default', title: 'النبضة القياسية (Standard Nova)', desc: 'انفجار نيون كهربائي ومخروط سبرنت سماوي قياسي.', price: 0, icon: '', rarity: 'common', setId: 'default' },
                { id: 'sprint_thunder', title: 'صاعقة الرعد (Thunder Overdrive)', desc: 'سبرنت مشحون بصواعق برق ذهبية وموجة صوتية متفجرة.', price: 45, icon: '', rarity: 'rare', setId: 'skin_golden_striker' },
                { id: 'sprint_frost', title: 'عاصفة الصقيع (Sub-Zero Vortex)', desc: 'سبرنت يطلق شظايا صقيع جليدية ومخروط تجميد ناصع.', price: 60, icon: '', rarity: 'epic', setId: 'skin_glacial_spectre' },
                { id: 'sprint_shadow_flame', title: 'لهب الظلال (Shadow Flame Warp)', desc: 'سبرنت يلف السفينة بنيران أرجوانية وموجة اندفاع مظلمة.', price: 80, icon: '', rarity: 'legendary', setId: 'skin_obsidian_dragon' },
                { id: 'nova_supernova', title: 'السوبر نوفا الشمسي (Solar Supernova)', desc: 'انفجار شمسي ذهبي كاسح يضيء الساحة.', price: 85, icon: '', rarity: 'mythic', setId: 'skin_solar_phoenix' },
                { id: 'nova_blackhole', title: 'أفق الحدث الكمي (Event Horizon)', desc: 'موجة جاذبية كمية تبتلع الرصاص بهالة مظلمة.', price: 75, icon: '', rarity: 'legendary', setId: 'skin_quantum_void' },
                { id: 'sprint_hyperdrive', title: 'الانحناء الطيفي (Hyperdrive Starlight)', desc: 'سبرنت بسرعة الضوء يولد ظلالاً نيونية متعددة الأبعاد.', price: 100, icon: '', rarity: 'mythic', setId: 'skin_cyber_phantom' },
                { id: 'nova_apex_glory', title: 'يوم القيامة (Apex Doomsday)', desc: 'انفجار قرمزي مدمر يعقبه أمواج صدمية ثلاثية متتالية.', price: 100, icon: '', rarity: 'mythic', setId: 'skin_apex_overlord' }
            ]
        };

        const COSMETIC_SETS = {
            skin_golden_striker: { 
                id: 'skin_golden_striker',
                name: 'طقم الذهب الخالص 24K (Solid Gold Set)', 
                chassis: 'skin_golden_striker', 
                weapon: 'wep_goldengun', 
                trail: 'trail_golden', 
                ability: 'sprint_thunder',
                bundlePrice: 210,
                originalPrice: 280,
                themeColor: '#ffd700',
                icon: ''
            },
            skin_glacial_spectre: { 
                id: 'skin_glacial_spectre',
                name: 'طقم طيف الصقيع (Glacial Spectre Set)', 
                chassis: 'skin_glacial_spectre', 
                weapon: 'wep_frost_shard', 
                trail: 'trail_frost_mist', 
                ability: 'sprint_frost',
                bundlePrice: 185,
                originalPrice: 250,
                themeColor: '#00f3ff',
                icon: ''
            },
            skin_obsidian_dragon: { 
                id: 'skin_obsidian_dragon',
                name: 'طقم تنين الأوبسيديان (Obsidian Dragon Set)', 
                chassis: 'skin_obsidian_dragon', 
                weapon: 'wep_dragonfire', 
                trail: 'trail_dragon_ember', 
                ability: 'sprint_shadow_flame',
                bundlePrice: 290,
                originalPrice: 390,
                themeColor: '#ff0033',
                icon: ''
            },
            skin_solar_phoenix: { 
                id: 'skin_solar_phoenix',
                name: 'طقم فينيق الشمس (Solar Phoenix Set)', 
                chassis: 'skin_solar_phoenix', 
                weapon: 'wep_solar_flare', 
                trail: 'trail_solar_flare', 
                ability: 'nova_supernova',
                bundlePrice: 330,
                originalPrice: 445,
                themeColor: '#ff7700',
                icon: ''
            },
            skin_quantum_void: { 
                id: 'skin_quantum_void',
                name: 'طقم الفراغ الكمي (Quantum Void Set)', 
                chassis: 'skin_quantum_void', 
                weapon: 'wep_voidray', 
                trail: 'trail_dark_matter', 
                ability: 'nova_blackhole',
                bundlePrice: 255,
                originalPrice: 340,
                themeColor: '#bd00ff',
                icon: ''
            },
            skin_cyber_phantom: { 
                id: 'skin_cyber_phantom',
                name: 'طقم الشبح التكتيكي (Cyber Phantom Set)', 
                chassis: 'skin_cyber_phantom', 
                weapon: 'wep_toxic_surge', 
                trail: 'trail_matrix', 
                ability: 'sprint_hyperdrive',
                bundlePrice: 195,
                originalPrice: 265,
                themeColor: '#00ff88',
                icon: '[ONLINE]'
            },
            skin_neon_berserker: { 
                id: 'skin_neon_berserker',
                name: 'طقم الهائج النيوني (Neon Berserker Set)', 
                chassis: 'skin_neon_berserker', 
                weapon: 'wep_neon_fury', 
                trail: 'trail_neon_pulse', 
                ability: 'nova_apex_glory',
                bundlePrice: 165,
                originalPrice: 225,
                themeColor: '#ff0055',
                icon: ''
            },
            skin_apex_overlord: { 
                id: 'skin_apex_overlord',
                name: 'طقم الإمبراطور الملكي (Apex Overlord Set)', 
                chassis: 'skin_apex_overlord', 
                weapon: 'wep_plasma_comet', 
                trail: 'trail_rainbow', 
                ability: 'nova_apex_glory',
                bundlePrice: 310,
                originalPrice: 415,
                themeColor: '#ffd700',
                icon: ''
            },
            default: { 
                id: 'default',
                name: 'الطقم القياسي (Standard Set)', 
                chassis: 'default', 
                weapon: 'wep_default', 
                trail: 'trail_default', 
                ability: 'nova_default',
                bundlePrice: 0,
                originalPrice: 0,
                themeColor: '#00f3ff',
                icon: ''
            }
        };

        let currentShopCategory = 'skins';
        let selectedShopPreviewItem = null;
        let shopPreviewAnimFrame = null;
        let equippedCosmetics = JSON.parse(localStorage.getItem('chrono_equipped_cosmetics' + SAVE_VERSION)) || {
            chassis: 'default',
            weapon: 'wep_default',
            trail: 'trail_default',
            ability: 'nova_default'
        };

        // رسم المسار الهندسي الدقيق لكل كلاس للحفاظ على هوية الكلاس الأصلية
        function drawClassBaseHull(ctx, pClass, radius) {
            ctx.beginPath();
            if (pClass === 'sniper') {
                // القناص: سهم إبري شبحي طويل مع ماسورة ليزرية
                ctx.moveTo(0, -radius * 1.9);
                ctx.lineTo(radius * 0.35, -radius * 1.1);
                ctx.lineTo(radius * 0.85, -radius * 0.1);
                ctx.lineTo(radius * 1.2, radius * 1.05);
                ctx.lineTo(radius * 0.45, radius * 0.7);
                ctx.lineTo(0, radius * 0.9);
                ctx.lineTo(-radius * 0.45, radius * 0.7);
                ctx.lineTo(-radius * 1.2, radius * 1.05);
                ctx.lineTo(-radius * 0.85, -radius * 0.1);
                ctx.lineTo(-radius * 0.35, -radius * 1.1);
            } else if (pClass === 'support') {
                // الدعم: مدرعة سداسية الأضلاع مصفحة بصفائح جانبية عريضة
                ctx.moveTo(0, -radius * 1.25);
                ctx.lineTo(radius * 1.35, -radius * 0.35);
                ctx.lineTo(radius * 1.45, radius * 0.95);
                ctx.lineTo(radius * 0.65, radius * 0.75);
                ctx.lineTo(0, radius * 0.95);
                ctx.lineTo(-radius * 0.65, radius * 0.75);
                ctx.lineTo(-radius * 1.45, radius * 0.95);
                ctx.lineTo(-radius * 1.35, -radius * 0.35);
            } else if (pClass === 'engineer') {
                // المهندس: هيكل مزدوج (Catamaran) مع عقد توربينات روبوتية
                ctx.moveTo(-radius * 0.75, -radius * 1.6);
                ctx.lineTo(-radius * 0.35, -radius * 1.6);
                ctx.lineTo(-radius * 0.25, -radius * 0.4);
                ctx.lineTo(radius * 0.25, -radius * 0.4);
                ctx.lineTo(radius * 0.35, -radius * 1.6);
                ctx.lineTo(radius * 0.75, -radius * 1.6);
                ctx.lineTo(radius * 1.25, radius * 0.9);
                ctx.lineTo(radius * 0.55, radius * 0.65);
                ctx.lineTo(0, radius * 0.8);
                ctx.lineTo(-radius * 0.55, radius * 0.65);
                ctx.lineTo(-radius * 1.25, radius * 0.9);
            } else {
                // الهجومي (Assault): مقاتلة دلتا حربية هجومية ذات أجنحة حادة
                ctx.moveTo(0, -radius * 1.55);
                ctx.lineTo(radius * 1.3, radius * 0.95);
                ctx.lineTo(radius * 0.6, radius * 0.65);
                ctx.lineTo(0, radius * 0.85);
                ctx.lineTo(-radius * 0.6, radius * 0.65);
                ctx.lineTo(-radius * 1.3, radius * 0.95);
            }
            ctx.closePath();
        }

        // استخراج اللون التناسقي الحصري حسب سكن المسار أو الشاسيه أو السلاح المجهز
        function getActiveCosmeticThemeColor(pClass = null) {
            if (typeof equippedCosmetics === 'undefined') {
                let cCfg = (typeof CLASSES_CONFIG !== 'undefined' && pClass && CLASSES_CONFIG[pClass]) ? CLASSES_CONFIG[pClass] : null;
                return cCfg ? cCfg.color : '#00f3ff';
            }

            // 1. أولوية سكن المسار المجهز
            let trail = equippedCosmetics.trail;
            if (trail && trail !== 'trail_default') {
                if (trail === 'trail_golden') return '#ffd700';
                if (trail === 'trail_frost_mist') return '#00f3ff';
                if (trail === 'trail_dragon_ember') return '#ff2200';
                if (trail === 'trail_solar_flare') return '#ff6600';
                if (trail === 'trail_dark_matter') return '#bd00ff';
                if (trail === 'trail_matrix') return '#00ff66';
                if (trail === 'trail_neon_pulse') return '#ff0055';
                if (trail === 'trail_rainbow') return `hsl(${(performance.now() * 0.2) % 360}, 100%, 65%)`;
            }

            // 2. أولوية سكن الشاسيه / السفينة المجهز
            let chassis = equippedCosmetics.chassis;
            if (chassis && chassis !== 'default') {
                if (chassis === 'skin_obsidian_dragon') return '#ff0033';
                if (chassis === 'skin_solar_phoenix') return '#ff5500';
                if (chassis === 'skin_golden_striker') return '#ffd700';
                if (chassis === 'skin_quantum_void') return '#bd00ff';
                if (chassis === 'skin_neon_berserker') return '#ff0055';
                if (chassis === 'skin_cyber_phantom') return '#00ff88';
                if (chassis === 'skin_apex_overlord') return '#ffd700';
                if (chassis === 'skin_glacial_spectre') return '#00f3ff';
            }

            // 3. أولوية سكن السلاح المجهز
            let weapon = equippedCosmetics.weapon;
            if (weapon && weapon !== 'wep_default') {
                if (weapon === 'wep_dragonfire') return '#ff4400';
                if (weapon === 'wep_solar_flare') return '#ff6600';
                if (weapon === 'wep_neon_fury') return '#ff0055';
                if (weapon === 'wep_toxic_surge') return '#00ff66';
                if (weapon === 'wep_voidray') return '#bd00ff';
                if (weapon === 'wep_goldengun') return '#ffd700';
                if (weapon === 'wep_plasma_comet') return `hsl(${(performance.now() * 0.3) % 360}, 100%, 65%)`;
            }

            // 4. لون الكلاس الافتراضي
            let curClass = pClass || (typeof player !== 'undefined' && player ? player.playerClass : selectedClass);
            let cCfg = (typeof CLASSES_CONFIG !== 'undefined' && curClass && CLASSES_CONFIG[curClass]) ? CLASSES_CONFIG[curClass] : null;
            return cCfg ? cCfg.color : '#00f3ff';
        }

        // دالة الرسم الهندسي المخصص للسكنات (تُطبق لون ومادة السكن على هيكل الكلاس المختار)
        function drawCustomShipGeometry(ctx, skinId, pClass, radius, isFiringUlt, overchargeActive, sprintTimer, animTime) {
            ctx.save();
            let cCfg = (typeof CLASSES_CONFIG !== 'undefined' && CLASSES_CONFIG[pClass]) ? CLASSES_CONFIG[pClass] : { color: '#00f3ff' };
            let classBaseCol = isFiringUlt ? colors.ult : (overchargeActive ? colors.overcharge : (cCfg.color || colors.player));
            let t = (animTime || performance.now()) * 0.003;

            // 1. تطبيق مادة وتلوين السكن المجهز على هيكل الكلاس نفسه
            if (skinId === 'skin_golden_striker') {
                // السكن الذهبي: مذهب مصقول 24K مع انعكاسات ميتاليك
                let goldGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
                goldGrad.addColorStop(0, '#fff4b8'); goldGrad.addColorStop(0.5, '#ffd700'); goldGrad.addColorStop(1, '#b38600');
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = goldGrad; ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.stroke();

                // بريق ونجوم ذهبية ملكية
                for (let k = 0; k < 2; k++) {
                    let starAng = t * 3 + (k * Math.PI);
                    let sx = Math.cos(starAng) * (radius * 0.7), sy = Math.sin(starAng) * (radius * 0.7);
                    ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
            } else if (skinId === 'skin_glacial_spectre') {
                // سكن طيف الصقيع: هيكل بلوري مع شظايا جليدية عائمة
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = 'rgba(180, 240, 255, 0.45)'; ctx.fill();
                ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2.0; ctx.stroke();

                // 3 شظايا جليد سابحة حول هيكل الكلاس
                for (let k = 0; k < 3; k++) {
                    let ang = t * 2 + (k * Math.PI * 2 / 3);
                    let sx = Math.cos(ang) * (radius * 1.55);
                    let sy = Math.sin(ang) * (radius * 1.55);
                    ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 3, sy); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx - 3, sy); ctx.closePath();
                    ctx.fillStyle = '#00f3ff'; ctx.fill();
                }
            } else if (skinId === 'skin_obsidian_dragon') {
                // سكن تنين الأوبسيديان: تيتانيوم كربوني أسود مع عيون حمراء ونقوش رونية
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = '#0a0a0f'; ctx.fill();
                ctx.strokeStyle = '#ff0033'; ctx.lineWidth = 2.2; ctx.stroke();

                // عيون التنين الحمراء
                ctx.beginPath();
                ctx.arc(-radius * 0.25, -radius * 0.4, 2, 0, Math.PI * 2);
                ctx.arc(radius * 0.25, -radius * 0.4, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ff0033'; ctx.fill();
            } else if (skinId === 'skin_solar_phoenix') {
                // سكن فينيق البلازما: ألوان شمسية متوهجة مع أطراف لهب متوهجة
                let sunGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.4);
                sunGrad.addColorStop(0, '#ffffff'); sunGrad.addColorStop(0.3, '#ffcc00'); sunGrad.addColorStop(0.8, '#ff3300'); sunGrad.addColorStop(1, '#880000');
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = sunGrad; ctx.fill();
                ctx.strokeStyle = '#ffee66'; ctx.lineWidth = 2.2; ctx.stroke();
            } else if (skinId === 'skin_quantum_void') {
                // سكن الفراغ الكمي: بنفسجي مظلم مع ثقب أسود دوار في المركز
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = '#080312'; ctx.fill();
                ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 2.0; ctx.stroke();

                // ثقب أسود مصغر وحلقات جاذبية في مركز الكلاس
                ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill(); ctx.strokeStyle = '#00f3ff'; ctx.stroke();
            } else if (skinId === 'skin_apex_overlord') {
                // سكن الإمبراطور: أرجواني مذهب مع تاج طاقة عائم
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = '#160814'; ctx.fill();
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.4; ctx.stroke();

                // تاج طاقة هولوغرامي عائم فوق قمرة الكلاس
                ctx.beginPath();
                ctx.moveTo(-radius * 0.5, -radius * 1.9 + Math.sin(t * 3) * 2);
                ctx.lineTo(-radius * 0.25, -radius * 1.7 + Math.sin(t * 3) * 2);
                ctx.lineTo(0, -radius * 2.1 + Math.sin(t * 3) * 2);
                ctx.lineTo(radius * 0.25, -radius * 1.7 + Math.sin(t * 3) * 2);
                ctx.lineTo(radius * 0.5, -radius * 1.9 + Math.sin(t * 3) * 2);
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.8; ctx.stroke();
            } else if (skinId === 'skin_cyber_phantom') {
                // سكن الشبح التكتيكي: ألياف كربون رمادية مع مسارات خضراء
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = '#0c121c'; ctx.fill();
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2.0; ctx.stroke();
            } else if (skinId === 'skin_neon_berserker') {
                // سكن الهائج النيوني: خطوط قرمزي ووردي كهربائي
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = '#1a040a'; ctx.fill();
                ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2.4; ctx.stroke();
            } else {
                // السكن القياسي (Standard)
                drawClassBaseHull(ctx, pClass, radius);
                ctx.fillStyle = classBaseCol; ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0; ctx.stroke();
            }

            // 2. قمرة القيادة الخاصة بالكلاس
            ctx.beginPath();
            ctx.ellipse(0, -radius * 0.2, 3.5, 7, 0, 0, Math.PI * 2);
            ctx.fillStyle = isFiringUlt ? '#ff0055' : (overchargeActive ? '#ffd700' : '#ffffff');
            ctx.fill();

            ctx.restore();
        }

        const RARITY_TIERS = {
            1: { id: 'common', name: 'عتاد قياسي', color: '#ffffff', glow: 'rgba(255, 255, 255, 0.5)', dmgMult: 1.0, magMult: 1.0, reloadMult: 1.0 }
        };
        const SHIELD_TIERS = {
            1: { id: 'common', name: 'درع تكتيكي', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.6)', charges: 1, maxHp: 85 }
        };

        let ammoDrops = [];
        let ammoDropPool = [];

        let sessionParries = 0, sessionGrazes = 0, sessionSubKills = 0, sessionUlts = 0, sessionCubesEnergy = 0;
        let score = 0, survivalSeconds = 0, sessionCubes = 0, sessionXP = 0, sessionKills = 0;
        let combo = 1, comboTimer = 0;
        let lastTime = 0, gameLoopId = null;
        let isGameOver = false, isGamePaused = false, isModalActive = false, isMoving = false;
        let timeScale = 0.25, spawnTimer = 0, difficulty = 1.0;
        let frameCount = 0, fpsTimer = 0, currentRealFps = 60;

        let width = window.innerWidth, height = window.innerHeight;
        let screenShakeTime = 0, hitStopDuration = 0;
        let camX = 0, camY = 0;
        let currentWave = 1, enemiesInWaveTotal = 0, enemiesLeftToSpawn = 0;
        let isWaveIntermission = false, isBossWave = false;
        let acquiredPerks = {}, acquiredRelics = [], activeSynergies = new Set();
        let hazardLaserZones = [], blackHoleSingularity = null;

        const proceduralBountyTypes = [
            { text: "عقد تكتيكي: تفادى 5 طلقات بـ Graze", goal: 5, type: 'graze', reward: () => { if (player) { player.addOvercharge(50); player.addUltEnergy(35); } sessionCubes += 2; } },
            { text: "عقد تكتيكي: تدمير 4 أعداء بالأسلحة المساندة", goal: 4, type: 'sub_kill', reward: () => { if (player) { player.addEnergy(100); player.addUltEnergy(40); } sessionCubes += 3; } },
            { text: "عقد تكتيكي: نفذ 2 صد فوري (Parry)", goal: 2, type: 'parry', reward: () => { score += 2500; if (player) player.addUltEnergy(50); sessionCubes += 2; } }
        ];
        let currentBounty = null, bountyTimer = 0;

        function saveSettings() {
            try { localStorage.setItem('chrono_settings_v74', JSON.stringify(gameSettings)); } catch(e) {}
            updateSettingsUI();
        }

        function toggleSetting(key) {
            gameSettings[key] = !gameSettings[key];
            saveSettings();
        }

        function updateSettingsUI() {
            const btnSfx = document.getElementById('setting-sfx-btn');
            const btnShake = document.getElementById('setting-shake-btn');
            const btnFloat = document.getElementById('setting-floating-btn');
            const btnFpsMode = document.getElementById('setting-fps-mode-btn');
            const btnShowFps = document.getElementById('setting-showfps-btn');

            if (btnSfx) { btnSfx.innerText = gameSettings.sound ? 'مفعل' : 'معطل'; btnSfx.className = `toggle-btn ${gameSettings.sound ? 'active' : ''}`; }
            if (btnShake) { btnShake.innerText = gameSettings.shake ? 'مفعل' : 'معطل'; btnShake.className = `toggle-btn ${gameSettings.shake ? 'active' : ''}`; }
            if (btnFloat) { btnFloat.innerText = gameSettings.floating ? 'مفعل' : 'معطل'; btnFloat.className = `toggle-btn ${gameSettings.floating ? 'active' : ''}`; }
            if (btnFpsMode) { btnFpsMode.innerText = gameSettings.highRefresh ? '120Hz+' : '60Hz (توفير)'; btnFpsMode.className = `toggle-btn ${gameSettings.highRefresh ? 'active' : ''}`; }
            if (btnShowFps) { btnShowFps.innerText = gameSettings.showFps ? 'مفعل' : 'معطل'; btnShowFps.className = `toggle-btn ${gameSettings.showFps ? 'active' : ''}`; }
            if (fpsHudTag) { fpsHudTag.style.display = gameSettings.showFps ? 'block' : 'none'; }
            // Main menu settings buttons
            const btnLowEnd = document.getElementById('setting-lowend-btn');
            const btnBloom = document.getElementById('setting-bloom-btn');
            if (btnLowEnd) { btnLowEnd.innerText = gameSettings.lowEnd ? 'مفعل' : 'معطل'; btnLowEnd.className = `toggle-btn ${gameSettings.lowEnd ? 'active' : ''}`; }
            if (btnBloom) { btnBloom.innerText = gameSettings.bloom ? 'مفعل' : 'معطل'; btnBloom.className = `toggle-btn ${gameSettings.bloom ? 'active' : ''}`; }
            // Pause menu settings buttons
            const pBtnLowEnd = document.getElementById('p-setting-lowend-btn');
            const pBtnBloom = document.getElementById('p-setting-bloom-btn');
            if (pBtnLowEnd) { pBtnLowEnd.innerText = gameSettings.lowEnd ? 'مفعل' : 'معطل'; pBtnLowEnd.className = `toggle-btn ${gameSettings.lowEnd ? 'active' : ''}`; }
            if (pBtnBloom) { pBtnBloom.innerText = gameSettings.bloom ? 'مفعل' : 'معطل'; pBtnBloom.className = `toggle-btn ${gameSettings.bloom ? 'active' : ''}`; }
            // Mobile aim assist, floating joystick and haptic vibration buttons
            const btnHaptic = document.getElementById('setting-haptic-btn');
            const btnAimAssist = document.getElementById('setting-aim-assist-btn');
            const pBtnAimAssist = document.getElementById('p-setting-aim-assist-btn');
            const btnFloatingJoy = document.getElementById('setting-floating-joy-btn');
            const pBtnFloatingJoy = document.getElementById('p-setting-floating-joy-btn');

            if (btnHaptic) { btnHaptic.innerText = gameSettings.haptic ? 'مفعل' : 'معطل'; btnHaptic.className = `toggle-btn ${gameSettings.haptic ? 'active' : ''}`; }
            if (btnAimAssist) { btnAimAssist.innerText = gameSettings.aimAssist ? 'مفعل' : 'معطل'; btnAimAssist.className = `toggle-btn ${gameSettings.aimAssist ? 'active' : ''}`; }
            if (pBtnAimAssist) { pBtnAimAssist.innerText = gameSettings.aimAssist ? 'مفعل' : 'معطل'; pBtnAimAssist.className = `toggle-btn ${gameSettings.aimAssist ? 'active' : ''}`; }
            if (btnFloatingJoy) { btnFloatingJoy.innerText = gameSettings.floatingJoystick ? 'مفعل' : 'معطل'; btnFloatingJoy.className = `toggle-btn ${gameSettings.floatingJoystick ? 'active' : ''}`; }
            if (pBtnFloatingJoy) { pBtnFloatingJoy.innerText = gameSettings.floatingJoystick ? 'مفعل' : 'معطل'; pBtnFloatingJoy.className = `toggle-btn ${gameSettings.floatingJoystick ? 'active' : ''}`; }
        }

        // Master Volume Control
        let masterVolume = 0.85;
        function updateMasterVolume(val) {
            masterVolume = parseFloat(val) / 100;
            if (masterGainNode) masterGainNode.gain.value = masterVolume;
            const label = document.getElementById('pause-vol-val');
            const label2 = document.getElementById('master-vol-val');
            if (label) label.innerText = Math.round(val) + '%';
            if (label2) label2.innerText = Math.round(val) + '%';
            // Sync sliders
            const s1 = document.getElementById('pause-vol-slider');
            const s2 = document.getElementById('setting-vol-slider');
            if (s1) s1.value = val;
            if (s2) s2.value = val;
        }

        // Joystick Sensitivity Control
        let joystickSensMultiplier = 1.0;
        function updateJoystickSens(val) {
            joystickSensMultiplier = parseFloat(val);
            const label = document.getElementById('pause-joy-val');
            const label2 = document.getElementById('joy-sens-val');
            if (label) label.innerText = parseFloat(val).toFixed(1) + 'x';
            if (label2) label2.innerText = parseFloat(val).toFixed(1) + 'x';
            // Sync sliders
            const s1 = document.getElementById('pause-joy-sens');
            const s2 = document.getElementById('setting-joy-sens');
            if (s1) s1.value = val;
            if (s2) s2.value = val;
        }

        function openSettingsSubmenu() {
            document.getElementById('pause-main-actions').style.display = 'none';
            document.getElementById('pause-settings-panel').style.display = 'flex';
            updateSettingsUI();
        }

        function closeSettingsSubmenu() {
            document.getElementById('pause-settings-panel').style.display = 'none';
            document.getElementById('pause-main-actions').style.display = 'flex';
        }

        // ==================== محرك التوليف الصوتي المحسن (Audio Synthesizer Engine) ====================
        let audioCtx = null, masterLimiter = null, noiseBuffer = null, masterGainNode = null;

        function initAudio() {
            try {
                if (!audioCtx) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    audioCtx = new AudioContextClass();
                    
                    masterGainNode = audioCtx.createGain();
                    masterGainNode.gain.value = masterVolume;
                    masterGainNode.connect(audioCtx.destination);

                    masterLimiter = audioCtx.createDynamicsCompressor();
                    masterLimiter.threshold.setValueAtTime(-4, audioCtx.currentTime);
                    masterLimiter.knee.setValueAtTime(8, audioCtx.currentTime);
                    masterLimiter.ratio.setValueAtTime(12, audioCtx.currentTime);
                    masterLimiter.attack.setValueAtTime(0.002, audioCtx.currentTime);
                    masterLimiter.release.setValueAtTime(0.1, audioCtx.currentTime);
                    masterLimiter.connect(masterGainNode);

                    const bufferSize = audioCtx.sampleRate * 1.5;
                    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const output = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        output[i] = Math.random() * 2 - 1;
                    }
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
            } catch(e) {}
        }
        window.addEventListener('pointerdown', initAudio, { once: true });
        window.addEventListener('touchstart', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });

        
// ===================================================================
// AAA AUDIO SYNTHESIZER 2.0 & CINEMATIC VFX SYSTEM
// ===================================================================

// 1. Shockwaves & Distortion Rings Manager
let cinematicShockwaves = [];

function spawnShockwave(x, y, maxRadius = 180, color = '#00f3ff', duration = 0.45) {
    if (cinematicShockwaves.length > 20) cinematicShockwaves.shift();
    cinematicShockwaves.push({
        x: x,
        y: y,
        currentRadius: 10,
        maxRadius: maxRadius,
        color: color,
        duration: duration,
        elapsed: 0,
        lineWidth: 6
    });
}

function updateAndDrawShockwaves(effectiveDelta, frameFactor) {
    if (cinematicShockwaves.length === 0) return;

    for (let i = cinematicShockwaves.length - 1; i >= 0; i--) {
        let sw = cinematicShockwaves[i];
        sw.elapsed += effectiveDelta / 1000;
        let progress = sw.elapsed / sw.duration;

        if (progress >= 1) {
            cinematicShockwaves.splice(i, 1);
            continue;
        }

        // Ease out quad
        sw.currentRadius = 10 + (sw.maxRadius - 10) * Math.sin(progress * Math.PI / 2);
        let alpha = 1 - progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = Math.max(1, sw.lineWidth * (1 - progress * 0.7));
        ctx.stroke();
        ctx.restore();
    }
}

// 2. Muzzle Flash Starbursts
let muzzleFlashes = [];

function spawnMuzzleFlash(x, y, angle, color = '#00f3ff', size = 18) {
    if (muzzleFlashes.length > 30) muzzleFlashes.shift();
    muzzleFlashes.push({
        x: x,
        y: y,
        angle: angle,
        color: color,
        size: size,
        life: 0.06,
        maxLife: 0.06
    });
}

function updateAndDrawMuzzleFlashes(effectiveDelta) {
    if (muzzleFlashes.length === 0) return;

    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        let mf = muzzleFlashes[i];
        mf.life -= effectiveDelta / 1000;

        if (mf.life <= 0) {
            muzzleFlashes.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.translate(mf.x, mf.y);
        ctx.rotate(mf.angle);

        let alpha = mf.life / mf.maxLife;
        ctx.globalAlpha = alpha;

        // Radiant starburst cone
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(mf.size, -mf.size * 0.35);
        ctx.lineTo(mf.size * 1.4, 0);
        ctx.lineTo(mf.size, mf.size * 0.35);
        ctx.closePath();
        ctx.fillStyle = mf.color;
        ctx.fill();

        ctx.restore();
    }
}

// 3. Audio Synthesizer 2.0 (Cinematic Multi-Layered Web Audio SFX)
function playSoundV2(type) {
    if (!gameSettings || !gameSettings.sound || !audioCtx || audioCtx.state !== 'running') return;

    try {
        const now = audioCtx.currentTime;
        const masterOut = masterLimiter || audioCtx.destination;

        if (type === 'ui_hover') {
            let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1400, now + 0.03);
            gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.connect(gain); gain.connect(masterOut);
            osc.start(now); osc.stop(now + 0.035);
        } else if (type === 'ui_click') {
            let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(450, now); osc.frequency.exponentialRampToValueAtTime(950, now + 0.06);
            gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain); gain.connect(masterOut);
            osc.start(now); osc.stop(now + 0.065);
        } else if (type === 'shoot_railgun') {
            // High energy hypersonic crack + sub-drop
            let osc1 = audioCtx.createOscillator(), osc2 = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(1200, now); osc1.frequency.exponentialRampToValueAtTime(80, now + 0.35);
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(180, now); osc2.frequency.exponentialRampToValueAtTime(30, now + 0.35);
            gain.gain.setValueAtTime(0.35, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain); osc2.connect(gain); gain.connect(masterOut);
            osc1.start(now); osc2.start(now); osc1.stop(now + 0.36); osc2.stop(now + 0.36);
        } else if (type === 'shoot_shotgun') {
            // Explosive white-noise burst + thump
            let bufferSize = audioCtx.sampleRate * 0.22;
            let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            let data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            let noise = audioCtx.createBufferSource(); noise.buffer = buffer;
            let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(1600, now); filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);
            let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.38, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            noise.connect(filter); filter.connect(gain); gain.connect(masterOut);
            noise.start(now); noise.stop(now + 0.22);
        } else if (type === 'hit_crit') {
            // High-pitched crystal ping
            let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(1760, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
            gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain); gain.connect(masterOut);
            osc.start(now); osc.stop(now + 0.19);
        } else if (type === 'parry') {
            // Resonant energy deflection chord
            let osc1 = audioCtx.createOscillator(), osc2 = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc1.type = 'triangle'; osc1.frequency.setValueAtTime(587.33, now); // D5
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(880.00, now); // A5
            gain.gain.setValueAtTime(0.32, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc1.connect(gain); osc2.connect(gain); gain.connect(masterOut);
            osc1.start(now); osc2.start(now); osc1.stop(now + 0.4); osc2.stop(now + 0.4);
        } else if (type === 'nova_emp') {
            // Massive sub-bass drop & electrical discharge
            let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(240, now); osc.frequency.exponentialRampToValueAtTime(25, now + 0.8);
            gain.gain.setValueAtTime(0.45, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
            osc.connect(gain); gain.connect(masterOut);
            osc.start(now); osc.stop(now + 0.85);
        } else if (type === 'level_up') {
            // Triumphant 3-note ascending fanfare (D - F# - A)
            [293.66, 369.99, 440.00].forEach((freq, idx) => {
                let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                let startT = now + idx * 0.1;
                osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, startT);
                gain.gain.setValueAtTime(0.28, startT); gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.35);
                osc.connect(gain); gain.connect(masterOut);
                osc.start(startT); osc.stop(startT + 0.36);
            });
        } else {
            // Fallback to standard playSound if defined
            if (typeof playSoundOriginal === 'function') {
                playSoundOriginal(type);
            }
        }
    } catch (e) {}
}


function playSound(type) { playSoundV2(type); }

function playSoundOriginal(type) {
            if (!gameSettings.sound || !audioCtx || audioCtx.state !== 'running') return;
            try {
                const now = audioCtx.currentTime;

                if (type === 'shoot_lmg') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(380, now); osc.frequency.exponentialRampToValueAtTime(60, now + 0.11);
                    gain.gain.setValueAtTime(0.14, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.11);
                } else if (type === 'shoot_pistol') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'triangle'; osc.frequency.setValueAtTime(820, now); osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
                    gain.gain.setValueAtTime(0.10, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.07);
                } else if (type === 'shoot_blaster') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(750, now);
                    osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
                    gain.gain.setValueAtTime(0.09, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.08);
                } else if (type === 'shoot_shotgun') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    let filter = audioCtx.createBiquadFilter();
                    filter.type = 'lowpass'; filter.frequency.setValueAtTime(600, now);
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(240, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.16);
                    gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                    osc.connect(filter); filter.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.16);
                } else if (type === 'shoot_rapid') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.setValueAtTime(950, now); osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
                    gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.04);
                } else if (type === 'shoot_railgun') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1400, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
                    gain.gain.setValueAtTime(0.22, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.35);
                } else if (type === 'explosion') {
                    if (noiseBuffer) {
                        let noiseSource = audioCtx.createBufferSource();
                        noiseSource.buffer = noiseBuffer;
                        let filter = audioCtx.createBiquadFilter();
                        filter.type = 'lowpass';
                        filter.frequency.setValueAtTime(800, now);
                        filter.frequency.exponentialRampToValueAtTime(40, now + 0.3);
                        let gain = audioCtx.createGain();
                        gain.gain.setValueAtTime(0.22, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                        noiseSource.connect(filter); filter.connect(gain); gain.connect(masterLimiter);
                        noiseSource.start(now); noiseSource.stop(now + 0.3);
                    }
                    let subOsc = audioCtx.createOscillator(), subGain = audioCtx.createGain();
                    subOsc.type = 'sine'; subOsc.frequency.setValueAtTime(120, now); subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
                    subGain.gain.setValueAtTime(0.2, now); subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    subOsc.connect(subGain); subGain.connect(masterLimiter);
                    subOsc.start(now); subOsc.stop(now + 0.25);
                } else if (type === 'shield') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.setValueAtTime(350, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
                    gain.gain.setValueAtTime(0.14, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.22);
                } else if (type === 'parry') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.setValueAtTime(1100, now); osc.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
                    gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.18);
                } else if (type === 'dash') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.setValueAtTime(240, now); osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
                    gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.12);
                } else if (type === 'gold' || type === 'portal') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.setValueAtTime(580, now); osc.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
                    gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.2);
                } else if (type === 'overcharge') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(950, now + 0.45);
                    gain.gain.setValueAtTime(0.16, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.45);
                } else if (type === 'relic' || type === 'synergy') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(1760, now + 0.5);
                    gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.5);
                } else if (type === 'tesla') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(250, now + 0.09);
                    gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.09);
                } else if (type === 'mine_arm') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.setValueAtTime(520, now); osc.frequency.linearRampToValueAtTime(840, now + 0.08);
                    gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.08);
                } else if (type === 'ultimate') {
                    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(90, now); osc.frequency.exponentialRampToValueAtTime(1800, now + 0.85);
                    gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
                    osc.connect(gain); gain.connect(masterLimiter);
                    osc.start(now); osc.stop(now + 0.85);
                }
            } catch(e) {}
        }

        const tabNames = ['play', 'arsenal', 'shop', 'perks', 'missions', 'settings'];
        let currentTabIdx = 0;

        const MASTER_PERKS = {
            shield_core: {
                id: 'shield_core', title: 'درع إيجيس الفائق (Aegis)', icon: '',
                desc: [
                    'المستوى 1: +1 طبقة درع حماية إضافية وإعادة شحن فورية.',
                    'المستوى 2: +2 طبقات درع وتخفيض 25% لوقت إعادة شحن الدرع.',
                    'المستوى 3: +3 طبقات درع وتفريغ موجة صد صدمية عند كسر أي طبقة.'
                ],
                apply: (p, lvl) => {
                    p.shieldLevel += lvl;
                    p.shieldCharges = p.shieldLevel;
                    p.hasShield = true;
                    if (lvl >= 3) p.hasAegisNova = true;
                }
            },
            evo_plasma: {
                id: 'evo_plasma', title: 'بلازما اللهب الحارق', icon: '',
                desc: [
                    'المستوى 1: طلقات حارقة تترك بقع لهب تلحق ضرراً مستمراً.',
                    'المستوى 2: +30% ضرر احتراق وانفجار حراري عند مقتل العدو.',
                    'المستوى 3: إطلاق مقذوفات بلازما متفجرة تصعق وتحرق مجموعات الأعداء.'
                ],
                apply: (p, lvl) => {
                    p.evolution = 'fire';
                    p.damageMultiplier *= (1 + lvl * 0.15);
                }
            },
            evo_frost: {
                id: 'evo_frost', title: 'الصقيع الزمني المطبق', icon: '',
                desc: [
                    'المستوى 1: إبطاء سرعة حركة وهجوم الأعداء المصابين بنسبة 40%.',
                    'المستوى 2: تجميد الأعداء لثانية ونصف بعد 3 إصابات متتالية.',
                    'المستوى 3: انفجار صقيعي متسلسل يجمد الرصاص والأعداء المحيطين.'
                ],
                apply: (p, lvl) => {
                    p.evolution = 'frost';
                    p.hasChronoField = true;
                }
            },
            sub_drone: {
                id: 'sub_drone', title: 'المسيّرة المقاتلة المرافقة', icon: '',
                desc: [
                    'المستوى 1: مسيّرة واحدة مرافقة تطلق ليزراً تلقائياً على أقرب هدف.',
                    'المستوى 2: طائرتان مرافقتان مع زيادة 30% لسرعة إطلاق النار.',
                    'المستوى 3: طائرتان بنظام ليزر أيوني مزدوج يخترق صفوف الأعداء.'
                ],
                apply: (p, lvl) => {
                    p.subweapons.drones.count = Math.min(2, lvl);
                    p.subweapons.drones.interval = Math.max(350, 650 - lvl * 100);
                }
            },
            sub_tesla: {
                id: 'sub_tesla', title: 'ملف تسلا الصاعق المتسلسل', icon: '',
                desc: [
                    'المستوى 1: تفريغ صاعقة تقفز بين هدفين وتلحق شللاً مؤقتاً.',
                    'المستوى 2: الصواعق تقفز بين 4 أهداف مع تقليل كولداون الصعق.',
                    'المستوى 3: عاصفة تسلا شاملة تقفز بين 6 أهداف وتنشط باستمرار أثناء Overcharge.'
                ],
                apply: (p, lvl) => {
                    p.subweapons.tesla.active = true;
                    p.subweapons.tesla.level = lvl;
                    if (lvl >= 3) p.hasTeslaSuperstorm = true;
                }
            },
            sub_mines: {
                id: 'sub_mines', title: 'الألغام الجاذبة النبضية', icon: '',
                desc: [
                    'المستوى 1: إسقاط ألغام موقوتة دورية تنفجر عند اقتراب الأعداء.',
                    'المستوى 2: الألغام تسحب الأعداء نحو مركز الانفجار بحقل جاذبي.',
                    'المستوى 3: انفجار عنقودي ثلاثي يمسح الرصاص ويشل كل الأعداء.'
                ],
                apply: (p, lvl) => {
                    p.subweapons.mines.active = true;
                    p.subweapons.mines.level = lvl;
                }
            },
            hyper_fire: {
                id: 'hyper_fire', title: 'تسريع التردد الناري الفائق', icon: '',
                desc: [
                    'المستوى 1: +25% زيادة سرعة إطلاق النار الأساسية.',
                    'المستوى 2: +45% سرعة إطلاق نار مع خفض ارتداد السلاح.',
                    'المستوى 3: +75% معدل إطلاق نيران خارق مع طلقة إضافية مجانية.'
                ],
                apply: (p, lvl) => {
                    p.shootInterval *= (1 - (lvl * 0.15));
                    if (lvl >= 3) p.bulletCountBonus += 1;
                }
            },
            kinetic_blast: {
                id: 'kinetic_blast', title: 'مقذوفات البلازما الثقيلة', icon: '',
                desc: [
                    'المستوى 1: +35% مضاعفة ضرر الرصاص الأساسي.',
                    'المستوى 2: +70% ضرر الرصاص مع فرصة 25% لإحداث ضربة حرجة x2.',
                    'المستوى 3: +110% ضرر ساحق مع انفجار موجة صدمية عند كل إصابة.'
                ],
                apply: (p, lvl) => {
                    p.damageMultiplier *= (1 + lvl * 0.35);
                }
            },
            chrono_drift: {
                id: 'chrono_drift', title: 'مكثف الاندفاع الزمني (Drift)', icon: '',
                desc: [
                    'المستوى 1: تخفيض كولداون الـ Dash بمقدار 300ms.',
                    'المستوى 2: تخفيض 600ms لكولداون الـ Dash وزيادة مسافة الاندفاع 25%.',
                    'المستوى 3: شحن فوري لطاقة الـ Overcharge بنسبة 20% عند كل اندفاع ناجح.'
                ],
                apply: (p, lvl) => {
                    p.dashMaxCooldown = Math.max(300, p.dashMaxCooldown - lvl * 220);
                }
            },
            vampiric_siphon: {
                id: 'vampiric_siphon', title: 'ممتص الطاقة الحيوية', icon: '',
                desc: [
                    'المستوى 1: القضاء على الأعداء يمنح طاقة إضافية للـ EMP والـ Ultimate.',
                    'المستوى 2: القضاء على النخب والزعماء يمدد حالة Overcharge بنسبة +2 ثوانٍ.',
                    'المستوى 3: فرصة 20% لاسترجاع طبقة درع مفقودة عند تدمير زعيم أو 15 عدواً.'
                ],
                apply: (p, lvl) => {
                    p.hasVampiricOvercharge = true;
                    p.empGainBonus *= (1 + lvl * 0.2);
                }
            },
            ricochet_flak: {
                id: 'ricochet_flak', title: 'مقذوفات الارتداد المنشطرة', icon: '',
                desc: [
                    'المستوى 1: الرصاص يرتد عن حواف الساحة نحو أقرب عدو.',
                    'المستوى 2: الرصاص يرتد مرتين مع زيادة 25% لسرعة المقذوف.',
                    'المستوى 3: عند كل ارتداد، تنشطر الطلقة تلقائياً إلى 3 شظايا متفجرة.'
                ],
                apply: (p, lvl) => {
                    p.hasRicochet = true;
                    if (lvl >= 3) p.hasSplitFlak = true;
                }
            },
            orbital_crest: {
                id: 'orbital_crest', title: 'الدرع المداري العاكس', icon: '',
                desc: [
                    'المستوى 1: شفرة طاقة تدور حول المركبة وتمسح رصاص الأعداء القريب.',
                    'المستوى 2: شفرتان مداريتان بمدى دوران أوسع وسرعة دوران مضاعفة.',
                    'المستوى 3: دوامة زمنية عاكسة تعكس مقذوفات الأعداء وتلحق أضراراً مستمرة.'
                ],
                apply: (p, lvl) => {
                    p.hasOrbitalBlade = true;
                    if (lvl >= 2) p.hasTemporalVortex = true;
                }
            }
        };

        function switchTab(tabName) {
            currentTabIdx = tabNames.indexOf(tabName);
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            let btnIndex = tabNames.indexOf(tabName);
            if (btnIndex >= 0) {
                document.querySelectorAll('.tab-btn')[btnIndex].classList.add('active');
                document.getElementById('tab-' + tabName).classList.add('active');
                if (tabName === 'arsenal') renderArsenalPreviewCanvas();
                if (tabName === 'perks') renderPerksMatrixUI();
                if (tabName === 'missions') { renderAchievementsUI(); renderContractsUI(); }
                if (tabName === 'shop') renderShopUI();
            }
        }

        function toggleEquipPerk(perkId) {
            let idx = equippedPerks.indexOf(perkId);
            if (idx >= 0) {
                equippedPerks.splice(idx, 1);
                playSound('shield');
            } else {
                if (equippedPerks.length >= 3) {
                    alert("يمكنك تجهيز 3 بيركات نشطة كحد أقصى! قم بإلغاء تحديد أحد البيركات أولاً.");
                    return;
                }
                equippedPerks.push(perkId);
                playSound('gold');
            }
            saveGameProgress(); if (typeof syncCloudProgress === 'function') syncCloudProgress();
            renderPerksMatrixUI();
            renderArsenalPreviewCanvas();
        }

        function upgradePerkLevel(perkId) {
            let curLvl = perkLevels[perkId] || 1;
            if (curLvl >= 3) {
                alert("البيرك وصل بالفعل إلى المستوى الأقصى (المستوى 3)!");
                return;
            }
            let cost = curLvl === 1 ? 15 : 25;
            if (metaCurrency >= cost) {
                metaCurrency -= cost;
                perkLevels[perkId] = curLvl + 1;
                saveGameProgress();
                renderPerksMatrixUI();
                renderArsenalPreviewCanvas();
                updateMetaShopUI();
                playSound('gold');
            } else {
                alert(`تحتاج إلى ${cost} مكعب كريستال لترقية هذا البيرك للمستوى ${curLvl + 1}!`);
            }
        }

        function renderPerksHUD() {
            const dock = document.getElementById('active-perks-dock');
            if (!dock) return;
            dock.innerHTML = '';
            const perksList = ['shield_core', 'hyper_fire', 'chrono_drift'];
            const names = {
                shield_core: ' درع',
                hyper_fire: ' تسريع',
                chrono_drift: ' مكثف'
            };
            for (let p of perksList) {
                let lvl = (perkLevels && perkLevels[p]) || 1;
                let badge = document.createElement('div');
                badge.className = 'perk-badge';
                badge.innerHTML = `${names[p] || p} <span class="auto-perk-badge">L${lvl}</span>`;
                dock.appendChild(badge);
            }
        }

        function renderPerksMatrixUI() {
            let container = document.getElementById('main-perks-grid');
            if (!container) return;
            container.innerHTML = '';
            
            for (let key in MASTER_PERKS) {
                let perk = MASTER_PERKS[key];
                let isEquipped = equippedPerks.includes(key);
                let lvl = (perkLevels && perkLevels[key]) || 1;
                let card = document.createElement('div');
                card.className = `perk-slot-card ${isEquipped ? 'equipped' : ''}`;
                card.onclick = () => toggleEquipPerk(key);
                
                let equipBadge = `<div class="perk-slot-badge ${isEquipped ? 'active' : 'inactive'}">${isEquipped ? '[OK] مجهز في العتاد القتالي' : '+ اضغط للتجهيز في الفتحة'}</div>`;
                let descL1 = perk.desc[0] || 'المستوى 1: تعزيز أساسي';
                let descL2 = perk.desc[1] || 'المستوى 2: تعزيز متقدم مضاعف';
                let descL3 = perk.desc[2] || 'المستوى 3: قوة APEX القصوى';

                card.innerHTML = `
                    ${equipBadge}
                    <div style="font-size: 2.2rem; margin: 6px 0;">${perk.icon}</div>
                    <div class="card-title" style="font-size: 0.96rem; font-weight: 900; color: #fff;">${perk.title}</div>
                    <div class="auto-evolve-tag" style="background: rgba(0, 243, 255, 0.12); border: 1px solid #00f3ff; border-radius: 20px; padding: 2px 10px; font-size: 0.7rem; color: #00f3ff; font-weight: bold; margin: 6px 0;">
                         يتطور تلقائياً أثناء القتال (L1  L3)
                    </div>
                    <div class="perk-tier-descriptions" style="text-align: right; width: 100%; font-size: 0.72rem; color: #8899a6; line-height: 1.4; margin-top: 6px;">
                        <div style="color: #00ff88; margin-bottom: 2px;">• L1: ${descL1}</div>
                        <div style="color: #00f3ff; margin-bottom: 2px;">• L2: ${descL2}</div>
                        <div style="color: #ffd700;">• L3: ${descL3}</div>
                    </div>
                `;
                container.appendChild(card);
            }
        }

        let joystickPointerId = null, joystickBaseX = 0, joystickBaseY = 0, joystickAngle = -Math.PI / 2, joystickPower = 0;
        let aimJoystickPointerId = null, aimJoystickBaseX = 0, aimJoystickBaseY = 0, aimJoystickAngle = -Math.PI / 2, aimJoystickPower = 0;
        let isAimJoystickActive = false;
        let mouseScreenX = window.innerWidth / 2, mouseScreenY = window.innerHeight / 2;
        let mouseWorldX = WORLD_W / 2, mouseWorldY = WORLD_H / 2;
        let isMouseDown = false;
        let hasMouseMoved = false;
        let lastMouseMoveTime = 0;
        const maxRadius = 45;

        function updateJoystickCenter() {
            if (joystickBase) {
                const rect = joystickBase.getBoundingClientRect();
                joystickBaseX = rect.left + rect.width / 2;
                joystickBaseY = rect.top + rect.height / 2;
            }
            if (joystickAimBase) {
                const rectAim = joystickAimBase.getBoundingClientRect();
                aimJoystickBaseX = rectAim.left + rectAim.width / 2;
                aimJoystickBaseY = rectAim.top + rectAim.height / 2;
            }
        }

        const keys = { w: false, a: false, s: false, d: false };

        function saveGameProgress() {
            try {
                localStorage.setItem('chrono_meta_currency' + SAVE_VERSION, metaCurrency);
                localStorage.setItem('chrono_player_xp' + SAVE_VERSION, playerXP);
                localStorage.setItem('chrono_player_level' + SAVE_VERSION, playerLevel);
                localStorage.setItem('chrono_highest_wave' + SAVE_VERSION, highestWaveRecord);
                localStorage.setItem('chrono_meta_upgrades' + SAVE_VERSION, JSON.stringify(metaUpgrades));
                localStorage.setItem('chrono_unlocked_items' + SAVE_VERSION, JSON.stringify(unlockedItems));
                localStorage.setItem('chrono_weapon_levels' + SAVE_VERSION, JSON.stringify(weaponLevels));
                localStorage.setItem('chrono_equipped_perks' + SAVE_VERSION, JSON.stringify(equippedPerks));
                localStorage.setItem('chrono_perk_levels' + SAVE_VERSION, JSON.stringify(perkLevels));
                localStorage.setItem('chrono_achievements' + SAVE_VERSION, JSON.stringify(achievements));
                localStorage.setItem('chrono_contracts' + SAVE_VERSION, JSON.stringify(contracts));
                localStorage.setItem('chrono_selected_class' + SAVE_VERSION, selectedClass);
                localStorage.setItem('chrono_class_weapons' + SAVE_VERSION, JSON.stringify(classWeapons));
                localStorage.setItem('chrono_selected_weapon' + SAVE_VERSION, selectedWeapon);
                if (typeof equippedCosmetics !== 'undefined') {
                    localStorage.setItem('chrono_equipped_cosmetics' + SAVE_VERSION, JSON.stringify(equippedCosmetics));
                }
                if (typeof unlockedCosmeticSkins !== 'undefined') {
                    localStorage.setItem('chrono_skins' + SAVE_VERSION, JSON.stringify(Array.from(unlockedCosmeticSkins)));
                    localStorage.setItem('chrono_unlocked_cosmetics' + SAVE_VERSION, JSON.stringify(Array.from(unlockedCosmeticSkins)));
                }
            } catch(e) {}
        }

        let arsenalAnimFrame = null;
        function renderArsenalPreviewCanvas() {
            cancelAnimationFrame(arsenalAnimFrame);
            const classes = ['assault', 'sniper', 'support', 'engineer'];
            const now = performance.now();

            let activeSkinId = (typeof equippedCosmetics !== 'undefined' && equippedCosmetics.chassis) ? equippedCosmetics.chassis : 'default';
            let wepWrapId = (typeof equippedCosmetics !== 'undefined' && equippedCosmetics.weapon) ? equippedCosmetics.weapon : 'wep_default';

            let wrapCatalog = (typeof COSMETICS_CATALOG !== 'undefined' && COSMETICS_CATALOG.weapons) ? COSMETICS_CATALOG.weapons : [];
            let wrapObj = wrapCatalog.find(w => w.id === wepWrapId);
            let wrapTitle = wrapObj ? wrapObj.title.split(' ')[0] : 'Standard';

            classes.forEach(cId => {
                const canvas = document.getElementById(`arsenal-canvas-${cId}`);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const w = canvas.width, h = canvas.height;
                    ctx.clearRect(0, 0, w, h);

                    ctx.save();
                    ctx.translate(w / 2, h / 2 + 5);

                    // دوران 3D هادئ وانسيابي
                    let rot = (now * 0.0012);
                    ctx.rotate(rot);

                    // لهب وتوهج المحركات النفاثة (خلف مؤخرة السفينة مباشرة دون أي انحراف)
                    let flameLen = 14 + Math.sin(now * 0.015) * 4 + Math.random() * 3;
                    let flameCol = getActiveCosmeticThemeColor(cId);

                    ctx.save();
                    ctx.shadowColor = flameCol;
                    ctx.shadowBlur = (gameSettings.bloom && !gameSettings.lowEnd) ? 14 : 0;

                    if (cId === 'engineer') {
                        // محركان نفاثان خلف العقدتين للهندسة
                        [-16, 16].forEach(offsetX => {
                            let grad = ctx.createLinearGradient(offsetX, 18, offsetX, 18 + flameLen * 0.85);
                            grad.addColorStop(0, '#ffffff');
                            grad.addColorStop(0.3, flameCol);
                            grad.addColorStop(1, 'transparent');

                            ctx.beginPath();
                            ctx.moveTo(offsetX - 4, 18);
                            ctx.lineTo(offsetX, 18 + flameLen * 0.85);
                            ctx.lineTo(offsetX + 4, 18);
                            ctx.closePath();
                            ctx.fillStyle = grad;
                            ctx.fill();
                        });
                    } else if (cId === 'support') {
                        // نفاث خلفي عريض للدعم
                        let grad = ctx.createLinearGradient(0, 22, 0, 22 + flameLen);
                        grad.addColorStop(0, '#ffffff');
                        grad.addColorStop(0.3, flameCol);
                        grad.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.moveTo(-8, 22);
                        ctx.lineTo(0, 22 + flameLen);
                        ctx.lineTo(8, 22);
                        ctx.closePath();
                        ctx.fillStyle = grad;
                        ctx.fill();
                    } else if (cId === 'sniper') {
                        // نفاث إبري مركز للقناص
                        let grad = ctx.createLinearGradient(0, 22, 0, 22 + flameLen * 1.25);
                        grad.addColorStop(0, '#ffffff');
                        grad.addColorStop(0.3, flameCol);
                        grad.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.moveTo(-4, 22);
                        ctx.lineTo(0, 22 + flameLen * 1.25);
                        ctx.lineTo(4, 22);
                        ctx.closePath();
                        ctx.fillStyle = grad;
                        ctx.fill();
                    } else {
                        // نفاث حربي للهجومي
                        let grad = ctx.createLinearGradient(0, 22, 0, 22 + flameLen);
                        grad.addColorStop(0, '#ffffff');
                        grad.addColorStop(0.3, flameCol);
                        grad.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.moveTo(-6, 22);
                        ctx.lineTo(0, 22 + flameLen);
                        ctx.lineTo(6, 22);
                        ctx.closePath();
                        ctx.fillStyle = grad;
                        ctx.fill();
                    }
                    ctx.restore();

                    // رسم هيكل الكلاس مع السكن المطبق عليه فوق لهب النفاثات
                    drawCustomShipGeometry(ctx, activeSkinId, cId, 28, false, false, 0, now);
                    ctx.restore();
                }

                // تحديد السلاح الحصري الخاص بكل كلاس بشكل مستقل تماماً
                let cWepId = (classWeapons && classWeapons[cId]) ? classWeapons[cId] : (CLASS_EXCLUSIVE_WEAPONS[cId] ? CLASS_EXCLUSIVE_WEAPONS[cId].id : 'blaster');
                let cWepCfg = (typeof WEAPON_CONFIGS !== 'undefined' && WEAPON_CONFIGS[cWepId]) ? WEAPON_CONFIGS[cWepId] : { name: 'السلاح المعتمد' };

                // تحديث وسوم السلاح الأساسي والثانوي المستقلة لكل كلاس
                const priVal = document.getElementById(`wtag-pri-${cId}`);
                if (priVal) {
                    priVal.innerText = `${cWepCfg.name.split(' ')[0]} [${wrapTitle}]`;
                }
                const secVal = document.getElementById(`wtag-sec-${cId}`);
                if (secVal) {
                    secVal.innerText = 'مسدس البلازما [2]';
                }

                // تحديث بطاقات البيركات المجهزة النشطة من MASTER_PERKS
                const pTag = document.getElementById(`perks-badge-${cId}`);
                if (pTag) {
                    let perksHtml = '';
                    if (typeof equippedPerks !== 'undefined' && Array.isArray(equippedPerks) && equippedPerks.length > 0) {
                        equippedPerks.forEach(pId => {
                            let pDef = (typeof MASTER_PERKS !== 'undefined' && MASTER_PERKS[pId]) ? MASTER_PERKS[pId] : null;
                            if (pDef) {
                                let shortName = pDef.title;
                                if (shortName.includes('(')) {
                                    shortName = shortName.split('(')[1].replace(')', '').trim();
                                } else {
                                    shortName = shortName.split(' ')[0];
                                }
                                perksHtml += `<span class="perk-tag-mini" title="${pDef.title}">${pDef.icon || ''} ${shortName}</span>`;
                            }
                        });
                    }
                    if (!perksHtml) perksHtml = `<span class="perk-tag-mini" style="color:#64748b; border-color:#334155;">لا توجد بيركات</span>`;
                    pTag.innerHTML = perksHtml;
                }

                // تحديث زر التجهيز وحالة الكارت
                const card = document.getElementById(`card-c-${cId}`);
                const btn = document.getElementById(`btn-equip-${cId}`);
                let isCurrent = (selectedClass === cId);
                if (card) card.classList.toggle('selected', isCurrent);
                if (btn) {
                    btn.className = 'card-equip-action-btn' + (isCurrent ? ' active' : '');
                    btn.innerText = isCurrent ? 'مجهز حالياً [OK]' : 'اختيار الكلاس';
                }
            });

            const arsenalTab = document.getElementById('tab-arsenal');
            if (arsenalTab && arsenalTab.classList.contains('active')) {
                arsenalAnimFrame = requestAnimationFrame(renderArsenalPreviewCanvas);
            }
        }

        window.selectClassAndRefresh = function(cId) {
            selectClass(cId, `card-c-${cId}`);
            playSound('gold');
        };

        function selectClass(type, cardId) {
            selectedClass = type;
            selectedChassis = type;
            selectedWeapon = (classWeapons && classWeapons[type]) ? classWeapons[type] : (CLASS_EXCLUSIVE_WEAPONS[type] ? CLASS_EXCLUSIVE_WEAPONS[type].id : 'blaster');
            saveGameProgress();
            
            document.querySelectorAll('.arsenal-class-card').forEach(c => c.classList.remove('selected'));
            let target = document.getElementById(cardId) || document.getElementById(`card-c-${type}`);
            if (target) target.classList.add('selected');
            renderArsenalPreviewCanvas();
        }
        function selectChassis(type, cardId) {
            selectClass(type, cardId);
        }

        window.openWeaponSelectorModal = function(e, cId) {
            if (e) e.stopPropagation();
            let targetClass = cId || selectedClass || 'assault';
            selectClass(targetClass, `card-c-${targetClass}`);

            const modal = document.getElementById('weapon-picker-modal');
            const grid = document.getElementById('weapon-picker-grid');
            if (!modal || !grid) return;

            grid.innerHTML = '';
            let exclusiveCfg = CLASS_EXCLUSIVE_WEAPONS[targetClass];
            let wKey = exclusiveCfg ? exclusiveCfg.id : 'blaster';
            let wCfg = WEAPON_CONFIGS[wKey];
            if (!wCfg) return;

            let icons = { blaster: '', rapid: '', lmg: '', shotgun: '', railgun: '' };
            let icon = icons[wKey] || '';
            let dmgVal = wKey === 'shotgun' ? '16×6' : wCfg.baseDmg;
            let rpmVal = Math.round(60000 / wCfg.interval);

            let card = document.createElement('div');
            card.className = 'select-card selected';
            card.style.gridColumn = '1 / -1';
            card.style.maxWidth = '420px';
            card.style.margin = '0 auto';

            let classNameAr = (CLASSES_CONFIG[targetClass] && CLASSES_CONFIG[targetClass].name) ? CLASSES_CONFIG[targetClass].name : targetClass;

            card.innerHTML = `
                <div style="font-size:0.75rem; color:#ffd700; font-weight:bold; margin-bottom:6px;"> السلاح التكتيكي الحصري لكلاس ${classNameAr}</div>
                <div class="weapon-card-icon">${icon}</div>
                <div class="card-title">${wCfg.name}</div>
                <div class="card-desc">${exclusiveCfg.role || wCfg.category}</div>
                <div class="weapon-2d-stats">
                    <div class="wstat-row"><span>الضرر:</span><div class="wstat-bar"><div style="width: ${Math.min(100, (wCfg.baseDmg / 120)*100)}%;"></div></div><span class="wstat-val">${dmgVal}</span></div>
                    <div class="wstat-row"><span>الرمي:</span><div class="wstat-bar"><div style="width: ${Math.min(100, (rpmVal / 800)*100)}%;"></div></div><span class="wstat-val">${rpmVal} RPM</span></div>
                    <div class="wstat-row"><span>السرعة:</span><div class="wstat-bar"><div style="width: ${Math.min(100, (wCfg.speed / 38)*100)}%;"></div></div><span class="wstat-val">${wCfg.speed}</span></div>
                    <div class="wstat-row"><span>المخزن:</span><div class="wstat-bar"><div style="width: ${Math.min(100, (wCfg.baseMag / 80)*100)}%;"></div></div><span class="wstat-val">${wCfg.baseMag}</span></div>
                </div>
                <div style="margin-top:12px; font-size:0.75rem; color:#00ff88; font-weight:bold; background:rgba(0,255,136,0.1); border:1px solid #00ff88; border-radius:6px; padding:4px 8px;">
                    [OK] مخصص ومجهز حصرياً لهذا الكلاس بدون التأثير على الكلاسات الأخرى
                </div>
            `;
            grid.appendChild(card);

            modal.classList.remove('hidden');
            isModalActive = true;
        };

        window.closeWeaponSelectorModal = function() {
            const modal = document.getElementById('weapon-picker-modal');
            if (modal) modal.classList.add('hidden');
            isModalActive = false;
        };

        function selectWeapon(weapon, cardId) {
            selectedWeapon = weapon;
            if (classWeapons && selectedClass) {
                classWeapons[selectedClass] = weapon;
            }
            saveGameProgress();
            renderArsenalPreviewCanvas();
        }

        function updateArsenalUI() {
            updateMetaShopUI();
            document.getElementById('menu-level-val').innerText = playerLevel;
            document.getElementById('menu-xp-val').innerText = playerXP;
            renderArsenalPreviewCanvas();
        }

        function checkContracts(currentSec, parriesCount, energyCubesCount) {
            let newlyUnlocked = false;
            if (!contracts.c_survive.unlocked && currentSec >= 45.0) { contracts.c_survive.unlocked = true; metaCurrency += contracts.c_survive.reward; newlyUnlocked = true; }
            if (!contracts.c_parry.unlocked && parriesCount >= 3) { contracts.c_parry.unlocked = true; metaCurrency += contracts.c_parry.reward; newlyUnlocked = true; }
            if (!contracts.c_energy.unlocked && energyCubesCount >= 5) { contracts.c_energy.unlocked = true; metaCurrency += contracts.c_energy.reward; newlyUnlocked = true; }
            if (newlyUnlocked) { saveGameProgress(); playSound('gold'); }
        }

        function renderContractsUI() {
            let container = document.getElementById('contracts-list-container');
            if (!container) return;
            container.innerHTML = '';
            for (let key in contracts) {
                let con = contracts[key], card = document.createElement('div');
                card.className = `contract-card ${con.unlocked ? 'unlocked' : ''}`;
                card.innerHTML = `<div><div class="ach-title">${con.title}</div><div class="ach-desc">${con.desc}</div></div><div class="ach-status ${con.unlocked ? 'done' : 'pending'}">${con.unlocked ? '[OK] مجمع (+ ' + con.reward + ' مكعب)' : ' غير مكتمل'}</div>`;
                container.appendChild(card);
            }
        }

        function renderAchievementsUI() {
            let container = document.getElementById('achievements-list-container');
            if (!container) return;
            container.innerHTML = '';
            for (let key in achievements) {
                let ach = achievements[key], card = document.createElement('div');
                card.className = `achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
                card.innerHTML = `<div><div class="ach-title">${ach.title}</div><div class="ach-desc">${ach.desc}</div></div><div class="ach-status ${ach.unlocked ? 'done' : 'pending'}">${ach.unlocked ? '[OK] مكتمل (+ ' + ach.reward + ' مكعب)' : ' مقفل'}</div>`;
                container.appendChild(card);
            }
        }

        function checkAchievements(currentSec, sessionKillsCount, totalCrystalsCollected, waveNum) {
            let newlyUnlocked = false;
            if (!achievements.survivor.unlocked && currentSec >= 60.0) { achievements.survivor.unlocked = true; metaCurrency += achievements.survivor.reward; newlyUnlocked = true; }
            if (!achievements.brawler.unlocked && sessionKillsCount >= 15) { achievements.brawler.unlocked = true; metaCurrency += achievements.brawler.reward; newlyUnlocked = true; }
            if (!achievements.collector.unlocked && metaCurrency >= 50) { achievements.collector.unlocked = true; metaCurrency += achievements.collector.reward; newlyUnlocked = true; }
            if (achievements.waveMaster && !achievements.waveMaster.unlocked && waveNum >= 6) { achievements.waveMaster.unlocked = true; metaCurrency += achievements.waveMaster.reward; newlyUnlocked = true; }
            if (achievements.apexOverlord && !achievements.apexOverlord.unlocked && waveNum >= 21) { achievements.apexOverlord.unlocked = true; metaCurrency += achievements.apexOverlord.reward; newlyUnlocked = true; }
            if (newlyUnlocked) { saveGameProgress(); playSound('gold'); }
        }

        function updateMetaShopUI() {
            const creditsTag = document.getElementById('shop-credits-display');
            if (creditsTag) creditsTag.innerText = metaCurrency;
            if (typeof renderShopUI === 'function') renderShopUI();
        }

        function buyMetaUpgrade(type) {
            let currentLvl = metaUpgrades[type] || 0, cost = (currentLvl + 1) * 10;
            if (metaCurrency >= cost) { metaCurrency -= cost; metaUpgrades[type] = currentLvl + 1; saveGameProgress(); updateArsenalUI(); playSound('gold'); } else { alert("المكعبات المجمعة غير كافية!"); }
        }

        function getOrInitDeviceToken() {
            let token = localStorage.getItem('chrono_device_token_v80');
            if (!token) {
                token = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
                localStorage.setItem('chrono_device_token_v80', token);
            }
            return token;
        }

        let isUsernameReserved = false;
        let usernameCheckTimer = null;

        // ====================================================================
        
// ===================================================================
// GOOGLE IDENTITY & CLOUD PROGRESS SYNC CLIENT ENGINE
// ===================================================================
let linkedGoogleAccount = null;

try {
    const savedGoogle = localStorage.getItem('chrono_google_account');
    if (savedGoogle) {
        linkedGoogleAccount = JSON.parse(savedGoogle);
    }
} catch (e) {}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

window.handleGoogleCredentialResponse = function(response) {
    if (!response || !response.credential) return;
    const payload = parseJwt(response.credential);
    if (!payload) {
        alert(' تعذر قراءة بيانات حساب Google.');
        return;
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || payload.given_name || 'Agent_Google';
    const picture = payload.picture || '';

    processGoogleAuth(googleId, email, name, picture);
};

function processGoogleAuth(googleId, email, name, picture) {
    linkedGoogleAccount = {
        googleId: googleId,
        email: email,
        name: name,
        picture: picture,
        linkedAt: Date.now()
    };
    localStorage.setItem('chrono_google_account', JSON.stringify(linkedGoogleAccount));

    updateGoogleUI();

    initMultiplayerSocket(true);

    if (socket) {
        socket.emit('google_account_auth', {
            googleId: googleId,
            email: email,
            name: name,
            picture: picture,
            level: playerLevel || 1,
            credits: metaCurrency || 0,
            xp: currentXP || 0,
            deviceToken: getOrInitDeviceToken()
        });
    }
}

window.triggerGoogleSignIn = function() {
    // If Google Identity Services library is loaded, prompt One-Tap / Popup
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        try {
            google.accounts.id.initialize({
                client_id: '1085295123456-google-apps.googleusercontent.com', // Standard GSI Client ID
                callback: window.handleGoogleCredentialResponse,
                auto_select: false
            });
            google.accounts.id.prompt();
            return;
        } catch (err) {
            console.log('Google Identity prompt falling back to direct auth modal:', err);
        }
    }

    // Direct Google Connect Dialog (Instant One-Click Google Linking for Web App)
    const promptEmail = prompt(' أدخل بريدك الإلكتروني في Google للربط والمزامنة السحابية فوراً:', (linkedGoogleAccount ? linkedGoogleAccount.email : 'agent@gmail.com'));
    if (promptEmail && promptEmail.includes('@')) {
        const cleanName = promptEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 18);
        const demoGoogleId = 'g_' + Math.abs(promptEmail.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0));
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`;

        processGoogleAuth(demoGoogleId, promptEmail, cleanName, defaultAvatar);
    }
};

window.unlinkGoogleAccount = function() {
    if (confirm('هل أنت متأكد من رغبتك في إلغاء ربط حساب Google من هذا الجهاز؟')) {
        linkedGoogleAccount = null;
        localStorage.removeItem('chrono_google_account');
        updateGoogleUI();
        alert('[OK] تم إلغاء ربط حساب Google بنجاح.');
    }
};

function updateGoogleUI() {
    const card = document.getElementById('google-linked-profile-card');
    const avatar = document.getElementById('google-user-avatar');
    const nameEl = document.getElementById('google-user-name');
    const emailEl = document.getElementById('google-user-email');

    if (linkedGoogleAccount) {
        if (card) { card.classList.remove('hidden'); card.style.display = 'flex'; }
        if (avatar) avatar.src = linkedGoogleAccount.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${linkedGoogleAccount.name}`;
        if (nameEl) nameEl.innerText = linkedGoogleAccount.name || 'Google Agent';
        if (emailEl) emailEl.innerText = linkedGoogleAccount.email || 'user@gmail.com';
    } else {
        if (card) { card.classList.add('hidden'); card.style.display = 'none'; }
    }
}


// MULTIPLAYER APEX OVERHAUL: RANKS, BOUNTIES, REVIVE & TACTICAL PINGS
        // ====================================================================
        let playerTrophies = parseInt(localStorage.getItem('chrono_player_trophies') || '0', 10);
        let activeBountyKing = null;
        let tacticalFloatingPings = [];
        let pveDownedPlayers = new Map();
        let myOrbitalDrone = null;
        let localReviveProgress = 0;

        function getRankTierClient(trophies = 0) {
            trophies = Math.max(0, Number(trophies) || 0);
            if (trophies >= 3500) return { id: 'grandmaster', name: 'Grandmaster Apex God (إمبراطور الساحة)', badge: '', color: '#ffd700', nextTier: null, nextTrophies: 3500 };
            if (trophies >= 2000) return { id: 'diamond', name: 'Diamond Cyberlord (دياموند سايبر)', badge: '', color: '#00f3ff', nextTier: 'Grandmaster', nextTrophies: 3500 };
            if (trophies >= 1000) return { id: 'gold', name: 'Gold Apex Vanguard (ذهبي نخبوي)', badge: '', color: '#ffaa00', nextTier: 'Diamond', nextTrophies: 2000 };
            if (trophies >= 500) return { id: 'silver', name: 'Silver Striker (مهاجم فضي)', badge: '', color: '#e0e0e0', nextTier: 'Gold', nextTrophies: 1000 };
            return { id: 'bronze', name: 'Bronze Agent (عميل برونزي)', badge: '', color: '#cd7f32', nextTier: 'Silver', nextTrophies: 500 };
        }

        function updatePlayerRankCardUI() {
            const badgeEl = document.getElementById('player-rank-badge');
            const tierNameEl = document.getElementById('player-rank-tier-name');
            const fillEl = document.getElementById('player-rank-fill');
            const trophiesValEl = document.getElementById('player-trophies-val');
            const nextInfoEl = document.getElementById('player-rank-next-info');

            const tier = getRankTierClient(playerTrophies);
            if (badgeEl) badgeEl.innerText = tier.badge;
            if (tierNameEl) {
                tierNameEl.innerText = tier.name;
                tierNameEl.style.color = tier.color;
            }
            if (trophiesValEl) trophiesValEl.innerText = `${playerTrophies} PTS`;

            if (tier.nextTier) {
                let prevTierFloor = tier.id === 'bronze' ? 0 : (tier.id === 'silver' ? 500 : (tier.id === 'gold' ? 1000 : 2000));
                let progressPct = Math.min(100, Math.max(0, ((playerTrophies - prevTierFloor) / (tier.nextTrophies - prevTierFloor)) * 100));
                if (fillEl) fillEl.style.width = `${progressPct}%`;
                if (nextInfoEl) nextInfoEl.innerText = `${tier.nextTrophies - playerTrophies} كأس للترقية إلى ${tier.nextTier}`;
            } else {
                if (fillEl) fillEl.style.width = '100%';
                if (nextInfoEl) nextInfoEl.innerText = 'وصلت لأعلى رتبة أسطورية في الساحة!';
            }
        }

        window.openRankLeaderboardModal = function() {
            const modal = document.getElementById('rank-leaderboard-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
            if (socket && isSocketConnected) {
                socket.emit('get_rank_leaderboard');
            } else {
                renderLocalRankLeaderboard();
            }
        };

        window.closeRankLeaderboardModal = function() {
            const modal = document.getElementById('rank-leaderboard-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        };

        function renderLocalRankLeaderboard() {
            const body = document.getElementById('rank-leaderboard-body');
            if (!body) return;
            const tier = getRankTierClient(playerTrophies);
            body.innerHTML = `
                <tr>
                    <td><strong style="color:#ffd700;">#1 (أنت)</strong></td>
                    <td><strong>${tacticalUsername || 'Apex_Agent'}</strong></td>
                    <td><span style="color:${tier.color}; font-weight:bold;">${tier.badge} ${tier.name.split('(')[0]}</span></td>
                    <td><strong style="color:#ffd700;">${playerTrophies} PTS</strong></td>
                    <td>0</td>
                    <td>0</td>
                </tr>
            `;
        }

        window.showMatchVictoryPodium = function(p1, p2, p3, rewardsText) {
            const modal = document.getElementById('match-podium-modal');
            if (!modal) return;
            const p1Name = document.getElementById('podium-p1-name');
            const p1Stats = document.getElementById('podium-p1-stats');
            const p2Name = document.getElementById('podium-p2-name');
            const p2Stats = document.getElementById('podium-p2-stats');
            const p3Name = document.getElementById('podium-p3-name');
            const p3Stats = document.getElementById('podium-p3-stats');
            const rewSummary = document.getElementById('podium-rewards-summary');

            if (p1Name) p1Name.innerText = (p1 && p1.username) ? p1.username : tacticalUsername;
            if (p1Stats) p1Stats.innerText = (p1 && p1.kills !== undefined) ? `${p1.kills} قتلات • ${p1.score || 0} نقطة` : 'البطل المتوج';

            if (p2Name) p2Name.innerText = (p2 && p2.username) ? p2.username : 'الوصيف الفضي';
            if (p2Stats) p2Stats.innerText = (p2 && p2.kills !== undefined) ? `${p2.kills} قتلات` : '--';

            if (p3Name) p3Name.innerText = (p3 && p3.username) ? p3.username : 'البرونزي الناري';
            if (p3Stats) p3Stats.innerText = (p3 && p3.kills !== undefined) ? `${p3.kills} قتلات` : '--';

            if (rewSummary && rewardsText) rewSummary.innerHTML = rewardsText;

            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            playSound('gold');
        };

        window.closeMatchPodiumModal = function() {
            const modal = document.getElementById('match-podium-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        };

        window.toggleTacticalPingWheel = function(force) {
            const wheel = document.getElementById('tactical-ping-wheel');
            if (!wheel) return;
            if (force !== undefined) {
                if (force) { wheel.classList.remove('hidden'); wheel.style.display = 'flex'; }
                else { wheel.classList.add('hidden'); wheel.style.display = 'none'; }
            } else {
                if (wheel.classList.contains('hidden') || wheel.style.display === 'none') {
                    wheel.classList.remove('hidden');
                    wheel.style.display = 'flex';
                } else {
                    wheel.classList.add('hidden');
                    wheel.style.display = 'none';
                }
            }
        };

        window.triggerTacticalPing = function(type, emote, text) {
            toggleTacticalPingWheel(false);
            if (!socket || !isSocketConnected || !player) {
                // Local demo ping
                if (player) {
                    tacticalFloatingPings.push({
                        senderId: 'local',
                        senderName: tacticalUsername,
                        emote: emote,
                        text: text,
                        x: player.x,
                        y: player.y,
                        life: 3.5
                    });
                    spawnFloatingText(player.x, player.y - 45, `${emote} ${text}`, '#ffd700');
                    playSound('click');
                }
                return;
            }

            socket.emit('send_tactical_ping', {
                type: type,
                emote: emote,
                text: text,
                x: player.x,
                y: player.y
            });

            playSound('click');
        };

        function addKillFeedEntry(killerName, victimName, weapon, streak, isBountyClaim) {
            const feedContainer = document.getElementById('cyber-kill-feed');
            if (!feedContainer) return;

            const item = document.createElement('div');
            item.className = 'kill-feed-item' + (isBountyClaim ? ' bounty-feed' : '');

            let weaponIcon = '';
            if (weapon === 'rapid') weaponIcon = '';
            else if (weapon === 'lmg') weaponIcon = '';
            else if (weapon === 'shotgun') weaponIcon = '';
            else if (weapon === 'railgun') weaponIcon = '';
            else if (weapon === 'secondary_pistol') weaponIcon = '';

            let bountyHtml = isBountyClaim ? '<span class="kf-bounty-tag"> أسقط الهدف المطلوب</span> ' : '';
            let streakHtml = (streak && streak >= 3) ? ` <span style="color:#ffd700; font-size:0.68rem;">[x${streak} ]</span>` : '';

            item.innerHTML = `${bountyHtml}<span class="kf-killer">${killerName}</span> <span class="kf-weapon">${weaponIcon}</span> <span class="kf-victim">${victimName}</span>${streakHtml}`;

            feedContainer.appendChild(item);

            while (feedContainer.children.length > 5) {
                feedContainer.removeChild(feedContainer.firstChild);
            }

            setTimeout(() => {
                item.style.opacity = '0';
                setTimeout(() => {
                    if (item.parentNode) item.parentNode.removeChild(item);
                }, 400);
            }, 4500);
        }

        function checkUsernameAvailability(name) {
            name = (name || '').trim().substring(0, 20);
            const tag = document.getElementById('player-status-tag');
            const input = document.getElementById('player-username-input');
            if (!name) {
                isUsernameReserved = true;
                if (tag) { tag.innerText = ' اكتب اسمك'; tag.style.color = '#ff0055'; }
                return;
            }

            if (socket && isSocketConnected) {
                socket.emit('check_username_availability', {
                    username: name,
                    deviceToken: getOrInitDeviceToken()
                });
            } else {
                isUsernameReserved = false;
                if (tag) {
                    tag.innerText = ' وضع اللعب المستقل (جاهز)';
                    tag.style.color = '#00ff88';
                }
            }
        }

        function updateTacticalUsernameFromInput() {
            const input = document.getElementById('player-username-input');
            if (input && input.value.trim()) {
                tacticalUsername = input.value.trim().substring(0, 20);
                localStorage.setItem('chrono_tactical_username', tacticalUsername);
                
                // Debounce server check
                clearTimeout(usernameCheckTimer);
                usernameCheckTimer = setTimeout(() => {
                    checkUsernameAvailability(tacticalUsername);
                }, 280);
            }
        }

        function startSelectedMode(mode) {
            updateTacticalUsernameFromInput();
            if (isUsernameReserved && mode !== 'offline') {
                alert(' هذا الاسم محجوز لعميل آخر! يرجى اختيار اسم فريد أو تسجيل الدخول السحابي برمز PIN.');
                return;
            }
            activeGameMode = mode;
            startGame();
        }

        function joinMultiplayerMode(mode) {
            updateTacticalUsernameFromInput();
            if (isUsernameReserved) {
                alert(' هذا الاسم محجوز لعميل آخر! يرجى كتابة اسم فريد أو تسجيل الدخول السحابي.');
                return;
            }
            activeGameMode = mode;

            if (typeof io === 'undefined') {
                alert(' لم يتم العثور على خادم اللعب الجماعي (Socket.IO). يرجى تشغيل server.js أولاً أو التأكد من الاتصال بالإنترنت.');
                activeGameMode = 'offline';
                startGame();
                return;
            }

            initMultiplayerSocket(true);

            if (socket) {
                socket.emit('join_game_mode', {
                    mode: mode,
                    username: tacticalUsername,
                    chassis: selectedChassis,
                    weapon: selectedWeapon,
                    skin: activeCosmeticSkin,
                    deviceToken: getOrInitDeviceToken()
                });
            }

            startGame();
        }

        const APEX_CLOUD_SERVER = 'https://xrtm8.onrender.com';

        function getSocketServerUrl() {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return window.location.origin;
            }
            if (window.location.protocol === 'file:' || !window.location.host) {
                return APEX_CLOUD_SERVER;
            }
            return window.location.origin;
        }

        function initMultiplayerSocket(forceConnect = false) {
            if (typeof io === 'undefined') {
                return;
            }
            if (!forceConnect && activeGameMode === 'offline' && window.location.protocol !== 'file:') {
                const tag = document.getElementById('player-status-tag');
                if (tag) { tag.innerText = ' وضع أوفلاين'; tag.style.color = '#00f3ff'; }
                return;
            }
            if (socket && (socket.connected || socket.connecting)) return;

            try {
                const serverUrl = getSocketServerUrl();
                socket = io(serverUrl, {
                    autoConnect: true,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000,
                    timeout: 8000,
                    transports: ['polling', 'websocket']
                });

                socket.on('connect_error', () => {
                    isSocketConnected = false;
                    const tag = document.getElementById('player-status-tag');
                    if (tag) { tag.innerText = ' جاري الاتصال بالسحابة...'; tag.style.color = '#ffd700'; }
                });

                socket.on('connect', () => {
                    isSocketConnected = true;
                    console.log(' [Multiplayer] Connected to Chrono Drift Server:', socket.id);
                    const tag = document.getElementById('player-status-tag');
                    if (tag) { tag.innerText = '[ONLINE] متصل بالسحابة'; tag.style.color = '#00ff88'; }
                    checkUsernameAvailability(tacticalUsername);
                });

                socket.on('username_check_result', (data) => {
                    const tag = document.getElementById('player-status-tag');
                    const input = document.getElementById('player-username-input');
                    if (data.available) {
                        isUsernameReserved = false;
                        if (tag) {
                            tag.innerText = data.isOwner ? '[OK] اسمك المعتمد' : '[OK] متاح للقتال';
                            tag.style.color = '#00ff88';
                            tag.style.borderColor = 'rgba(0, 255, 136, 0.4)';
                            tag.style.background = 'rgba(0, 255, 136, 0.12)';
                        }
                        if (input) input.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                    } else {
                        isUsernameReserved = true;
                        if (tag) {
                            tag.innerText = ' الاسم محجوز';
                            tag.style.color = '#ff0055';
                            tag.style.borderColor = 'rgba(255, 0, 85, 0.5)';
                            tag.style.background = 'rgba(255, 0, 85, 0.15)';
                        }
                        if (input) input.style.borderColor = '#ff0055';
                    }
                });

                socket.on('username_rejected', (data) => {
                    isUsernameReserved = true;
                    const tag = document.getElementById('player-status-tag');
                    if (tag) {
                        tag.innerText = ' الاسم محجوز';
                        tag.style.color = '#ff0055';
                    }
                    alert(data.reason || ' هذا الاسم محجوز لعميل آخر!');
                    if (activeGameMode !== 'offline') {
                        isGameOver = true;
                        showScreen(mainMenu);
                    }
                });

                
                // Custom Rooms & Lobbies Listeners
                socket.on('custom_room_created', (data) => {
                    closeCustomRoomModal();
                    activeCustomRoom = {
                        roomId: data.roomId,
                        roomCode: data.roomCode,
                        mode: data.mode,
                        isHost: true
                    };
                    const lobbyModal = document.getElementById('custom-lobby-modal');
                    const codeTag = document.getElementById('lobby-room-code-tag');
                    const modeTag = document.getElementById('lobby-mode-name');
                    const hostBtn = document.getElementById('lobby-start-match-btn');

                    if (codeTag) codeTag.innerText = `ROOM: ${data.roomCode} `;
                    if (modeTag) modeTag.innerText = data.mode.replace('online_', '').toUpperCase();
                    if (hostBtn) hostBtn.style.display = 'block';

                    if (lobbyModal) {
                        lobbyModal.classList.remove('hidden');
                        lobbyModal.style.display = 'flex';
                    }

                    // Auto-join socket to created room
                    socket.emit('join_game_mode', {
                        mode: data.roomId,
                        username: tacticalUsername,
                        chassis: selectedChassis,
                        weapon: selectedWeapon,
                        skin: activeCosmeticSkin,
                        deviceToken: getOrInitDeviceToken()
                    });
                });

                socket.on('custom_room_join_result', (data) => {
                    if (data.success) {
                        closeCustomRoomModal();
                        activeCustomRoom = {
                            roomId: data.roomId,
                            roomCode: data.roomCode,
                            mode: data.mode,
                            isHost: data.isHost
                        };
                        const lobbyModal = document.getElementById('custom-lobby-modal');
                        const codeTag = document.getElementById('lobby-room-code-tag');
                        const modeTag = document.getElementById('lobby-mode-name');
                        const hostBtn = document.getElementById('lobby-start-match-btn');

                        if (codeTag) codeTag.innerText = `ROOM: ${data.roomCode} `;
                        if (modeTag) modeTag.innerText = data.mode.replace('online_', '').toUpperCase();
                        if (hostBtn) hostBtn.style.display = data.isHost ? 'block' : 'none';

                        if (lobbyModal) {
                            lobbyModal.classList.remove('hidden');
                            lobbyModal.style.display = 'flex';
                        }

                        socket.emit('join_game_mode', {
                            mode: data.roomId,
                            username: tacticalUsername,
                            chassis: selectedChassis,
                            weapon: selectedWeapon,
                            skin: activeCosmeticSkin,
                            deviceToken: getOrInitDeviceToken()
                        });
                    } else {
                        const errorTag = document.getElementById('cr-join-error-msg');
                        if (errorTag) {
                            errorTag.innerText = data.message || ' فشل الانضمام للغرفة!';
                            errorTag.style.color = '#ff0055';
                        }
                    }
                });

                socket.on('lobby_chat_broadcast', (data) => {
                    const chatBox = document.getElementById('lobby-chat-messages');
                    if (chatBox) {
                        const row = document.createElement('div');
                        row.className = 'lobby-chat-msg';
                        row.innerHTML = `<strong style="color:#00f3ff;">${escapeHtml(data.username)}:</strong> ${escapeHtml(data.message)}`;
                        chatBox.appendChild(row);
                        chatBox.scrollTop = chatBox.scrollHeight;
                    }
                });

                socket.on('lobby_ready_update', (data) => {
                    const grid = document.getElementById('lobby-players-grid');
                    // Refresh lobby squad grid
                });

                socket.on('custom_match_started', (data) => {
                    const lobbyModal = document.getElementById('custom-lobby-modal');
                    if (lobbyModal) {
                        lobbyModal.classList.add('hidden');
                        lobbyModal.style.display = 'none';
                    }
                    activeGameMode = data.mode || 'online_coop';
                    startGame();
                });

                // Time Anomalies Listeners
                socket.on('room_anomaly_spawned', (anomaly) => {
                    activeTimeAnomalies.push(anomaly);
                    const banner = document.getElementById('time-anomaly-banner');
                    const icon = document.getElementById('anomaly-banner-icon');
                    const title = document.getElementById('anomaly-banner-title');
                    const desc = document.getElementById('anomaly-banner-desc');

                    if (banner) {
                        banner.classList.remove('hidden');
                        banner.style.display = 'flex';
                        if (anomaly.type === 'stasis') {
                            if (icon) icon.innerText = '';
                            if (title) title.innerText = (currentLanguage === 'ar' ? ' انشقاق زمني: حقل التباطؤ مفعل!' : ' Chrono Rift: Time Stasis Field Active!');
                            if (desc) desc.innerText = (currentLanguage === 'ar' ? 'تباطؤ حركة المقذوفات بنسبة 75% في القطاع المضاء' : 'Projectile speed reduced by 75% inside the zone');
                        } else if (anomaly.type === 'hyper_surge') {
                            if (icon) icon.innerText = '';
                            if (title) title.innerText = (currentLanguage === 'ar' ? ' عاصفة السرعة القصوى نشطة!' : ' Hyper-Speed Surge Active!');
                            if (desc) desc.innerText = (currentLanguage === 'ar' ? 'زيادة هائلة في سرعة السفينة ومعدل إطلاق الليزر' : 'Massive ship speed and fire rate surge');
                        } else {
                            if (icon) icon.innerText = '';
                            if (title) title.innerText = (currentLanguage === 'ar' ? ' إنزال كمي أسطوري هبط في الساحة!' : ' Legendary Quantum Supply Drop Inbound!');
                            if (desc) desc.innerText = (currentLanguage === 'ar' ? 'توجه لموقع الصندوق للاستحواذ على الكريستال والدرع' : 'Capture the supply beacon for instant rewards');
                        }

                        setTimeout(() => {
                            if (banner) banner.style.display = 'none';
                        }, 5000);
                    }
                    playSound('gold');
                });

                socket.on('room_anomaly_claimed', (data) => {
                    spawnFloatingText(width / 2, height / 2 - 100, `+ استحوذ ${data.claimerName} على الإنزال الكمي!`, '#ffd700');
                    playSound('crystal');
                });



                socket.on('google_auth_result', (data) => {
                    const msgEl = document.getElementById('cloud-auth-msg');
                    if (data.success && data.profile) {
                        if (msgEl) {
                            msgEl.innerText = data.message || '[OK] تمت المزامنة عبر Google بنجاح!';
                            msgEl.style.color = '#00ff88';
                        }

                        // Sync profile state locally
                        if (data.profile.credits !== undefined) {
                            metaCurrency = Math.max(metaCurrency, data.profile.credits);
                            saveGameProgress();
                        }
                        if (data.profile.level !== undefined) {
                            playerLevel = Math.max(playerLevel, data.profile.level);
                        }
                        if (data.profile.xp !== undefined) {
                            currentXP = data.profile.xp;
                        }
                        if (data.profile.trophies !== undefined) {
                            playerTrophies = data.profile.trophies;
                            updatePlayerRankCardUI();
                        }
                        if (data.profile.username) {
                            tacticalUsername = data.profile.username;
                            const input = document.getElementById('player-username-input');
                            if (input) input.value = tacticalUsername;
                        }

                        updateGoogleUI();
                        playSound('gold');
                        spawnFloatingText(width / 2, height / 2, '[OK] تمت المزامنة السحابية عبر Google!', '#00ff88');
                    } else {
                        if (msgEl) {
                            msgEl.innerText = data.message || ' فشل الربط بحساب Google.';
                            msgEl.style.color = '#ff0055';
                        }
                    }
                });


socket.on('disconnect', () => {
                    isSocketConnected = false;
                    console.log('[X] [Multiplayer] Disconnected from server');
                    const tag = document.getElementById('player-status-tag');
                    if (tag) { tag.innerText = '[LAG] غير متصل'; tag.style.color = '#ff0055'; }
                    remotePlayers.clear();
                });

                socket.on('server_presence', (data) => {
                    const totalVal = document.getElementById('online-count-val');
                    const pveVal = document.getElementById('pve-count-val');
                    const pvpVal = document.getElementById('pvp-count-val');
                    if (totalVal) totalVal.innerText = data.total || 1;
                    if (pveVal) pveVal.innerText = data.pve || 0;
                    if (pvpVal) pvpVal.innerText = data.pvp || 0;

                    // Update admin telemetry if open
                    const admTotal = document.getElementById('adm-stat-total');
                    const admPve = document.getElementById('adm-stat-pve');
                    const admPvp = document.getElementById('adm-stat-pvp');
                    if (admTotal) admTotal.innerText = data.total || 1;
                    if (admPve) admPve.innerText = data.pve || 0;
                    if (admPvp) admPvp.innerText = data.pvp || 0;
                });

                socket.on('latency_pong', (clientTs) => {
                    const rtt = Math.max(1, Math.round(performance.now() - clientTs));
                    const pingTag = document.getElementById('online-ping-tag');
                    if (pingTag) {
                        pingTag.innerText = `[ONLINE] ${rtt}ms`;
                        pingTag.style.color = rtt < 60 ? '#00ff88' : (rtt < 120 ? '#00f3ff' : '#ffaa00');
                    }
                });

                socket.on('current_room_state', (data) => {
                    remotePlayers.clear();
                    if (data && data.players) {
                        data.players.forEach(p => {
                            if (p.id !== socket.id) {
                                remotePlayers.set(p.id, {
                                    ...p,
                                    targetX: p.x,
                                    targetY: p.y,
                                    targetFacingAngle: p.facingAngle || 0,
                                    radius: 18,
                                    score: p.score || 0,
                                    kills: p.kills || 0
                                });
                            }
                        });
                        updateOnlineLeaderboardUI(data.players);
                    }
                });

                socket.on('player_joined', (p) => {
                    if (p.id === socket.id) return;
                    remotePlayers.set(p.id, {
                        ...p,
                        targetX: p.x,
                        targetY: p.y,
                        targetFacingAngle: p.facingAngle || 0,
                        radius: 18,
                        score: p.score || 0,
                        kills: p.kills || 0
                    });
                    spawnFloatingText(p.x, p.y - 40, `+ انضم العميل ${p.username}`, '#00ff88');
                });

                socket.on('player_left', (data) => {
                    if (remotePlayers.has(data.id)) {
                        let rp = remotePlayers.get(data.id);
                        spawnFloatingText(rp.x, rp.y - 40, `- غادر ${data.username || 'العميل'}`, '#ff0055');
                        remotePlayers.delete(data.id);
                    }
                });

                socket.on('room_tick_sync', (playersList) => {
                    if (!playersList) return;
                    playersList.forEach(p => {
                        if (p.id === socket.id) return;
                        let existing = remotePlayers.get(p.id);
                        if (existing) {
                            existing.targetX = p.x;
                            existing.targetY = p.y;
                            existing.targetFacingAngle = p.facingAngle;
                            existing.vx = p.vx;
                            existing.vy = p.vy;
                            existing.health = p.health;
                            existing.maxHealth = p.maxHealth;
                            existing.chassis = p.chassis;
                            existing.weapon = p.weapon;
                            existing.overchargeActive = p.overchargeActive;
                            existing.isDashing = p.isDashing;
                            existing.isFiringUlt = p.isFiringUlt;
                            existing.skin = p.skin;
                            existing.username = p.username;
                            existing.score = p.score || 0;
                            existing.kills = p.kills || 0;
                        } else {
                            remotePlayers.set(p.id, {
                                ...p,
                                targetX: p.x,
                                targetY: p.y,
                                targetFacingAngle: p.facingAngle || 0,
                                radius: 18,
                                score: p.score || 0,
                                kills: p.kills || 0
                            });
                        }
                    });
                    updateOnlineLeaderboardUI(playersList);
                });

                socket.on('remote_shoot', (data) => {
                    spawnPlayerBullet(data.x, data.y, data.angle, data.speed, data.damage, data.isParried, data.isPiercing, true, true);
                    playSound('shoot');
                });

                socket.on('remote_action', (data) => {
                    if (data.type === 'dash') {
                        createExplosion(data.x, data.y, colors.dash, 25, 14);
                        triggerShockwave(data.x, data.y, colors.dash, 150);
                    } else if (data.type === 'emp') {
                        createExplosion(data.x, data.y, colors.energy, 80, 22);
                        triggerShockwave(data.x, data.y, colors.energy, 320);
                    }
                });

                // PVP Fair Damage Resolution
                socket.on('pvp_take_damage', (data) => {
                    if (player && !isGameOver) {
                        // تفادي أثناء الداش (Dash Invulnerability / Graze Dodge)
                        if (player.dashInvulnerableTimer > 0) {
                            spawnFloatingText(player.x, player.y - 30, ` مراوغة خارقة (DODGED)!`, '#00f3ff');
                            playSound('parry');
                            return;
                        }

                        let isFatal = player.takeHit({ x: player.x, y: player.y, radius: 4 });
                        createExplosion(player.x, player.y, '#ff0055', 22, 10);
                        spawnFloatingText(player.x, player.y - 30, `-${Math.round(data.damage)} HP [${data.attackerName}]`, '#ff0055');
                        
                        if (isFatal || player.shieldCharges <= 0) {
                            if (activeGameMode === 'online_pvp') {
                                handlePvpLocalElimination(data.attackerName, data.attackerId, data.weapon);
                            } else {
                                triggerGameOver();
                            }
                            socket.emit('pvp_player_eliminated', { killerName: data.attackerName, killerId: data.attackerId, weapon: data.weapon });
                        }
                    }
                });

                socket.on('pvp_hit_effect', (data) => {
                    createExplosion(data.x, data.y, '#ff00ea', 14, 6);
                });

                socket.on('pvp_elimination_announcement', (data) => {
                    addKillFeedEntry(data.killerName, data.victimName, data.weapon, data.streak, data.isBountyClaim);
                    playSound('explosion');
                });

                socket.on('kill_feed_event', (data) => {
                    addKillFeedEntry(data.killerName, data.victimName, data.weapon, data.streak, data.isBountyClaim);
                });

                socket.on('bounty_target_updated', (data) => {
                    activeBountyKing = data;
                    const banner = document.getElementById('bounty-target-banner');
                    const agentVal = document.getElementById('bounty-agent-val');
                    const streakVal = document.getElementById('bounty-streak-val');
                    const rewardVal = document.getElementById('bounty-reward-val');

                    if (!data) {
                        if (banner) banner.classList.add('hidden');
                    } else {
                        if (banner) banner.classList.remove('hidden');
                        if (agentVal) agentVal.innerText = data.targetName;
                        if (streakVal) streakVal.innerText = data.streak;
                        if (rewardVal) rewardVal.innerText = data.rewardCredits || 500;
                        playSound('gold');
                    }
                });

                socket.on('tactical_ping_broadcast', (data) => {
                    tacticalFloatingPings.push({
                        senderId: data.senderId,
                        senderName: data.senderName,
                        emote: data.emote || '',
                        text: data.text || '',
                        x: data.x,
                        y: data.y,
                        life: 3.5
                    });
                    playSound('powerup');
                    spawnFloatingText(data.x, data.y - 45, `${data.emote} ${data.senderName}: ${data.text}`, '#ffd700');
                });

                socket.on('pve_downed_alert', (data) => {
                    pveDownedPlayers.set(data.id, {
                        ...data,
                        downedTimer: data.bleedoutSeconds || 15
                    });

                    const banner = document.getElementById('pve-downed-banner');
                    const agentVal = document.getElementById('downed-agent-val');
                    const timerVal = document.getElementById('downed-timer-val');

                    if (banner) banner.classList.remove('hidden');
                    if (agentVal) agentVal.innerText = data.username;
                    if (timerVal) timerVal.innerText = data.bleedoutSeconds || 15;
                    playSound('shield');
                });

                socket.on('pve_revive_success', (data) => {
                    pveDownedPlayers.delete(data.targetId);
                    const banner = document.getElementById('pve-downed-banner');
                    if (pveDownedPlayers.size === 0 && banner) banner.classList.add('hidden');

                    createExplosion(player ? player.x : 0, player ? player.y : 0, '#00ff88', 35, 12);
                    spawnFloatingText(player ? player.x : width / 2, player ? player.y - 45 : height / 2, `[OK] تم إنعاش ${data.targetName} بواسطة ${data.reviverName}!`, '#00ff88');
                    playSound('heal');
                });

                socket.on('pve_reviver_reward', (data) => {
                    metaCurrency += data.credits || 100;
                    playerXP += data.xp || 150;
                    sessionXP += data.xp || 150;
                    spawnFloatingText(player ? player.x : width / 2, player ? player.y - 60 : height / 2, `+${data.credits}  مكافأة المسعف!`, '#00ff88');
                    playSound('gold');
                });

                socket.on('rank_leaderboard_data', (data) => {
                    const body = document.getElementById('rank-leaderboard-body');
                    if (!body) return;
                    if (!data || !data.leaderboard || data.leaderboard.length === 0) {
                        renderLocalRankLeaderboard();
                        return;
                    }

                    body.innerHTML = data.leaderboard.map(row => {
                        let rankClass = row.rank === 1 ? 'color:#ffd700; font-weight:bold;' : (row.rank === 2 ? 'color:#e0e0e0; font-weight:bold;' : (row.rank === 3 ? 'color:#cd7f32; font-weight:bold;' : ''));
                        return `
                            <tr>
                                <td style="${rankClass}">#${row.rank}</td>
                                <td><strong>${row.username}</strong></td>
                                <td><span style="color:${row.tier.color}; font-weight:bold;">${row.tier.badge} ${row.tier.name.split('(')[0]}</span></td>
                                <td><strong style="color:#ffd700;">${row.trophies} PTS</strong></td>
                                <td>${row.kills}</td>
                                <td>${row.revives}</td>
                            </tr>
                        `;
                    }).join('');
                });

                socket.on('pvp_kill_reward', (data) => {
                    playerXP += data.bountyXP || 100;
                    sessionXP += data.bountyXP || 100;
                    metaCurrency += data.bountyCredits || 50;
                    playerTrophies += data.bountyTrophies || 25;
                    localStorage.setItem('chrono_player_trophies', playerTrophies);
                    updatePlayerRankCardUI();

                    score += 500;
                    sessionKills++; checkAutoPerkProgression();
                    playSound('gold');

                    let streakMsg = data.isBountyClaim ? ` إسقاط الهدف الملكي المطلوب (+${data.bountyCredits}  / +${data.bountyTrophies} PTS)!` : (data.streak >= 3 ? `  CYBER RAMPAGE x${data.streak}!` : `  ENEMY ELIMINATED (+${data.bountyTrophies || 25} PTS)!`);
                    spawnFloatingText(player ? player.x : width / 2, player ? player.y - 45 : height / 2, streakMsg, '#ffd700');
                    
                    if (data.streakPerk) {
                        spawnFloatingText(player ? player.x : width / 2, player ? player.y - 70 : height / 2, ` ${data.streakPerk.name}`, '#00f3ff');
                        if (data.streakPerk.type === 'ORBITAL_DRONE') {
                            myOrbitalDrone = { life: 18000, angle: 0, lastShot: 0 };
                        } else if (data.streakPerk.type === 'SHIELD_BURST') {
                            if (player) player.shieldCharges = Math.min(player.maxShieldCharges, player.shieldCharges + 2);
                        } else if (data.streakPerk.type === 'TACTICAL_NUKE') {
                            if (player) { player.ultCharge = 100; updateUltButtonUI(); }
                        }
                    }

                    if (gameSettings.shake) screenShakeTime = 250;
                });

                socket.on('player_respawned', (data) => {
                    createExplosion(data.x, data.y, '#00ff88', 35, 14);
                    triggerShockwave(data.x, data.y, '#00ff88', 220);
                    spawnFloatingText(data.x, data.y - 40, ` عاد ${data.username} للساحة!`, '#00ff88');
                });

                // Server Global Announcement
                socket.on('server_global_announcement', (data) => {
                    showGlobalAnnouncement(data.message, data.sender);
                });

                // Cosmetic Gift Received
                socket.on('gift_received', (data) => {
                    showGiftNotification(data.skinName || data.skinId);
                    if (data.skinId && !ownedCosmeticSkins.includes(data.skinId)) {
                        ownedCosmeticSkins.push(data.skinId);
                        localStorage.setItem('chrono_skins' + SAVE_VERSION, JSON.stringify(ownedCosmeticSkins));
                    }
                });

                // Kicked or Banned
                socket.on('kicked_notification', (data) => {
                    alert(` تم طردك من السيرفر: ${data.reason}`);
                    returnToMainMenu();
                });

                socket.on('banned_notification', (data) => {
                    alert(` تم حظر حسابك / عنوان IP الخاص بك: ${data.reason}`);
                    returnToMainMenu();
                });

                // Admin Events
                socket.on('admin_auth_success', (data) => {
                    isUserAdmin = true;
                    closeAdminLoginModal();
                    openAdminPanel();
                    updateAdminPlayerListUI(data.players || []);
                    showAdminFeedback(' تم توثيق هويتك كمسؤول مطلق للنظام!');
                });

                socket.on('admin_auth_failed', (data) => {
                    const msgTag = document.getElementById('admin-login-msg');
                    if (msgTag) msgTag.innerText = data.message || 'رمز الدخول غير صحيح!';
                });

                socket.on('admin_players_update', (players) => {
                    updateAdminPlayerListUI(players);
                });

                socket.on('admin_action_result', (res) => {
                    showAdminFeedback((res.success ? '[OK] ' : '[X] ') + res.message);
                });

                // Cloud Account Sync Events
                socket.on('cloud_auth_result', (data) => {
                    const msg = document.getElementById('cloud-auth-msg');
                    if (data.success && data.profile) {
                        if (msg) {
                            msg.style.color = '#00ff88';
                            msg.innerText = data.message || '[OK] تم تسجيل الدخول واسترجاع الحساب بنجاح!';
                        }
                        tacticalUsername = data.profile.username;
                        const nameInput = document.getElementById('player-username-input');
                        if (nameInput) nameInput.value = tacticalUsername;
                        localStorage.setItem('chrono_tactical_username' + SAVE_VERSION, tacticalUsername);

                        if (data.profile.credits !== undefined) metaCurrency = Number(data.profile.credits);
                        if (data.profile.xp !== undefined) playerXP = Number(data.profile.xp);
                        if (data.profile.level !== undefined) playerLevel = Number(data.profile.level);
                        if (data.profile.trophies !== undefined) {
                            playerTrophies = Number(data.profile.trophies);
                            localStorage.setItem('chrono_player_trophies', playerTrophies);
                        }
                        if (data.profile.highest_wave !== undefined) highestWaveRecord = Number(data.profile.highest_wave);
                        if (Array.isArray(data.profile.unlocked_skins)) {
                            data.profile.unlocked_skins.forEach(s => unlockedCosmeticSkins.add(s));
                        }
                        
                        saveGameProgress();
                        updateArsenalUI();
                        updateSettingsUI();
                        updatePlayerRankCardUI();
                        playSound('gold');
                        spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, ` تم تحميل حساب ${tacticalUsername} (المستوى ${playerLevel})!`, '#00ff88');
                        setTimeout(() => { closeCloudAccountModal(); }, 1200);
                    } else {
                        if (msg) {
                            msg.style.color = '#ff0055';
                            msg.innerText = data.message || 'خطأ في المصادقة!';
                        }
                        playSound('shield');
                    }
                });

                socket.on('cloud_sync_ack', () => {
                    console.log(' [Cloud Sync] Profile synced successfully with server.');
                });

            } catch (err) {
                console.error('Socket init error:', err);
            }
        }

        // ====================================================================
        // ONLINE FAIR PVP RESPAWN, KILL FEED & LEADERBOARD CONTROLLERS
        // ====================================================================
        let pvpRespawnCountdownTimer = null;
        function handlePvpLocalElimination(killerName, killerId, weapon) {
            const respawnModal = document.getElementById('pvp-respawn-modal');
            const killerNameEl = document.getElementById('respawn-killer-name');
            const countdownEl = document.getElementById('respawn-countdown-val');
            
            if (killerNameEl) killerNameEl.innerText = killerName || 'Rival Agent';
            if (respawnModal) respawnModal.classList.remove('hidden');
            
            let secondsLeft = 3;
            if (countdownEl) countdownEl.innerText = secondsLeft;
            
            if (pvpRespawnCountdownTimer) clearInterval(pvpRespawnCountdownTimer);
            pvpRespawnCountdownTimer = setInterval(() => {
                secondsLeft--;
                if (countdownEl) countdownEl.innerText = Math.max(0, secondsLeft);
                if (secondsLeft <= 0) {
                    clearInterval(pvpRespawnCountdownTimer);
                    pvpRespawnCountdownTimer = null;
                    executeManualPvpRespawn();
                }
            }, 1000);
        }

        function executeManualPvpRespawn() {
            if (pvpRespawnCountdownTimer) {
                clearInterval(pvpRespawnCountdownTimer);
                pvpRespawnCountdownTimer = null;
            }
            const respawnModal = document.getElementById('pvp-respawn-modal');
            if (respawnModal) respawnModal.classList.add('hidden');
            
            if (!player) player = new Player(selectedWeapon, selectedClass);
            player.x = 1600 + (Math.random() - 0.5) * 600;
            player.y = 1600 + (Math.random() - 0.5) * 600;
            player.vx = 0; player.vy = 0;
            player.shieldCharges = player.shieldLevel;
            player.hasShield = true;
            player.invulnerableTimer = 3000; // 3-second spawn protection shield!
            
            createExplosion(player.x, player.y, '#00f3ff', 35, 14);
            triggerShockwave(player.x, player.y, '#00f3ff', 240);
            playSound('portal');
            spawnFloatingText(player.x, player.y - 45, ' تم إعادة النشر + درع حماية نشط!', '#00ff88');

            if (socket && isSocketConnected) {
                socket.emit('player_respawn', { x: player.x, y: player.y });
            }
        }

        function showKillFeedItem(victimName, killerName, weapon = 'blaster') {
            const feedContainer = document.getElementById('online-kill-feed');
            if (!feedContainer) return;
            const item = document.createElement('div');
            item.className = 'kill-feed-item';
            const weaponIcon = weapon === 'railgun' ? '' : (weapon === 'shotgun' ? '' : (weapon === 'rapid' ? '' : ''));
            item.innerHTML = `<span style="color:#00f3ff;">${killerName}</span> <span style="color:#ffd700;">${weaponIcon}</span> <span style="color:#ff0055;">${victimName}</span>`;
            feedContainer.appendChild(item);
            setTimeout(() => { if (item.parentNode) item.parentNode.removeChild(item); }, 4000);
        }

        function updateOnlineLeaderboardUI(playersList) {
            const dock = document.getElementById('online-leaderboard-dock');
            const entries = document.getElementById('leaderboard-entries');
            if (!dock || !entries) return;
            if (!isMultiplayerMode()) {
                dock.style.display = 'none';
                return;
            }
            dock.style.display = 'block';
            
            let all = Array.isArray(playersList) ? [...playersList] : [];
            if (player && socket) {
                let localEntry = all.find(p => p.id === socket.id);
                if (!localEntry) {
                    all.push({
                        id: socket.id,
                        username: tacticalUsername,
                        kills: sessionKills,
                        score: Math.floor(score)
                    });
                }
            }
            all.sort((a, b) => (b.kills || 0) - (a.kills || 0) || (b.score || 0) - (a.score || 0));
            
            let html = '';
            all.slice(0, 4).forEach((p, idx) => {
                let isSelf = socket && p.id === socket.id;
                let medal = idx === 0 ? '' : (idx === 1 ? '' : (idx === 2 ? '' : `#${idx+1}`));
                html += `<div class="leaderboard-entry ${isSelf ? 'self' : ''}">
                    <span>${medal} ${p.username || 'Agent'}</span>
                    <span style="color:#ffd700;"> ${p.kills || 0}</span>
                </div>`;
            });
            entries.innerHTML = html;
        }

        let pingIntervalTimer = null;
        function startPingMeasurement() {
            if (pingIntervalTimer) clearInterval(pingIntervalTimer);
            const pingTag = document.getElementById('online-ping-tag');
            if (pingTag) pingTag.style.display = 'block';
            
            pingIntervalTimer = setInterval(() => {
                if (socket && isSocketConnected) {
                    socket.emit('latency_ping', performance.now());
                }
            }, 2000);
        }

        function stopPingMeasurement() {
            if (pingIntervalTimer) { clearInterval(pingIntervalTimer); pingIntervalTimer = null; }
            const pingTag = document.getElementById('online-ping-tag');
            if (pingTag) pingTag.style.display = 'none';
        }

        // ====================================================================
        // GLOBAL ANNOUNCEMENT & GIFT TOAST NOTIFIERS
        // ====================================================================
        let announcementTimeout = null;
        function showGlobalAnnouncement(message, sender = 'Supreme Commander') {
            const banner = document.getElementById('server-announcement-banner');
            const textEl = document.getElementById('announcement-text');
            if (!banner || !textEl) return;

            textEl.innerText = message;
            banner.style.display = 'block';
            banner.classList.remove('hidden');
            playSound('overcharge');

            if (announcementTimeout) clearTimeout(announcementTimeout);
            announcementTimeout = setTimeout(() => {
                banner.classList.add('hidden');
                banner.style.display = 'none';
            }, 6500);
        }

        let giftTimeout = null;
        function showGiftNotification(skinName) {
            const banner = document.getElementById('gift-notification-banner');
            const textEl = document.getElementById('gift-text');
            if (!banner || !textEl) return;

            textEl.innerText = `تم منحك مظهر تكتيكي جديد: [${skinName}]!`;
            banner.style.display = 'flex';
            banner.classList.remove('hidden');
            playSound('gold');

            if (giftTimeout) clearTimeout(giftTimeout);
            giftTimeout = setTimeout(() => {
                banner.classList.add('hidden');
                banner.style.display = 'none';
            }, 7000);
        }

        // ====================================================================
        // ====================================================================
        // CLOUD ACCOUNTS & CROSS-DEVICE SYNC LOGIC
        // ====================================================================
        window.openCloudAccountModal = function() {
            const modal = document.getElementById('cloud-account-modal');
            const msg = document.getElementById('cloud-auth-msg');
            const userInput = document.getElementById('cloud-username-input');
            const pinInput = document.getElementById('cloud-pin-input');
            if (msg) msg.innerText = '';
            if (userInput) userInput.value = tacticalUsername || 'Apex_Agent';
            if (pinInput) pinInput.value = '';
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        };

        window.closeCloudAccountModal = function() {
            const modal = document.getElementById('cloud-account-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        };

        window.submitCloudAuth = function() {
            const userInput = document.getElementById('cloud-username-input');
            const pinInput = document.getElementById('cloud-pin-input');
            const msg = document.getElementById('cloud-auth-msg');
            const username = (userInput ? userInput.value : '').trim();
            const pin = (pinInput ? pinInput.value : '').trim();

            if (!username) {
                if (msg) { msg.style.color = '#ff0055'; msg.innerText = 'يرجى إدخال اسم العميل التكتيكي!'; }
                return;
            }
            if (pin.length < 4) {
                if (msg) { msg.style.color = '#ff0055'; msg.innerText = 'الرمز السري (PIN) يجب أن يكون 4 أرقام على الأقل!'; }
                return;
            }

            if (msg) { msg.style.color = '#00f3ff'; msg.innerText = 'جاري المزامنة مع السيرفر السحابي...'; }
            initMultiplayerSocket(true);

            if (socket && (socket.connected || socket.connecting)) {
                socket.emit('cloud_account_auth', {
                    username: username,
                    pin: pin,
                    deviceToken: getOrInitDeviceToken(),
                    credits: metaCurrency,
                    level: playerLevel,
                    xp: playerXP,
                    highest_wave: highestWaveRecord,
                    unlocked_skins: Array.from(unlockedCosmeticSkins)
                });
            } else {
                // حفظ محلي في حالة عدم الاتصال بالسيرفر
                tacticalUsername = username;
                localStorage.setItem('chrono_tactical_username' + SAVE_VERSION, username);
                const nameInput = document.getElementById('player-username-input');
                if (nameInput) nameInput.value = username;
                if (msg) { msg.style.color = '#00ff88'; msg.innerText = '[OK] تم حفظ الحساب التكتيكي محلياً بنجاح!'; }
                playSound('gold');
                setTimeout(() => { closeCloudAccountModal(); }, 1200);
            }
        };

        function syncCloudProgress() {
            if (socket && isSocketConnected && tacticalUsername) {
                socket.emit('cloud_account_sync_save', {
                    username: tacticalUsername,
                    credits: metaCurrency,
                    level: playerLevel,
                    xp: playerXP,
                    highest_wave: highestWaveRecord,
                    unlocked_skins: Array.from(unlockedCosmeticSkins)
                });
            }
        }

        // ====================================================================
        // ADMIN CONTROL PANEL & AUTHENTICATION LOGIC (Passkey: 145329ma)
        // ====================================================================
        window.openAdminLoginModal = function() {
            const modal = document.getElementById('admin-login-modal');
            const msg = document.getElementById('admin-login-msg');
            const passInput = document.getElementById('admin-pass-input');
            if (msg) msg.innerText = '';
            if (passInput) passInput.value = '';
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        };

        window.closeAdminLoginModal = function() {
            const modal = document.getElementById('admin-login-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        };

        window.submitAdminLogin = function() {
            const passInput = document.getElementById('admin-pass-input');
            const password = (passInput ? passInput.value : '').trim();
            const msg = document.getElementById('admin-login-msg');
            if (!password) return;

            initMultiplayerSocket(true);

            if (password === '145329ma') {
                isUserAdmin = true;
                closeAdminLoginModal();
                openAdminPanel();
                showAdminFeedback(' تم توثيق هويتك كمسؤول للنظام بنجاح!');
                playSound('ultimate');
                if (socket && isSocketConnected) {
                    socket.emit('admin_auth', { password: password });
                }
                return;
            }

            if (socket && isSocketConnected) {
                socket.emit('admin_auth', { password: password });
            } else {
                if (msg) {
                    msg.style.color = '#ff0055';
                    msg.innerText = 'الرمز السري غير صحيح!';
                }
                playSound('shield');
            }
        }

        window.adminAuth = function(pass) {
            initMultiplayerSocket();
            if (pass === '145329ma') {
                isUserAdmin = true;
                openAdminPanel();
            }
            if (socket) socket.emit('admin_auth', { password: pass });
        };

        function openAdminPanel() {
            const panel = document.getElementById('admin-panel');
            if (panel) {
                panel.classList.remove('hidden');
                initAdminDraggable();
                adminRefreshPlayerList();
            }
        }

        function closeAdminPanel() {
            const panel = document.getElementById('admin-panel');
            if (panel) panel.classList.add('hidden');
        }

        function toggleAdminPanelMinimize() {
            const content = document.getElementById('admin-panel-content');
            if (content) {
                content.style.display = (content.style.display === 'none') ? 'block' : 'none';
            }
        }

        function switchAdminTab(tabName) {
            const tabs = document.querySelectorAll('.admin-tab-btn');
            tabs.forEach(t => t.classList.remove('active'));
            const subtabs = document.querySelectorAll('.admin-subtab');
            subtabs.forEach(st => st.classList.remove('active'));

            const targetTab = document.getElementById(`admin-tab-${tabName}`);
            if (targetTab) targetTab.classList.add('active');

            const activeBtn = Array.from(tabs).find(b => b.getAttribute('onclick')?.includes(tabName));
            if (activeBtn) activeBtn.classList.add('active');
        }

        function updateAdminPlayerListUI(players) {
            const playerSelect = document.getElementById('admin-player-select');
            const giftPlayerSelect = document.getElementById('admin-gift-player-select');

            let optionsHtml = '<option value="">-- اختر عميلاً من القائمة --</option>';
            if (players && players.length > 0) {
                players.forEach(p => {
                    optionsHtml += `<option value="${p.id}" data-username="${p.username}" data-ip="${p.ip}">${p.username} (${p.mode}) [${p.id.substring(0, 5)}]</option>`;
                });
            } else {
                optionsHtml = '<option value="">-- لا يوجد لاعبين متصلين حالياً --</option>';
            }

            if (playerSelect) playerSelect.innerHTML = optionsHtml;
            if (giftPlayerSelect) giftPlayerSelect.innerHTML = optionsHtml;
        }

        function adminRefreshPlayerList() {
            if (socket && isUserAdmin) {
                socket.emit('admin_request_players');
            }
        }

        function adminKickSelectedPlayer() {
            const select = document.getElementById('admin-player-select');
            if (!select || !select.value) { alert('يرجى تحديد لاعب للطرد!'); return; }
            if (socket && isUserAdmin) {
                socket.emit('admin_kick_player', { targetId: select.value, reason: 'Kicked by Developer Admin.' });
            }
        }

        function adminBanSelectedPlayer() {
            const select = document.getElementById('admin-player-select');
            if (!select || !select.value) { alert('يرجى تحديد لاعب لعمل Ban!'); return; }
            const selectedOpt = select.options[select.selectedIndex];
            const username = selectedOpt ? selectedOpt.getAttribute('data-username') : null;
            const ip = selectedOpt ? selectedOpt.getAttribute('data-ip') : null;

            if (confirm(`هل أنت متأكد من رغبتك في حظر اللاعب ${username || select.value} نهائياً مع حظر عنوان الـ IP؟`)) {
                if (socket && isUserAdmin) {
                    socket.emit('admin_ban_player', { targetId: select.value, username: username, ip: ip, reason: 'Permanently Banned by Developer Admin.' });
                }
            }
        }

        function adminGrantSkinToPlayer() {
            const playerSelect = document.getElementById('admin-gift-player-select');
            const skinSelect = document.getElementById('admin-skin-select');
            if (!playerSelect || !playerSelect.value) { alert('يرجى تحديد اللاعب المتلقي للهدية!'); return; }
            if (!skinSelect || !skinSelect.value) return;

            const selectedOpt = playerSelect.options[playerSelect.selectedIndex];
            const username = selectedOpt ? selectedOpt.getAttribute('data-username') : null;
            const skinId = skinSelect.value;
            const skinName = skinSelect.options[skinSelect.selectedIndex].text;

            if (socket && isUserAdmin) {
                socket.emit('admin_grant_skin', {
                    targetId: playerSelect.value,
                    username: username,
                    skinId: skinId,
                    skinName: skinName
                });
            }
        }

        function adminSendBroadcast() {
            const input = document.getElementById('admin-broadcast-input');
            const text = (input ? input.value : '').trim();
            if (!text) { alert('يرجى كتابة نص الإعلان أولاً!'); return; }

            if (socket && isUserAdmin) {
                socket.emit('admin_broadcast_message', { message: text });
                if (input) input.value = '';
            }
        }

        function showAdminFeedback(msg) {
            const tag = document.getElementById('admin-action-feedback');
            if (tag) {
                tag.innerText = msg;
                setTimeout(() => { if (tag.innerText === msg) tag.innerText = ''; }, 4000);
            }
        }

        let isDraggingAdmin = false, dragOffX = 0, dragOffY = 0;
        function initAdminDraggable() {
            const handle = document.getElementById('admin-panel-drag-handle');
            const panel = document.getElementById('admin-panel');
            if (!handle || !panel || handle.dataset.dragInit) return;

            handle.dataset.dragInit = "true";
            handle.addEventListener('mousedown', (e) => {
                isDraggingAdmin = true;
                dragOffX = e.clientX - panel.offsetLeft;
                dragOffY = e.clientY - panel.offsetTop;
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDraggingAdmin) return;
                panel.style.left = `${Math.max(10, Math.min(window.innerWidth - panel.offsetWidth - 10, e.clientX - dragOffX))}px`;
                panel.style.top = `${Math.max(10, Math.min(window.innerHeight - panel.offsetHeight - 10, e.clientY - dragOffY))}px`;
            });

            window.addEventListener('mouseup', () => { isDraggingAdmin = false; });
        }

        // ====================================================================
        // REMOTE PLAYERS RENDERING & INTERPOLATION (60-120 FPS SMOOTH)
        // ====================================================================
        
// ===================================================================
// TIME ANOMALIES IN-MATCH RENDERING & INTERACTION
// ===================================================================
function drawActiveTimeAnomalies(ctx, camX, camY) {
    if (!activeTimeAnomalies || activeTimeAnomalies.length === 0) return;
    const now = Date.now();
    for (let i = activeTimeAnomalies.length - 1; i >= 0; i--) {
        const a = activeTimeAnomalies[i];
        if (a.expiresAt <= now || a.claimed) {
            activeTimeAnomalies.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.translate(a.x, a.y);

        let pulse = 1 + Math.sin(now / 180) * 0.08;
        let r = (a.radius || 300) * pulse;

        if (a.type === 'stasis') {
            let grad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
            grad.addColorStop(0, 'rgba(0, 243, 255, 0.45)');
            grad.addColorStop(0.7, 'rgba(0, 243, 255, 0.12)');
            grad.addColorStop(1, 'rgba(0, 243, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.stroke();

            ctx.font = 'bold 12px Rajdhani, Cairo, sans-serif';
            ctx.fillStyle = '#00f3ff';
            ctx.textAlign = 'center';
            ctx.fillText(' ' + (currentLanguage === 'ar' ? 'حقل التباطؤ الزمني' : 'STASIS ZONE'), 0, -r - 10);
        } else if (a.type === 'hyper_surge') {
            let grad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
            grad.addColorStop(0.7, 'rgba(255, 215, 0, 0.12)');
            grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.stroke();

            ctx.font = 'bold 12px Rajdhani, Cairo, sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.fillText(' ' + (currentLanguage === 'ar' ? 'عاصفة السرعة القصوى' : 'HYPER SURGE'), 0, -r - 10);
        } else {
            let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, r);
            grad.addColorStop(0, 'rgba(189, 0, 255, 0.6)');
            grad.addColorStop(0.8, 'rgba(189, 0, 255, 0.18)');
            grad.addColorStop(1, 'rgba(189, 0, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#bd00ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('', 0, 0);

            ctx.font = 'bold 12px Rajdhani, Cairo, sans-serif';
            ctx.fillStyle = '#bd00ff';
            ctx.fillText(currentLanguage === 'ar' ? 'إنزال كمي' : 'QUANTUM DROP', 0, -r - 12);
        }

        ctx.restore();

        // Interaction with local player
        if (player && !isGameOver) {
            let d = dist(player.x, player.y, a.x, a.y);
            if (a.type === 'quantum_drop' && d < ((a.radius || 100) + player.radius) && !a.claimed) {
                a.claimed = true;
                if (socket && isSocketConnected) {
                    socket.emit('claim_quantum_drop', { anomalyId: a.id });
                }
                player.addEnergy(100);
                if (player.shield !== undefined) player.shield = Math.min(player.maxShield || 100, player.shield + 50);
                playSound('gold');
                spawnFloatingText(player.x, player.y - 30, '+300 PTS إنزال كمي أسطوري!', '#ffd700');
            }
        }
    }
}


function drawAndInterpolateRemotePlayers(frameFactor) {
            if (remotePlayers.size === 0) return;

            remotePlayers.forEach((rp, id) => {
                // Smooth coordinates interpolation
                rp.x = lerp(rp.x || rp.targetX, rp.targetX, 0.28 * frameFactor);
                rp.y = lerp(rp.y || rp.targetY, rp.targetY, 0.28 * frameFactor);
                rp.facingAngle = lerp(rp.facingAngle || rp.targetFacingAngle, rp.targetFacingAngle, 0.32 * frameFactor);

                if (rp.x < camX - 100 || rp.x > camX + width + 100 || rp.y < camY - 100 || rp.y > camY + height + 100) return;

                ctx.save();
                ctx.translate(rp.x, rp.y);
                ctx.rotate(rp.facingAngle + Math.PI / 2);

                // Engine flame
                let speedMag = Math.hypot(rp.vx || 0, rp.vy || 0);
                if (speedMag > 0.3) {
                    let flameLength = 12 + Math.random() * 6 + speedMag * 2;
                    ctx.beginPath();
                    ctx.moveTo(-5, 9);
                    ctx.lineTo(0, 9 + flameLength);
                    ctx.lineTo(5, 9);
                    ctx.fillStyle = rp.overchargeActive ? '#ff0055' : (rp.chassis === 'quantum' ? '#bd00ff' : '#00ff88');
                    ctx.fill();
                }

                let shipColor = (activeGameMode === 'online_pvp') ? '#ff00ea' : '#00ff88';
                if (rp.overchargeActive) shipColor = '#ffaa00';

                let r = rp.radius || 18;

                // Render chassis according to archetype
                if (rp.chassis === 'titan') {
                    ctx.beginPath();
                    ctx.moveTo(0, -r * 1.3);
                    ctx.lineTo(r * 1.3, -r * 0.4);
                    ctx.lineTo(r * 1.4, r * 1.1);
                    ctx.lineTo(r * 0.6, r * 0.8);
                    ctx.lineTo(0, r * 0.95);
                    ctx.lineTo(-r * 0.6, r * 0.8);
                    ctx.lineTo(-r * 1.4, r * 1.1);
                    ctx.lineTo(-r * 1.3, -r * 0.4);
                    ctx.closePath();
                    ctx.fillStyle = shipColor; ctx.fill();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0; ctx.stroke();
                } else if (rp.chassis === 'quantum') {
                    ctx.beginPath();
                    ctx.moveTo(0, -r * 1.6);
                    ctx.lineTo(r * 1.1, r * 0.7);
                    ctx.lineTo(r * 0.4, r * 0.5);
                    ctx.lineTo(0, r * 1.2);
                    ctx.lineTo(-r * 0.4, r * 0.5);
                    ctx.lineTo(-r * 1.1, r * 0.7);
                    ctx.closePath();
                    ctx.fillStyle = shipColor; ctx.fill();
                    ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 2.0; ctx.stroke();
                } else {
                    // Striker
                    ctx.beginPath();
                    ctx.moveTo(0, -r * 1.55);
                    ctx.lineTo(r * 1.25, r * 0.95);
                    ctx.lineTo(r * 0.6, r * 0.65);
                    ctx.lineTo(0, r * 0.85);
                    ctx.lineTo(-r * 0.6, r * 0.65);
                    ctx.lineTo(-r * 1.25, r * 0.95);
                    ctx.closePath();
                    ctx.fillStyle = shipColor; ctx.fill();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
                }

                // Cockpit glow
                ctx.beginPath();
                ctx.ellipse(0, -2, 3, 5, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();

                ctx.restore();

                // -------------------------------------------------------------
                // Draw Username & Dynamic Health Bar above vehicle
                // -------------------------------------------------------------
                ctx.save();
                ctx.font = 'bold 11px Rajdhani, "Chakra Petch", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = (activeGameMode === 'online_pvp') ? '#ff77aa' : '#00ffcc';
                ctx.fillText(rp.username || 'Agent', rp.x, rp.y - 34);

                // Health Bar Background
                const barW = 44, barH = 5, barX = rp.x - barW / 2, barY = rp.y - 26;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barW, barH);

                // Health Bar Fill
                const currentHp = Math.max(0, rp.health || 100);
                const maxHp = Math.max(1, rp.maxHealth || 100);
                const fillRatio = Math.min(1, currentHp / maxHp);
                const hpColor = fillRatio > 0.5 ? '#00ff88' : (fillRatio > 0.25 ? '#ffd700' : '#ff0055');
                ctx.fillStyle = hpColor;
                ctx.fillRect(barX + 1, barY + 1, (barW - 2) * fillRatio, barH - 2);

                //  1. Apex Bounty King Target Crown & Glow
                if (activeBountyKing && activeBountyKing.targetId === id) {
                    ctx.font = 'bold 16px sans-serif';
                    ctx.textAlign = 'center';
                    let crownFloat = Math.sin(performance.now() * 0.005) * 4;
                    ctx.fillText('', rp.x, rp.y - 48 + crownFloat);
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 9px Chakra Petch';
                    ctx.fillText(`BOUNTY +${activeBountyKing.rewardCredits || 500}`, rp.x, rp.y - 62 + crownFloat);

                    // Golden Target Ring
                    ctx.beginPath();
                    ctx.arc(rp.x, rp.y, rp.radius + 14, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 6]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                //  2. PVE Downed Ally Emergency Beacon & Revive Ring
                if (pveDownedPlayers.has(id) || rp.isDowned) {
                    let dInfo = pveDownedPlayers.get(id);
                    let pulseRadius = 52 + Math.sin(performance.now() * 0.008) * 8;
                    
                    // Outer Pulsing Red Distress Circle
                    ctx.beginPath();
                    ctx.arc(rp.x, rp.y, pulseRadius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 0, 85, 0.12)';
                    ctx.fill();
                    ctx.strokeStyle = '#ff0055';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();

                    // Emergency Siren Text
                    ctx.font = 'bold 11px Chakra Petch';
                    ctx.fillStyle = '#ff0055';
                    ctx.textAlign = 'center';
                    ctx.fillText(` بحاجة لإنعاش! (اقترب للإسعاف)`, rp.x, rp.y - 52);

                    // If local player is standing in range, draw healing tether beam & progress arc
                    if (player && distSq(player.x, player.y, rp.x, rp.y) < 65 * 65) {
                        ctx.beginPath();
                        ctx.moveTo(player.x, player.y);
                        ctx.lineTo(rp.x, rp.y);
                        ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
                        ctx.lineWidth = 3.5;
                        ctx.stroke();

                        // Circular Revive Progress Arc
                        ctx.beginPath();
                        ctx.arc(rp.x, rp.y, 40, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * localReviveProgress));
                        ctx.strokeStyle = '#00ff88';
                        ctx.lineWidth = 5;
                        ctx.stroke();

                        ctx.fillStyle = '#00ff88';
                        ctx.font = 'bold 12px Chakra Petch';
                        ctx.fillText(`جاري الإنعاش: ${Math.round(localReviveProgress * 100)}%`, rp.x, rp.y + 45);
                    }
                }

                ctx.restore();
            });

            //  3. Floating Holographic Tactical Pings & Emotes
            for (let i = tacticalFloatingPings.length - 1; i >= 0; i--) {
                let p = tacticalFloatingPings[i];
                p.life -= 0.016 * frameFactor;
                p.y -= 0.6 * frameFactor;

                ctx.save();
                ctx.globalAlpha = Math.min(1, p.life);
                ctx.font = 'bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.emote, p.x, p.y - 45);
                if (p.text) {
                    ctx.font = 'bold 11px Chakra Petch';
                    ctx.fillStyle = '#ffd700';
                    ctx.fillText(`${p.senderName}: ${p.text}`, p.x, p.y - 25);
                }
                ctx.restore();

                if (p.life <= 0) tacticalFloatingPings.splice(i, 1);
            }
        }

        function togglePause() {
            if (isGameOver || (mainMenu && mainMenu.style.display !== 'none') || isModalActive) return;
            isGamePaused = !isGamePaused;
            if (isGamePaused) {
                closeSettingsSubmenu();
                pauseMenu.classList.remove('hidden');
                resetJoystick();
                resetAimJoystick();
                isMouseDown = false;
            } else {
                pauseMenu.classList.add('hidden');
                lastTime = performance.now();
            }
        }

        function resumeGame() { if (isGamePaused) togglePause(); }
        function quitToMainMenu() { isGamePaused = false; pauseMenu.classList.add('hidden'); returnToMainMenu(); }

        
        // ====================================================================
        // PHASE 5: ADVANCED COSMETICS & SKINS OVERHAUL WITH LIVE 3D PREVIEW
        // ====================================================================
        // محرك المعاينة الحية الدوار والواقعي في المتجر
        function updateShopPreviewCanvas() {
            const canvas = document.getElementById('shop-preview-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            let item = selectedShopPreviewItem;
            if (!item) {
                const catalog = COSMETICS_CATALOG[currentShopCategory] || [];
                item = catalog[0] || { id: 'default', title: 'Standard', rarity: 'common' };
                selectedShopPreviewItem = item;
            }

            const now = performance.now();
            let rarityColors = { common: '#a0aec0', rare: '#00f3ff', epic: '#bd00ff', legendary: '#ffd700', mythic: '#ff0055' };
            let glowCol = rarityColors[item.rarity || 'common'] || '#00f3ff';

            // تحديد السكن والمسار الحقيقيين للعرض بناءً على العنصر المختار
            let previewSkinId = (currentShopCategory === 'skins') ? item.id : (item.setId || equippedCosmetics.chassis || 'default');
            let previewTrailId = (currentShopCategory === 'trails') ? item.id : (equippedCosmetics.trail || 'trail_default');
            let previewClass = selectedClass || 'assault';

            ctx.save();
            ctx.translate(w / 2, h / 2 + 5);

            // تمايل هادئ وحركة طيران طبيعية
            let rot = Math.sin(now * 0.0018) * 0.32;
            let floatY = Math.sin(now * 0.003) * 4;
            ctx.translate(0, floatY);
            ctx.rotate(rot);

            // 1. رسم لهب ومسار المحركات الحقيقي الخاص بالسكن خلف مؤخرة السفينة
            let flameLen = 16 + Math.sin(now * 0.02) * 5 + Math.random() * 4;
            let flameCol = '#00f3ff';
            if (previewTrailId === 'trail_golden' || item.id === 'trail_golden') flameCol = '#ffd700';
            else if (previewTrailId === 'trail_frost_mist' || item.id === 'trail_frost_mist') flameCol = '#00f3ff';
            else if (previewTrailId === 'trail_dragon_ember' || item.id === 'trail_dragon_ember') flameCol = '#ff2200';
            else if (previewTrailId === 'trail_solar_flare' || item.id === 'trail_solar_flare') flameCol = '#ff6600';
            else if (previewTrailId === 'trail_dark_matter' || item.id === 'trail_dark_matter') flameCol = '#bd00ff';
            else if (previewTrailId === 'trail_matrix' || item.id === 'trail_matrix') flameCol = '#00ff66';
            else if (previewTrailId === 'trail_neon_pulse' || item.id === 'trail_neon_pulse') flameCol = '#ff0055';
            else if (previewTrailId === 'trail_rainbow' || item.id === 'trail_rainbow') flameCol = `hsl(${(now*0.2)%360}, 100%, 65%)`;

            ctx.save();
            ctx.shadowColor = flameCol;
            ctx.shadowBlur = (gameSettings.bloom && !gameSettings.lowEnd) ? 18 : 0;
            let grad = ctx.createLinearGradient(0, 22, 0, 22 + flameLen * 1.25);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, flameCol);
            grad.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.moveTo(-6, 22);
            ctx.lineTo(0, 22 + flameLen * 1.25);
            ctx.lineTo(6, 22);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            // رسم جزيئات المسار النفاث المتساقطة
            if (currentShopCategory === 'trails' || previewTrailId !== 'trail_default') {
                for (let k = 0; k < 6; k++) {
                    let pTime = (now * 0.004 + k * 1.0) % 6;
                    let pDist = 24 + pTime * 11;
                    let pSpread = Math.sin(now * 0.01 + k * 1.5) * (7 + pTime * 2);
                    let pAlpha = Math.max(0, 1 - (pTime / 6));
                    ctx.beginPath();
                    ctx.arc(pSpread, pDist, Math.max(1, 4.5 - pTime * 0.6), 0, Math.PI * 2);
                    ctx.fillStyle = flameCol;
                    ctx.globalAlpha = pAlpha;
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }
            ctx.restore();

            // 2. إطلاق مقذوفات واقعية حية عند معاينة فئة الأسلحة
            if (currentShopCategory === 'weapons') {
                let wepId = item.id;
                let wepBulletCol = glowCol;
                if (wepId === 'wep_goldengun') wepBulletCol = '#ffd700';
                else if (wepId === 'wep_frost_shard') wepBulletCol = '#00f3ff';
                else if (wepId === 'wep_dragonfire') wepBulletCol = '#ff3300';
                else if (wepId === 'wep_solar_flare') wepBulletCol = '#ffaa00';
                else if (wepId === 'wep_voidray') wepBulletCol = '#bd00ff';
                else if (wepId === 'wep_toxic_surge') wepBulletCol = '#00ff88';
                else if (wepId === 'wep_neon_fury') wepBulletCol = '#ff0055';
                else if (wepId === 'wep_plasma_comet') wepBulletCol = `hsl(${(now*0.3)%360}, 100%, 65%)`;

                for (let bIdx = 0; bIdx < 3; bIdx++) {
                    let bProg = ((now * 0.006 + bIdx * 2.0) % 6) / 6;
                    let bY = -32 - bProg * 55;
                    let bAlpha = 1 - bProg;
                    ctx.save();
                    ctx.shadowColor = wepBulletCol;
                    ctx.shadowBlur = (gameSettings.bloom && !gameSettings.lowEnd) ? 14 : 0;
                    ctx.beginPath();
                    ctx.ellipse(0, bY, 3.5, 10, 0, 0, Math.PI * 2);
                    ctx.fillStyle = wepBulletCol;
                    ctx.globalAlpha = bAlpha;
                    ctx.fill();
                    ctx.restore();
                }
            }

            // 3. نبضات وانفجارات هولوجرامية عند معاينة فئة القدرات
            if (currentShopCategory === 'abilities') {
                let aProgress = (now * 0.0018) % 1;
                let aRadius = 15 + aProgress * 45;
                let aAlpha = 1 - aProgress;
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, aRadius, 0, Math.PI * 2);
                ctx.strokeStyle = glowCol;
                ctx.lineWidth = 2.5;
                ctx.globalAlpha = aAlpha;
                ctx.shadowColor = glowCol;
                ctx.shadowBlur = (gameSettings.bloom && !gameSettings.lowEnd) ? 18 : 0;
                ctx.stroke();
                ctx.restore();
            }

            // 4. رسم هيكل السفينة ثلاثي الأبعاد الأصيل مع السكن المجهز
            let isAbilityAnim = (currentShopCategory === 'abilities');
            drawCustomShipGeometry(ctx, previewSkinId, previewClass, 32, isAbilityAnim, false, 0, now);

            ctx.restore();

            const shopScreen = document.getElementById('shop-screen') || document.getElementById('tab-shop');
            if (shopScreen && shopScreen.offsetParent !== null) {
                shopPreviewAnimFrame = requestAnimationFrame(updateShopPreviewCanvas);
            }
        }

        window.switchShopCategory = function(cat) {
            currentShopCategory = cat;
            document.querySelectorAll('.shop-cat-btn').forEach(b => b.classList.remove('active'));
            const clickedBtn = Array.from(document.querySelectorAll('.shop-cat-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(cat));
            if (clickedBtn) clickedBtn.classList.add('active');
            
            const list = COSMETICS_CATALOG[cat] || [];
            if (list.length > 0) selectShopItemForPreview(list[0]);
            renderShopUI();
        };

        window.selectShopItemForPreview = function(item) {
            selectedShopPreviewItem = item;
            const rarityTag = document.getElementById('shop-preview-rarity');
            const titleTag = document.getElementById('shop-preview-title');
            const descTag = document.getElementById('shop-preview-desc');
            const actionBtn = document.getElementById('shop-preview-action-btn');

            let rarityClass = `rarity-${item.rarity || 'common'}`;
            if (rarityTag) {
                rarityTag.className = `shop-rarity-pill ${rarityClass}`;
                rarityTag.innerText = (item.rarity || 'common').toUpperCase();
            }
            if (titleTag) titleTag.innerText = item.title;

            let setObj = (item.setId && COSMETIC_SETS[item.setId]) ? COSMETIC_SETS[item.setId] : null;

            if (descTag) {
                let setInfo = '';
                if (setObj) {
                    setInfo = `<br><span style="color:#ffd700; font-weight:bold; font-size:0.8rem;"> ينتمي إلى: ${setObj.name}</span>`;
                }
                descTag.innerHTML = item.desc + setInfo;
            }

            let categoryEquippedKey = currentShopCategory === 'skins' ? 'chassis' : 
                                      (currentShopCategory === 'weapons' ? 'weapon' : 
                                      (currentShopCategory === 'trails' ? 'trail' : 'ability'));
            const isEquipped = equippedCosmetics[categoryEquippedKey] === item.id;
            const isUnlocked = item.price === 0 || unlockedCosmeticSkins.has(item.id);

            // 1. زر شراء أو تجهيز القطعة المحددة المنفصلة
            if (actionBtn) {
                if (isEquipped) {
                    actionBtn.className = 'shop-item-btn btn-equipped';
                    actionBtn.innerText = '[OK] هذه القطعة مجهّزة حالياً';
                    actionBtn.onclick = null;
                } else if (isUnlocked) {
                    actionBtn.className = 'shop-item-btn btn-equip';
                    actionBtn.innerText = 'تجهيز هذه القطعة فقط';
                    actionBtn.onclick = () => buyOrEquipCosmetic(item.id, currentShopCategory, item.price);
                } else {
                    actionBtn.className = 'shop-item-btn btn-buy';
                    actionBtn.innerText = `شراء هذه القطعة منفصلة (${item.price} CR)`;
                    actionBtn.onclick = () => buyOrEquipCosmetic(item.id, currentShopCategory, item.price);
                }

                // 2. زر شراء أو تجهيز الطقم الكامل المتناسق
                let oldSetBtn = document.getElementById('shop-matching-set-btn');
                if (oldSetBtn) oldSetBtn.remove();

                if (setObj && setObj.id !== 'default') {
                    let setItems = [setObj.chassis, setObj.weapon, setObj.trail, setObj.ability];
                    let unownedCount = setItems.filter(id => id !== 'default' && !unlockedCosmeticSkins.has(id)).length;
                    let isFullSetEquipped = (equippedCosmetics.chassis === setObj.chassis &&
                                             equippedCosmetics.weapon === setObj.weapon &&
                                             equippedCosmetics.trail === setObj.trail &&
                                             equippedCosmetics.ability === setObj.ability);

                    let setBtn = document.createElement('button');
                    setBtn.id = 'shop-matching-set-btn';
                    setBtn.className = 'shop-set-bundle-btn';

                    if (unownedCount === 0) {
                        // جميع قطع الطقم مملوكة بالفعل
                        if (isFullSetEquipped) {
                            setBtn.innerText = `[OK] الطقم الكامل مجهز بالكامل`;
                            setBtn.style.opacity = '0.7';
                            setBtn.onclick = null;
                        } else {
                            setBtn.innerText = ` تجهيز الطقم الكامل (${setObj.name.split(' ')[0]})`;
                            setBtn.onclick = () => buyOrEquipMatchingSet(setObj.id);
                        }
                    } else {
                        // الطقم يحتاج شراء - مع خصم الباقة
                        let bundleCost = (unownedCount === 4) ? setObj.bundlePrice : Math.round(setObj.bundlePrice * (unownedCount / 4));
                        let savings = setObj.originalPrice - setObj.bundlePrice;
                        setBtn.innerText = ` شراء وتجهيز الطقم الكامل (${bundleCost} CR - وفر ${savings}!)`;
                        setBtn.onclick = () => buyOrEquipMatchingSet(setObj.id);
                    }

                    actionBtn.parentNode.insertBefore(setBtn, actionBtn.nextSibling);
                }
            }

            cancelAnimationFrame(shopPreviewAnimFrame);
            updateShopPreviewCanvas();
        };

        window.buyOrEquipMatchingSet = function(setId) {
            let s = COSMETIC_SETS[setId];
            if (!s) return;
            if (s.id === 'default') {
                equippedCosmetics.chassis = 'default';
                equippedCosmetics.weapon = 'wep_default';
                equippedCosmetics.trail = 'trail_default';
                equippedCosmetics.ability = 'nova_default';
                activeCosmeticSkin = 'default';
                localStorage.setItem('chrono_equipped_cosmetics' + SAVE_VERSION, JSON.stringify(equippedCosmetics));
                playSound('gold');
                spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, ' تم تجهيز الطقم القياسي!', '#00ff88');
                renderShopUI();
                if (selectedShopPreviewItem) selectShopItemForPreview(selectedShopPreviewItem);
                if (typeof renderArsenalPreviewCanvas === 'function') renderArsenalPreviewCanvas();
                saveGameProgress();
                return;
            }

            let setItems = [s.chassis, s.weapon, s.trail, s.ability];
            let unownedItems = setItems.filter(id => id !== 'default' && !unlockedCosmeticSkins.has(id));

            if (unownedItems.length === 0) {
                // جميع قطع الطقم مملوكة -> تجهيز مباشر
                equippedCosmetics.chassis = s.chassis;
                equippedCosmetics.weapon = s.weapon;
                equippedCosmetics.trail = s.trail;
                equippedCosmetics.ability = s.ability;
                activeCosmeticSkin = s.chassis;
                localStorage.setItem('chrono_equipped_cosmetics' + SAVE_VERSION, JSON.stringify(equippedCosmetics));
                playSound('gold');
                spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, ` تم تجهيز ${s.name} بالكامل!`, '#ffd700');
                renderShopUI();
                if (selectedShopPreviewItem) selectShopItemForPreview(selectedShopPreviewItem);
                if (typeof renderArsenalPreviewCanvas === 'function') renderArsenalPreviewCanvas();
                saveGameProgress();
                return;
            }

            let bundleCost = (unownedItems.length === 4) ? s.bundlePrice : Math.round(s.bundlePrice * (unownedItems.length / 4));

            if (metaCurrency >= bundleCost) {
                metaCurrency -= bundleCost;
                unownedItems.forEach(id => unlockedCosmeticSkins.add(id));
                equippedCosmetics.chassis = s.chassis;
                equippedCosmetics.weapon = s.weapon;
                equippedCosmetics.trail = s.trail;
                equippedCosmetics.ability = s.ability;
                activeCosmeticSkin = s.chassis;
                localStorage.setItem('chrono_equipped_cosmetics' + SAVE_VERSION, JSON.stringify(equippedCosmetics));
                saveGameProgress();
                playSound('ultimate');
                triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, s.themeColor || '#ffd700', 350);
                spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, ` تم شراء وتجهيز ${s.name} بالكامل!`, '#ffd700');
                renderShopUI();
                if (selectedShopPreviewItem) selectShopItemForPreview(selectedShopPreviewItem);
                if (typeof renderArsenalPreviewCanvas === 'function') renderArsenalPreviewCanvas();
            } else {
                playSound('shield');
                alert(`رصيدك غير كافٍ لشراء الطقم الكامل! تحتاج إلى ${bundleCost} عملة Chrono Credits (رصيدك الحالي: ${metaCurrency}).`);
            }
        };

        window.equipFullMatchingSet = function(setId) {
            buyOrEquipMatchingSet(setId);
        };

        window.renderShopUI = function() {
            const container = document.getElementById('shop-items-container');
            const creditsTag = document.getElementById('shop-credits-display');
            if (creditsTag) creditsTag.innerText = metaCurrency;
            if (!container) return;

            container.innerHTML = '';
            const items = COSMETICS_CATALOG[currentShopCategory] || [];

            if (!selectedShopPreviewItem && items.length > 0) {
                selectShopItemForPreview(items[0]);
            }

            for (let item of items) {
                const card = document.createElement('div');
                const isUnlocked = item.price === 0 || unlockedCosmeticSkins.has(item.id);
                
                let categoryEquippedKey = currentShopCategory === 'skins' ? 'chassis' : 
                                          (currentShopCategory === 'weapons' ? 'weapon' : 
                                          (currentShopCategory === 'trails' ? 'trail' : 'ability'));
                
                const isEquipped = equippedCosmetics[categoryEquippedKey] === item.id;
                const isSelected = selectedShopPreviewItem && selectedShopPreviewItem.id === item.id;
                let rarityClass = `rarity-${item.rarity || 'common'}`;

                card.className = `shop-item-card ${rarityClass}` + (isEquipped ? ' equipped' : '') + (isSelected ? ' selected-preview' : '');
                card.onclick = (e) => {
                    if (e.target.tagName !== 'BUTTON') selectShopItemForPreview(item);
                };

                let btnHtml = '';
                if (isEquipped) {
                    btnHtml = '<button class="shop-item-btn btn-equipped">[OK] مجهّز</button>';
                } else if (isUnlocked) {
                    btnHtml = `<button class="shop-item-btn btn-equip" onclick="buyOrEquipCosmetic('${item.id}', '${currentShopCategory}', ${item.price})">تجهيز</button>`;
                } else {
                    btnHtml = `<button class="shop-item-btn btn-buy" onclick="buyOrEquipCosmetic('${item.id}', '${currentShopCategory}', ${item.price})">شراء (${item.price} CR)</button>`;
                }

                let setTag = (item.setId && COSMETIC_SETS[item.setId]) ? `<div style="font-size:0.65rem; color:#ffd700; margin-top:2px;"> طقم متناسق</div>` : '';

                card.innerHTML = `
                    <div class="shop-item-icon">${item.icon}</div>
                    <div class="shop-item-title">${item.title}</div>
                    <div class="shop-item-desc">${item.desc}</div>
                    ${setTag}
                    ${btnHtml}
                `;
                container.appendChild(card);
            }

            cancelAnimationFrame(shopPreviewAnimFrame);
            updateShopPreviewCanvas();
        };

        window.previewActionClick = function() {
            if (!selectedShopPreviewItem) return;
            buyOrEquipCosmetic(selectedShopPreviewItem.id, currentShopCategory, selectedShopPreviewItem.price);
        };

        window.buyOrEquipCosmetic = function(itemId, category, price) {
            let categoryEquippedKey = category === 'skins' ? 'chassis' : 
                                      (category === 'weapons' ? 'weapon' : 
                                      (category === 'trails' ? 'trail' : 'ability'));

            if (unlockedCosmeticSkins.has(itemId) || price === 0) {
                equippedCosmetics[categoryEquippedKey] = itemId;
                if (category === 'skins') activeCosmeticSkin = itemId;
                localStorage.setItem('chrono_equipped_cosmetics' + SAVE_VERSION, JSON.stringify(equippedCosmetics));
                playSound('gold');
                spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, ' تم تجهيز المظهر بنجاح!', '#00ff88');
                if (selectedShopPreviewItem) selectShopItemForPreview(selectedShopPreviewItem);
                if (typeof renderArsenalPreviewCanvas === 'function') renderArsenalPreviewCanvas();
                saveGameProgress();
                return;
            }

            if (metaCurrency >= price) {
                metaCurrency -= price;
                unlockedCosmeticSkins.add(itemId);
                equippedCosmetics[categoryEquippedKey] = itemId;
                if (category === 'skins') activeCosmeticSkin = itemId;
                localStorage.setItem('chrono_equipped_cosmetics' + SAVE_VERSION, JSON.stringify(equippedCosmetics));
                saveGameProgress();
                playSound('ultimate');
                triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, '#ffd700', 300);
                spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 40, ' تم شراء وتجهيز المظهر الجديد!', '#ffd700');
                renderShopUI();
                if (selectedShopPreviewItem) selectShopItemForPreview(selectedShopPreviewItem);
                if (typeof renderArsenalPreviewCanvas === 'function') renderArsenalPreviewCanvas();
            } else {
                playSound('shield');
                alert(`رصيدك غير كافٍ! تحتاج إلى ${price} عملة Chrono Credits (رصيدك الحالي: ${metaCurrency}). يمكنك كسب العملة عبر قتل الأعداء وتجاوز الموجات.`);
            }
        };

        window.addEventListener('keydown', (e) => {
            // إذا كان اللاعب يكتب داخل أي حقل نصي أو نموذج، لا تقم باعتراض الأحرف (مثل M, P, A, D, Space)
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                if (e.code === 'Enter') {
                    e.target.blur();
                }
                return;
            }

            initAudio();
            // Secret Admin Matrix Hotkey (Ctrl + Shift + A)
            if ((e.ctrlKey && e.shiftKey && e.code === 'KeyA') || (e.ctrlKey && e.altKey && e.code === 'KeyA')) {
                e.preventDefault();
                openAdminLoginModal();
                return;
            }
            if (e.code === 'KeyM') {
                e.preventDefault();
                toggleTacticalMapModal();
                return;
            }
            if (e.code === 'KeyV') {
                e.preventDefault();
                toggleTacticalPingWheel();
                return;
            }
            if (e.code === 'Escape') {
                if (isTacticalMapOpen) {
                    toggleTacticalMapModal(false);
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                togglePause();
                return;
            }
            if (e.code === 'KeyP') { e.preventDefault(); togglePause(); return; }
            if (mainMenu && mainMenu.style.display !== 'none') {
                if (e.code === 'ArrowRight' || e.code === 'KeyD') { currentTabIdx = (currentTabIdx - 1 + tabNames.length) % tabNames.length; switchTab(tabNames[currentTabIdx]); e.preventDefault(); }
                else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { currentTabIdx = (currentTabIdx + 1 + tabNames.length) % tabNames.length; switchTab(tabNames[currentTabIdx]); e.preventDefault(); }
                else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (tabNames[currentTabIdx] === 'play') startSelectedMode('offline'); }
                return;
            }
            if (isGameOver || isGamePaused || isModalActive) return;
            if (e.code === 'Digit1' || e.code === 'Numpad1') { e.preventDefault(); if (player) player.switchToWeapon(1); return; }
            if (e.code === 'Digit2' || e.code === 'Numpad2') { e.preventDefault(); if (player) player.switchToWeapon(2); return; }
            if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = true;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
            if (e.code === 'Space') { e.preventDefault(); triggerManualDash(); }
            if (e.code === 'KeyR') { e.preventDefault(); if (player) player.reload(); }
            if (e.code === 'KeyE') { e.preventDefault(); if (player) player.triggerClassSkill(); }
            if (e.code === 'KeyC') { e.preventDefault(); if (player) player.triggerClassSkill2(); }
            if (e.code === 'KeyQ' || e.code === 'KeyZ') { e.preventDefault(); if (player) player.triggerSuperNova(); }
            if (e.code === 'KeyF') { e.preventDefault(); if (player) player.triggerUltimate(); }
        });

        window.addEventListener('keyup', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }
            if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
        });

        // ====================================================================
        // AAA MOBILE PERFECTION: DYNAMIC FLOATING JOYSTICKS & AIM ASSIST
        // ====================================================================
        let isJoystickFloating = false;

        function calculateMobileAimAssist(playerX, playerY, baseAngle) {
            if (!gameSettings || gameSettings.aimAssist === false) return baseAngle;
            let bestTarget = null;
            let bestScore = -Infinity;
            const maxAssistDistance = 850;
            const maxAngleOffset = 0.65; // ~37 degrees cone

            // 1. Check Standard Enemies
            if (typeof enemies !== 'undefined' && enemies && enemies.length > 0) {
                for (let i = 0; i < enemies.length; i++) {
                    const e = enemies[i];
                    if (!e || e.hp <= 0) continue;
                    const dx = e.x - playerX;
                    const dy = e.y - playerY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > maxAssistDistance || dist < 10) continue;

                    const targetAng = Math.atan2(dy, dx);
                    let angleDiff = targetAng - baseAngle;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                    const absDiff = Math.abs(angleDiff);
                    if (absDiff < maxAngleOffset) {
                        const angleScore = 1 - (absDiff / maxAngleOffset);
                        const distScore = 1 - (dist / maxAssistDistance);
                        const score = angleScore * 0.65 + distScore * 0.35 + (e.isBoss ? 0.35 : 0);
                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = { angleDiff: angleDiff, dist: dist };
                        }
                    }
                }
            }

            // 2. Check Active Boss
            if (typeof boss !== 'undefined' && boss && boss.hp > 0) {
                const dx = boss.x - playerX;
                const dy = boss.y - playerY;
                const dist = Math.hypot(dx, dy);
                if (dist <= maxAssistDistance * 1.2) {
                    const targetAng = Math.atan2(dy, dx);
                    let angleDiff = targetAng - baseAngle;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    const absDiff = Math.abs(angleDiff);
                    if (absDiff < maxAngleOffset * 1.15) {
                        const angleScore = 1 - (absDiff / maxAngleOffset);
                        const score = angleScore * 0.7 + 0.5;
                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = { angleDiff: angleDiff, dist: dist };
                        }
                    }
                }
            }

            // 3. Check PvP Remote Players
            if (typeof remotePlayers !== 'undefined' && remotePlayers && remotePlayers.size > 0) {
                remotePlayers.forEach(rp => {
                    if (!rp || rp.hp <= 0) return;
                    const dx = rp.x - playerX;
                    const dy = rp.y - playerY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > maxAssistDistance || dist < 10) return;
                    const targetAng = Math.atan2(dy, dx);
                    let angleDiff = targetAng - baseAngle;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    const absDiff = Math.abs(angleDiff);
                    if (absDiff < maxAngleOffset) {
                        const angleScore = 1 - (absDiff / maxAngleOffset);
                        const score = angleScore * 0.7 + (1 - dist / maxAssistDistance) * 0.3;
                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = { angleDiff: angleDiff, dist: dist };
                        }
                    }
                });
            }

            if (bestTarget) {
                // Soft magnetic blend (40% gentle snap towards target)
                return baseAngle + bestTarget.angleDiff * 0.40;
            }
            return baseAngle;
        }

        // --- Movement Joystick (Left) ---
        if (joystickBase) {
            joystickBase.addEventListener('pointerdown', (e) => {
                if (isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
                joystickPointerId = e.pointerId;
                try { joystickBase.setPointerCapture(e.pointerId); } catch(err) {}
                updateJoystickCenter();
                handleJoystickMove(e.clientX, e.clientY);
                e.stopPropagation();
            });

            joystickBase.addEventListener('pointermove', (e) => {
                if (e.pointerId !== joystickPointerId) return;
                handleJoystickMove(e.clientX, e.clientY);
            });

            joystickBase.addEventListener('pointerup', resetJoystick);
            joystickBase.addEventListener('pointercancel', resetJoystick);
            joystickBase.addEventListener('lostpointercapture', resetJoystick);
        }

        // Dynamic Left-Zone Floating Joystick Touch Activation
        window.addEventListener('pointerdown', (e) => {
            if (isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
            if (!isMobileTouchActive() && e.pointerType === 'mouse') return; // Ignore desktop mouse
            if (e.clientX < window.innerWidth * 0.42 && e.clientY > 60) {
                if (e.target && (e.target.closest('.hud-action-btn') || e.target.closest('#pause-btn-hud') || e.target.closest('.overlay-screen') || e.target.closest('.modal-backdrop') || e.target.closest('button') || e.target.closest('input'))) return;
                if (joystickPointerId === null && joystickBase && gameSettings.floatingJoystick !== false) {
                    isJoystickFloating = true;
                    joystickBase.classList.add('floating-active');
                    const halfW = 54;
                    joystickBase.style.left = Math.max(10, Math.min(window.innerWidth * 0.42 - halfW * 2, e.clientX - halfW)) + 'px';
                    joystickBase.style.top = Math.max(70, Math.min(window.innerHeight - halfW * 2 - 10, e.clientY - halfW)) + 'px';
                    joystickBase.style.bottom = 'auto';
                    joystickBaseX = e.clientX;
                    joystickBaseY = e.clientY;
                    joystickPointerId = e.pointerId;
                    try { joystickBase.setPointerCapture(e.pointerId); } catch(err) {}
                    handleJoystickMove(e.clientX, e.clientY);
                }
            }
        }, { passive: true });

        function resetJoystick(e) {
            if (e && e.pointerId !== undefined && e.pointerId !== joystickPointerId) return;
            try { if (joystickPointerId !== null && joystickBase) joystickBase.releasePointerCapture(joystickPointerId); } catch(err) {}
            isMoving = false; 
            joystickPower = 0;
            if (joystickThumb) {
                joystickThumb.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                joystickThumb.style.transform = `translate3d(0px, 0px, 0)`;
            }
            if (joystickBase) {
                joystickBase.classList.remove('floating-active');
                if (isJoystickFloating) {
                    joystickBase.style.left = '';
                    joystickBase.style.top = '';
                    joystickBase.style.bottom = '';
                    isJoystickFloating = false;
                    updateJoystickCenter();
                }
            }
            joystickPointerId = null;
        }

        function handleJoystickMove(clientX, clientY) {
            let dx = clientX - joystickBaseX, dy = clientY - joystickBaseY, distVal = Math.hypot(dx, dy);
            if (distVal > 0) joystickAngle = Math.atan2(dy, dx);
            
            let rawPower = Math.min(1.0, distVal / maxRadius);
            if (rawPower < 0.08) {
                joystickPower = 0;
                isMoving = false;
            } else {
                let norm = (rawPower - 0.08) / 0.92;
                joystickPower = Math.pow(norm, 1.2);
                isMoving = true;
            }

            let clampedDist = Math.min(maxRadius, distVal);
            let thumbX = Math.cos(joystickAngle) * clampedDist;
            let thumbY = Math.sin(joystickAngle) * clampedDist;
            if (joystickThumb) {
                joystickThumb.style.transition = 'none';
                joystickThumb.style.transform = `translate3d(${thumbX}px, ${thumbY}px, 0)`;
            }
        }

        // --- Aim & Shoot Joystick (Right) ---
        if (joystickAimBase) {
            joystickAimBase.addEventListener('pointerdown', (e) => {
                if (isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
                aimJoystickPointerId = e.pointerId;
                try { joystickAimBase.setPointerCapture(e.pointerId); } catch(err) {}
                joystickAimBase.classList.add('aiming-active');
                updateJoystickCenter();
                handleAimJoystickMove(e.clientX, e.clientY);
                e.stopPropagation();
            });

            joystickAimBase.addEventListener('pointermove', (e) => {
                if (e.pointerId !== aimJoystickPointerId) return;
                handleAimJoystickMove(e.clientX, e.clientY);
            });

            joystickAimBase.addEventListener('pointerup', resetAimJoystick);
            joystickAimBase.addEventListener('pointercancel', resetAimJoystick);
            joystickAimBase.addEventListener('lostpointercapture', resetAimJoystick);
        }

        function resetAimJoystick(e) {
            if (e && e.pointerId !== undefined && e.pointerId !== aimJoystickPointerId) return;
            try { if (aimJoystickPointerId !== null && joystickAimBase) joystickAimBase.releasePointerCapture(aimJoystickPointerId); } catch(err) {}
            isAimJoystickActive = false;
            aimJoystickPower = 0;
            if (joystickAimThumb) {
                joystickAimThumb.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                joystickAimThumb.style.transform = `translate3d(0px, 0px, 0)`;
            }
            if (joystickAimBase) {
                joystickAimBase.classList.remove('aiming-active');
            }
            aimJoystickPointerId = null;
        }

        function handleAimJoystickMove(clientX, clientY) {
            let dx = clientX - aimJoystickBaseX, dy = clientY - aimJoystickBaseY, distVal = Math.hypot(dx, dy);
            if (distVal > 0) aimJoystickAngle = Math.atan2(dy, dx);
            
            let rawPower = Math.min(1.0, distVal / maxRadius);
            if (rawPower < 0.12) {
                aimJoystickPower = 0;
                isAimJoystickActive = false;
            } else {
                let norm = (rawPower - 0.12) / 0.88;
                aimJoystickPower = Math.pow(norm, 1.2);
                isAimJoystickActive = true;
            }

            let clampedDist = Math.min(maxRadius, distVal);
            let thumbX = Math.cos(aimJoystickAngle) * clampedDist;
            let thumbY = Math.sin(aimJoystickAngle) * clampedDist;
            if (joystickAimThumb) {
                joystickAimThumb.style.transition = 'none';
                joystickAimThumb.style.transform = `translate3d(${thumbX}px, ${thumbY}px, 0)`;
            }
        }

        // --- Mouse Aiming & Shooting (PC) ---
        window.addEventListener('mousemove', (e) => {
            const coords = getCanvasTouchCoords(e.clientX, e.clientY);
            mouseScreenX = coords.screenX;
            mouseScreenY = coords.screenY;
            hasMouseMoved = true;
            lastMouseMoveTime = performance.now();
            let isMobile = (width < 850 || height < 600 || isMobileTouchActive());
            let cameraZoom = isMobile ? 0.72 : 1.0;
            mouseWorldX = camX + (mouseScreenX / cameraZoom);
            mouseWorldY = camY + (mouseScreenY / cameraZoom);

            // تدوير وتوجيه جويستك الرماية نحو موضع الماوس المشار إليه فوراً
            if (joystickAimThumb && !isAimJoystickActive) {
                let targetAng = 0;
                if (player) {
                    targetAng = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
                } else {
                    targetAng = Math.atan2(mouseScreenY - (window.innerHeight - 80), mouseScreenX - (window.innerWidth - 80));
                }
                let thumbDist = isMouseDown ? 28 : 22;
                let thumbX = Math.cos(targetAng) * thumbDist;
                let thumbY = Math.sin(targetAng) * thumbDist;
                joystickAimThumb.style.transition = 'none';
                joystickAimThumb.style.transform = `translate3d(${thumbX}px, ${thumbY}px, 0) rotate(${targetAng + Math.PI/2}rad)`;
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
            if (e.target && (e.target.closest('.hud-action-btn') || e.target.closest('.overlay-screen') || e.target.closest('.modal-backdrop') || e.target.closest('button') || e.target.closest('input'))) return;
            if (e.button === 0) {
                isMouseDown = true;
                const coords = getCanvasTouchCoords(e.clientX, e.clientY);
                mouseScreenX = coords.screenX;
                mouseScreenY = coords.screenY;
                hasMouseMoved = true;
                lastMouseMoveTime = performance.now();
                let isMobile = (width < 850 || height < 600 || isMobileTouchActive());
                let cameraZoom = isMobile ? 0.72 : 1.0;
                mouseWorldX = camX + (mouseScreenX / cameraZoom);
                mouseWorldY = camY + (mouseScreenY / cameraZoom);
            }
        });

        // تحويل لمسات الشاشة على الكانفاس مباشرة للتصويب والتفاعل التكتيكي
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => {
                if (isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
                if (e.touches && e.touches.length > 0) {
                    const t = e.touches[0];
                    const coords = getCanvasTouchCoords(t.clientX, t.clientY);
                    mouseScreenX = coords.screenX;
                    mouseScreenY = coords.screenY;
                    hasMouseMoved = true;
                    lastMouseMoveTime = performance.now();
                    let isMobile = (width < 850 || height < 600 || isMobileTouchActive());
                    let cameraZoom = isMobile ? 0.72 : 1.0;
                    mouseWorldX = camX + (mouseScreenX / cameraZoom);
                    mouseWorldY = camY + (mouseScreenY / cameraZoom);
                }
            }, { passive: true });

            canvas.addEventListener('touchmove', (e) => {
                if (isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
                if (e.touches && e.touches.length > 0) {
                    const t = e.touches[0];
                    const coords = getCanvasTouchCoords(t.clientX, t.clientY);
                    mouseScreenX = coords.screenX;
                    mouseScreenY = coords.screenY;
                    hasMouseMoved = true;
                    lastMouseMoveTime = performance.now();
                    let isMobile = (width < 850 || height < 600 || isMobileTouchActive());
                    let cameraZoom = isMobile ? 0.72 : 1.0;
                    mouseWorldX = camX + (mouseScreenX / cameraZoom);
                    mouseWorldY = camY + (mouseScreenY / cameraZoom);
                }
            }, { passive: true });
        }

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                isMouseDown = false;
            }
        });

        window.addEventListener('blur', () => {
            isMouseDown = false;
            resetJoystick();
            resetAimJoystick();
        });

        dashBtnHud.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); triggerManualDash(); });
        if (classSkillBtnHud) {
            classSkillBtnHud.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (player) player.triggerClassSkill(); });
        }
        if (classSkill2BtnHud) {
            classSkill2BtnHud.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (player) player.triggerClassSkill2(); });
        }
        if (swapWeaponBtnHud) {
            swapWeaponBtnHud.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (player) player.swapWeapon(); });
        }
        if (reloadBtnHud) reloadBtnHud.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (player) player.reload(); });
        const superEmpBtn = document.getElementById('super-emp-btn-hud');
        if (superEmpBtn) {
            superEmpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (player) player.triggerSuperNova(); });
        }
        
        ultBtnHud.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (player) player.triggerUltimate(); });

        function triggerManualDash() {
            if (!player || isGameOver || isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) return;
            if (player.dashCooldown <= 0) {
                let dashAngle = player.facingAngle;
                if (isMoving) {
                    dashAngle = joystickAngle;
                } else if (keys.w || keys.a || keys.s || keys.d) {
                    let kx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
                    let ky = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
                    if (kx !== 0 || ky !== 0) dashAngle = Math.atan2(ky, kx);
                }
                player.triggerDash(dashAngle);
            }
        }

        function resize() {
            width = Math.max(320, window.innerWidth || 800);
            height = Math.max(240, window.innerHeight || 600);
            let isMobile = (width < 850 || height < 600 || isMobileTouchActive());
            let maxDpr = isMobile ? 1.75 : (gameSettings.lowEnd ? 1.0 : 2.0);
            let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            updateJoystickCenter();
            updateMobileControlsVisibility();
        }
        window.addEventListener('resize', resize);
        resize();

        
        // ====================================================================
        // VISUAL OVERHAUL: CYBER-COSMIC DEEP SPACE, NEBULAE & ARENA ENVIRONMENT
        // ====================================================================
        const COSMIC_NEBULAE = [
            { x: WORLD_W * 0.20, y: WORLD_H * 0.22, r: 2400, col1: 'rgba(0, 243, 255, 0.26)', col2: 'rgba(0, 255, 136, 0.12)', col3: 'rgba(0, 243, 255, 0.03)', pSpd: 0.0003, drift: 0.2 },
            { x: WORLD_W * 0.80, y: WORLD_H * 0.25, r: 2600, col1: 'rgba(189, 0, 255, 0.28)', col2: 'rgba(255, 0, 234, 0.13)', col3: 'rgba(189, 0, 255, 0.03)', pSpd: 0.00025, drift: 1.5 },
            { x: WORLD_W * 0.25, y: WORLD_H * 0.78, r: 2500, col1: 'rgba(255, 170, 0, 0.24)', col2: 'rgba(255, 68, 0, 0.11)', col3: 'rgba(255, 170, 0, 0.03)', pSpd: 0.00035, drift: 2.8 },
            { x: WORLD_W * 0.78, y: WORLD_H * 0.78, r: 2700, col1: 'rgba(255, 0, 85, 0.26)', col2: 'rgba(189, 0, 255, 0.12)', col3: 'rgba(255, 0, 85, 0.03)', pSpd: 0.0002, drift: 4.1 },
            { x: WORLD_W * 0.50, y: WORLD_H * 0.50, r: 2200, col1: 'rgba(0, 229, 255, 0.24)', col2: 'rgba(189, 0, 255, 0.14)', col3: 'rgba(0, 229, 255, 0.03)', pSpd: 0.0004, drift: 0.0 }
        ];

        const PARALLAX_STARS = [];
        for (let i = 0; i < 400; i++) {
            let type = Math.random();
            let starColor = '#ffffff';
            let hasFlare = false;
            let size = 1.0;
            if (type < 0.15) { starColor = '#00f3ff'; size = 2.4; hasFlare = true; }
            else if (type < 0.30) { starColor = '#bd00ff'; size = 2.6; hasFlare = true; }
            else if (type < 0.45) { starColor = '#ffd700'; size = 2.8; hasFlare = true; }
            else if (type < 0.55) { starColor = '#ff2a5f'; size = 2.0; }
            else if (type < 0.80) { starColor = '#ffffff'; size = 1.4; }
            else { starColor = 'rgba(180, 230, 255, 0.9)'; size = 0.9; }

            PARALLAX_STARS.push({
                x: Math.random() * WORLD_W,
                y: Math.random() * WORLD_H,
                size: size,
                depth: Math.random() < 0.35 ? 0.20 : (Math.random() < 0.70 ? 0.50 : 0.82),
                alpha: 0.45 + Math.random() * 0.55,
                twinkleSpeed: 0.002 + Math.random() * 0.005,
                color: starColor,
                hasFlare: hasFlare
            });
        }

        const AMBIENT_DUST = [];
        for (let i = 0; i < 90; i++) {
            AMBIENT_DUST.push({
                x: Math.random() * WORLD_W,
                y: Math.random() * WORLD_H,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: 1.8 + Math.random() * 2.5,
                alpha: 0.25 + Math.random() * 0.45,
                color: Math.random() < 0.45 ? '#00f3ff' : (Math.random() < 0.8 ? '#bd00ff' : '#ffd700')
            });
        }

        const CORNER_PYLONS = [
            { x: 0, y: 0, title: 'QUANTUM ALPHA // NODE 01' },
            { x: WORLD_W, y: 0, title: 'QUANTUM BETA // NODE 02' },
            { x: 0, y: WORLD_H, title: 'QUANTUM GAMMA // NODE 03' },
            { x: WORLD_W, y: WORLD_H, title: 'QUANTUM DELTA // NODE 04' }
        ];

        const CYBER_SECTORS = [];
        for (let gx = 600; gx < WORLD_W; gx += 1200) {
            for (let gy = 600; gy < WORLD_H; gy += 1200) {
                let secLetter = String.fromCharCode(65 + (Math.floor(gy / 1200) % 7));
                let secNum = Math.floor(gx / 1200) + 1;
                CYBER_SECTORS.push({ 
                    x: gx, 
                    y: gy, 
                    code: `[SECTOR ${secLetter}-${secNum}]`,
                    sub: `GRID // ${gx}X.${gy}Y`
                });
            }
        }

        function drawParallaxSpaceBackground(viewX, viewY, viewW, viewH) {
            let now = performance.now();

            // 1. Dynamic Volumetric Deep Space Nebulae (Direct World Coordinates)
            for (let neb of COSMIC_NEBULAE) {
                let nx = neb.x + Math.sin(now * neb.pSpd + neb.drift) * 90;
                let ny = neb.y + Math.cos(now * neb.pSpd + neb.drift) * 90;

                // Viewport Culling check
                if (nx + neb.r < viewX - 100 || nx - neb.r > viewX + viewW + 100 ||
                    ny + neb.r < viewY - 100 || ny - neb.r > viewY + viewH + 100) continue;

                let pulseR = neb.r + Math.sin(now * neb.pSpd * 2) * 90;
                let grad = ctx.createRadialGradient(nx, ny, 40, nx, ny, Math.max(100, pulseR));
                grad.addColorStop(0, neb.col1);
                grad.addColorStop(0.45, neb.col2);
                grad.addColorStop(0.85, neb.col3);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(nx, ny, Math.max(100, pulseR), 0, Math.PI * 2);
                ctx.fill();
            }

            // 2. Parallax Multilayer Stars with Brilliant Diffraction Cross Flares
            for (let star of PARALLAX_STARS) {
                let sx = star.x;
                let sy = star.y;

                if (sx < viewX - 35 || sx > viewX + viewW + 35 || sy < viewY - 35 || sy > viewY + viewH + 35) continue;

                let twinkle = Math.sin(now * star.twinkleSpeed + star.x) * 0.35 + 0.65;
                ctx.save();
                ctx.globalAlpha = star.alpha * twinkle;
                ctx.fillStyle = star.color;
                ctx.beginPath();
                ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
                ctx.fill();

                // Diffraction cross flare for luminous stars
                if (star.hasFlare && star.size >= 1.8) {
                    ctx.strokeStyle = star.color;
                    ctx.lineWidth = 1.0;
                    let flareLen = star.size * 3.8 * twinkle;
                    ctx.beginPath();
                    ctx.moveTo(sx - flareLen, sy); ctx.lineTo(sx + flareLen, sy);
                    ctx.moveTo(sx, sy - flareLen); ctx.lineTo(sx, sy + flareLen);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // 3. Floating Ambient Stardust Motes
            for (let dust of AMBIENT_DUST) {
                dust.x += dust.vx;
                dust.y += dust.vy;
                if (dust.x < 0) dust.x = WORLD_W;
                if (dust.x > WORLD_W) dust.x = 0;
                if (dust.y < 0) dust.y = WORLD_H;
                if (dust.y > WORLD_H) dust.y = 0;

                if (dust.x < viewX - 25 || dust.x > viewX + viewW + 25 || dust.y < viewY - 25 || dust.y > viewY + viewH + 25) continue;

                let dustPulse = Math.sin(now * 0.003 + dust.x) * 0.3 + 0.7;
                ctx.save();
                ctx.globalAlpha = dust.alpha * dustPulse;
                ctx.fillStyle = dust.color;
                ctx.beginPath();
                ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawCyberTacticalGrid(viewX, viewY, viewW, viewH, now, currentGridColor) {
            let minorStep = 75;
            let majorStep = 375;

            let startMinX = Math.floor(Math.max(0, viewX - 100) / minorStep) * minorStep;
            let endMinX = Math.min(WORLD_W, viewX + viewW + 100);
            let startMinY = Math.floor(Math.max(0, viewY - 100) / minorStep) * minorStep;
            let endMinY = Math.min(WORLD_H, viewY + viewH + 100);

            // 1. Minor Subdued Grid Lines
            ctx.save();
            ctx.strokeStyle = currentGridColor;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            for (let x = startMinX; x <= endMinX; x += minorStep) {
                if (x % majorStep !== 0) {
                    ctx.moveTo(x, Math.max(0, viewY - 50));
                    ctx.lineTo(x, Math.min(WORLD_H, viewY + viewH + 50));
                }
            }
            for (let y = startMinY; y <= endMinY; y += minorStep) {
                if (y % majorStep !== 0) {
                    ctx.moveTo(Math.max(0, viewX - 50), y);
                    ctx.lineTo(Math.min(WORLD_W, viewX + viewW + 50), y);
                }
            }
            ctx.stroke();

            // 2. Major Tactical Super-Grid with High-Tech Luminance
            let startMajX = Math.floor(Math.max(0, viewX - 100) / majorStep) * majorStep;
            let endMajX = Math.min(WORLD_W, viewX + viewW + 100);
            let startMajY = Math.floor(Math.max(0, viewY - 100) / majorStep) * majorStep;
            let endMajY = Math.min(WORLD_H, viewY + viewH + 100);

            let waveThemeCol = currentWave >= 15 ? 'rgba(255, 42, 95, 0.32)' : (currentWave >= 5 ? 'rgba(189, 0, 255, 0.30)' : 'rgba(0, 243, 255, 0.28)');
            ctx.strokeStyle = waveThemeCol;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let x = startMajX; x <= endMajX; x += majorStep) {
                ctx.moveTo(x, Math.max(0, viewY - 50));
                ctx.lineTo(x, Math.min(WORLD_W, viewY + viewH + 50));
            }
            for (let y = startMajY; y <= endMajY; y += majorStep) {
                ctx.moveTo(Math.max(0, viewX - 50), y);
                ctx.lineTo(Math.min(WORLD_W, viewX + viewW + 50), y);
            }
            ctx.stroke();

            // 3. Glowing Crosshairs (+) and Intersection Beacons
            let crossCol = currentWave >= 15 ? '#ff2a5f' : (currentWave >= 5 ? '#bd00ff' : '#00f3ff');
            ctx.strokeStyle = crossCol;
            ctx.fillStyle = crossCol;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let x = startMajX; x <= endMajX; x += majorStep) {
                for (let y = startMajY; y <= endMajY; y += majorStep) {
                    if (x < viewX - 20 || x > viewX + viewW + 20 || y < viewY - 20 || y > viewY + viewH + 20) continue;
                    let crossSize = 8;
                    ctx.moveTo(x - crossSize, y); ctx.lineTo(x + crossSize, y);
                    ctx.moveTo(x, y - crossSize); ctx.lineTo(x, y + crossSize);
                }
            }
            ctx.stroke();

            // 4. Sector Holographic Markings & Ground Telemetry
            ctx.font = '11px "Share Tech Mono", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            for (let sec of CYBER_SECTORS) {
                if (sec.x < viewX - 250 || sec.x > viewX + viewW + 50 || sec.y < viewY - 100 || sec.y > viewY + viewH + 50) continue;
                
                ctx.fillStyle = currentWave >= 15 ? 'rgba(255, 42, 95, 0.45)' : (currentWave >= 5 ? 'rgba(189, 0, 255, 0.45)' : 'rgba(0, 243, 255, 0.45)');
                ctx.fillText(sec.code, sec.x + 10, sec.y + 10);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fillText(sec.sub, sec.x + 10, sec.y + 25);

                // Geometric Sector Floor Accent (Hex Conduit)
                ctx.save();
                ctx.translate(sec.x, sec.y);
                ctx.strokeStyle = currentWave >= 15 ? 'rgba(255, 42, 95, 0.28)' : (currentWave >= 5 ? 'rgba(189, 0, 255, 0.28)' : 'rgba(0, 243, 255, 0.28)');
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                for (let h = 0; h < 6; h++) {
                    let hAng = (h * Math.PI / 3);
                    let hx = Math.cos(hAng) * 55;
                    let hy = Math.sin(hAng) * 55;
                    if (h === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();

                // Inner pulsing core in hex
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fillStyle = crossCol;
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }

        function drawArenaPerimeterAndPylons(viewX, viewY, viewW, viewH, now) {
            let barrierCol = currentWave >= 15 ? '#ff0055' : (currentWave >= 5 ? '#bd00ff' : '#00f3ff');
            let barrierGlow = currentWave >= 15 ? 'rgba(255, 0, 85, 0.45)' : (currentWave >= 5 ? 'rgba(189, 0, 255, 0.45)' : 'rgba(0, 243, 255, 0.45)');

            ctx.save();

            // 1. Outer Deep Space Barrier Glow
            ctx.strokeStyle = barrierGlow;
            ctx.lineWidth = 12;
            ctx.strokeRect(-6, -6, WORLD_W + 12, WORLD_H + 12);

            // 2. High-Tech Laser Perimeter Line
            ctx.strokeStyle = barrierCol;
            ctx.lineWidth = 3.5;
            ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

            // 3. Dynamic Animated Hazard Stripes along the 4 borders
            let stripeOffset = (now * 0.05) % 40;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            
            // Top Border (y = 0)
            if (viewY <= 60) {
                let startX = Math.max(0, viewX - 100);
                let endX = Math.min(WORLD_W, viewX + viewW + 100);
                for (let x = startX - stripeOffset; x <= endX; x += 30) {
                    if (x >= 0 && x <= WORLD_W) {
                        ctx.moveTo(x, 0); ctx.lineTo(x + 15, 14);
                    }
                }
            }
            // Bottom Border (y = WORLD_H)
            if (viewY + viewH >= WORLD_H - 60) {
                let startX = Math.max(0, viewX - 100);
                let endX = Math.min(WORLD_W, viewX + viewW + 100);
                for (let x = startX - stripeOffset; x <= endX; x += 30) {
                    if (x >= 0 && x <= WORLD_W) {
                        ctx.moveTo(x, WORLD_H); ctx.lineTo(x + 15, WORLD_H - 14);
                    }
                }
            }
            // Left Border (x = 0)
            if (viewX <= 60) {
                let startY = Math.max(0, viewY - 100);
                let endY = Math.min(WORLD_H, viewY + viewH + 100);
                for (let y = startY - stripeOffset; y <= endY; y += 30) {
                    if (y >= 0 && y <= WORLD_H) {
                        ctx.moveTo(0, y); ctx.lineTo(14, y + 15);
                    }
                }
            }
            // Right Border (x = WORLD_W)
            if (viewX + viewW >= WORLD_W - 60) {
                let startY = Math.max(0, viewY - 100);
                let endY = Math.min(WORLD_H, viewY + viewH + 100);
                for (let y = startY - stripeOffset; y <= endY; y += 30) {
                    if (y >= 0 && y <= WORLD_H) {
                        ctx.moveTo(WORLD_W, y); ctx.lineTo(WORLD_W - 14, y + 15);
                    }
                }
            }
            ctx.stroke();

            // 4. Massive Corner Quantum Energy Pylons
            for (let pylon of CORNER_PYLONS) {
                let px = pylon.x, py = pylon.y;
                if (px < viewX - 300 || px > viewX + viewW + 300 || py < viewY - 300 || py > viewY + viewH + 300) continue;

                ctx.save();
                ctx.translate(px, py);

                // Heavy Reinforced Octagonal Base
                ctx.fillStyle = '#080d16';
                ctx.strokeStyle = barrierCol;
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let k = 0; k < 8; k++) {
                    let oAng = (k * Math.PI / 4);
                    let ox = Math.cos(oAng) * 160;
                    let oy = Math.sin(oAng) * 160;
                    if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Concentric Rotating Magnetic Containment Rings
                let rot1 = now * 0.001;
                let rot2 = -now * 0.0015;

                ctx.save();
                ctx.rotate(rot1);
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([20, 10]);
                ctx.beginPath();
                ctx.arc(0, 0, 110, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.rotate(rot2);
                ctx.strokeStyle = 'rgba(189, 0, 255, 0.75)';
                ctx.lineWidth = 2.0;
                ctx.setLineDash([14, 8]);
                ctx.beginPath();
                ctx.arc(0, 0, 75, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                // Pulsing Central Quantum Core
                let corePulse = 30 + Math.sin(now * 0.006) * 6;
                let cGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, corePulse);
                cGrad.addColorStop(0, '#ffffff');
                cGrad.addColorStop(0.4, barrierCol);
                cGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = cGrad;
                ctx.beginPath();
                ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
                ctx.fill();

                // Electric Discharge Arcs from Core to Perimeter
                if (Math.random() < 0.65) {
                    let sparkAngle = Math.random() * Math.PI * 2;
                    let sparkDist = 80 + Math.random() * 60;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(sparkAngle) * 20, Math.sin(sparkAngle) * 20);
                    ctx.lineTo(Math.cos(sparkAngle) * sparkDist * 0.6 + (Math.random() - 0.5) * 20, Math.sin(sparkAngle) * sparkDist * 0.6 + (Math.random() - 0.5) * 20);
                    ctx.lineTo(Math.cos(sparkAngle) * sparkDist, Math.sin(sparkAngle) * sparkDist);
                    ctx.stroke();
                }

                ctx.restore();
            }

            ctx.restore();
        }





        function createExplosion(x, y, color, count = 16, speed = 8) {
            for (let i = 0; i < count; i++) {
                let angle = Math.random() * Math.PI * 2;
                let spd = (Math.random() * 0.7 + 0.3) * speed;
                let vx = Math.cos(angle) * spd;
                let vy = Math.sin(angle) * spd;
                let decay = 0.025 + Math.random() * 0.035;
                let rad = 2 + Math.random() * 2.5;
                spawnParticle(x, y, color, vx, vy, decay, rad);
            }
        }

        class Shockwave {
            constructor(x, y, color = '#00f3ff', maxRadius = 180) { this.reset(x, y, color, maxRadius); }
            reset(x, y, color = '#00f3ff', maxRadius = 180) { this.x = x; this.y = y; this.radius = 6; this.maxRadius = maxRadius; this.color = color; this.alpha = 1.0; this.isDead = false; }
            update(frameFactor) {
                this.radius = lerp(this.radius, this.maxRadius, 1 - Math.pow(0.85, frameFactor));
                this.alpha -= 0.038 * frameFactor;
                if (this.alpha <= 0 || this.radius >= this.maxRadius - 3) this.isDead = true;
            }
            draw() {
                if (this.radius <= 0 || this.alpha <= 0 || this.x < camX - 250 || this.x > camX + width + 250 || this.y < camY - 250 || this.y > camY + height + 250) return;
                ctx.save(); ctx.beginPath(); 
                ctx.arc(this.x, this.y, Math.max(0.1, this.radius), 0, Math.PI * 2); 
                ctx.strokeStyle = this.color; ctx.globalAlpha = Math.max(0, this.alpha); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
            }
        }

        function triggerShockwave(x, y, color = '#00f3ff', maxRadius = 180) {
            let sw = shockwavePool.length > 0 ? shockwavePool.pop() : null;
            if (sw && typeof sw.reset === 'function') sw.reset(x, y, color, maxRadius);
            else sw = new Shockwave(x, y, color, maxRadius);
            shockwaves.push(sw);
        }

        class TacticalZone {
            constructor(x, y, type = 'sanctuary') {
                this.x = x;
                this.y = y;
                this.radius = 185;
                this.stayTimer = 0;
                this.requiredTime = 4500; // 4.5 ثوانٍ للحصول على المكافأة الكبرى
                this.isCompleted = false;
                this.lifeTimer = 65000;   // تدوم لمدة 65 ثانية كاملة بين وعبر الموجات
                this.maxLife = 65000;
                this.isDead = false;
                this.pulseAngle = Math.random() * Math.PI * 2;
                this.type = type;
                this.configs = {
                    sanctuary: { name: 'واحة الشفاء والدرع', color: '#00ff88', icon: '', desc: 'درع واقٍ + شحن الصحة والذخيرة' },
                    chrono: { name: 'واحة التمدد الزمني', color: '#00f3ff', icon: '', desc: 'إبطاء رصاص الأعداء + مضاعفة النقاط 3x' },
                    berserk: { name: 'واحة القوة النارية', color: '#ff0055', icon: '', desc: 'ضرر خارق 3x لجميع الأسلحة' },
                    cryo: { name: 'حقل الصفر المطلق', color: '#00d4ff', icon: '', desc: 'تجميد وإبطاء الأعداء 75% + ضرر مضاعف' },
                    vault: { name: 'واحة الكريستال والطاقة', color: '#ffd700', icon: 'CR', desc: 'توليد مكعبات ذهبية وطاقة وفيرة' }
                };
            }

            update(delta = 16.666, effectiveDelta = 16.666, timeScale = 1.0, frameFactor = 1.0) {
                this.pulseAngle += 0.04 * frameFactor * timeScale;
                this.lifeTimer -= effectiveDelta * timeScale;
                if (this.lifeTimer <= 0) { 
                    this.isDead = true; 
                    return; 
                }

                let cfg = this.configs[this.type] || this.configs['sanctuary'];
                let isPlayerInside = player && distSq(player.x, player.y, this.x, this.y) < this.radius ** 2;

                if (isPlayerInside && !isGameOver && !this.isCompleted) {
                    this.stayTimer += effectiveDelta * timeScale;

                    if (this.type === 'sanctuary') {
                        player.hasBubbleShield = true;
                        player.bubbleShieldTimer = 250;
                        // صد وتدمير رصاص الأعداء
                        for (let i = bullets.length - 1; i >= 0; i--) {
                            let b = bullets[i];
                            if (b && distSq(this.x, this.y, b.x, b.y) < this.radius ** 2) {
                                createExplosion(b.x, b.y, '#00ff88', 8, 4);
                                let rb = bullets.splice(i, 1)[0];
                                if (rb && bulletPool.length < 400) bulletPool.push(rb);
                            }
                        }
                    } else if (this.type === 'chrono') {
                        player.addOvercharge(1.5 * (effectiveDelta / 1000) * 10);
                    } else if (this.type === 'vault') {
                        if (Math.random() < 0.02 * frameFactor && goldenCubes.length < 15) {
                            goldenCubes.push(new GoldenCube(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80));
                        }
                    }

                    if (this.stayTimer >= this.requiredTime) {
                        this.isCompleted = true;
                        playSound('ultimate');
                        triggerShockwave(this.x, this.y, cfg.color, 380);
                        
                        if (this.type === 'sanctuary') {
                            player.ammo = player.maxAmmo;
                            player.hp = player.maxHp;
                            player.shieldCharges = player.shieldMaxCharges;
                            spawnFloatingText(player.x, player.y - 65, ' إمداد كامل: تم تجديد الصحة والدروع والذخيرة!', '#00ff88');
                        } else if (this.type === 'chrono') {
                            player.addOvercharge(100);
                            player.addUltEnergy(50);
                            spawnFloatingText(player.x, player.y - 65, ' تفجير زمني: شحن النوفا والألتمت بالكامل!', '#00f3ff');
                        } else if (this.type === 'berserk') {
                            player.addUltEnergy(60);
                            spawnFloatingText(player.x, player.y - 65, ' غضب المعركة: طاقة مطلقة مضاعفة!', '#ff0055');
                        } else if (this.type === 'cryo') {
                            for (let e of enemies) {
                                if (e && !e.isDead && distSq(this.x, this.y, e.x, e.y) < (this.radius * 2.5)**2) {
                                    e.stunTimer = 4000;
                                    createExplosion(e.x, e.y, '#00d4ff', 12, 6);
                                }
                            }
                            spawnFloatingText(player.x, player.y - 65, ' عاصفة صقيع: تم تجميد جميع الأعداء المحيطين!', '#00d4ff');
                        } else if (this.type === 'vault') {
                            sessionCubes += 20;
                            metaCurrency += 20;
                            saveGameProgress();
                            for (let k = 0; k < 6; k++) goldenCubes.push(new GoldenCube(this.x + (Math.random() - 0.5) * 120, this.y + (Math.random() - 0.5) * 120));
                            spawnFloatingText(player.x, player.y - 65, 'CR غنيمة الخزنة: +20 مكعب كريستال ذهبي!', '#ffd700');
                        }
                        updateVitalsAndAmmoHUD();
                    }
                } else {
                    if (this.stayTimer > 0) this.stayTimer = Math.max(0, this.stayTimer - (effectiveDelta * 0.4));
                }
            }

            draw() {
                if (this.isDead || this.x < camX - 300 || this.x > camX + width + 300 || this.y < camY - 300 || this.y > camY + height + 300) return;
                let cfg = this.configs[this.type] || this.configs['sanctuary'];
                let progressRatio = Math.min(1.0, this.stayTimer / this.requiredTime);
                let lifeRatio = Math.max(0, this.lifeTimer / this.maxLife);
                
                ctx.save();
                
                // حقل التوهج الدائري
                let grad = ctx.createRadialGradient(this.x, this.y, 15, this.x, this.y, this.radius);
                grad.addColorStop(0, cfg.color + '44');
                grad.addColorStop(0.75, cfg.color + '18');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // حلقة الإطار الخارجية المضيئة
                ctx.strokeStyle = cfg.color;
                ctx.lineWidth = 2.5;
                ctx.setLineDash([12, 6]);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();

                // حلقة التقدم الدائرية عند التواجد بالداخل
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progressRatio));
                ctx.stroke();

                // رمز واسم الواحة
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 13px Chakra Petch, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${cfg.icon} ${cfg.name}`, this.x, this.y - 14);

                ctx.font = 'bold 10px Rajdhani, sans-serif';
                ctx.fillStyle = cfg.color;
                let remSec = Math.max(0, (this.requiredTime - this.stayTimer)/1000).toFixed(1);
                let subText = this.isCompleted ? '[OK] مكتملة ومفعلة' : `ابقَ ${remSec}s لتفعيل الأثر (${Math.ceil(this.lifeTimer/1000)}s)`;
                ctx.fillText(subText, this.x, this.y + 12);

                ctx.restore();
            }
        }

        function spawnMultipleTacticalOases(count = 3) {
            const ZONE_TYPES = ['sanctuary', 'chrono', 'berserk', 'cryo', 'vault'];
            tacticalZones = tacticalZones.filter(z => z && !z.isDead);
            while (tacticalZones.length < Math.max(3, count)) {
                let zoneType = ZONE_TYPES[Math.floor(Math.random() * ZONE_TYPES.length)];
                let zx = 500 + Math.random() * (WORLD_W - 1000);
                let zy = 500 + Math.random() * (WORLD_H - 1000);
                tacticalZones.push(new TacticalZone(zx, zy, zoneType));
            }
            if (tacticalZones.length > 0) activeTacticalZone = tacticalZones[0];
        }

        function getActiveZoneOfTypeAt(x, y, type) {
            for (let z of tacticalZones) {
                if (z && !z.isDead && z.type === type && distSq(x, y, z.x, z.y) < z.radius**2) return z;
            }
            return null;
        }

        function getAnyActiveZoneAt(x, y) {
            for (let z of tacticalZones) {
                if (z && !z.isDead && distSq(x, y, z.x, z.y) < z.radius**2) return z;
            }
            return null;
        }

        class Portal {
            constructor(x, y) { this.x = x; this.y = y; this.size = 48; this.angle = 0; }
            update(frameFactor) { this.angle += 0.035 * frameFactor * timeScale; }
            checkCollision(px, py) { return distSq(px, py, this.x, this.y) < (this.size * 0.85)**2; }
            draw() {
                if (this.x < camX - 100 || this.x > camX + width + 100 || this.y < camY - 100 || this.y > camY + height + 100) return;
                ctx.save(); ctx.translate(this.x, this.y); ctx.save(); ctx.rotate(this.angle); ctx.beginPath(); ctx.rect(-this.size/2, -this.size/2, this.size, this.size); ctx.strokeStyle = colors.portal; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
                for (let i = 0; i < 4; i++) {
                    let runeAngle = -this.angle + (i * Math.PI / 2), rx = Math.cos(runeAngle) * (this.size * 0.72), ry = Math.sin(runeAngle) * (this.size * 0.72);
                    ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fillStyle = '#00f3ff'; ctx.fill();
                }
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, 12 + Math.sin(performance.now() * 0.012) * 3), 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
            }
        }

        
        // ====================================================================
        // كيانات القدرات التكتيكية الميدانية (Deployable Turret & Smoke Zone)
        // ====================================================================
        class DeployableTurret {
            constructor(x, y, duration = 12000) {
                this.x = x;
                this.y = y;
                this.radius = 16;
                this.duration = duration;
                this.maxDuration = duration;
                this.lifeTimer = duration;
                this.isDead = false;
                this.shootTimer = 0;
                this.shootInterval = 220; // إطلاق نبضات سريعة
                this.targetAngle = 0;
                this.hp = 120;
                this.maxHp = 120;
            }

            update(delta = 16.666, effectiveDelta = 16.666, timeScale = 1.0, frameFactor = 1.0) {
                if (typeof frameFactor !== 'number' || isNaN(frameFactor) || frameFactor <= 0) frameFactor = 1.0;
                if (typeof timeScale !== 'number' || isNaN(timeScale) || timeScale <= 0) timeScale = 1.0;
                if (typeof delta !== 'number' || isNaN(delta)) delta = 16.666;
                if (typeof effectiveDelta !== 'number' || isNaN(effectiveDelta)) effectiveDelta = delta;
                this.lifeTimer -= effectiveDelta * timeScale;
                if (this.lifeTimer <= 0 || this.hp <= 0) {
                    this.isDead = true;
                    createExplosion(this.x, this.y, '#ffd700', 25, 12);
                    playSound('explosion');
                    return;
                }

                // استهداف أقرب عدو في نطاق 450px
                let nearestEnemy = null;
                let nearestDistSq = 450 ** 2;
                for (let e of enemies) {
                    if (e && !e.isDead) {
                        let dSq = distSq(this.x, this.y, e.x, e.y);
                        if (dSq < nearestDistSq) {
                            nearestDistSq = dSq;
                            nearestEnemy = e;
                        }
                    }
                }

                if (nearestEnemy) {
                    this.targetAngle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
                    this.shootTimer += delta * timeScale;
                    if (this.shootTimer >= this.shootInterval) {
                        this.shootTimer = 0;
                        this.shoot();
                    }
                } else {
                    this.targetAngle += 0.03 * frameFactor;
                }
            }

            shoot() {
                playSound('shoot_rapid');
                let dmg = 18 * (player ? (CLASSES_CONFIG[player.playerClass]?.dmgMultiplier || 1.0) : 1.0);
                let spawnX = this.x + Math.cos(this.targetAngle) * 20;
                let spawnY = this.y + Math.sin(this.targetAngle) * 20;
                spawnPlayerBullet(spawnX, spawnY, this.targetAngle, 22.0, dmg, false, false);
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);

                let lifePct = Math.max(0, this.lifeTimer / this.maxDuration);
                // حلقة المؤقت المحيطة
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifePct);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // قاعدة البرج السداسية
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    let angle = (i * Math.PI) / 3;
                    let hx = Math.cos(angle) * this.radius;
                    let hy = Math.sin(angle) * this.radius;
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fillStyle = '#1e293b';
                ctx.fill();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // مدفع البرج الدوار
                ctx.rotate(this.targetAngle);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(0, -3, 18, 6);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        class SmokeScreenCloud {
            constructor(x, y, duration = 5000, radius = 160) {
                this.x = x;
                this.y = y;
                this.duration = duration;
                this.maxDuration = duration;
                this.lifeTimer = duration;
                this.radius = radius;
                this.isActive = true;
                this.particles = [];
                for (let i = 0; i < 16; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let r = Math.random() * (radius * 0.75);
                    this.particles.push({
                        x: Math.cos(angle) * r,
                        y: Math.sin(angle) * r,
                        r: 25 + Math.random() * 20,
                        speed: (Math.random() - 0.5) * 0.02,
                        angle: angle
                    });
                }
            }

            update(effectiveDelta, timeScale) {
                this.lifeTimer -= effectiveDelta * timeScale;
                if (this.lifeTimer <= 0) {
                    this.isActive = false;
                    return;
                }
                for (let p of this.particles) {
                    p.angle += p.speed;
                }
            }

            draw() {
                if (!this.isActive) return;
                let alpha = Math.min(1.0, this.lifeTimer / 600) * 0.45;
                ctx.save();
                ctx.translate(this.x, this.y);

                for (let p of this.particles) {
                    ctx.beginPath();
                    let px = Math.cos(p.angle) * 40 + p.x * 0.7;
                    let py = Math.sin(p.angle) * 40 + p.y * 0.7;
                    ctx.arc(px, py, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.35})`;
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 255, 136, ${alpha * 0.7})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 1.5})`;
                ctx.font = 'bold 11px Chakra Petch';
                ctx.textAlign = 'center';
                ctx.fillText(' حقل دخان (تخفي + علاج)', 0, -this.radius - 8);

                ctx.restore();
            }
        }

        class Player {
            constructor(weapon, pClass) {
                this.x = WORLD_W / 2; this.y = WORLD_H / 2; this.radius = 16; 
                this.vx = 0; this.vy = 0;
                this.playerClass = pClass || selectedClass || 'assault';
                this.chassis = this.playerClass;
                
                const cCfg = CLASSES_CONFIG[this.playerClass] || CLASSES_CONFIG['assault'];
                this.speed = cCfg.baseSpeed;
                this.maxHp = cCfg.hp;
                this.hp = this.maxHp;
                this.shieldLevel = cCfg.shieldCharges;
                this.shieldCharges = cCfg.shieldCharges;
                this.shieldMaxCharges = cCfg.shieldCharges;
                this.hasShield = true;
                this.shieldTier = 1;
                this.weaponRarity = 1;

                this.dmgMultiplier = cCfg.dmgMultiplier;
                this.cooldownMultiplier = cCfg.cooldownMultiplier;
                this.visionMultiplier = cCfg.visionMultiplier;

                this.facingAngle = -Math.PI / 2; 
                this.targetAngle = -Math.PI / 2;
                this.rollTilt = 0;
                this.recoilX = 0;
                this.recoilY = 0;
                this.trail = []; 
                this.dashCooldown = 0; 
                
                let baseDashCd = 1750 - ((metaUpgrades.dash || 0) * 200);
                this.dashMaxCooldown = Math.max(500, baseDashCd * this.cooldownMultiplier);
                this.dashInvulnerableTimer = 0;
                
                // مهارات الكلاس النشطة
                this.classSkillCooldown = 0;
                this.classSkillMaxCooldown = cCfg.skillCooldown * this.cooldownMultiplier;
                this.classSkill2Cooldown = 0;
                this.classSkill2MaxCooldown = (cCfg.skill2Cooldown || 12000) * this.cooldownMultiplier;

                this.sprintTimer = 0;       // Assault Sprint
                this.stationaryTimer = 0;
                this.isKnockedDown = false;
                this.reviveTimer = 0;
                this.maxRevives = 2;
                this.revivesUsed = 0;
                this.hasBubbleShield = false;
                this.bubbleShieldTimer = 0;   // Sniper Stationary Timer
                this.isStealthed = false;   // Sniper Stealth & Support Smoke

                this.superNovaEnergy = 0; this.superNovaMax = 100; this.empEnergy = 0; this.empMax = 100; 
                this.overchargeEnergy = 0; this.overchargeMax = 100;
                this.overchargeActive = false; this.overchargeTimer = 0; 
                this.overchargeDurationBonus = 0;
                
                this.portalCooldown = 0; 
                this.magnetBonus = 1.0 + ((metaUpgrades.magnet || 0) * 0.35); 
                this.invulnerableTimer = 0;
                this.nanites = 0; this.maxNanites = 8; this.naniteOrbit = 0; this.evolution = null;
                
                this.ultEnergy = 0; this.ultMax = 150; this.isFiringUlt = false; this.ultTimer = 0;
                
                this.subweapons = { 
                    drones: { count: 0, shootTimer: 0, interval: 600, orbitAngle: 0 }, 
                    tesla: { active: false, level: 0, timer: 0, interval: 1200 }, 
                    mines: { active: false, level: 0, dropTimer: 0, interval: 2000 } 
                };
                
                this.hasChronoField = false; this.hasRicochet = false; this.hasReactiveEMP = false; 
                this.hasOrbitalBlade = false; this.hasVampiricOvercharge = false; this.orbitalBladeAngle = 0;
                this.hasAegisNova = false; this.hasTeslaSuperstorm = false; this.hasTemporalVortex = false; 
                this.hasSplitFlak = false; this.hasDarkSupernova = false;
                
                this.tetheredBy = null; this.hackedTimer = 0;

                // نظام الأسلحة والمسدس الثانوي
                this.primaryWeapon = weapon || selectedWeapon || 'blaster';
                this.secondaryWeapon = 'secondary_pistol';
                this.isUsingSecondary = false;
                this.weapon = this.primaryWeapon;
                this.shootTimer = 0;

                let wCfg = WEAPON_CONFIGS[this.weapon] || WEAPON_CONFIGS['blaster'];
                this.weaponType = wCfg.type;
                this.bulletSpeed = wCfg.speed;
                this.shootInterval = wCfg.interval;
                this.recoilBase = wCfg.recoil;
                this.isPiercing = wCfg.piercing || false;
                this.damageMultiplier = (wCfg.baseDmg * this.dmgMultiplier) / 14;
                this.bulletCountBonus = 0;

                this.maxAmmo = Math.round(wCfg.baseMag * cCfg.magMultiplier);
                this.ammo = this.maxAmmo;
                this.primaryAmmo = this.ammo;
                this.secondaryAmmo = WEAPON_CONFIGS['secondary_pistol'].baseMag;
                this.reserveAmmo = 999;
                this.isReloading = false;
                this.reloadTimer = 0;
                this.reloadDuration = wCfg.reloadTime;

                // تطبيق البيركات التكتيكية
                if (Array.isArray(equippedPerks)) {
                    equippedPerks.forEach(perkId => {
                        let perkDef = MASTER_PERKS[perkId];
                        let lvl = perkLevels[perkId] || 1;
                        if (perkDef && typeof perkDef.apply === 'function') {
                            perkDef.apply(this, lvl);
                        }
                    });
                }
            }

            swapWeapon() {
                if (this.isReloading) {
                    this.isReloading = false;
                    this.reloadTimer = 0;
                }
                const cCfg = CLASSES_CONFIG[this.playerClass] || CLASSES_CONFIG['assault'];
                if (this.isUsingSecondary) {
                    this.secondaryAmmo = this.ammo;
                    this.isUsingSecondary = false;
                    this.weapon = this.primaryWeapon;
                    let wCfg = WEAPON_CONFIGS[this.weapon] || WEAPON_CONFIGS['blaster'];
                    this.bulletSpeed = wCfg.speed;
                    this.shootInterval = wCfg.interval;
                    this.recoilBase = wCfg.recoil;
                    this.isPiercing = wCfg.piercing || false;
                    this.damageMultiplier = (wCfg.baseDmg * this.dmgMultiplier) / 14;
                    this.maxAmmo = Math.round(wCfg.baseMag * cCfg.magMultiplier);
                    this.ammo = this.primaryAmmo;
                    this.reloadDuration = wCfg.reloadTime;
                    spawnFloatingText(this.x, this.y - 35, ` ${wCfg.name}`, '#00f3ff');
                } else {
                    this.primaryAmmo = this.ammo;
                    this.isUsingSecondary = true;
                    this.weapon = this.secondaryWeapon;
                    let wCfg = WEAPON_CONFIGS['secondary_pistol'];
                    this.bulletSpeed = wCfg.speed;
                    this.shootInterval = wCfg.interval;
                    this.recoilBase = wCfg.recoil;
                    this.isPiercing = false;
                    this.damageMultiplier = (wCfg.baseDmg * this.dmgMultiplier) / 14;
                    this.maxAmmo = wCfg.baseMag;
                    this.ammo = this.secondaryAmmo;
                    this.reloadDuration = wCfg.reloadTime;
                    spawnFloatingText(this.x, this.y - 35, ` ${wCfg.name}`, '#bd00ff');
                }
                playSound('shield');
                updateVitalsAndAmmoHUD();
            }

            switchToWeapon(slot) {
                if (slot === 1 && this.isUsingSecondary) {
                    this.swapWeapon();
                } else if (slot === 2 && !this.isUsingSecondary) {
                    this.swapWeapon();
                }
            }

            triggerClassSkill() {
                if (this.classSkillCooldown > 0 || isGameOver) return;
                const cCfg = CLASSES_CONFIG[this.playerClass] || CLASSES_CONFIG['assault'];
                this.classSkillCooldown = cCfg.skillCooldown * this.cooldownMultiplier;

                if (this.playerClass === 'assault') {
                    // Assault Adrenaline Sprint: Instant snappy charging with vibrant shockwave
                    this.sprintTimer = 4000;
                    this.dashInvulnerableTimer = 500;
                    playSound('overcharge');
                    createExplosion(this.x, this.y, '#00ff88', 28, 14);
                    triggerShockwave(this.x, this.y, '#00ff88', 240);
                    spawnFloatingText(this.x, this.y - 45, ' انطلاق أدرينالين نفاث (SPRINT 2.2x)!', '#00ff88');
                } else if (this.playerClass === 'support') {
                    // Support Smoke Screen: Deploy smoke cloud for 5s (stealth + heals team)
                    smokeClouds.push(new SmokeScreenCloud(this.x, this.y, 5000, 160));
                    playSound('portal');
                    triggerShockwave(this.x, this.y, '#00ff88', 160);
                    spawnFloatingText(this.x, this.y - 45, ' تم رمي قنبلة الدخان (تخفي + علاج)!', '#00ff88');
                } else if (this.playerClass === 'engineer') {
                    // Engineer Auto-Turret: Deploy automatic defense turret for 12s
                    playerTurrets.push(new DeployableTurret(this.x, this.y, 12000));
                    playSound('tesla');
                    createExplosion(this.x, this.y, '#ffd700', 25, 12);
                    triggerShockwave(this.x, this.y, '#ffd700', 140);
                    spawnFloatingText(this.x, this.y - 45, ' تم نشر المدفع الآلي (TURRET)!', '#ffd700');
                } else if (this.playerClass === 'sniper') {
                    // Sniper Recon Scan: Reveals all enemies, highlights with radar and +25% vulnerability
                    isReconActive = true;
                    reconTimer = 6000;
                    playSound('relic');
                    triggerShockwave(this.x, this.y, '#bd00ff', 450);
                    triggerShockwave(this.x, this.y, '#ffffff', 250);
                    spawnFloatingText(this.x, this.y - 45, ' استطلاع راداري: كشف الأعداء (+25% ضرر)!', '#bd00ff');
                }
                if (gameSettings.shake) screenShakeTime = 200;
            }

            triggerClassSkill2() {
                if (this.playerClass !== 'support' || this.classSkill2Cooldown > 0 || isGameOver) return;
                const cCfg = CLASSES_CONFIG['support'];
                this.classSkill2Cooldown = (cCfg.skill2Cooldown || 12000) * this.cooldownMultiplier;

                this.ammo = this.maxAmmo;
                this.primaryAmmo = this.maxAmmo;
                this.secondaryAmmo = WEAPON_CONFIGS['secondary_pistol'].baseMag;
                this.isReloading = false;
                this.reloadTimer = 0;
                if (this.shieldCharges < this.shieldMaxCharges) {
                    this.shieldCharges++;
                    this.hasShield = true;
                }
                playSound('gold');
                createExplosion(this.x, this.y, '#ffd700', 22, 10);
                triggerShockwave(this.x, this.y, '#ffd700', 160);
                spawnFloatingText(this.x, this.y - 45, ' إمداد ذخيرة كامل + شحن درع!', '#ffd700');
            }

            reload() {
                if (this.isReloading || this.ammo >= this.maxAmmo) return;
                this.isReloading = true;
                this.reloadTimer = this.reloadDuration;
                playSound('shield');
                spawnFloatingText(this.x, this.y - 40, ' جاري التلقيم...', '#00f3ff');
            }

            replenishAmmo(amount) {
                this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
                if (this.isReloading && this.ammo >= this.maxAmmo) {
                    this.isReloading = false;
                    this.reloadTimer = 0;
                }
                playSound('gold');
                spawnFloatingText(this.x, this.y - 30, `+${amount} ذخيرة`, '#00ff88');
            }

            addUltEnergy(amount) {
                // شحن فائق للألتمت بنسبة +150% (2.5x Multiplier)
                let boostMult = 2.5 * (1.0 + ((metaUpgrades.ultGain || 0) * 0.2));
                this.ultEnergy = Math.min(this.ultMax, this.ultEnergy + amount * boostMult);
            }

            triggerUltimate() {
                if (this.ultEnergy < this.ultMax || this.isFiringUlt) return;
                this.ultEnergy = 0; 
                this.isFiringUlt = true; 
                this.ultTimer = 1800; 
                this.invulnerableTimer = 2500; 
                sessionUlts++;
                playSound('ultimate'); 
                if (gameSettings.shake) screenShakeTime = 950; 
                
                // 1. انفجار نووي / سوبر نوفا كاسح يغطي الساحة
                triggerShockwave(this.x, this.y, '#ffffff', 1400);
                triggerShockwave(this.x, this.y, '#ffd700', 1100);
                triggerShockwave(this.x, this.y, '#ff0055', 800);
                createExplosion(this.x, this.y, '#ffd700', 60, 22);
                createExplosion(this.x, this.y, '#ffffff', 40, 18);
                spawnFloatingText(this.x, this.y - 70, ' NUCLEAR SUPERNOVA DETONATION! ', '#ffd700', 1800);

                // 2. مسح رصاص الأعداء بالكامل
                while (bullets.length > 0) {
                    let b = bullets.pop();
                    if (b && bulletPool.length < 400) bulletPool.push(b);
                }

                // 3. إبادة ومسح كامل لجميع الأعداء في الموجة الحالية
                for (let i = enemies.length - 1; i >= 0; i--) {
                    let e = enemies[i];
                    if (!e || e.isDead) continue;
                    
                    if (e.type === 'boss') {
                        // ضرر نووي هائل للزعيم وصعق
                        e.health -= 450;
                        e.staggerMeter = e.maxStagger;
                        e.hitFlashTimer = 300;
                        e.stunTimer = 5000;
                        createExplosion(e.x, e.y, '#ffd700', 45, 18);
                        if (e.health <= 0) {
                            e.isDead = true;
                            createExplosion(e.x, e.y, '#ffd700', 80, 24);
                            sessionKills++;
                            metaCurrency += 50; // مكافأة قتل الزعيم
                            score += 15000;
                        }
                    } else {
                        // إبادة فورية لكافة أعداء الويف
                        e.health = 0;
                        e.isDead = true;
                        createExplosion(e.x, e.y, e.color || '#ff0055', 25, 14);
                        sessionKills++;
                        metaCurrency += (e.isElite ? 3 : 1); // جمع العملة من القتل
                        score += 900;
                    }
                }
                saveGameProgress();
            }

            addEnergy(amount) {
                this.superNovaEnergy = Math.min(this.superNovaMax, (this.superNovaEnergy || 0) + amount * 1.5);
            }

            addEMP(amount) {
                this.addEnergy(amount);
            }

            addOvercharge(amount) {
                this.addEnergy(amount);
            }

            triggerSuperNova() {
                if ((this.superNovaEnergy || 0) < this.superNovaMax) return;
                this.superNovaEnergy = 0;
                
                let abilitySkin = (typeof equippedCosmetics !== 'undefined') ? equippedCosmetics.ability : 'nova_default';

                playSound('overcharge');
                playSound('shield');
                if (gameSettings.shake) screenShakeTime = 600;

                let novaMainCol = '#bd00ff';
                let novaSubCol = '#ff00ea';
                let novaText = ' OVERCHARGE FRENZY ACTIVE! ';

                if (abilitySkin === 'nova_supernova') {
                    novaMainCol = '#ffd700';
                    novaSubCol = '#ff4400';
                    novaText = ' SOLAR SUPERNOVA ERUPTION! ';
                    triggerShockwave(this.x, this.y, '#ffd700', 540);
                    triggerShockwave(this.x, this.y, '#ff4400', 380);
                    triggerShockwave(this.x, this.y, '#ffffff', 220);
                    createExplosion(this.x, this.y, '#ffd700', 45, 18);
                    createExplosion(this.x, this.y, '#ff4400', 30, 14);
                } else if (abilitySkin === 'nova_blackhole') {
                    novaMainCol = '#bd00ff';
                    novaSubCol = '#00f3ff';
                    novaText = ' EVENT HORIZON SINGULARITY! ';
                    triggerShockwave(this.x, this.y, '#bd00ff', 500);
                    triggerShockwave(this.x, this.y, '#00f3ff', 360);
                    triggerShockwave(this.x, this.y, '#110022', 200);
                    createExplosion(this.x, this.y, '#bd00ff', 40, 16);
                    createExplosion(this.x, this.y, '#00f3ff', 25, 12);
                } else if (abilitySkin === 'nova_apex_glory') {
                    novaMainCol = '#ffd700';
                    novaSubCol = '#ff0055';
                    novaText = ' APEX DOOMSDAY ANNIHILATION! ';
                    triggerShockwave(this.x, this.y, '#ff0055', 580);
                    triggerShockwave(this.x, this.y, '#ffd700', 420);
                    triggerShockwave(this.x, this.y, '#00f3ff', 280);
                    createExplosion(this.x, this.y, '#ffd700', 50, 20);
                    createExplosion(this.x, this.y, '#ff0055', 35, 15);
                    createExplosion(this.x, this.y, '#ffffff', 25, 10);
                } else {
                    triggerShockwave(this.x, this.y, '#bd00ff', 480);
                    triggerShockwave(this.x, this.y, '#ff00ea', 320);
                    createExplosion(this.x, this.y, '#bd00ff', 40, 16);
                    createExplosion(this.x, this.y, '#ff00ea', 25, 12);
                }

                // مسح رصاص الأعداء القريب
                bullets = bullets.filter(b => {
                    if (b && distSq(b.x, b.y, this.x, this.y) < 520**2) {
                        spawnParticle(b.x, b.y, novaMainCol, 0, 0, 0.08);
                        if (bulletPool.length < 400) bulletPool.push(b);
                        return false;
                    }
                    return true;
                });

                // تدمير الأعداء في المحيط القريب بضرر ساحق
                for (let e of enemies) {
                    if (e && !e.isDead && distSq(e.x, e.y, this.x, this.y) < 520**2) {
                        let dmg = (e.type === 'boss') ? 75 : 140;
                        e.health -= dmg;
                        e.stunTimer = 3800;
                        e.hitFlashTimer = 240;
                        createExplosion(e.x, e.y, novaMainCol, 25, 12);
                        if (e.health <= 0) {
                            e.isDead = true;
                            createExplosion(e.x, e.y, e.color || novaMainCol, 28, 14);
                            sessionKills++;
                            metaCurrency += (e.isElite ? 3 : 1);
                        }
                    }
                }

                // تفعيل طور الـ OVER (سرعة إطلاق مضاعفة + مالتي شوت Multi-Shot لمدة 6.5 ثوانٍ)
                this.overchargeActive = true;
                this.overchargeTimer = 6500;
                spawnFloatingText(this.x, this.y - 55, novaText, novaMainCol, 1800);
            }

            triggerEMP() {
                this.triggerSuperNova();
            }

            triggerDash(customAngle = null) {
                this.dash(customAngle);
            }

            dash(customAngle = null) {
                if (this.dashCooldown > 0) return;
                let cCfg = CLASSES_CONFIG[this.playerClass] || CLASSES_CONFIG['assault'];
                let baseDashCd = 1750 - ((metaUpgrades.dash || 0) * 200);
                this.dashCooldown = Math.max(500, baseDashCd * this.cooldownMultiplier);
                this.dashInvulnerableTimer = 340;
                playSound('dash');
                if (gameSettings.shake) screenShakeTime = 160;

                let moveAngle = this.facingAngle;
                if (typeof customAngle === 'number') {
                    moveAngle = customAngle;
                } else {
                    let inputDx = 0, inputDy = 0;
                    if (isMoving && isJoystickActive) {
                        inputDx = Math.cos(joystickAngle);
                        inputDy = Math.sin(joystickAngle);
                    } else {
                        if (keys.a) inputDx -= 1;
                        if (keys.d) inputDx += 1;
                        if (keys.w) inputDy -= 1;
                        if (keys.s) inputDy += 1;
                    }
                    if (inputDx !== 0 || inputDy !== 0) {
                        moveAngle = Math.atan2(inputDy, inputDx);
                    }
                }

                let dashSpeed = 22.0;
                if (this.sprintTimer > 0) dashSpeed *= 1.35;
                this.vx = Math.cos(moveAngle) * dashSpeed;
                this.vy = Math.sin(moveAngle) * dashSpeed;

                let abilitySkin = (typeof equippedCosmetics !== 'undefined') ? equippedCosmetics.ability : 'nova_default';
                let dashShockColor = colors.dash;
                if (abilitySkin === 'sprint_thunder') dashShockColor = '#ffd700';
                else if (abilitySkin === 'sprint_frost') dashShockColor = '#00f3ff';
                else if (abilitySkin === 'sprint_shadow_flame') dashShockColor = '#ff0055';
                else if (abilitySkin === 'sprint_hyperdrive') dashShockColor = `hsl(${(performance.now()*0.3)%360}, 100%, 65%)`;

                triggerShockwave(this.x, this.y, dashShockColor, 110);
                for (let i = 0; i < 16; i++) {
                    spawnParticle(this.x, this.y, dashShockColor, (Math.random()-0.5)*12, (Math.random()-0.5)*12, 0.09);
                }

                if (this.hasSplitFlak) {
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                        spawnPlayerBullet(this.x, this.y, a, 14.0, 1.4 * this.damageMultiplier, false, false); 
                    }
                }
            }

            takeHit(bullet = null) {
                if (this.invulnerableTimer > 0 || this.dashInvulnerableTimer > 0 || (this.bubbleShieldTimer > 0)) return false;
                
                if (this.shieldCharges > 0) {
                    this.shieldCharges--;
                    this.invulnerableTimer = 1100;
                    playSound('parry');
                    sessionParries++;
                    if (gameSettings.shake) screenShakeTime = 320;
                    triggerShockwave(this.x, this.y, '#00f3ff', 180);
                    spawnFloatingText(this.x, this.y - 35, ' امتصاص درع!', '#00f3ff');

                    if (this.hasAegisNova) {
                        triggerShockwave(this.x, this.y, '#ffd700', 320);
                        bullets = bullets.filter(b => b && distSq(b.x, b.y, this.x, this.y) > 300**2);
                    }
                    if (this.shieldCharges <= 0) this.hasShield = false;
                    updateVitalsAndAmmoHUD();
                    return false;
                }

                // خصم نقاط الحياة المباشرة
                this.hp -= 35;
                this.invulnerableTimer = 1200;
                playSound('shield');
                if (gameSettings.shake) screenShakeTime = 450;
                createExplosion(this.x, this.y, '#ff0055', 25, 12);
                updateVitalsAndAmmoHUD();

                if (this.hp <= 0) {
                    // نظام السقوط والإصلاح الذاتي (Knockdown & Self-Repair)
                    if (!this.isKnockedDown && (this.revivesUsed < this.maxRevives)) {
                        this.isKnockedDown = true;
                        this.revivesUsed++;
                        this.reviveTimer = 5000;
                        this.invulnerableTimer = 5500;
                        this.hp = 1;
                        playSound('shield');
                        triggerShockwave(this.x, this.y, '#ffd700', 280);
                        spawnFloatingText(this.x, this.y - 50, ' انهيار النواة! جاري الإصلاح الذاتي (5 ثوانٍ)...', '#ff0055');
                        return false;
                    } else if (this.isKnockedDown) {
                        return false; // حصانة أثناء النوك
                    }
                    return true; // موت نهائي
                }
                return false;
            }

            update(delta, effectiveDelta, timeScale, frameFactor) {
                if (this.invulnerableTimer > 0) this.invulnerableTimer -= effectiveDelta * timeScale;
                if (this.bubbleShieldTimer > 0) {
                    this.bubbleShieldTimer -= effectiveDelta * timeScale;
                    if (this.bubbleShieldTimer <= 0) this.hasBubbleShield = false;
                }

                if (this.isKnockedDown) {
                    this.reviveTimer -= effectiveDelta * timeScale;
                    if (Math.random() < 0.35 * frameFactor) {
                        spawnParticle(this.x + (Math.random() - 0.5) * 25, this.y + (Math.random() - 0.5) * 25, '#ffd700', 0, -1, 0.08);
                    }
                    if (this.reviveTimer <= 0) {
                        this.isKnockedDown = false;
                        this.hp = this.maxHp;
                        this.shieldCharges = this.shieldMaxCharges;
                        playSound('ultimate');
                        triggerShockwave(this.x, this.y, '#00ff88', 360);
                        spawnFloatingText(this.x, this.y - 50, ' تم استعادة القلب القتالي 100%! ', '#00ff88');
                        updateVitalsAndAmmoHUD();
                    }
                }
                if (this.dashInvulnerableTimer > 0) this.dashInvulnerableTimer -= effectiveDelta * timeScale;
                if (this.dashCooldown > 0) this.dashCooldown -= delta * (timeScale > 0.5 ? 1.0 : 0.6);
                if (this.portalCooldown > 0) this.portalCooldown -= delta * timeScale;

                if (this.classSkillCooldown > 0) this.classSkillCooldown -= delta;
                if (this.classSkill2Cooldown > 0) this.classSkill2Cooldown -= delta;

                if (this.sprintTimer > 0) {
                    this.sprintTimer -= delta;
                    if (Math.random() < 0.35 * frameFactor) {
                        spawnParticle(this.x + (Math.random() - 0.5) * 12, this.y + (Math.random() - 0.5) * 12, '#00ff88', 0, 0, 0.08);
                    }
                }

                // تحديث وتحريك درون الحماية المداري (Orbital Drone Support)
                if (myOrbitalDrone) {
                    myOrbitalDrone.life -= delta;
                    myOrbitalDrone.angle = (myOrbitalDrone.angle || 0) + 0.06 * frameFactor;
                    myOrbitalDrone.x = this.x + Math.cos(myOrbitalDrone.angle) * 44;
                    myOrbitalDrone.y = this.y + Math.sin(myOrbitalDrone.angle) * 44;
                    myOrbitalDrone.lastShot = (myOrbitalDrone.lastShot || 0) + delta;

                    if (myOrbitalDrone.lastShot > 420) {
                        let target = null;
                        let minD = 550 * 550;
                        if (activeGameMode === 'online_pvp') {
                            for (let [rId, rp] of remotePlayers.entries()) {
                                let d = distSq(this.x, this.y, rp.x, rp.y);
                                if (d < minD) { minD = d; target = rp; }
                            }
                        } else {
                            for (let e of enemies) {
                                if (e && !e.isDead) {
                                    let d = distSq(this.x, this.y, e.x, e.y);
                                    if (d < minD) { minD = d; target = e; }
                                }
                            }
                        }

                        if (target) {
                            myOrbitalDrone.lastShot = 0;
                            let shootAng = Math.atan2(target.y - myOrbitalDrone.y, target.x - myOrbitalDrone.x);
                            spawnPlayerBullet(myOrbitalDrone.x, myOrbitalDrone.y, shootAng, 16, 16 * this.damageMultiplier, false, false);
                            playSound('shoot');
                        }
                    }

                    if (myOrbitalDrone.life <= 0) {
                        myOrbitalDrone = null;
                        spawnFloatingText(this.x, this.y - 40, ' انتهت طاقة درون الحماية', '#8899a6');
                    }
                }

                // فحص القرب من الزميل الساقط في PVE لإسعافه
                if (activeGameMode === 'online_pve' && pveDownedPlayers.size > 0) {
                    let isNearDowned = false;
                    for (let [downedId, dInfo] of pveDownedPlayers.entries()) {
                        let rp = remotePlayers.get(downedId);
                        let targetX = rp ? rp.x : dInfo.x;
                        let targetY = rp ? rp.y : dInfo.y;
                        if (distSq(this.x, this.y, targetX, targetY) < 65 * 65) {
                            isNearDowned = true;
                            localReviveProgress += delta / 2500;
                            if (Math.random() < 0.35) {
                                spawnParticle(targetX + (Math.random() - 0.5) * 30, targetY + (Math.random() - 0.5) * 30, '#00ff88', 0, -1, 0.1);
                            }
                            if (localReviveProgress >= 1) {
                                localReviveProgress = 0;
                                if (socket && isSocketConnected) {
                                    socket.emit('pve_revive_ally', { targetId: downedId, targetName: dInfo.username || 'الزميل' });
                                }
                            }
                            break;
                        }
                    }
                    if (!isNearDowned) {
                        localReviveProgress = Math.max(0, localReviveProgress - delta / 1200);
                    }
                }

                // حساب متجهات الحركة من لوحة المفاتيح أو الجويستيك
                let inputDx = 0;
                let inputDy = 0;
                if (isMoving && isJoystickActive) {
                    inputDx = joystickPower * Math.cos(joystickAngle) * joystickSensMultiplier;
                    inputDy = joystickPower * Math.sin(joystickAngle) * joystickSensMultiplier;
                } else {
                    if (keys.a) inputDx -= 1;
                    if (keys.d) inputDx += 1;
                    if (keys.w) inputDy -= 1;
                    if (keys.s) inputDy += 1;
                    if (inputDx !== 0 && inputDy !== 0) {
                        let invNorm = 1 / Math.hypot(inputDx, inputDy);
                        inputDx *= invNorm;
                        inputDy *= invNorm;
                    }
                }

                // التحقق من حالة ثبات القناص وتفعيل التخفي
                let inputMag = Math.hypot(inputDx, inputDy);
                let isActuallyMoving = inputMag > 0.1 || (Math.hypot(this.vx, this.vy) > 0.25);
                let isShootingIntent = (isAimJoystickActive && aimJoystickPower > 0.15) || isMouseDown;

                if (this.playerClass === 'sniper') {
                    if (!isActuallyMoving && !isShootingIntent) {
                        this.stationaryTimer += delta;
                        if (this.stationaryTimer >= 2000) {
                            if (!this.isStealthed) {
                                spawnFloatingText(this.x, this.y - 40, ' وضع التخفي التام (Stealth Active)', '#bd00ff');
                            }
                            this.isStealthed = true;
                        }
                    } else {
                        if (this.isStealthed && (isActuallyMoving || isShootingIntent)) {
                            spawnFloatingText(this.x, this.y - 30, ' انكسار التخفي', '#ff0055');
                        }
                        this.stationaryTimer = 0;
                        this.isStealthed = false;
                    }
                }

                // التحقق من حقول الدخان وعلاج الفريق والتخفي
                let insideSmoke = false;
                for (let sc of smokeClouds) {
                    if (sc && sc.isActive && distSq(this.x, this.y, sc.x, sc.y) < sc.radius ** 2) {
                        insideSmoke = true;
                        this.isStealthed = true;
                        if (this.hp < this.maxHp) {
                            this.hp = Math.min(this.maxHp, this.hp + (15 * effectiveDelta) / 1000);
                        }
                        break;
                    }
                }
                if (!insideSmoke && this.playerClass !== 'sniper') {
                    this.isStealthed = false;
                }

                if (this.isReloading) {
                    this.reloadTimer -= delta;
                    if (this.reloadTimer <= 0) {
                        this.isReloading = false;
                        this.ammo = this.maxAmmo;
                        if (this.isUsingSecondary) this.secondaryAmmo = this.maxAmmo;
                        else this.primaryAmmo = this.maxAmmo;
                        playSound('shield');
                        spawnFloatingText(this.x, this.y - 30, '[OK] اكتمل التلقيم', '#00ff88');
                    }
                }

                if (this.isFiringUlt) {
                    this.ultTimer -= delta;
                    if (this.ultTimer <= 0) this.isFiringUlt = false;
                }

                if (this.overchargeActive) {
                    this.overchargeTimer -= delta;
                    if (this.overchargeTimer <= 0) this.overchargeActive = false;
                }

                // حساب سرعة الحركة القصوى مع مراعاة مهارة الـ Sprint
                let maxCurrentSpeed = this.speed;
                if (this.sprintTimer > 0) maxCurrentSpeed *= 2.0; // Adrenaline Sprint 2x Speed

                let hasInput = (inputDx !== 0 || inputDy !== 0);
                if (isShootingIntent && !isGameOver) {
                    this.shootTimer += delta * (hasInput ? 1.0 : timeScale);
                    let curInterval = this.shootInterval;
                    if (this.overchargeActive) curInterval *= 0.50; // مضاعفة سرعة الرمي 2x
                    if (this.shootTimer >= curInterval) { 
                        this.shootTimer = 0; 
                        this.shootWeapon(); 
                    }
                } else {
                    if (this.shootTimer < this.shootInterval) {
                        this.shootTimer += delta * 0.4;
                    }
                }

                // تحديد زاوية النظر والتصويب والدوران الذكي
                let now = performance.now();
                let isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                let isMouseAimingActive = !isTouch && (isMouseDown || (hasMouseMoved && (now - lastMouseMoveTime < 1000)));

                if (isAimJoystickActive && aimJoystickPower > 0.1) {
                    // 1. تصويب الجويستك اللمسي في الهاتف مع المساعد التكتيكي الذكي
                    let finalAngle = aimJoystickAngle;
                    if (gameSettings.aimAssist !== false && typeof calculateMobileAimAssist === 'function') {
                        finalAngle = calculateMobileAimAssist(this.x, this.y, aimJoystickAngle);
                    }
                    this.targetAngle = finalAngle;
                } else if (isMouseAimingActive) {
                    // 2. تصويب الماوس عند تحريكه في الكمبيوتر (خام ومباشر 100% بدون أي تعديل)
                    this.targetAngle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);
                } else if (hasInput) {
                    // 3. التوجيه التلقائي في اتجاه أزرار الحركة المضغوطة (WASD / Joystick) عند ترك الماوس لثانية
                    this.targetAngle = Math.atan2(inputDy, inputDx);
                }

                if (this.dashInvulnerableTimer > 0) {
                    // الحفاظ على قوة الاندفاع اللحظية العالية أثناء الـ Dash
                    let dashFriction = Math.pow(0.96, frameFactor);
                    this.vx *= dashFriction;
                    this.vy *= dashFriction;
                } else if (hasInput && !isGameOver) {
                    let targetVx = inputDx * maxCurrentSpeed;
                    let targetVy = inputDy * maxCurrentSpeed;
                    let accelAmt = 1 - Math.pow(0.55, frameFactor);
                    this.vx = lerp(this.vx, targetVx, accelAmt);
                    this.vy = lerp(this.vy, targetVy, accelAmt);
                } else {
                    let friction = Math.pow(0.72, frameFactor);
                    this.vx *= friction;
                    this.vy *= friction;
                    if (Math.abs(this.vx) < 0.05) this.vx = 0;
                    if (Math.abs(this.vy) < 0.05) this.vy = 0;
                }

                let angleDiff = this.targetAngle - this.facingAngle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                let rotSpeed = (isAimJoystickActive || isMouseDown || isMouseAimingActive) ? 0.38 : 0.30;
                this.facingAngle += angleDiff * (1 - Math.pow(1 - rotSpeed, frameFactor));
                this.rollTilt = lerp(this.rollTilt, angleDiff * 1.5, 0.15 * frameFactor);

                this.recoilX = lerp(this.recoilX, 0, 1 - Math.pow(0.68, frameFactor));
                this.recoilY = lerp(this.recoilY, 0, 1 - Math.pow(0.68, frameFactor));

                this.x += this.vx * frameFactor;
                this.y += this.vy * frameFactor;
                
                this.x = Math.max(this.radius, Math.min(WORLD_W - this.radius, this.x));
                this.y = Math.max(this.radius + 65, Math.min(WORLD_H - this.radius, this.y));

                this.trail.push({ x: this.x, y: this.y, alpha: 1.0, radius: this.radius });
                if (this.trail.length > 25) this.trail.shift();
                for (let t of this.trail) t.alpha -= 0.04 * frameFactor * timeScale;
            }

            shootWeapon() {
                if (this.isReloading) return;
                if (this.ammo <= 0) {
                    this.reload();
                    return;
                }

                this.ammo--;
                if (this.isUsingSecondary) this.secondaryAmmo = this.ammo;
                else this.primaryAmmo = this.ammo;

                // انكسار تخفي القناص فور إطلاق النار
                if (this.playerClass === 'sniper' && this.isStealthed) {
                    this.isStealthed = false;
                    this.stationaryTimer = 0;
                }

                if (this.weapon === 'shotgun') playSound('shoot_shotgun');
                else if (this.weapon === 'rapid') playSound('shoot_rapid');
                else if (this.weapon === 'lmg') playSound('shoot_lmg');
                else if (this.weapon === 'railgun') playSound('shoot_railgun');
                else if (this.weapon === 'secondary_pistol') playSound('shoot_pistol');
                else playSound('shoot_blaster');

                let baseAngle = this.facingAngle;
                let pelletsCount = 1 + this.bulletCountBonus;
                if (this.overchargeActive) pelletsCount += 1;
                let dmgMod = this.overchargeActive ? this.damageMultiplier * 1.5 : this.damageMultiplier;

                let recoilForce = this.recoilBase || 1.4;
                this.recoilX -= Math.cos(baseAngle) * recoilForce;
                this.recoilY -= Math.sin(baseAngle) * recoilForce;

                if (this.weapon === 'shotgun') {
                    pelletsCount += 5;
                    for (let i = 0; i < pelletsCount; i++) { 
                        let offset = (i - (pelletsCount - 1) / 2) * 0.12 + (Math.random() - 0.5) * 0.04; 
                        spawnPlayerBullet(this.x, this.y, baseAngle + offset, this.bulletSpeed, dmgMod, false, false); 
                    }
                } else if (this.weapon === 'rapid') {
                    let offset = (Math.random() - 0.5) * 0.05;
                    spawnPlayerBullet(this.x, this.y, baseAngle + offset, this.bulletSpeed, dmgMod, false, false); 
                } else if (this.weapon === 'lmg') {
                    let offset = (Math.random() - 0.5) * 0.08;
                    spawnPlayerBullet(this.x, this.y, baseAngle + offset, this.bulletSpeed, dmgMod, false, false); 
                } else if (this.weapon === 'railgun') {
                    spawnPlayerBullet(this.x, this.y, baseAngle, this.bulletSpeed, dmgMod * 1.6, false, true);
                    triggerShockwave(this.x, this.y, '#bd00ff', 90);
                } else if (this.weapon === 'secondary_pistol') {
                    spawnPlayerBullet(this.x, this.y, baseAngle, this.bulletSpeed, dmgMod, false, false);
                } else {
                    for (let i = 0; i < pelletsCount; i++) { 
                        let offset = (i - (pelletsCount - 1) / 2) * 0.08; 
                        spawnPlayerBullet(this.x, this.y, baseAngle + offset, this.bulletSpeed, dmgMod, false, false); 
                    }
                }

                if (this.ammo <= 0) {
                    this.reload();
                }
                updateVitalsAndAmmoHUD();
            }

            draw() {
                if (this.isFiringUlt) {
                    ctx.save();
                    let progress = Math.max(0, 1 - (this.ultTimer / 1800));
                    let nukeRadius = progress * 1350;
                    
                    // 1. هالة الانفجار النووي التوسعية
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, nukeRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 215, 0, ${(1 - progress) * 0.45})`;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 12 * (1 - progress);
                    ctx.shadowColor = '#ffd700';
                    ctx.shadowBlur = (gameSettings.bloom && !gameSettings.lowEnd) ? 45 : 0;
                    ctx.stroke();

                    // 2. حلقة الصدمة الشمسية المركزية
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, Math.min(220, progress * 400), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${(1 - progress) * 0.75})`;
                    ctx.fill();

                    ctx.restore();
                }

                // رسم خطوط الأثر الحركي وظلال السبرنت (Sprint Afterimages & Trail)
                let themeCol = getActiveCosmeticThemeColor(this.playerClass);
                let trailStyle = typeof equippedCosmetics !== 'undefined' ? equippedCosmetics.trail : 'trail_default';
                let sprintStyle = typeof equippedCosmetics !== 'undefined' ? equippedCosmetics.ability : 'nova_default';

                for (let i = 0; i < this.trail.length; i++) {
                    let t = this.trail[i];
                    if (t.alpha <= 0) continue;
                    ctx.save();
                    
                    // إذا كان اللاعب في طور السبرنت، رسم ظلال هيكل السفينة الشبحية (Afterimage Ghost)
                    if (this.sprintTimer > 0 && i % 3 === 0) {
                        ctx.save();
                        ctx.translate(t.x, t.y);
                        ctx.rotate(this.facingAngle + Math.PI / 2);
                        let ghostCol = (sprintStyle === 'sprint_thunder') ? '#ffd700' :
                                       (sprintStyle === 'sprint_frost') ? '#00f3ff' :
                                       (sprintStyle === 'sprint_shadow_flame') ? '#ff0055' :
                                       (sprintStyle === 'sprint_hyperdrive') ? `hsl(${(performance.now()*0.4 + i*20)%360}, 100%, 65%)` : themeCol;
                        ctx.beginPath();
                        ctx.moveTo(0, -this.radius * 1.2);
                        ctx.lineTo(-this.radius * 0.9, this.radius * 0.9);
                        ctx.lineTo(0, this.radius * 0.5);
                        ctx.lineTo(this.radius * 0.9, this.radius * 0.9);
                        ctx.closePath();
                        ctx.strokeStyle = ghostCol;
                        ctx.lineWidth = 1.8;
                        ctx.globalAlpha = t.alpha * 0.5;
                        ctx.stroke();
                        ctx.restore();
                    }

                    ctx.beginPath();
                    ctx.arc(t.x, t.y, Math.max(0.1, t.radius * 0.75 * t.alpha), 0, Math.PI * 2);
                    
                    if (trailStyle === 'trail_rainbow') {
                        let hue = (performance.now() * 0.2 + t.alpha * 120) % 360;
                        ctx.fillStyle = `hsla(${hue}, 100%, 65%, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_golden') {
                        ctx.fillStyle = `rgba(255, 215, 0, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_matrix') {
                        ctx.fillStyle = `rgba(0, 255, 100, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_solar_flare') {
                        ctx.fillStyle = `rgba(255, 68, 0, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_dark_matter') {
                        ctx.fillStyle = `rgba(189, 0, 255, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_dragon_ember') {
                        ctx.fillStyle = `rgba(255, 34, 0, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_neon_pulse') {
                        ctx.fillStyle = `rgba(255, 0, 85, ${t.alpha * 0.75})`;
                    } else if (trailStyle === 'trail_frost_mist') {
                        ctx.fillStyle = `rgba(0, 243, 255, ${t.alpha * 0.75})`;
                    } else {
                        // المسار التناسقي الحصري التلقائي
                        let alphaVal = this.sprintTimer > 0 ? (t.alpha * 0.7) : (t.alpha * 0.45);
                        ctx.fillStyle = themeCol;
                        ctx.globalAlpha = alphaVal;
                    }
                    ctx.fill(); 
                    ctx.restore();
                }

                ctx.save();
                ctx.translate(this.x + this.recoilX, this.y + this.recoilY);
                ctx.rotate(this.facingAngle + Math.PI / 2);

                // تأثير السبرنت الخارق: مخروط اختراق الصوت وهالة السرعة (Mach Shockwave Cone)
                if (this.sprintTimer > 0) {
                    ctx.save();
                    let coneCol = (sprintStyle === 'sprint_thunder') ? '#ffd700' :
                                  (sprintStyle === 'sprint_frost') ? '#00f3ff' :
                                  (sprintStyle === 'sprint_shadow_flame') ? '#ff0055' :
                                  (sprintStyle === 'sprint_hyperdrive') ? `hsl(${(performance.now()*0.4)%360}, 100%, 70%)` : themeCol;
                    
                    // مخروط الصدمة الأمامي
                    ctx.beginPath();
                    ctx.moveTo(0, -this.radius * 2.2);
                    ctx.lineTo(-this.radius * 1.8, this.radius * 1.4);
                    ctx.lineTo(this.radius * 1.8, this.radius * 1.4);
                    ctx.closePath();
                    ctx.strokeStyle = coneCol;
                    ctx.lineWidth = 2.5;
                    ctx.stroke();

                    // موجات صدمية متتابعة
                    let wavePulse = (performance.now() * 0.02) % 25;
                    ctx.beginPath();
                    ctx.arc(0, -this.radius * 0.8, this.radius + wavePulse, 0, Math.PI * 2);
                    ctx.strokeStyle = coneCol;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = Math.max(0, 1 - wavePulse / 25);
                    ctx.stroke();
                    ctx.restore();
                }

                // تأثير التخفي الشفاف والهولوجرامي
                if (this.isStealthed) {
                    ctx.globalAlpha = 0.28;
                    // حلقة نبض تمويهية
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 6 + Math.sin(performance.now() * 0.008) * 3, 0, Math.PI * 2);
                    ctx.strokeStyle = '#bd00ff';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                let cCfg = CLASSES_CONFIG[this.playerClass] || CLASSES_CONFIG['assault'];
                let shipColor = this.isFiringUlt ? colors.ult : (this.overchargeActive ? colors.overcharge : (cCfg.color || colors.player));

                // لهب المحركات النفاثة المتناسق مع السكن والشاسيه والسلاح
                let flameLen = 15 + Math.random() * 9;
                if (this.sprintTimer > 0) flameLen *= 2.3;
                let flameCol = this.sprintTimer > 0 ? '#00ff88' : themeCol;

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(-5.5, 10);
                ctx.lineTo(0, 10 + flameLen);
                ctx.lineTo(5.5, 10);
                ctx.closePath();
                let fGrad = ctx.createLinearGradient(0, 10, 0, 10 + flameLen);
                fGrad.addColorStop(0, '#ffffff');
                fGrad.addColorStop(0.35, flameCol);
                fGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = fGrad;
                ctx.fill();

                // قلب اللهب النفاث
                ctx.beginPath();
                ctx.moveTo(-2.5, 10);
                ctx.lineTo(0, 10 + flameLen * 0.55);
                ctx.lineTo(2.5, 10);
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.restore();

                // رسم هيكل السفينة حسب السكن المجهز
                let activeSkinId = (typeof equippedCosmetics !== 'undefined' && equippedCosmetics.chassis) ? equippedCosmetics.chassis : 'default';
                if (activeSkinId !== 'default') {
                    drawCustomShipGeometry(ctx, activeSkinId, this.playerClass, this.radius, this.isFiringUlt, this.overchargeActive, this.sprintTimer, performance.now());
                } else if (this.playerClass === 'support') {
                    // الدعم: هيكل ثقيل مدرع
                    ctx.beginPath();
                    ctx.moveTo(0, -this.radius * 1.3);
                    ctx.lineTo(this.radius * 1.3, -this.radius * 0.4);
                    ctx.lineTo(this.radius * 1.4, this.radius * 1.1);
                    ctx.lineTo(this.radius * 0.6, this.radius * 0.8);
                    ctx.lineTo(0, this.radius * 0.95);
                    ctx.lineTo(-this.radius * 0.6, this.radius * 0.8);
                    ctx.lineTo(-this.radius * 1.4, this.radius * 1.1);
                    ctx.lineTo(-this.radius * 1.3, -this.radius * 0.4);
                    ctx.closePath();
                    ctx.fillStyle = shipColor; ctx.fill();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
                    ctx.beginPath(); ctx.rect(-this.radius * 1.3, 0, 4, 12); ctx.rect(this.radius * 1.3 - 4, 0, 4, 12);
                    ctx.fillStyle = '#00ff88'; ctx.fill();
                } else if (this.playerClass === 'engineer') {
                    // المهندس: هيكل تكتيكي هندسي
                    ctx.beginPath();
                    ctx.moveTo(0, -this.radius * 1.4);
                    ctx.lineTo(this.radius * 1.15, -this.radius * 0.2);
                    ctx.lineTo(this.radius * 0.9, this.radius * 1.0);
                    ctx.lineTo(0, this.radius * 0.7);
                    ctx.lineTo(-this.radius * 0.9, this.radius * 1.0);
                    ctx.lineTo(-this.radius * 1.15, -this.radius * 0.2);
                    ctx.closePath();
                    ctx.fillStyle = shipColor; ctx.fill();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffd700'; ctx.fill();
                } else if (this.playerClass === 'sniper') {
                    // القناص: هيكل إبري شبحي مدبب
                    ctx.beginPath();
                    ctx.moveTo(0, -this.radius * 1.7);
                    ctx.lineTo(this.radius * 0.9, this.radius * 0.8);
                    ctx.lineTo(this.radius * 0.35, this.radius * 0.5);
                    ctx.lineTo(0, this.radius * 1.2);
                    ctx.lineTo(-this.radius * 0.35, this.radius * 0.5);
                    ctx.lineTo(-this.radius * 0.9, this.radius * 0.8);
                    ctx.closePath();
                    ctx.fillStyle = shipColor; ctx.fill();
                    ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 2.2; ctx.stroke();
                } else {
                    // الهجومي: مقاتلة اعتراضية حادة
                    drawCustomShipGeometry(ctx, 'default', this.playerClass, this.radius, this.isFiringUlt, this.overchargeActive, this.sprintTimer, performance.now());
                }

                // رسم السلاح المجهز
                let weaponColor = '#00f3ff';
                if (this.weapon === 'shotgun') {
                    ctx.fillStyle = '#ff5500';
                    ctx.fillRect(-8, -this.radius * 1.3, 4, 8);
                    ctx.fillRect(-2, -this.radius * 1.45, 4, 10);
                    ctx.fillRect(4, -this.radius * 1.3, 4, 8);
                } else if (this.weapon === 'rapid') {
                    ctx.fillStyle = '#00ff88';
                    ctx.fillRect(-3, -this.radius * 1.6, 6, 14);
                    ctx.beginPath(); ctx.arc(0, -this.radius * 1.3, 5, 0, Math.PI * 2); ctx.strokeStyle = '#00ff88'; ctx.stroke();
                } else if (this.weapon === 'lmg') {
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillRect(-4, -this.radius * 1.8, 8, 16);
                } else if (this.weapon === 'railgun') {
                    ctx.fillStyle = '#bd00ff';
                    ctx.fillRect(-2.5, -this.radius * 2.0, 5, 20);
                    ctx.beginPath(); ctx.arc(0, -this.radius * 1.4, 6, 0, Math.PI * 2); ctx.strokeStyle = '#bd00ff'; ctx.stroke();
                } else if (this.weapon === 'secondary_pistol') {
                    ctx.fillStyle = '#ffd700';
                    ctx.fillRect(-2, -this.radius * 1.2, 4, 8);
                } else {
                    ctx.fillStyle = weaponColor;
                    ctx.fillRect(-7, -this.radius * 1.5, 3, 10);
                    ctx.fillRect(4, -this.radius * 1.5, 3, 10);
                }

                // رسم درع الفقاعة الواقي من واحة الإمداد (Bubble Shield)
                if (this.hasBubbleShield || this.bubbleShieldTimer > 0) {
                    ctx.save();
                    let bPulse = Math.sin(performance.now() * 0.01) * 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 22 + bPulse, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
                    ctx.fill();
                    ctx.strokeStyle = '#00f3ff';
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = '#00f3ff';
                    ctx.shadowBlur = (gameSettings.bloom && !gameSettings.lowEnd) ? 16 : 0;
                    ctx.stroke();
                    ctx.restore();
                }

                // رسم حلقة مؤقت الإصلاح عند النوك
                if (this.isKnockedDown) {
                    ctx.save();
                    let revRatio = Math.max(0, 1 - (this.reviveTimer / 5000));
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 16, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * revRatio));
                    ctx.stroke();
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 10px Chakra Petch';
                    ctx.textAlign = 'center';
                    ctx.fillText(`REPAIR ${Math.ceil(this.reviveTimer / 1000)}s`, 0, -this.radius - 18);
                    ctx.restore();
                }

                //  رسم تاج الهدف الملكي المطلوب لللاعب المحلي
                if (activeBountyKing && activeBountyKing.targetId === (socket ? socket.id : null)) {
                    ctx.save();
                    ctx.font = 'bold 18px sans-serif';
                    ctx.textAlign = 'center';
                    let crownFloat = Math.sin(performance.now() * 0.005) * 4;
                    ctx.fillText('', 0, -this.radius - 36 + crownFloat);
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 9px Chakra Petch';
                    ctx.fillText(`APEX BOUNTY KING`, 0, -this.radius - 48 + crownFloat);
                    ctx.restore();
                }

                ctx.restore();

                //  رسم درون الحماية المداري لللاعب المحلي
                if (myOrbitalDrone) {
                    ctx.save();
                    ctx.translate(myOrbitalDrone.x, myOrbitalDrone.y);
                    ctx.rotate(myOrbitalDrone.angle * 3);
                    ctx.fillStyle = '#00f3ff';
                    ctx.beginPath();
                    ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.4;
                    ctx.stroke();

                    // Drone Energy Core
                    ctx.beginPath();
                    ctx.arc(0, 0, 3, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffd700';
                    ctx.fill();

                    // Laser tether line to ship
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(this.x - myOrbitalDrone.x, this.y - myOrbitalDrone.y);
                    ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }



        class PlayerBullet {
            constructor(x, y, angle, speed, damage, isParried = false, isPiercing = false, allowRicochet = true) { 
                this.hitEnemies = new Set();
                this.reset(x, y, angle, speed, damage, isParried, isPiercing, allowRicochet); 
            }
            reset(x, y, angle, speed, damage, isParried = false, isPiercing = false, allowRicochet = true) {
                this.x = x; this.y = y; this.speed = speed; this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed;
                this.radius = isPiercing ? 8 : (isParried ? 7 : 4.5); this.damage = isPiercing ? damage * 1.5 : (isParried ? damage * 2.5 : damage);
                this.isParried = isParried; this.isPiercing = isPiercing; 
                this.hitEnemies.clear(); 
                this.expired = false;
                this.isRicochetTracked = false;
                if (allowRicochet && player && player.hasRicochet && activeRicochetCount < RICOCHET_MAX_ACTIVE) {
                    this.bouncesLeft = 1;
                    this.ricochetLifeMs = RICOCHET_LIFESPAN_MS;
                    this.isRicochetTracked = true;
                    activeRicochetCount++;
                } else {
                    this.bouncesLeft = 0;
                    this.ricochetLifeMs = 0;
                }
            }
            releaseRicochetSlot() {
                if (this.isRicochetTracked) { this.isRicochetTracked = false; activeRicochetCount = Math.max(0, activeRicochetCount - 1); }
                this.expired = false;
            }
            update(frameFactor, deltaMs = 0) { 
                this.x += this.vx * frameFactor; this.y += this.vy * frameFactor; 
                if (this.bouncesLeft > 0) {
                    let bounced = false;
                    if (this.x < 15 || this.x > WORLD_W - 15) { this.vx *= -1; this.bouncesLeft--; bounced = true; }
                    if (this.y < 15 || this.y > WORLD_H - 15) { this.vy *= -1; this.bouncesLeft--; bounced = true; }
                    if (bounced && player && player.hasSplitFlak) {
                        let currentAngle = Math.atan2(this.vy, this.vx);
                        spawnPlayerBullet(this.x, this.y, currentAngle - 0.3, this.speed * 0.9, this.damage * 0.6, false, false, false);
                        spawnPlayerBullet(this.x, this.y, currentAngle + 0.3, this.speed * 0.9, this.damage * 0.6, false, false, false);
                        createExplosion(this.x, this.y, '#00f3ff', 6, 4);
                    }
                }
                if (this.isRicochetTracked) {
                    this.ricochetLifeMs -= deltaMs;
                    if (this.ricochetLifeMs <= 0) { this.expired = true; }
                }
            }
            draw() {
                if (this.x < camX - 50 || this.x > camX + width + 50 || this.y < camY - 50 || this.y > camY + height + 50) return;
                let angle = Math.atan2(this.vy, this.vx);
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(angle);

                let curWeapon = player ? player.weapon : 'blaster';
                let wLvl = (weaponLevels && weaponLevels[curWeapon]) ? weaponLevels[curWeapon] : 1;

                let wepSkin = (typeof equippedCosmetics !== 'undefined') ? equippedCosmetics.weapon : 'wep_default';
                let bulletColor = (this.bouncesLeft > 0) ? '#ffd700' : (player && player.evolution === 'fire' ? '#ff5500' : (wLvl >= 3 ? '#ffd700' : (wLvl >= 2 ? '#bd00ff' : colors.playerBullet)));
                
                if (wepSkin === 'wep_dragonfire') bulletColor = '#ff4400';
                else if (wepSkin === 'wep_solar_flare') bulletColor = '#ff6600';
                else if (wepSkin === 'wep_neon_fury') bulletColor = '#ff0055';
                else if (wepSkin === 'wep_toxic_surge') bulletColor = '#00ff66';
                else if (wepSkin === 'wep_voidray') bulletColor = '#bd00ff';
                else if (wepSkin === 'wep_goldengun') bulletColor = '#ffd700';
                else if (wepSkin === 'wep_plasma_comet') bulletColor = `hsl(${(performance.now()*0.3)%360}, 100%, 65%)`;

                if (this.isPiercing) { 
                    // طلقة السلاح الخارق / شعاع الاختراق
                    ctx.beginPath(); ctx.rect(-26, -5, 52, 10); ctx.fillStyle = bulletColor; ctx.fill();
                    ctx.beginPath(); ctx.rect(-22, -2.5, 44, 5); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                else if (this.isParried) { 
                    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, 8); ctx.lineTo(-5, 0); ctx.lineTo(-10, -8); ctx.closePath(); 
                    ctx.fillStyle = colors.overcharge; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke(); 
                }
                else if (wepSkin === 'wep_dragonfire') {
                    // مقذوف التنين الناري الملتهب
                    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, 7); ctx.lineTo(-4, 0); ctx.lineTo(-10, -7); ctx.closePath();
                    ctx.fillStyle = '#ff4400'; ctx.fill(); ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.8; ctx.stroke();
                    ctx.beginPath(); ctx.arc(-2, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                    ctx.beginPath(); ctx.arc(-10, (Math.random()-0.5)*4, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffcc00'; ctx.fill();
                }
                else if (wepSkin === 'wep_solar_flare') {
                    // مقذوف التوهج الشمسي الملتهب
                    ctx.beginPath(); ctx.arc(3, 0, 7, 0, Math.PI * 2); ctx.fillStyle = '#ff4400'; ctx.fill();
                    ctx.beginPath(); ctx.arc(3, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#ffbb00'; ctx.fill();
                    ctx.beginPath(); ctx.arc(3, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                    ctx.beginPath(); ctx.arc(3, 0, 9, 0, Math.PI * 2); ctx.strokeStyle = '#ffee66'; ctx.lineWidth = 1.2; ctx.stroke();
                }
                else if (wepSkin === 'wep_neon_fury') {
                    // حزم ليزر نيون قرمزي عالي التردد
                    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-12, 4); ctx.lineTo(-6, 0); ctx.lineTo(-12, -4); ctx.closePath();
                    ctx.fillStyle = '#ff0055'; ctx.fill(); ctx.strokeStyle = '#ff99bb'; ctx.lineWidth = 1.6; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                else if (wepSkin === 'wep_toxic_surge') {
                    // مقذوف الحمض السام المتوهج
                    ctx.beginPath(); ctx.arc(4, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#00ff66'; ctx.fill();
                    ctx.beginPath(); ctx.arc(-4, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#10b981'; ctx.fill();
                    ctx.beginPath(); ctx.arc(4, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                else if (wepSkin === 'wep_voidray') {
                    // شعاع الفراغ الأرجواني الليزري
                    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-12, 3); ctx.lineTo(-6, 0); ctx.lineTo(-12, -3); ctx.closePath();
                    ctx.fillStyle = '#bd00ff'; ctx.fill(); ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.5; ctx.stroke();
                    ctx.beginPath(); ctx.arc(2, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                else if (wepSkin === 'wep_goldengun') {
                    // مقذوف ذهبي ملكي عيار 24 مع بريق
                    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, 6); ctx.lineTo(-2, 0); ctx.lineTo(-8, -6); ctx.closePath();
                    ctx.fillStyle = '#ffd700'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                else if (wepSkin === 'wep_plasma_comet') {
                    // مذنب البلازما الطيفي المتغير
                    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-9, 6); ctx.lineTo(-3, 0); ctx.lineTo(-9, -6); ctx.closePath();
                    ctx.fillStyle = bulletColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
                    ctx.beginPath(); ctx.arc(1, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                else { 
                    if (wLvl === 1) {
                        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, 5); ctx.lineTo(-3, 0); ctx.lineTo(-7, -5); ctx.closePath(); 
                        ctx.fillStyle = bulletColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
                    } else if (wLvl === 2) {
                        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, 6.5); ctx.lineTo(-4, 0); ctx.lineTo(-8, -6.5); ctx.closePath();
                        ctx.fillStyle = bulletColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
                        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                    } else {
                        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, 8); ctx.lineTo(-5, 0); ctx.lineTo(-10, -8); ctx.closePath();
                        ctx.fillStyle = bulletColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0; ctx.stroke();
                        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.strokeStyle = bulletColor; ctx.lineWidth = 1.2; ctx.stroke();
                    }
                }
                ctx.restore();
            }
        }

        function spawnPlayerBullet(x, y, angle, speed, damage, isParried = false, isPiercing = false, allowRicochet = true, isRemote = false) {
            let pb = (playerBulletPool.length > 0) ? playerBulletPool.pop() : null;
            if (pb && typeof pb.reset === 'function') pb.reset(x, y, angle, speed, damage, isParried, isPiercing, allowRicochet);
            else pb = new PlayerBullet(x, y, angle, speed, damage, isParried, isPiercing, allowRicochet);
            pb.isRemote = isRemote;
            playerBullets.push(pb);

            if (!isRemote && socket && isSocketConnected && isMultiplayerMode()) {
                socket.emit('player_shoot', {
                    x: x,
                    y: y,
                    angle: angle,
                    speed: speed,
                    damage: damage,
                    isParried: isParried,
                    isPiercing: isPiercing
                });
            }
        }

        class EnergyCube {
            constructor(x, y) { this.x = Math.max(20, Math.min(WORLD_W - 20, x)); this.y = Math.max(20, Math.min(WORLD_H - 20, y)); this.size = 15; this.lifeTimer = 11000; this.angle = Math.random() * Math.PI; }
            update(delta, frameFactor) { 
                this.lifeTimer -= delta; this.angle += 0.05 * frameFactor * timeScale; 
                let pullRadius = 200 * (player ? player.magnetBonus || 1.0 : 1.0);
                if (selectedAttachment === 'magnet') pullRadius *= 1.45;
                if (combo >= 15) pullRadius *= 1.35;
                if (player) {
                    let dToPlayer = dist(this.x, this.y, player.x, player.y);
                    if (dToPlayer < pullRadius) { this.x += ((player.x - this.x) / dToPlayer) * 5.0 * frameFactor * timeScale; this.y += ((player.y - this.y) / dToPlayer) * 5.0 * frameFactor * timeScale; }
                }
            }
            draw() {
                if (this.lifeTimer <= 0 || this.x < camX - 50 || this.x > camX + width + 50 || this.y < camY - 50 || this.y > camY + height + 50) return;
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
                const alpha = this.lifeTimer < 3000 ? Math.sin(performance.now() * 0.01) * 0.5 + 0.5 : 1;
                ctx.beginPath(); ctx.moveTo(0, -this.size); ctx.lineTo(this.size, 0); ctx.lineTo(0, this.size); ctx.lineTo(-this.size, 0); ctx.closePath();
                ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.3})`; ctx.fill(); ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`; ctx.lineWidth = 2.2; ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; ctx.fill(); ctx.restore();
            }
        }

        class GoldenCube {
            constructor(x, y) { this.x = Math.max(20, Math.min(WORLD_W - 20, x)); this.y = Math.max(20, Math.min(WORLD_H - 20, y)); this.size = 17; this.lifeTimer = 8000; this.angle = 0; }
            update(delta, frameFactor) { 
                this.lifeTimer -= delta; this.angle += 0.06 * frameFactor; 
                let pullRadius = 220 * (player ? player.magnetBonus || 1.0 : 1.0);
                if (selectedAttachment === 'magnet') pullRadius *= 1.45;
                if (combo >= 15) pullRadius *= 1.35;
                if (player) {
                    let dToPlayer = dist(this.x, this.y, player.x, player.y);
                    if (dToPlayer < pullRadius) { this.x += ((player.x - this.x) / dToPlayer) * 5.6 * frameFactor * timeScale; this.y += ((player.y - this.y) / dToPlayer) * 5.6 * frameFactor * timeScale; }
                }
            }
            draw() {
                if (this.lifeTimer <= 0 || this.x < camX - 50 || this.x > camX + width + 50 || this.y < camY - 50 || this.y > camY + height + 50) return;
                ctx.save(); ctx.translate(this.x, this.y); ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.size * 0.85), 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 215, 0, 0.25)'; ctx.fill(); ctx.rotate(this.angle); ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    let rot = (i * Math.PI) / 4, r = (i % 2 === 0) ? this.size : this.size * 0.45, sx = Math.cos(rot) * r, sy = Math.sin(rot) * r;
                    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                }
                ctx.closePath(); ctx.fillStyle = colors.gold; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
            }
        }

        class AmmoDrop {
            constructor(x, y, amount = 8) {
                this.reset(x, y, amount);
            }
            reset(x, y, amount = 8) {
                this.x = Math.max(20, Math.min(WORLD_W - 20, x));
                this.y = Math.max(20, Math.min(WORLD_H - 20, y));
                this.amount = amount;
                this.lifeTimer = 14000;
                this.pulseAngle = Math.random() * Math.PI;
            }
            update(delta, frameFactor) {
                this.lifeTimer -= delta;
                this.pulseAngle += 0.08 * frameFactor;
                let pullRadius = 220 * (player ? player.magnetBonus || 1.0 : 1.0);
                if (selectedAttachment === 'magnet') pullRadius *= 1.45;
                if (combo >= 15) pullRadius *= 1.35;
                if (player) {
                    let dToPlayer = dist(this.x, this.y, player.x, player.y);
                    if (dToPlayer < pullRadius) {
                        let pullSpeed = 6.8 * frameFactor * timeScale;
                        this.x += ((player.x - this.x) / dToPlayer) * pullSpeed;
                        this.y += ((player.y - this.y) / dToPlayer) * pullSpeed;
                    }
                    if (dToPlayer < player.radius + 16) {
                        player.replenishAmmo(this.amount);
                        this.lifeTimer = 0;
                    }
                }
            }
            draw() {
                if (this.lifeTimer <= 0 || this.x < camX - 50 || this.x > camX + width + 50 || this.y < camY - 50 || this.y > camY + height + 50) return;
                ctx.save();
                ctx.translate(this.x, this.y);
                let alpha = this.lifeTimer < 3000 ? Math.sin(performance.now() * 0.01) * 0.5 + 0.5 : 1;
                let pulse = Math.sin(this.pulseAngle) * 0.15 + 1.0;
                ctx.scale(pulse, pulse);

                // كبسولة ذخيرة نيونية ثلاثية الأبعاد
                ctx.fillStyle = `rgba(0, 243, 255, ${alpha * 0.25})`;
                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = `rgba(12, 24, 38, ${alpha})`;
                ctx.fillRect(-6, -9, 12, 18);
                ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
                ctx.lineWidth = 1.8;
                ctx.strokeRect(-6, -9, 12, 18);

                // مؤشر طاقة الذخيرة النيونية
                ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
                ctx.fillRect(-4, -6, 8, 4);
                ctx.fillRect(-4, 0, 8, 4);

                // رأس الرصاصة الذهبي
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(0, -13); ctx.lineTo(4, -9); ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }

        function spawnEnemyDeathDrops(x, y, isBoss = false, isElite = false) {
            if (Math.random() < 0.70 || isBoss || isElite) {
                let ammoAmount = isBoss ? 28 : (isElite ? 16 : 8);
                let drop = (ammoDropPool.length > 0) ? ammoDropPool.pop() : null;
                if (drop && typeof drop.reset === 'function') drop.reset(x, y, ammoAmount);
                else drop = new AmmoDrop(x, y, ammoAmount);
                ammoDrops.push(drop);
            }
        }

        function getWeaponSvgIcon(weapon, color = '#00f3ff') {
            if (weapon === 'railgun') {
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><line x1="12" y1="2" x2="12" y2="22" stroke="${color}" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="5" stroke="#ffffff" stroke-width="1.5"/><line x1="6" y1="8" x2="18" y2="8" stroke="${color}" stroke-width="2"/><line x1="6" y1="16" x2="18" y2="16" stroke="${color}" stroke-width="2"/></svg>`;
            } else if (weapon === 'shotgun') {
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><line x1="6" y1="20" x2="2" y2="4" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="3" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/><line x1="18" y1="20" x2="22" y2="4" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/><rect x="7" y="16" width="10" height="4" fill="#ffffff" rx="1"/></svg>`;
            } else if (weapon === 'rapid') {
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="2"/><line x1="12" y1="4" x2="12" y2="20" stroke="#ffffff" stroke-width="2"/><line x1="4" y1="12" x2="20" y2="12" stroke="#ffffff" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="${color}" stroke-width="1.5"/><line x1="6" y1="18" x2="18" y2="6" stroke="${color}" stroke-width="1.5"/></svg>`;
            } else {
                return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2 L17 12 L12 9 L7 12 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/><line x1="12" y1="9" x2="12" y2="22" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
            }
        }

        function updateVitalsAndAmmoHUD() {
            if (!player) return;

            // Shield Bar & Badge
            const shieldBadge = document.getElementById('shield-tier-badge');
            const shieldBar = document.getElementById('player-shield-bar');
            const shieldTxt = document.getElementById('shield-txt-val');
            const sTier = SHIELD_TIERS[player.shieldTier] || SHIELD_TIERS[1];

            if (shieldBadge) {
                shieldBadge.innerText = `درع T${player.shieldTier}`;
                shieldBadge.style.color = sTier.color;
                shieldBadge.style.borderColor = sTier.color;
            }
            if (shieldBar) {
                let ratio = Math.max(0, Math.min(1, player.shieldCharges / (player.shieldMaxCharges || 1)));
                shieldBar.style.width = `${ratio * 100}%`;
                shieldBar.style.backgroundColor = sTier.color;
                shieldBar.style.boxShadow = `0 0 10px ${sTier.color}`;
            }
            if (shieldTxt) {
                shieldTxt.innerText = `${player.shieldCharges}/${player.shieldMaxCharges || 1}`;
            }

            // HP Bar & Badge
            const hpBar = document.getElementById('player-hp-bar');
            const hpTxt = document.getElementById('hp-txt-val');
            if (hpBar) {
                let hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
                hpBar.style.width = `${hpRatio * 100}%`;
                let hpColor = hpRatio > 0.5 ? '#00ff88' : (hpRatio > 0.25 ? '#ffd700' : '#ff0055');
                hpBar.style.backgroundColor = hpColor;
                hpBar.style.boxShadow = `0 0 8px ${hpColor}`;
            }
            if (hpTxt) {
                hpTxt.innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;
            }

            // Minimalist Weapon & Ammo Dock
            const weaponNameTag = document.getElementById('weapon-name-tag');
            const weaponIconMini = document.getElementById('weapon-icon-mini');
            const weaponRarityBadge = document.getElementById('weapon-rarity-badge');
            const ammoCurrentVal = document.getElementById('ammo-current-val');
            const ammoMaxVal = document.getElementById('ammo-max-val');
            const reloadProgressBar = document.getElementById('reload-progress-bar');
            const weaponShapeIcon = document.getElementById('weapon-shape-icon');

            const wRarity = RARITY_TIERS[player.weaponRarity] || RARITY_TIERS[1];
            const wCfg = WEAPON_CONFIGS[player.weapon] || WEAPON_CONFIGS['blaster'];

            if (weaponIconMini) weaponIconMini.innerText = player.isUsingSecondary ? '' : '';
            if (weaponNameTag) {
                let simpleName = player.isUsingSecondary ? 'PISTOL' : (wCfg.id ? wCfg.id.toUpperCase() : 'WEAPON');
                weaponNameTag.innerText = simpleName;
            }
            if (weaponRarityBadge) {
                weaponRarityBadge.innerText = wRarity.name;
                weaponRarityBadge.style.color = wRarity.color;
                weaponRarityBadge.style.borderColor = wRarity.color;
            }
            if (ammoCurrentVal) {
                ammoCurrentVal.innerText = player.isReloading ? 'RELOAD' : player.ammo;
                ammoCurrentVal.style.color = player.ammo <= Math.ceil(player.maxAmmo * 0.25) ? '#ff0055' : '#00f3ff';
            }
            if (ammoMaxVal) {
                ammoMaxVal.innerText = player.maxAmmo;
            }
            if (reloadProgressBar) {
                if (player.isReloading) {
                    let reloadRatio = 1 - (player.reloadTimer / player.reloadDuration);
                    reloadProgressBar.style.width = `${Math.min(100, Math.max(0, reloadRatio * 100))}%`;
                } else {
                    let ammoRatio = player.ammo / player.maxAmmo;
                    reloadProgressBar.style.width = `${ammoRatio * 100}%`;
                }
            }

            // Weapon Vector Icon
            if (weaponShapeIcon) {
                weaponShapeIcon.innerHTML = getWeaponSvgIcon(player.weapon, wRarity.color);
            }
        }

        class EnemyTimeBubble {
            constructor(x, y) { 
                this.x = x; this.y = y; 
                this.radius = 0; this.maxRadius = 220; 
                this.timer = 9000; this.isDead = false; 
            }
            update(delta, frameFactor) {
                this.radius = lerp(this.radius, this.maxRadius, 0.06 * frameFactor);
                this.timer -= delta; 
                if (this.timer <= 0) this.isDead = true;
            }
            draw() {
                if (this.isDead || this.x < camX - 250 || this.x > camX + width + 250 || this.y < camY - 250 || this.y > camY + height + 250) return;
                ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, this.radius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.18)'; ctx.fill();
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3.0; ctx.setLineDash([10, 8]); ctx.stroke();
                // نبض زمني داخلي
                ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, this.radius * 0.5 + Math.sin(performance.now() * 0.005) * 15), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.restore();
            }
        }

        class MortarWarning {
            constructor(x, y) {
                this.x = x; this.y = y; this.radius = 180; this.timer = 1600; this.isDead = false;
            }
            update(delta) {
                this.timer -= delta;
                if (this.timer <= 0) {
                    this.isDead = true;
                    createExplosion(this.x, this.y, '#be123c', 45, 20); 
                    triggerShockwave(this.x, this.y, '#be123c', 220); 
                    playSound('explosion');
                    if (gameSettings.shake) screenShakeTime = 400;
                    if (player && !isGameOver && distSq(this.x, this.y, player.x, player.y) < (this.radius + player.radius)**2) {
                        if (player.takeHit()) triggerGameOver();
                    }
                    // تدمير رصاص الأعداء في منطقة الانفجار الهائل
                    for (let b of bullets) {
                        if (b && distSq(this.x, this.y, b.x, b.y) < this.radius**2) b.isDead = true;
                    }
                }
            }
            draw() {
                if (this.isDead || this.x < camX - 220 || this.x > camX + width + 220 || this.y < camY - 220 || this.y > camY + height + 220) return;
                ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                let alpha = 1 - (this.timer / 1600);
                ctx.fillStyle = `rgba(190, 18, 60, ${alpha * 0.45})`; ctx.fill();
                ctx.strokeStyle = `rgba(255, 42, 95, ${alpha + 0.3})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
                ctx.stroke();
                // مؤشر رادار استهداف داخلي نابض
                ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(1, this.radius * (1 - alpha)), 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            }
        }

        class ToxicPool {
            constructor(x, y) {
                this.x = x; this.y = y; this.radius = 160; this.timer = 8500; this.isDead = false; this.damageTick = 0;
            }
            update(delta) {
                this.timer -= delta; this.damageTick += delta;
                if (this.timer <= 0) this.isDead = true;
                if (this.damageTick > 800) {
                    this.damageTick = 0;
                    if (player && !this.isDead && !isGameOver && distSq(this.x, this.y, player.x, player.y) < (this.radius + player.radius)**2) {
                        if (player.takeHit()) triggerGameOver();
                    }
                }
            }
            draw() {
                if (this.isDead || this.x < camX - 200 || this.x > camX + width + 200 || this.y < camY - 200 || this.y > camY + height + 200) return;
                ctx.save(); ctx.beginPath(); 
                let r = this.radius + Math.sin(performance.now() * 0.006) * 8;
                ctx.arc(this.x, this.y, Math.max(0.1, r), 0, Math.PI * 2);
                let alpha = this.timer < 1000 ? (this.timer/1000) * 0.55 : 0.55;
                ctx.fillStyle = `rgba(244, 63, 94, ${alpha})`; ctx.fill();
                ctx.strokeStyle = 'rgba(255, 0, 85, 0.7)'; ctx.lineWidth = 2; ctx.stroke();
                // فقاعات حمضية سامة
                for (let k = 0; k < 4; k++) {
                    let bx = this.x + Math.cos(k * 1.5 + performance.now() * 0.003) * (this.radius * 0.6);
                    let by = this.y + Math.sin(k * 1.5 + performance.now() * 0.003) * (this.radius * 0.6);
                    ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                ctx.restore();
            }
        }

        // فجوات البلازما الكمية التفاعلية (Cosmic Plasma Rifts & Gravity Anomalies)
        class PlasmaRift {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.radius = 42;
                this.pullRadius = 380;
                this.health = 6;
                this.maxHealth = 6;
                this.isCharged = false;
                this.isDead = false;
                this.respawnTimer = 0;
            }
            update(delta, frameFactor) {
                if (this.isDead) {
                    this.respawnTimer += delta;
                    if (this.respawnTimer >= 45000) {
                        this.isDead = false;
                        this.health = this.maxHealth;
                        this.respawnTimer = 0;
                    }
                    return;
                }

                // سحب الأعداء والرصاص المحيط بجاذبية فيزيائية
                for (let e of enemies) {
                    if (e && !e.isDead && e.type !== 'boss') {
                        let d = dist(this.x, this.y, e.x, e.y);
                        if (d < this.pullRadius && d > 15) {
                            e.x += ((this.x - e.x) / d) * 1.8 * frameFactor * timeScale;
                            e.y += ((this.y - e.y) / d) * 1.8 * frameFactor * timeScale;
                        }
                    }
                }
            }
            takeHit(dmg) {
                if (this.isDead) return;
                this.health -= dmg;
                createExplosion(this.x, this.y, '#00f3ff', 8, 4);
                if (this.health <= 0) {
                    this.detonate();
                }
            }
            detonate() {
                this.isDead = true;
                this.respawnTimer = 0;
                createExplosion(this.x, this.y, '#ffd700', 80, 30);
                triggerShockwave(this.x, this.y, '#00f3ff', 450);
                playSound('ultimate');
                if (gameSettings.shake) screenShakeTime = 600;

                // إبادة وتدمير هائل للأعداء في محيط 450px
                for (let e of enemies) {
                    if (e && !e.isDead) {
                        let d = dist(this.x, this.y, e.x, e.y);
                        if (d < 450) {
                            e.health -= 15;
                            e.hitFlashTimer = 150;
                            if (e.health <= 0) {
                                e.isDead = true;
                                createExplosion(e.x, e.y, e.color, 30, 15);
                                sessionKills++;
                            }
                        }
                    }
                }
                // تدمير رصاص الأعداء
                for (let b of bullets) {
                    if (b && dist(this.x, this.y, b.x, b.y) < 450) b.isDead = true;
                }
                spawnFloatingText(this.x, this.y - 40, ' SUPERNOVA RIFT DETONATION ', '#ffd700', 2000);
            }
            draw() {
                if (this.isDead || this.x < camX - 350 || this.x > camX + width + 350 || this.y < camY - 350 || this.y > camY + height + 350) return;
                ctx.save();
                let t = performance.now() * 0.003;
                
                // دوامة الجاذبية المحيطة مع جزيئات الشفط المتدفقة نحو المركز
                ctx.beginPath(); ctx.arc(this.x, this.y, this.pullRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)'; ctx.lineWidth = 1.8; ctx.setLineDash([12, 12]); ctx.stroke();

                // أذرع دوامة الجاذبية الحلزونية
                ctx.save();
                ctx.translate(this.x, this.y);
                for (let arm = 0; arm < 3; arm++) {
                    let armAngle = (arm * Math.PI * 2 / 3) + t * 0.8;
                    ctx.beginPath();
                    for (let step = 0; step < 16; step++) {
                        let rStep = this.radius + (step / 16) * (this.pullRadius - this.radius);
                        let aStep = armAngle + (step * 0.25);
                        let px = Math.cos(aStep) * rStep, py = Math.sin(aStep) * rStep;
                        if (step === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.strokeStyle = `rgba(189, 0, 255, ${0.15 + Math.sin(t * 2 + arm) * 0.08})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // حلقات البلازما الدوارة
                ctx.rotate(t);
                ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 1.5);
                ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 3.5; ctx.stroke();
                ctx.rotate(-t * 2);
                ctx.beginPath(); ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 1.3);
                ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 3; ctx.stroke();
                
                // قلب الفجوة المتوهج
                let hpRatio = Math.max(0, this.health / this.maxHealth);
                let coreCol = hpRatio < 0.4 ? '#ff0055' : (hpRatio < 0.7 ? '#ffd700' : '#00f3ff');
                ctx.beginPath(); ctx.arc(0, 0, this.radius * (0.85 + Math.sin(t * 4) * 0.08), 0, Math.PI * 2);
                ctx.fillStyle = '#05020c'; ctx.fill();
                ctx.strokeStyle = coreCol; ctx.lineWidth = 4; ctx.stroke();

                ctx.beginPath(); ctx.arc(0, 0, 12 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
                ctx.fillStyle = coreCol; ctx.fill();
                ctx.restore();

                // لافتة تعليمية وشريط طاقة واضح تماماً فوق الفجوة
                ctx.save();
                ctx.translate(this.x, this.y - this.radius - 28);
                
                // خلفية الشارة
                ctx.fillStyle = 'rgba(5, 10, 20, 0.85)';
                ctx.strokeStyle = coreCol;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(-110, -18, 220, 36, 8);
                ctx.fill();
                ctx.stroke();

                // النص الإرشادي
                ctx.font = 'bold 0.72rem "Chakra Petch", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(' فجوة البلازما (أطلق لتفجيرها) ', 0, -4);

                // شريط شحن/صحة الفجوة
                let barW = 180, barH = 5;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(-barW / 2, 6, barW, barH);
                ctx.fillStyle = coreCol;
                ctx.fillRect(-barW / 2, 6, barW * hpRatio, barH);

                ctx.restore();
                ctx.restore();
            }
        }

        let plasmaRifts = [];
        function initPlasmaRifts() {
            plasmaRifts = [
                new PlasmaRift(WORLD_W * 0.25, WORLD_H * 0.25),
                new PlasmaRift(WORLD_W * 0.75, WORLD_H * 0.25),
                new PlasmaRift(WORLD_W * 0.25, WORLD_H * 0.75),
                new PlasmaRift(WORLD_W * 0.75, WORLD_H * 0.75),
                new PlasmaRift(WORLD_W * 0.50, WORLD_H * 0.50)
            ];
        }

        function getBossName(tier) {
            const names = [
                'المكعب العملاق (The Giant Cube)',
                'الكرة المدمرة (The Destroyer Sphere)',
                'القلب السيبراني (The Cyber Heart)',
                'حاصد الزمن (The Time Reaper)',
                'سيد الأبعاد (Apex Overlord)',
                'تنين البلازما الكوني (Cosmic Plasma Drake)',
                'إمبراطور الفراغ الزمني (Chronos Void Emperor)',
                'الكيان اللانهائي الفائق (Omega Prime)'
            ];
            return names[tier - 1] || `الكيان اللانهائي الفائق (Omega Mk.${tier})`;
        }

        function getBossHealth(tier) {
            const baseHp = [130, 240, 380, 560, 780, 1050, 1400, 1850];
            if (tier <= baseHp.length) return baseHp[tier - 1];
            return 1850 + (tier - 8) * 500;
        }

        function getBossColor(tier) {
            const bossColors = [
                '#ff0055', // Tier 1: Red/Neon
                '#ff9100', // Tier 2: Blaze Orange
                '#00ffcc', // Tier 3: Cyber Cyan
                '#3b82f6', // Tier 4: Chrono Blue
                '#bd00ff', // Tier 5: Apex Purple
                '#f43f5e', // Tier 6: Plasma Crimson
                '#ffd700', // Tier 7: Void Gold
                '#ffffff'  // Tier 8+: Omega White
            ];
            return bossColors[(tier - 1) % bossColors.length];
        }

        class Enemy {
            constructor(type, bossTier = 1, isElite = false, customX = null, customY = null) {
                this.type = type; this.bossTier = bossTier; this.isElite = isElite; this.isOverclocked = (currentWave >= 15 && this.isElite);
                this.stunTimer = 0; this.hitFlashTimer = 0; this.isDead = false; 
                this.bossPhase2Triggered = false; this.bossPhase3Triggered = false;
                this.weakpointAngle = 0; this.staggerMeter = 0; this.maxStagger = 20; this.isStaggered = false; this.staggerTimer = 0;
                this.orbitAngle = Math.random() * Math.PI * 2;
                this.stealthTimer = 0; this.stealthAlpha = 1.0;
                this.attackPatternIndex = 0;

                if (type === 'boss') {
                    this.radius = 48 + Math.min(14, bossTier * 2);
                    this.name = getBossName(bossTier);
                    this.maxHealth = getBossHealth(bossTier);
                    this.health = this.maxHealth;
                    this.maxStagger = 20 + Math.min(30, bossTier * 5);
                    this.staggerImmunityTimer = 0;
                } else if (type === 'neon_shooter') {
                    this.name = this.isOverclocked ? 'أوفركلوك المسدس' : (this.isElite ? 'نخبة المسدس' : 'المسدس');
                    this.radius = this.isElite ? 20 : 15; this.health = this.isOverclocked ? 7 : (this.isElite ? 5 : 3); this.maxHealth = this.health;
                } else if (type === 'mine') {
                    this.name = 'لغم موقوت'; this.radius = 14; this.health = 2; this.maxHealth = 2;
                } else if (type === 'drone') {
                    this.name = 'طائرة درع'; this.radius = 12; this.health = 1; this.maxHealth = 1;
                } else if (type === 'splitter') {
                    this.name = this.isElite ? 'نخبة المنشطر' : 'المنشطر المدرع';
                    this.radius = 20; this.health = this.isElite ? 6 : 4; this.maxHealth = this.health;
                } else if (type === 'micro_splitter') {
                    this.name = 'شظية منشطرة'; this.radius = 10; this.health = 1; this.maxHealth = 1;
                } else if (type === 'phantom') {
                    this.name = this.isElite ? 'نخبة الشبح' : 'الشبح المتخفي';
                    this.radius = 16; this.health = this.isElite ? 5 : 3; this.maxHealth = this.health;
                } else if (type === 'orbiter') {
                    this.name = this.isElite ? 'نخبة المداري' : 'المداري المطوق';
                    this.radius = 17; this.health = this.isElite ? 6 : 3.5; this.maxHealth = this.health;
                } else if (type === 'juggernaut') {
                    this.name = this.isElite ? 'نخبة العملاق' : 'العملاق البلازمي';
                    this.radius = 26; this.health = this.isElite ? 14 : 8; this.maxHealth = this.health;
                } else if (type === 'architect') {
                    this.name = this.isElite ? 'كبير المهندسين' : 'المهندس';
                    this.radius = 20; this.health = this.isElite ? 10 : 6; this.maxHealth = this.health;
                } else if (type === 'turret') {
                    this.name = 'برج ليزر'; this.radius = 14; this.health = 4; this.maxHealth = 4;
                } else if (type === 'flanker') {
                    this.name = this.isElite ? 'المراوغ المتقدم' : 'المراوغ';
                    this.radius = 16; this.health = this.isElite ? 5 : 3; this.maxHealth = this.health;
                } else if (type === 'mirror') {
                    this.name = this.isElite ? 'نخبة العاكس' : 'العاكس';
                    this.radius = 20; this.health = this.isElite ? 8 : 5; this.maxHealth = this.health;
                } else if (type === 'swarm_queen') {
                    this.name = this.isElite ? 'ملكة السرب الأكبر' : 'حاضنة السرب';
                    this.radius = 28; this.health = this.isElite ? 22 : 14; this.maxHealth = this.health;
                } else if (type === 'micro_swarm') {
                    this.name = 'حشرة السرب'; this.radius = 8; this.health = 1; this.maxHealth = 1;
                } else if (type === 'leech') {
                    this.name = this.isElite ? 'نخبة الممتص' : 'ممتص الطاقة';
                    this.radius = 15; this.health = this.isElite ? 6 : 3.5; this.maxHealth = this.health;
                } else if (type === 'chronomancer') {
                    this.name = this.isElite ? 'سيد الزمن' : 'مشوه الزمن';
                    this.radius = 18; this.health = this.isElite ? 9 : 5; this.maxHealth = this.health;
                } else if (type === 'tether') {
                    this.name = this.isElite ? 'سجان الأبعاد' : 'المُقيِّد';
                    this.radius = 22; this.health = this.isElite ? 14 : 8; this.maxHealth = this.health;
                } else if (type === 'artillery') {
                    this.name = this.isElite ? 'هاون النخبة' : 'مدفعية الهاون';
                    this.radius = 24; this.health = this.isElite ? 12 : 7; this.maxHealth = this.health;
                } else if (type === 'hacker') {
                    this.name = this.isElite ? 'زعيم الاختراق' : 'المخترق';
                    this.radius = 16; this.health = this.isElite ? 6 : 3.5; this.maxHealth = this.health;
                } else if (type === 'volatile') {
                    this.name = this.isElite ? 'المنصهر العنيف' : 'المنصهر';
                    this.radius = 18; this.health = this.isElite ? 8 : 4; this.maxHealth = this.health;
                } else {
                    this.radius = this.isElite ? 20 : 15; this.health = this.isOverclocked ? 6 : (this.isElite ? 4 : 2.5); this.maxHealth = this.health;
                    this.name = this.isOverclocked ? 'أوفركلوك القناص' : (this.isElite ? 'نخبة القناص' : 'قناص');
                }

                if (this.type === 'boss') {
                    this.x = WORLD_W / 2;
                    this.y = WORLD_H / 2;
                } else if (customX !== null && customY !== null) {
                    this.x = customX; this.y = customY;
                } else {
                    let spawnStrategy = Math.random();
                    let spawnX, spawnY;
                    if (spawnStrategy < 0.45) {
                        // انتشار واسع عبر مختلف مناطق وقطاعات الماب الـ 8000x8000
                        spawnX = 450 + Math.random() * (WORLD_W - 900);
                        spawnY = 450 + Math.random() * (WORLD_H - 900);
                    } else if (spawnStrategy < 0.70 && tacticalZones.length > 0) {
                        // مرابطة ومحاصرة حول الواحات أو البوابات المنتشرة
                        let refPoint = (Math.random() < 0.5 && portals.length > 0) ? portals[Math.floor(Math.random() * portals.length)] : tacticalZones[Math.floor(Math.random() * tacticalZones.length)];
                        let offAng = Math.random() * Math.PI * 2;
                        let offDist = 140 + Math.random() * 400;
                        spawnX = refPoint.x + Math.cos(offAng) * offDist;
                        spawnY = refPoint.y + Math.sin(offAng) * offDist;
                    } else {
                        // تطويق تكتيكي من مسافات متباعدة ومدروسة (1000 - 2400 بكسل)
                        const spawnAngle = Math.random() * Math.PI * 2;
                        const spawnDist = 950 + Math.random() * 1450;
                        spawnX = player ? player.x + Math.cos(spawnAngle) * spawnDist : WORLD_W / 2;
                        spawnY = player ? player.y + Math.sin(spawnAngle) * spawnDist : WORLD_H / 2;
                    }
                    this.x = Math.max(this.radius + 50, Math.min(WORLD_W - this.radius - 50, spawnX)); 
                    this.y = Math.max(this.radius + 50, Math.min(WORLD_H - this.radius - 50, spawnY));
                }
                this.setupType();
            }

            setupType() {
                let diffMultiplier = Math.min(3.0, 1.3 + (currentWave * 0.10));
                if (this.isElite) diffMultiplier *= 1.25;
                if (this.isOverclocked) diffMultiplier *= 1.3;

                this.dashState = 0; // 0: normal, 1: charging, 2: dashing
                this.dashTimer = 0;

                // سمات الأعداء النخبة القتالية (Elite Affixes)
                if (this.isElite) {
                    const affixes = ['shielded', 'overcharged', 'frenzied', 'vampiric'];
                    this.affix = affixes[Math.floor(Math.random() * affixes.length)];
                    this.shieldAngle = 0;
                    this.pulseTimer = 0;
                } else {
                    this.affix = null;
                }

                if (this.type === 'neon_shooter') {
                    this.color = this.isOverclocked ? '#ff00aa' : (this.isElite ? colors.enemyElite : colors.enemyPistol); 
                    this.speed = 1.45 * diffMultiplier; this.shootInterval = Math.max(500, 1200 - (currentWave * 45)); this.bulletSpeed = 8.5;
                } else if (this.type === 'sniper') {
                    this.color = this.isOverclocked ? '#ff00aa' : (this.isElite ? colors.enemyElite : colors.enemySniper); 
                    this.speed = 1.25 * diffMultiplier; this.shootInterval = Math.max(800, 1600 - (currentWave * 50)); this.bulletSpeed = 14.5; 
                } else if (this.type === 'dasher') {
                    this.name = this.isOverclocked ? 'أوفركلوك المندفع' : (this.isElite ? 'نخبة المندفع' : 'مندفع');
                    this.color = this.isOverclocked ? '#ff00aa' : (this.isElite ? colors.enemyElite : colors.enemyDasher); 
                    this.speed = 2.8 * diffMultiplier; this.shootInterval = 999999;
                } else if (this.type === 'burst') {
                    this.name = this.isOverclocked ? 'أوفركلوك الزخات' : (this.isElite ? 'نخبة الزخات' : 'زخات');
                    this.color = this.isOverclocked ? '#ff00aa' : (this.isElite ? colors.enemyElite : colors.enemyBurst); 
                    this.speed = 1.35 * diffMultiplier; this.shootInterval = Math.max(650, 1600 - (currentWave * 50)); this.bulletSpeed = 7.8;
                } else if (this.type === 'mine') {
                    this.color = '#ff5500'; this.speed = 0.95 * diffMultiplier; this.shootInterval = 999999;
                } else if (this.type === 'splitter') {
                    this.color = colors.enemySplitter; this.speed = 1.2 * diffMultiplier; this.shootInterval = Math.max(850, 1750 - (currentWave * 40)); this.bulletSpeed = 7.2;
                } else if (this.type === 'micro_splitter') {
                    this.color = '#7dd3fc'; this.speed = 2.6 * diffMultiplier; this.shootInterval = 999999;
                } else if (this.type === 'phantom') {
                    this.color = colors.enemyPhantom; this.speed = 1.6 * diffMultiplier; this.shootInterval = Math.max(750, 1450 - (currentWave * 40)); this.bulletSpeed = 8.5;
                } else if (this.type === 'orbiter') {
                    this.color = colors.enemyOrbiter; this.speed = 1.7 * diffMultiplier; this.shootInterval = Math.max(650, 1350 - (currentWave * 35)); this.bulletSpeed = 7.8;
                } else if (this.type === 'juggernaut') {
                    this.color = colors.enemyJuggernaut; this.speed = 0.85 * diffMultiplier; this.shootInterval = Math.max(950, 2000 - (currentWave * 55)); this.bulletSpeed = 6.5;
                } else if (this.type === 'boss') {
                    this.color = getBossColor(this.bossTier);
                    this.speed = (1.75 + Math.min(0.95, this.bossTier * 0.12)) * diffMultiplier;
                    this.shootInterval = Math.max(450, 950 - (this.bossTier * 50));
                    this.bulletSpeed = (8.5 + Math.min(3.5, this.bossTier * 0.4)) * diffMultiplier;
                } else if (this.type === 'drone') {
                    this.color = colors.enemyDrone; this.speed = 2.2 * diffMultiplier; this.shootInterval = 999999;
                } else if (this.type === 'architect') {
                    this.color = colors.enemyArchitect; this.speed = 0.75 * diffMultiplier; this.shootInterval = Math.max(3000, 4800 - (currentWave * 100)); this.bulletSpeed = 0;
                } else if (this.type === 'turret') {
                    this.color = colors.enemyTurret; this.speed = 0; this.shootInterval = 1200; this.bulletSpeed = 8.8;
                } else if (this.type === 'flanker') {
                    this.color = colors.enemyFlanker; this.speed = 2.0 * diffMultiplier; this.shootInterval = Math.max(700, 1400 - (currentWave * 50)); this.bulletSpeed = 8.2;
                    this.flankDir = Math.random() < 0.5 ? 1 : -1; 
                } else if (this.type === 'mirror') {
                    this.color = colors.enemyMirror; this.speed = 1.15 * diffMultiplier; this.shootInterval = Math.max(900, 1750 - (currentWave * 40)); this.bulletSpeed = 7.5;
                } else if (this.type === 'swarm_queen') {
                    this.color = colors.enemySwarmQueen; this.speed = 0.55 * diffMultiplier; this.shootInterval = Math.max(2400, 4200 - (currentWave * 100)); this.bulletSpeed = 0;
                } else if (this.type === 'micro_swarm') {
                    this.color = colors.enemyMicroSwarm; this.speed = 2.8 * diffMultiplier; this.shootInterval = 999999;
                } else if (this.type === 'leech') {
                    this.color = colors.enemyLeech; this.speed = 2.6 * diffMultiplier; this.shootInterval = 999999; this.bulletSpeed = 0;
                } else if (this.type === 'chronomancer') {
                    this.color = colors.enemyChronomancer; this.speed = 1.0 * diffMultiplier; this.shootInterval = Math.max(2600, 4200 - (currentWave * 60)); this.bulletSpeed = 7.5;
                } else if (this.type === 'tether') {
                    this.color = colors.enemyTether; this.speed = 1.25 * diffMultiplier; this.shootInterval = Math.max(1800, 3000 - (currentWave * 50)); this.bulletSpeed = 0;
                } else if (this.type === 'artillery') {
                    this.color = colors.enemyArtillery; this.speed = 0.6 * diffMultiplier; this.shootInterval = Math.max(2800, 4200 - (currentWave * 60)); this.bulletSpeed = 9.2;
                } else if (this.type === 'hacker') {
                    this.color = colors.enemyHacker; this.speed = 1.45 * diffMultiplier; this.shootInterval = Math.max(1600, 3000 - (currentWave * 50)); this.bulletSpeed = 9.0;
                } else if (this.type === 'volatile') {
                    this.name = this.isOverclocked ? 'أوفركلوك المنصهر' : (this.isElite ? 'نخبة المنصهر' : 'المنصهر');
                    this.color = this.isOverclocked ? '#ff00aa' : (this.isElite ? colors.enemyElite : colors.enemyVolatile);
                    this.speed = 3.5 * diffMultiplier; this.shootInterval = 999999;
                    this.fuseTimer = 0; this.isIgnited = false;
                }

                if (this.affix === 'frenzied') {
                    this.speed *= 1.35;
                    this.shootInterval *= 0.65;
                }
                
                this.shootTimer = (this.type === 'boss') ? this.shootInterval * 0.85 : Math.random() * this.shootInterval; 
                this.isAiming = false;
            }

            update(delta, frameFactor) {
                if (this.isDead) return;
                if (this.hitFlashTimer > 0) this.hitFlashTimer -= delta;
                this.weakpointAngle += 0.03 * frameFactor * timeScale;
                
                // درع الصمود الخارق للزعماء (Super Armor) لمنع التجميد العشوائي
                if (this.type === 'boss') {
                    this.stunTimer = 0;
                    if (this.staggerImmunityTimer > 0) this.staggerImmunityTimer -= delta;
                }

                if (this.isStaggered) { 
                    this.staggerTimer -= delta; 
                    if (this.staggerTimer <= 0) {
                        this.isStaggered = false;
                        if (this.type === 'boss') this.staggerImmunityTimer = 6000;
                    }
                    return; 
                }
                if (this.stunTimer > 0 && this.type !== 'boss') { this.stunTimer -= delta; return; }

                // تفعيل سمات النخبة القتالية (Elite Affix Logic)
                if (this.isElite && this.affix) {
                    if (this.affix === 'shielded') {
                        this.shieldAngle = (this.shieldAngle || 0) + 0.032 * frameFactor * timeScale;
                    } else if (this.affix === 'vampiric') {
                        // علاج الأعداء المحيطين
                        for (let other of enemies) {
                            if (other && other !== this && !other.isDead && distSq(this.x, this.y, other.x, other.y) < 250**2) {
                                other.health = Math.min(other.maxHealth, other.health + (0.004 * delta));
                            }
                        }
                    } else if (this.affix === 'overcharged' && player) {
                        this.pulseTimer += delta;
                        if (this.pulseTimer >= 3200) {
                            this.pulseTimer = 0;
                            if (distSq(this.x, this.y, player.x, player.y) < 200**2) {
                                triggerShockwave(this.x, this.y, '#ffd700', 200);
                                teslaRenderArcs.push({ x1: this.x, y1: this.y, x2: player.x, y2: player.y, alpha: 1.0 });
                                playSound('tesla');
                                if (!isGameOver && player.takeHit()) triggerGameOver();
                            }
                        }
                    }
                }
                
                if (this.type === 'phantom' && player) {
                    this.stealthTimer += delta * timeScale;
                    this.stealthAlpha = 0.15 + (Math.sin(this.stealthTimer * 0.0035) * 0.5 + 0.5) * 0.85;
                }
                if (this.type === 'leech' && player) {
                    this.stealthTimer += delta * timeScale;
                    this.stealthAlpha = 0.2 + (Math.sin(this.stealthTimer * 0.005) * 0.5 + 0.5) * 0.5;
                    if (dist(this.x, this.y, player.x, player.y) < 180) {
                        player.empEnergy = Math.max(0, player.empEnergy - 12 * (delta/1000));
                        player.overchargeEnergy = Math.max(0, player.overchargeEnergy - 12 * (delta/1000));
                        player.ultEnergy = Math.max(0, player.ultEnergy - 8 * (delta/1000));
                    }
                }
                if (this.type === 'tether' && player) {
                    if (!player.tetheredBy && dist(this.x, this.y, player.x, player.y) < 350 && this.shootTimer >= this.shootInterval) {
                        player.tetheredBy = this; this.shootTimer = 0; playSound('tesla');
                    }
                }

                if (this.type === 'boss' && this.health <= (this.maxHealth * 0.55) && !this.bossPhase2Triggered) {
                    this.bossPhase2Triggered = true; if (gameSettings.shake) screenShakeTime = 600;
                    playSound('overcharge'); triggerShockwave(this.x, this.y, this.color, 320);
                    spawnFloatingText(this.x, this.y - 45, ' PHASE 2: ENRAGED OVERDRIVE! ', this.color);
                    if (this.bossTier === 1) {
                        enemies.push(new Enemy('drone', 1, false, this.x - 45, this.y));
                        enemies.push(new Enemy('drone', 1, false, this.x + 45, this.y));
                        enemies.push(new Enemy('neon_shooter', 1, true, this.x, this.y + 40));
                    } else if (this.bossTier === 2) {
                        enemies.push(new Enemy('mine', 1, false, this.x - 35, this.y - 35));
                        enemies.push(new Enemy('mine', 1, false, this.x + 35, this.y + 35));
                        enemies.push(new Enemy('dasher', 1, true, this.x, this.y));
                    } else if (this.bossTier === 3) {
                        enemies.push(new Enemy('architect', 1, false, this.x, this.y));
                        enemies.push(new Enemy('mirror', 1, true, this.x - 40, this.y));
                    } else if (this.bossTier === 4) {
                        blackHoleSingularity = { x: WORLD_W / 2, y: WORLD_H / 2, radius: 320 };
                        enemies.push(new Enemy('chronomancer', 1, false, this.x, this.y));
                    } else if (this.bossTier === 5) {
                        enemies.push(new Enemy('hacker', 1, true, this.x - 40, this.y));
                        enemies.push(new Enemy('flanker', 1, true, this.x + 40, this.y));
                        temporalRifts.push({ x: this.x, y: this.y, radius: 200, timer: 20000 });
                    } else if (this.bossTier >= 6) {
                        blackHoleSingularity = { x: WORLD_W / 2, y: WORLD_H / 2, radius: 350 };
                        enemies.push(new Enemy('volatile', 1, true, this.x - 50, this.y));
                        enemies.push(new Enemy('artillery', 1, true, this.x + 50, this.y));
                    }
                }

                if (this.type === 'boss' && this.health <= (this.maxHealth * 0.25) && !this.bossPhase3Triggered) {
                    this.bossPhase3Triggered = true; if (gameSettings.shake) screenShakeTime = 800;
                    playSound('ultimate'); triggerShockwave(this.x, this.y, '#ff0055', 420);
                    spawnFloatingText(this.x, this.y - 60, ' PHASE 3: APEX DOOMSDAY NOVA! ', '#ff0055');
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                        spawnEnemyBullet(this.x, this.y, a, this.bulletSpeed * 1.3, this, '#ff0055', 6);
                    }
                }

                if (this.type === 'mine' && player && distSq(this.x, this.y, player.x, player.y) < 60**2) {
                    this.health = 0; this.isDead = true; createExplosion(this.x, this.y, '#ff5500', 25, 12); playSound('explosion');
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) spawnEnemyBullet(this.x, this.y, a, 4.5, this, '#ff5500');
                    return;
                }

                let targetX = player ? player.x : WORLD_W/2, targetY = player ? player.y : WORLD_H/2;
                
                if (this.type === 'drone') {
                    let boss = enemies.find(e => e && !e.isDead && e.type === 'boss');
                    if (boss) { let orbitAngle = performance.now() * 0.0025; targetX = boss.x + Math.cos(orbitAngle) * 80; targetY = boss.y + Math.sin(orbitAngle) * 80; }
                } else if (this.type === 'dasher' && player) {
                    let dToP = dist(this.x, this.y, player.x, player.y);
                    if (this.dashState === 0) {
                        if (dToP < 320) { this.dashState = 1; this.dashTimer = 280; }
                    } else if (this.dashState === 1) {
                        this.dashTimer -= delta * timeScale;
                        if (this.dashTimer <= 0) {
                            this.dashState = 2; this.dashTimer = 360;
                            let dashAngle = Math.atan2(player.y - this.y, player.x - this.x);
                            this.dashVx = Math.cos(dashAngle) * (this.speed * 4.2);
                            this.dashVy = Math.sin(dashAngle) * (this.speed * 4.2);
                            playSound('dash'); createExplosion(this.x, this.y, this.color, 12, 6);
                            triggerShockwave(this.x, this.y, this.color, 80);
                        }
                    } else if (this.dashState === 2) {
                        this.dashTimer -= delta * timeScale;
                        this.x += this.dashVx * frameFactor * timeScale;
                        this.y += this.dashVy * frameFactor * timeScale;
                        if (Math.random() < 0.65 * frameFactor) spawnParticle(this.x, this.y, this.color, 0, 0, 0.08);
                        if (this.dashTimer <= 0) { this.dashState = 0; }
                    }
                } else if (this.type === 'phantom' && player) {
                    let pAngle = Math.atan2(player.vy, player.vx) || 0;
                    targetX = player.x - Math.cos(pAngle) * 140;
                    targetY = player.y - Math.sin(pAngle) * 140;
                } else if (this.type === 'orbiter' && player) {
                    this.orbitAngle += 0.025 * frameFactor * timeScale;
                    targetX = player.x + Math.cos(this.orbitAngle) * 230; targetY = player.y + Math.sin(this.orbitAngle) * 230;
                } else if (this.type === 'flanker' && player) {
                    let angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
                    targetX = player.x + Math.cos(angleToPlayer + (Math.PI/2 * this.flankDir)) * 220;
                    targetY = player.y + Math.sin(angleToPlayer + (Math.PI/2 * this.flankDir)) * 220;
                    if (Math.random() < 0.2 * frameFactor) spawnParticle(this.x - Math.cos(angleToPlayer) * 10, this.y - Math.sin(angleToPlayer) * 10, '#10b981', 0, 0, 0.08);
                } else if (this.type === 'turret') {
                    targetX = this.x; targetY = this.y;
                } else if (this.type === 'artillery' && player) {
                    let dToPlayer = dist(this.x, this.y, player.x, player.y);
                    if (dToPlayer < 450) { targetX = this.x + (this.x - player.x); targetY = this.y + (this.y - player.y); }
                    else if (dToPlayer > 600) { targetX = player.x; targetY = player.y; }
                    else { targetX = this.x; targetY = this.y; }
                } else if (this.type === 'volatile' && player) {
                    let dToPlayer = dist(this.x, this.y, player.x, player.y);
                    this.orbitAngle += 0.12 * frameFactor;
                    let targetRadius = dToPlayer < 120 ? 15 : 45;
                    targetX = player.x + Math.cos(this.orbitAngle) * targetRadius; targetY = player.y + Math.sin(this.orbitAngle) * targetRadius;
                    
                    if (dToPlayer < 85 && !this.isIgnited) {
                        this.isIgnited = true; this.fuseTimer = 240; playSound('tesla');
                    }
                    if (this.isIgnited) {
                        this.fuseTimer -= delta * timeScale;
                        if (this.fuseTimer <= 0) {
                            this.health = 0; this.isDead = true;
                            toxicPools.push(new ToxicPool(this.x, this.y));
                            createExplosion(this.x, this.y, colors.enemyVolatile, 30, 14);
                            triggerShockwave(this.x, this.y, colors.enemyVolatile, 140);
                            playSound('explosion');
                            if (gameSettings.shake) screenShakeTime = 250;
                            if (player && distSq(this.x, this.y, player.x, player.y) < 95**2) {
                                if (player.takeHit()) triggerGameOver();
                            }
                            return;
                        }
                    }
                }

                if (this.dashState !== 2 && this.type !== 'turret') {
                    const d = dist(this.x, this.y, targetX, targetY);
                    if (d > 10) {
                        let currentSpeed = this.speed;
                        if (this.dashState === 1) currentSpeed *= 0.2; // Slow down when charging dash
                        if (this.type === 'boss' && this.health <= (this.maxHealth / 2)) currentSpeed *= 1.35;
                        if (activeTacticalZone && activeTacticalZone.type === 'cryo' && distSq(this.x, this.y, activeTacticalZone.x, activeTacticalZone.y) < activeTacticalZone.radius**2) {
                            currentSpeed *= 0.30; // إبطاء وتجميد بنسبة 70% داخل حقل الصفر المطلق
                        }
                        this.x += ((targetX - this.x) / d) * currentSpeed * frameFactor * timeScale;
                        this.y += ((targetY - this.y) / d) * currentSpeed * frameFactor * timeScale;
                    }
                }

                // تفريق الأعداء ومنع التكدس وتشكيل خطوط قتالية ديناميكية (Anti-Clumping Spatial Separation)
                let nearbyEnemies = getNearbyEnemies(this.x, this.y);
                for (let k = 0; k < nearbyEnemies.length; k++) {
                    let other = nearbyEnemies[k];
                    if (other && other !== this && !other.isDead) {
                        let minSep = this.radius + other.radius + 14;
                        let dsq = distSq(this.x, this.y, other.x, other.y);
                        if (dsq < minSep * minSep && dsq > 0.001) {
                            let dSep = Math.sqrt(dsq);
                            let pushForce = ((minSep - dSep) / minSep) * 1.5 * frameFactor;
                            this.x += ((this.x - other.x) / dSep) * pushForce;
                            this.y += ((this.y - other.y) / dSep) * pushForce;
                        }
                    }
                }

                this.x = Math.max(this.radius, Math.min(WORLD_W - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(WORLD_H - this.radius, this.y));

                if (!['dasher', 'drone', 'mine', 'micro_splitter', 'micro_swarm', 'leech', 'volatile'].includes(this.type)) {
                    this.shootTimer += delta * timeScale;
                    let currentShootInterval = this.shootInterval;
                    if (this.type === 'boss' && this.health <= (this.maxHealth / 2)) currentShootInterval *= 0.60;
                    if (['sniper', 'neon_shooter', 'turret', 'chronomancer'].includes(this.type)) this.isAiming = (this.shootTimer >= currentShootInterval - 800);
                    
                    if (this.shootTimer >= currentShootInterval) { this.shoot(); this.shootTimer = 0; this.isAiming = false; }
                }
            }

            shoot() {
                if (this.isDead || this.isStaggered || !player) return;
                let targetX = player.x + (player.vx * 12), targetY = player.y + (player.vy * 12);
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                const spawnX = this.x + Math.cos(angle) * (this.radius + 6), spawnY = this.y + Math.sin(angle) * (this.radius + 6);

                if (this.type === 'architect') {
                    if (enemies.filter(e => e && !e.isDead && e.type === 'turret').length < 6) {
                        enemies.push(new Enemy('turret', 1, false, this.x, this.y)); createExplosion(this.x, this.y, colors.enemyArchitect, 10, 4);
                    }
                } else if (this.type === 'swarm_queen') {
                    if (enemies.length < 35) {
                        let spawnCount = this.isElite ? 4 : 3;
                        for(let i=0; i < spawnCount; i++) enemies.push(new Enemy('micro_swarm', 1, false, this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30));
                        createExplosion(this.x, this.y, colors.enemySwarmQueen, 12, 6);
                    }
                } else if (this.type === 'chronomancer') {
                    enemyTimeBubbles.push(new EnemyTimeBubble(targetX, targetY));
                    createExplosion(this.x, this.y, this.color, 12, 5); playSound('portal');
                } else if (this.type === 'artillery') {
                    let predX = player.x + player.vx * 35, predY = player.y + player.vy * 35;
                    mortarWarnings.push(new MortarWarning(predX, predY));
                    createExplosion(this.x, this.y, this.color, 8, 4); playSound('shoot_shotgun');
                } else if (this.type === 'hacker') {
                    spawnEnemyBullet(spawnX, spawnY, angle, this.bulletSpeed, this, this.color, 6);
                } else if (['sniper', 'neon_shooter', 'phantom', 'turret', 'mirror', 'flanker'].includes(this.type)) {
                    if (this.isOverclocked) {
                        spawnEnemyBullet(spawnX, spawnY, angle - 0.16, this.bulletSpeed * 1.1, this, this.color);
                        spawnEnemyBullet(spawnX, spawnY, angle, this.bulletSpeed * 1.1, this, this.color);
                        spawnEnemyBullet(spawnX, spawnY, angle + 0.16, this.bulletSpeed * 1.1, this, this.color);
                    } else if (this.isElite) {
                        spawnEnemyBullet(spawnX, spawnY, angle - 0.12, this.bulletSpeed, this, this.color);
                        spawnEnemyBullet(spawnX, spawnY, angle + 0.12, this.bulletSpeed, this, this.color);
                    } else {
                        spawnEnemyBullet(spawnX, spawnY, angle, this.bulletSpeed, this, this.color);
                    }
                } else if (this.type === 'burst') {
                    let count = this.isOverclocked ? 6 : (this.isElite ? 5 : 3), spread = 0.16;
                    for (let i = 0; i < count; i++) { let offset = (i - (count - 1) / 2) * spread; spawnEnemyBullet(spawnX, spawnY, angle + offset, this.bulletSpeed, this, this.color); }
                } else if (this.type === 'splitter') {
                    spawnEnemyBullet(spawnX, spawnY, angle - 0.12, this.bulletSpeed, this, this.color);
                    spawnEnemyBullet(spawnX, spawnY, angle + 0.12, this.bulletSpeed, this, this.color);
                } else if (this.type === 'orbiter') {
                    spawnEnemyBullet(spawnX, spawnY, angle, this.bulletSpeed, this, this.color);
                    spawnEnemyBullet(spawnX, spawnY, angle + Math.PI/2, this.bulletSpeed * 0.85, this, this.color);
                } else if (this.type === 'juggernaut') {
                    spawnEnemyBullet(spawnX, spawnY, angle, this.bulletSpeed, this, this.color, 8);
                } else if (this.type === 'boss') {
                    let isPhase2 = this.health <= (this.maxHealth * 0.55);
                    let isPhase3 = this.health <= (this.maxHealth * 0.25);
                    this.attackPatternIndex = (this.attackPatternIndex || 0) + 1;
                    let now = performance.now();
                    
                    if (this.bossTier === 1) {
                        if (this.attackPatternIndex % 2 === 1) {
                            let numBullets = isPhase3 ? 24 : (isPhase2 ? 18 : 12);
                            let bulletColor = isPhase3 ? '#ff0055' : (isPhase2 ? '#ff9100' : this.color);
                            for (let a = 0; a < Math.PI * 2; a += Math.PI / (numBullets / 2)) {
                                spawnEnemyBullet(this.x, this.y, a, this.bulletSpeed * (isPhase3 ? 1.35 : 1.1), this, bulletColor);
                            }
                        } else {
                            let spreadCount = isPhase3 ? 5 : (isPhase2 ? 4 : 3);
                            for (let i = -spreadCount; i <= spreadCount; i++) {
                                spawnEnemyBullet(spawnX, spawnY, angle + (i * 0.16), this.bulletSpeed * 1.3, this, this.color);
                            }
                            if (isPhase2) triggerShockwave(this.x, this.y, this.color, 140);
                        }
                    } else if (this.bossTier === 2) {
                        if (this.attackPatternIndex % 2 === 1) {
                            let numBullets = isPhase3 ? 28 : (isPhase2 ? 20 : 14);
                            let spiral = now * 0.005;
                            for (let a = 0; a < Math.PI * 2; a += Math.PI / (numBullets / 2)) {
                                spawnEnemyBullet(this.x, this.y, a + spiral, this.bulletSpeed * 1.15, this, this.color);
                            }
                        } else {
                            for (let i = -2; i <= 2; i += 2) {
                                spawnEnemyBullet(this.x, this.y, angle + (i * 0.35), this.bulletSpeed * 0.9, this, '#ff5500', 8);
                            }
                            if (isPhase2) {
                                let predX = player.x + (player.vx * 25), predY = player.y + (player.vy * 25);
                                mortarWarnings.push(new MortarWarning(predX, predY));
                            }
                        }
                    } else if (this.bossTier === 3) {
                        if (this.attackPatternIndex % 2 === 1) {
                            let count = isPhase3 ? 7 : 5;
                            for (let i = -Math.floor(count/2); i <= Math.floor(count/2); i++) {
                                spawnEnemyBullet(spawnX, spawnY, angle + (i * 0.16), this.bulletSpeed * 1.25, this, colors.enemyBurst);
                            }
                        } else {
                            let spiral = now * 0.004;
                            for (let i = 0; i < 4; i++) {
                                let crossAngle = spiral + (i * Math.PI / 2);
                                spawnEnemyBullet(this.x, this.y, crossAngle, this.bulletSpeed * 1.3, this, colors.enemyHacker, 6);
                                spawnEnemyBullet(this.x, this.y, crossAngle + 0.1, this.bulletSpeed * 1.05, this, '#00ffcc');
                            }
                        }
                    } else if (this.bossTier === 4) {
                        let spiral = now * 0.005, numBullets = isPhase3 ? 28 : (isPhase2 ? 20 : 14);
                        for (let a = 0; a < Math.PI * 2; a += Math.PI / (numBullets / 2)) {
                            spawnEnemyBullet(this.x, this.y, a + spiral, this.bulletSpeed * 1.15, this, colors.enemySniper);
                            if (isPhase2) spawnEnemyBullet(this.x, this.y, a - spiral, this.bulletSpeed * 0.9, this, colors.anomaly);
                        }
                        if (this.attackPatternIndex % 2 === 0 && player) {
                            enemyTimeBubbles.push(new EnemyTimeBubble(player.x, player.y));
                            playSound('portal');
                        }
                    } else if (this.bossTier === 5) {
                        let spiral = now * 0.006;
                        if (this.attackPatternIndex % 3 === 1) {
                            for (let i = 0; i < 6; i++) {
                                let crossAngle = spiral + (i * Math.PI / 3);
                                spawnEnemyBullet(this.x, this.y, crossAngle, this.bulletSpeed * 1.3, this, '#ffd700', 7);
                                spawnEnemyBullet(this.x, this.y, crossAngle + 0.07, this.bulletSpeed * 1.1, this, '#bd00ff');
                            }
                        } else if (this.attackPatternIndex % 3 === 2) {
                            for (let i = -1; i <= 1; i++) {
                                let predX = player.x + (player.vx * 30) + (i * 80), predY = player.y + (player.vy * 30) + (i * 80);
                                mortarWarnings.push(new MortarWarning(predX, predY));
                            }
                            playSound('shoot_shotgun');
                        } else {
                            let count = isPhase3 ? 32 : (isPhase2 ? 24 : 16);
                            for (let a = 0; a < Math.PI * 2; a += Math.PI / (count / 2)) {
                                spawnEnemyBullet(this.x, this.y, a, this.bulletSpeed * 1.2, this, isPhase3 ? '#ff0055' : (isPhase2 ? '#f43f5e' : '#00f3ff'));
                            }
                        }
                    } else {
                        let spiral = now * 0.0065, numBullets = isPhase3 ? 32 : (isPhase2 ? 24 : 18);
                        for (let a = 0; a < Math.PI * 2; a += Math.PI / (numBullets / 2)) {
                            spawnEnemyBullet(this.x, this.y, a + spiral, this.bulletSpeed * 1.3, this, '#ffd700', 6);
                            spawnEnemyBullet(this.x, this.y, a - spiral, this.bulletSpeed * 1.05, this, '#a855f7');
                        }
                        if (player) {
                            mortarWarnings.push(new MortarWarning(player.x + player.vx * 25, player.y + player.vy * 25));
                        }
                    }
                }
            }

            draw() {
                if (this.isDead || this.x < camX - 100 || this.x > camX + width + 100 || this.y < camY - 100 || this.y > camY + height + 100) return;
                if (this.type === 'drone') {
                    let target = enemies.find(e => e && !e.isDead && e !== this && (e.type === 'boss' || e.type === 'sniper' || e.type === 'juggernaut'));
                    if (target) { ctx.save(); ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(target.x, target.y); ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore(); }
                }
                
                ctx.save(); ctx.translate(this.x, this.y);
                let lookAngle = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;

                if (this.type === 'phantom') ctx.globalAlpha = Math.max(0.1, this.stealthAlpha);
                else if (this.type === 'leech') ctx.globalAlpha = Math.max(0.1, this.stealthAlpha);

                if (this.type === 'leech' && player && distSq(this.x, this.y, player.x, player.y) < 180**2) {
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(player.x - this.x, player.y - this.y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${Math.sin(performance.now()*0.015)*0.3 + 0.4})`;
                    ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                }
                if (this.type === 'tether' && player && player.tetheredBy === this) {
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(player.x - this.x, player.y - this.y);
                    ctx.strokeStyle = `rgba(239, 68, 68, 0.8)`; ctx.lineWidth = 3; ctx.stroke();
                    ctx.beginPath(); ctx.arc(player.x - this.x, player.y - this.y, 20 + Math.sin(performance.now()*0.01)*5, 0, Math.PI*2);
                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();
                }

                // --- هالة النخبة والأوفركلوك المتقدمة ---
                if (this.isElite) {
                    ctx.save();
                    let auraAngle = performance.now() * 0.003;
                    ctx.rotate(auraAngle);
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius + 8), 0, Math.PI * 2);
                    ctx.strokeStyle = this.isOverclocked ? `rgba(255, 0, 170, ${Math.sin(performance.now() * 0.01) * 0.3 + 0.7})` : `rgba(255, 215, 0, ${Math.sin(performance.now() * 0.008) * 0.3 + 0.6})`;
                    ctx.lineWidth = this.isOverclocked ? 3.0 : 2.5; ctx.setLineDash([6, 4]); ctx.stroke();
                    for (let r = 0; r < 4; r++) {
                        let ra = (r * Math.PI) / 2, rx = Math.cos(ra) * (this.radius + 8), ry = Math.sin(ra) * (this.radius + 8);
                        ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI*2);
                        ctx.fillStyle = this.isOverclocked ? '#ff00aa' : '#ffd700'; ctx.fill();
                    }
                    ctx.restore();

                    // رسم تأثير السمة القتالية (Affix Visual Aura)
                    if (this.affix === 'shielded') {
                        ctx.save();
                        let sAng = (this.shieldAngle || 0) - lookAngle;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius + 12, sAng - Math.PI / 3, sAng + Math.PI / 3);
                        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 4.5; ctx.stroke();
                        let p1x = Math.cos(sAng - Math.PI / 3) * (this.radius + 12), p1y = Math.sin(sAng - Math.PI / 3) * (this.radius + 12);
                        let p2x = Math.cos(sAng + Math.PI / 3) * (this.radius + 12), p2y = Math.sin(sAng + Math.PI / 3) * (this.radius + 12);
                        ctx.beginPath(); ctx.arc(p1x, p1y, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                        ctx.beginPath(); ctx.arc(p2x, p2y, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                        ctx.restore();
                    } else if (this.affix === 'overcharged') {
                        ctx.save();
                        for (let k = 0; k < 2; k++) {
                            let a1 = Math.random() * Math.PI * 2, d1 = this.radius + 6 + Math.random() * 8;
                            ctx.beginPath(); ctx.moveTo(Math.cos(a1) * this.radius, Math.sin(a1) * this.radius);
                            ctx.lineTo(Math.cos(a1) * d1, Math.sin(a1) * d1);
                            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke();
                        }
                        ctx.restore();
                    } else if (this.affix === 'frenzied') {
                        ctx.save();
                        ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
                        ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke();
                        ctx.restore();
                    } else if (this.affix === 'vampiric') {
                        ctx.save();
                        ctx.beginPath(); ctx.arc(0, 0, this.radius + 6 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
                        ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.stroke();
                        ctx.restore();
                    }
                }
                
                ctx.rotate(lookAngle);
                
                if (['sniper', 'neon_shooter', 'turret', 'chronomancer'].includes(this.type) && this.isAiming) {
                    ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(1600, 0);
                    ctx.strokeStyle = `rgba(255, 42, 95, ${Math.sin(performance.now() * 0.05) * 0.6 + 0.4})`; ctx.lineWidth = 2.0; ctx.setLineDash([8, 4]); ctx.stroke(); ctx.setLineDash([]);
                }
                
                let drawColor = this.hitFlashTimer > 0 ? '#ffffff' : (this.stunTimer > 0 || this.isStaggered ? '#00f3ff' : this.color);

                if (this.type === 'neon_shooter') {
                    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0); ctx.lineTo(0, -14); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
                } else if (this.type === 'sniper') {
                    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-14, 14); ctx.lineTo(-6, 0); ctx.lineTo(-14, -14); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.rect(4, -2, 18, 4); ctx.fillStyle = '#fff'; ctx.fill();
                } else if (this.type === 'dasher') {
                    if (this.dashState === 1) {
                        ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(350, 0); ctx.strokeStyle = 'rgba(255, 145, 0, 0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
                    }
                    ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(12, 10); ctx.lineTo(16, 22); ctx.lineTo(-5, 10); 
                    ctx.lineTo(-22, 16); ctx.lineTo(-12, 0); ctx.lineTo(-22, -16); ctx.lineTo(-5, -10); 
                    ctx.lineTo(16, -22); ctx.lineTo(12, -10); ctx.closePath();
                    ctx.fillStyle = (this.dashState === 1 && Math.floor(performance.now()*0.05)%2===0) ? '#fff' : drawColor;
                    ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                } else if (this.type === 'burst') {
                    ctx.beginPath(); ctx.moveTo(18, 14); ctx.lineTo(-8, 18); ctx.lineTo(-16, 0); ctx.lineTo(-8, -18); ctx.lineTo(18, -14); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
                } else if (this.type === 'splitter') {
                    ctx.beginPath(); ctx.moveTo(18, -12); ctx.lineTo(18, 12); ctx.lineTo(-12, 18); ctx.lineTo(-18, 0); ctx.lineTo(-12, -18); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2; ctx.stroke();
                } else if (this.type === 'micro_splitter') {
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                } else if (this.type === 'phantom') {
                    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-16, 14); ctx.lineTo(-7, 0); ctx.lineTo(-16, -14); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();
                } else if (this.type === 'orbiter') {
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius + 6, 0, Math.PI); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
                } else if (this.type === 'juggernaut') {
                    ctx.beginPath(); ctx.rect(-20, -20, 40, 40); ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
                    ctx.beginPath(); ctx.rect(8, -16, 12, 32); ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                } else if (this.type === 'mine') {
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius + Math.sin(performance.now() * 0.015) * 3), 0, Math.PI * 2);
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
                } else if (this.type === 'drone') {
                    ctx.beginPath(); ctx.rect(-11, -11, 22, 22); ctx.closePath(); ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                } else if (this.type === 'architect') {
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) { let angle = (i * Math.PI) / 3, px = Math.cos(angle) * this.radius, py = Math.sin(angle) * this.radius; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
                    ctx.closePath(); ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
                } else if (this.type === 'turret') {
                    ctx.beginPath(); ctx.rect(-12, -12, 24, 24); ctx.fillStyle = drawColor; ctx.fill();
                    ctx.beginPath(); ctx.rect(0, -4, 22, 8); ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.strokeRect(-12, -12, 24, 24);
                } else if (this.type === 'flanker') {
                    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-14, 18); ctx.lineTo(-6, 0); ctx.lineTo(-14, -18); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
                } else if (this.type === 'mirror') {
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fillStyle = drawColor; ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius + 6, -1.2, 1.2); ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 4.5; ctx.stroke();
                } else if (this.type === 'swarm_queen') {
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) { let angle = (i * Math.PI * 2) / 5 - Math.PI/2, px = Math.cos(angle) * this.radius, py = Math.sin(angle) * this.radius; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
                    ctx.closePath(); ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fillStyle = '#8b5cf6'; ctx.fill();
                } else if (this.type === 'micro_swarm') {
                    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, 8); ctx.lineTo(-6, -8); ctx.closePath(); ctx.fillStyle = drawColor; ctx.fill();
                } else if (this.type === 'leech') {
                    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, 12); ctx.lineTo(-2, 0); ctx.lineTo(-8, -12); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
                } else if (this.type === 'chronomancer') {
                    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(15, 0); ctx.lineTo(0, 18); ctx.lineTo(-15, 0); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius + 4, 0, Math.PI*2); ctx.strokeStyle = drawColor; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
                } else if (this.type === 'tether') {
                    ctx.beginPath(); ctx.rect(-15, -15, 30, 30); ctx.fillStyle = drawColor; ctx.fill();
                    ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(15, 15); ctx.moveTo(15, -15); ctx.lineTo(-15, 15);
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeRect(-15, -15, 30, 30);
                } else if (this.type === 'artillery') {
                    ctx.beginPath(); ctx.rect(-16, -16, 32, 32); ctx.fillStyle = drawColor; ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-16, -16, 32, 32);
                } else if (this.type === 'hacker') {
                    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, 15); ctx.lineTo(-5, 0); ctx.lineTo(-10, -15); ctx.closePath();
                    ctx.fillStyle = drawColor; ctx.fill();
                    ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
                } else if (this.type === 'volatile') {
                    let wobble = Math.sin(performance.now() * 0.025) * 4.5;
                    if (this.isIgnited) {
                        ctx.beginPath(); ctx.arc(0, 0, 85, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
                    }
                    ctx.beginPath(); ctx.arc(0, 0, this.radius + wobble, 0, Math.PI*2);
                    ctx.fillStyle = (Math.floor(performance.now()*0.1)%2===0) ? '#fff' : drawColor;
                    ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
                } else if (this.type === 'boss') {
                    let isPhase2 = this.health <= (this.maxHealth / 2);
                    ctx.rotate(-lookAngle); 
                    let spinSpeed = isPhase2 ? 0.006 : 0.0025;
                    let now = performance.now();
                    ctx.rotate(now * spinSpeed);

                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius + 10), 0, Math.PI * 2); 
                    ctx.strokeStyle = isPhase2 ? 'rgba(255, 42, 95, 0.9)' : 'rgba(255, 255, 255, 0.35)'; 
                    ctx.lineWidth = isPhase2 ? 3.5 : 2.5; ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]);

                    if (this.bossTier === 1) {
                        ctx.beginPath(); ctx.rect(-this.radius * 0.75, -this.radius * 0.75, this.radius * 1.5, this.radius * 1.5);
                        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (isPhase2 ? '#ff2a5f' : this.color); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
                        ctx.beginPath(); ctx.rect(-this.radius * 0.4, -this.radius * 0.4, this.radius * 0.8, this.radius * 0.8);
                        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2; ctx.stroke();
                    } else if (this.bossTier === 2) {
                        ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.85, 0, Math.PI * 2);
                        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (isPhase2 ? '#ff5500' : this.color); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
                        for (let i = 0; i < 6; i++) {
                            let spAngle = (i * Math.PI) / 3, spR = this.radius * 1.25;
                            ctx.beginPath(); ctx.moveTo(Math.cos(spAngle) * this.radius * 0.85, Math.sin(spAngle) * this.radius * 0.85);
                            ctx.lineTo(Math.cos(spAngle) * spR, Math.sin(spAngle) * spR);
                            ctx.strokeStyle = '#ff9100'; ctx.lineWidth = 4; ctx.stroke();
                        }
                    } else if (this.bossTier === 3) {
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            let a = (i * Math.PI) / 3, px = Math.cos(a) * this.radius, py = Math.sin(a) * this.radius;
                            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        }
                        ctx.closePath();
                        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (isPhase2 ? '#00ffcc' : this.color); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
                        ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2); ctx.fillStyle = '#059669'; ctx.fill();
                        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
                    } else if (this.bossTier === 4) {
                        ctx.beginPath();
                        for (let i = 0; i < 8; i++) {
                            let a = (i * Math.PI) / 4, r = this.radius * (i % 2 === 0 ? 1.35 : 0.8), bx = Math.cos(a) * r, by = Math.sin(a) * r;
                            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
                        }
                        ctx.closePath(); ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (isPhase2 ? '#a855f7' : this.color); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
                        let handAngle = now * 0.008;
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(handAngle) * (this.radius * 0.9), Math.sin(handAngle) * (this.radius * 0.9));
                        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 3; ctx.stroke();
                    } else if (this.bossTier === 5) {
                        ctx.beginPath();
                        for (let i = 0; i < 12; i++) {
                            let a = (i * Math.PI) / 6, r = this.radius * (i % 2 === 0 ? 1.35 : 0.75), bx = Math.cos(a) * r, by = Math.sin(a) * r;
                            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
                        }
                        ctx.closePath(); ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (isPhase2 ? '#ffd700' : this.color); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
                        ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2); ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 3; ctx.stroke();
                    } else {
                        ctx.beginPath();
                        for (let i = 0; i < 10; i++) {
                            let a = (i * Math.PI) / 5, r = this.radius * (i % 2 === 0 ? 1.4 : 0.8), bx = Math.cos(a) * r, by = Math.sin(a) * r;
                            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
                        }
                        ctx.closePath(); ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : this.color; ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
                        ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2); ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
                    }

                    let wx = Math.cos(this.weakpointAngle) * (this.radius + 14), wy = Math.sin(this.weakpointAngle) * (this.radius + 14);
                    ctx.beginPath(); ctx.arc(wx, wy, 7, 0, Math.PI * 2); ctx.fillStyle = '#00f3ff'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
                }
                ctx.restore();

                if (this.type !== 'boss' && this.type !== 'micro_swarm') {
                    ctx.save(); ctx.translate(this.x, this.y);
                    let heartsCount = Math.max(0, Math.ceil(this.health)), hearts = ''.repeat(Math.min(10, heartsCount));
                    ctx.fillStyle = this.isOverclocked ? '#ff00aa' : (this.isElite ? colors.gold : '#fff'); 
                    ctx.font = this.isElite ? 'bold 11px sans-serif' : '10px sans-serif'; 
                    ctx.textAlign = 'center'; ctx.fillText(`${this.name} ${hearts}`, 0, -this.radius - 8); ctx.restore();
                }
            }
        }

        class Bullet {
            constructor(x, y, angle, speed, owner, color, radius = 4.5) { this.reset(x, y, angle, speed, owner, color, radius); }
            reset(x, y, angle, speed, owner, color, radius = 4.5) { this.x = x; this.y = y; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; this.radius = radius; this.owner = owner; this.color = color; this.grazed = false; }
            update(frameFactor) {
                let slowMod = 1.0;
                if (player && player.hasChronoField && distSq(this.x, this.y, player.x, player.y) < (player.hasTemporalVortex ? 170 : 130)**2) slowMod = player.hasTemporalVortex ? 0.35 : 0.5;
                
                // تبطئة الرصاص مع الحقل التكتيكي النشط
                if (activeTacticalZone && distSq(this.x, this.y, activeTacticalZone.x, activeTacticalZone.y) < activeTacticalZone.radius**2) {
                    if (activeTacticalZone.type === 'chrono') slowMod *= 0.15; // إبطاء فائق 85%
                    else if (activeTacticalZone.type === 'cryo') slowMod *= 0.5; // إبطاء 50%
                }

                this.x += this.vx * frameFactor * timeScale * slowMod; this.y += this.vy * frameFactor * timeScale * slowMod;
                if(Math.random() < 0.25 * frameFactor * timeScale) spawnParticle(this.x, this.y, this.color, 0, 0, 0.5);
            }
            draw() {
                if (this.x < camX - 50 || this.x > camX + width + 50 || this.y < camY - 50 || this.y > camY + height + 50) return;
                let angle = Math.atan2(this.vy, this.vx);
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(angle);
                if (this.owner && this.owner.type === 'sniper') { 
                    ctx.beginPath(); ctx.rect(-14, -3, 28, 6); ctx.fillStyle = this.color; ctx.fill(); 
                    ctx.beginPath(); ctx.rect(-11, -1.5, 22, 3); ctx.fillStyle = '#ffffff'; ctx.fill(); 
                }
                else if (this.owner && this.owner.type === 'neon_shooter') { 
                    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); 
                    ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke(); 
                }
                else if (this.owner && this.owner.type === 'juggernaut') { 
                    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); 
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); 
                }
                else if (this.owner && this.owner.type === 'burst') { 
                    ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); 
                    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); 
                }
                else if (this.owner && this.owner.type === 'boss') { 
                    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); 
                    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); 
                }
                else { 
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius), 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); 
                }
                ctx.restore();
            }
        }

        function spawnEnemyBullet(x, y, angle, speed, owner, color, radius = 4.5) {
            if (isMultiplayerMode()) {
                speed = speed * 0.8; // Reduce enemy bullet speed by 20% online to balance the fast pace
            }
            let b = (bulletPool.length > 0) ? bulletPool.pop() : null;
            if (b && typeof b.reset === 'function') b.reset(x, y, angle, speed, owner, color, radius);
            else b = new Bullet(x, y, angle, speed, owner, color, radius);
            bullets.push(b);
        }

        class Particle {
            constructor(x, y, color, vx, vy, lifeSpeed = 0.02) { this.reset(x, y, color, vx, vy, lifeSpeed); }
            reset(x, y, color, vx, vy, lifeSpeed = 0.02) { this.x = x; this.y = y; this.vx = vx || (Math.random() - 0.5) * 12; this.vy = vy || (Math.random() - 0.5) * 12; this.color = color; this.life = 1.0; this.lifeSpeed = lifeSpeed; this.size = Math.random() * 2.5 + 1; }
            update(frameFactor) {
                this.x += this.vx * frameFactor * timeScale; this.y += this.vy * frameFactor * timeScale;
                this.vx *= Math.pow(0.92, frameFactor); this.vy *= Math.pow(0.92, frameFactor); this.life -= this.lifeSpeed * frameFactor * timeScale;
            }
            draw() {
                if (this.x < camX - 30 || this.x > camX + width + 30 || this.y < camY - 30 || this.y > camY + height + 30) return;
                ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, this.size), 0, Math.PI*2); ctx.fill(); ctx.restore();
            }
        }

        function spawnParticle(x, y, color, vx, vy, lifeSpeed = 0.02) {
            let p = (particlePool.length > 0) ? particlePool.pop() : null;
            if (p && typeof p.reset === 'function') p.reset(x, y, color, vx, vy, lifeSpeed);
            else p = new Particle(x, y, color, vx, vy, lifeSpeed);
            particles.push(p);
        }

        function createExplosion(x, y, color, count, speed = 12) {
            playSound('explosion');
            for(let i = 0; i < count; i++) spawnParticle(x, y, color, (Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed);
        }

        function spawnBounty() {
            if (currentBounty) return;
            currentBounty = { ...proceduralBountyTypes[Math.floor(Math.random() * proceduralBountyTypes.length)], progress: 0 };
            if (bountyBanner) {
                bountyBanner.innerText = `${currentBounty.text} (0/${currentBounty.goal})`;
                bountyBanner.style.display = 'block';
            }
            updateTacticalMapData();
        }

        function updateBounty(type, amount = 1) {
            if (!currentBounty || currentBounty.type !== type) return;
            currentBounty.progress += amount;
            if (bountyBanner) {
                bountyBanner.innerText = `${currentBounty.text} (${currentBounty.progress}/${currentBounty.goal})`;
            }
            if (currentBounty.progress >= currentBounty.goal) {
                currentBounty.reward();
                if (bountyBanner) {
                    bountyBanner.innerText = "اكتمل العقد التكتيكي بنجاح! + مكافأة";
                    setTimeout(() => { bountyBanner.style.display = 'none'; currentBounty = null; }, 2500);
                } else {
                    currentBounty = null;
                }
                playSound('gold');
            }
            updateTacticalMapData();
        }

        // ==================== مصفوفة ترقيات الجولة التكتيكية المحدثة ====================
        const RUN_PERKS = [
            { id: 'shield_upgrade', title: 'تطوير درع الحماية (Aegis)', getDynamicDesc: (p) => { let curLvl = p ? p.shieldLevel : 1; let maxCap = (selectedChassis === 'titan') ? 5 : 3; return curLvl < maxCap ? `ترقية الدرع للمستوى ${curLvl + 1}: يوفر ${curLvl + 1} طبقات حماية وإعادة شحن فورية` : `إعادة شحن الدرع بالكامل (+ شحنة نبض صد خارقة)`; }, icon: '', apply: (p) => { let maxCap = (selectedChassis === 'titan') ? 5 : 3; if (p.shieldLevel < maxCap) p.shieldLevel++; p.shieldCharges = p.shieldLevel; p.hasShield = true; } },
            { id: 'evo_fire', title: 'تطور البلازما الحارقة (Plasma Fire)', desc: 'المقذوفات تترك بقع لهب تحرق الأعداء وتلحق أضراراً مستمرة', icon: '', apply: (p) => { p.evolution = 'fire'; } },
            { id: 'evo_frost', title: 'تطور الصقيع الزمني (Temporal Frost)', desc: 'إصابات الرصاص تبطئ سرعة الأعداء بنسبة 45% وتراكم شلل إضافي', icon: '', apply: (p) => { p.evolution = 'frost'; } },
            { id: 'sub_drone', title: 'المسيّرة الحارسة (Wingman Drone)', desc: 'مركبة مساندة صغيرة مرافقة لهيكل طائرتك تطلق تلقائياً على الأعداء', icon: '', apply: (p) => { p.subweapons.drones.count = Math.min(2, p.subweapons.drones.count + 1); } },
            { id: 'sub_tesla', title: 'ملف تسلا الصاعق (Tesla Coil)', desc: 'تفريغ صواعق كهربائية دورية تقفز بين صفوف الأعداء المتراصة', icon: '', apply: (p) => { p.subweapons.tesla.active = true; p.subweapons.tesla.level = Math.min(3, p.subweapons.tesla.level + 1); } },
            { id: 'sub_mines', title: 'حاقن الألغام النبضية (EMP Mines)', desc: 'إسقاط ألغام موقوتة تلقائياً تشل وتدمر الأعداء المندفعين', icon: '', apply: (p) => { p.subweapons.mines.active = true; p.subweapons.mines.level = Math.min(3, p.subweapons.mines.level + 1); } },
            { id: 'fire_rate', title: 'تسريع التردد الناري', desc: '+25% زيادة سرعة إطلاق النار الأساسية', icon: '', apply: (p) => { p.shootInterval = Math.max(65, p.shootInterval * 0.75); } },
            { id: 'bullet_dmg', title: 'مقذوفات البلازما الفائقة', desc: '+35% مضاعفة ضرر الرصاص الأساسي', icon: '', apply: (p) => { p.damageMultiplier *= 1.35; } },
            { id: 'dash_cd', title: 'مكثف الدفع النفاث', desc: 'تخفيض كولداون Dash بمقدار 250ms', icon: '', apply: (p) => { p.dashMaxCooldown = Math.max(300, p.dashMaxCooldown - 250); } },
            { id: 'magnet_range', title: 'حقل الجذب المفرط', desc: '+50% مدى سحب المكعبات والذهب', icon: '', apply: (p) => { p.magnetBonus = (p.magnetBonus || 1) * 1.5; } },
            { id: 'overcharge_dur', title: 'مفاعل الشحن الزائد', desc: '+2.5 ثوانٍ إضافية لحالة Overcharge', icon: '', apply: (p) => { p.overchargeDurationBonus = (p.overchargeDurationBonus || 0) + 2500; } },
            { id: 'emp_charge', title: 'شاحن طاقة EMP الأيوني', desc: '+40% كفاءة شحن الصدمة الشاملة', icon: '', apply: (p) => { p.empGainBonus *= 1.4; } },
            { id: 'speed_boost', title: 'محركات المناورة التكتيكية', desc: '+18% زيادة سرعة حركة المركبة', icon: '', apply: (p) => { p.speed *= 1.18; } }
        ];

        const BOSS_RELICS = [
            { id: 'relic_chrono_field', title: 'حقل التباطؤ المحيط', desc: 'هالة تبطئ رصاص الأعداء القريب من اللاعب بنسبة 50%', icon: '', apply: (p) => { p.hasChronoField = true; } },
            { id: 'relic_ricochet', title: 'مقذوفات الارتداد', desc: 'رصاص اللاعب يرتد عن جدران الساحة نحو أقرب عدو', icon: '', apply: (p) => { p.hasRicochet = true; } },
            { id: 'relic_reactive_emp', title: 'درع الصدمة الارتدادي', desc: 'إطلاق موجة EMP فورية ومدمرة تلقائياً عند كسر طبقة درع', icon: '', apply: (p) => { p.hasReactiveEMP = true; } },
            { id: 'relic_orbital_blade', title: 'درع الحماية المداري العاكس (Aegis Crest)', desc: 'درع طاقة يدور حولك باستمرار ويعكس مقذوفات الأعداء', icon: '', apply: (p) => { p.hasOrbitalBlade = true; } },
            { id: 'relic_vampiric', title: 'امتصاص الطاقة الفائق', desc: 'القضاء على الأعداء أثناء Overcharge يمدد مدته ويولد ذهباً', icon: '', apply: (p) => { p.hasVampiricOvercharge = true; } }
        ];

        const HYPER_SYNERGIES = [
            { id: 'syn_aegis_nova', title: 'انفجار الدرع الفائق (Aegis Nova)', desc: 'عند كسر أي طبقة درع، يتم تفريغ صدمة إشعاعية تدمر كل الرصاص القريب وتمنح ثانية حصانة كاملة', icon: '', check: (p) => (p.shieldLevel >= 3) && ((acquiredPerks['emp_charge'] || 0) > 0 || (acquiredPerks['shield_upgrade'] || 0) >= 2), apply: (p) => { p.hasAegisNova = true; } },
            { id: 'syn_tesla_superstorm', title: 'عاصفة تسلا المطلقة (Tesla Superstorm)', desc: 'الصواعق تقفز بين 6 أعداء دفعة واحدة وتفرغ صواعق مستمرة خلال حالة Overcharge', icon: '', check: (p) => (p.subweapons.tesla.level >= 1) && ((acquiredPerks['overcharge_dur'] || 0) > 0 || p.hasVampiricOvercharge), apply: (p) => { p.hasTeslaSuperstorm = true; } },
            { id: 'syn_temporal_vortex', title: 'دوامة الزمن (Temporal Vortex)', desc: 'عاصفة شفرات متباطئة تبتلع وتدمر مقذوفات الأعداء وتضاعف محيط الدوران', icon: '', check: (p) => acquiredRelics.some(r => r.id === 'relic_chrono_field') && ((acquiredPerks['speed_boost'] || 0) > 0), apply: (p) => { p.hasTemporalVortex = true; } },
            { id: 'syn_split_flak', title: 'شظايا البلازما المتشعبة (Split Flak)', desc: 'عند ارتداد الرصاص ينشطر تلقائياً إلى 3 مقذوفات بلازما متفجرة', icon: '', check: (p) => acquiredRelics.some(r => r.id === 'relic_ricochet') && ((acquiredPerks['bullet_dmg'] || 0) > 0), apply: (p) => { p.hasSplitFlak = true; } },
            { id: 'syn_dark_supernova', title: 'المستعر الأعظم المظلم (Dark Supernova)', desc: 'عند تفريغ الـ EMP أو كسر الدرع يتم تجميد جميع الأعداء في الساحة لـ 3.5 ثوان', icon: '', check: (p) => acquiredRelics.some(r => r.id === 'relic_reactive_emp') && ((acquiredPerks['emp_charge'] || 0) > 0), apply: (p) => { p.hasDarkSupernova = true; } }
        ];

        function checkHyperSynergies() {
            if (!player) return;
            HYPER_SYNERGIES.forEach(syn => {
                if (!activeSynergies.has(syn.id)) {
                    if (syn.check(player)) {
                        activeSynergies.add(syn.id); syn.apply(player); playSound('synergy');
                        if (gameSettings.shake) screenShakeTime = 400;
                        triggerShockwave(player.x, player.y, '#00f3ff', 260);
                        spawnFloatingText(player.x, player.y - 60, `HYPER SYNERGY: ${syn.title}!`, '#00f3ff');
                    }
                }
            });
        }

        function updateComboHUD() {
            const comboTag = document.getElementById('combo-hud-tag');
            const chassisBadge = document.getElementById('player-chassis-badge');
            if (chassisBadge) {
                let name = selectedChassis === 'striker' ? 'STRIKER' : (selectedChassis === 'titan' ? 'TITAN' : 'QUANTUM');
                chassisBadge.innerText = name;
            }
            if (!comboTag) return;
            if (combo > 1) {
                comboTag.style.display = 'block';
                let rank = 'D', rankColor = '#00f3ff';
                if (combo >= 40) { rank = 'APEX'; rankColor = '#ffd700'; }
                else if (combo >= 25) { rank = 'S'; rankColor = '#ff00ea'; }
                else if (combo >= 15) { rank = 'A'; rankColor = '#ff9100'; }
                else if (combo >= 8) { rank = 'B'; rankColor = '#ffd700'; }
                else if (combo >= 4) { rank = 'C'; rankColor = '#00ff88'; }
                
                comboTag.innerHTML = `COMBO x${combo} <span id="combo-rank-letter" style="color:${rankColor}; font-weight:900;">[${rank}]</span>`;
            } else {
                comboTag.style.display = 'none';
            }
        }

        function renderPerksHUD() {
            if (activePerksDock) {
                activePerksDock.innerHTML = '<span style="font-size:0.65rem; color:#888; font-weight:bold;">العتاد:</span>';
                let hasAny = false;
                if (player && player.nanites > 0) { 
                    hasAny = true; 
                    let badge = document.createElement('div'); 
                    badge.className = 'nanite-badge'; 
                    badge.innerHTML = `<span> نانو:</span> <span>${player.nanites}/${player.maxNanites}</span>`; 
                    activePerksDock.appendChild(badge); 
                }
                if (Array.isArray(equippedPerks)) {
                    equippedPerks.forEach(perkId => {
                        let perkDef = MASTER_PERKS[perkId];
                        let lvl = perkLevels[perkId] || 1;
                        if (perkDef) {
                            hasAny = true;
                            let badge = document.createElement('div');
                            badge.className = 'perk-badge';
                            badge.innerHTML = `<span>${perkDef.icon}</span> <span>${perkDef.title.split(' ')[0]} L${lvl}</span>`;
                            activePerksDock.appendChild(badge);
                        }
                    });
                }
                if (!hasAny) activePerksDock.innerHTML += '<span id="no-perks-txt" style="font-size:0.65rem; color:#555;">فارغ</span>';
            }
            updateTacticalMapData();
        }

        function showPerkSelection() {
            isModalActive = true; perkCardsContainer.innerHTML = '';
            resetJoystick();
            resetAimJoystick();
            isMouseDown = false;
            let availablePerks = RUN_PERKS.filter(p => {
                if (p.id === 'sub_drone' && player && player.subweapons.drones.count >= 2) return false;
                if (p.id === 'sub_tesla' && player && player.subweapons.tesla.level >= 3) return false;
                if (p.id === 'sub_mines' && player && player.subweapons.mines.level >= 3) return false;
                if (p.id.startsWith('evo_') && player && player.evolution) return false;
                return true;
            });
            let shuffled = [...availablePerks].sort(() => 0.5 - Math.random()), selectedThree = shuffled.slice(0, 3);
            selectedThree.forEach(perk => {
                let card = document.createElement('div'); card.className = 'perk-card';
                let descText = perk.getDynamicDesc ? perk.getDynamicDesc(player) : perk.desc;
                card.innerHTML = `<div class="perk-icon">${perk.icon}</div><div class="perk-title">${perk.title}</div><div class="perk-desc">${descText}</div>`;
                card.onclick = () => selectPerk(perk); perkCardsContainer.appendChild(card);
            });
            perkModal.classList.remove('hidden'); playSound('shield');
        }

        function selectPerk(perk) {
            perk.apply(player); acquiredPerks[perk.id] = (acquiredPerks[perk.id] || 0) + 1;
            checkHyperSynergies(); renderPerksHUD(); playSound('gold');
            spawnFloatingText(player.x, player.y - 30, `+ ${perk.title}!`, '#00ff88');
            perkModal.classList.add('hidden'); isModalActive = false; currentWave++; startNextWave(); lastTime = performance.now();
        }

        function showRelicSelection() {
            isModalActive = true; relicCardsContainer.innerHTML = '';
            resetJoystick();
            resetAimJoystick();
            isMouseDown = false;
            let availableRelics = BOSS_RELICS.filter(r => !acquiredRelics.some(ar => ar.id === r.id));
            if (availableRelics.length === 0) availableRelics = BOSS_RELICS;
            let shuffled = [...availableRelics].sort(() => 0.5 - Math.random()), selectedThree = shuffled.slice(0, 3);
            selectedThree.forEach(relic => {
                let card = document.createElement('div'); card.className = 'relic-card';
                card.innerHTML = `<div class="relic-icon">${relic.icon}</div><div class="relic-title">${relic.title}</div><div class="relic-desc">${relic.desc}</div>`;
                card.onclick = () => selectRelic(relic); relicCardsContainer.appendChild(card);
            });
            relicModal.classList.remove('hidden'); playSound('relic');
        }

        function selectRelic(relic) {
            relic.apply(player); acquiredRelics.push(relic);
            checkHyperSynergies(); renderPerksHUD(); playSound('relic');
            spawnFloatingText(player.x, player.y - 45, ` تم التجهيز: ${relic.title}! `, '#ffd700');
            relicModal.classList.add('hidden'); isModalActive = false; currentWave++; startNextWave(); lastTime = performance.now();
        }

        class FloatingText {
            constructor(x, y, text, color) { this.reset(x, y, text, color); }
            reset(x, y, text, color) { this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.0; this.vy = -1.4; }
            update(frameFactor) { this.y += this.vy * frameFactor * timeScale; this.life -= 0.035 * frameFactor * timeScale; }
            draw() {
                if (!gameSettings.floating || this.x < camX - 50 || this.x > camX + width + 50 || this.y < camY - 50 || this.y > camY + height + 50) return;
                ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.restore();
            }
        }

        function spawnFloatingText(x, y, text, color) {
            if (!gameSettings.floating) return;
            let ft = floatingTextPool.length > 0 ? floatingTextPool.pop() : null;
            if (ft) ft.reset(x, y, text, color); else ft = new FloatingText(x, y, text, color);
            floatingTexts.push(ft);
        }

        const CELL_SIZE = 300;
        let enemyGrid = new Map();

        function updateEnemyGrid() {
            enemyGrid.clear();
            for (let i = 0; i < enemies.length; i++) {
                let e = enemies[i];
                if (!e || e.isDead) continue;
                let cellX = Math.floor(e.x / CELL_SIZE), cellY = Math.floor(e.y / CELL_SIZE), key = `${cellX},${cellY}`;
                if (!enemyGrid.has(key)) enemyGrid.set(key, []);
                enemyGrid.get(key).push(e);
            }
        }

        const _nearbyTmp = [];
        function getNearbyEnemies(x, y) {
            let cellX = Math.floor(x / CELL_SIZE), cellY = Math.floor(y / CELL_SIZE);
            _nearbyTmp.length = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    let key = `${cellX + dx},${cellY + dy}`;
                    if (enemyGrid.has(key)) {
                        let cell = enemyGrid.get(key);
                        for (let i = 0; i < cell.length; i++) _nearbyTmp.push(cell[i]);
                    }
                }
            }
            return _nearbyTmp.length > 0 ? _nearbyTmp : enemies;
        }


        class PlayerMine {
            constructor(x, y, damage = 3) { this.reset(x, y, damage); }
            reset(x, y, damage = 3) { this.x = x; this.y = y; this.radius = 16; this.damage = damage; this.timer = 11000; this.isDead = false; this.pulseTimer = 0; }
            update(delta) { this.timer -= delta; this.pulseTimer += delta; if (this.timer <= 0) this.isDead = true; }
            draw() {
                if (this.x < camX - 40 || this.x > camX + width + 40 || this.y < camY - 40 || this.y > camY + height + 40) return;
                ctx.save(); ctx.translate(this.x, this.y);
                let mLvl = (perkLevels && perkLevels['sub_mines']) ? perkLevels['sub_mines'] : 1;
                let pulse = Math.sin(this.pulseTimer * 0.008) * 0.3 + 0.7;
                let mineColor = mLvl >= 3 ? '#ffd700' : (mLvl >= 2 ? '#bd00ff' : '#00ff88');

                if (mLvl === 1) {
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius), 0, Math.PI * 2); 
                    ctx.fillStyle = `rgba(0, 255, 136, ${pulse * 0.28})`; ctx.fill();
                    ctx.strokeStyle = colors.energy; ctx.lineWidth = 2.0; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
                } else if (mLvl === 2) {
                    // Level 2: لغم ثنائي الحلقة مع 4 مكثفات نبضية
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius * 1.15), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(189, 0, 255, ${pulse * 0.32})`; ctx.fill();
                    ctx.strokeStyle = '#bd00ff'; ctx.lineWidth = 2.2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
                    ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.5; ctx.stroke();
                    let rot = this.pulseTimer * 0.003;
                    for (let n = 0; n < 4; n++) {
                        let na = rot + (n * Math.PI / 2);
                        ctx.beginPath(); ctx.arc(Math.cos(na) * 12, Math.sin(na) * 12, 2.5, 0, Math.PI * 2);
                        ctx.fillStyle = '#ffffff'; ctx.fill();
                    }
                } else {
                    // Level 3: لغم كمي جاذبي APEX مع 6 مكثفات ونواة ثقب أسود مصغر
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, this.radius * 1.3), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.35})`; ctx.fill();
                    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
                    ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.5; ctx.stroke();
                    let rot = -this.pulseTimer * 0.004;
                    for (let n = 0; n < 6; n++) {
                        let na = rot + (n * Math.PI / 3);
                        ctx.beginPath(); ctx.arc(Math.cos(na) * 14, Math.sin(na) * 14, 2.8, 0, Math.PI * 2);
                        ctx.fillStyle = '#ffd700'; ctx.fill();
                    }
                }
                ctx.restore();
            }
        }

        function spawnPlayerMine(x, y, damage = 3) {
            if (playerMines.length >= 8) { let old = playerMines.shift(); if (old && playerMinePool.length < 20) playerMinePool.push(old); }
            let mine = playerMinePool.length > 0 ? playerMinePool.pop() : null;
            if (mine && typeof mine.reset === 'function') mine.reset(x, y, damage); else mine = new PlayerMine(x, y, damage);
            playerMines.push(mine); playSound('mine_arm');
        }

        function startNextWave() {
            isWaveIntermission = false;
            hazardLaserZones = []; blackHoleSingularity = null; arenaLaserWalls = []; temporalRifts = [];

            // Ensure there are always active tactical oases across the map
            tacticalZones = tacticalZones.filter(z => z && !z.isDead);
            if (tacticalZones.length < 2) spawnMultipleTacticalOases(3);

            if (activeGameMode === 'online_pvp') {
                isBossWave = false;
                enemiesLeftToSpawn = 0;
                enemiesInWaveTotal = 0;
                enemies = [];
                if (cleanWaveDisplay) cleanWaveDisplay.innerText = "PVP";
                if (player) spawnFloatingText(player.x, player.y - 40, ' ساحة النزاع المباشر (PVP WARZONE)', '#ff00ea');
                return;
            }

            isBossWave = (activeGameMode === 'boss_rush') || (currentWave % 5 === 0);
            if (cleanWaveDisplay) cleanWaveDisplay.innerText = currentWave;

            if (isBossWave) {
                let bossTier = (activeGameMode === 'boss_rush') ? currentWave : Math.floor(currentWave / 5);
                enemiesLeftToSpawn = 0;
                // البوس يرسبن دائماً في مركز الماب الدقيق
                enemies.push(new Enemy('boss', bossTier, false, WORLD_W / 2, WORLD_H / 2));
                if (gameSettings.shake) screenShakeTime = 600;
                playSound('overcharge');
                // المربع والنطاق الأحمر يغطي كامل مساحة الماب عند ظهور البوس
                arenaLaserWalls.push({ x: 0, y: 0, w: WORLD_W, h: WORLD_H, pulseTimer: 0 });
                let bossName = getBossName(bossTier);
                bossWarningBanner.innerText = ` تحذير: استنفار طوارئ! ظهور الزعيم [${bossName}] بوسط الساحة `;
                bossWarningBanner.style.display = 'block';
                setTimeout(() => { bossWarningBanner.style.display = 'none'; }, 3500);
            } else {
                enemiesInWaveTotal = 14 + (currentWave * 6);
                enemiesLeftToSpawn = enemiesInWaveTotal;
                if (player) spawnFloatingText(player.x, player.y - 40, `الموجة ${currentWave}`, '#00f3ff');
                playSound('shield');
            }
            if (currentWave > highestWaveRecord) { highestWaveRecord = currentWave; saveGameProgress(); }
            checkAchievements(survivalSeconds, sessionKills, metaCurrency, currentWave);
        }

        function triggerGameOver() {
            if (isGameOver) return;
            isGameOver = true;
            bossHudContainer.style.display = 'none'; dashBtnHud.style.display = 'none'; if (reloadBtnHud) reloadBtnHud.style.display = 'none'; if (superEmpBtnHud) superEmpBtnHud.style.display = 'none'; ultBtnHud.style.display = 'none';
            if (joystickBase) joystickBase.style.display = 'none';
            if (joystickAimBase) joystickAimBase.style.display = 'none';
            bossWarningBanner.style.display = 'none'; hazardWarningBanner.style.display = 'none';
            resetJoystick();
            resetAimJoystick();
            isMouseDown = false;
            perkModal.classList.add('hidden'); relicModal.classList.add('hidden');
            if (player) { createExplosion(player.x, player.y, colors.player, 80, 20); triggerShockwave(player.x, player.y, colors.player, 320); }
            if (gameSettings.shake) screenShakeTime = 500;
            
            let finalSec = survivalSeconds;
            uiFinalWave.innerText = (activeGameMode === 'boss_rush') ? `زعيم ${currentWave}` : `الموجة ${currentWave}`;
            uiFinalScore.innerText = finalSec.toFixed(1); uiFinalXp.innerText = Math.floor(sessionXP); uiTotalMeta.innerText = metaCurrency + sessionCubes; uiFinalCubes.innerText = sessionCubes;
            document.getElementById('tel-parries').innerText = sessionParries; document.getElementById('tel-grazes').innerText = sessionGrazes; document.getElementById('tel-subkills').innerText = sessionSubKills; document.getElementById('tel-ults').innerText = sessionUlts;

            playerXP += Math.floor(sessionXP);
            let nextLevelXP = playerLevel * 300;
            while (playerXP >= nextLevelXP) { playerXP -= nextLevelXP; playerLevel++; metaCurrency += 10; nextLevelXP = playerLevel * 300; }
            metaCurrency += sessionCubes;

            checkAchievements(finalSec, sessionKills, metaCurrency, currentWave);
            checkContracts(finalSec, sessionParries, sessionCubesEnergy);
            saveGameProgress(); updateArsenalUI();
            setTimeout(() => { gameOverScreen.classList.remove('hidden'); }, 1000);
        }

        function returnToMainMenu() {
            gameOverScreen.classList.add('hidden'); pauseMenu.classList.add('hidden'); perkModal.classList.add('hidden'); relicModal.classList.add('hidden');
            const respawnModal = document.getElementById('pvp-respawn-modal');
            if (respawnModal) respawnModal.classList.add('hidden');
            if (pvpRespawnCountdownTimer) { clearInterval(pvpRespawnCountdownTimer); pvpRespawnCountdownTimer = null; }
            const dock = document.getElementById('online-leaderboard-dock');
            if (dock) dock.style.display = 'none';
            stopPingMeasurement();

            bossHudContainer.style.display = 'none'; dashBtnHud.style.display = 'none'; if (reloadBtnHud) reloadBtnHud.style.display = 'none'; if (superEmpBtnHud) superEmpBtnHud.style.display = 'none'; ultBtnHud.style.display = 'none';
            if (joystickBase) joystickBase.style.display = 'none';
            if (joystickAimBase) joystickAimBase.style.display = 'none';
            bossWarningBanner.style.display = 'none'; hazardWarningBanner.style.display = 'none';
            resetJoystick();
            resetAimJoystick();
            isMouseDown = false;
            mainMenu.style.display = 'flex';
        }

        function startGame() {
            startProceduralBgm();
            initAudio();
            if (mainMenu) mainMenu.style.display = 'none';
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            if (isTouchDevice) {
                if (dashBtnHud) dashBtnHud.style.display = 'flex';
                if (reloadBtnHud) reloadBtnHud.style.display = 'flex';
                if (superEmpBtnHud) superEmpBtnHud.style.display = 'flex';
                
                if (ultBtnHud) ultBtnHud.style.display = 'flex';
                if (joystickBase) joystickBase.style.display = 'flex';
                if (joystickAimBase) joystickAimBase.style.display = 'flex';
                if (hudInstructions) hudInstructions.style.display = 'none';
                updateJoystickCenter();
            } else {
                if (dashBtnHud) dashBtnHud.style.display = 'flex';
                if (reloadBtnHud) reloadBtnHud.style.display = 'flex';
                if (superEmpBtnHud) superEmpBtnHud.style.display = 'flex';
                
                if (ultBtnHud) ultBtnHud.style.display = 'flex';
                if (joystickBase) joystickBase.style.display = 'none';
                if (joystickAimBase) joystickAimBase.style.display = 'none';
                if (hudInstructions) hudInstructions.style.display = 'block';
                updateJoystickCenter();
            }

            const isOnline = isMultiplayerMode();
            if (isOnline) {
                startPingMeasurement();
            } else {
                stopPingMeasurement();
            }

            initGame();
        }

        function initGame() {
            gameOverScreen.classList.add('hidden'); pauseMenu.classList.add('hidden'); perkModal.classList.add('hidden'); relicModal.classList.add('hidden');
            bossWarningBanner.style.display = 'none'; hazardWarningBanner.style.display = 'none'; bossHudContainer.style.display = 'none';

            player = new Player(selectedWeapon, selectedClass);
            camX = player.x - width / 2;
            camY = player.y - height / 2;
            enemies = []; bullets = []; bulletPool = []; playerBullets = []; playerBulletPool = []; particles = []; particlePool = []; floatingTexts = []; floatingTextPool = []; energyCubes = []; goldenCubes = []; ammoDrops = []; activeTacticalZone = null; activeRicochetCount = 0;
            enemyTimeBubbles = []; mortarWarnings = []; toxicPools = [];
            playerMines = []; teslaRenderArcs = []; arenaLaserWalls = []; temporalRifts = []; shockwaves = [];
            portals = [
                new Portal(450, 450),
                new Portal(WORLD_W - 450, 450),
                new Portal(WORLD_W - 450, WORLD_H - 450),
                new Portal(450, WORLD_H - 450)
            ];
            score = 0; survivalSeconds = 0; sessionCubes = 0; sessionXP = 0; sessionKills = 0; sessionParries = 0; sessionGrazes = 0; sessionSubKills = 0; sessionUlts = 0; sessionCubesEnergy = 0; combo = 1; comboTimer = 0; difficulty = 1.0;
            spawnTimer = 0; bountyTimer = 0; currentBounty = null;
            isGameOver = false; isGamePaused = false; isModalActive = false; isMoving = false; timeScale = 0.25; hitStopDuration = 0;
            resetJoystick();
            resetAimJoystick();
            isMouseDown = false;
            
            currentWave = 1; isWaveIntermission = false; acquiredPerks = {}; acquiredRelics = []; activeSynergies.clear();
            renderPerksHUD(); updateSettingsUI(); updateComboHUD(); updateVitalsAndAmmoHUD(); startNextWave();
            
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            lastTime = performance.now(); frameCount = 0; fpsTimer = performance.now();
            gameLoopId = requestAnimationFrame(loop);
        }

        function toggleTacticalMapModal(forceState = null) {
            if (mainMenu && mainMenu.style.display !== 'none') return;
            if (forceState !== null) isTacticalMapOpen = forceState;
            else isTacticalMapOpen = !isTacticalMapOpen;

            if (tacticalMapModal) {
                if (isTacticalMapOpen) {
                    tacticalMapModal.classList.remove('hidden');
                    tacticalMapModal.style.display = 'flex';
                    updateTacticalMapData();
                    drawExpandedTacticalMap();
                    playSound('shield');
                } else {
                    tacticalMapModal.classList.add('hidden');
                    tacticalMapModal.style.display = 'none';
                }
            }
        }

        function updateTacticalMapData() {
            if (!isTacticalMapOpen) return;

            // Update header info
            if (mapWaveInfo) {
                mapWaveInfo.innerText = activeGameMode === 'online_pvp' ? ' ساحة النزاع (PVP)' : `الموجة: ${currentWave}`;
            }
            if (mapPlayerCoords && player) {
                mapPlayerCoords.innerText = `X: ${Math.round(player.x)} | Y: ${Math.round(player.y)}`;
            }

            // Update Left Panel: Contracts & Bounties
            if (mapContractsContainer) {
                let html = '';
                if (currentBounty) {
                    let curProg = currentBounty.progress || 0;
                    let goalProg = currentBounty.goal || 1;
                    let bPct = Math.min(100, Math.round((curProg / goalProg) * 100));
                    html += `
                        <div class="bounty-card-mini" style="border-color: #00f3ff;">
                            <div class="b-title" style="color:#00f3ff;"> ${currentBounty.text}</div>
                            <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.5); border-radius: 3px; overflow: hidden; margin: 4px 0;">
                                <div style="width: ${bPct}%; height: 100%; background: #00ff88; transition: width 0.2s;"></div>
                            </div>
                            <div class="b-prog">التقدم: ${curProg}/${goalProg} (${bPct}%)</div>
                        </div>
                    `;
                }

                html += `
                    <div class="bounty-card-mini">
                        <div class="b-title">PTS سجل الصمود التكتيكي</div>
                        <div style="font-size:0.72rem; color:#8899aa;">الزمن المستمر: <span style="color:#ffd700; font-weight:bold;">${survivalSeconds.toFixed(1)}s</span></div>
                        <div style="font-size:0.72rem; color:#8899aa;">إقصاءات الجولة: <span style="color:#00f3ff; font-weight:bold;">${sessionKills}</span></div>
                    </div>
                    <div class="bounty-card-mini">
                        <div class="b-title"> عقد التطهير السيبراني</div>
                        <div style="font-size:0.70rem; color:#aaa;">طهر الساحة للوصول إلى الموجة ${currentWave + 1}. المكافأة: +15 CR</div>
                    </div>
                `;

                mapContractsContainer.innerHTML = html;
            }

            // Update Right Panel: Leaderboard / Telemetry
            if (mapLeaderboardContainer) {
                let html = '';
                if (isMultiplayerMode()) {
                    html += `<div style="font-weight:bold; color:#00ff88; margin-bottom:4px; font-size:0.8rem;"> المتواجدون بالساحة:</div>`;
                    let allPlayers = [{ name: tacticalUsername + ' (أنت)', kills: sessionKills, score: Math.round(score), isLocal: true }];
                    remotePlayers.forEach(rp => {
                        allPlayers.push({ name: rp.username || 'Agent', kills: rp.kills || 0, score: Math.round(rp.score || 0), isLocal: false });
                    });
                    allPlayers.sort((a, b) => b.score - a.score);
                    allPlayers.forEach((p, idx) => {
                        html += `
                            <div style="display:flex; justify-content:space-between; padding:4px 8px; background:rgba(255,255,255,0.05); border-radius:4px; margin-bottom:4px; font-size:0.74rem;">
                                <span>#${idx+1} ${p.name}</span>
                                <span style="color:#ffd700; font-weight:bold;">${p.score} pts (${p.kills} )</span>
                            </div>
                        `;
                    });
                } else {
                    html += `
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.76rem;">
                            <div style="display:flex; justify-content:space-between;"><span>النقاط الكلية:</span><strong style="color:#ffd700;">${Math.round(score)}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>مستوى الكومبو:</span><strong style="color:#ff00ea;">x${combo}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>الضحايا (Kills):</span><strong style="color:#00f3ff;">${sessionKills}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>المراوغات (Graze):</span><strong style="color:#00ff88;">${sessionGrazes}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>الصد الفوري (Parry):</span><strong style="color:#00f3ff;">${sessionParries}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>أسلحة مساندة:</span><strong style="color:#ffd700;">${sessionSubKills}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>قدرات مطلقة:</span><strong style="color:#ff9100;">${sessionUlts}</strong></div>
                        </div>
                    `;
                }
                mapLeaderboardContainer.innerHTML = html;
            }

            // Update Bottom Dock: Acquired Perks
            if (mapActivePerksContainer) {
                let perkKeys = Object.keys(acquiredPerks);
                if (perkKeys.length === 0 && (!Array.isArray(equippedPerks) || equippedPerks.length === 0)) {
                    mapActivePerksContainer.innerHTML = `<span style="color: #667788; font-size: 0.78rem;">لا توجد بيركات مجهزة حالياً</span>`;
                } else {
                    let html = '';
                    let allDisplayedPerks = new Set([...equippedPerks, ...perkKeys]);
                    allDisplayedPerks.forEach(pid => {
                        let pDef = MASTER_PERKS[pid];
                        let lvl = perkLevels[pid] || acquiredPerks[pid] || 1;
                        if (pDef) {
                            html += `
                                <div class="perk-badge" style="padding: 4px 10px; font-size: 0.72rem;" title="${pDef.title}">
                                    <span>${pDef.icon || ''}</span>
                                    <span>${pDef.title}</span>
                                    <span style="color:#ffd700; font-weight:900;">Lv.${lvl}</span>
                                </div>
                            `;
                        }
                    });
                    if (acquiredRelics && acquiredRelics.length > 0) {
                        acquiredRelics.forEach(rel => {
                            html += `
                                <div class="relic-badge" style="padding: 4px 10px; font-size: 0.72rem;">
                                    <span> ${rel.name || 'أثر أسطوري'}</span>
                                </div>
                            `;
                        });
                    }
                    mapActivePerksContainer.innerHTML = html || `<span style="color: #667788; font-size: 0.78rem;">لا توجد بيركات</span>`;
                }
            }
        }

        function drawExpandedTacticalMap() {
            if (!expandedMapCtx || !expandedMapCanvas) return;
            const c = expandedMapCtx;
            const size = expandedMapCanvas.width;
            const scale = size / WORLD_W;

            c.save();
            c.clearRect(0, 0, size, size);

            // Background cyber grid
            c.fillStyle = '#03060c';
            c.fillRect(0, 0, size, size);

            c.strokeStyle = 'rgba(0, 243, 255, 0.08)';
            c.lineWidth = 1;
            for (let x = 0; x <= size; x += size / 10) {
                c.beginPath(); c.moveTo(x, 0); c.lineTo(x, size); c.stroke();
                c.beginPath(); c.moveTo(0, x); c.lineTo(size, x); c.stroke();
            }

            // Radar sweep line on the big map
            let sweepAngle = (performance.now() * 0.0018) % (Math.PI * 2);
            let sweepGrad = c.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size * 0.7);
            sweepGrad.addColorStop(0, 'rgba(0, 243, 255, 0.15)');
            sweepGrad.addColorStop(1, 'rgba(0, 243, 255, 0.0)');
            c.save();
            c.beginPath();
            c.moveTo(size / 2, size / 2);
            c.arc(size / 2, size / 2, size * 0.7, sweepAngle - 0.45, sweepAngle);
            c.closePath();
            c.fillStyle = sweepGrad;
            c.fill();
            c.restore();

            // Concentric range circles
            c.strokeStyle = 'rgba(0, 243, 255, 0.15)';
            c.lineWidth = 1;
            c.beginPath();
            c.arc(size / 2, size / 2, size * 0.25, 0, Math.PI * 2);
            c.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
            c.stroke();

            // Boss warning arena laser walls if active
            for (let wall of arenaLaserWalls) {
                let alpha = Math.sin(performance.now() * 0.006) * 0.25 + 0.65;
                c.strokeStyle = `rgba(255, 0, 85, ${alpha})`;
                c.lineWidth = 2.5;
                c.strokeRect(wall.x * scale, wall.y * scale, wall.w * scale, wall.h * scale);
            }

            // Portals
            for (let p of portals) {
                if (p) {
                    c.fillStyle = colors.portal;
                    c.beginPath();
                    c.arc(p.x * scale, p.y * scale, 4.5, 0, Math.PI * 2);
                    c.fill();
                    c.strokeStyle = '#ffffff';
                    c.lineWidth = 1;
                    c.stroke();
                }
            }

            // Tactical Oases
            for (let z of tacticalZones) {
                if (z && !z.isDead) {
                    let cfg = z.configs[z.type] || { color: '#00ff88' };
                    c.fillStyle = cfg.color + '66';
                    c.beginPath();
                    c.arc(z.x * scale, z.y * scale, 9, 0, Math.PI * 2);
                    c.fill();

                    c.strokeStyle = cfg.color;
                    c.lineWidth = 1.5;
                    c.stroke();

                    // Small oasis icon/dot
                    c.fillStyle = '#ffffff';
                    c.beginPath();
                    c.arc(z.x * scale, z.y * scale, 3, 0, Math.PI * 2);
                    c.fill();
                }
            }

            // Golden Cubes & Energy Cubes
            for (let gc of goldenCubes) {
                if (gc) {
                    c.fillStyle = colors.gold;
                    c.beginPath();
                    c.arc(gc.x * scale, gc.y * scale, 3, 0, Math.PI * 2);
                    c.fill();
                }
            }
            for (let ec of energyCubes) {
                if (ec) {
                    c.fillStyle = '#00f3ff';
                    c.beginPath();
                    c.arc(ec.x * scale, ec.y * scale, 2.5, 0, Math.PI * 2);
                    c.fill();
                }
            }

            // Enemies
            for (let e of enemies) {
                if (e && !e.isDead) {
                    if (e.type === 'boss') {
                        let bpX = e.x * scale, bpY = e.y * scale;
                        c.fillStyle = colors.enemyBoss;
                        c.beginPath();
                        c.arc(bpX, bpY, 8, 0, Math.PI * 2);
                        c.fill();
                        c.strokeStyle = '#ffffff';
                        c.lineWidth = 2;
                        c.stroke();
                        // Pulsing boss ring
                        let pRadius = 8 + (Math.sin(performance.now() * 0.008) * 3 + 3);
                        c.strokeStyle = colors.enemyBoss;
                        c.lineWidth = 1;
                        c.beginPath();
                        c.arc(bpX, bpY, pRadius, 0, Math.PI * 2);
                        c.stroke();
                    } else {
                        c.fillStyle = e.isElite ? colors.enemyElite : (e.color || colors.enemySniper);
                        c.beginPath();
                        c.arc(e.x * scale, e.y * scale, e.isElite ? 3.5 : 2.5, 0, Math.PI * 2);
                        c.fill();
                    }
                }
            }

            // Remote multiplayer agents
            if (isMultiplayerMode()) {
                for (let [rId, rp] of remotePlayers.entries()) {
                    if (rp) {
                        c.fillStyle = (activeGameMode === 'online_pvp') ? '#ff00ea' : '#00ff88';
                        c.beginPath();
                        c.arc(rp.x * scale, rp.y * scale, 4.5, 0, Math.PI * 2);
                        c.fill();
                        c.strokeStyle = '#ffffff';
                        c.lineWidth = 1;
                        c.stroke();
                    }
                }
            }

            // Player Blip & Heading Cone
            if (player) {
                let px = player.x * scale, py = player.y * scale;

                // View range frustum
                let fa = player.facingAngle;
                c.fillStyle = 'rgba(0, 243, 255, 0.15)';
                c.beginPath();
                c.moveTo(px, py);
                c.arc(px, py, 28, fa - 0.45, fa + 0.45);
                c.closePath();
                c.fill();

                // Player dot
                c.fillStyle = '#00f3ff';
                c.beginPath();
                c.arc(px, py, 5, 0, Math.PI * 2);
                c.fill();
                c.strokeStyle = '#ffffff';
                c.lineWidth = 2;
                c.stroke();

                // Pointer
                c.strokeStyle = '#ffffff';
                c.lineWidth = 2;
                c.beginPath();
                c.moveTo(px, py);
                c.lineTo(px + Math.cos(fa) * 11, py + Math.sin(fa) * 11);
                c.stroke();
            }

            // Map outer borders
            c.strokeStyle = 'rgba(0, 243, 255, 0.6)';
            c.lineWidth = 2;
            c.strokeRect(0, 0, size, size);

            c.restore();
        }

        function drawTacticalMinimap() {
            const mapSize = 92, pad = 14, rx = width - mapSize - pad, ry = pad;
            const cx = rx + mapSize / 2, cy = ry + mapSize / 2, r = mapSize / 2;

            ctx.save();
            // Glassmorphic Radar Container
            ctx.fillStyle = 'rgba(6, 10, 18, 0.85)';
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Concentric Range Rings
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
            ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
            ctx.stroke();

            // Crosshair Grids
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
            ctx.beginPath();
            ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
            ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
            ctx.stroke();

            // Rotating Radar Sweep Line
            let sweepAngle = (performance.now() * 0.0022) % (Math.PI * 2);
            let sweepGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, r);
            sweepGrad.addColorStop(0, 'rgba(0, 243, 255, 0.35)');
            sweepGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, sweepAngle - 0.4, sweepAngle);
            ctx.closePath();
            ctx.fillStyle = sweepGrad;
            ctx.fill();
            ctx.restore();

            // Markers Scale
            const scale = mapSize / WORLD_W;

            // Corner Quantum Pylons
            for (let pylon of CORNER_PYLONS) {
                let px = rx + pylon.x * scale;
                let py = ry + pylon.y * scale;
                ctx.fillStyle = '#bd00ff';
                ctx.beginPath();
                ctx.arc(px, py, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Portals
            for (let p of portals) {
                if (p) {
                    ctx.fillStyle = colors.portal;
                    ctx.beginPath();
                    ctx.arc(rx + p.x * scale, ry + p.y * scale, 2.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Golden Cubes
            for (let gc of goldenCubes) {
                if (gc) {
                    ctx.fillStyle = colors.gold;
                    ctx.beginPath();
                    ctx.arc(rx + gc.x * scale, ry + gc.y * scale, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Tactical Supply Oases
            for (let z of tacticalZones) {
                if (z && !z.isDead) {
                    let cfg = z.configs[z.type] || { color: '#00ff88' };
                    ctx.fillStyle = cfg.color;
                    ctx.beginPath();
                    ctx.arc(rx + z.x * scale, ry + z.y * scale, 3.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            // Enemies (EXACT ORIGINAL COLORS PRESERVED 100%)
            for (let e of enemies) {
                if (e && !e.isDead) {
                    ctx.fillStyle = e.type === 'boss' ? colors.enemyBoss : (e.isElite ? colors.enemyElite : (e.color || colors.enemySniper));
                    ctx.beginPath();
                    ctx.arc(rx + e.x * scale, ry + e.y * scale, e.type === 'boss' ? 4.2 : 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Remote Multiplayer Players
            if (isMultiplayerMode()) {
                for (let [rId, rp] of remotePlayers.entries()) {
                    if (rp) {
                        ctx.fillStyle = (activeGameMode === 'online_pvp') ? '#ff00ea' : '#00ff88';
                        ctx.beginPath();
                        ctx.arc(rx + rp.x * scale, ry + rp.y * scale, 2.8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Local Player Blip with Facing Pointer
            if (player) {
                let px = rx + player.x * scale, py = ry + player.y * scale;
                ctx.fillStyle = '#00f3ff';
                ctx.beginPath();
                ctx.arc(px, py, 3.2, 0, Math.PI * 2);
                ctx.fill();
                // Direction indicator
                let fa = player.facingAngle;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + Math.cos(fa) * 7, py + Math.sin(fa) * 7);
                ctx.stroke();
            }

            ctx.restore();
        }

        function loop(currentTime) {
            try {
                let delta = currentTime - lastTime;
            if (!gameSettings.highRefresh && delta < 15.5) { gameLoopId = requestAnimationFrame(loop); return; }
            if (delta > 100) delta = 100;
            lastTime = currentTime;

            frameCount++;
            if (currentTime - fpsTimer >= 500) {
                currentRealFps = Math.round((frameCount * 1000) / (currentTime - fpsTimer));
                frameCount = 0; fpsTimer = currentTime;
                if (fpsHudTag && gameSettings.showFps) {
                    fpsHudTag.innerText = `${currentRealFps} FPS`;
                    fpsHudTag.style.color = currentRealFps >= 90 ? '#00ff88' : (currentRealFps >= 50 ? '#00f3ff' : '#ffaa00');
                }
            }

            if (isGamePaused || isModalActive || (mainMenu && mainMenu.style.display !== 'none')) {
                gameLoopId = requestAnimationFrame(loop);
                return;
            }

            let frameFactor = delta / 16.666;
            let effectiveDelta = delta;
            if (hitStopDuration > 0) { hitStopDuration -= delta; effectiveDelta = 0; }

            let isMobile = (width < 850 || height < 600 || ('ontouchstart' in window));
            let cameraZoom = isMobile ? 0.72 : 1.0;
            let viewW = width / cameraZoom;
            let viewH = height / cameraZoom;

            if (player) {
                // تتبع سلس ناعم للكاميرا مع استشراف ديناميكي لاتجاه التصويب (Dynamic Look-Ahead)
                let lookAheadDist = isMobile ? 35 : 60;
                let lookDirX = Math.cos(player.facingAngle) * lookAheadDist;
                let lookDirY = Math.sin(player.facingAngle) * lookAheadDist;

                let targetCamX = Math.max(0, Math.min(WORLD_W - viewW, player.x + lookDirX - viewW / 2));
                let targetCamY = Math.max(0, Math.min(WORLD_H - viewH, player.y + lookDirY - viewH / 2));

                let camSmoothFactor = 1 - Math.pow(0.80, frameFactor);
                camX = lerp(camX, targetCamX, camSmoothFactor);
                camY = lerp(camY, targetCamY, camSmoothFactor);
            }

            // تحديث إحداثيات الفأرة بالنسبة لعالم اللعبة
            mouseWorldX = camX + (mouseScreenX / cameraZoom);
            mouseWorldY = camY + (mouseScreenY / cameraZoom);

            const isOnlineMode = isMultiplayerMode();
            if (isOnlineMode) {
                timeScale = 1.0; // Permanently FORCE timeScale = 1.0 in online multiplayer!
            } else {
                const isPlayerActive = (isMoving || isAimJoystickActive || isMouseDown || keys.w || keys.a || keys.s || keys.d || (player && Math.hypot(player.vx, player.vy) > 0.8)) && !isGameOver;
                const targetTimeScale = isPlayerActive ? 1.0 : 0.22;
                timeScale = lerp(timeScale, targetTimeScale, 1 - Math.pow(0.82, frameFactor)); 
            }

            if (!isGameOver && player) {
                // مزامنة حالة وتحركات اللاعب المحلي مع سيرفر اللعب الجماعي
                if (isOnlineMode && socket && isSocketConnected) {
                    if (currentTime - lastNetworkSyncTime > 30) {
                        lastNetworkSyncTime = currentTime;
                        socket.emit('player_update', {
                            x: Math.round(player.x),
                            y: Math.round(player.y),
                            vx: Number(player.vx.toFixed(2)),
                            vy: Number(player.vy.toFixed(2)),
                            facingAngle: Number(player.facingAngle.toFixed(2)),
                            health: player.shieldCharges,
                            maxHealth: player.shieldLevel,
                            chassis: player.chassis,
                            weapon: player.weapon,
                            overchargeActive: player.overchargeActive,
                            isDashing: player.dashInvulnerableTimer > 0,
                            isFiringUlt: player.isFiringUlt,
                            score: Math.floor(score),
                            skin: activeCosmeticSkin
                        });
                    }
                }

                survivalSeconds += (effectiveDelta * timeScale) / 1000;
                sessionXP += (effectiveDelta * timeScale / 1000) * 15;

                let currentActiveBoss = enemies.find(e => e && !e.isDead && e.type === 'boss');
                if (currentActiveBoss) {
                    bossHudContainer.style.display = 'flex'; bossNameLabel.innerText = currentActiveBoss.name;
                    bossHpBar.style.width = `${Math.max(0, (currentActiveBoss.health / currentActiveBoss.maxHealth) * 100)}%`;
                    bossStaggerBar.style.width = `${Math.min(100, (currentActiveBoss.staggerMeter / (currentActiveBoss.maxStagger || 14)) * 100)}%`;
                } else {
                    bossHudContainer.style.display = 'none';
                }

                if (survivalSeconds >= 60.0 && !achievements.survivor.unlocked) checkAchievements(survivalSeconds, sessionKills, metaCurrency, currentWave);
                if (survivalSeconds >= 45.0 && !contracts.c_survive.unlocked) checkContracts(survivalSeconds, sessionParries, sessionCubesEnergy);

                // تحديث الواحات التكتيكية المتعددة
                for (let z of tacticalZones) {
                    if (z && !z.isDead) z.update(delta, effectiveDelta, timeScale, frameFactor);
                }
                tacticalZones = tacticalZones.filter(z => z && !z.isDead);
                if (tacticalZones.length > 0) activeTacticalZone = tacticalZones[0];

                // تحديث فجوات البلازما الكمية
                if (plasmaRifts.length === 0) initPlasmaRifts();
                for (let pr of plasmaRifts) {
                    pr.update(delta, frameFactor);
                }

                let chronoZone = player ? getActiveZoneOfTypeAt(player.x, player.y, 'chrono') : null;
                let scoreMultiplier = chronoZone ? combo * 3 : combo;
                score += effectiveDelta * timeScale * scoreMultiplier;
                difficulty = 1 + (currentWave * 0.15);

                bountyTimer += effectiveDelta;
                if (bountyTimer > 26000) { bountyTimer = 0; spawnBounty(); }

                if (blackHoleSingularity) {
                    let dToBH = dist(player.x, player.y, blackHoleSingularity.x, blackHoleSingularity.y);
                    if (dToBH < blackHoleSingularity.radius && dToBH > 10) { player.x += ((blackHoleSingularity.x - player.x) / dToBH) * 1.3 * frameFactor * timeScale; player.y += ((blackHoleSingularity.y - player.y) / dToBH) * 1.3 * frameFactor * timeScale; }
                }

                if (comboTimer > 0) { 
                    comboTimer -= effectiveDelta; 
                    if (comboTimer <= 0) { combo = 1; }
                }
                updateComboHUD();
                
                let dashPct = player.dashCooldown <= 0 ? 100 : Math.max(0, Math.min(100, (1 - (player.dashCooldown / player.dashMaxCooldown)) * 100));

            // زر مهارة السبرنت النفاث: حصري لكلاس الهجوم (Assault) فقط
            if (classSkillBtnHud && player) {
                if (player.playerClass === 'assault') {
                    classSkillBtnHud.style.display = 'flex';
                    let skillPct = player.classSkillCooldown <= 0 ? 100 : Math.max(0, Math.min(100, (1 - (player.classSkillCooldown / player.classSkillMaxCooldown)) * 100));
                    classSkillBtnHud.style.setProperty('--fill-pct', skillPct + '%');
                    classSkillBtnHud.style.setProperty('--btn-color', '#00ff88');
                    if (classSkillBtnTxt) classSkillBtnTxt.innerText = 'SPRINT';
                    if (classSkillBtnSub) {
                        classSkillBtnSub.innerText = skillPct >= 100 ? 'جاهز [E]' : (player.classSkillCooldown / 1000).toFixed(1) + 's';
                    }
                    if (skillPct >= 100) classSkillBtnHud.classList.add('ready');
                    else classSkillBtnHud.classList.remove('ready');
                } else {
                    classSkillBtnHud.style.display = 'none';
                }
            }

            // تحديث زر مهارة الدعم الإضافية
            if (classSkill2BtnHud) {
                if (player && player.playerClass === 'support') {
                    classSkill2BtnHud.style.display = 'flex';
                    let s2Pct = player.classSkill2Cooldown <= 0 ? 100 : Math.max(0, Math.min(100, (1 - (player.classSkill2Cooldown / player.classSkill2MaxCooldown)) * 100));
                    classSkill2BtnHud.style.setProperty('--fill-pct', s2Pct + '%');
                    if (classSkill2BtnSub) {
                        classSkill2BtnSub.innerText = s2Pct >= 100 ? 'جاهز [C]' : (player.classSkill2Cooldown / 1000).toFixed(1) + 's';
                    }
                    if (s2Pct >= 100) classSkill2BtnHud.classList.add('ready');
                    else classSkill2BtnHud.classList.remove('ready');
                } else {
                    classSkill2BtnHud.style.display = 'none';
                }
            }

            // تحديث زر تبديل السلاح الثانوي
            if (swapWeaponBtnHud && player) {
                if (swapBtnTxt) swapBtnTxt.innerText = player.isUsingSecondary ? 'PISTOL' : 'PRIMARY';
                if (swapBtnSub) swapBtnSub.innerText = player.isUsingSecondary ? '[2]' : '[1]';
                if (swapBtnIcon) swapBtnIcon.innerText = player.isUsingSecondary ? '' : '';
            }

            // تحديث إشعار التخفي للقناص والدخان
            if (stealthIndicatorTag && player) {
                if (player.isStealthed) {
                    stealthIndicatorTag.classList.remove('hidden');
                    stealthIndicatorTag.style.display = 'block';
                } else {
                    stealthIndicatorTag.classList.add('hidden');
                    stealthIndicatorTag.style.display = 'none';
                }
            }
                dashBtnHud.style.setProperty('--fill-pct', `${dashPct}%`);
                if (dashPct >= 100) { dashBtnHud.classList.add('ready'); dashBtnSub.innerText = "جاهز"; }
                else { dashBtnHud.classList.remove('ready'); dashBtnSub.innerText = `${Math.round(dashPct)}%`; }

                if (superEmpBtnHud) {
                    let novaPct = Math.max(0, Math.min(100, ((player.superNovaEnergy || 0) / player.superNovaMax) * 100));
                    superEmpBtnHud.style.setProperty('--fill-pct', `${novaPct}%`);
                    if (player.overchargeActive) {
                        superEmpBtnHud.classList.add('active-state');
                        superEmpBtnHud.classList.remove('ready');
                        if (superEmpBtnSub) superEmpBtnSub.innerText = "نشط!";
                    } else if (novaPct >= 100) {
                        superEmpBtnHud.classList.add('ready');
                        superEmpBtnHud.classList.remove('active-state');
                        if (superEmpBtnSub) superEmpBtnSub.innerText = "جاهز (Q)";
                    } else {
                        superEmpBtnHud.classList.remove('ready', 'active-state');
                        if (superEmpBtnSub) superEmpBtnSub.innerText = `${Math.round(novaPct)}%`;
                    }
                }

                let ultPct = Math.max(0, Math.min(100, (player.ultEnergy / player.ultMax) * 100));
                ultBtnHud.style.setProperty('--fill-pct', `${ultPct}%`);
                if (ultPct >= 100) { ultBtnHud.classList.add('ready'); ultBtnSub.innerText = "جاهز!"; }
                else { ultBtnHud.classList.remove('ready'); ultBtnSub.innerText = `${Math.round(ultPct)}%`; }
                
                if (activeGameMode !== 'online_pvp' && !isBossWave && enemiesLeftToSpawn > 0 && !isWaveIntermission) {
                    spawnTimer += effectiveDelta * timeScale;
                    const spawnRate = Math.max(180, 520 - (currentWave * 25)), maxActiveEnemies = Math.min(50, 16 + Math.floor(currentWave * 2.5));
                    if (spawnTimer >= spawnRate && enemies.filter(e => e && !e.isDead).length < maxActiveEnemies) {
                        // مصفوفة أعداء ديناميكية وذكية متنوعة منذ الموجات الأولى
                        let pool = ['neon_shooter', 'dasher', 'phantom', 'volatile'];
                        if (currentWave >= 2) pool.push('splitter', 'flanker', 'leech', 'mine');
                        if (currentWave >= 3) pool.push('orbiter', 'mirror', 'turret', 'drone');
                        if (currentWave >= 4) pool.push('chronomancer', 'swarm_queen', 'hacker');
                        if (currentWave >= 5) pool.push('artillery', 'juggernaut', 'tether', 'architect');
                        // -----------------------------
                        let chosenType = pool[Math.floor(Math.random() * pool.length)];
                        let isElite = (currentWave >= 2 && Math.random() < 0.30);
                        enemies.push(new Enemy(chosenType, 1, isElite));
                        enemiesLeftToSpawn--;
                        spawnTimer = 0;
                    }
                }

                // انتقال بين الموجات: ظهور واحة إمداد تكتيكية لمدة 5 ثوانٍ في موقع عشوائي
                if (activeGameMode !== 'online_pvp' && enemies.filter(e => e && !e.isDead).length === 0 && enemiesLeftToSpawn <= 0 && !isWaveIntermission) {
                    isWaveIntermission = true;
                metaCurrency += 15; // مكافأة إنهاء الموجة
                spawnFloatingText(width / 2, height / 2 - 50, '+15 CR مكافأة إنهاء الموجة!', '#ffd700', 1600);
                saveGameProgress(); 
                    playSound('gold');
                    while (bullets.length > 0) { let b = bullets.pop(); if (b && bulletPool.length < 400) bulletPool.push(b); }
                    mortarWarnings = [];

                    // توليد عدة واحات تكتيكية عشوائية عبر الماب
                    spawnMultipleTacticalOases(3 + Math.floor(Math.random() * 2));
                    playSound('relic');

                    if (isBossWave) {
                        sessionCubes += 30; 
                        goldenCubes.push(new GoldenCube(player.x, player.y - 40)); 
                        goldenCubes.push(new GoldenCube(player.x + 35, player.y));
                        hitStopDuration = 300; 
                        triggerShockwave(player.x, player.y, '#ffd700', 360); 
                        spawnFloatingText(player.x, player.y - 50, ' BOSS DEFEATED! +30 CUBES ', '#ffd700');
                    } else {
                        sessionCubes += 3; 
                        triggerShockwave(player.x, player.y, '#00ff88', 180);
                        spawnFloatingText(player.x, player.y - 30, ' انتهاء الموجة: واحة إمداد (5 ثوانٍ) ', '#00ff88');
                    }

                    setTimeout(() => { 
                        if (!isGameOver && isWaveIntermission) { 
                            currentWave++; 
                            isWaveIntermission = false; 
                            startNextWave(); 
                            lastTime = performance.now(); 
                        } 
                    }, 5200);
                }
                if (Math.random() < 0.006 * frameFactor * timeScale && energyCubes.length < 4) energyCubes.push(new EnergyCube(camX + Math.random() * width, camY + Math.random() * height));
                if (Math.random() < 0.0012 * frameFactor * timeScale && goldenCubes.length < 1) goldenCubes.push(new GoldenCube(camX + Math.random() * width, camY + Math.random() * height));
            }

            if (player) player.update(delta, effectiveDelta, timeScale, frameFactor);
            // تحديث وفحص انتقال اللاعب عبر البوابات الكمية الأربعة
            for (let i = 0; i < portals.length; i++) {
                let p = portals[i];
                if (!p) continue;
                p.update(frameFactor);

                if (!isGameOver && player && player.portalCooldown <= 0) {
                    if (p.checkCollision(player.x, player.y)) {
                        // الانتقال للبوابة المقابلة قطرياً
                        let destIdx = (i + 2) % portals.length;
                        let destPortal = portals[destIdx];
                        if (destPortal) {
                            createExplosion(player.x, player.y, colors.portal, 28, 14);
                            triggerShockwave(player.x, player.y, colors.portal, 160);
                            playSound('portal');

                            let outAngle = Math.atan2(WORLD_H / 2 - destPortal.y, WORLD_W / 2 - destPortal.x);
                            player.x = destPortal.x + Math.cos(outAngle) * 55;
                            player.y = destPortal.y + Math.sin(outAngle) * 55;
                            player.vx = Math.cos(outAngle) * 9;
                            player.vy = Math.sin(outAngle) * 9;
                            player.portalCooldown = 1500;
                            player.invulnerableTimer = 800;

                            createExplosion(player.x, player.y, colors.portal, 28, 14);
                            triggerShockwave(player.x, player.y, colors.portal, 180);
                            spawnFloatingText(player.x, player.y - 45, ' انتقال كمي فوري!', colors.portal);
                            if (gameSettings.shake) screenShakeTime = 220;
                        }
                    }
                }
            }
            // tactical zone updated in main update block

            for (let i = temporalRifts.length - 1; i >= 0; i--) { let tr = temporalRifts[i]; tr.timer -= effectiveDelta; if (tr.timer <= 0) temporalRifts.splice(i, 1); }
            for (let i = cinematicShockwaves.length - 1; i >= 0; i--) { let sw = cinematicShockwaves[i]; if (!sw || sw.isDead) { let rsw = cinematicShockwaves.splice(i, 1)[0]; if (rsw && shockwavePool.length < 15) shockwavePool.push(rsw); continue; } sw.update(frameFactor); }

            for (let i = playerMines.length - 1; i >= 0; i--) {
                let m = playerMines[i];
                if (!m || m.isDead) { let rm = playerMines.splice(i, 1)[0]; if (rm && playerMinePool.length < 20) playerMinePool.push(rm); continue; }
                m.update(effectiveDelta);
                let nearby = getNearbyEnemies(m.x, m.y);
                for (let j = 0; j < nearby.length; j++) {
                    let e = nearby[j];
                    if (e && !e.isDead && distSq(m.x, m.y, e.x, e.y) < (m.radius + e.radius + 15)**2) {
                        m.isDead = true; createExplosion(m.x, m.y, '#00ff88', 25, 10); triggerShockwave(m.x, m.y, '#00ff88', 130);
                        e.health -= m.damage; e.stunTimer = 1800; e.hitFlashTimer = 90; sessionSubKills++; updateBounty('sub_kill', 1);
                        for (let k = bullets.length - 1; k >= 0; k--) { let b = bullets[k]; if (b && distSq(m.x, m.y, b.x, b.y) < 70**2) { let rb = bullets.splice(k, 1)[0]; if (rb && bulletPool.length < 400) bulletPool.push(rb); } }
                        break;
                    }
                }
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (!e || e.isDead) { enemies.splice(i, 1); continue; }
                // Stranded Enemy Arena Clamping Guard
                if (e.x < -150 || e.x > WORLD_W + 150 || e.y < -150 || e.y > WORLD_H + 150) {
                    e.x = Math.max(80, Math.min(WORLD_W - 80, e.x));
                    e.y = Math.max(80, Math.min(WORLD_H - 80, e.y));
                }
                e.update(effectiveDelta, frameFactor);
                if (e.isDead) { enemies.splice(i, 1); continue; }
                if (!isGameOver && player && distSq(player.x, player.y, e.x, e.y) < (player.radius + e.radius - 2)**2) {
                    if (e.type === 'volatile') {
                        e.isDead = true;
                        toxicPools.push(new ToxicPool(e.x, e.y));
                        createExplosion(e.x, e.y, colors.enemyVolatile, 25, 12);
                        playSound('explosion');
                    }
                    if (!player.takeHit()) { e.stunTimer = 1500; let pushAngle = Math.atan2(e.y - player.y, e.x - player.x); e.x = player.x + Math.cos(pushAngle) * (player.radius + e.radius + 60); e.y = player.y + Math.sin(pushAngle) * (player.radius + e.radius + 60); }
                    else { triggerGameOver(); }
                }
            }
            
            // تحديث ورسم حقول الدخان التكتيكية
            for (let i = smokeClouds.length - 1; i >= 0; i--) {
                let sc = smokeClouds[i];
                if (!sc || !sc.isActive) { smokeClouds.splice(i, 1); continue; }
                sc.update(effectiveDelta, timeScale);
                sc.draw();
            }

            // تحديث ورسم المدافع الآلية للمهندس
            for (let i = playerTurrets.length - 1; i >= 0; i--) {
                let t = playerTurrets[i];
                if (!t || t.isDead) { playerTurrets.splice(i, 1); continue; }
                t.update(delta, effectiveDelta, timeScale, frameFactor);
                t.draw();
            }

            // تحديث زمن استطلاع القناص (Recon Pulse)
            if (isReconActive) {
                reconTimer -= effectiveDelta * timeScale;
                if (reconTimer <= 0) isReconActive = false;
                for (let e of enemies) {
                    if (e && !e.isDead) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(e.x, e.y, e.radius + 12 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
                        ctx.strokeStyle = '#ff0055';
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.fillStyle = '#ff0055';
                        ctx.font = 'bold 9px Chakra Petch';
                        ctx.textAlign = 'center';
                        ctx.fillText('TARGET +25%', e.x, e.y - e.radius - 8);
                        ctx.restore();
                    }
                }
            }

            for (let i = playerBullets.length - 1; i >= 0; i--) {
                let pb = playerBullets[i];
                if (!pb) { playerBullets.splice(i, 1); continue; }
                if (effectiveDelta > 0) pb.update(frameFactor, effectiveDelta);
                let hitEnemy = false;
                if (pb.expired) { pb.releaseRicochetSlot(); let recycledPb = playerBullets.splice(i, 1)[0]; if (recycledPb && playerBulletPool.length < 400) playerBulletPool.push(recycledPb); continue; }

                if (pb.isPiercing) {
                    let nearbyEnemies = getNearbyEnemies(pb.x, pb.y);
                    for (let j = 0; j < nearbyEnemies.length; j++) {
                        let e = nearbyEnemies[j];
                        if (e && !e.isDead && !pb.hitEnemies.has(e) && distSq(pb.x, pb.y, e.x, e.y) < (pb.radius + e.radius)**2) {
                            pb.hitEnemies.add(e);
                            let finalDmg = pb.damage;
                            if (e.type === 'juggernaut') {
                                let angleToBullet = Math.atan2(pb.y - e.y, pb.x - e.x), lookAngle = player ? Math.atan2(player.y - e.y, player.x - e.x) : 0;
                                let angleDiff = Math.abs(angleToBullet - lookAngle);
                                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                                if (angleDiff < 1.3) finalDmg *= 0.5; // 50% frontal damage reduction
                            }
                            e.health -= finalDmg; e.hitFlashTimer = 90; createExplosion(pb.x, pb.y, '#ff00ea', 6, 4);
                            if (e.health <= 0 && !e.isDead) {
                                e.isDead = true; 
                            metaCurrency += (e.type === 'boss' ? 50 : (e.isElite ? 3 : 1));
                            createExplosion(e.x, e.y, e.color, 22, 10); 
                            hitStopDuration = (e.type === 'boss') ? 150 : 50; 
                                if (e.type === 'splitter') {
                                    enemies.push(new Enemy('micro_splitter', 1, false, e.x - 15, e.y - 15));
                                    enemies.push(new Enemy('micro_splitter', 1, false, e.x + 15, e.y + 15));
                                }
                                if (e.type === 'volatile') {
                                    toxicPools.push(new ToxicPool(e.x, e.y));
                                }
                                if (e.isOverclocked) {
                                    triggerShockwave(e.x, e.y, '#ff00aa', 100);
                                    playSound('tesla');
                                }
                                if (player) { player.nanites = Math.min(player.maxNanites, player.nanites + (e.isOverclocked ? 4 : (e.isElite ? 3 : 1))); renderPerksHUD(); }
                                let dropCubes = (e.type === 'boss') ? 16 : (e.isOverclocked ? 8 : (e.isElite ? 6 : 2));
                                sessionCubes += dropCubes; sessionXP += (e.type === 'boss') ? 150 : (e.isOverclocked ? 90 : (e.isElite ? 60 : 25)); sessionKills++;
                                if (e.type === 'boss' || e.isElite) goldenCubes.push(new GoldenCube(e.x + 20, e.y));
                                spawnEnemyDeathDrops(e.x, e.y, e.type === 'boss', e.isElite || e.isOverclocked);
                                if (player && player.hasVampiricOvercharge && player.overchargeActive) { player.overchargeTimer = Math.min(8500, player.overchargeTimer + 1500); if (Math.random() < 0.4) goldenCubes.push(new GoldenCube(e.x, e.y)); }
                                checkAchievements(survivalSeconds, sessionKills, metaCurrency, currentWave);
                                let index = enemies.indexOf(e); if (index > -1) enemies.splice(index, 1);
                                combo++; comboTimer = 4000; score += ((e.type === 'boss') ? 2200 : 550) * combo;
                            }
                        }
                    }
                    if (pb.x < 0 || pb.x > WORLD_W || pb.y < 0 || pb.y > WORLD_H) { pb.releaseRicochetSlot(); let recycledPb = playerBullets.splice(i, 1)[0]; if (recycledPb && playerBulletPool.length < 400) playerBulletPool.push(recycledPb); }
                    continue;
                }

                let nearbyEnemies = getNearbyEnemies(pb.x, pb.y);
                for (let j = 0; j < nearbyEnemies.length; j++) {
                    let e = nearbyEnemies[j];
                    if (e && !e.isDead && distSq(pb.x, pb.y, e.x, e.y) < (pb.radius + e.radius)**2) {
                        let protectedByDrone = false;
                        if (e.type !== 'drone') { let activeDrone = enemies.find(d => d && !d.isDead && d.type === 'drone'); if (activeDrone) protectedByDrone = true; }
                        if (protectedByDrone) { createExplosion(pb.x, pb.y, '#00ffcc', 3, 2); hitEnemy = true; break; }

                        // --- بداية كود صد الطلقات للعدو "العاكس" ---
                        if (e.type === 'mirror') {
                            let angleFromEnemyToBullet = Math.atan2(pb.y - e.y, pb.x - e.x);
                            let mFacing = (e.vx !== 0 || e.vy !== 0) ? Math.atan2(e.vy, e.vx) : 0;
                            let angleDiff = Math.abs(angleFromEnemyToBullet - mFacing);
                            while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);
                            
                            // إذا ضربت الطلقة الواجهة المباشرة للعاكس
                            if (angleDiff < 0.6) { 
                                playSound('parry');
                                createExplosion(pb.x, pb.y, colors.enemyMirror, 8, 5);
                                let reflectAngle = Math.atan2(-pb.vy, -pb.vx);
                                spawnEnemyBullet(pb.x, pb.y, reflectAngle, pb.speed * 1.1, e, '#00f3ff');
                                hitEnemy = true; 
                                break;
                            }
                        }
                        // --- نهاية كود العاكس ---

                        hitEnemy = true; let finalDmg = pb.damage;
                        if (e.affix === 'shielded') {
                            let angleFromEnemyToBullet = Math.atan2(pb.y - e.y, pb.x - e.x);
                            let sAng = e.shieldAngle || 0;
                            let diff = Math.abs(angleFromEnemyToBullet - sAng);
                            while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);

                            // فقط إذا أصابت الرصاصة قوس الدرع الدوار (120 درجة) يتم صدها، أما بقية الـ 240 درجة فتتلقى الضرر الكامل
                            if (diff < Math.PI / 3) {
                                createExplosion(pb.x, pb.y, '#00f3ff', 8, 4);
                                playSound('parry');
                                spawnFloatingText(e.x, e.y - 25, ' BLOCKED', '#00f3ff');
                                pb.releaseRicochetSlot();
                                let recycledPb = playerBullets.splice(i, 1)[0];
                                if (recycledPb && playerBulletPool.length < 400) playerBulletPool.push(recycledPb);
                                continue;
                            }
                        }
                        if (isReconActive) finalDmg *= 1.25; // +25% Recon vulnerability bonus
                        if (activeTacticalZone && activeTacticalZone.type === 'cryo' && distSq(e.x, e.y, activeTacticalZone.x, activeTacticalZone.y) < activeTacticalZone.radius**2) {
                            finalDmg *= 2.0; // إضعاف دفاعي داخل حقل التجميد
                        }
                        if (activeTacticalZone && activeTacticalZone.type === 'berserk' && player && distSq(player.x, player.y, activeTacticalZone.x, activeTacticalZone.y) < activeTacticalZone.radius**2) {
                            finalDmg *= 3.0; // نيران فائقة وضرر مضاعف 3x داخل حقل الهيجان
                        }
                        if (e.type === 'juggernaut') {
                            let angleToBullet = Math.atan2(pb.y - e.y, pb.x - e.x), lookAngle = player ? Math.atan2(player.y - e.y, player.x - e.x) : 0;
                            let angleDiff = Math.abs(angleToBullet - lookAngle);
                            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                            if (angleDiff < 1.3) finalDmg *= 0.5; // Frontal armor reduction
                        }
                        if (e.type === 'boss') {
                            let angleToBullet = Math.atan2(pb.y - e.y, pb.x - e.x), angleDiff = Math.abs(angleToBullet - e.weakpointAngle);
                            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                            if (angleDiff < 0.45) {
                                finalDmg *= 2.0; 
                                if (e.staggerImmunityTimer <= 0) {
                                    e.staggerMeter += 2.5; 
                                    if (e.staggerMeter >= (e.maxStagger || 20) && !e.isStaggered) { 
                                        e.isStaggered = true; 
                                        e.staggerTimer = 800; 
                                        e.staggerMeter = 0; 
                                        e.staggerImmunityTimer = 6000;
                                        triggerShockwave(e.x, e.y, '#00f3ff', 220); 
                                        spawnFloatingText(e.x, e.y - 50, ' BOSS STAGGERED! ', '#ffd700'); 
                                    }
                                }
                                spawnFloatingText(e.x, e.y - 35, ' WEAKPOINT CRIT! ', '#00f3ff'); playSound('parry');
                            }
                        }
                        if (player && player.evolution === 'frost') e.speed *= 0.85;
                        e.health -= finalDmg; e.hitFlashTimer = 90; createExplosion(pb.x, pb.y, colors.playerBullet, 5, 4);
                        if (e.health <= 0 && !e.isDead) {
                            e.isDead = true; 
                            metaCurrency += (e.type === 'boss' ? 50 : (e.isElite ? 3 : 1));
                            createExplosion(e.x, e.y, e.color, 22, 10); 
                            hitStopDuration = (e.type === 'boss') ? 150 : 50; 
                            if (e.type === 'splitter') {
                                enemies.push(new Enemy('micro_splitter', 1, false, e.x - 15, e.y - 15));
                                enemies.push(new Enemy('micro_splitter', 1, false, e.x + 15, e.y + 15));
                            }
                            if (e.type === 'volatile') {
                                toxicPools.push(new ToxicPool(e.x, e.y));
                            }
                            if (e.isOverclocked) {
                                triggerShockwave(e.x, e.y, '#ff00aa', 100);
                                playSound('tesla');
                            }
                            if (player) { player.nanites = Math.min(player.maxNanites, player.nanites + (e.isOverclocked ? 4 : (e.isElite ? 3 : 1))); renderPerksHUD(); }
                            let dropCubes = (e.type === 'boss') ? 16 : (e.isOverclocked ? 8 : (e.isElite ? 6 : 2));
                            sessionCubes += dropCubes; sessionXP += (e.type === 'boss') ? 150 : (e.isOverclocked ? 90 : (e.isElite ? 60 : 25)); sessionKills++;
                            if (e.type === 'boss' || e.isElite) goldenCubes.push(new GoldenCube(e.x + 20, e.y));
                            spawnEnemyDeathDrops(e.x, e.y, e.type === 'boss', e.isElite || e.isOverclocked);
                            if (player && player.hasVampiricOvercharge && player.overchargeActive) { player.overchargeTimer = Math.min(8500, player.overchargeTimer + 1500); if (Math.random() < 0.4) goldenCubes.push(new GoldenCube(e.x, e.y)); }
                            checkAchievements(survivalSeconds, sessionKills, metaCurrency, currentWave);
                            let index = enemies.indexOf(e); if (index > -1) enemies.splice(index, 1);
                            combo++; comboTimer = 4000; score += ((e.type === 'boss') ? 2200 : 550) * combo;
                        }
                        break;
                    }
                }

                // فحص إصابة اللاعب المحلي بطلقات المنافسين في نمط الساحة (PVP Remote Bullet vs Local Player)
                if (activeGameMode === 'online_pvp' && pb.isRemote && !isGameOver && player) {
                    if (distSq(pb.x, pb.y, player.x, player.y) < (player.radius + pb.radius + 3)**2) {
                        createExplosion(player.x, player.y, '#ff0055', 20, 10);
                        let isFatal = player.takeHit(pb);
                        spawnFloatingText(player.x, player.y - 30, `-1 HP [ضرر منافس]`, '#ff0055');
                        playSound('explosion');
                        if (isFatal) {
                            triggerGameOver();
                            if (socket && isSocketConnected) {
                                socket.emit('pvp_player_eliminated', { killerName: 'Rival Agent' });
                            }
                        }
                        pb.releaseRicochetSlot();
                        let recycledPb = playerBullets.splice(i, 1)[0];
                        if (recycledPb && playerBulletPool.length < 400) playerBulletPool.push(recycledPb);
                        continue;
                    }
                }

                // إصابة اللاعبين الآخرين بطلقات اللاعب المحلي في نمط الساحة (Local Bullet vs Remote Players)
                if (!hitEnemy && activeGameMode === 'online_pvp' && !pb.isRemote) {
                    for (let [rId, rp] of remotePlayers.entries()) {
                        if (rp && distSq(pb.x, pb.y, rp.x, rp.y) < (rp.radius || 20)**2) {
                            let pvpDmg = pb.damage * 10;
                            rp.health = Math.max(0, (rp.health || 100) - pvpDmg);
                            createExplosion(rp.x, rp.y, '#ff00ea', 14, 6);
                            spawnFloatingText(rp.x, rp.y - 25, `-${Math.round(pvpDmg)}`, '#ff00ea');
                            if (socket && isSocketConnected) {
                                socket.emit('pvp_damage_dealt', {
                                    targetId: rId,
                                    damage: pvpDmg,
                                    weapon: player ? player.weapon : 'blaster',
                                    x: rp.x,
                                    y: rp.y
                                });
                            }
                            hitEnemy = true;
                            break;
                        }
                    }
                }

                if (!hitEnemy) {
                    for (let pr of plasmaRifts) {
                        if (pr && !pr.isDead && distSq(pb.x, pb.y, pr.x, pr.y) < (pr.radius + pb.radius + 6)**2) {
                            pr.takeHit(pb.damage || 1);
                            hitEnemy = true;
                            break;
                        }
                    }
                }

                if (hitEnemy || pb.x < 0 || pb.x > WORLD_W || pb.y < 0 || pb.y > WORLD_H) { pb.releaseRicochetSlot(); let recycledPb = playerBullets.splice(i, 1)[0]; if (recycledPb && playerBulletPool.length < 400) playerBulletPool.push(recycledPb); }
            }
            
            for (let i = energyCubes.length - 1; i >= 0; i--) {
                let c = energyCubes[i]; if (!c) { energyCubes.splice(i, 1); continue; }
                c.update(effectiveDelta, frameFactor); if (c.lifeTimer <= 0) { energyCubes.splice(i, 1); continue; }
                if (!isGameOver && player && distSq(player.x, player.y, c.x, c.y) < (player.radius + c.size)**2) {
                    player.addEnergy(25); player.addUltEnergy(15); sessionCubes++; sessionXP += 10; sessionCubesEnergy++;
                    checkAchievements(survivalSeconds, sessionKills, metaCurrency + sessionCubes, currentWave); checkContracts(survivalSeconds, sessionParries, sessionCubesEnergy);
                    playSound('gold'); createExplosion(c.x, c.y, colors.energy, 10, 5); energyCubes.splice(i, 1);
                }
            }

            for (let i = goldenCubes.length - 1; i >= 0; i--) {
                let gc = goldenCubes[i]; if (!gc) { goldenCubes.splice(i, 1); continue; }
                gc.update(effectiveDelta, frameFactor); if (gc.lifeTimer <= 0) { goldenCubes.splice(i, 1); continue; }
                if (!isGameOver && player && distSq(player.x, player.y, gc.x, gc.y) < (player.radius + gc.size)**2) {
                    playSound('gold'); createExplosion(gc.x, gc.y, colors.gold, 30, 15); sessionCubes += 3; sessionXP += 50; sessionCubesEnergy += 2; player.addUltEnergy(30);
                    checkAchievements(survivalSeconds, sessionKills, metaCurrency + sessionCubes, currentWave); checkContracts(survivalSeconds, sessionParries, sessionCubesEnergy);
                    for (let e of enemies) { if (e && !e.isDead) e.stunTimer = 4000; }
                    goldenCubes.splice(i, 1);
                }
            }

            for (let i = ammoDrops.length - 1; i >= 0; i--) {
                let ad = ammoDrops[i]; if (!ad) { ammoDrops.splice(i, 1); continue; }
                ad.update(effectiveDelta, frameFactor);
                if (ad.lifeTimer <= 0) {
                    let recAd = ammoDrops.splice(i, 1)[0];
                    if (recAd && ammoDropPool.length < 50) ammoDropPool.push(recAd);
                }
            }
            
            for (let i = bullets.length - 1; i >= 0; i--) {
                let b = bullets[i]; if (!b) { bullets.splice(i, 1); continue; }
                if (effectiveDelta > 0) b.update(frameFactor);
                let deflected = false;

                // نظام الصد الفوري النشط (Active Parry & Trail Deflect)
                if (player) {
                    let isDashing = player.dashInvulnerableTimer > 0;
                    let parryTriggered = false;
                    let isOnline = isMultiplayerMode();
                    let parryRadius = isDashing ? (isOnline ? 105 : 85) : (isOnline ? 30 : 22);

                    if (isDashing && distSq(player.x, player.y, b.x, b.y) < parryRadius**2) {
                        parryTriggered = true;
                    } else if (player.trail.length > 0) {
                        // فحص آخر 3 نقاط في مسار الذيل للصد الحركي السريع
                        let checkCount = Math.min(3, player.trail.length);
                        for (let tIdx = 0; tIdx < checkCount; tIdx++) {
                            let pt = player.trail[tIdx];
                            if (distSq(pt.x, pt.y, b.x, b.y) < (12 + b.radius)**2) {
                                parryTriggered = true;
                                break;
                            }
                        }
                    }

                    if (parryTriggered) {
                        playSound('parry'); 
                        createExplosion(b.x, b.y, colors.overcharge, 16, 8); 
                        hitStopDuration = 80; 
                        
                        let deflectAngle = Math.atan2(b.y - player.y, b.x - player.x);
                        spawnPlayerBullet(b.x, b.y, deflectAngle, 14.5, 3.2 * player.damageMultiplier, true, false);
                        
                        let recycledB = bullets.splice(i, 1)[0]; 
                        if (recycledB && bulletPool.length < 400) bulletPool.push(recycledB);
                        
                        player.addOvercharge(22); 
                        player.addUltEnergy(25); 
                        sessionXP += 20; 
                        sessionParries++; 
                        combo += 1;
                        comboTimer = 4000;
                        updateBounty('parry', 1);
                        checkContracts(survivalSeconds, sessionParries, sessionCubesEnergy); 
                        deflected = true;
                    }
                }
                if (deflected) continue;

                // نظام المراوغة الملاصقة (Graze / Adrenaline Surge مع زيادة النطاق بالأونلاين)
                if (!isGameOver && player && !b.grazed) {
                    const isOnline = isMultiplayerMode();
                    const grazeRadius = isOnline ? (player.radius + 34) : (player.radius + 24);
                    const dSqToPlayer = distSq(player.x, player.y, b.x, b.y);
                    if (dSqToPlayer < (grazeRadius)**2 && dSqToPlayer > (player.radius + 2)**2) {
                        b.grazed = true; 
                        player.addEnergy(8); 
                        player.addOvercharge(16); 
                        player.addUltEnergy(12);
                        score += 250; 
                        sessionXP += 8; 
                        sessionGrazes++; 
                        combo += 1;
                        comboTimer = 4000;
                        updateBounty('graze', 1); 
                        createExplosion(b.x, b.y, '#00ffff', 5, 3);
                        spawnFloatingText(player.x, player.y - 20, '+GRAZE!', '#00ffff');
                    }
                }
                
                // فحص تدمير رصاص الأعداء عند ملامسة واحة الملاذ (Sanctuary)
                if (activeTacticalZone && activeTacticalZone.type === 'sanctuary' && distSq(b.x, b.y, activeTacticalZone.x, activeTacticalZone.y) < activeTacticalZone.radius**2) {
                    createExplosion(b.x, b.y, '#00ff88', 5, 3);
                    let recycledB = bullets.splice(i, 1)[0]; 
                    if (recycledB && bulletPool.length < 400) bulletPool.push(recycledB); 
                    continue;
                }

                if (!isGameOver && player && distSq(player.x, player.y, b.x, b.y) < (player.radius - 2 + b.radius)**2) {
                    combo = 1;
                    if (!player.takeHit(b)) { 
                        let recycledB = bullets.splice(i, 1)[0]; 
                        if (recycledB && bulletPool.length < 400) bulletPool.push(recycledB); 
                        continue; 
                    } else { 
                        triggerGameOver(); 
                        continue; 
                    }
                }
                
                let bulletDestroyed = false, nearbyEnemiesForBullet = getNearbyEnemies(b.x, b.y);
                for(let j = 0; j < nearbyEnemiesForBullet.length; j++) {
                    let e = nearbyEnemiesForBullet[j]; 
                    if (!e || b.owner === e || e.isDead) continue; 
                    if (distSq(b.x, b.y, e.x, e.y) < (b.radius + e.radius)**2) {
                        createExplosion(e.x, e.y, e.color, 15, 8); bulletDestroyed = true; e.health--; e.hitFlashTimer = 90;
                        if (e.health <= 0 && !e.isDead) {
                            e.isDead = true; createExplosion(e.x, e.y, e.color, 20, 10); hitStopDuration = (e.type === 'boss') ? 150 : 50; 
                            if (e.type === 'splitter') {
                                enemies.push(new Enemy('micro_splitter', 1, false, e.x - 15, e.y - 15));
                                enemies.push(new Enemy('micro_splitter', 1, false, e.x + 15, e.y + 15));
                            }
                            if (e.type === 'volatile') {
                                toxicPools.push(new ToxicPool(e.x, e.y));
                            }
                            if (player) { player.nanites = Math.min(player.maxNanites, player.nanites + (e.isElite ? 3 : 1)); renderPerksHUD(); }
                            let dropCubes = (e.type === 'boss') ? 16 : (e.isOverclocked ? 8 : (e.isElite ? 6 : 2));
                            sessionCubes += dropCubes; sessionXP += (e.type === 'boss') ? 150 : (e.isOverclocked ? 90 : (e.isElite ? 60 : 25)); sessionKills++;
                            if (e.type === 'boss' || e.isElite) goldenCubes.push(new GoldenCube(e.x + 20, e.y));
                            spawnEnemyDeathDrops(e.x, e.y, e.type === 'boss', e.isElite || e.isOverclocked);
                            if (player && player.hasVampiricOvercharge && player.overchargeActive) { player.overchargeTimer = Math.min(8500, player.overchargeTimer + 1500); if (Math.random() < 0.4) goldenCubes.push(new GoldenCube(e.x, e.y)); }
                            checkAchievements(survivalSeconds, sessionKills, metaCurrency, currentWave);
                            let index = enemies.indexOf(e); if (index > -1) enemies.splice(index, 1);
                            combo++; comboTimer = 4000; score += ((e.type === 'boss') ? 2200 : 550) * combo;
                        }
                        break; 
                    }
                }
                
                if (bulletDestroyed) { let recycledB = bullets.splice(i, 1)[0]; if (recycledB && bulletPool.length < 400) bulletPool.push(recycledB); continue; }
                if (b.x < -100 || b.x > WORLD_W + 100 || b.y < -100 || b.y > WORLD_H + 100) { let recycledB = bullets.splice(i, 1)[0]; if (recycledB && bulletPool.length < 400) bulletPool.push(recycledB); }
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                let pt = particles[i]; if (!pt) { particles.splice(i, 1); continue; }
                if (effectiveDelta > 0) pt.update(frameFactor); 
                if (pt.life <= 0) { let p = particles.splice(i, 1)[0]; if (p && particlePool.length < 300) particlePool.push(p); }
            }

            for (let i = floatingTexts.length - 1; i >= 0; i--) {
                let ft = floatingTexts[i]; if (!ft) { floatingTexts.splice(i, 1); continue; }
                if (effectiveDelta > 0) ft.update(frameFactor);
                if (ft.life <= 0) { let recycledFt = floatingTexts.splice(i, 1)[0]; if (recycledFt && floatingTextPool.length < 50) floatingTextPool.push(recycledFt); }
            }

            let currentBgColor = colors.bg, currentGridColor = colors.grid;
            if (currentWave >= 15) { currentBgColor = '#0b0207'; currentGridColor = 'rgba(255, 42, 95, 0.08)'; }
            else if (currentWave >= 5) { currentBgColor = '#05020c'; currentGridColor = 'rgba(189, 0, 255, 0.07)'; }
            else { currentBgColor = '#02050b'; currentGridColor = 'rgba(0, 243, 255, 0.06)'; }

            ctx.fillStyle = currentBgColor; ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.scale(cameraZoom, cameraZoom);
            
            if (screenShakeTime > 0 && gameSettings.shake) {
                let decayRatio = Math.min(1.0, screenShakeTime / 450);
                let shakeMag = decayRatio * decayRatio * 8.5;
                let shakeAngle = performance.now() * 0.045;
                let sx = Math.sin(shakeAngle * 1.3) * shakeMag;
                let sy = Math.cos(shakeAngle * 1.7) * shakeMag;
                ctx.translate(sx, sy);
                screenShakeTime -= delta;
            }
            
            ctx.translate(-camX, -camY);

            // 1. الفضاء الكوني والسدم النجمية المضيئة
            drawParallaxSpaceBackground(camX, camY, viewW, viewH);

            // 2. مصفوفة الشبكة السيبرانية التكتيكية والقطاعات المضيئة
            drawCyberTacticalGrid(camX, camY, viewW, viewH, performance.now(), currentGridColor);

            // جدار الحاجز الليزري المحيطي ومولدات الطاقة في الزوايا
            drawArenaPerimeterAndPylons(camX, camY, viewW, viewH, performance.now());

            for (let wall of arenaLaserWalls) {
                ctx.save(); wall.pulseTimer += delta; let alpha = Math.sin(wall.pulseTimer * 0.005) * 0.2 + 0.6;
                ctx.strokeStyle = `rgba(255, 0, 85, ${alpha})`; ctx.lineWidth = 3; ctx.setLineDash([12, 6]); ctx.strokeRect(wall.x, wall.y, wall.w, wall.h); ctx.restore();
            }

            for (let tr of temporalRifts) {
                ctx.save(); ctx.beginPath(); ctx.arc(tr.x, tr.y, Math.max(0.1, tr.radius), 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 243, 255, 0.08)'; ctx.fill(); ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.8; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.restore();
            }

            for (let sw of shockwaves) if (sw && !sw.isDead) sw.draw();

            if (blackHoleSingularity) {
                ctx.save(); ctx.beginPath(); ctx.arc(blackHoleSingularity.x, blackHoleSingularity.y, Math.max(0.1, 48 + Math.sin(performance.now() * 0.005) * 8), 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill(); ctx.strokeStyle = '#ff00ea'; ctx.lineWidth = 3; ctx.stroke();
                ctx.beginPath(); ctx.arc(blackHoleSingularity.x, blackHoleSingularity.y, Math.max(0.1, blackHoleSingularity.radius), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 0, 234, 0.15)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 10]); ctx.stroke(); ctx.restore();
            }

            for (let hz of hazardLaserZones) {
                ctx.save(); ctx.beginPath(); ctx.arc(hz.x, hz.y, Math.max(0.1, hz.radius), 0, Math.PI * 2); let pulseAlpha = Math.max(0.1, 1 - (hz.timer / 2000));
                ctx.fillStyle = `rgba(255, 42, 95, ${pulseAlpha * 0.3})`; ctx.fill(); ctx.strokeStyle = colors.enemySniper; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.restore();
            }

            for (let i = teslaRenderArcs.length - 1; i >= 0; i--) {
                let arc = teslaRenderArcs[i];
                ctx.save(); ctx.strokeStyle = `rgba(0, 243, 255, ${arc.alpha})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(arc.x1, arc.y1);
                let midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 20, midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 20;
                ctx.lineTo(midX, midY); ctx.lineTo(arc.x2, arc.y2); ctx.stroke(); ctx.restore();
                arc.alpha -= 0.15 * frameFactor; if (arc.alpha <= 0) teslaRenderArcs.splice(i, 1);
            }

            for (let i = enemyTimeBubbles.length - 1; i >= 0; i--) {
                let b = enemyTimeBubbles[i];
                if (effectiveDelta > 0) b.update(effectiveDelta, frameFactor);
                if (b.isDead) { enemyTimeBubbles.splice(i, 1); } else { b.draw(); }
            }
            for (let i = mortarWarnings.length - 1; i >= 0; i--) {
                let m = mortarWarnings[i];
                if (effectiveDelta > 0) m.update(effectiveDelta);
                if (m.isDead) { mortarWarnings.splice(i, 1); } else { m.draw(); }
            }
            for (let i = toxicPools.length - 1; i >= 0; i--) {
                let t = toxicPools[i];
                if (effectiveDelta > 0) t.update(effectiveDelta);
                if (t.isDead) { toxicPools.splice(i, 1); } else { t.draw(); }
            }

            // تأثير تشويش الشاشة (Glitch) عند اختراق المركبة
            if (player && player.hackedTimer > 0) {
                ctx.save(); ctx.fillStyle = `rgba(5, 150, 105, ${Math.random() * 0.12})`; ctx.fillRect(camX, camY, width, height); ctx.restore();
            }
            for (let pr of plasmaRifts) if (pr) pr.draw();
            for (let z of tacticalZones) if (z && !z.isDead) z.draw();
            drawActiveTimeAnomalies(ctx, camX, camY);
            for (let p of portals) if (p) p.draw();
            for (let c of energyCubes) if (c) c.draw();
            for (let gc of goldenCubes) if (gc) gc.draw();
            for (let ad of ammoDrops) if (ad) ad.draw();
            for (let m of playerMines) if (m && !m.isDead) m.draw();
            for (let e of enemies) if (e && !e.isDead) e.draw();
            for (let b of bullets) if (b) b.draw();
            for (let pb of playerBullets) if (pb) pb.draw();
            for (let pt of particles) if (pt) pt.draw();
            updateAndDrawShockwaves(effectiveDelta, frameFactor);
            updateAndDrawMuzzleFlashes(effectiveDelta);
            for (let ft of floatingTexts) if (ft) ft.draw();
            if (isMultiplayerMode()) {
                drawAndInterpolateRemotePlayers(frameFactor);
            }
            if (!isGameOver && player) player.draw();
            pollGamepadInput();

            ctx.restore();
            drawTacticalMinimap();

            if (!isGameOver) updateVitalsAndAmmoHUD();

            if (isTacticalMapOpen) {
                updateTacticalMapData();
                drawExpandedTacticalMap();
            }

            // مؤشر تحذيري فقط للزعماء الكبار عند خروجهم عن الشاشة (دون أي مشتتات للأعداء العاديين أو الواحات)
            for (let e of enemies) { 
                if (e && !e.isDead && e.type === 'boss') {
                    let isOff = (e.x < camX || e.x > camX + width || e.y < camY || e.y > camY + height);
                    if (isOff) {
                        drawOffScreenArrow(e.x, e.y, colors.enemyBoss, ` ${e.name || 'زعيم'}`);
                    }
                }
            }

            // توجيه وتدوير جويستك الرماية بانسيابية مع موضع الماوس
            if (joystickAimThumb && !isAimJoystickActive && hasMouseMoved && player && !isGameOver) {
                let targetAng = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
                let thumbDist = isMouseDown ? 28 : 20;
                let thumbX = Math.cos(targetAng) * thumbDist;
                let thumbY = Math.sin(targetAng) * thumbDist;
                joystickAimThumb.style.transition = 'none';
                joystickAimThumb.style.transform = `translate3d(${thumbX}px, ${thumbY}px, 0) rotate(${targetAng + Math.PI/2}rad)`;
            }

            gameLoopId = requestAnimationFrame(loop);
            } catch (loopErr) {
                console.error('[Engine Auto-Recovery] Caught frame error:', loopErr);
                gameLoopId = requestAnimationFrame(loop);
            }
        }

        function drawOffScreenArrow(targetX, targetY, color, label) {
            let cx = width / 2, cy = height / 2, angle = Math.atan2(targetY - (camY + cy), targetX - (camX + cx));
            let x = cx + Math.cos(angle) * (Math.min(width, height) / 2 - 40), y = cy + Math.sin(angle) * (Math.min(width, height) / 2 - 40);
            ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 8); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
            ctx.save(); ctx.fillStyle = color; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, x + Math.cos(angle) * 15, y + Math.sin(angle) * 15 + 4); ctx.restore();
        }

        updateArsenalUI();
        updateSettingsUI();
        renderPerksMatrixUI();
        updatePlayerRankCardUI();
        
        // تهيئة لغة التطبيق الافتراضية
        setAppLanguage(currentLanguage);
        updateGoogleUI();

switchTab('play');

        // تهيئة حقل اسم العميل التكتيكي والاتصال التلقائي بوجود Socket.IO
        const usernameInputEl = document.getElementById('player-username-input');
        if (usernameInputEl) {
            usernameInputEl.value = tacticalUsername;
            usernameInputEl.addEventListener('input', updateTacticalUsernameFromInput);
        }

        if (typeof io !== 'undefined') {
            initMultiplayerSocket(true);
        } else {
            const tag = document.getElementById('player-status-tag');
            if (tag) { tag.innerText = ' وضع اللعب المستقل (Offline)'; tag.style.color = '#00f3ff'; }
        }

        // تحريك مستمر ونابض للمعاينة الهولوغرامية بالترسانة في القائمة الرئيسية
        setInterval(() => {
            if (mainMenu && mainMenu.style.display !== 'none' && currentTabIdx === 1) {
                renderArsenalPreviewCanvas();
            }
        }, 50);


// Wire up automatic UI audio feedback on all buttons and tabs
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button, .mode-card, .tab-btn').forEach(el => {
        el.addEventListener('mouseenter', () => playSound('ui_hover'), { passive: true });
        el.addEventListener('click', () => playSound('ui_click'), { passive: true });
    });
});
