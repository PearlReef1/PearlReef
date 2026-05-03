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
    // Actualizamos la vista cada segundo para el cronómetro
    setInterval(() => {
        loadFish();
        loadProfile();
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
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    if (!data) return;

    const aquarium = document.getElementById('aquarium');
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        card.className = 'fish-card';
        
        let imgSrc = RAW_BASE + "pez_huevo.png";
        let statusHtml = "";

        if (fish.is_egg) {
            const now = new Date();
            const birthDate = new Date(fish.created_at);
            // TIEMPOS DE PRUEBA: 1, 2 y 3 minutos
            let hatchMinutes = fish.rarity === 'Comun' ? 1 : (fish.rarity === 'Raro' ? 2 : 3);
            const hatchTime = new Date(birthDate.getTime() + hatchMinutes * 60000);
            const diff = hatchTime - now;

            if (diff > 0) {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                statusHtml = `<span class="timer-display">⏳ ${m}m ${s}s</span>`;
            } else {
                statusHtml = `<b style="color:#4caf50;">¡Eclosionando!</b>`;
                checkHatching(fish.id); 
            }
        } else {
            const type = fish.rarity === 'Comun' ? 'comun' : (fish.rarity === 'Raro' ? 'raro' : 'legendario');
            imgSrc = `${RAW_BASE}pez_${type}.png`;
            statusHtml = `<b>Produciendo: ${fish.daily_yield} PRL</b>`;
        }

        card.innerHTML = `
            <img src="${imgSrc}">
            <p><strong>${fish.rarity}</strong></p>
            <div>${statusHtml}</div>
            ${!fish.is_egg ? `<button class="btn-feed" onclick="startFeeding('${fish.id}', ${fish.daily_yield})">Alimentar</button>` : ''}
        `;
        aquarium.appendChild(card);
    });
}

async function buyEgg(type, cost) {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    if (profile.pearls_balance < cost) return alert("Saldo insuficiente");

    await client.from('profiles').update({ pearls_balance: profile.pearls_balance - cost }).eq('id', currentUser.id);
    await client.from('user_fish').insert([{
        user_id: currentUser.id,
        rarity: type === 'Arrecife' ? 'Comun' : (type === 'Abisal' ? 'Raro' : 'Legendario'),
        is_egg: true,
        daily_yield: type === 'Arrecife' ? 35 : (type === 'Abisal' ? 85 : 205)
    }]);
    loadFish();
}

async function checkHatching(id) {
    await client.from('user_fish').update({ is_egg: false }).eq('id', id);
}

// ... Resto de funciones (startFeeding, completeFeeding, handleLogout) igual que antes
