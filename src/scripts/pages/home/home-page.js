import * as StoryAPI from '../../data/api';
import { showFormattedDate } from '../../utils/index';
import { saveStory, deleteSavedStory, isStorySaved } from '../../data/database';
import HomePresenter from './home-presenter';

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = [];

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container home-section">
        <h1>Dicoding Stories</h1>
        <div class="stories-controls">
          <label for="location-filter">
            <input 
              type="checkbox" 
              id="location-filter" 
              name="location-filter"
              aria-label="Show only stories with location"
            />
            Tampilkan hanya story dengan lokasi
          </label>
        </div>
        <div class="stories-layout">
          <div class="stories-list-container">
            <h2>Daftar Story</h2>
            <div id="stories-list" class="stories-list" role="list">
              <p class="loading">Memuat data...</p>
            </div>
          </div>
          <div class="map-container">
            <h2>Peta Lokasi</h2>
            <div id="map" class="map" role="application" aria-label="Map showing story locations"></div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // The View instantiates its own Presenter and hands it the data source (model).
    // From here on, HomePage never talks to the API directly.
    this.#presenter = new HomePresenter({
      view: this,
      model: StoryAPI,
    });

    await this.#initMap();
    await this.#presenter.loadStories();
    this.#setupLocationFilter();
  }

  destroy() {
    // Release the Leaflet instance so it doesn't leak between page navigations.
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
    }
    this.#markers = [];
  }

  // ---------------------------------------------------------------------
  // View contract consumed by HomePresenter. The presenter only ever calls
  // these methods; it never touches the DOM or Leaflet directly.
  // ---------------------------------------------------------------------

  showLoadingState() {
    const storiesList = document.getElementById('stories-list');
    if (storiesList) {
      storiesList.innerHTML = '<p class="loading">Memuat data...</p>';
    }
  }

  showErrorState(message) {
    const storiesList = document.getElementById('stories-list');
    if (storiesList) {
      storiesList.innerHTML = `<p class="error">${message}</p>`;
    }
  }

  async showStories(stories, selectedStoryId, openPopupForStoryId = null) {
    const savedIds = await this.#getSavedIdSet(stories);
    this.#renderStoriesList(stories, selectedStoryId, savedIds);
    this.#renderMapMarkers(stories, selectedStoryId, openPopupForStoryId);
  }

  async #getSavedIdSet(stories) {
    const checks = await Promise.all(
      stories.map(async (story) => [story.id, await isStorySaved(story.id)]),
    );
    return new Set(checks.filter(([, saved]) => saved).map(([id]) => id));
  }

  // ---------------------------------------------------------------------
  // Pure view/DOM helpers below.
  // ---------------------------------------------------------------------

  async #initMap() {
    const L = await import('leaflet');

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

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

    this.#map = L.default.map('map').setView([-2.5489, 118.0149], 5);

    const osmLayer = L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    const cartoLayer = L.default.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
    });

    const esriLayer = L.default.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19,
    });

    osmLayer.addTo(this.#map);

    const baseMaps = {
      'OpenStreetMap': osmLayer,
      'CartoDB Light': cartoLayer,
      'Satellite': esriLayer,
    };

    L.default.control.layers(baseMaps).addTo(this.#map);
  }

  #renderStoriesList(stories, selectedStoryId, savedIds = new Set()) {
    const storiesList = document.getElementById('stories-list');
    if (!storiesList) return;

    if (stories.length === 0) {
      storiesList.innerHTML = '<p>Tidak ada story untuk ditampilkan.</p>';
      return;
    }

    storiesList.innerHTML = stories.map((story) => {
      const saved = savedIds.has(story.id);
      return `
      <article 
        class="story-card ${selectedStoryId === story.id ? 'active' : ''}" 
        data-story-id="${story.id}"
        role="listitem"
        tabindex="0"
        aria-label="Story by ${story.name}"
      >
        <img 
          src="${story.photoUrl}" 
          alt="${story.description || 'Story image'}" 
          class="story-image"
          loading="lazy"
        />
        <div class="story-content">
          <h3>${story.name}</h3>
          <p class="story-description">${story.description}</p>
          <p class="story-date">${showFormattedDate(story.createdAt, 'id-ID')}</p>
          ${story.lat && story.lon ? `
            <p class="story-location">
              <span class="location-icon">📍</span> Lokasi: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}
            </p>
          ` : ''}
          <div class="story-card-actions">
            <a href="#/stories/${story.id}" class="btn btn-outline btn-sm story-detail-link">Lihat Detail</a>
            <button
              type="button"
              class="btn btn-sm btn-save save-story-btn ${saved ? 'is-saved' : ''}"
              data-story-id="${story.id}"
              aria-pressed="${saved}"
              aria-label="${saved ? 'Hapus dari tersimpan' : 'Simpan story ini'}"
            >
              <span class="save-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                </svg>
              </span>
              <span class="save-label">${saved ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          </div>
        </div>
      </article>
    `;
    }).join('');

    storiesList.querySelectorAll('.story-card').forEach((card) => {
      const storyId = card.dataset.storyId;
      const story = stories.find((s) => s.id === storyId);

      const handleSelect = (event) => {
        if (event.target.closest('.story-card-actions')) return;
        this.#presenter.selectStory(storyId, { openPopup: true });
        if (story && story.lat && story.lon) {
          this.#map.setView([story.lat, story.lon], 13);
        }
      };

      card.addEventListener('click', handleSelect);
      card.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.story-card-actions')) {
          e.preventDefault();
          handleSelect(e);
        }
      });
    });

    storiesList.querySelectorAll('.save-story-btn').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const storyId = button.dataset.storyId;
        const story = stories.find((s) => s.id === storyId);
        const label = button.querySelector('.save-label');
        button.disabled = true;

        try {
          const alreadySaved = await isStorySaved(storyId);
          let nowSaved;
          if (alreadySaved) {
            await deleteSavedStory(storyId);
            nowSaved = false;
            button.setAttribute('aria-label', 'Simpan story ini');
          } else {
            await saveStory(story);
            nowSaved = true;
            button.setAttribute('aria-label', 'Hapus dari tersimpan');
          }
          button.classList.toggle('is-saved', nowSaved);
          button.setAttribute('aria-pressed', String(nowSaved));
          if (label) label.textContent = nowSaved ? 'Tersimpan' : 'Simpan';

          button.classList.remove('save-pop');
          void button.offsetWidth;
          button.classList.add('save-pop');
        } catch (error) {
          console.error('Failed to toggle saved story:', error);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  #renderMapMarkers(stories, selectedStoryId, openPopupForStoryId) {
    this.#markers.forEach((marker) => this.#map.removeLayer(marker));
    this.#markers = [];

    import('leaflet').then((L) => {
      if (!L.default.Icon.Default.prototype._iconUrl) {
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
      }

      const storiesWithLocation = stories.filter((s) => s.lat && s.lon);
      let markerToOpen = null;

      storiesWithLocation.forEach((story) => {
        const marker = L.default.marker([story.lat, story.lon])
          .addTo(this.#map)
          .bindPopup(`
            <div class="popup-content">
              <img src="${story.photoUrl}" alt="${story.description || 'Story image'}" loading="lazy" />
              <div class="popup-body">
                <h3 class="popup-title">${story.name}</h3>
                <p>${story.description || 'Tidak ada deskripsi'}</p>
                <div class="popup-footer">
                  <div class="popup-date">
                    <span class="popup-date-icon">📅</span>
                    <span>${showFormattedDate(story.createdAt, 'id-ID')}</span>
                  </div>
                </div>
                <div class="popup-location">
                  <span class="popup-location-icon">📍</span>
                  <span>${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</span>
                </div>
              </div>
            </div>
          `, {
            maxWidth: 320,
            className: 'custom-popup',
          });

        if (selectedStoryId === story.id) {
          marker.setIcon(L.default.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }));
        }

        marker.on('click', () => {
          this.#presenter.selectStory(story.id, { openPopup: true });
        });

        this.#markers.push(marker);

        if (openPopupForStoryId === story.id) {
          markerToOpen = marker;
        }
      });

      if (markerToOpen) {
        setTimeout(() => markerToOpen.openPopup(), 100);
      }
    });
  }

  #setupLocationFilter() {
    const filterCheckbox = document.getElementById('location-filter');
    filterCheckbox.addEventListener('change', async (e) => {
      await this.#presenter.loadStories(e.target.checked);
    });
  }
}
