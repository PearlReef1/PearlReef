let currentUser = null;
let allFish = [];
let isProcessingFeeding = false;
let hookPos = 0;
let targetPos = 50;
let progress = 0;
let fishingInterval = null; // Variable global para controlar el cierre real
let swapDirection = "USDT_TO_PRL";
let currentTipIndex = 0;
const tips = [
    "💡 Un pez Nivel 5 produce un 20% más que uno Nivel 1.",
    "⚠️ Si tu pez tiene hambre (0 barras), la producción se detiene.",
    "✨ Cada nivel subido otorga un +5% de bono a la producción base.",
    "🥣 ¡Alimentar a tus peces les da XP para alcanzar el siguiente nivel!",
    ];

// Función para registrar eventos en el historial
async function registrarLog(tabla, datos) {
    try {
        const { error } = await supabase
            .from(tabla)
            .insert([{ ...datos, user_id: currentUser.id }]);
        
        if (error) {
            // Esto te dará el mensaje real (ej: "new row violates row-level security policy")
            console.error(`Error en tabla ${tabla}:`, error.message, error.details);
        }
    } catch (e) {
        console.error("Error crítico en sistema de logs:", e);
    }
}
// Función para actualizar el texto del tip en la pantalla sin recargar todo
setInterval(() => {
    currentTipIndex = (currentTipIndex + 1) % tips.length;
    const tipElement = document.getElementById('random-tip-display');
    if (tipElement) {
        tipElement.style.opacity = 0; // Efecto de desvanecimiento
        setTimeout(() => {
            tipElement.innerText = tips[currentTipIndex];
            tipElement.style.opacity = 1;
        }, 500);
    }
}, 6000); // Cambia cada 6 segundos
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

// 1. AGREGA ESTA FUNCIÓN (Que faltaba en tu script)
function moveFishRandomly(element) {
    if (!element) return;
    
    const targetX = Math.random() * 75 + 10; 
    const targetY = Math.random() * 55 + 15; 
    const img = element.querySelector('.fish-img');
    
    // Girar la imagen según la dirección del nado
    if (img) {
        const rect = element.getBoundingClientRect();
        const currentXPercent = (rect.left / window.innerWidth) * 100;
        img.style.transform = targetX > currentXPercent ? "scaleX(1)" : "scaleX(-1)";
    }
    
    element.style.left = targetX + "vw";
    element.style.top = targetY + "vh";
    
    // Bucle de movimiento cada 8 segundos
    setTimeout(() => moveFishRandomly(element), 8000);
}

// 2. ACTUALIZA TU FUNCIÓN ACTUAL (Línea 154 en tu script)
function createSwimmingFish(fish) {
    const bg = document.getElementById('aquarium-bg');
    if (!bg) return;

    const fishGroup = document.createElement('div');
    fishGroup.className = 'fish-container';
    fishGroup.id = `fish-${fish.id}`;
    
    const rarityClass = fish.rarity.toLowerCase().replace(/\s+/g, '-');
    const rarityAsset = fish.rarity.toLowerCase().replace(/\s+/g, '_');
    
    // Usar image_name de la DB o el asset genérico
    const imgFile = fish.image_name || `pez_${rarityAsset}`;
    const displayName = fish.species_name || fish.rarity;

    fishGroup.innerHTML = `
        <div class="fish-label">
            <span class="f-id">#${fish.id.toString().substring(0, 4)}</span>
            <span class="f-rarity rarity-text-${rarityClass}">${displayName}</span>
        </div>
        <img src="${RAW_BASE}${imgFile}.png?raw=true" class="fish-img">
    `;
    
    const startX = Math.random() * 70 + 10;
    const startY = Math.random() * 50 + 20;
    fishGroup.style.left = startX + "vw";
    fishGroup.style.top = startY + "vh";
    
    bg.appendChild(fishGroup);
    
    // Ahora sí funcionará porque la función ya existe arriba
    setTimeout(() => moveFishRandomly(fishGroup), 100);
}
async function switchTab(tab, btn) {
    // 1. Manejo de clases activas
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const panel = document.getElementById('content-panel');
    const mainGrid = document.getElementById('main-aquarium-grid');

    if (tab === 'acuario') { 
        if (panel) panel.style.display = 'none'; 
        if (mainGrid) {
            mainGrid.style.display = 'block'; 
            
            // LOGICA CRÍTICA: Esperar a que allFish tenga datos
            if (allFish && allFish.length > 0) {
                renderInventory(mainGrid); 
            } else {
                console.log("Esperando a que carguen los peces...");
                // Reintentamos en medio segundo si la DB está lenta
                setTimeout(() => renderInventory(mainGrid), 800);
            }
        }
        return; 
    }

    if (mainGrid) mainGrid.style.display = 'none';
    if (panel) panel.style.display = 'flex';
    
    const body = document.getElementById('panel-body');
    const title = document.getElementById('panel-title');
    
    if (tab === 'deposito') {
        title.innerText = "Depósito de USDT";
        renderDeposit(body);
    } else if (tab === 'tienda') {
        title.innerText = "Tienda";
        renderShop(body);
    } else if (tab === 'historial') {
        title.innerText = "Historial de Actividad";
        renderHistory(body); // Llama a la función que renderiza las tablas de logs
    }
}
function renderInventory(container) {
    if (!container) return;
    const now = new Date();
    const isMain = container.id === 'main-aquarium-grid';
    container.innerHTML = '';

    const PRL_ICON = `<img src="${RAW_BASE}perla_economia.png?raw=true" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;">`;

    // 1. Ordenar: Los huevos (is_egg === true) van PRIMERO en la lista
    allFish.sort((a, b) => (b.is_egg === true ? 1 : 0) - (a.is_egg === true ? 1 : 0));

    // 2. Cálculos de totales
    let prodTotal = 0, claimTotal = 0, hungryCount = 0;
    allFish.forEach(f => {
        if (!f.is_egg) {
            const levelBonus = 1 + ((Math.min(f.level, 5) - 1) * 0.05);
            if ((now - new Date(f.last_fed || 0)) < 86400000) prodTotal += (f.daily_yield * levelBonus);
            else hungryCount++;
            claimTotal += Number(f.accumulated_pearls || 0);
        }
    });

    // 3. Render del Header de estadísticas
    const header = document.createElement('div');
    header.className = isMain ? 'stats-header-main' : 'stats-dashboard-side';
    header.style.flexDirection = 'column';
    header.innerHTML = `
        <div style="display:flex; width:100%; justify-content:space-around; margin-bottom:10px;">
            <div style="text-align:center;"><small style="color:#94a3b8; font-size:0.7rem;">PROD TOTAL/DÍA</small><br><strong style="color:#2ecc71; font-size:1.1rem;">${PRL_ICON}${prodTotal.toFixed(0)}</strong></div>
            <div style="text-align:center; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); padding: 0 20px;"><small style="color:#94a3b8; font-size:0.7rem;">ACUMULADO</small><br><strong style="color:#3b82f6; font-size:1.1rem;">${PRL_ICON}${claimTotal.toFixed(2)}</strong></div>
            <div style="text-align:center;"><small style="color:#94a3b8; font-size:0.7rem;">HAMBRIENTOS</small><br><strong style="color:${hungryCount > 0 ? '#ff4757':'#2ecc71'}; font-size:1.1rem;">🐟 ${hungryCount}</strong></div>
        </div>
        <div style="width:100%; text-align:center; padding: 8px; background:rgba(255,183,3,0.1); border-radius:10px; border:1px dashed rgba(255,183,3,0.3);">
            <div id="random-tip-display" style="font-size:0.65rem; color:#ffb703; font-style:italic; transition: opacity 0.5s ease;">
                ${tips[currentTipIndex]}
            </div>
        </div>
    `;
    container.appendChild(header);

    // Validación de acuario vacío
    if (!allFish || allFish.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.cssText = `display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; color: white; width: 100%;`;
        emptyState.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 15px;">🌊</div>
            <h2 style="margin: 0; font-size: 1.5rem; color: #ffb703;">Tu Acuario está vacío</h2>
            <p style="color: #94a3b8; font-size: 0.9rem; margin: 10px 0 25px 0; max-width: 300px;">Adquiere tu primer submarino en la tienda para empezar a producir Perlas.</p>
            <button class="nav-btn" onclick="switchTab('tienda', this)" style="background: #3b82f6; padding: 12px 30px; border-radius: 12px; border: none; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 4px 0 #1d4ed8;">IR A LA TIENDA 🛒</button>
        `;
        container.appendChild(emptyState);
        return;
    }

    // 4. Render del Wrapper y Cards
    const wrapper = document.createElement('div');
    wrapper.className = isMain ? 'grid-main-wrapper' : 'lista-lateral';
    
    allFish.forEach(fish => {
        const card = document.createElement('div');
        card.className = isMain ? 'card-main-aquarium' : 'mini-card';
        
        if (fish.is_egg) {
            card.classList.add('egg-card');
            // Aplicamos un padding extra para que el huevo luzca centrado y grande como el pez
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            card.style.padding = '20px';
            
            renderEggRow(card, fish, now);
        } else {
            const lastFed = new Date(fish.last_fed || 0);
            const msSinceFed = now - lastFed;
            const msUntilHungry = Math.max(0, (24 * 60 * 60 * 1000) - msSinceFed);
            const hoursLeft = Math.floor(msUntilHungry / (1000 * 60 * 60));
            const minsLeft = Math.floor((msUntilHungry % (1000 * 60 * 60)) / (1000 * 60));
            
            let hUnits = msSinceFed < 43200000 ? 2 : (msSinceFed < 86400000 ? 1 : 0);
            const isHungry = hUnits === 0;
            
            const currentXP = fish.current_xp || 0;
            const nextXP = fish.next_level_xp || 100;
            const xpPer = Math.min((currentXP / nextXP) * 100, 100);
            
            const rarityKey = fish.rarity.toLowerCase().replace(/ /g,'_');
            const rarityClass = fish.rarity.toLowerCase().replace(/ /g,'-');
            const imgFile = fish.image_name || `pez_${rarityKey}`;
            const displayName = fish.species_name || fish.rarity;
            
            const levelBonusPercent = (Math.min(fish.level, 5) - 1) * 5;
            const accAmount = Number(fish.accumulated_pearls || 0);
            const canClaim = accAmount > 0;

            card.innerHTML = `
                <div style="font-size:0.55rem; color:#64748b; text-align:right; margin-bottom:5px;">ID: #${fish.id.toString().slice(0,4)}</div>
                <img src="${RAW_BASE}${imgFile}.png?raw=true" class="img-pez-flotando ${isHungry ? 'hungry' : ''}">
                <div style="margin: 12px 0;">
                    <span class="rarity-text-${rarityClass}" style="font-size: 0.6rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; display: block;">${fish.rarity}</span>
                    <h4 style="margin: 2px 0 0 0; color: white; font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${displayName}</h4>
                </div>
                <div style="font-size:0.75rem; color:#94a3b8; font-weight:bold;">NIVEL ${fish.level}</div>
                <div class="main-xp-bar">
                    <div class="main-xp-fill" style="width:${xpPer}%"></div>
                    <span class="xp-text-overlay">${currentXP} / ${nextXP} XP</span>
                </div>
                <div class="main-energy-dots">
                    <div class="energy-dot-main ${hUnits >= 1 ? 'active' : ''}"></div>
                    <div class="energy-dot-main ${hUnits >= 2 ? 'active' : ''}"></div>
                </div>
                <div style="font-size: 0.6rem; color: ${isHungry ? '#ff4757' : '#60a5fa'}; margin-bottom: 10px;">
                    ${isHungry ? '¡SIN PRODUCCIÓN (HAMBRE)!' : `Hambre en: ${hoursLeft}h ${minsLeft}m`}
                </div>
                <div class="main-collect-box" style="flex-direction: column; gap: 4px; align-items: stretch; text-align: left;">
                    <div style="display:flex; justify-content:space-between; font-size: 0.7rem; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                        <span style="color:#64748b">Prod. día <span title="Bono de Nivel: +${levelBonusPercent}% aplicado" style="cursor:help; color:#3b82f6; font-size:0.75rem;">ⓘ</span></span>
                        <strong style="color:${isHungry ? '#64748b' : '#2ecc71'}; text-decoration:${isHungry ? 'line-through' : 'none'}">${PRL_ICON}${fish.daily_yield} $PRL</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size: 0.75rem; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px; padding-top:2px;">
                        <span style="color:#94a3b8">Producido:</span>
                        <strong style="color:white">${PRL_ICON}${accAmount.toFixed(2)} $PRL</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding-top:2px;">
                        <span style="color:#64748b; font-size:0.6rem;">Total Generado:</span>
                        <strong style="color:#94a3b8; font-size:0.6rem;">${PRL_ICON}${Number(fish.total_generated || 0).toFixed(1)} $PRL</strong>
                    </div>
                </div>
                <button class="btn-buy" 
                    style="background:${canClaim ? '#2ecc71' : '#475569'}; box-shadow: 0 4px 0 ${canClaim ? '#1a9e5a' : '#1e293b'}; margin-bottom:8px; cursor:${canClaim ? 'pointer' : 'not-allowed'}; opacity:${canClaim ? '1' : '0.6'};"
                    ${canClaim ? `onclick="claimPearls('${fish.id}')"` : ''}>
                    ${canClaim ? 'RECOLECTAR' : '0 $PRL'}
                </button>
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

    const eggImages = {
        'Arrecife': 'huevo_comun.png',
        'Abisal': 'huevo_raro.png',
        'Ancestral': 'huevo_legendario.png'
    };
    
    let currentEggImg = eggImages[fish.egg_type] || fish.image_name || 'huevo_comun.png';
    if (!currentEggImg.endsWith('.png')) currentEggImg += '.png';

    container.innerHTML = `
    <div style="text-align: center; padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <div class="egg-container" style="position: relative;">
            <img src="${RAW_BASE}${currentEggImg}?raw=true" 
                 class="${isReady ? 'egg-pulse egg-ready-glow' : ''}" 
                 style="width:85px; height:85px; object-fit:contain; 
                 transition: all 0.3s ease;">
            </div>

            <div style="width: 100%;">
                <strong style="color: #f8fafc; font-size: 0.9rem; display: block; margin-bottom: 2px;">Huevo ${fish.egg_type}</strong>
                <div style="font-size: 0.7rem; color: ${isReady ? '#fbbf24' : '#94a3b8'}; letter-spacing: 0.5px;">
                    ${isReady ? '✨ ¡LISTO PARA ECLOSIONAR! ✨' : `Eclosiona en: <span style="font-family:monospace;">${formatTime(msLeft)}</span>`}
                </div>
            </div>

            <button class="btn-buy" 
                style="width: 100%;
                       background: ${isReady ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#1e293b'}; 
                       color: white; 
                       border: none; 
                       padding: 10px; 
                       border-radius: 8px; 
                       font-weight: bold; 
                       cursor: ${isReady ? 'pointer' : 'default'};
                       box-shadow: ${isReady ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'};
                       transition: transform 0.2s;" 
                ${isReady ? `onclick="hatchFish('${fish.id}')"` : ''}>
                ${isReady ? 'ABRIR AHORA' : 'INCUBANDO'}
            </button>
        </div>
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
    if (isProcessingFeeding) return;
    isProcessingFeeding = true;

    try {
        const { data: egg, error: eggErr } = await supabase
            .from('user_fish')
            .select('egg_type')
            .eq('id', fishId)
            .single();
        
        if (eggErr || !egg) throw new Error("No se encontró el huevo");

        const roll = Math.random() * 100;
        let selectedRarity;

        if (egg.egg_type === 'Arrecife') {
            selectedRarity = (roll < 85) ? 'Comun' : 'Poco Comun';
        } else if (egg.egg_type === 'Abisal') {
            selectedRarity = (roll < 80) ? 'Raro' : 'Legendario';
        } else if (egg.egg_type === 'Ancestral') {
            selectedRarity = (roll < 90) ? 'Legendario' : 'Mitico';
        } else {
            selectedRarity = 'Comun';
        }

        // --- CAMBIO CLAVE AQUÍ ---
        // Usamos '%' a ambos lados y .trim() para forzar la coincidencia
        const { data: pool, error: poolError } = await supabase
            .from('fish_library')
            .select('*')
            .ilike('rarity', `%${selectedRarity.trim()}%`); 
        
        if (poolError || !pool || pool.length === 0) {
            // Si aún así falla, buscamos CUALQUIER pez para que no se trabe el juego
            console.warn("Fallo crítico de match. Intentando recuperación...");
            const { data: rescue } = await supabase.from('fish_library').select('*').limit(1);
            if (!rescue || rescue.length === 0) throw new Error("La tabla fish_library está vacía");
            var species = rescue[0];
        } else {
            var species = pool[Math.floor(Math.random() * pool.length)];
        }

        // Actualización en user_fish con los nombres de tus columnas confirmadas
        const { error: updateError } = await supabase.from('user_fish').update({
            is_egg: false,
            rarity: species.rarity,
            species_name: species.name,
            image_name: species.image_filename,
            daily_yield: species.base_yield,
            last_fed: new Date().toISOString(),
            current_xp: 0,
            level: 1,
            next_level_xp: 100,
            birth_date: new Date().toISOString()
        }).eq('id', fishId);

        if (updateError) throw updateError;

        showToast(`¡Ha nacido un ${species.name}!`, "✨");
        
        await loadProfile();
        const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('main-aquarium-grid'));

    } catch (err) {
        console.error("Error en hatchFish:", err);
        showToast(err.message, "❌");
    } finally {
        isProcessingFeeding = false;
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
    let currentLifeMs = lastFedDate.getTime() + (24 * 60 * 60 * 1000) - now.getTime();
    
    if (currentLifeMs >= (24 * 60 * 60 * 1000)) {
        showToast("El pez ya está lleno", "❌");
        document.getElementById('minigame-modal').style.display = 'none';
        isProcessingFeeding = false;
        return;
    }

    const foodCfg = FOOD_TYPES[foodType];
    
    // --- CÁLCULOS ---
    let limitPast = now.getTime() - (24 * 60 * 60 * 1000); 
    let baseTime = lastFedDate.getTime() < limitPast ? limitPast : lastFedDate.getTime();
    let newFedDate = new Date(baseTime + (12 * 60 * 60 * 1000));

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
    } else if (newXP > nextXP) {
        newXP = nextXP;
    }

    // --- TRADUCCIÓN PARA EL LOG ---
    const nombresComida = {
        'plancton': 'PLANCTON 🦠',
        'basic': 'ALGAS 🌿',
        'rare': 'CEBO 🦐'
    };
    const nombreBonito = nombresComida[foodType] || foodType.toUpperCase();
    const shortId = fishId.toString().slice(0, 4); // Recuperamos el ID corto

    // --- ACTUALIZACIÓN OPTIMISTA (INSTANTÁNEA) ---
    const fishIndex = allFish.findIndex(f => f.id == fishId);
    if (fishIndex !== -1) {
        allFish[fishIndex].level = newLevel;
        allFish[fishIndex].current_xp = newXP;
        allFish[fishIndex].next_level_xp = nextXP;
        allFish[fishIndex].last_fed = newFedDate.toISOString();
    }

    const mainGrid = document.getElementById('main-aquarium-grid');
    const panelBody = document.getElementById('panel-body');
    (mainGrid && mainGrid.style.display !== 'none') ? renderInventory(mainGrid) : renderInventory(panelBody);
    
    document.getElementById('minigame-modal').style.display = 'none';
    leveledUp ? showToast(`¡NIVEL SUBIDO! Nivel ${newLevel}`, '🆙') : showToast(`¡Pez alimentado!`, foodCfg.icon || '🥣');

    // --- PROCESAMIENTO EN PARALELO ---
    try {
        const promesas = [
            supabase.from('profiles').update({ [foodCfg.col]: profile[foodCfg.col] - 1 }).eq('id', currentUser.id),
            supabase.from('user_fish').update({ 
                last_fed: newFedDate.toISOString(),
                current_xp: newXP,
                level: newLevel,
                next_level_xp: nextXP
            }).eq('id', fishId),
            registrarLog('acuario_logs', {
                pez_id: fishId,
                accion: 'comida',
                monto_prl: 0,
                descripcion: `Alimentado con ${nombreBonito} (+${foodCfg.xp} XP). Pez ID #${shortId}`
            })
        ];

        if (leveledUp) {
            promesas.push(registrarLog('acuario_logs', {
                pez_id: fishId,
                accion: 'subida_nivel',
                monto_prl: 0,
                descripcion: `¡Nivel Subido! Ahora es Nivel ${newLevel}. Pez ID #${shortId}`
            }));
        }

        await Promise.all(promesas);
        loadProfile(); 

    } catch (err) {
        console.error("Error en la sincronización:", err);
    } finally {
        isProcessingFeeding = false; 
    }
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
                    <button class="btn-buy" onclick="if(confirm('¿Comprar Pack de Cañas por 15 $PRL?')) { buyItem('fishing_rods', 15, 2); } " style="min-width: 120px;">${PRL_ICON} 15 $PRL</button>
                </div>
            </div>

            <h4 style="color:var(--primary); margin:25px 0 15px 0; border-bottom:1px solid #eee; padding-bottom:5px;">Suministros</h4>
            <div class="shop-row food-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div class="shop-card">
                    <div style="font-size:2rem;">${FOOD_TYPES.plancton.icon}</div>
                    <h5>Plancton (x10)</h5>
                    <p style="font-size:0.75rem; color:#666;">+${FOOD_TYPES.plancton.xp} XP por unidad</p>
                    <button class="btn-buy" onclick="if(confirm('¿Comprar 10x Plancton por 20 $PRL?')) { buyFood('plancton', 20, 10); } ">${PRL_ICON} 20 $PRL</button>
                </div>
                <div class="shop-card">
                    <div style="font-size:2rem;">${FOOD_TYPES.basic.icon}</div>
                    <h5>Pack Algas (x10)</h5>
                    <p style="font-size:0.75rem; color:#666;">+${FOOD_TYPES.basic.xp} XP por unidad</p>
                    <button class="btn-buy" onclick="if(confirm('¿Comprar 10x Algas por 50 $PRL?')) { buyFood('basic', 50, 10); } ">${PRL_ICON} 50 $PRL</button>
                </div>
                <div class="shop-card">
                    <div style="font-size:2rem;">${FOOD_TYPES.rare.icon}</div>
                    <h5>Cebo Especial (x5)</h5>
                    <p style="font-size:0.75rem; color:#666;">+${FOOD_TYPES.rare.xp} XP por unidad</p>
                    <button class="btn-buy" onclick="if(confirm('¿Comprar 5x Cebos por 250 $PRL?')) { buyFood('rare', 250, 5); } ">${PRL_ICON} 250 $PRL</button>
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

    // --- REGISTRO EN EL HISTORIAL ---
    const nombresComida = { 'plancton': 'PLANCTON 🦠', 'basic': 'ALGAS 🌿', 'rare': 'CEBO 🦐' };
    await registrarLog('acuario_logs', {
        accion: 'tienda',
        monto_prl: -cost,
        descripcion: `Compró ${quantity}x ${nombresComida[type] || type.toUpperCase()}`
    });

    await loadProfile();
    await checkFirstInvestment(); 
    const body = document.getElementById('panel-body');
    if (body) renderShop(body);
}

async function buyEgg(type, cost) {
    try {
        // 1. Obtener balance del perfil
        const { data: profile } = await supabase.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
        const costoNumerico = Number(cost.toString().replace(/,/g, ''));
        if (profile.pearls_balance < costoNumerico) return showToast("No tienes suficientes perlas ⚪", "❌");

        // 2. BUSCAR LOS DATOS EN TU LIBRERÍA
        // Buscamos por el nombre que configuramos (Huevo Arrecife, etc.)
        const { data: libData, error: libError } = await supabase
            .from('fish_library') // Ajusta el nombre si tu tabla se llama distinto
            .select('*')
            .eq('name', `Huevo ${type}`)
            .single();

        if (libError || !libData) {
            console.error("No se encontró el huevo en la librería:", libError);
            return showToast("Error: Configuración de huevo no encontrada", "❌");
        }

        // 3. Configurar tiempo de eclosión
        let hatchHours = (type === 'Arrecife') ? 3 : (type === 'Abisal' ? 6 : 12);
        const hatchDate = new Date();
        hatchDate.setHours(hatchDate.getHours() + hatchHours);

        // 4. Descontar balance
        await supabase.from('profiles').update({ pearls_balance: profile.pearls_balance - costoNumerico }).eq('id', currentUser.id);

        // 5. INSERTAR EN USER_FISH (Usando los datos de la librería)
        const { error: insertError } = await supabase.from('user_fish').insert([{
            user_id: currentUser.id,
            is_egg: true,
            egg_type: type,
            egg_hatch_time: hatchDate.toISOString(),
            // Aquí mapeamos las columnas de la librería a tu tabla de usuario
            rarity: libData.rarity,         
            species_name: libData.name,    
            image_name: libData.image_filename, // huevo_comun, huevo_raro, etc.
            level: 1,
            daily_yield: 0,
            current_xp: 0,
            next_level_xp: 100,
            accumulated_pearls: 0,
            total_generated: 0,
            last_fed: new Date().toISOString(),
            birth_date: new Date().toISOString()
        }]);

        if (insertError) throw insertError;

        showToast(`¡Has comprado un Huevo de ${type}!`, "🥚");

        // 6. Refrescar datos y cerrar panel
        await loadProfile();
        const { data: updatedFish } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = updatedFish;

        // Cerrar panel lateral
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) sidePanel.classList.remove('open');

        // Renderizar acuario
        const mainGrid = document.getElementById('main-aquarium-grid');
        if (mainGrid) renderInventory(mainGrid);

    } catch (err) {
        console.error("Error en buyEgg:", err);
        showToast("Error al procesar la compra", "❌");
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

        const prlImg = `${RAW_BASE}perla_economia.png?raw=true`;

        // --- REGISTRO EN EL HISTORIAL (SIN COLUMNA ICON) ---
        await registrarLog('acuario_logs', {
            pez_id: fishId,
            accion: 'recoleccion',
            monto_prl: amountToClaim,
            // Quitamos 'icon' para evitar el error 400
            descripcion: `Recolección de $PRL Pez ${fish.rarity} (#${fishId.toString().slice(0,4)})`
        });

        const iconHtml = `<img src="${prlImg}" style="width:20px; height:20px; vertical-align:middle;">`;
        showToast(`¡Has recolectado ${amountToClaim.toFixed(2)} $PRL!`, iconHtml);

        await loadProfile();
        const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;

        const mainGrid = document.getElementById('main-aquarium-grid');
        const panelBody = document.getElementById('panel-body');

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

    // 2. Determinar si la pesca es exitosa y qué recompensa recibe
    const rand = Math.random() * 100;
    let rewardCol = null;
    let rewardName = "Nada (Intento fallido)";
    let logIcon = "💨"; // Icono por defecto para cuando no pesca nada

    // Lógica de probabilidades (incluyendo fallo)
    if (rand < 25) { 
        // 25% de probabilidad de NO pescar nada
        rewardCol = null;
        rewardName = "Nada";
        logIcon = "❌";
    } else if (rand < 65) { // (65-25) = 40%
        rewardCol = 'marine_trash'; 
        rewardName = "Restos Marinos";
        logIcon = "🗑️";
    } else if (rand < 85) { // 20%
        rewardCol = 'food_plancton'; 
        rewardName = "Plancton";
        logIcon = "🦠";
    } else if (rand < 95) { // 10%
        rewardCol = 'food_basic'; 
        rewardName = "Algas";
        logIcon = "🌿";
    } else { // 5%
        rewardCol = 'food_rare'; 
        rewardName = "Cebo Raro";
        logIcon = "💎";
    }

    // 3. Preparar objeto de actualización
    const updateData = {
        fishing_rods: Math.max(0, (profile.fishing_rods || 0) - 1),
        fishing_attempts_today: (profile.fishing_attempts_today || 0) + 1
    };

    // Si hubo premio, lo sumamos al objeto de actualización
    if (rewardCol) {
        updateData[rewardCol] = (profile[rewardCol] || 0) + 1;
    }

    const { error: updateError } = await supabase.from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);

    if (updateError) {
        alert("Hubo un problema al guardar tu progreso.");
        console.error(updateError);
        return;
    }

    // --- REGISTRO EN EL HISTORIAL (LOGS) ---
    const esExito = rewardCol !== null;
    await registrarLog('acuario_logs', {
        accion: 'pesca',
        monto_prl: 0, // La pesca no da perlas directamente
        icon: logIcon,
        descripcion: esExito 
            ? `Pesca exitosa: Encontraste ${rewardName}` 
            : `Pesca fallida: No has encontrado nada`
    });

    // 4. Feedback al usuario y refresco de interfaz
    const mensajeAlerta = esExito 
        ? `¡Buena pesca! 🎣\nEncontraste: ${rewardName}.` 
        : `¡Mala suerte! 🌊\nNo has pescado nada esta vez.`;
    
    alert(`${mensajeAlerta}\nIntentos hoy: ${(profile.fishing_attempts_today || 0) + 1}/4`);
    
    closeFishingModal();
    
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
            
            // --- REGISTRO EN EL HISTORIAL (NUEVO) ---
            await registrarLog('finanzas_logs', {
                tipo: 'deposito',
                monto_usdt: data.added,
                status: 'completado',
                detalles: 'Depósito USDT verificado en la red BEP20'
            });
            
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
function showToast(message, icon = '✨') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    
    container.appendChild(toast);

    // Eliminar del DOM después de que termine la animación
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
async function checkFirstInvestment() {
    // Solo actualiza si first_investment_at es NULL
    const { data: profile } = await supabase
        .from('profiles')
        .select('first_investment_at')
        .eq('id', currentUser.id)
        .single();

    if (!profile.first_investment_at) {
        console.log(">>> [LOG] Primera inversión detectada. Activando reloj de retiro...");
        await supabase
            .from('profiles')
            .update({ first_investment_at: new Date().toISOString() })
            .eq('id', currentUser.id);
    }
}
async function openWithdrawModal() {
    const container = document.getElementById('panel-body');
    const panel = document.getElementById('content-panel');
    const title = document.getElementById('panel-title');

    if (!container || !panel) return;

    title.innerText = "Retirar Fondos";
    panel.style.display = 'block';
    container.innerHTML = `<p style="text-align:center; padding:20px; color:#666;">Consultando balance y seguridad...</p>`;

    try {
        // Consultamos el SQL que me pasaste
        const { data: tax } = await supabase.rpc('get_withdrawal_tax', { user_uuid: currentUser.id });
        const { data: profile } = await supabase.from('profiles').select('balance_usdt').eq('id', currentUser.id).single();

        const currentBalance = profile?.balance_usdt || 0;
        const currentTax = tax || 50;

        container.innerHTML = `
            <div class="withdraw-wrapper" style="padding: 10px 15px; text-align: center; color: #333;">
                <h3 style="color:var(--primary); margin-bottom:15px; font-size: 1.1rem;">Retirar Fondos (USDT)</h3>
                
                <div style="background: #f8f9fa; padding: 12px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #ddd;">
                    <p style="margin: 0; font-size: 0.85rem; color: #555;">Balance disponible:</p>
                    <p style="margin: 2px 0; font-size: 1.2rem; font-weight: bold; color: #2ecc71;">${currentBalance} USDT</p>
                    <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: ${currentTax > 10 ? '#e67e22' : '#27ae60'};">
                        Impuesto actual: <strong>${currentTax}%</strong>
                    </p>
                </div>

                <div style="text-align: left; max-width: 100%; margin: 0 auto;">
                    <label style="font-size: 0.8rem; font-weight: bold; color: #666;">MONTO A RETIRAR (MÍN. 5):</label>
                    <input type="number" id="withdraw-amount" data-tax="${currentTax}" placeholder="0.00" oninput="updateWithdrawCalc()" 
                           style="width: 100%; padding: 10px; margin: 5px 0 12px 0; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; color:#000; box-sizing: border-box;">

                    <label style="font-size: 0.8rem; font-weight: bold; color: #666;">BILLETERA DESTINO (BEP20):</label>
                    <input type="text" id="withdraw-address" placeholder="0x..." 
                           style="width: 100%; padding: 10px; margin: 5px 0 12px 0; border-radius: 8px; border: 1px solid #ccc; font-size: 0.8rem; color:#000; box-sizing: border-box;">
                    
                    <div id="withdraw-summary" style="margin-top: 5px; padding: 10px; background: #f0f7ff; border-radius: 8px; display: none; border: 1px solid #d0e3ff; font-size: 0.85rem;"></div>

                    <div style="margin-top: 10px; padding: 10px; background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; border-radius: 4px;">
                        <p style="margin: 0; font-size: 0.75rem; color: #1e40af; line-height: 1.3;">
                            <strong>ℹ️ Info:</strong> El impuesto baja 5% cada 24h. Suelo: 5% fijo.
                        </p>
                    </div>

                    <button onclick="confirmWithdrawal()" class="btn-buy" id="btn-confirm-withdraw" 
                            style="width: 100%; margin-top: 15px; margin-bottom: 5px; padding: 14px; background: #ef4444; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">
                        CONFIRMAR RETIRO
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Error al cargar datos.</p>`;
    }
}

async function confirmWithdrawal() {
    const amountInput = document.getElementById('withdraw-amount');
    const addressInput = document.getElementById('withdraw-address');
    const btn = document.getElementById('btn-confirm-withdraw');

    if (!amountInput || !addressInput || !btn) return;

    const amount = parseFloat(amountInput.value);
    const address = addressInput.value.trim();

    // VALIDACIÓN RESTAURADA A 5 USDT
    if (isNaN(amount) || amount < 5) {
        return showToast("Monto mínimo 5 USDT", "❌");
    }
    
    if (!address.startsWith('0x') || address.length < 42) {
        return showToast("Billetera inválida", "❌");
    }

    // Bloqueo de seguridad para evitar doble gasto
    btn.disabled = true;
    btn.innerText = "PROCESANDO...";

    try {
        // Invocamos la Edge Function de Deno
        const { data, error } = await supabase.functions.invoke('process-withdrawal', {
            body: { 
                user_id: currentUser.id, 
                amount: amount, 
                address: address 
            }
        });

        // Error de red o de invocación
        if (error) throw error;
        
        // Error devuelto específicamente por la lógica de la función (ej. Saldo insuficiente)
        if (data && data.error) throw new Error(data.error);

        // --- REGISTRO EN EL HISTORIAL (NUEVO) ---
        await registrarLog('finanzas_logs', {
            tipo: 'retiro',
            monto_usdt: -amount, // Se guarda en negativo porque es una salida
            status: 'completado',
            detalles: `Retiro enviado a: ${address.slice(0,6)}...${address.slice(-4)}`
        });

        // Éxito: El dinero ya está en camino
        showToast("¡Retiro enviado con éxito!", "✅");
        
        const panel = document.getElementById('content-panel');
        if (panel) panel.style.display = 'none';

        // Recargamos el perfil para actualizar el saldo visualmente tras el retiro
        if (typeof loadProfile === 'function') await loadProfile();

    } catch (err) {
        // Muestra el error real (venga de Supabase o de la lógica de Deno)
        showToast(err.message || "Error en el servidor", "❌");
        
        // Reactivamos el botón solo si falló para que el usuario pueda corregir
        btn.disabled = false;
        btn.innerText = "CONFIRMAR RETIRO";
    }
}
function updateWithdrawCalc() {
    const input = document.getElementById('withdraw-amount');
    const summary = document.getElementById('withdraw-summary');
    
    // Leemos el tax que guardaremos en el dataset del input
    const taxPercent = parseFloat(input.dataset.tax) || 50;
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) {
        summary.style.display = 'none';
        return;
    }

    const fee = (amount * (taxPercent / 100)).toFixed(2);
    const neto = (amount - fee).toFixed(2);

    summary.style.display = 'block';
    summary.innerHTML = `
        <p style="margin: 0; font-size: 0.85rem; color: #666;">Impuesto (${taxPercent}%): <strong style="color: #e74c3c;">-${fee} USDT</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 1rem; color: #2ecc71;">Recibirás: <strong>${neto} USDT</strong></p>
    `;
}
// --- DISPARADOR DE INICIO SEGURO ---
function bootGame() {
    // 1. Buscamos el botón
    const aquariumBtn = Array.from(document.querySelectorAll('.nav-btn'))
                             .find(btn => btn.innerText.includes('Acuario'));

    // 2. Solo arrancamos si: Existe el botón Y el usuario cargó Y los peces ya están en memoria
    if (aquariumBtn && currentUser && allFish.length >= 0) {
        console.log("Todo listo. Ejecutando vista inicial...");
        switchTab('acuario', aquariumBtn);
    } else {
        // Si la base de datos de Supabase aún no responde, reintenta en 100ms
        setTimeout(bootGame, 100);
    }
}

// Iniciamos la vigilancia
bootGame();
async function renderHistory(container) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#3b82f6;">⌛ Cargando tus registros...</div>`;

    try {
        // 1. Consultar ambas tablas en paralelo
        const [finanzasRes, acuarioRes] = await Promise.all([
            supabase.from('finanzas_logs').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20),
            supabase.from('acuario_logs').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30)
        ]);

        if (finanzasRes.error) throw finanzasRes.error;
        if (acuarioRes.error) throw acuarioRes.error;

        const fLogs = finanzasRes.data || [];
        const aLogs = acuarioRes.data || [];

        container.innerHTML = `
            <div style="padding: 15px; display: flex; flex-direction: column; gap: 25px;">
                
                <div>
                    <h3 style="color: #1e293b; margin-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                        💰 Movimientos de USDT
                    </h3>
                    <div style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                        ${fLogs.length === 0 ? '<p style="padding:20px; color:#94a3b8; text-align:center;">No hay movimientos de dinero aún.</p>' : 
                        fLogs.map(log => `
                            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 0.85rem; font-weight: bold; color: ${log.tipo === 'deposito' ? '#2ecc71' : '#e74c3c'};">
                                        ${log.tipo.toUpperCase()}
                                    </div>
                                    <div style="font-size: 0.7rem; color: #94a3b8;">${new Date(log.created_at).toLocaleString()}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: bold; color: #1e293b;">${log.monto_usdt > 0 ? '+' : ''}${log.monto_usdt} USDT</div>
                                    <div style="font-size: 0.65rem; color: #64748b;">${log.detalles || ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h3 style="color: #1e293b; margin-bottom: 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                        🐠 Actividad de los Peces
                    </h3>
                    <div style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                        ${aLogs.length === 0 ? '<p style="padding:20px; color:#94a3b8; text-align:center;">No hay actividad registrada.</p>' : 
                        aLogs.map(log => {
                            let icon = "📝";
                            if(log.accion === 'recoleccion') icon = "✨";
                            if(log.accion === 'comida') icon = "🥣";
                            if(log.accion === 'subida_nivel') icon = "🆙";
                            if(log.accion === 'tienda') icon = "🛍️";

                            // --- TRADUCTOR VISUAL (Limpia "BASIC" por "ALGAS", etc.) ---
                            let descripcionLimpia = log.descripcion
                                .replace('BASIC', 'ALGAS 🌿')
                                .replace('PLANCTON', 'PLANCTON 🦠')
                                .replace('RARE', 'CEBO 🦐');
                            
                            return `
                            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 1.2rem;">${icon}</span>
                                    <div>
                                        <div style="font-size: 0.8rem; font-weight: 600; color: #475569;">${descripcionLimpia}</div>
                                        <div style="font-size: 0.7rem; color: #94a3b8;">${new Date(log.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    ${log.monto_prl !== 0 ? `
                                        <div style="font-weight: bold; color: ${log.monto_prl > 0 ? '#3b82f6' : '#e74c3c'};">
                                            ${log.monto_prl > 0 ? '+' : ''}${log.monto_prl} $PRL
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;

    } catch (err) {
        console.error("Error al renderizar historial:", err);
        container.innerHTML = `<div style="padding:20px; color:red;">Error al cargar el historial.</div>`;
    }
}
