// CONFIGURACIÓN SUPABASE
// Nota: He limpiado la URL para que sea la base del proyecto
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';

// Usamos 'client' para evitar el error de "ya declarado"
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Alternar entre login y registro
function toggleAuth() {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    const errorEl = document.getElementById('auth-error');

    if (errorEl) errorEl.innerText = ""; // Limpiar errores al cambiar

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
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value;
    const errorEl = document.getElementById('auth-error');

    if (!email || !password || !username) {
        errorEl.innerText = "Por favor, rellena todos los campos.";
        return;
    }

    const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: { 
            data: { username: username } 
        }
    });

    if (error) {
        errorEl.innerText = error.message;
    } else {
        // Creamos el perfil en la tabla de Supabase
        const { error: profileError } = await client
            .from('profiles')
            .insert([{ 
                id: data.user.id, 
                username: username, 
                pearls_balance: 0 
            }]);
        
        if (profileError) {
            console.error("Error al crear perfil:", profileError);
        }

        alert('Registro enviado. ¡Revisa tu correo para confirmar tu cuenta y luego inicia sesión!');
        toggleAuth();
    }
}

// Lógica de Login
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');

    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        errorEl.innerText = error.message;
    } else {
        window.location.href = 'dashboard.html'; 
    }
}
