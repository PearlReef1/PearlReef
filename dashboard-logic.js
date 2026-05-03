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
    setInterval(() => {
        loadFish();
    }, 1000);
};

async function loadProfile() {
    const { data } = await client.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (data) {
        document.getElementById('pearl-balance').innerText = data.pearls_balance;
        document.getElementById('user-name').innerText = data.username || "Jugador";
    }
}

async function loadFish() {
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (!data) return;

    const aquarium = document.getElementById('aquarium');
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        card.className = `fish-card rarity-${fish.rarity.toLowerCase()}`;
        
        let imgSrc = RAW_BASE + "pez_huevo.png";
        let statusHtml = "";

        if (fish.is_egg) {
            const now = new Date();
            const birthDate = new Date(fish.created_at);
            // TIEMPOS: Arrecife 60min, Abisal 180min, Ancestral 360min (Cambiado a minutos para prueba)
            let hatchMinutes = fish.egg_type === 'Arrecife' ? 60 : (fish.egg_type === 'Abisal' ? 180 : 360);
            const hatchTime = new Date(birthDate.getTime() + hatchMinutes * 60000);
            const diff = hatchTime - now;

            if (diff > 0) {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                statusHtml = `<span class="timer-display">⏳ ${m}m ${s}s</span>`;
            } else {
                statusHtml = `<button class="btn-hatch" onclick="hatchFish('${fish.id}')">¡ABRIR HUEVO!</button>`;
            }
        } else {
            const type = fish.rarity === 'Comun' ? 'comun' : (fish.rarity === 'Raro' ? 'raro' : 'legendario');
            imgSrc = `${RAW_BASE}pez_${type}.png`;
            statusHtml = `<b>+${fish.daily_yield} PRL/día</b>`;
        }

        card.innerHTML = `
            <div class="rarity-badge">${fish.rarity}</div>
            <img src="${imgSrc}">
            <p><small>ID: #${fish.id.substring(0,5)}</small></p>
            <div>${statusHtml}</div>
            ${!fish.is_egg ? `<button class="btn-feed" onclick="startFeeding('${fish.id}', ${fish.daily_yield})">Alimentar</button>` : ''}
        `;
        aquarium.appendChild(card);
    });
}

async function buyEgg(type, cost) {
    // 1. Obtener perfil fresco
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    
    if (profile.pearls_balance < cost) return alert("Saldo insuficiente");

    // 2. Restar saldo primero
    const newBalance = profile.pearls_balance - cost;
    const { error: updateError } = await client.from('profiles').update({ pearls_balance: newBalance }).eq('id', currentUser.id);

    if (updateError) return alert("Error al procesar pago");

    // 3. Lógica de rareza según el huevo
    let rarity = 'Comun';
    let yield = 35;

    if (type === 'Abisal') {
        rarity = Math.random() > 0.3 ? 'Raro' : 'Comun'; // 70% Raro
        yield = rarity === 'Raro' ? 85 : 35;
    } else if (type === 'Ancestral') {
        rarity = Math.random() > 0.2 ? 'Legendario' : 'Raro'; // 80% Legendario
        yield = rarity === 'Legendario' ? 205 : 85;
    }

    // 4. Insertar con el tipo de huevo guardado para el cronómetro
    await client.from('user_fish').insert([{
        user_id: currentUser.id,
        rarity: rarity,
        egg_type: type, // Nueva columna necesaria en Supabase o usa rarity
        is_egg: true,
        daily_yield: yield
    }]);

    await loadProfile();
    alert(`¡Huevo ${type} adquirido!`);
}

async function hatchFish(id) {
    await client.from('user_fish').update({ is_egg: false }).eq('id', id);
    loadFish();
}
