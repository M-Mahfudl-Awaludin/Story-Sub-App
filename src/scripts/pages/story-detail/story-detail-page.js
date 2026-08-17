import * as StoryAPI from '../../data/api';
import { showFormattedDate } from '../../utils/index';
import { saveStory, deleteSavedStory, isStorySaved } from '../../data/database';
import { parseActivePathname } from '../../routes/url-parser';
import StoryDetailPresenter from './story-detail-presenter';

export default class StoryDetailPage {
  #presenter = null;
  #map = null;
  #currentStory = null;

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container story-detail-section">
        <a href="#/" class="back-link">&larr; Kembali ke daftar story</a>
        <div id="story-detail-content">
          <p class="loading">Memuat story...</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const { id } = parseActivePathname();

    this.#presenter = new StoryDetailPresenter({
      view: this,
      model: StoryAPI,
      storyId: id,
    });

    await this.#presenter.loadStory();
  }

  destroy() {
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
    }
  }

  showLoadingState() {
    const content = document.getElementById('story-detail-content');
    if (content) content.innerHTML = '<p class="loading">Memuat story...</p>';
  }

  showErrorState(message) {
    const content = document.getElementById('story-detail-content');
    if (content) content.innerHTML = `<p class="error">${message}</p>`;
  }

  async showStory(story, { fromCache = false } = {}) {
    this.#currentStory = story;
    const content = document.getElementById('story-detail-content');
    if (!content) return;

    const saved = await isStorySaved(story.id);

    content.innerHTML = `
      ${fromCache ? '<p class="offline-banner" role="status">📴 Menampilkan salinan tersimpan (offline)</p>' : ''}
      <article class="story-detail-card">
        <img src="${story.photoUrl}" alt="${story.description || 'Story image'}" class="story-detail-image" />
        <div class="story-detail-body">
          <h1>${story.name}</h1>
          <p class="story-date">${showFormattedDate(story.createdAt, 'id-ID')}</p>
          <p class="story-detail-description">${story.description}</p>
          ${story.lat && story.lon ? `
            <p class="story-location">
              <span class="location-icon">📍</span> Lokasi: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}
            </p>
            <div id="detail-map" class="map story-detail-map" role="application" aria-label="Peta lokasi story"></div>
          ` : ''}
          <button type="button" id="save-toggle-btn" class="btn btn-save ${saved ? 'is-saved' : ''}" aria-pressed="${saved}">
            <span class="save-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
              </svg>
            </span>
            <span class="save-label">${saved ? 'Tersimpan' : 'Simpan Story Ini'}</span>
          </button>
        </div>
      </article>
    `;

    if (story.lat && story.lon) {
      await this.#initMap(story.lat, story.lon, story);
    }

    this.#setupSaveToggle(story, saved);
  }

  async #initMap(lat, lon, story) {
    const L = await import('leaflet');

    delete L.default.Icon.Default.prototype._getIconUrl;
    L.default.Icon.Default.mergeOptions({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.#map = L.default.map('detail-map').setView([lat, lon], 13);

    L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.#map);

    L.default.marker([lat, lon]).addTo(this.#map).bindPopup(story.name).openPopup();
  }

  #setupSaveToggle(story, initiallySaved) {
    const button = document.getElementById('save-toggle-btn');
    if (!button) return;

    let saved = initiallySaved;
    const label = button.querySelector('.save-label');

    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (saved) {
          await deleteSavedStory(story.id);
          saved = false;
        } else {
          await saveStory(story);
          saved = true;
        }
        button.classList.toggle('is-saved', saved);
        button.setAttribute('aria-pressed', String(saved));
        if (label) label.textContent = saved ? 'Tersimpan' : 'Simpan Story Ini';

        button.classList.remove('save-pop');
        // Force reflow so the animation class can be re-triggered on repeated clicks.
        void button.offsetWidth;
        button.classList.add('save-pop');
      } catch (error) {
        console.error('Failed to toggle saved story:', error);
      } finally {
        button.disabled = false;
      }
    });
  }
}
