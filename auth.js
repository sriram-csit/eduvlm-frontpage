// Authentication JavaScript for frontend
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        await this.checkAuthStatus();
        this.setupEventListeners();
        this.updateUI();
    }

    // Check if user is authenticated
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/user', {
                method: 'GET',
                credentials: 'include'
            });
            console.log('Auth check response:', response.status); // Debug log
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.isAuthenticated = true;
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }

        const showLoginBtn = document.getElementById('showLoginBtn');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => this.showLoginModal());
        }

        const showRegisterBtn = document.getElementById('showRegisterBtn');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => this.showRegisterModal());
        }

        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        const switchToRegister = document.getElementById('switchToRegister');
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
                this.showRegisterModal();
            });
        }

        const switchToLogin = document.getElementById('switchToLogin');
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
                this.showLoginModal();
            });
        }

        window.addEventListener('click', (e) => {
            const loginModal = document.getElementById('loginModal');
            const registerModal = document.getElementById('registerModal');
            if ((loginModal && e.target === loginModal) || (registerModal && e.target === registerModal)) {
                this.closeModals();
            }
        });
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            this.showLoading('loginForm');
            console.log('Attempting login with:', { email }); // Debug log
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('Login response:', response.status, data); // Debug log

            if (response.ok) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.closeModals();
                this.updateUI();
                this.showMessage('Login successful!', 'success');
                form.reset();
                // Refresh page to update detection UI
                window.location.reload();
            } else {
                this.showError('loginForm', data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginForm', 'Network error. Please try again.');
        } finally {
            this.hideLoading('loginForm');
        }
    }

    // Handle registration
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName')
        };

        const confirmPassword = formData.get('confirmPassword');
        if (userData.password !== confirmPassword) {
            this.showError('registerForm', 'Passwords do not match');
            return;
        }

        try {
            this.showLoading('registerForm');
            console.log('Attempting registration with:', { email: userData.email }); // Debug log
            
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            console.log('Register response:', response.status, data); // Debug log

            if (response.ok) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.closeModals();
                this.updateUI();
                this.showMessage('Registration successful!', 'success');
                form.reset();
                // Refresh page to update detection UI
                window.location.reload();
            } else {
                const errorMsg = data.error || (data.errors && data.errors[0]?.msg) || 'Registration failed';
                this.showError('registerForm', errorMsg);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('registerForm', 'Network error. Please try again.');
        } finally {
            this.hideLoading('registerForm');
        }
    }

    // Handle logout
    async handleLogout(e) {
        e.preventDefault();
        
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.updateUI();
                this.showMessage('Logged out successfully!', 'success');
                // Refresh page to update detection UI
                window.location.reload();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Update UI based on authentication status
    updateUI() {
        const authContainer = document.getElementById('authContainer');
        const userInfo = document.getElementById('userInfo');
        const detectionContainer = document.getElementById('detection-container');
        const loginPrompt = document.getElementById('login-prompt');

        console.log('Updating UI, isAuthenticated:', this.isAuthenticated); // Debug log
        if (this.isAuthenticated && this.currentUser) {
            if (authContainer) authContainer.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                userInfo.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <span class="bg-gray-300 w-8 h-8 flex items-center justify-center rounded-full">${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}</span>
                        <span class="text-sm font-medium">Welcome, ${this.currentUser.username}</span>
                    </div>
                    <button id="logoutBtn" class="ml-2 text-sm text-academic-blue hover:underline">Logout</button>
                `;
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
            }
            if (detectionContainer) detectionContainer.style.display = 'block';
            if (loginPrompt) loginPrompt.style.display = 'none';
        } else {
            if (authContainer) authContainer.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            if (detectionContainer) detectionContainer.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = 'block';
        }
    }

    // Show login modal
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Show register modal
    showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Close all modals
    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal) modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
        this.clearErrors();
    }

    // Show loading state
    showLoading(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Loading...';
            }
        }
    }

    // Hide loading state
    hideLoading(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                const isLogin = formId === 'loginForm';
                submitBtn.textContent = isLogin ? 'Login' : 'Register';
            }
        }
    }

    // Show error message
    showError(formId, message) {
        const form = document.getElementById(formId);
        if (form) {
            let errorDiv = form.querySelector('.error-message');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                form.insertBefore(errorDiv, form.firstChild);
            }
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    // Clear errors
    clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(error => {
            if (error) error.style.display = 'none';
        });
    }

    // Show success/info message
    showMessage(message, type = 'info') {
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => {
            if (notification) notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});