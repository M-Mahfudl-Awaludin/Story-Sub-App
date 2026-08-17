export default class RegisterPresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async register({ name, email, password }) {
    this.#view.setSubmitting(true);

    try {
      const response = await this.#model.registerUser({ name, email, password });

      if (response.error === false) {
        this.#view.onRegisterSuccess();
      } else {
        this.#view.showRegisterError(response.message || 'Registrasi gagal. Email mungkin sudah terdaftar.');
      }
    } catch (error) {
      console.error('RegisterPresenter#register error:', error);
      this.#view.showRegisterError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      this.#view.setSubmitting(false);
    }
  }
}
