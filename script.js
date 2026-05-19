// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';

// Usamos 'client' para evitar el error de "ya declarado"
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Alternar entre login y registro de forma fluida
function toggleAuth() {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    const errorEl = document.getElementById('auth-error');

    // Limpiar errores y ocultar caja de alerta al cambiar
    if (errorEl) {
        errorEl.innerText = "";
        errorEl.style.display = 'none';
    }

    // Limpiar campos de texto al alternar formularios
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

    // Efecto de carga en el botón
    setLoadingState(btnSubmit, true, "Registrando...");

    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: { 
            data: { username: username } 
        }
    });

    if (error) {
        showAuthError(error.message);
        setLoadingState(btnSubmit, false, "Registrarse");
    } else {
        // Creamos el perfil en la tabla de Supabase
        const { error: profileError } = await client
            .from('profiles')
            .insert([{ 
                id: data.user.id, 
                username: username, 
                pearl_balance: 0 // Ajustado de perlas_balance para mantener coherencia con dashboard
            }]);
        
        if (profileError) {
            console.error("Error al crear perfil:", profileError);
        }

        setLoadingState(btnSubmit, false, "Registrarse");
        alert('¡Registro enviado! Revisa tu correo electrónico para confirmar tu cuenta y luego inicia sesión.');
        toggleAuth();
    }
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

    // Efecto de carga en el botón
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
//       FUNCIONES AUXILIARES DE INTERFAZ
// ==========================================

// Muestra los errores haciendo visible el contenedor estilizado
function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.innerText = message;
        errorEl.style.display = 'block';
    }
}

// Controla el estado visual de carga en los botones de acción
function setLoadingState(buttonElement, isLoading, text) {
    if (!buttonElement) return;
    if (isLoading) {
        buttonElement.disabled = true;
        buttonElement.innerText = text;
        buttonElement.style.opacity = "0.7";
        buttonElement.style.cursor = "not-allowed";
    } else {
        buttonElement.disabled = false;
        buttonElement.innerText = text;
        buttonElement.style.opacity = "1";
        buttonElement.style.cursor = "pointer";
    }
}
