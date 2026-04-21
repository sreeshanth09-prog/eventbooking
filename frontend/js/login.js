document.addEventListener('DOMContentLoaded', () => {
    if (api.getToken()) {
        // Already logged in — redirect based on role
        const user = api.getUser();
        window.location.href = (user && user.is_admin) ? 'admin.html' : 'index.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const alertBox = document.getElementById('alert');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const data = await api.request('/login', 'POST', { email, password });
            api.setToken(data.token);
            api.setUser(data.user);

            // Redirect based on role
            if (data.user.is_admin) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });
});
