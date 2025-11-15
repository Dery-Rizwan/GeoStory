import StoryAPI from '../../data/story-api.js';
import Validator from '../../utils/validator.js';

const LoginPage = {
  async render() {
    return `
      <div class="container">
        <div class="auth-container">
          <div class="auth-form">
            <h2 class="text-center mb-3">Login to Story App</h2>
            <p class="text-center text-secondary mb-3">Welcome back! Please login to your account.</p>
            
            <form id="login-form" novalidate>
              <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  class="form-control" 
                  placeholder="Enter your email"
                  autocomplete="email"
                  required
                  aria-required="true"
                  aria-describedby="email-error"
                >
              </div>

              <div class="form-group">
                <label for="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  class="form-control" 
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                  aria-required="true"
                  aria-describedby="password-error"
                >
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%;">
                Login
              </button>
            </form>

            <p class="text-center mt-3">
              Don't have an account? 
              <a href="#/register">Register here</a>
            </p>
          </div>
        </div>
      </div>
    `;
  },

  async afterRender() {
    // Check if already logged in
    if (StoryAPI.isLoggedIn()) {
      console.log('✅ Already logged in, redirecting to home...');
      window.location.hash = '#/';
      return;
    }

    console.log('👤 Login page loaded');

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Real-time validation
    emailInput.addEventListener('blur', () => {
      const validation = Validator.validateEmail(emailInput.value);
      if (!validation.isValid) {
        Validator.showError(emailInput, validation.message);
      } else {
        Validator.clearError(emailInput);
      }
    });

    passwordInput.addEventListener('blur', () => {
      const validation = Validator.validatePassword(passwordInput.value);
      if (!validation.isValid) {
        Validator.showError(passwordInput, validation.message);
      } else {
        Validator.clearError(passwordInput);
      }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      console.log('🔐 Attempting login for:', email);

      // Validate all fields
      const emailValidation = Validator.validateEmail(email);
      const passwordValidation = Validator.validatePassword(password);

      let isValid = true;

      if (!emailValidation.isValid) {
        Validator.showError(emailInput, emailValidation.message);
        isValid = false;
      } else {
        Validator.clearError(emailInput);
      }

      if (!passwordValidation.isValid) {
        Validator.showError(passwordInput, passwordValidation.message);
        isValid = false;
      } else {
        Validator.clearError(passwordInput);
      }

      if (!isValid) {
        console.log('❌ Validation failed');
        return;
      }

      // Disable button and show loading
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      try {
        console.log('📡 Sending login request...');
        const result = await StoryAPI.login(email, password);
        
        console.log('✅ Login successful!', result);
        console.log('Token saved:', !!localStorage.getItem('token'));
        console.log('User ID:', localStorage.getItem('userId'));
        console.log('User Name:', localStorage.getItem('userName'));
        
        // Show success message
        alert('Login successful! Welcome back.');
        
        // Redirect to home immediately
        window.location.hash = '#/';
        
      } catch (error) {
        console.error('❌ Login error:', error);
        alert(`Login failed: ${error.message}\n\nPlease check your email and password, or try registering first.`);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  },
};

export default LoginPage;