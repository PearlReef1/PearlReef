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
    // Actualización rápida para animaciones y cronómetro
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
    const { data, error } = await client.from('user_fish')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('birth_date', { ascending: false });
    
    if (error) {
        console.error("Error en Supabase:", error.message);
        return;
    }

    const aquarium = document.getElementById('aquarium');
    aquarium.innerHTML = '';

    data.forEach(fish => {
        const card = document.createElement('div');
        // Limpiamos el nombre de la rareza para la clase CSS (ej: "Poco Comun" -> "poco-comun")
        const rarityKey = fish.rarity ? fish.rarity.toLowerCase().replace(/\s+/g, '-') : 'comun';
        card.className = `fish-card rarity-${rarityKey}`;
        
        let imgSrc = RAW_BASE + "pez_huevo.png";
        let statusHtml = "";

        if (fish.is_egg) {
            const now = new Date();
            const birthDate = new Date(fish.birth_date);
            
            // Tiempos de eclosión por rareza
            let hatchMinutes = 60; // Común y Poco Común
            if (fish.rarity === 'Legendario') hatchMinutes = 360;
            if (fish.rarity === 'Raro') hatchMinutes = 180;
            if (fish.rarity === 'Mitico') hatchMinutes = 720;

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
            imgSrc = `${RAW_BASE}pez_${rarityKey.replace('-', '_')}.png`;
            statusHtml = `<b>Produciendo: ${fish.daily_yield} PRL</b>`;
        }

        // --- LÓGICA DE MOVIMIENTO ALEATORIO ---
        // Generamos variaciones para que no todos se muevan igual
        const animDuration = (Math.random() * 2 + 2).toFixed(2); // Entre 2s y 4s
        const animDelay = (Math.random() * 2).toFixed(2);

        card.innerHTML = `
            <div class="rarity-badge">${fish.rarity}</div>
            <img src="${imgSrc}" 
                 style="animation: float ${animDuration}s ease-in-out ${animDelay}s infinite"
                 onerror="this.src='${RAW_BASE}pez_huevo.png'">
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

    let rarity, yieldAmount;
    const roll = Math.random() * 100;

    // Lógica de 5 rarezas distribuidas en los 3 huevos existentes
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
        loadFish();
        alert(`¡Compraste un Huevo ${type}! Contiene un pez ${rarity}`);
    }
}

async function hatchFish(fishId) {
    const { error } = await client.from('user_fish')
        .update({ is_egg: false })
        .eq('id', fishId);
    
    if (!error) loadFish();
}

function startFeeding(fishId, yieldAmount) {
    alert("Iniciando minijuego para ganar " + yieldAmount + " PRL");
}
