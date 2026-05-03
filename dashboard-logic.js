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
    await loadFish();
    // Actualizar la interfaz cada segundo para el cronómetro
    setInterval(loadFish, 1000); 
};

async function loadProfile() {
    const { data } = await client.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (data) {
        document.getElementById('user-name').innerText = data.username || "Jugador";
        document.getElementById('pearl-balance').innerText = data.pearls_balance;
    }
}

async function loadFish() {
    const { data } = await client.from('user_fish').select('*').eq('user_id', currentUser.id);
    if (!data) return;

    const aquarium = document.getElementById('aquarium');
    const oldScroll = window.scrollY; // Mantener la posición del scroll
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        card.className = 'fish-card';
        
        let imgSrc = RAW_BASE + "pez_huevo.png";
        let statusHtml = "";

        if (fish.is_egg) {
            const now = new Date();
            const birthDate = new Date(fish.created_at);
            // TIEMPO DE PRUEBA: 1, 2 y 3 minutos
            let hatchMinutes = fish.rarity === 'Comun' ? 1 : (fish.rarity === 'Raro' ? 2 : 3);
            const hatchTime = new Date(birthDate.getTime() + hatchMinutes * 60000);
            const remainingMs = hatchTime - now;

            if (remainingMs > 0) {
                const mins = Math.floor(remainingMs / 60000);
                const secs = Math.floor((remainingMs % 60000) / 1000);
                statusHtml = `<span class="timer">⏳ ${mins}m ${secs}s</span>`;
            } else {
                statusHtml = `<span class="ready">¡Eclosionando!</span>`;
                checkHatching(); // Disparar la comprobación
            }
        } else {
            const imgName = fish.rarity === 'Comun' ? "pez_comun.png" : (fish.rarity === 'Raro' ? "pez_raro.png" : "pez_legendario.png");
            imgSrc = RAW_BASE + imgName;
            statusHtml = `<b>+${fish.daily_yield} PRL/día</b>`;
        }

        const vitPercent = (fish.vitality_days / 90) * 100;

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/100?text=Cargando...'">
            <p><strong>Huevo ${fish.rarity}</strong></p>
            <div class="status-info">${statusHtml}</div>
            <div class="vitality-bar"><div class="vitality-fill" style="width:${vitPercent}%"></div></div>
            ${!fish.is_egg ? `<button class="btn-feed" onclick="startFeeding('${fish.id}', ${fish.daily_yield})">Alimentar</button>` : ''}
        `;
        aquarium.appendChild(card);
    });
}

async function buyEgg(type, cost) {
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    
    if (profile.pearls_balance < cost) {
        alert("Saldo insuficiente. Necesitas " + cost + " PRL.");
        return;
    }

    await client.from('profiles').update({ pearls_balance: profile.pearls_balance - cost }).eq('id', currentUser.id);

    await client.from('user_fish').insert([{
        user_id: currentUser.id,
        rarity: type === 'Arrecife' ? 'Comun' : (type === 'Abisal' ? 'Raro' : 'Legendario'),
        is_egg: true,
        vitality_days: 90,
        daily_yield: type === 'Arrecife' ? 35 : (type === 'Abisal' ? 85 : 205)
    }]);

    alert(`¡Huevo ${type} comprado!`);
    loadProfile();
    loadFish();
}

// ... (funciones startFeeding, completeFeeding y handleLogout se mantienen igual)

async function checkHatching() {
    const { data: eggs } = await client.from('user_fish').select('*').eq('user_id', currentUser.id).eq('is_egg', true);
    if (!eggs) return;

    const now = new Date();
    for (let egg of eggs) {
        const birthDate = new Date(egg.created_at);
        let hatchMinutes = egg.rarity === 'Comun' ? 1 : (egg.rarity === 'Raro' ? 2 : 3);
        const hatchTime = new Date(birthDate.getTime() + hatchMinutes * 60000);

        if (now >= hatchTime) {
            await client.from('user_fish').update({ is_egg: false }).eq('id', egg.id);
            loadFish();
        }
    }
}
