const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeFishId = null;

// Al cargar la página
window.onload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    loadProfile();
    loadFish();
};

async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    document.getElementById('user-name').innerText = data.username;
    document.getElementById('pearl-balance').innerText = data.pearls_balance;
}

async function loadFish() {
    const { data } = await supabase.from('user_fish').select('*').eq('user_id', currentUser.id);
    const aquarium = document.getElementById('aquarium');
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        card.className = 'fish-card';
        // Lógica visual: Si es huevo o pez
        const img = fish.is_egg ? 'huevo.png' : 'pez_comun.png'; 
        const status = fish.is_egg ? 'Eclosionando...' : `Nivel ${fish.level}`;
        const vitPercent = (fish.vitality_days / 90) * 100;

        card.innerHTML = `
            <img src="${img}">
            <p><strong>${fish.rarity}</strong></p>
            <small>${status}</small>
            <div class="vitality-bar"><div class="vitality-fill" style="width:${vitPercent}%"></div></div>
            ${!fish.is_egg ? `<button class="btn-feed" onclick="startFeeding('${fish.id}')">Alimentar</button>` : ''}
        `;
        aquarium.appendChild(card);
    });
}

// Lógica para comprar huevos
async function buyEgg(type, cost) {
    // 1. Verificar saldo
    const { data: profile } = await supabase.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    
    if (profile.pearls_balance < cost) {
        alert("No tienes suficientes perlas. ¡Contacta al admin para recargar!");
        return;
    }

    // 2. Restar saldo y Crear Huevo
    await supabase.from('profiles').update({ pearls_balance: profile.pearls_balance - cost }).eq('id', currentUser.id);
    
    await supabase.from('user_fish').insert([{
        user_id: currentUser.id,
        rarity: type === 'Arrecife' ? 'Comun' : (type === 'Abisal' ? 'Raro' : 'Legendario'),
        is_egg: true,
        vitality_days: 90
    }]);

    alert(`¡Huevo ${type} comprado!`);
    loadProfile();
    loadFish();
}

function startFeeding(fishId) {
    activeFishId = fishId;
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function completeFeeding() {
    // Aquí iría la lógica de sumar PRL según la rareza (ej. 35 PRL para común)
    alert("¡Pez alimentado! +35 PRL"); 
    document.getElementById('minigame-modal').style.display = 'none';
    // Nota: Aquí falta la función SQL para sumar el saldo y actualizar 'last_fed'
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}
