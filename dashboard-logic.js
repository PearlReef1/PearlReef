const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allFish = [];
let isProcessingFeeding = false; 
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";

// --- CONFIGURACIÓN ESTILO COIN TO FISH ---
const FEED_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 Horas base
const MAX_HUNGER_UNITS = 2; 

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
        
        const foodBasicEl = document.getElementById('food-basic-count');
        const foodRareEl = document.getElementById('food-rare-count');
        
        if (foodBasicEl) foodBasicEl.innerText = data.food_basic || 0;
        if (foodRareEl) foodRareEl.innerText = data.food_rare || 0;
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

    if (tab === 'inventario') render(body);
    if (tab === 'tienda') renderShop(body);
}

function renderInventory(container) {
    const now = new Date();
    
    let totalDailyProd = 0;
    let totalPendingClaim = 0;
    let hungryFishCount = 0;

    allFish.forEach(f => {
        if (!f.is_egg) {
            // FÓRMULA DE PRODUCCIÓN REAL (Incluyendo Niveles)
            const levelBonus = 1 + ((f.level - 1) * 0.05);
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

    // Encabezado
    container.innerHTML = `
        <div style="background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
            <div>
                <small style="color: #64748b; font-size: 0.65rem; display: block; text-transform: uppercase;">Prod / Día</small>
                <strong style="color: #2ecc71; font-size: 0.9rem;">⚪ ${totalDailyProd.toFixed(0)}</strong>
            </div>
            <div style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                <small style="color: #64748b; font-size: 0.65rem; display: block; text-transform: uppercase;">Por Recoger</small>
                <strong style="color: #3b82f6; font-size: 0.9rem;">⚪ ${totalPendingClaim.toFixed(2)}</strong>
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
            const levelBonus = 1 + ((fish.level - 1) * 0.05);
            const currentYield = (fish.daily_yield * levelBonus).toFixed(2);
            const xpPercent = Math.min(((fish.current_xp || 0) / (fish.next_level_xp || 100)) * 100, 100);

            div.innerHTML = `
                <div style="text-align: center; position: relative; min-width: 70px;">
                    <!-- ID CORREGIDO: PRIMEROS 4 CARACTERES -->
                    <div style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); background: #334155; color: white; font-size: 0.55rem; padding: 2px 6px; border-radius: 4px; font-family: monospace; z-index: 2; border: 1px solid rgba(255,255,255,0.2);">
                        #${fish.id.toString().slice(0, 4)}
                    </div>
                    <img src="${RAW_BASE}pez_${rarityKey}.png" style="width:60px; height:60px; object-fit:contain; filter: ${!isProducing ? 'grayscale(1)' : 'none'};">
                </div>
                
                <div style="flex-grow:1; min-width: 0;">
                    <div style="display: flex; flex-direction: column; margin-bottom: 4px;">
                        <strong class="rarity-text-${rarityClass}" style="font-size: 0.9rem;">${fish.rarity}</strong>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.75rem; color: #64748b;">Nivel ${fish.level}</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${isProducing ? '#2ecc71' : '#e63946'};"></div>
                                <span style="font-size: 0.6rem; color: ${isProducing ? '#2ecc71' : '#e63946'}; font-weight: bold;">${isProducing ? 'PRODUCIENDO' : 'HAMBRIENTO'}</span>
                            </div>
                        </div>
                    </div>

                    <div style="width: 100%; height: 4px; background: #f1f5f9; border-radius: 2px; margin-bottom: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                        <div style="width: ${xpPercent}%; height: 100%; background: linear-gradient(90deg, #a855f7, #d946ef);"></div>
                    </div>

                    <div style="font-size: 0.75rem; color: #475569; margin-bottom: 6px;">
                        Prod: <strong style="color: #1e293b;">${currentYield} PRL</strong>
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
                            <strong style="font-size: 0.8rem; color: #0f172a;">⚪ ${Number(fish.accumulated_pearls).toFixed(2)}</strong>
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

    if ((profile.food_basic || 0) <= 0 && (profile.food_rare || 0) <= 0) {
        alert("¡No tienes comida! Ve a la tienda.");
        switchTab('tienda', document.querySelector('[onclick*="tienda"]'));
        return;
    }
    sessionStorage.setItem('feeding_fish_id', fishId);
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function completeFeeding() {
    if (isProcessingFeeding) return;
    isProcessingFeeding = true; 

    const fishId = sessionStorage.getItem('feeding_fish_id');
    const { data: profile } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    const { data: fish } = await client.from('user_fish').select('*').eq('id', fishId).single();

    // 1. Determinar nivel de hambre actual
    const now = new Date();
    const lastFedDate = fish.last_fed ? new Date(fish.last_fed) : new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    // Calculamos cuánta "vida" le queda (máximo 24h)
    let currentLifeMs = Math.max(0, lastFedDate.getTime() + (24 * 60 * 60 * 1000) - now.getTime());
    
    // Si ya tiene más de 12h de reserva (es decir, le queda solo 1 slot libre), 
    // al alimentar llegamos al tope de 24h.
    if (currentLifeMs >= (24 * 60 * 60 * 1000)) {
        alert("El pez ya está lleno.");
        document.getElementById('minigame-modal').style.display = 'none';
        isProcessingFeeding = false;
        return;
    }

    // 2. Descontar comida (1 unidad)
    let foodCol = profile.food_basic > 0 ? 'food_basic' : 'food_rare';
    let xpGain = foodCol === 'food_basic' ? 10 : 25;
    await client.from('profiles').update({ [foodCol]: profile[foodCol] - 1 }).eq('id', currentUser.id);

    // 3. Nueva Lógica: Sumar 12 horas a su estado actual
    // Si estaba muerto/hambriento, empezamos desde 'ahora' + 12h.
    // Si tenía 1 barra, le sumamos 12h más para tener las 2.
    let baseTime = lastFedDate.getTime() < (now.getTime() - (24 * 60 * 60 * 1000)) 
                   ? now.getTime() - (12 * 60 * 60 * 1000) 
                   : lastFedDate.getTime();
                   
    let newFedDate = new Date(baseTime + (12 * 60 * 60 * 1000));

    // 4. Calcular XP y Level Up
    let newXP = (fish.current_xp || 0) + xpGain;
    let newLevel = fish.level || 1;
    let nextXP = fish.next_level_xp || 100;
    if (newXP >= nextXP) { newLevel++; newXP = 0; nextXP = Math.floor(nextXP * 1.5); }

    await client.from('user_fish').update({ 
        last_fed: newFedDate.toISOString(),
        current_xp: newXP,
        level: newLevel,
        next_level_xp: nextXP
    }).eq('id', fishId);

    document.getElementById('minigame-modal').style.display = 'none';
    await loadProfile();
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data;
    renderInventory(document.getElementById('panel-body'));
    
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
    container.innerHTML = `
        <div class="shop-wrapper">
            <h4 style="color:var(--primary); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Mercado de Huevos</h4>
            <div class="shop-row eggs-row">
                ${renderEggCard('Arrecife', '1,000', 'Común (85%) / Poco Común (15%)', '3h')}
                ${renderEggCard('Abisal', '2,500', 'Raro (80%) / Legendario (20%)', '6h')}
                ${renderEggCard('Ancestral', '6,000', 'Legendario (90%) / Mítico (10%)', '12h')}
            </div>
            <h4 style="color:var(--primary); margin:25px 0 15px 0; border-bottom:1px solid #eee; padding-bottom:5px;">Suministros</h4>
            <div class="shop-row food-row">
                <div class="shop-card">
                    <div style="font-size:2rem;">🌿</div>
                    <h5>Pack Algas (x10)</h5>
                    <p style="font-size:0.75rem; color:#666;">+10 XP por unidad</p>
                    <button class="btn-buy" onclick="buyFood('basic', 100, 10)">💰 100 PRL</button>
                </div>
                <div class="shop-card">
                    <div style="font-size:2rem;">🦐</div>
                    <h5>Cebo Especial (x5)</h5>
                    <p style="font-size:0.75rem; color:#666;">+25 XP por unidad</p>
                    <button class="btn-buy" onclick="buyFood('rare', 250, 5)">💰 250 PRL</button>
                </div>
            </div>
        </div>
    `;
}

function renderEggCard(type, price, odds, time) {
    const pValue = price.replace(',', '');
    return `
        <div class="shop-card">
            <img src="${RAW_BASE}pez_huevo.png" width="50" style="margin-bottom:10px;">
            <h5>Huevo ${type}</h5>
            <p style="font-size:0.7rem; color:#666; margin-bottom:8px;">${odds}<br>Eclosión: ${time}</p>
            <button class="btn-buy" onclick="buyEgg('${type}', ${pValue})">💰 ${price} PRL</button>
        </div>
    `;
}

async function buyFood(type, cost, quantity) {
    if (isProcessingFeeding) return;
    const { data: profile } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("No tienes suficientes perlas ⚪");

    const col = type === 'basic' ? 'food_basic' : 'food_rare';
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
        if (roll < 85) { rarity = 'Comun'; yieldAmount = 38; }
        else { rarity = 'Poco Comun'; yieldAmount = 55; }
    } else if (type === 'Abisal') {
        if (roll < 80) { rarity = 'Raro'; yieldAmount = 120; }
        else { rarity = 'Legendario'; yieldAmount = 320; }
        hatchHours = 6;
    } else if (type === 'Ancestral') {
        if (roll < 90) { rarity = 'Legendario'; yieldAmount = 320; }
        else { rarity = 'Mitico'; yieldAmount = 500; }
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

async function claimPearls(fishId) {
    if (isProcessingFeeding) return;
    isProcessingFeeding = true;

    try {
        // 1. Obtener datos actuales del pez
        const { data: fish, error: fishError } = await client.from('user_fish').select('*').eq('id', fishId).single();
        
        if (fishError || !fish || Number(fish.accumulated_pearls) <= 0) {
            isProcessingFeeding = false;
            return;
        }

        // 2. Obtener balance actual del perfil
        const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
        
        const amountToClaim = Number(fish.accumulated_pearls);
        const newBalance = Number(profile.pearls_balance) + amountToClaim;
        
        // 3. Actualizar Perfil (Balance de perlas)
        const { error: profileErr } = await client.from('profiles').update({ 
            pearls_balance: newBalance 
        }).eq('id', currentUser.id);

        if (profileErr) throw profileErr;

        // 4. Actualizar Pez (Resetear acumulado y sumar al total de vida)
        const { error: updateError } = await client.from('user_fish').update({ 
            accumulated_pearls: 0, 
            total_generated: (Number(fish.total_generated) || 0) + amountToClaim,
            last_claim: new Date().toISOString() 
        }).eq('id', fishId);

        if (updateError) throw updateError;

        // 5. Refrescar interfaz
        await loadProfile();
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));

    } catch (err) {
        console.error("Error en recolección:", err);
        alert("Error al procesar la recolección. Revisa la consola.");
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
