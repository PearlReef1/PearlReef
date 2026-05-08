let currentUser = null;
let allFish = [];
let isProcessingFeeding = false;
let hookPos = 0;
let targetPos = 50;
let progress = 0;
let fishingInterval = null; // Variable global para controlar el cierre real
let swapDirection = "USDT_TO_PRL";
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

window.onload = async () => {
    // Usamos 'supabase' en lugar de 'client' para coincidir con el HTML
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) { 
        window.location.href = 'index.html'; 
        return; 
    }
    
    currentUser = user;
    
    await loadProfile();
    await initAquarium();
    
    // Inicia el ciclo del acuario
    setInterval(updateAquariumState, 1000);
};

async function loadProfile() {
    // También cambiamos 'client' por 'supabase' aquí
    const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    
    if (error) {
        console.error("Error cargando perfil:", error);
        return;
    }
    
    if (data) {
        // --- ACTUALIZACIÓN DE USDT (BEP20) ---
        // Buscamos el ID que pusimos en el HTML y le pasamos balance_usdt
        if (document.getElementById('usdt-balance')) {
            const balanceUSDT = parseFloat(data.balance_usdt || 0);
            document.getElementById('usdt-balance').innerText = balanceUSDT.toFixed(2);
        }

        // Actualizar balance de perlas ($PRL)
        if (document.getElementById('pearl-balance'))
            document.getElementById('pearl-balance').innerText = Math.floor(data.pearls_balance) || 0;
            
        // Actualizar nombre de usuario
        if (document.getElementById('user-name'))
            document.getElementById('user-name').innerText = data.username || "Jugador";
        
        // Actualizar contadores de comida
        if (document.getElementById('food-plancton-count')) 
            document.getElementById('food-plancton-count').innerText = data.food_plancton || 0;
            
        if (document.getElementById('food-basic-count')) 
            document.getElementById('food-basic-count').innerText = data.food_basic || 0;
            
        if (document.getElementById('food-rare-count')) 
            document.getElementById('food-rare-count').innerText = data.food_rare || 0;
        
        // Actualizar contador de restos marinos
        if (document.getElementById('marine-trash-count'))
            document.getElementById('marine-trash-count').innerText = data.marine_trash || 0;
    }
}

async function initAquarium() {
    const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
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

async function switchTab(tab, btn) {
    // Manejo de clases activas en el menú
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const panel = document.getElementById('content-panel');
    const body = document.getElementById('panel-body');
    const title = document.getElementById('panel-title');
    const mainGrid = document.getElementById('main-aquarium-grid');

    // Lógica para mostrar la cuadrícula del Acuario o los paneles laterales
    if (tab === 'acuario') { 
        panel.style.display = 'none'; 
        if (mainGrid) {
            mainGrid.style.display = 'block';
            renderInventory(mainGrid); // Renderizamos la nueva cuadrícula técnica
        }
        return; 
    }

    // Si entramos a otra pestaña (Tienda/Depósito), ocultamos la cuadrícula
    if (mainGrid) mainGrid.style.display = 'none';
    panel.style.display = 'flex';
    
    if (tab === 'deposito') {
        title.innerText = "Depósito de USDT";
    } else {
        title.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
    }

    // Solo renderizamos Tienda o Depósito en el panel lateral
    if (tab === 'tienda') renderShop(body);
    if (tab === 'deposito') renderDeposit(body); 
}
function renderInventory(container) {
    if (!container) return;
    const now = new Date();
    const isMain = container.id === 'main-aquarium-grid';
    container.innerHTML = '';

    const PRL_ICON = `<img src="${RAW_BASE}perla_economia.png?raw=true" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;">`;

    // 1. Cálculos de totales (Cabecera)
    let prod = 0, claim = 0, hungry = 0;
    allFish.forEach(f => {
        if (!f.is_egg) {
            const levelBonus = 1 + ((Math.min(f.level, 5) - 1) * 0.05);
            if ((now - new Date(f.last_fed || 0)) < 86400000) prod += (f.daily_yield * levelBonus);
            else hungry++;
            claim += Number(f.accumulated_pearls || 0);
        }
    });

    const header = document.createElement('div');
    header.className = isMain ? 'stats-header-main' : 'stats-dashboard-side';
    header.innerHTML = `
        <div style="text-align:center;"><small style="color:#94a3b8; font-size:0.7rem;">PROD/DÍA</small><br><strong style="color:#2ecc71; font-size:1.1rem;">${PRL_ICON}${prod.toFixed(0)}</strong></div>
        <div style="text-align:center; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); padding: 0 20px;"><small style="color:#94a3b8; font-size:0.7rem;">ACUMULADO</small><br><strong style="color:#3b82f6; font-size:1.1rem;">${PRL_ICON}${claim.toFixed(2)}</strong></div>
        <div style="text-align:center;"><small style="color:#94a3b8; font-size:0.7rem;">HAMBRIENTOS</small><br><strong style="color:${hungry > 0 ? '#ff4757':'#2ecc71'}; font-size:1.1rem;">🐟 ${hungry}</strong></div>
    `;
    container.appendChild(header);

    const wrapper = document.createElement('div');
    wrapper.className = isMain ? 'grid-main-wrapper' : 'lista-lateral';
    
    allFish.forEach(fish => {
        const card = document.createElement('div');
        card.className = isMain ? 'card-main-aquarium' : 'mini-card';

        if (fish.is_egg) {
            renderEggRow(card, fish, now);
        } else {
            const lastFed = new Date(fish.last_fed || 0);
            const msSinceFed = now - lastFed;
            const msUntilHungry = Math.max(0, (24 * 60 * 60 * 1000) - msSinceFed);
            
            // Formatear tiempo restante para el hambre
            const hoursLeft = Math.floor(msUntilHungry / (1000 * 60 * 60));
            const minsLeft = Math.floor((msUntilHungry % (1000 * 60 * 60)) / (1000 * 60));
            
            let hUnits = msSinceFed < 43200000 ? 2 : (msSinceFed < 86400000 ? 1 : 0);
            
            const currentXP = fish.current_xp || 0;
            const nextXP = fish.next_level_xp || 100;
            const xpPer = Math.min((currentXP / nextXP) * 100, 100);
            const rarityKey = fish.rarity.toLowerCase().replace(/ /g,'_');

            card.innerHTML = `
                <div style="font-size:0.55rem; color:#64748b; text-align:right; margin-bottom:5px;">ID: #${fish.id.toString().slice(0,4)}</div>
                
                <img src="${RAW_BASE}pez_${rarityKey}.png" class="img-pez-flotando" style="filter:${hUnits===0?'grayscale(1) brightness(0.6)':'none'}">
                
                <h4 style="margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:1px;" class="rarity-text-${fish.rarity.toLowerCase().replace(/ /g,'-')}">${fish.rarity}</h4>
                <div style="font-size:0.75rem; color:#94a3b8; font-weight:bold;">NIVEL ${fish.level}</div>

<div class="main-xp-bar">
    <div class="main-xp-fill" style="width:${xpPer}%; position: relative; z-index: 1;"></div>
    <span class="xp-text-overlay">${currentXP} / ${nextXP} XP</span>
</div>

                <div style="font-size: 0.6rem; color: #94a3b8; margin-bottom: 4px; text-align: left;">RESERVA COMIDA:</div>
                <div class="main-energy-dots">
                    <div class="energy-dot-main ${hUnits >= 1 ? 'active' : ''}"></div>
                    <div class="energy-dot-main ${hUnits >= 2 ? 'active' : ''}"></div>
                </div>
                <div style="font-size: 0.6rem; color: ${hUnits === 0 ? '#ff4757' : '#60a5fa'}; margin-bottom: 10px;">
                    ${hUnits === 0 ? '¡TIENE HAMBRE!' : `Hambre en: ${hoursLeft}h ${minsLeft}m`}
                </div>

                <div class="main-collect-box" style="flex-direction: column; gap: 5px; align-items: stretch;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                        <span style="color:#94a3b8">Producido:</span>
                        <strong style="color:white">${PRL_ICON}${Number(fish.accumulated_pearls).toFixed(2)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding-top:2px;">
                        <span style="color:#64748b; font-size:0.65rem;">Total Generado:</span>
                        <strong style="color:#94a3b8; font-size:0.65rem;">${Number(fish.total_generated || 0).toFixed(1)} PRL</strong>
                    </div>
                </div>

                <button class="btn-buy" style="background:#2ecc71; box-shadow: 0 4px 0 #1a9e5a; margin-bottom:8px;" onclick="claimPearls('${fish.id}')">RECOLECTAR</button>
                ${hUnits < 2 ? 
                    `<button class="btn-feed-mini" style="background:#3b82f6; box-shadow: 0 4px 0 #1d4ed8;" onclick="startFeeding('${fish.id}')">ALIMENTAR</button>` : 
                    `<div style="font-size:0.6rem; color:#64748b; background:rgba(255,255,255,0.05); padding:8px; border-radius:8px;">Satisfecho</div>`
                }
            `;
        }
        wrapper.appendChild(card);
    });
    container.appendChild(wrapper);
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
    const { error } = await supabase.from('user_fish').update({ is_egg: false }).eq('id', fishId);
    if (!error) {
        const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        await initAquarium();
        renderInventory(document.getElementById('panel-body'));
    }
}

async function startFeeding(fishId) {
    if (isProcessingFeeding) return; 
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();

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
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    const { data: fish } = await supabase.from('user_fish').select('*').eq('id', fishId).single();

    const now = new Date();
    const lastFedDate = fish.last_fed ? new Date(fish.last_fed) : new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    // Cálculo de vida restante actual
    let currentLifeMs = lastFedDate.getTime() + (24 * 60 * 60 * 1000) - now.getTime();
    
    // Limite: No permitir más de 24h de reserva (2 barras)
    if (currentLifeMs >= (24 * 60 * 60 * 1000)) {
        alert("El pez ya está lleno.");
        document.getElementById('minigame-modal').style.display = 'none';
        isProcessingFeeding = false;
        return;
    }

    const foodCfg = FOOD_TYPES[foodType];
    
    // 1. Descontar comida
    await supabase.from('profiles').update({ [foodCfg.col]: profile[foodCfg.col] - 1 }).eq('id', currentUser.id);

    // --- LÓGICA DE TIEMPO ---
    let limitPast = now.getTime() - (24 * 60 * 60 * 1000); 
    let baseTime = lastFedDate.getTime() < limitPast ? limitPast : lastFedDate.getTime();
    let newFedDate = new Date(baseTime + (12 * 60 * 60 * 1000));

    // 2. Lógica de XP y Nivel
    let newXP = (fish.current_xp || 0) + foodCfg.xp;
    let newLevel = fish.level || 1;
    let nextXP = fish.next_level_xp || 100;
    let leveledUp = false;

    if (newLevel < 5) {
        if (newXP >= nextXP) {
            newLevel++;
            newXP = newXP - nextXP; 
            nextXP = getNextLevelXP(newLevel);
            leveledUp = true;
        }
    } else {
        // Si ya es nivel máximo, el XP no debería seguir sumando o se queda al tope
        if (newXP > nextXP) newXP = nextXP;
    }

    // 3. Guardar en Supabase
    await supabase.from('user_fish').update({ 
        last_fed: newFedDate.toISOString(),
        current_xp: newXP,
        level: newLevel,
        next_level_xp: nextXP
    }).eq('id', fishId);

    // --- NOTIFICACIÓN DE NIVEL ---
    if (leveledUp) {
        // Una pequeña pausa para que el modal se cierre antes del alert
        setTimeout(() => {
            alert(`✨ ¡NIVEL SUBIDO! Tu pez ahora es Nivel ${newLevel} ✨\nSu producción ha aumentado.`);
        }, 300);
    }

    // --- REFRESCAR INTERFAZ SINCRONIZADA ---
    document.getElementById('minigame-modal').style.display = 'none';
    await loadProfile();
    const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data;

    // Detectar dónde renderizar (Cuadrícula central o panel lateral)
    const mainGrid = document.getElementById('main-aquarium-grid');
    const panelBody = document.getElementById('panel-body');

    if (mainGrid && mainGrid.style.display !== 'none') {
        renderInventory(mainGrid); 
    } else {
        renderInventory(panelBody);
    }
    
    isProcessingFeeding = false; 
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
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("No tienes suficientes perlas ⚪");

    const col = FOOD_TYPES[type].col;
    await supabase.from('profiles').update({
        pearls_balance: Number(profile.pearls_balance) - Number(cost),
        [col]: (Number(profile[col]) || 0) + Number(quantity)
    }).eq('id', currentUser.id);

    await loadProfile();
    const body = document.getElementById('panel-body');
    if (body) renderShop(body);
}

async function buyEgg(type, cost) {
    const { data: profile } = await supabase.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
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

    await supabase.from('profiles').update({ pearls_balance: profile.pearls_balance - cost }).eq('id', currentUser.id);
    await supabase.from('user_fish').insert([{
        user_id: currentUser.id, rarity, daily_yield: yieldAmount, is_egg: true,
        egg_hatch_time: hatchDate.toISOString(), level: 1, current_xp: 0,
        next_level_xp: 100, last_fed: new Date().toISOString(), total_generated: 0
    }]);

    await loadProfile();
    const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data;
    renderInventory(document.getElementById('panel-body'));
}

async function buyItem(column, price, qty) {
    try {
        // 1. Obtener saldo actual del perfil
        const { data: profile, error: fetchError } = await supabase.from('profiles')
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
        const { error: updateError } = await supabase.from('profiles').update({
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
        const { data: fish, error: fishError } = await supabase.from('user_fish').select('*').eq('id', fishId).single();
        if (fishError || !fish || Number(fish.accumulated_pearls) <= 0) {
            isProcessingFeeding = false;
            return;
        }

        const { data: profile } = await supabase.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
        const amountToClaim = Number(fish.accumulated_pearls);
        const newBalance = Number(profile.pearls_balance) + amountToClaim;
        
        await supabase.from('profiles').update({ pearls_balance: newBalance }).eq('id', currentUser.id);
        await supabase.from('user_fish').update({ 
            accumulated_pearls: 0, 
            total_generated: (Number(fish.total_generated) || 0) + amountToClaim,
            last_claim: new Date().toISOString() 
        }).eq('id', fishId);

        // Recargamos datos actualizados
        await loadProfile();
        const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;

        // --- CAMBIO CLAVE AQUÍ: Actualización de la vista unificada ---
        const mainGrid = document.getElementById('main-aquarium-grid');
        const panelBody = document.getElementById('panel-body');

        // Priorizamos actualizar la cuadrícula del acuario si está visible
        if (mainGrid && mainGrid.style.display !== 'none') {
            renderInventory(mainGrid);
        } else {
            renderInventory(panelBody);
        }

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
    await supabase.auth.signOut();
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

async function openFishingGame() {
    const modal = document.getElementById('minigame-modal');
    const container = document.getElementById('modal-dynamic-content');
    const today = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

    // 1. Obtener datos frescos del perfil (Intentos y Cañas)
    const { data: profile, error } = await supabase.from('profiles')
        .select('fishing_rods, fishing_attempts_today, last_fishing_date')
        .eq('id', currentUser.id)
        .single();

    if (error || !profile) return alert("Error al conectar con el servidor.");

    // 2. Lógica de Reinicio Diario y Validación de Intentos
    let attempts = profile.fishing_attempts_today || 0;
    
    if (profile.last_fishing_date !== today) {
        // Es un nuevo día, reseteamos el contador en la DB
        attempts = 0;
        await supabase.from('profiles').update({ 
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
    const { data: profile, error } = await supabase.from('profiles')
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
    const { error: updateError } = await supabase.from('profiles').update({ 
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
    container.innerHTML = `<div style="text-align:center; padding:40px;">⌛ Cargando tu billetera segura...</div>`;

    const sb = window.supabase;

    try {
        if (!sb) throw new Error("El cliente de Supabase no se encontró.");

        const { data: { session }, error: authError } = await sb.auth.getSession();
        if (authError || !session) throw new Error("No hay sesión activa.");

        const userId = session.user.id;

        // Intentar obtener la dirección de la base de datos
        let { data: walletData, error: dbError } = await sb
            .from('user_wallets')
            .select('address')
            .eq('user_id', userId)
            .maybeSingle();

        if (dbError) throw dbError;

        let address = walletData?.address;

        // Si no existe, llamar a la Edge Function 'dynamic-task'
        if (!address) {
            const { data: newWallet, error: funcError } = await sb.functions.invoke('dynamic-task', {
                body: { user_id: userId }
            });
            
            if (funcError) throw funcError;
            address = newWallet.address;
        }

        // Renderizar la interfaz (Tu diseño original)
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 20px;">Envía USDT por la red <b>Binance Smart Chain (BEP20)</b></p>
                
                <div style="background: white; padding: 15px; display: inline-block; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}" alt="QR Deposito">
                </div>

                <div style="margin-top: 20px; background: #f1f5f9; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <code style="font-size: 0.75rem; color: #1e293b; word-break: break-all;">${address}</code>
                    <button onclick="navigator.clipboard.writeText('${address}'); alert('¡Copiado al portapapeles!')" 
                            style="display: block; width: 100%; margin-top: 10px; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: 500;">
                        COPIAR DIRECCIÓN
                    </button>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #fff9db; border: 1px solid #fab005; border-radius: 8px; text-align: left;">
                    <small style="color: #862e00; display: block; line-height: 1.4;">
                        • Envía solo USDT (BEP20).<br>
                        • Mínimo recomendado: 1 USDT.<br>
                        • El proceso de verificación puede tardar unos minutos tras el envío.
                    </small>
                </div>

                <button id="btn-verify-deposit" onclick="verifyDepositAction()" 
                        style="margin-top: 20px; width: 100%; background: #2ecc71; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: background 0.3s;">
                    ✅ VERIFICAR DEPÓSITO
                </button>
                <div id="deposit-status" style="margin-top: 15px; text-align: center; font-size: 0.85rem; font-weight: bold;"></div>
            </div>
        `;

    } catch (err) {
        console.error("Detalle del error en Depósito:", err);
        container.innerHTML = `<div style="color: #e74c3c; padding: 20px; text-align: center;"><strong>Error:</strong> ${err.message}</div>`;
    }
}

async function handleSwap(amount, direction) {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión activa");

    const userId = session.user.id;

    // 1. Obtener datos con el nombre de columna correcto: pearls_balance
    const { data: profile, error: fetchError } = await window.supabase
        .from('profiles')
        .select('balance_usdt, pearls_balance') // Corregido a plural según el error
        .eq('id', userId)
        .single();

    if (fetchError || !profile) {
        console.error("Error al obtener perfil:", fetchError);
        throw new Error("No se pudo cargar tu perfil para realizar el cambio.");
    }

    let newUSDT = profile.balance_usdt;
    let newPRL = profile.pearls_balance; // Corregido a plural

    if (direction === "USDT_TO_PRL") {
        if (newUSDT < amount) throw new Error("Saldo USDT insuficiente");
        newUSDT -= amount;
        newPRL += (amount * 100);
    } else {
        if (newPRL < amount) throw new Error("Saldo PRL insuficiente");
        newPRL -= amount;
        newUSDT += (amount / 100);
    }

    // 2. Actualizar en Supabase usando pearls_balance
    const { error: updateError } = await window.supabase
        .from('profiles')
        .update({ 
            balance_usdt: newUSDT, 
            pearls_balance: newPRL // Corregido a plural
        })
        .eq('id', userId);

    if (updateError) throw updateError;

    // 3. Actualizar la interfaz visual
    document.getElementById('usdt-balance').innerText = newUSDT.toFixed(2);
    document.getElementById('pearl-balance').innerText = Math.floor(newPRL);

    alert("¡Intercambio realizado con éxito!");
}
async function verifyDepositAction() {
    const btn = document.getElementById('btn-verify-deposit');
    const statusDiv = document.getElementById('deposit-status');

    if (!btn || !statusDiv) return; 

    btn.disabled = true;
    btn.innerHTML = "🔍 ESCANEANDO RED...";
    statusDiv.innerHTML = `<span style="color: #f39c12;">Consultando transacciones en la Blockchain...</span>`;

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        
        if (!session) {
            throw new Error("Sesión no activa");
        }
        
        // Invocamos la Edge Function
        const { data, error } = await window.supabase.functions.invoke('verify-deposit-index-ts', {
            body: { user_id: session.user.id }
        });

        if (error) throw error;

        // Si la función detectó y sumó USDT
        if (data && data.added > 0) {
            statusDiv.innerHTML = `
                <div style="background: rgba(46, 204, 113, 0.2); padding: 10px; border-radius: 10px; border: 1px solid #2ecc71; margin-top: 10px;">
                    <b style="color: #2ecc71;">¡DEPÓSITO DETECTADO! +${data.added} USDT</b>
                </div>`;
            
            // --- ACTUALIZACIÓN AUTOMÁTICA ---
            // Llamamos a la función que ya actualizamos para que refresque el contador visual
            if (typeof loadProfile === 'function') {
                await loadProfile(); 
                console.log("Interfaz actualizada con el nuevo saldo.");
            } else {
                // Si la función no existe por algún motivo, recargamos la web
                setTimeout(() => location.reload(), 1500);
            }
        } else {
            statusDiv.innerHTML = `<span style="color: #64748b;">No se detectaron depósitos nuevos en USDT.</span>`;
        }
    } catch (err) {
        console.error("Error al verificar:", err);
        statusDiv.innerHTML = `<b style="color: #e63946;">Error: Reintenta en breve.</b>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = "✅ VERIFICAR DEPÓSITO";
    }
}
async function getOrCreateWallet(userId) {
    // 1. Buscamos si el usuario ya tiene una dirección en Supabase
    let { data, error } = await supabase
        .from('user_wallets')
        .select('address')
        .eq('user_id', userId)
        .maybeSingle(); // Usamos maybeSingle para que no dé error si no encuentra nada

    if (data && data.address) return data.address;

    // 2. Si no tiene, llamamos a tu Edge Function con el nombre correcto
    // CAMBIO REALIZADO: de 'generate-wallet' a 'dynamic-task'
    const { data: newWallet, error: genError } = await supabase.functions.invoke('dynamic-task', {
        body: { user_id: userId }
    });

    if (genError) {
        console.error("Error creando wallet:", genError);
        return "Error al generar dirección";
    }

    // Retornamos la nueva dirección generada por Tatum
    return newWallet.address;
}

function openSwapModal() {
    const modal = document.getElementById('minigame-modal');
    const content = document.getElementById('modal-dynamic-content');
    
    // Obtenemos los saldos actuales directamente de lo que muestra tu interfaz
    const currentUSDT = parseFloat(document.getElementById('usdt-balance').innerText) || 0;
    const currentPRL = parseFloat(document.getElementById('pearl-balance').innerText) || 0;

    modal.style.display = 'flex';
    renderSwapContent(currentUSDT, currentPRL);
}

function renderSwapContent(userUSDT, userPRL) {
    const content = document.getElementById('modal-dynamic-content');
    const isToPRL = swapDirection === "USDT_TO_PRL";
    
    // Ajuste de etiquetas y tasas según la dirección
    const fromLabel = isToPRL ? "Cantidad a convertir (USDT)" : "Cantidad a convertir (PRL)";
    const toLabel = isToPRL ? "PRL" : "USDT";
    const rateText = isToPRL ? "1 USDT = 100 PRL" : "100 PRL = 1 USDT";

    content.innerHTML = `
        <div style="text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <h2 style="color: #6366f1; margin-bottom: 5px;">🔄 Intercambio</h2>
            <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 20px;">Tasa: ${rateText}</p>

            <div style="background: rgba(15, 23, 42, 0.5); padding: 20px; border-radius: 15px; border: 1px solid #334155; margin-bottom: 15px; position: relative;">
                
                <!-- Botón para invertir dirección -->
                <button onclick="toggleSwapDirection(${userUSDT}, ${userPRL})" 
                        style="position: absolute; right: 10px; top: -15px; background: #6366f1; border: none; border-radius: 50%; width: 32px; height: 32px; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: transform 0.2s;"
                        onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    ⇅
                </button>

                <label style="display: block; font-size: 0.7rem; color: #94a3b8; text-align: left; margin-bottom: 8px;">${fromLabel}</label>
                <input type="number" id="swap-amount-input" placeholder="0.00" 
                       style="width: 100%; background: transparent; border: none; border-bottom: 2px solid #6366f1; color: white; font-size: 1.8rem; text-align: center; outline: none; margin-bottom: 5px;">
                
                <!-- Mensaje de Error de Saldo -->
                <div id="balance-error" style="color: #ff4757; font-size: 0.75rem; font-weight: bold; display: none; margin-bottom: 10px;">
                    ⚠️ Sin saldo disponible
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <span style="font-size: 0.85rem; color: #94a3b8;">Recibirás:</span>
                    <span id="swap-result-display" style="font-size: 1.1rem; font-weight: bold; color: #f1c40f;">0 ${toLabel}</span>
                </div>
            </div>

            <button id="confirm-swap-btn" onclick="executeSwapAction()" 
                    style="width: 100%; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); opacity: 0.5; pointer-events: none; transition: opacity 0.3s;">
                CONFIRMAR CAMBIO
            </button>
            
            <button onclick="document.getElementById('minigame-modal').style.display='none'" 
                    style="background: transparent; border: none; color: #64748b; font-size: 0.85rem; cursor: pointer; text-decoration: underline;">
                Cerrar Ventana
            </button>
        </div>
    `;

    setupSwapListeners(userUSDT, userPRL);
}

function toggleSwapDirection(u, p) {
    swapDirection = (swapDirection === "USDT_TO_PRL") ? "PRL_TO_USDT" : "USDT_TO_PRL";
    renderSwapContent(u, p);
}

function setupSwapListeners(userUSDT, userPRL) {
    const input = document.getElementById('swap-amount-input');
    const result = document.getElementById('swap-result-display');
    const errorMsg = document.getElementById('balance-error');
    const btn = document.getElementById('confirm-swap-btn');

    input.addEventListener('input', () => {
        const val = parseFloat(input.value) || 0;
        const isToPRL = swapDirection === "USDT_TO_PRL";
        const maxAvailable = isToPRL ? userUSDT : userPRL;
        
        // Cálculo del resultado
        const finalAmount = isToPRL ? (val * 100) : (val / 100);
        const label = isToPRL ? "PRL" : "USDT";
        result.innerText = `${finalAmount.toLocaleString(undefined, {minimumFractionDigits: isToPRL ? 0 : 2})} ${label}`;

        // Validación de Saldo
        if (val > maxAvailable) {
            errorMsg.style.display = 'block';
            input.style.borderBottomColor = '#ff4757';
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        } else if (val <= 0) {
            errorMsg.style.display = 'none';
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            input.style.borderBottomColor = '#6366f1';
        } else {
            errorMsg.style.display = 'none';
            input.style.borderBottomColor = '#2ecc71';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    });
}

async function executeSwapAction() {
    const amount = parseFloat(document.getElementById('swap-amount-input').value);
    const isToPRL = swapDirection === "USDT_TO_PRL";

    try {
        // Aquí llamas a tu backend/Supabase pasando el monto y la dirección
        // Por ejemplo: await handleSwap(amount, swapDirection);
        console.log(`Procesando cambio de ${amount} en dirección ${swapDirection}`);
        
        await handleSwap(amount, swapDirection); 
        
        document.getElementById('minigame-modal').style.display = 'none';
    } catch (err) {
        alert("Error al procesar el cambio: " + err.message);
    }
}
