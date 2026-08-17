export default class SavedStoriesPresenter {
  #view = null;
  #model = null;
  #allStories = [];
  #query = '';
  #sortBy = 'newest';
  #locationOnly = false;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async loadSavedStories() {
    this.#view.showLoadingState();
    try {
      this.#allStories = await this.#model.getSavedStories();
      this.#applyAndRender();
    } catch (error) {
      console.error('SavedStoriesPresenter#loadSavedStories error:', error);
      this.#view.showErrorState('Gagal memuat story tersimpan.');
    }
  }

  setQuery(query) {
    this.#query = query.trim().toLowerCase();
    this.#applyAndRender();
  }

  setSortBy(sortBy) {
    this.#sortBy = sortBy;
    this.#applyAndRender();
  }

  setLocationOnly(locationOnly) {
    this.#locationOnly = locationOnly;
    this.#applyAndRender();
  }

  async deleteStory(id) {
    try {
      await this.#model.deleteSavedStory(id);
      this.#allStories = this.#allStories.filter((story) => story.id !== id);
      this.#applyAndRender();
    } catch (error) {
      console.error('SavedStoriesPresenter#deleteStory error:', error);
    }
  }

  #applyAndRender() {
    let stories = [...this.#allStories];

    if (this.#query) {
      stories = stories.filter(
        (story) =>
          story.name?.toLowerCase().includes(this.#query) ||
          story.description?.toLowerCase().includes(this.#query),
      );
    }

    if (this.#locationOnly) {
      stories = stories.filter((story) => story.lat && story.lon);
    }

    stories.sort((a, b) => {
      if (this.#sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (this.#sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (this.#sortBy === 'oldest') return new Date(a.savedAt || a.createdAt) - new Date(b.savedAt || b.createdAt);
      // 'newest' default
      return new Date(b.savedAt || b.createdAt) - new Date(a.savedAt || a.createdAt);
    });

    this.#view.showStories(stories, this.#allStories.length);
  }
}
