const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allFish = [];
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";

// --- CONFIGURACIÓN COIN TO FISH ---
const FEED_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 Horas por ración
const MAX_HUNGER_UNITS = 2; // Máximo 2 raciones (24h total)

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
    if (error) {
        console.error("Error cargando perfil:", error);
        return;
    }
    
    if (data) {
        // Actualiza Perlas
        document.getElementById('pearl-balance').innerText = data.pearls_balance || 0;
        document.getElementById('user-name').innerText = data.username || "Jugador";
        
        // Actualiza contadores de comida en la interfaz
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
        container.style.backgroundRepeat = 'no-repeat';

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

function switchTab(tab, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const panel = document.getElementById('content-panel');
    const body = document.getElementById('panel-body');
    const title = document.getElementById('panel-title');

    if (tab === 'acuario') { 
        panel.style.display = 'none'; 
        return; 
    }

    panel.style.display = 'flex';
    title.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);

    if (tab === 'inventario') renderInventory(body);
    if (tab === 'tienda') renderShop(body);
}

function renderInventory(container) {
    container.innerHTML = '<h3>Gestión de Especies</h3>';
    const now = new Date();

    if (allFish.length === 0) {
        container.innerHTML += '<p style="text-align:center; color:#666; margin-top:20px;">No tienes especies aún.</p>';
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
            const msSinceFed = now - lastFed;
            
            // LÓGICA COIN TO FISH: 2 unidades de carga
            let hungerUnits = 0;
            if (msSinceFed < FEED_COOLDOWN_MS) hungerUnits = 2; // Menos de 12h
            else if (msSinceFed < FEED_COOLDOWN_MS * 2) hungerUnits = 1; // Entre 12h y 24h
            else hungerUnits = 0; // Más de 24h (Hambriento)

            const isProducing = hungerUnits > 0;
            const currentXP = fish.current_xp || 0;
            const nextXP = fish.next_level_xp || 100;
            const xpPercent = Math.min((currentXP / nextXP) * 100, 100);

            statusHTML = `
                <div style="font-size: 0.8rem; margin-bottom:4px;">
                    Nivel: <strong>${fish.level || 1}</strong> | 
                    Prod: <strong style="color:${isProducing ? '#2ecc71' : '#e63946'}">${isProducing ? fish.daily_yield + ' PRL' : '¡HAMBRIENTO!'}</strong>
                </div>
                
                <small style="font-size:0.6rem; color:#64748b">EXPERIENCIA (${currentXP}/${nextXP})</small>
                <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; margin-bottom:8px; overflow:hidden;">
                    <div style="width:${xpPercent}%; height:100%; background:#4ade80;"></div>
                </div>

                <div style="display:flex; align-items:center; gap:5px;">
                    <small style="font-size:0.6rem; color:#64748b">HAMBRE:</small>
                    <span style="font-size:1rem; letter-spacing: 2px;">${'🍖'.repeat(hungerUnits)}${'⚪'.repeat(MAX_HUNGER_UNITS - hungerUnits)}</span>
                </div>
            `;

            if (hungerUnits < MAX_HUNGER_UNITS) {
                actionHTML = `<button class="btn-feed-mini" onclick="startFeeding('${fish.id}')">ALIMENTAR</button>`;
            } else {
                const nextDrop = new Date(lastFed.getTime() + FEED_COOLDOWN_MS);
                actionHTML = `<div class="cooldown-tag" style="font-size:0.65rem">Satisfecho<br>Baja en: ${formatTime(nextDrop - now)}</div>`;
            }
        }

        div.innerHTML = `
            <img src="${RAW_BASE}${isEgg ? 'pez_huevo.png' : 'pez_'+rarityFile+'.png'}" style="width:60px; filter:${!isEgg && (now - (new Date(fish.last_fed || 0)) > FEED_COOLDOWN_MS * 2) ? 'grayscale(0.8) contrast(0.5)' : 'none'}">
            <div style="flex-grow:1; margin-left:12px;">
                <strong style="color:var(--primary)">${fish.rarity}</strong><br>
                <div style="margin-top:6px;">${statusHTML}</div>
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
    const { data: profile } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    if ((profile.food_basic || 0) <= 0 && (profile.food_rare || 0) <= 0) {
        alert("¡No tienes comida! Ve a la tienda.");
        switchTab('tienda', document.querySelector('[onclick*="tienda"]'));
        return;
    }
    sessionStorage.setItem('feeding_fish_id', fishId);
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function startFeeding(fishId) {
    // Consultamos los datos más frescos de la DB antes de validar
    const { data: profile, error } = await client.from('profiles').select('*').eq('id', currentUser.id).single();
    
    if (error || !profile) return;

    const hasBasic = (profile.food_basic || 0) > 0;
    const hasRare = (profile.food_rare || 0) > 0;

    if (!hasBasic && !hasRare) {
        alert("¡No tienes comida! Ve a la tienda a comprar suministros.");
        switchTab('tienda', document.querySelector('[onclick*="tienda"]'));
        return;
    }

    // Si tiene comida, guardamos el ID y abrimos el minijuego
    sessionStorage.setItem('feeding_fish_id', fishId);
    document.getElementById('minigame-modal').style.display = 'flex';
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
    console.log("Iniciando compra:", { type, cost, quantity });

    // 1. Obtener perfil
    const { data: profile, error: fetchError } = await client
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (fetchError || !profile) {
        console.error("Error al obtener perfil:", fetchError);
        return;
    }

    if (profile.pearls_balance < cost) {
        return alert("No tienes suficientes perlas ⚪");
    }

    // 2. Preparar actualización
    const updateData = { 
        pearls_balance: Number(profile.pearls_balance) - Number(cost) 
    };
    
    if (type === 'basic') {
        updateData.food_basic = (Number(profile.food_basic) || 0) + Number(quantity);
    } else {
        updateData.food_rare = (Number(profile.food_rare) || 0) + Number(quantity);
    }

    console.log("Enviando actualización a Supabase:", updateData);

    // 3. Ejecutar Update
    const { error: updateError } = await client
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);

    if (updateError) {
        console.error("Error de Supabase al actualizar:", updateError.message);
        alert("Error en la base de datos: " + updateError.message);
    } else {
        alert(`¡Compra exitosa!`);
        await loadProfile(); // Esto actualiza el balance visual arriba
        
        // Si el panel de la tienda está abierto, lo refrescamos para ver los cambios
        const body = document.getElementById('panel-body');
        if (body) renderShop(body);
    }
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
        user_id: currentUser.id,
        rarity: rarity,
        daily_yield: yieldAmount,
        is_egg: true,
        egg_hatch_time: hatchDate.toISOString(),
        level: 1,
        current_xp: 0,
        next_level_xp: 100,
        last_fed: new Date().toISOString() // Nace lleno
    }]);
    await loadProfile();
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    allFish = data;
    renderInventory(document.getElementById('panel-body'));
    alert(`¡Huevo ${type} adquirido!`);
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
async function claimPearls(fishId) {
    // 1. Obtener datos actuales del pez
    const { data: fish, error: fishError } = await client
        .from('user_fish')
        .select('accumulated_pearls, user_id')
        .eq('id', fishId)
        .single();

    if (fishError || fish.accumulated_pearls <= 0) {
        alert("No hay perlas para recolectar aún.");
        return;
    }

    const amountToClaim = fish.accumulated_pearls;

    // 2. Obtener balance actual del perfil
    const { data: profile } = await client
        .from('profiles')
        .select('pearls_balance')
        .eq('id', currentUser.id)
        .single();

    const newBalance = (profile.pearls_balance || 0) + amountToClaim;

    // 3. Transacción: Resetear pez y subir balance al perfil
    const { error: updateError } = await client
        .from('profiles')
        .update({ pearls_balance: newBalance })
        .eq('id', currentUser.id);

    if (!updateError) {
        await client
            .from('user_fish')
            .update({ accumulated_pearls: 0, last_claim: new Date().toISOString() })
            .eq('id', fishId);

        alert(`¡Has recolectado ${amountToClaim.toFixed(2)} PRL! ⚪`);
        
        // Refrescar UI
        await loadProfile();
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));
    }
}
