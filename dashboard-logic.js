// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeFishId = null;

// RUTA BASE PARA TUS IMÁGENES EN GITHUB (RAW)
const RAW_BASE = "https://raw.githubusercontent.com/PearlReef1/PearlReef/main/assets/";

// Al cargar la página
window.onload = async () => {
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    await loadProfile();
    await loadFish();
};

async function loadProfile() {
    const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
    
    if (error) {
        console.error("Error en perfil:", error);
        return;
    }

    if (data) {
        document.getElementById('user-name').innerText = data.username || "Jugador";
        document.getElementById('pearl-balance').innerText = data.pearls_balance;
    }
}

async function loadFish() {
    const { data, error } = await client
        .from('user_fish')
        .select('*')
        .eq('user_id', currentUser.id);
    
    if (error) {
        console.error("Error cargando peces:", error);
        return;
    }

    const aquarium = document.getElementById('aquarium');
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        card.className = 'fish-card';
        
        // Lógica de imágenes usando tus archivos de GitHub
        let imgSrc = RAW_BASE + "pez_huevo.png"; 
        
        if (!fish.is_egg) {
            if (fish.rarity === 'Comun') imgSrc = RAW_BASE + "pez_comun.png";
            if (fish.rarity === 'Raro') imgSrc = RAW_BASE + "pez_raro.png";
            if (fish.rarity === 'Legendario') imgSrc = RAW_BASE + "pez_legendario.png";
        }

        const status = fish.is_egg ? 'Eclosionando...' : `Nivel ${fish.level}`;
        const vitPercent = (fish.vitality_days / 90) * 100;

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/100?text=Cargando...'">
            <p><strong>${fish.rarity}</strong></p>
            <small>${status}</small>
            <div class="vitality-bar"><div class="vitality-fill" style="width:${vitPercent}%"></div></div>
            ${!fish.is_egg ? `<button class="btn-feed" onclick="startFeeding('${fish.id}', ${fish.daily_yield})">Alimentar</button>` : ''}
        `;
        aquarium.appendChild(card);
    });
}

// Lógica para comprar huevos
async function buyEgg(type, cost) {
    const { data: profile } = await client
        .from('profiles')
        .select('pearls_balance')
        .eq('id', currentUser.id)
        .single();
    
    if (profile.pearls_balance < cost) {
        alert("Saldo insuficiente en Perlas ($PRL).");
        return;
    }

    // Restar saldo
    await client.from('profiles').update({ pearls_balance: profile.pearls_balance - cost }).eq('id', currentUser.id);

    // Crear el Huevo
    const { error: insertError } = await client.from('user_fish').insert([{
        user_id: currentUser.id,
        rarity: type === 'Arrecife' ? 'Comun' : (type === 'Abisal' ? 'Raro' : 'Legendario'),
        is_egg: true,
        vitality_days: 90,
        daily_yield: type === 'Arrecife' ? 35 : (type === 'Abisal' ? 85 : 205)
    }]);

    if (insertError) {
        alert("Error al comprar.");
    } else {
        alert(`¡Huevo ${type} adquirido!`);
        loadProfile();
        loadFish();
    }
}

// Alimentación
let currentYield = 0;
function startFeeding(fishId, yieldAmount) {
    activeFishId = fishId;
    currentYield = yieldAmount;
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function completeFeeding() {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    
    // Sumamos el yield específico de cada pez
    const nuevoSaldo = profile.pearls_balance + (currentYield || 35);
    
    await client.from('profiles').update({ pearls_balance: nuevoSaldo }).eq('id', currentUser.id);
    
    alert(`¡Pez alimentado! Ganaste ${currentYield || 35} PRL`); 
    document.getElementById('minigame-modal').style.display = 'none';
    loadProfile();
}

// Botón de salir
async function handleLogout() {
    const { error } = await client.auth.signOut();
    if (!error) {
        window.location.href = 'index.html';
    } else {
        alert("Error al cerrar sesión");
    }
}

// Revisión de eclosión
async function checkHatching() {
    const { data: eggs } = await client.from('user_fish').select('*').eq('user_id', currentUser.id).eq('is_egg', true);
    if (!eggs || eggs.length === 0) return;

    const now = new Date();
    for (let egg of eggs) {
        const birthDate = new Date(egg.birth_date);
        const diffInMinutes = (now - birthDate) / 1000 / 60;

        let hatchTime = 60; // 1 hora
        if (egg.rarity === 'Raro') hatchTime = 180; 
        if (egg.rarity === 'Legendario') hatchTime = 360;

        if (diffInMinutes >= hatchTime) {
            await client.from('user_fish').update({ is_egg: false }).eq('id', egg.id);
            alert(`¡Tu huevo ${egg.rarity} ha eclosionado!`);
            loadFish();
        }
    }
}

setInterval(checkHatching, 30000);
