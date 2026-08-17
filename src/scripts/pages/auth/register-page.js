import * as AuthAPI from '../../data/api';
import RegisterPresenter from './register-presenter';

export default class RegisterPage {
  #presenter = null;
  #form = null;
  #nameInput = null;
  #emailInput = null;
  #passwordInput = null;
  #confirmPasswordInput = null;
  #nameError = null;
  #emailError = null;
  #passwordError = null;
  #confirmPasswordError = null;
  #submitButton = null;

  async render() {
    return `
      <section class="container auth-container">
        <div class="auth-card">
          <h1>Daftar</h1>
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="name">Nama</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                required 
                aria-required="true"
                aria-label="Full name"
              />
              <span class="error-message" id="name-error" role="alert" aria-live="polite"></span>
            </div>
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
              <small>Minimal 8 karakter</small>
            </div>
            <div class="form-group">
              <label for="confirm-password">Konfirmasi Kata Sandi</label>
              <input 
                type="password" 
                id="confirm-password" 
                name="confirm-password" 
                required 
                aria-required="true"
                aria-label="Confirm password"
                minlength="8"
              />
              <span class="error-message" id="confirm-password-error" role="alert" aria-live="polite"></span>
            </div>
            <button type="submit" class="btn btn-primary">Daftar</button>
            <p class="auth-link">
              Sudah punya akun? <a href="#/login">Masuk di sini</a>
            </p>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // The View instantiates its own Presenter and hands it the data source
    // (model). From here on, RegisterPage never talks to the API directly.
    this.#presenter = new RegisterPresenter({
      view: this,
      model: AuthAPI,
    });

    this.#form = document.getElementById('register-form');
    this.#nameInput = document.getElementById('name');
    this.#emailInput = document.getElementById('email');
    this.#passwordInput = document.getElementById('password');
    this.#confirmPasswordInput = document.getElementById('confirm-password');
    this.#nameError = document.getElementById('name-error');
    this.#emailError = document.getElementById('email-error');
    this.#passwordError = document.getElementById('password-error');
    this.#confirmPasswordError = document.getElementById('confirm-password-error');
    this.#submitButton = this.#form.querySelector('button[type="submit"]');

    [this.#nameInput, this.#emailInput, this.#passwordInput, this.#confirmPasswordInput].forEach((input) => {
      input.addEventListener('input', () => {
        document.getElementById(`${input.id}-error`).textContent = '';
      });
    });

    this.#form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.#clearErrors();

      const name = this.#nameInput.value.trim();
      const email = this.#emailInput.value.trim();
      const password = this.#passwordInput.value;
      const confirmPassword = this.#confirmPasswordInput.value;

      if (!this.#validate({ name, email, password, confirmPassword })) {
        return;
      }

      await this.#presenter.register({ name, email, password });
    });
  }

  // --- Presentation-only helpers below: form validation and rendering
  // feedback. Everything about *what happens* with the registration attempt
  // lives in RegisterPresenter; this View only ever reacts to what the
  // Presenter tells it to show.

  #validate({ name, email, password, confirmPassword }) {
    let isValid = true;

    if (!name) {
      this.#nameError.textContent = 'Nama harus diisi';
      isValid = false;
    }

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

    if (!confirmPassword) {
      this.#confirmPasswordError.textContent = 'Konfirmasi kata sandi harus diisi';
      isValid = false;
    } else if (password !== confirmPassword) {
      this.#confirmPasswordError.textContent = 'Kata sandi tidak cocok';
      isValid = false;
    }

    return isValid;
  }

  #clearErrors() {
    [this.#nameError, this.#emailError, this.#passwordError, this.#confirmPasswordError].forEach((el) => {
      el.textContent = '';
    });
  }

  // --- Methods called by RegisterPresenter ---

  setSubmitting(isSubmitting) {
    this.#submitButton.disabled = isSubmitting;
    this.#submitButton.textContent = isSubmitting ? 'Memproses...' : 'Daftar';
  }

  showRegisterError(message) {
    this.#emailError.textContent = message;
  }

  onRegisterSuccess() {
    alert('Registrasi berhasil! Silakan login.');
    window.location.hash = '#/login';
  }
}
