// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";

window.onload = async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }
    currentUser = user;
    await loadProfile();
    // Actualización constante para el cronómetro
    setInterval(loadFish, 1000);
};

async function loadProfile() {
    const { data } = await client.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (data) {
        document.getElementById('pearl-balance').innerText = data.pearls_balance;
        document.getElementById('user-name').innerText = data.username || "Jugador";
    }
}

async function loadFish() {
    // Solo pedimos las columnas que existen para evitar el error 400
    const { data, error } = await client.from('user_fish')
        .select('id, rarity, is_egg, daily_yield, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error cargando peces:", error.message);
        return;
    }

    const aquarium = document.getElementById('aquarium');
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        const rarityKey = fish.rarity.toLowerCase();
        card.className = `fish-card rarity-${rarityKey}`;
        
        let imgSrc = RAW_BASE + "pez_huevo.png";
        let statusHtml = "";

        if (fish.is_egg) {
            const now = new Date();
            const birthDate = new Date(fish.created_at);
            
            // Definimos el tiempo de eclosión según la rareza (ya que no hay egg_type)
            // Tiempos reales: Comun 1h, Raro 3h, Legendario 6h
            let hatchMinutes = 60; 
            if (fish.rarity === 'Raro') hatchMinutes = 180;
            if (fish.rarity === 'Legendario') hatchMinutes = 360;

            const hatchTime = new Date(birthDate.getTime() + hatchMinutes * 60000);
            const diff = hatchTime - now;

            if (diff > 0) {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                statusHtml = `<span class="timer-display">⏳ ${m}m ${s}s</span>`;
            } else {
                statusHtml = `<button class="btn-hatch" onclick="hatchFish('${fish.id}')">¡ABRIR!</button>`;
            }
        } else {
            imgSrc = `${RAW_BASE}pez_${rarityKey}.png`;
            statusHtml = `<b>Produciendo: ${fish.daily_yield} PRL</b>`;
        }

        card.innerHTML = `
            <div class="rarity-badge">${fish.rarity}</div>
            <img src="${imgSrc}" onerror="this.src='${RAW_BASE}pez_huevo.png'">
            <p><small>ID: #${fish.id.substring(0,5)}</small></p>
            <div class="status-box">${statusHtml}</div>
            ${!fish.is_egg ? `<button class="btn-feed" onclick="startFeeding('${fish.id}', ${fish.daily_yield})">Alimentar</button>` : ''}
        `;
        aquarium.appendChild(card);
    });
}

async function buyEgg(type, cost) {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("Saldo insuficiente");

    // LÓGICA DE PROBABILIDADES
    let rarity = 'Comun';
    let yield = 35;

    if (type === 'Abisal') {
        // 70% Raro, 30% Comun
        rarity = Math.random() > 0.3 ? 'Raro' : 'Comun';
        yield = rarity === 'Raro' ? 85 : 35;
    } else if (type === 'Ancestral') {
        // 80% Legendario, 20% Raro
        rarity = Math.random() > 0.2 ? 'Legendario' : 'Raro';
        yield = rarity === 'Legendario' ? 205 : 85;
    }

    // 1. Restamos saldo
    const { error: balanceError } = await client.from('profiles')
        .update({ pearls_balance: profile.pearls_balance - cost })
        .eq('id', currentUser.id);

    if (balanceError) return alert("Error al procesar pago");

    // 2. Insertamos el pez/huevo
    const { error: insertError } = await client.from('user_fish').insert([{
        user_id: currentUser.id,
        rarity: rarity,
        is_egg: true,
        daily_yield: yield
    }]);

    if (insertError) {
        alert("Error en la compra");
    } else {
        await loadProfile();
        alert(`¡Huevo ${type} comprado! Te salió un huevo nivel: ${rarity}`);
    }
}

async function hatchFish(id) {
    const { error } = await client.from('user_fish').update({ is_egg: false }).eq('id', id);
    if (!error) loadFish();
}

// FUNCIONES DE ALIMENTACIÓN (Asegúrate de que existan)
let activeFishId = null;
let currentYield = 0;

function startFeeding(fishId, yieldAmount) {
    activeFishId = fishId;
    currentYield = yieldAmount;
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function completeFeeding() {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    const nuevoSaldo = profile.pearls_balance + currentYield;
    
    await client.from('profiles').update({ pearls_balance: nuevoSaldo }).eq('id', currentUser.id);
    document.getElementById('minigame-modal').style.display = 'none';
    alert(`¡Ganaste ${currentYield} PRL!`);
    loadProfile();
}

async function handleLogout() {
    await client.auth.signOut();
    window.location.href = 'index.html';
}
