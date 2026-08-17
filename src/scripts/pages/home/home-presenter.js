export default class HomePresenter {
  #view = null;
  #model = null;
  #stories = [];
  #selectedStoryId = null;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async loadStories(showLocationOnly = false) {
    this.#view.showLoadingState();

    try {
      const response = await this.#model.getAllStories({
        page: 1,
        size: 100,
        location: showLocationOnly ? 1 : 0,
      });

      if (response.error === false && response.listStory) {
        this.#stories = response.listStory;
        this.#selectedStoryId = null;
        this.#view.showStories(this.#stories, this.#selectedStoryId);
      } else {
        this.#view.showErrorState(response.message || 'Gagal memuat data story.');
      }
    } catch (error) {
      console.error('HomePresenter#loadStories error:', error);
      this.#view.showErrorState('Terjadi kesalahan saat memuat data.');
    }
  }

  selectStory(storyId, { openPopup = false } = {}) {
    this.#selectedStoryId = storyId;
    this.#view.showStories(this.#stories, this.#selectedStoryId, openPopup ? storyId : null);
  }

  getStories() {
    return this.#stories;
  }

  getSelectedStoryId() {
    return this.#selectedStoryId;
  }
}
