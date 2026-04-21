document.addEventListener('DOMContentLoaded', () => {
    if (api.getToken()) {
        window.location.href = 'index.html';
    }

    const registerForm = document.getElementById('registerForm');
    const alertBox = document.getElementById('alert');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await api.request('/register', 'POST', { name, email, password });
            alertBox.textContent = 'Registration successful! Redirecting to login...';
            alertBox.className = 'alert alert-success';
            alertBox.style.display = 'block';
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });
});
