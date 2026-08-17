import { saveUserData } from '../../utils/index';

export default class LoginPresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async login({ email, password }) {
    this.#view.setSubmitting(true);

    try {
      const response = await this.#model.loginUser({ email, password });

      if (response.error === false) {
        // Persisting the session is data management, so it belongs here
        // (Presenter/Model side), not inside the View.
        saveUserData(response.loginResult);
        this.#view.onLoginSuccess();
      } else {
        this.#view.showLoginError(response.message || 'Login gagal. Periksa email dan kata sandi Anda.');
      }
    } catch (error) {
      console.error('LoginPresenter#login error:', error);
      this.#view.showLoginError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      this.#view.setSubmitting(false);
    }
  }
}
