const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allFish = [];
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";
const FEED_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Horas

// --- CONFIGURACIÓN DE ASSETS ---
const DECOR_ASSETS = ['background_rock_b.png', 'seaweed_green_a_outline.png', 'seaweed_green_d_outline.png'];
const SAND_ASSETS = ['terrain_sand_c.png', 'terrain_sand_d.png', 'terrain_sand_top_a_outline.png', 'terrain_sand_top_b.png'];

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
    container.innerHTML = ''; 

    // 1. Capa de Fondo: Arena y Decoración
    createSeaFloor();
    placeDecorations();

    // 2. Capa de Peces
    allFish.forEach(fish => {
        if (!fish.is_egg) createSwimmingFish(fish);
    });
}

// --- DECORACIÓN DEL ACUARIO ---
function createSeaFloor() {
    const bg = document.getElementById('aquarium-bg');
    for (let x = 0; x < 110; x += 10) {
        const sand = document.createElement('img');
        sand.src = `${RAW_BASE}${SAND_ASSETS[Math.floor(Math.random() * SAND_ASSETS.length)]}`;
        sand.className = 'sand-tile';
        sand.style.left = x + "vw";
        bg.appendChild(sand);
    }
}

function placeDecorations() {
    const bg = document.getElementById('aquarium-bg');
    for (let i = 0; i < 8; i++) {
        const decor = document.createElement('img');
        decor.src = `${RAW_BASE}${DECOR_ASSETS[Math.floor(Math.random() * DECOR_ASSETS.length)]}`;
        decor.className = 'aquarium-decor';
        decor.style.left = (Math.random() * 95) + "vw";
        const scale = 0.6 + Math.random() * 0.7;
        decor.style.setProperty('--scale', scale);
        bg.appendChild(decor);
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
        <div class="fish-label rarity-text-${rarityClass}">
            <span class="f-id">#${fish.id.substring(0, 4)}</span>
            <span class="f-rarity">${fish.rarity}</span>
        </div>
        <img src="${RAW_BASE}pez_${rarityAsset}.png" class="fish-img">
    `;
    
    fishGroup.style.left = Math.random() * 80 + "vw";
    fishGroup.style.top = Math.random() * 80 + "vh";
    document.getElementById('aquarium-bg').appendChild(fishGroup);
    moveFishRandomly(fishGroup);
}

function moveFishRandomly(element) {
    const targetX = Math.random() * 85;
    const targetY = Math.random() * 70; // Mantenerlos un poco lejos de la arena profunda
    const currentX = parseFloat(element.style.left);
    const img = element.querySelector('.fish-img');
    
    if (img) img.style.transform = targetX > currentX ? "scaleX(1)" : "scaleX(-1)";
    
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
    container.innerHTML = '<h3>Mis Especies</h3>';
    const now = new Date();

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
                statusHTML = '<span class="ready-text">¡LISTO PARA NACER!</span>';
                actionHTML = `<button class="btn-hatch-mini" onclick="hatchFish('${fish.id}')">🐣 ABRIR</button>`;
            } else {
                statusHTML = `<span class="timer-display">⏳ ${formatTime(remaining)}</span>`;
                actionHTML = `<button class="btn-disabled" disabled>INCUBANDO</button>`;
            }
        } else {
            const lastFed = fish.last_fed ? new Date(fish.last_fed) : new Date(0);
            const canFeed = (now - lastFed) >= FEED_COOLDOWN_MS;

            statusHTML = `Producción: <strong>${fish.daily_yield} PRL</strong>`;
            if (canFeed) {
                actionHTML = `<button class="btn-feed-mini" onclick="startFeeding('${fish.id}')">🍴 ALIMENTAR</button>`;
            } else {
                const nextFeed = new Date(lastFed.getTime() + FEED_COOLDOWN_MS);
                actionHTML = `<div class="cooldown-tag">Próxima comida:<br>${formatTime(nextFeed - now)}</div>`;
            }
        }

        div.innerHTML = `
            <img src="${RAW_BASE}${isEgg ? 'pez_huevo.png' : 'pez_'+rarityFile+'.png'}">
            <div style="flex-grow:1">
                <strong>${fish.rarity}</strong> <small>#${fish.id.substring(0,4)}</small><br>
                ${statusHTML}
            </div>
            <div class="action-zone">${actionHTML}</div>
        `;
        container.appendChild(div);
    });
}

function formatTime(ms) {
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
        alert("¡Bienvenido al arrecife!");
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
    const { error } = await client.from('user_fish')
        .update({ last_fed: new Date().toISOString() })
        .eq('id', fishId);

    if (!error) {
        document.getElementById('minigame-modal').style.display = 'none';
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));
        alert("¡Pez alimentado con éxito!");
    }
}

function updateAquariumState() {
    const panel = document.getElementById('content-panel');
    if (panel.style.display !== 'none' && document.getElementById('panel-title').innerText === 'Inventario') {
        renderInventory(document.getElementById('panel-body'));
    }
}

// --- TIENDA Y OTROS ---
function renderShop(container) {
    container.innerHTML = `
        <div class="shop-item">
            <h4>Huevo Arrecife</h4>
            <p>💰 1,000 PRL<br><small>Prob: Común / Poco Común</small></p>
            <button class="btn-buy" onclick="buyEgg('Arrecife', 1000)">Comprar</button>
        </div>
        <div class="shop-item">
            <h4>Huevo Abisal</h4>
            <p>💰 2,500 PRL<br><small>Prob: Raro / Legendario</small></p>
            <button class="btn-buy" onclick="buyEgg('Abisal', 2500)">Comprar</button>
        </div>
        <div class="shop-item">
            <h4>Huevo Ancestral</h4>
            <p>💰 6,000 PRL<br><small>Prob: Legendario / Mítico</small></p>
            <button class="btn-buy" onclick="buyEgg('Ancestral', 6000)">Comprar</button>
        </div>
    `;
}

async function buyEgg(type, cost) {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("Perlas insuficientes ⚪");

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
            level: 1
        }]);
        await loadProfile();
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));
        alert(`¡Has comprado un huevo ${type}! Eclosiona en ${hatchHours}h.`);
    }
}

function closeAllPanels() {
    document.getElementById('content-panel').style.display = 'none';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

async function handleLogout() {
    await client.auth.signOut();
    window.location.href = 'index.html';
}
