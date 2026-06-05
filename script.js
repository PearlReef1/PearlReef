// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Alternar entre login y registro
function toggleAuth() {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    const errorEl = document.getElementById('auth-error');

    if (errorEl) {
        errorEl.innerText = "";
        errorEl.style.display = 'none';
    }

    // Limpiamos los inputs al alternar
    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
        if(input.id !== 'reg-ref-code') input.value = ""; 
    });

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
    
    // Obtenemos el código de referido del input (si existe)
    const refInput = document.getElementById('reg-ref-code');
    const refCode = refInput ? refInput.value.trim().toUpperCase() : "";
    
    const btnSubmit = document.querySelector('#register-form .btn-auth');

    if (!email || !password || !username) {
        showAuthError("Por favor, rellena todos los campos.");
        return;
    }

    setLoadingState(btnSubmit, true, "Registrando...");

    // Registro enviando el username y el código de referido como texto
    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { 
                username: username,
                referral_code: refCode // Este código es el que tu Trigger en Supabase leerá
            }
        }
    });

    if (error) {
        showAuthError(error.message);
        setLoadingState(btnSubmit, false, "Registrarse");
        return;
    }

    // Si todo sale bien
    setLoadingState(btnSubmit, false, "Registrarse");
    alert('¡Registro exitoso! Ya puedes iniciar sesión.');
    
    // Limpiamos los campos después del éxito
    document.getElementById('reg-email').value = "";
    document.getElementById('reg-password').value = "";
    document.getElementById('reg-username').value = "";
    if(refInput) refInput.value = "";
    
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
