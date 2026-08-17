import * as AuthAPI from '../../data/api';
import LoginPresenter from './login-presenter';

export default class LoginPage {
  #presenter = null;
  #form = null;
  #emailInput = null;
  #passwordInput = null;
  #emailError = null;
  #passwordError = null;
  #submitButton = null;

  async render() {
    return `
      <section class="container auth-container">
        <div class="auth-card">
          <h1>Masuk</h1>
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                aria-required="true"
                aria-label="Email address"
              />
              <span class="error-message" id="email-error" role="alert" aria-live="polite"></span>
            </div>
            <div class="form-group">
              <label for="password">Kata Sandi</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                aria-required="true"
                aria-label="Password"
                minlength="8"
              />
              <span class="error-message" id="password-error" role="alert" aria-live="polite"></span>
            </div>
            <button type="submit" class="btn btn-primary">Masuk</button>
            <p class="auth-link">
              Belum punya akun? <a href="#/register">Daftar di sini</a>
            </p>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // The View instantiates its own Presenter and hands it the data source
    // (model). From here on, LoginPage never talks to the API directly.
    this.#presenter = new LoginPresenter({
      view: this,
      model: AuthAPI,
    });

    this.#form = document.getElementById('login-form');
    this.#emailInput = document.getElementById('email');
    this.#passwordInput = document.getElementById('password');
    this.#emailError = document.getElementById('email-error');
    this.#passwordError = document.getElementById('password-error');
    this.#submitButton = this.#form.querySelector('button[type="submit"]');

    this.#emailInput.addEventListener('input', () => {
      this.#emailError.textContent = '';
    });
    this.#passwordInput.addEventListener('input', () => {
      this.#passwordError.textContent = '';
    });

    this.#form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.#clearErrors();

      const email = this.#emailInput.value.trim();
      const password = this.#passwordInput.value;

      if (!this.#validate(email, password)) {
        return;
      }

      await this.#presenter.login({ email, password });
    });
  }

  // --- Presentation-only helpers below: form validation and rendering
  // feedback. Everything about *what happens* with the login attempt lives
  // in LoginPresenter; this View only ever reacts to what the Presenter
  // tells it to show.

  #validate(email, password) {
    let isValid = true;

    if (!email) {
      this.#emailError.textContent = 'Email harus diisi';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.#emailError.textContent = 'Format email tidak valid';
      isValid = false;
    }

    if (!password) {
      this.#passwordError.textContent = 'Kata sandi harus diisi';
      isValid = false;
    } else if (password.length < 8) {
      this.#passwordError.textContent = 'Kata sandi minimal 8 karakter';
      isValid = false;
    }

    return isValid;
  }

  #clearErrors() {
    this.#emailError.textContent = '';
    this.#passwordError.textContent = '';
  }

  // --- Methods called by LoginPresenter ---

  setSubmitting(isSubmitting) {
    this.#submitButton.disabled = isSubmitting;
    this.#submitButton.textContent = isSubmitting ? 'Memproses...' : 'Masuk';
  }

  showLoginError(message) {
    this.#emailError.textContent = message;
  }

  onLoginSuccess() {
    window.location.hash = '#/';
    window.location.reload();
  }
}
