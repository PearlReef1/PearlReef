const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allFish = [];
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";
const FEED_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Horas

// --- CONFIGURACIÓN DE ASSETS ---
const AQUARIUM_BG_IMG = 'fondo_acuario.jpg';

window.onload = async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;
    
    await loadProfile();
    await initAquarium();
    
    // Actualización de contadores cada segundo
    setInterval(updateAquariumState, 1000);
};

async function loadProfile() {
    const { data } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) {
        document.getElementById('pearl-balance').innerText = data.pearls_balance;
        document.getElementById('user-name').innerText = data.username || "Jugador";
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
        container.style.backgroundRepeat = 'no-repeat';

        allFish.forEach(fish => {
            if (!fish.is_egg) createSwimmingFish(fish);
        });
    }
}

// --- LÓGICA DE PECES ---
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
    const rect = element.getBoundingClientRect();
    const currentXPercent = (rect.left / window.innerWidth) * 100;
    const img = element.querySelector('.fish-img');
    
    if (img) {
        if (targetX > currentXPercent) { img.style.transform = "scaleX(1)"; } 
        else { img.style.transform = "scaleX(-1)"; }
    }
    
    element.style.left = targetX + "vw";
    element.style.top = targetY + "vh";
    setTimeout(() => moveFishRandomly(element), 8000);
}

// --- GESTIÓN DE INTERFAZ ---
function switchTab(tab, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
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
    container.innerHTML = '<h3>Gestión de Especies</h3>';
    const now = new Date();

    if (allFish.length === 0) {
        container.innerHTML += '<p style="text-align:center; color:#666; margin-top:20px;">No tienes especies aún. Ve a la tienda.</p>';
        return;
    }

    allFish.forEach(fish => {
        const div = document.createElement('div');
        div.className = 'mini-card';
        const isEgg = fish.is_egg;
        const rarityFile = fish.rarity.toLowerCase().replace(/\s+/g, '_');
        
        let actionHTML = '';
        let statusHTML = '';

        if (isEgg) {
            const hatchTime = new Date(fish.egg_hatch_time);
            const remaining = hatchTime - now;
            if (remaining <= 0) {
                statusHTML = '<span class="ready-text">🐣 ¡LISTO PARA NACER!</span>';
                actionHTML = `<button class="btn-hatch-mini" onclick="hatchFish('${fish.id}')">ABRIR</button>`;
            } else {
                statusHTML = `<span class="timer-display">Incubando: ${formatTime(remaining)}</span>`;
                actionHTML = `<button class="btn-disabled" disabled>EN PROCESO</button>`;
            }
        } else {
            const lastFed = fish.last_fed ? new Date(fish.last_fed) : new Date(0);
            const canFeed = (now - lastFed) >= FEED_COOLDOWN_MS;
            
            // Barra de progreso visual para el nivel
            const currentXP = fish.current_xp || 0;
            const nextXP = fish.next_level_xp || 100;
            const progressPercent = Math.min((currentXP / nextXP) * 100, 100);

            statusHTML = `
                Nivel: <strong>${fish.level || 1}</strong> | Prod: <strong>${fish.daily_yield} PRL</strong>
                <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; margin-top:5px; overflow:hidden;">
                    <div style="width:${progressPercent}%; height:100%; background:#4ade80; border-radius:3px; transition: width 0.5s;"></div>
                </div>
                <small style="font-size:0.65rem; color:#64748b">XP: ${currentXP} / ${nextXP}</small>
            `;

            if (canFeed) {
                actionHTML = `<button class="btn-feed-mini" onclick="startFeeding('${fish.id}')">ALIMENTAR</button>`;
            } else {
                const nextFeed = new Date(lastFed.getTime() + FEED_COOLDOWN_MS);
                actionHTML = `<div class="cooldown-tag">Próximo:<br>${formatTime(nextFeed - now)}</div>`;
            }
        }

        div.innerHTML = `
            <img src="${RAW_BASE}${isEgg ? 'pez_huevo.png' : 'pez_'+rarityFile+'.png'}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
            <div style="flex-grow:1">
                <strong style="color:var(--primary)">${fish.rarity}</strong> <small>#${fish.id.substring(0,4)}</small><br>
                <div style="font-size: 0.85rem; margin-top:4px;">${statusHTML}</div>
            </div>
            <div class="action-zone">${actionHTML}</div>
        `;
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

// --- ACCIONES DE JUEGO ---
async function hatchFish(fishId) {
    const { error } = await client.from('user_fish').update({ is_egg: false }).eq('id', fishId);
    if (!error) {
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        await initAquarium();
        renderInventory(document.getElementById('panel-body'));
    }
}

function startFeeding(fishId) {
    sessionStorage.setItem('feeding_fish_id', fishId);
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function completeFeeding() {
    const fishId = sessionStorage.getItem('feeding_fish_id');
    
    // 1. Obtener datos actuales del pez
    const { data: fish } = await client.from('user_fish').select('*').eq('id', fishId).single();
    if (!fish) return;

    // 2. Lógica de XP y Nivel
    const xpGained = 25; // XP por cada alimentación
    let newXp = (fish.current_xp || 0) + xpGained;
    let newLevel = fish.level || 1;
    let newNextLevelXp = fish.next_level_xp || 100;
    let newYield = fish.daily_yield;

    if (newXp >= newNextLevelXp) {
        newLevel += 1;
        newXp = 0; // Reinicia XP al subir de nivel
        newNextLevelXp = Math.floor(newNextLevelXp * 1.5); // Aumenta dificultad 50%
        newYield = Math.floor(newYield * 1.05); // Aumenta producción 5%
        alert(`¡Felicidades! Tu pez subió al Nivel ${newLevel}. Su producción aumentó a ${newYield} PRL.`);
    }

    // 3. Actualizar en Supabase
    const { error } = await client.from('user_fish')
        .update({ 
            last_fed: new Date().toISOString(),
            current_xp: newXp,
            level: newLevel,
            next_level_xp: newNextLevelXp,
            daily_yield: newYield
        })
        .eq('id', fishId);

    if (!error) {
        document.getElementById('minigame-modal').style.display = 'none';
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));
        alert("¡Pez alimentado! Has ganado XP y recolectado tus perlas.");
    }
}

function updateAquariumState() {
    const panel = document.getElementById('content-panel');
    const title = document.getElementById('panel-title');
    if (panel && panel.style.display !== 'none' && title.innerText === 'Inventario') {
        renderInventory(document.getElementById('panel-body'));
    }
}

// --- TIENDA ---
function renderShop(container) {
    container.innerHTML = `
        <div class="shop-item">
            <h4>Huevo Arrecife</h4>
            <p>💰 1,000 PRL<br><small>Común (85%) / Poco Común (15%)</small></p>
            <button class="btn-buy" onclick="buyEgg('Arrecife', 1000)">Comprar</button>
        </div>
        <div class="shop-item">
            <h4>Huevo Abisal</h4>
            <p>💰 2,500 PRL<br><small>Raro (80%) / Legendario (20%)</small></p>
            <button class="btn-buy" onclick="buyEgg('Abisal', 2500)">Comprar</button>
        </div>
        <div class="shop-item">
            <h4>Huevo Ancestral</h4>
            <p>💰 6,000 PRL<br><small>Legendario (90%) / Mítico (10%)</small></p>
            <button class="btn-buy" onclick="buyEgg('Ancestral', 6000)">Comprar</button>
        </div>
    `;
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

    const { error: payError } = await client.from('profiles')
        .update({ pearls_balance: profile.pearls_balance - cost })
        .eq('id', currentUser.id);

    if (!payError) {
        await client.from('user_fish').insert([{
            user_id: currentUser.id,
            rarity: rarity,
            daily_yield: yieldAmount,
            is_egg: true,
            egg_hatch_time: hatchDate.toISOString(),
            level: 1,
            current_xp: 0,
            next_level_xp: 100
        }]);
        await loadProfile();
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));
        alert(`¡Huevo ${type} adquirido! Revisa tu inventario.`);
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
