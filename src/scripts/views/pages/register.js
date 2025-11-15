import StoryAPI from '../../data/story-api.js';
import Validator from '../../utils/validator.js';

const RegisterPage = {
  async render() {
    return `
      <div class="container">
        <div class="auth-container">
          <div class="auth-form">
            <h2 class="text-center mb-3">Create Account</h2>
            <p class="text-center text-secondary mb-3">Join us and start sharing your stories!</p>
            
            <form id="register-form" novalidate>
              <div class="form-group">
                <label for="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  class="form-control" 
                  placeholder="Enter your full name"
                  autocomplete="name"
                  required
                  aria-required="true"
                  aria-describedby="name-error"
                >
              </div>

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
                  placeholder="Minimum 8 characters"
                  autocomplete="new-password"
                  required
                  aria-required="true"
                  aria-describedby="password-error"
                >
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%;">
                Register
              </button>
            </form>

            <p class="text-center mt-3">
              Already have an account? 
              <a href="#/login">Login here</a>
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

    console.log('👤 Register page loaded');

    const form = document.getElementById('register-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Real-time validation
    nameInput.addEventListener('blur', () => {
      const validation = Validator.validateName(nameInput.value);
      if (!validation.isValid) {
        Validator.showError(nameInput, validation.message);
      } else {
        Validator.clearError(nameInput);
      }
    });

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

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      console.log('📝 Attempting registration for:', email);

      // Validate all fields
      const nameValidation = Validator.validateName(name);
      const emailValidation = Validator.validateEmail(email);
      const passwordValidation = Validator.validatePassword(password);

      let isValid = true;

      if (!nameValidation.isValid) {
        Validator.showError(nameInput, nameValidation.message);
        isValid = false;
      } else {
        Validator.clearError(nameInput);
      }

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
      submitBtn.textContent = 'Creating account...';

      try {
        console.log('📡 Sending registration request...');
        const result = await StoryAPI.register(name, email, password);
        
        console.log('✅ Registration successful!', result);
        
        // Show success message
        alert('Registration successful! ✅\n\nPlease login with your new account.');
        
        // Force redirect to login
        console.log('🔄 Redirecting to login page...');
        window.location.hash = '';
        setTimeout(() => {
          window.location.hash = '#/login';
        }, 100);
        
      } catch (error) {
        console.error('❌ Registration error:', error);
        alert(`Registration failed: ${error.message}\n\nPlease try with a different email.`);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  },
};

export default RegisterPage;