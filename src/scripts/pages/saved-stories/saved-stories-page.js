import * as StoryDB from '../../data/database';
import { showFormattedDate } from '../../utils/index';
import SavedStoriesPresenter from './saved-stories-presenter';

export default class SavedStoriesPage {
  #presenter = null;

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container saved-stories-section">
        <div class="saved-hero">
          <span class="saved-hero-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
            </svg>
          </span>
          <div>
            <h1>Story Tersimpan</h1>
            <p class="page-subtitle">
              Story yang kamu simpan tersedia di perangkat ini, termasuk saat offline.
            </p>
          </div>
        </div>

        <div class="saved-stories-toolbar">
          <div class="saved-search-wrap">
            <svg class="saved-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              id="saved-search"
              class="saved-search-input"
              placeholder="Cari berdasarkan nama atau deskripsi..."
              aria-label="Cari story tersimpan"
            />
          </div>
          <div class="saved-toolbar-filters">
            <select id="saved-sort" class="saved-sort-select" aria-label="Urutkan story tersimpan">
              <option value="newest">Terbaru disimpan</option>
              <option value="oldest">Terlama disimpan</option>
              <option value="name-asc">Nama (A-Z)</option>
              <option value="name-desc">Nama (Z-A)</option>
            </select>
            <label class="saved-location-filter toggle-chip">
              <input type="checkbox" id="saved-location-only" class="toggle-chip-input" aria-label="Hanya story dengan lokasi" />
              <span class="toggle-chip-box" aria-hidden="true"></span>
              Hanya dengan lokasi
            </label>
          </div>
        </div>

        <p id="saved-count" class="saved-count" aria-live="polite"></p>
        <div id="saved-stories-list" class="stories-list saved-stories-list" role="list">
          <p class="loading">Memuat story tersimpan...</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new SavedStoriesPresenter({
      view: this,
      model: StoryDB,
    });

    this.#setupControls();
    await this.#presenter.loadSavedStories();
  }

  destroy() {}

  showLoadingState() {
    const list = document.getElementById('saved-stories-list');
    if (list) list.innerHTML = '<p class="loading">Memuat story tersimpan...</p>';
  }

  showErrorState(message) {
    const list = document.getElementById('saved-stories-list');
    if (list) list.innerHTML = `<p class="error">${message}</p>`;
  }

  showStories(stories, totalCount) {
    const list = document.getElementById('saved-stories-list');
    const count = document.getElementById('saved-count');

    if (count) {
      count.textContent = totalCount === 0
        ? 'Belum ada story yang disimpan.'
        : `Menampilkan ${stories.length} dari ${totalCount} story tersimpan.`;
    }

    if (!list) return;

    if (stories.length === 0) {
      list.innerHTML = totalCount === 0
        ? `
          <div class="saved-empty-state">
            <span class="saved-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
              </svg>
            </span>
            <p>Belum ada story tersimpan.</p>
            <p class="saved-empty-hint">Buka sebuah story dan tekan tombol <strong>Simpan</strong> untuk menyimpannya di sini agar bisa dibuka lagi saat offline.</p>
            <a href="#/" class="btn btn-primary btn-sm">Jelajahi Story</a>
          </div>
        `
        : `
          <div class="saved-empty-state">
            <p>Tidak ada story tersimpan yang cocok dengan pencarian/filter.</p>
          </div>
        `;
      return;
    }

    list.innerHTML = stories.map((story) => `
      <article class="story-card saved-story-card" role="listitem" data-story-id="${story.id}">
        <div class="saved-story-media">
          <a href="#/stories/${story.id}">
            <img src="${story.photoUrl}" alt="${story.description || 'Story image'}" class="story-image" loading="lazy" />
          </a>
          <button type="button" class="saved-story-remove" data-story-id="${story.id}" aria-label="Hapus ${story.name} dari story tersimpan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            </svg>
          </button>
        </div>
        <div class="story-content">
          <h3><a href="#/stories/${story.id}">${story.name}</a></h3>
          <p class="story-description">${story.description}</p>
          <div class="saved-story-meta">
            <span class="story-date">🗓 ${showFormattedDate(story.createdAt, 'id-ID')}</span>
            ${story.lat && story.lon ? `
              <span class="story-location">📍 ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</span>
            ` : ''}
          </div>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('.saved-story-remove').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const id = button.dataset.storyId;
        button.disabled = true;
        await this.#presenter.deleteStory(id);
      });
    });
  }

  #setupControls() {
    const search = document.getElementById('saved-search');
    const sort = document.getElementById('saved-sort');
    const locationOnly = document.getElementById('saved-location-only');

    let debounceTimer;
    search.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.#presenter.setQuery(e.target.value), 200);
    });

    sort.addEventListener('change', (e) => this.#presenter.setSortBy(e.target.value));
    locationOnly.addEventListener('change', (e) => this.#presenter.setLocationOnly(e.target.checked));
  }
}
