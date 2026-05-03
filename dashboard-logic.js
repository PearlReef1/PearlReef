const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allFish = [];
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";

window.onload = async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;
    
    await loadProfile();
    await initAquarium();
    
    // Intervalo para actualizar tiempos y estados
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

    allFish.forEach(fish => {
        if (!fish.is_egg) {
            createSwimmingFish(fish);
        }
    });
}

function createSwimmingFish(fish) {
    // Creamos el contenedor del pez (etiqueta + imagen)
    const fishGroup = document.createElement('div');
    fishGroup.className = 'fish-container';
    fishGroup.id = `fish-${fish.id}`;
    
    const rarityClass = fish.rarity.toLowerCase().replace(/\s+/g, '-');
    const rarityAsset = fish.rarity.toLowerCase().replace(/\s+/g, '_');
    
    // Estructura interna: ID/Rareza arriba e Imagen abajo
    fishGroup.innerHTML = `
        <div class="fish-label rarity-text-${rarityClass}">
            <span class="f-id">#${fish.id.substring(0, 4)}</span>
            <span class="f-rarity">${fish.rarity}</span>
        </div>
        <img src="${RAW_BASE}pez_${rarityAsset}.png" class="fish-img">
    `;
    
    // Posición inicial aleatoria
    fishGroup.style.left = Math.random() * 80 + "vw";
    fishGroup.style.top = Math.random() * 80 + "vh";
    
    document.getElementById('aquarium-bg').appendChild(fishGroup);
    
    // Iniciamos el ciclo de movimiento
    moveFishRandomly(fishGroup);
}

function moveFishRandomly(element) {
    const targetX = Math.random() * 85;
    const targetY = Math.random() * 85;
    
    // Girar el pez (y su etiqueta) según la dirección del nado
    const currentX = parseFloat(element.style.left);
    const img = element.querySelector('.fish-img');
    
    if (img) {
        img.style.transform = targetX > currentX ? "scaleX(1)" : "scaleX(-1)";
    }
    
    element.style.left = targetX + "vw";
    element.style.top = targetY + "vh";

    // Tiempo de nado entre puntos (8 segundos para suavidad)
    setTimeout(() => moveFishRandomly(element), 8000);
}

// GESTIÓN DE PESTAÑAS (INVENTARIO / TIENDA)
function switchTab(tab, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
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
    if (allFish.length === 0) {
        container.innerHTML += '<p>No tienes peces aún.</p>';
        return;
    }

    allFish.forEach(fish => {
        const div = document.createElement('div');
        div.className = 'mini-card';
        const isEgg = fish.is_egg;
        const rarityFile = fish.rarity.toLowerCase().replace(/\s+/g, '_');
        
        div.innerHTML = `
            <img src="${RAW_BASE}${isEgg ? 'pez_huevo.png' : 'pez_'+rarityFile+'.png'}">
            <div style="flex-grow:1">
                <strong>${fish.rarity}</strong> <small>(#${fish.id.substring(0,4)})</small><br>
                ${isEgg ? '<span class="timer-display">Eclosionando...</span>' : `Producción: ${fish.daily_yield} PRL`}
            </div>
            ${!isEgg ? `<button class="btn-feed-mini" onclick="startFeeding('${fish.id}')">🍴</button>` : ''}
        `;
        container.appendChild(div);
    });
}

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

// LÓGICA DE COMPRA (GACHA)
async function buyEgg(type, cost) {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("Pelas insuficientes ⚪");

    let rarity, yieldAmount;
    const roll = Math.random() * 100;

    if (type === 'Arrecife') {
        if (roll < 85) { rarity = 'Comun'; yieldAmount = 38; }
        else { rarity = 'Poco Comun'; yieldAmount = 55; }
    } else if (type === 'Abisal') {
        if (roll < 80) { rarity = 'Raro'; yieldAmount = 120; }
        else { rarity = 'Legendario'; yieldAmount = 320; }
    } else if (type === 'Ancestral') {
        if (roll < 90) { rarity = 'Legendario'; yieldAmount = 320; }
        else { rarity = 'Mitico'; yieldAmount = 500; }
    }

    const { error: payError } = await client.from('profiles')
        .update({ pearls_balance: profile.pearls_balance - cost })
        .eq('id', currentUser.id);

    if (!payError) {
        await client.from('user_fish').insert([{
            user_id: currentUser.id,
            rarity: rarity,
            daily_yield: yieldAmount,
            is_egg: true,
            birth_date: new Date().toISOString(),
            level: 1
        }]);
        
        await loadProfile();
        const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
        allFish = data;
        renderInventory(document.getElementById('panel-body'));
        alert(`¡Felicidades! Has adquirido un huevo con un pez ${rarity}`);
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

function updateAquariumState() {
    // Aquí podrías actualizar contadores en tiempo real
}

function startFeeding(fishId) {
    document.getElementById('minigame-modal').style.display = 'flex';
}

function completeFeeding() {
    document.getElementById('minigame-modal').style.display = 'none';
    alert("¡Pez alimentado con éxito!");
}
