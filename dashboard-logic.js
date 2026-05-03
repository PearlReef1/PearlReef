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
    
    // Intervalo para actualizar tiempos y movimientos
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
    container.innerHTML = ''; // Limpiar

    allFish.forEach(fish => {
        if (!fish.is_egg) {
            createSwimmingFish(fish);
        }
    });
}

function createSwimmingFish(fish) {
    const img = document.createElement('img');
    const rarityKey = fish.rarity.toLowerCase().replace(/\s+/g, '_');
    img.src = `${RAW_BASE}pez_${rarityKey}.png`;
    img.className = 'fish-swim';
    img.id = `fish-${fish.id}`;
    
    // Posición inicial aleatoria
    img.style.left = Math.random() * 80 + "vw";
    img.style.top = Math.random() * 80 + "vh";
    
    document.getElementById('aquarium-bg').appendChild(img);
    moveFishRandomly(img);
}

function moveFishRandomly(imgElement) {
    const targetX = Math.random() * 90;
    const targetY = Math.random() * 90;
    
    // Girar la imagen según la dirección
    const currentX = parseFloat(imgElement.style.left);
    imgElement.style.transform = targetX > currentX ? "scaleX(1)" : "scaleX(-1)";
    
    imgElement.style.left = targetX + "vw";
    imgElement.style.top = targetY + "vh";

    setTimeout(() => moveFishRandomly(imgElement), 8000);
}

// GESTIÓN DE PESTAÑAS
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
    container.innerHTML = '<h3>Tus Peces y Huevos</h3>';
    allFish.forEach(fish => {
        const div = document.createElement('div');
        div.className = 'mini-card';
        const isEgg = fish.is_egg;
        
        div.innerHTML = `
            <img src="${RAW_BASE}${isEgg ? 'pez_huevo.png' : 'pez_'+fish.rarity.toLowerCase().replace(' ','_')+'.png'}">
            <div>
                <strong>${fish.rarity}</strong><br>
                ${isEgg ? '<span class="timer-display">Eclosionando...</span>' : `+${fish.daily_yield} PRL/día`}
                ${!isEgg ? `<br><button onclick="startFeeding('${fish.id}')">Alimentar</button>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

function renderShop(container) {
    container.innerHTML = `
        <div class="shop-item">
            <h4>Huevo Arrecife</h4>
            <p>1,000 PRL (ROI ~26 días)</p>
            <button onclick="buyEgg('Arrecife', 1000)">Comprar</button>
        </div>
        <hr>
        <div class="shop-item">
            <h4>Huevo Abisal</h4>
            <p>2,500 PRL (ROI ~25 días)</p>
            <button onclick="buyEgg('Abisal', 2500)">Comprar</button>
        </div>
        <hr>
        <div class="shop-item">
            <h4>Huevo Ancestral</h4>
            <p>6,000 PRL (ROI ~23 días)</p>
            <button onclick="buyEgg('Ancestral', 6000)">Comprar</button>
        </div>
    `;
}

async function buyEgg(type, cost) {
    // Reutiliza tu lógica de compra anterior aquí...
    alert(`Comprando ${type} por ${cost} PRL...`);
    // [Insertar aquí el código de compra que ya teníamos]
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
    // Aquí puedes actualizar los timers de los huevos en el inventario si el panel está abierto
}
