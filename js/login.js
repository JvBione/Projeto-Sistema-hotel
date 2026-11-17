(() => {
    'use strict';

    const form = document.getElementById('loginForm');
    const title = document.getElementById('loginTitle');
    const description = document.getElementById('loginDescription');
    const error = document.getElementById('loginError');
    const submit = document.getElementById('loginSubmit');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const launcherMessage = document.getElementById('launcherMessage');
    let setupMode = false;

    async function initialize() {
        try {
            const response = await fetch('/api/auth/status', { cache: 'no-store' });
            if (!response.ok) throw new Error('Não foi possível verificar o acesso.');

            const status = await response.json();
            if (status.authenticated) {
                window.location.replace('admin.html');
                return;
            }

            setupMode = !status.configured;
            title.textContent = setupMode ? 'Criar usuário administrador' : 'Entrar na administração';
            description.textContent = setupMode
                ? 'Crie o primeiro usuário para proteger o painel administrativo. A senha deve ter pelo menos 10 caracteres.'
                : 'Informe seu usuário e senha para acessar o painel administrativo.';
            submit.textContent = setupMode ? 'Criar usuário e entrar' : 'Entrar';
            password.autocomplete = setupMode ? 'new-password' : 'current-password';
            confirmPasswordGroup.hidden = !setupMode;
            confirmPassword.required = setupMode;
            form.hidden = false;
        } catch (err) {
            description.textContent = '';
            launcherMessage.hidden = false;
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';

        if (setupMode && password.value !== confirmPassword.value) {
            error.textContent = 'As senhas não conferem.';
            return;
        }

        submit.disabled = true;
        try {
            const response = await fetch(setupMode ? '/api/auth/setup' : '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: password.value
                })
            });
            const result = await response.json();

            if (!response.ok) {
                error.textContent = result.error || 'Não foi possível autenticar.';
                return;
            }

            window.location.replace('admin.html');
        } catch (err) {
            error.textContent = 'Falha ao comunicar com o servidor local. Tente novamente.';
        } finally {
            submit.disabled = false;
        }
    });

    initialize();
})();
