// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Detectar código de referido de la URL y guardarlo
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        localStorage.setItem('pending_referral_code', refCode);
        console.log("Referido detectado y guardado:", refCode);
    }
});
// Alternar entre login y registro de forma fluida
function toggleAuth() {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    const errorEl = document.getElementById('auth-error');

    if (errorEl) {
        errorEl.innerText = "";
        errorEl.style.display = 'none';
    }

    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => input.value = "");

    if (login.style.display === 'none') {
        login.style.display = 'block';
        register.style.display = 'none';
    } else {
        login.style.display = 'none';
        register.style.display = 'block';
    }
}

// Lógica de Registro
async function handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value.trim();
    const errorEl = document.getElementById('auth-error');
    const btnSubmit = document.querySelector('#register-form .btn-auth');

    if (!email || !password || !username) {
        showAuthError("Por favor, rellena todos los campos.");
        return;
    }

    setLoadingState(btnSubmit, true, "Registrando...");

    // 1. Crear el usuario en Supabase Auth
    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: { data: { username: username } }
    });

    if (error) {
        showAuthError(error.message);
        setLoadingState(btnSubmit, false, "Registrarse");
        return;
    }

    // 🚀 NUEVA LÓGICA DE REFERIDOS: Buscar patrocinador
    let sponsorId = null;
    const refCode = localStorage.getItem('pending_referral_code');

    if (refCode) {
        const { data: sponsor } = await client
            .from('profiles')
            .select('id')
            .eq('referral_code', refCode)
            .single();

        if (sponsor) {
            sponsorId = sponsor.id;
        }
        localStorage.removeItem('pending_referral_code'); // Limpiamos tras usarlo
    }

    // 2. Creamos el perfil con el posible referido (referred_by)
    const { error: profileError } = await client
        .from('profiles')
        .insert([{ 
            id: data.user.id, 
            username: username, 
            pearl_balance: 0,
            referred_by: sponsorId // Guardamos el vínculo
        }]);
    
    if (profileError) {
        console.error("Error al crear perfil:", profileError);
    }

    setLoadingState(btnSubmit, false, "Registrarse");
    alert('¡Registro exitoso! Revisa tu correo para confirmar y luego inicia sesión.');
    toggleAuth();
}

// Lógica de Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');
    const btnSubmit = document.querySelector('#login-form .btn-auth');

    if (!email || !password) {
        showAuthError("Por favor, introduce tu correo y contraseña.");
        return;
    }

    setLoadingState(btnSubmit, true, "Entrando...");

    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        showAuthError(error.message);
        setLoadingState(btnSubmit, false, "Entrar al Arrecife");
    } else {
        window.location.href = 'dashboard.html'; 
    }
}

// ==========================================
//        FUNCIONES AUXILIARES
// ==========================================

function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.innerText = message;
        errorEl.style.display = 'block';
    }
}

function setLoadingState(buttonElement, isLoading, text) {
    if (!buttonElement) return;
    buttonElement.disabled = isLoading;
    buttonElement.innerText = text;
    buttonElement.style.opacity = isLoading ? "0.7" : "1";
    buttonElement.style.cursor = isLoading ? "not-allowed" : "pointer";
}
