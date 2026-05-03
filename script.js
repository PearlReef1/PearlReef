// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://hqmwdcfbqhugokqhxfhd.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_q5fCEu3VFtZs8cvmdLSoRQ__4USW-cl';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Alternar entre login y registro
function toggleAuth() {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
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

    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username: username } }
    });

    if (error) {
        errorEl.innerText = error.message;
    } else {
        // Crear perfil en la tabla 'profiles' que hicimos en SQL
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, username: username, pearls_balance: 0 }]);
        
        alert('Registro exitoso. Revisa tu correo o inicia sesión.');
        toggleAuth();
    }
}

// Lógica de Login
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.innerText = error.message;
    } else {
        window.location.href = 'dashboard.html'; // Nos lleva al juego
    }
}
