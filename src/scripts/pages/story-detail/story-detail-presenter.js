import { getSavedStoryById } from '../../data/database';

export default class StoryDetailPresenter {
  #view = null;
  #model = null;
  #storyId = null;

  constructor({ view, model, storyId }) {
    this.#view = view;
    this.#model = model;
    this.#storyId = storyId;
  }

  async loadStory() {
    this.#view.showLoadingState();

    try {
      const response = await this.#model.getStoryDetail(this.#storyId);

      if (response.error === false && response.story) {
        this.#view.showStory(response.story);
        return;
      }

      await this.#loadFromLocalFallback(response.message);
    } catch (error) {
      console.error('StoryDetailPresenter#loadStory error:', error);
      await this.#loadFromLocalFallback('Terjadi kesalahan saat memuat story.');
    }
  }

  async #loadFromLocalFallback(originalMessage) {
    // Offline (or the request failed for another reason): fall back to a
    // locally saved copy of this story, if the user bookmarked it before.
    try {
      const saved = await getSavedStoryById(this.#storyId);
      if (saved) {
        this.#view.showStory(saved, { fromCache: true });
        return;
      }
    } catch (dbError) {
      console.error('StoryDetailPresenter local fallback error:', dbError);
    }

    this.#view.showErrorState(originalMessage || 'Story tidak ditemukan dan tidak tersedia secara offline.');
  }
}
