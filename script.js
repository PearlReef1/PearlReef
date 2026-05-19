// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Detectar código de referido de la URL al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        localStorage.setItem('pending_referral_code', refCode);
        console.log("📌 Código de invitado detectado y listo:", refCode);
    }
});

// 2. Alternar entre login y registro
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

// 3. Lógica ÚNICA de Registro
async function handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value.trim();
    const btnSubmit = document.querySelector('#register-form .btn-auth');
    const errorEl = document.getElementById('auth-error');

    if (!email || !password || !username) {
        showAuthError("Por favor, rellena todos los campos.");
        return;
    }

    setLoadingState(btnSubmit, true, "Registrando...");

    // Buscar patrocinador
    let sponsorId = null;
    const refCode = localStorage.getItem('pending_referral_code');

    if (refCode) {
        const { data: sponsor } = await client
            .from('profiles')
            .select('id')
            .eq('referral_code', refCode)
            .single();

        if (sponsor) sponsorId = sponsor.id;
        localStorage.removeItem('pending_referral_code');
    }

    // Registrar en Auth
    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { 
                username: username,
                referred_by: sponsorId // Esto será leído por el trigger en Supabase
            }
        }
    });

    if (error) {
        showAuthError(error.message);
        setLoadingState(btnSubmit, false, "Registrarse");
        return;
    }

    // Inserción manual de perfil (si no usas Trigger, descomenta esto)
    /*
    await client.from('profiles').insert([{ 
        id: data.user.id, 
        username: username, 
        referred_by: sponsorId 
    }]);
    */

    setLoadingState(btnSubmit, false, "Registrarse");
    alert('¡Registro exitoso! Revisa tu correo y luego inicia sesión.');
    toggleAuth();
}

// 4. Lógica de Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
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

// 5. FUNCIONES AUXILIARES
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
