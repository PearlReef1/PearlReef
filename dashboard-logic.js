const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allFish = [];
let isProcessingFeeding = false;
let hookPos = 0;
let targetPos = 50;
let progress = 0;
let fishingInterval = null; // Variable global para controlar el cierre real
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";

// --- CONFIGURACIÓN ECONOMÍA HÍBRIDA ---
const FEED_COOLDOWN_MS = 12 * 60 * 60 * 1000; 
const MAX_HUNGER_UNITS = 2; 

// Tipos de comida con sus nuevos valores de XP y Precios
const FOOD_TYPES = {
    plancton: { col: 'food_plancton', xp: 2, price: 20, qty: 10, icon: '🦠' },
    basic: { col: 'food_basic', xp: 7, price: 50, qty: 10, icon: '🌿' },
    rare: { col: 'food_rare', xp: 25, price: 250, qty: 5, icon: '🦐' }
};

// Producción ajustada para ROI de 24-30 días
const YIELD_CONFIG = {
    'Comun': 45,
    'Poco Comun': 55,
    'Raro': 110,
    'Legendario': 250,
    'Mitico': 500
};

const AQUARIUM_BG_IMG = 'fondo_acuario.jpg';

window.onload = async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;
    
    await loadProfile();
    await initAquarium();
    
    setInterval(updateAquariumState, 1000);
};

async function loadProfile() {
    const { data, error } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    if (error) return;
    
    if (data) {
        document.getElementById('pearl-balance').innerText = Math.floor(data.pearls_balance) || 0;
        document.getElementById('user-name').innerText = data.username || "Jugador";
        
        // Actualizar contadores de comida
        if (document.getElementById('food-plancton-count')) 
            document.getElementById('food-plancton-count').innerText = data.food_plancton || 0;
        if (document.getElementById('food-basic-count')) 
            document.getElementById('food-basic-count').innerText = data.food_basic || 0;
        if (document.getElementById('food-rare-count')) 
            document.getElementById('food-rare-count').innerText = data.food_rare || 0;
        
        // NUEVO: Actualizar contador de restos marinos
        if (document.getElementById('marine-trash-count'))
            document.getElementById('marine-trash-count').innerText = data.marine_trash || 0;
    }
}

async function initAquarium() {
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data || [];
    
    const container = document.getElementById('aquarium-bg');
    if (container) {
        container.innerHTML = ''; 
        container.style.backgroundImage = `url('${RAW_BASE}${AQUARIUM_BG_IMG}')`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';

        allFish.forEach(fish => {
            if (!fish.is_egg) createSwimmingFish(fish);
        });
    }
}

function createSwimmingFish(fish) {
    const fishGroup = document.createElement('div');
    fishGroup.className = 'fish-container';
    fishGroup.id = `fish-${fish.id}`;
    
    const rarityClass = fish.rarity.toLowerCase().replace(/\s+/g, '-');
    const rarityAsset = fish.rarity.toLowerCase().replace(/\s+/g, '_');
    
    fishGroup.innerHTML = `
        <div class="fish-label">
            <span class="f-id">#${fish.id.substring(0, 4)}</span>
            <span class="f-rarity rarity-text-${rarityClass}">${fish.rarity}</span>
        </div>
        <img src="${RAW_BASE}pez_${rarityAsset}.png" class="fish-img">
    `;
    
    const startX = Math.random() * 70 + 10;
    const startY = Math.random() * 50 + 20;
    fishGroup.style.left = startX + "vw";
    fishGroup.style.top = startY + "vh";
    
    document.getElementById('aquarium-bg').appendChild(fishGroup);
    setTimeout(() => moveFishRandomly(fishGroup), 100);
}

function moveFishRandomly(element) {
    if (!element) return;
    const targetX = Math.random() * 75 + 10; 
    const targetY = Math.random() * 55 + 15; 
    const img = element.querySelector('.fish-img');
    
    if (img) {
        const rect = element.getBoundingClientRect();
        const currentXPercent = (rect.left / window.innerWidth) * 100;
        img.style.transform = targetX > currentXPercent ? "scaleX(1)" : "scaleX(-1)";
    }
    
    element.style.left = targetX + "vw";
    element.style.top = targetY + "vh";
    setTimeout(() => moveFishRandomly(element), 8000);
}

function switchTab(tab, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const panel = document.getElementById('content-panel');
    const body = document.getElementById('panel-body');
    const title = document.getElementById('panel-title');

    if (tab === 'acuario') { panel.style.display = 'none'; return; }

    panel.style.display = 'flex';
    title.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);

    if (tab === 'inventario') renderInventory(body);
    if (tab === 'tienda') renderShop(body);
}

function renderInventory(container) {
    const now = new Date();
    let totalDailyProd = 0;
    let totalPendingClaim = 0;
    let hungryFishCount = 0;

    // Definimos el icono de la perla para reusarlo
    const PRL_ICON_SMALL = `<img src="https://github.com/PearlReef1/PearlReef/blob/main/assets/perla_economia.png?raw=true" style="width:12px; height:12px; vertical-align:middle; margin-right:2px;">`;

    allFish.forEach(f => {
        if (!f.is_egg) {
            const levelBonus = 1 + ((Math.min(f.level, 5) - 1) * 0.05);
            const currentYield = f.daily_yield * levelBonus;
            const msSinceFed = now - new Date(f.last_fed || 0);
            
            if (msSinceFed < (24 * 60 * 60 * 1000)) {
                totalDailyProd += currentYield;
            } else {
                hungryFishCount++;
            }
            totalPendingClaim += Number(f.accumulated_pearls || 0);
        }
    });

    container.innerHTML = `
        <div style="background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
            <div>
                <small style="color: #64748b; font-size: 0.65rem; display: block; text-transform: uppercase;">Prod / Día</small>
                <strong style="color: #2ecc71; font-size: 0.9rem;">${PRL_ICON_SMALL} ${totalDailyProd.toFixed(0)}</strong>
            </div>
            <div style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                <small style="color: #64748b; font-size: 0.65rem; display: block; text-transform: uppercase;">Por Recoger</small>
                <strong style="color: #3b82f6; font-size: 0.9rem;">${PRL_ICON_SMALL} ${totalPendingClaim.toFixed(2)}</strong>
            </div>
            <div>
                <small style="color: #64748b; font-size: 0.65rem; display: block; text-transform: uppercase;">Hambre</small>
                <strong style="color: ${hungryFishCount > 0 ? '#e63946' : '#2ecc71'}; font-size: 0.9rem;">🐟 ${hungryFishCount}</strong>
            </div>
        </div>
    `;

    allFish.forEach(fish => {
        const div = document.createElement('div');
        div.className = 'mini-card';
        div.style = "background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
        
        const rarityKey = fish.rarity.toLowerCase().replace(/\s+/g, '_');
        const rarityClass = fish.rarity.toLowerCase().replace(/\s+/g, '-');
        
        if (fish.is_egg) {
            renderEggRow(div, fish, now);
        } else {
            const lastFed = new Date(fish.last_fed || 0);
            const msSinceFed = now - lastFed;
            const maxReservaMs = 24 * 60 * 60 * 1000;
            
            let hungerUnits = 0;
            if (msSinceFed < 12 * 60 * 60 * 1000) hungerUnits = 2;
            else if (msSinceFed < 24 * 60 * 60 * 1000) hungerUnits = 1;

            const isProducing = hungerUnits > 0;
            const isMaxLevel = fish.level >= 5;
            const levelBonus = 1 + ((Math.min(fish.level, 5) - 1) * 0.05);
            const currentYield = (fish.daily_yield * levelBonus).toFixed(2);
            
            const currentXP = fish.current_xp || 0;
            const nextXP = fish.next_level_xp || 100;
            const xpPercent = isMaxLevel ? 100 : Math.min((currentXP / nextXP) * 100, 100);
            const xpColor = isMaxLevel ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #a855f7, #d946ef)';

            div.innerHTML = `
                <div style="text-align: center; position: relative; min-width: 70px;">
                    <div style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); background: #334155; color: white; font-size: 0.55rem; padding: 2px 6px; border-radius: 4px; font-family: monospace; z-index: 2; border: 1px solid rgba(255,255,255,0.2);">
                        #${fish.id.toString().slice(0, 4)}
                    </div>
                    <img src="${RAW_BASE}pez_${rarityKey}.png" style="width:60px; height:60px; object-fit:contain; filter: ${!isProducing ? 'grayscale(1)' : 'none'};">
                </div>
                
                <div style="flex-grow:1; min-width: 0;">
                    <div style="display: flex; flex-direction: column; margin-bottom: 4px;">
                        <strong class="rarity-text-${rarityClass}" style="font-size: 0.9rem;">${fish.rarity}</strong>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.75rem; color: ${isMaxLevel ? '#f59e0b' : '#64748b'}; font-weight: bold;">
                                Nivel ${fish.level} ${isMaxLevel ? '(MAX)' : ''}
                            </span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${isProducing ? '#2ecc71' : '#e63946'};"></div>
                                <span style="font-size: 0.6rem; color: ${isProducing ? '#2ecc71' : '#e63946'}; font-weight: bold;">${isProducing ? 'PRODUCIENDO' : 'HAMBRIENTO'}</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-bottom: 2px;">
                        <span style="font-size: 0.55rem; color: #94a3b8; font-weight: bold;">
                            ${isMaxLevel ? 'MAX' : `${currentXP} / ${nextXP} XP`}
                        </span>
                    </div>
                    <div style="width: 100%; height: 5px; background: #f1f5f9; border-radius: 4px; margin-bottom: 8px; overflow: hidden; border: 1px solid #e2e8f0; position: relative;">
                        <div style="width: ${xpPercent}%; height: 100%; background: ${xpColor}; transition: width 0.5s;"></div>
                    </div>

                    <div style="font-size: 0.75rem; color: #475569; margin-bottom: 6px;">
                        Prod: <strong style="color: #1e293b;">${PRL_ICON_SMALL} ${currentYield}</strong>
                    </div>

                    <div style="display: flex; gap: 4px; margin-bottom: 8px; align-items: center;">
                        <small style="font-size: 0.55rem; color: #94a3b8; font-weight: bold;">HAMBRE</small>
                        <div style="flex-grow: 1; height: 7px; background: #f1f5f9; border-radius: 10px; overflow: hidden; display: flex; gap: 2px; border: 1px solid #e2e8f0;">
                            <div style="flex: 1; background: ${hungerUnits >= 1 ? '#3b82f6' : 'transparent'}; transition: background 0.3s;"></div>
                            <div style="flex: 1; background: ${hungerUnits >= 2 ? '#3b82f6' : 'transparent'}; transition: background 0.3s;"></div>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 6px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #f1f5f9;">
                         <div style="display: flex; flex-direction: column;">
                            <small style="font-size: 0.5rem; color: #64748b; text-transform: uppercase;">Acumulado</small>
                            <strong style="font-size: 0.8rem; color: #0f172a;">${PRL_ICON_SMALL} ${Number(fish.accumulated_pearls).toFixed(2)}</strong>
                         </div>
                         <div style="display: flex; flex-direction: column; text-align: right;">
                            <small style="font-size: 0.5rem; color: #64748b; text-transform: uppercase;">Total Vida</small>
                            <strong style="font-size: 0.8rem; color: #64748b;">✨ ${Number(fish.total_generated || 0).toFixed(0)}</strong>
                         </div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px; min-width:105px;">
                    <button class="btn-buy" style="background:#2ecc71; color:white; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.65rem; box-shadow: 0 2px 0 #1a9e5a;" onclick="claimPearls('${fish.id}')">RECOLECTAR</button>
                    
                    <button class="btn-feed-mini" style="background:#1e3a8a; color:white; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.65rem; box-shadow: 0 2px 0 #0f1d45; display: ${hungerUnits < 2 ? 'block' : 'none'};" onclick="startFeeding('${fish.id}')">ALIMENTAR</button>
                    
                    <div style="font-size:0.55rem; text-align:center; color:#64748b; padding:6px; border:1px dashed #cbd5e1; border-radius:6px; background: #fdfdfd; display: ${hungerUnits >= 1 ? 'block' : 'none'};">
                        Satisfecho<br>
                        <span style="font-weight: bold; color: #1e293b;">${formatTime((lastFed.getTime() + maxReservaMs) - now)}</span>
                    </div>
                </div>
            `;
        }
        container.appendChild(div);
    });
}
function renderEggRow(container, fish, now) {
    const hatchTime = new Date(fish.egg_hatch_time);
    const msLeft = hatchTime - now;
    const isReady = msLeft <= 0;

    container.innerHTML = `
        <div style="text-align: center; min-width: 70px;">
            <img src="${RAW_BASE}pez_huevo.png" style="width:50px; height:50px; object-fit:contain;">
        </div>
        <div style="flex-grow:1;">
            <strong style="color: #64748b;">Huevo ${fish.rarity}</strong>
            <div style="font-size: 0.75rem; color: #94a3b8;">
                ${isReady ? '¡Listo para eclosionar!' : `Eclosiona en: ${formatTime(msLeft)}`}
            </div>
        </div>
        <button class="btn-buy" style="background: ${isReady ? '#f59e0b' : '#cbd5e1'}; color:white; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor: ${isReady ? 'pointer' : 'default'};" ${isReady ? `onclick="hatchFish('${fish.id}')"` : ''}>
            ${isReady ? 'ABRIR' : 'ESPERANDO'}
        </button>
    `;
}

function formatTime(ms) {
    if (ms < 0) return "0s";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    return `${h}h ${m}m ${seg}s`;
}

async function hatchFish(fishId) {
    const { error } = await client.from('user_fish').update({ is_egg: false }).eq('id', fishId);
    if (!error) {
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        await initAquarium();
        renderInventory(document.getElementById('panel-body'));
    }
}

async function startFeeding(fishId) {
    if (isProcessingFeeding) return; 
    const { data: profile } = await client.from('profiles').select('*').eq('id', currentUser.id).single();

    // Validar si tiene alguna comida
    if ((profile.food_plancton || 0) <= 0 && (profile.food_basic || 0) <= 0 && (profile.food_rare || 0) <= 0) {
        alert("¡No tienes comida! Ve a la tienda.");
        switchTab('tienda', document.querySelector('[onclick*="tienda"]'));
        return;
    }

    sessionStorage.setItem('feeding_fish_id', fishId);
    
    // Cambiamos el contenido del modal para que sea un selector
    const modal = document.getElementById('minigame-modal');
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 15px; text-align: center; max-width: 300px; width: 90%;">
            <h3 style="margin-top:0; color:#1e3a8a;">¿Qué vas a dar de comer?</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${profile.food_plancton > 0 ? `<button class="btn-buy" onclick="completeFeeding('plancton')" style="background:#4ade80; color:white;">🦠 Plancton (${profile.food_plancton})</button>` : ''}
                ${profile.food_basic > 0 ? `<button class="btn-buy" onclick="completeFeeding('basic')" style="background:#3b82f6; color:white;">🌿 Algas (${profile.food_basic})</button>` : ''}
                ${profile.food_rare > 0 ? `<button class="btn-buy" onclick="completeFeeding('rare')" style="background:#a855f7; color:white;">🦐 Cebo (${profile.food_rare})</button>` : ''}
                <button onclick="document.getElementById('minigame-modal').style.display='none'" style="background:none; border:none; color:#64748b; cursor:pointer; margin-top:10px;">Cancelar</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}
async function completeFeeding(foodType) {
    if (isProcessingFeeding) return;
    isProcessingFeeding = true; 

    const fishId = sessionStorage.getItem('feeding_fish_id');
    const { data: profile } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    const { data: fish } = await client.from('user_fish').select('*').eq('id', fishId).single();

    const now = new Date();
    // Determinamos el punto de partida: el tiempo actual o el last_fed si aún tiene vida
    const lastFedDate = fish.last_fed ? new Date(fish.last_fed) : new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    let currentLifeMs = lastFedDate.getTime() + (24 * 60 * 60 * 1000) - now.getTime();
    
    // Si ya tiene 2 barras llenas (24h de reserva), no permitir más
    if (currentLifeMs >= (24 * 60 * 60 * 1000)) {
        alert("El pez ya está lleno.");
        document.getElementById('minigame-modal').style.display = 'none';
        isProcessingFeeding = false;
        return;
    }

    const foodCfg = FOOD_TYPES[foodType];
    
    // 1. Descontar 1 unidad de la comida elegida
    await client.from('profiles').update({ [foodCfg.col]: profile[foodCfg.col] - 1 }).eq('id', currentUser.id);

    // 2. Lógica de Tiempo: Ajustar para que solo sume 12h (1 barra)
    // Si el pez estaba muerto (hace más de 24h que no come), lo revivimos poniéndole 12h de vida desde "ahora"
    let baseTime = lastFedDate.getTime() < (now.getTime() - (24 * 60 * 60 * 1000)) 
                   ? now.getTime() - (12 * 60 * 60 * 1000) 
                   : lastFedDate.getTime();
    
    let newFedDate = new Date(baseTime + (12 * 60 * 60 * 1000));

    // 3. Lógica de XP
    let newXP = (fish.current_xp || 0) + foodCfg.xp;
    let newLevel = fish.level || 1;
    let nextXP = fish.next_level_xp || 100;

    if (newLevel < 5) {
        if (newXP >= nextXP) {
            newLevel++;
            newXP = newXP - nextXP; 
            nextXP = getNextLevelXP(newLevel);
        }
    } else {
        newLevel = 5;
        newXP = 100;
        nextXP = 100;
    }

    // 4. Guardar en Supabase
    await client.from('user_fish').update({ 
        last_fed: newFedDate.toISOString(),
        current_xp: newXP,
        level: newLevel,
        next_level_xp: nextXP
    }).eq('id', fishId);

    // Limpiar y refrescar
    document.getElementById('minigame-modal').style.display = 'none';
    await loadProfile();
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data;
    renderInventory(document.getElementById('panel-body'));
    
    isProcessingFeeding = false; 
}

function getNextLevelXP(currentLevel) {
    const xpRequirements = { 1: 100, 2: 150, 3: 225, 4: 350, 5: 0 };
    return xpRequirements[currentLevel] || 0;
}

function updateAquariumState() {
    const panel = document.getElementById('content-panel');
    const title = document.getElementById('panel-title');
    if (panel && panel.style.display !== 'none' && title.innerText === 'Inventario') {
        renderInventory(document.getElementById('panel-body'));
    }
}

function renderShop(container) {
    // Icono de perla actualizado para coherencia visual
    const PRL_ICON = `<img src="https://github.com/PearlReef1/PearlReef/blob/main/assets/perla_economia.png?raw=true" style="width:16px; height:16px; vertical-align:middle; margin-right:5px;">`;

    container.innerHTML = `
        <div class="shop-wrapper">
            <h4 style="color:var(--primary); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Mercado de Huevos</h4>
            <div class="shop-row eggs-row">
                <!-- Se pasan las URLs directas de los assets proporcionados -->
                ${renderEggCard('Arrecife', '1,000', 'Común (85%) / Poco Común (15%)', '3h', 'https://github.com/PearlReef1/PearlReef/blob/main/assets/huevo_comun.png?raw=true')}
                ${renderEggCard('Abisal', '2,500', 'Raro (80%) / Legendario (20%)', '6h', 'https://github.com/PearlReef1/PearlReef/blob/main/assets/huevo_raro.png?raw=true')}
                ${renderEggCard('Ancestral', '6,000', 'Legendario (90%) / Mítico (10%)', '12h', 'https://github.com/PearlReef1/PearlReef/blob/main/assets/huevo_legendario.png?raw=true')}
            </div>
            
            <h4 style="color:var(--primary); margin:25px 0 15px 0; border-bottom:1px solid #eee; padding-bottom:5px;">Herramientas</h4>
            <div class="shop-row tools-row" style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                <div class="shop-card" style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size:2.5rem;">🎣</div>
                        <div style="text-align: left;">
                            <h5 style="margin:0;">Pack de Cañas (x2)</h5>
                            <p style="font-size:0.75rem; color:#666; margin:2px 0 0 0;">Contiene 2 cañas. Límite diario: 4 sesiones de pesca.</p>
                        </div>
                    </div>
                    <button class="btn-buy" onclick="buyItem('fishing_rods', 15, 2)" style="min-width: 120px;">${PRL_ICON} 15 $PRL</button>
                </div>
            </div>

            <h4 style="color:var(--primary); margin:25px 0 15px 0; border-bottom:1px solid #eee; padding-bottom:5px;">Suministros</h4>
            <div class="shop-row food-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div class="shop-card">
                    <div style="font-size:2rem;">${FOOD_TYPES.plancton.icon}</div>
                    <h5>Plancton (x10)</h5>
                    <p style="font-size:0.75rem; color:#666;">+${FOOD_TYPES.plancton.xp} XP por unidad</p>
                    <button class="btn-buy" onclick="buyFood('plancton', 20, 10)">${PRL_ICON} 20 $PRL</button>
                </div>
                <div class="shop-card">
                    <div style="font-size:2rem;">${FOOD_TYPES.basic.icon}</div>
                    <h5>Pack Algas (x10)</h5>
                    <p style="font-size:0.75rem; color:#666;">+${FOOD_TYPES.basic.xp} XP por unidad</p>
                    <button class="btn-buy" onclick="buyFood('basic', 50, 10)">${PRL_ICON} 50 $PRL</button>
                </div>
                <div class="shop-card">
                    <div style="font-size:2rem;">${FOOD_TYPES.rare.icon}</div>
                    <h5>Cebo Especial (x5)</h5>
                    <p style="font-size:0.75rem; color:#666;">+${FOOD_TYPES.rare.xp} XP por unidad</p>
                    <button class="btn-buy" onclick="buyFood('rare', 250, 5)">${PRL_ICON} 250 $PRL</button>
                </div>
            </div>
        </div>
    `;
}

function renderEggCard(type, price, odds, time, imgUrl) {
    const pValue = price.replace(',', '');
    const PRL_ICON = `<img src="https://github.com/PearlReef1/PearlReef/blob/main/assets/perla_economia.png?raw=true" style="width:14px; height:14px; vertical-align:middle; margin-right:4px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));">`;
    
    return `
        <div class="shop-card">
            <!-- Imagen dinámica según el tipo de huevo -->
            <img src="${imgUrl}" width="60" style="margin-bottom:10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
            <h5>Huevo ${type}</h5>
            <p style="font-size:0.7rem; color:#666; margin-bottom:8px;">${odds}<br>Eclosión: ${time}</p>
            <button class="btn-buy" onclick="buyEgg('${type}', ${pValue})">
                ${PRL_ICON} ${price} $PRL
            </button>
        </div>
    `;
}

async function buyFood(type, cost, quantity) {
    if (isProcessingFeeding) return;
    const { data: profile } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("No tienes suficientes perlas ⚪");

    const col = FOOD_TYPES[type].col;
    await client.from('profiles').update({
        pearls_balance: Number(profile.pearls_balance) - Number(cost),
        [col]: (Number(profile[col]) || 0) + Number(quantity)
    }).eq('id', currentUser.id);

    await loadProfile();
    const body = document.getElementById('panel-body');
    if (body) renderShop(body);
}

async function buyEgg(type, cost) {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("No tienes suficientes perlas ⚪");
    
    let rarity, yieldAmount, hatchHours = 3; 
    const roll = Math.random() * 100;
    
    if (type === 'Arrecife') {
        if (roll < 85) { rarity = 'Comun'; yieldAmount = YIELD_CONFIG['Comun']; }
        else { rarity = 'Poco Comun'; yieldAmount = YIELD_CONFIG['Poco Comun']; }
    } else if (type === 'Abisal') {
        if (roll < 80) { rarity = 'Raro'; yieldAmount = YIELD_CONFIG['Raro']; }
        else { rarity = 'Legendario'; yieldAmount = YIELD_CONFIG['Legendario']; }
        hatchHours = 6;
    } else if (type === 'Ancestral') {
        if (roll < 90) { rarity = 'Legendario'; yieldAmount = YIELD_CONFIG['Legendario']; }
        else { rarity = 'Mitico'; yieldAmount = YIELD_CONFIG['Mitico']; }
        hatchHours = 12;
    }

    const hatchDate = new Date();
    hatchDate.setHours(hatchDate.getHours() + hatchHours);

    await client.from('profiles').update({ pearls_balance: profile.pearls_balance - cost }).eq('id', currentUser.id);
    await client.from('user_fish').insert([{
        user_id: currentUser.id, rarity, daily_yield: yieldAmount, is_egg: true,
        egg_hatch_time: hatchDate.toISOString(), level: 1, current_xp: 0,
        next_level_xp: 100, last_fed: new Date().toISOString(), total_generated: 0
    }]);

    await loadProfile();
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data;
    renderInventory(document.getElementById('panel-body'));
}

async function buyItem(column, price, qty) {
    try {
        // 1. Obtener saldo actual del perfil
        const { data: profile, error: fetchError } = await client.from('profiles')
            .select('pearls_balance, ' + column)
            .eq('id', currentUser.id)
            .single();

        if (fetchError || !profile) {
            alert("Error al verificar tu saldo.");
            return;
        }

        // 2. Verificar si tiene suficiente dinero
        if (profile.pearls_balance < price) {
            alert("❌ No tienes suficientes perlas (PRL).");
            return;
        }

        // 3. Procesar la compra en Supabase
        const { error: updateError } = await client.from('profiles').update({
            pearls_balance: profile.pearls_balance - price,
            [column]: (profile[column] || 0) + qty
        }).eq('id', currentUser.id);

        if (updateError) {
            alert("Error al procesar la compra.");
            return;
        }

        // 4. Éxito: Actualizar la interfaz
        alert(`¡Compra exitosa! Has recibido ${qty} unidad(es).`);
        
        // Recargar datos para que se vea el nuevo saldo y cantidad
        await loadProfile();
        
        // Volver a renderizar la tienda para que el modal se actualice
        const panelBody = document.getElementById('panel-body');
        if (panelBody) renderShop(panelBody);

    } catch (err) {
        console.error("Error en buyItem:", err);
    }
}
async function claimPearls(fishId) {
    if (isProcessingFeeding) return;
    isProcessingFeeding = true;

    try {
        const { data: fish, error: fishError } = await client.from('user_fish').select('*').eq('id', fishId).single();
        if (fishError || !fish || Number(fish.accumulated_pearls) <= 0) {
            isProcessingFeeding = false;
            return;
        }

        const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
        const amountToClaim = Number(fish.accumulated_pearls);
        const newBalance = Number(profile.pearls_balance) + amountToClaim;
        
        await client.from('profiles').update({ pearls_balance: newBalance }).eq('id', currentUser.id);
        await client.from('user_fish').update({ 
            accumulated_pearls: 0, 
            total_generated: (Number(fish.total_generated) || 0) + amountToClaim,
            last_claim: new Date().toISOString() 
        }).eq('id', fishId);

        await loadProfile();
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));

    } catch (err) {
        console.error("Error en recolección:", err);
    } finally {
        isProcessingFeeding = false;
    }
}

function closeAllPanels() {
    const panel = document.getElementById('content-panel');
    if (panel) panel.style.display = 'none';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

async function handleLogout() {
    await client.auth.signOut();
    window.location.href = 'index.html';
}
function getNextLevelXP(currentLevel) {
    const xpRequirements = {
        1: 100,
        2: 150,
        3: 225,
        4: 350,
        5: 0 // Nivel máximo
    };
    return xpRequirements[currentLevel] || 0;
}

// Ejemplo de lógica al ganar XP:
if (fish.current_xp >= fish.next_level_xp && fish.level < 5) {
    fish.level += 1;
    fish.current_xp = 0; // O la diferencia si quieres "carry over"
    fish.next_level_xp = getNextLevelXP(fish.level);
    
    // Aquí disparas el UPDATE a la base de datos
}

async function openFishingGame() {
    const modal = document.getElementById('minigame-modal');
    const container = document.getElementById('modal-dynamic-content');
    const today = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

    // 1. Obtener datos frescos del perfil (Intentos y Cañas)
    const { data: profile, error } = await client.from('profiles')
        .select('fishing_rods, fishing_attempts_today, last_fishing_date')
        .eq('id', currentUser.id)
        .single();

    if (error || !profile) return alert("Error al conectar con el servidor.");

    // 2. Lógica de Reinicio Diario y Validación de Intentos
    let attempts = profile.fishing_attempts_today || 0;
    
    if (profile.last_fishing_date !== today) {
        // Es un nuevo día, reseteamos el contador en la DB
        attempts = 0;
        await client.from('profiles').update({ 
            fishing_attempts_today: 0, 
            last_fishing_date: today 
        }).eq('id', currentUser.id);
    }

    if (attempts >= 4) {
        alert("🐟 Los peces están asustados por hoy. Vuelve mañana (Límite 4/4 alcanzado).");
        return;
    }

    // 3. Verificación de Cañas (Pack de 2 en tienda)
    if ((profile.fishing_rods || 0) <= 0) {
        alert("¡No tienes Cañas de Pescar! Compra un pack en la tienda.");
        switchTab('tienda', document.querySelector('[onclick*="tienda"]'));
        return;
    }

    // 4. Inyección del Diseño Corregido
    container.innerHTML = `
        <div id="fishing-scene" style="position:relative; width:100%; max-width:400px; height:450px; background: url('${RAW_BASE}fondo_acuario.jpg'); background-size:cover; border-radius:15px; overflow:hidden; border:4px solid #1e3a8a; margin: 0 auto;">
            <div style="position:absolute; width:100%; height:100%; background:rgba(30, 58, 138, 0.2); pointer-events:none;"></div>

            <div id="fishing-line" style="position:absolute; left:50%; top:0; width:2px; height:0px; background:white; transition: height 0.1s;"></div>
            <div id="hook-visual" style="position:absolute; left:calc(50% - 15px); width:30px; height:30px; font-size:25px; z-index:2;">🪝</div>
            <div id="fish-target" style="position:absolute; left:calc(50% - 20px); width:40px; height:40px; font-size:30px; z-index:1;">🐟</div>

            <div style="position:absolute; top:20px; right:20px; width:40px; height:200px; background:rgba(0,0,0,0.3); border-radius:20px; border:2px solid white; overflow:hidden;">
                <div id="fishing-progress-fill" style="position:absolute; bottom:0; width:100%; height:0%; background:#4ade80; transition: height 0.2s;"></div>
            </div>

            <div style="position:absolute; bottom:20px; width:100%; text-align:center;">
                <button id="btn-fish-action" class="btn-buy" style="padding:15px 30px; font-size:1.2rem; width:80%;">¡JALAR!</button>
            </div>
        </div>
        <div style="text-align:center; margin-top:10px;">
            <span style="color:#64748b; font-size:0.85rem;">Sesiones hoy: ${attempts}/4 | Cañas: ${profile.fishing_rods}</span><br>
            <button onclick="closeFishingModal()" style="margin-top:10px; background:#ef4444; color:white; border:none; padding:8px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">Cancelar y Salir</button>
        </div>
    `;

    modal.style.display = 'flex';
    startFishingMinigame();
}

function closeFishingModal() {
    clearInterval(fishingInterval); // Detiene el juego inmediatamente
    document.getElementById('minigame-modal').style.display = 'none';
}

function startFishingMinigame() {
    let hookPos = 50;
    let targetPos = 150;
    let progress = 0;
    
    const hook = document.getElementById('hook-visual');
    const line = document.getElementById('fishing-line');
    const fish = document.getElementById('fish-target');
    const progressFill = document.getElementById('fishing-progress-fill');
    const btn = document.getElementById('btn-fish-action');

    fishingInterval = setInterval(() => {
        hookPos = Math.max(40, hookPos - 3);
        targetPos += (Math.random() - 0.5) * 20;
        targetPos = Math.max(40, Math.min(380, targetPos));

        hook.style.bottom = hookPos + 'px';
        line.style.height = (450 - hookPos - 30) + 'px';
        fish.style.bottom = targetPos + 'px';

        if (Math.abs(hookPos - targetPos) < 35) {
            progress = Math.min(100, progress + 1.5);
        } else {
            progress = Math.max(0, progress - 0.8);
        }

        progressFill.style.height = progress + '%';

        if (progress >= 100) {
            clearInterval(fishingInterval);
            finishFishing();
        }
    }, 50);

    btn.onmousedown = (e) => { e.preventDefault(); hookPos = Math.min(410, hookPos + 45); };
}

async function finishFishing() {
    // 1. Obtener datos actuales para asegurar sincronización
    const { data: profile, error } = await client.from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error || !profile) {
        alert("Error de conexión al reclamar recompensa.");
        return;
    }

    // 2. Determinar recompensa (Probabilidades configuradas)
    const rand = Math.random() * 100;
    let rewardCol, rewardName;

    if (rand < 60) { 
        rewardCol = 'marine_trash'; 
        rewardName = "Restos Marinos"; 
    } else if (rand < 85) { 
        rewardCol = 'food_plancton'; 
        rewardName = "Plancton"; 
    } else if (rand < 97) { 
        rewardCol = 'food_basic'; 
        rewardName = "Algas"; 
    } else { 
        rewardCol = 'food_rare'; 
        rewardName = "Cebo Raro"; 
    }

    // 3. Ejecutar actualización: Restar caña, sumar intento diario y sumar recompensa
    const { error: updateError } = await client.from('profiles').update({ 
        fishing_rods: Math.max(0, (profile.fishing_rods || 0) - 1),
        fishing_attempts_today: (profile.fishing_attempts_today || 0) + 1,
        [rewardCol]: (profile[rewardCol] || 0) + 1
    }).eq('id', currentUser.id);

    if (updateError) {
        alert("Hubo un problema al guardar tu progreso.");
        console.error(updateError);
        return;
    }

    // 4. Feedback al usuario y refresco de interfaz
    alert(`¡Buena pesca! 🎣\nGastaste 1 caña y encontraste: ${rewardName}.\nIntentos hoy: ${(profile.fishing_attempts_today || 0) + 1}/4`);
    
    closeFishingModal();
    
    // Recargar perfil para actualizar contadores en el inventario/tienda
    if (typeof loadProfile === "function") {
        await loadProfile();
    }
}
async function renderDeposit(container) {
    // 1. Intentar obtener la dirección desde Supabase
    let { data: wallet } = await supabase
        .from('user_wallets')
        .select('address')
        .single();

    // 2. Si no existe, aquí llamaríamos a la función de creación automática
    if (!wallet) {
        // wallet = await generateNewBEP20Address(userId);
    }

    const userAddress = wallet?.address || "Generando dirección...";

    container.innerHTML = `
        <div class="deposit-card" style="text-align: center; padding: 25px; background: white; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <h3 style="color: #1e293b;">Depositar USDT</h3>
            <p style="font-size: 0.8rem; color: #64748b;">Red: <b>Binance Smart Chain (BEP20)</b></p>
            
            <div style="margin: 20px 0;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${userAddress}" 
                     style="border: 10px solid #f8fafc; border-radius: 15px;">
            </div>

            <div style="background: #f1f5f9; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; position: relative;">
                <code style="font-size: 0.7rem; color: #334155; word-break: break-all;">${userAddress}</code>
                <button onclick="copyToClipboard('${userAddress}')" 
                        style="margin-top: 10px; width: 100%; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">
                    COPIAR DIRECCIÓN
                </button>
            </div>

            <div style="margin-top: 25px; padding: 15px; background: #fff4e6; border-radius: 10px; border: 1px solid #ffd8a8;">
                <p style="font-size: 0.75rem; color: #d9480f; margin: 0;">
                    ⚠️ Envía solo USDT (BEP20). Otros activos se perderán permanentemente.
                </p>
            </div>
            
            <button onclick="checkDepositStatus()" 
                    style="margin-top: 20px; width: 100%; background: #22c55e; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                VERIFICAR TRANSACCIÓN
            </button>
        </div>
    `;
}
