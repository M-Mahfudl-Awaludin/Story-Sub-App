import { addToOutbox } from '../../data/database';
import { refreshPendingCount, flushOutbox } from '../../utils/sync-manager';

export default class AddStoryPresenter {
  #view = null;
  #model = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async submitStory({ description, photo, lat, lon }) {
    this.#view.setSubmitting(true);

    // Offline: skip the network call entirely and queue the submission so
    // it can be synced automatically once the connection comes back.
    if (!navigator.onLine) {
      await this.#queueForLater({ description, photo, lat, lon });
      this.#view.setSubmitting(false);
      return;
    }

    try {
      const response = await this.#model.addStory({ description, photo, lat, lon });

      if (response.error === false) {
        this.#view.onSubmitSuccess();
      } else {
        this.#view.showFormError(response.message || 'Gagal menambahkan story. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('AddStoryPresenter#submitStory error:', error);
      // A thrown fetch error here is almost always a lost connection —
      // queue it instead of just showing an error, so the story isn't lost.
      await this.#queueForLater({ description, photo, lat, lon });
    } finally {
      this.#view.setSubmitting(false);
    }
  }

  async #queueForLater({ description, photo, lat, lon }) {
    try {
      await addToOutbox({
        description,
        photoBlob: photo,
        photoName: photo.name,
        photoType: photo.type,
        lat,
        lon,
      });
      await refreshPendingCount();
      this.#view.onSubmitQueued();
      flushOutbox(); // no-op if still offline; picks it up immediately if not
    } catch (error) {
      console.error('AddStoryPresenter#queueForLater error:', error);
      this.#view.showFormError('Gagal menyimpan story secara offline. Silakan coba lagi.');
    }
  }
}
