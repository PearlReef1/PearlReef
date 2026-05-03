// CONFIGURACIÓN SUPABASE - Usamos 'client' para evitar el choque de nombres
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeFishId = null;

// Al cargar la página
window.onload = async () => {
    // Verificar si hay una sesión activa
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
        .maybeSingle(); // Usamos maybeSingle para que no de error 406 si no existe
    
    if (error) {
        console.error("Error en perfil:", error);
        return;
    }

    if (data) {
        document.getElementById('user-name').innerText = data.username || "Jugador";
        document.getElementById('pearl-balance').innerText = data.pearls_balance;
    } else {
        console.log("El perfil no existe todavía.");
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
        
        // Lógica visual: Si es huevo o pez
        const img = fish.is_egg ? 'huevo.png' : 'pez_comun.png'; 
        const status = fish.is_egg ? 'Eclosionando...' : `Nivel ${fish.level}`;
        const vitPercent = (fish.vitality_days / 90) * 100;

        card.innerHTML = `
            <img src="${img}" onerror="this.src='https://via.placeholder.com/100?text=Pez'">
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
    // 1. Verificar saldo actual
    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('pearls_balance')
        .eq('id', currentUser.id)
        .single();
    
    if (profile.pearls_balance < cost) {
        alert("Saldo insuficiente en Perlas ($PRL).");
        return;
    }

    // 2. Restar saldo
    const { error: updateError } = await client
        .from('profiles')
        .update({ pearls_balance: profile.pearls_balance - cost })
        .eq('id', currentUser.id);

    if (updateError) {
        alert("Error al procesar el pago.");
        return;
    }

    // 3. Crear el Huevo en la tabla user_fish
    const { error: insertError } = await client
        .from('user_fish')
        .insert([{
            user_id: currentUser.id,
            rarity: type === 'Arrecife' ? 'Comun' : (type === 'Abisal' ? 'Raro' : 'Legendario'),
            is_egg: true,
            vitality_days: 90,
            daily_yield: type === 'Arrecife' ? 35 : (type === 'Abisal' ? 85 : 205)
        }]);

    if (insertError) {
        console.error(insertError);
        alert("Error al crear el huevo.");
    } else {
        alert(`¡Huevo ${type} adquirido exitosamente!`);
        loadProfile();
        loadFish();
    }
}

function startFeeding(fishId) {
    activeFishId = fishId;
    document.getElementById('minigame-modal').style.display = 'flex';
}

async function completeFeeding() {
    // Sumar 35 PRL fijos por ahora como prueba
    const { data: profile } = await client.from('profiles').select('pearls_balance').eq('id', currentUser.id).single();
    await client.from('profiles').update({ pearls_balance: profile.pearls_balance + 35 }).eq('id', currentUser.id);
    
    alert("¡Pez alimentado! Ganaste 35 PRL"); 
    document.getElementById('minigame-modal').style.display = 'none';
    loadProfile();
}

async function handleLogout() {
    await client.auth.signOut();
    window.location.href = 'index.html';
}

// Función para revisar si los huevos ya deben abrirse
async function checkHatching() {
    const { data: eggs } = await client
        .from('user_fish')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_egg', true);

    if (!eggs) return;

    const now = new Date();

    for (let egg of eggs) {
        // Calculamos cuánto tiempo ha pasado desde que nació (birth_date)
        const birthDate = new Date(egg.birth_date);
        const diffInMinutes = (now - birthDate) / 1000 / 60;

        // Definimos el tiempo según la rareza (en minutos para probar rápido)
        let hatchTime = 60; // 1 hora por defecto (Arrecife)
        if (egg.rarity === 'Raro') hatchTime = 180; // 3 horas (Abisal)
        if (egg.rarity === 'Legendario') hatchTime = 360; // 6 horas (Ancestral)

        if (diffInMinutes >= hatchTime) {
            // ¡EL HUEVO DEBE ABRIRSE!
            await client
                .from('user_fish')
                .update({ is_egg: false })
                .eq('id', egg.id);
            
            alert(`¡Tu huevo ${egg.rarity} ha eclosionado!`);
            loadFish();
        }
    }
}

// Ejecutar la revisión cada 30 segundos
setInterval(checkHatching, 30000);
