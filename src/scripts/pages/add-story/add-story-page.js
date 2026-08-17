import * as StoryAPI from '../../data/api';
import AddStoryPresenter from './add-story-presenter';

const ICONS = {
  upload: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M12 4l-4 4M12 4l4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>`,
  camera: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h1.2a1 1 0 0 0 .86-.5l.68-1.16A1 1 0 0 1 9.6 4h4.8a1 1 0 0 1 .86.34l.68 1.16a1 1 0 0 0 .86.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.5" /></svg>`,
  check: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>`,
  close: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.8A1 1 0 0 1 10 4h4a1 1 0 0 1 1 1V7m2 0-.7 12.3A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-1.7L7 7" /></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>`,
};

export default class AddStoryPage {
  #presenter = null;
  #map = null;
  #selectedLat = null;
  #selectedLon = null;
  #marker = null;
  #stream = null;
  #form = null;
  #submitButton = null;
  #originalSubmitLabel = '';

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container add-story-section">
        <h1>Tambah Story Baru</h1>
        <p class="page-subtitle">Bagikan momenmu lengkap dengan foto dan lokasinya.</p>

        <form id="add-story-form" class="add-story-form">
          <div class="form-group">
            <label for="description">Deskripsi</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              required
              aria-required="true"
              aria-label="Story description"
              placeholder="Ceritakan pengalaman Anda..."
            ></textarea>
            <span class="error-message" id="description-error" role="alert" aria-live="polite"></span>
          </div>

          <div class="form-group">
            <label for="photo">Foto</label>
            <p class="field-hint">Unggah dari perangkat atau ambil langsung dari kamera. Ukuran maksimal 1MB.</p>

            <div class="photo-input-group">
              <label for="photo" class="btn btn-outline upload-btn">
                ${ICONS.upload}
                <span>Pilih File</span>
              </label>
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/*"
                required
                aria-required="true"
                aria-label="Photo file"
                class="visually-hidden-input"
              />
              <button
                type="button"
                id="camera-button"
                class="btn btn-secondary"
                aria-label="Take photo with camera"
              >
                ${ICONS.camera}
                <span>Ambil Foto dari Kamera</span>
              </button>
            </div>

            <p id="photo-filename" class="photo-filename"></p>
            <div id="photo-preview" class="photo-preview"></div>
            <span class="error-message" id="photo-error" role="alert" aria-live="polite"></span>
          </div>

          <div class="form-group">
            <label id="location-label">Lokasi (Opsional)</label>
            <p class="field-hint">
              Klik pada peta di bawah untuk memilih lokasi. Atau biarkan kosong jika tidak ingin menambahkan lokasi.
            </p>
            <div id="selected-location" class="selected-location" aria-live="polite" role="status">
              <span class="selected-location-text">Belum ada lokasi yang dipilih</span>
            </div>
            <button
              type="button"
              id="clear-location"
              class="btn btn-outline btn-sm"
              style="display: none;"
              aria-label="Clear selected location"
            >
              ${ICONS.trash}
              <span>Hapus Lokasi</span>
            </button>
          </div>

          <div class="form-group">
            <div id="map" class="map map-selector" role="application" aria-label="Map for selecting location"></div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Kirim Story</button>
            <a href="#/" class="btn btn-secondary">Batal</a>
          </div>

          <div id="form-message" class="form-message" role="alert" aria-live="polite"></div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    // The View instantiates its own Presenter and hands it the data source
    // (model). From here on, AddStoryPage never talks to the API directly.
    this.#presenter = new AddStoryPresenter({
      view: this,
      model: StoryAPI,
    });

    await this.#initMap();
    this.#setupForm();
    this.#setupCamera();
    this.#setupLocationClear();
  }

  destroy() {
    // Called by App#renderPage every time we navigate away from this page —
    // including via the browser's Back button, which only fires a hashchange
    // event, not a click on the "Batal" button. Without this, a camera stream
    // started here could keep running (indicator light on) in the background.
    this.#stopCamera();

    if (this.#map) {
      this.#map.remove();
      this.#map = null;
    }
  }

  async #initMap() {
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

    this.#map = L.default.map('map').setView([-2.5489, 118.0149], 5);

    L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.#map);

    this.#map.on('click', (e) => {
      this.#selectLocation(e.latlng.lat, e.latlng.lng);
    });
  }

  #selectLocation(lat, lon) {
    this.#selectedLat = lat;
    this.#selectedLon = lon;

    if (this.#marker) {
      this.#map.removeLayer(this.#marker);
    }

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

      const customIcon = L.default.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      this.#marker = L.default.marker([lat, lon], { icon: customIcon })
        .addTo(this.#map)
        .bindPopup(`
          <div class="popup-content">
            <div class="popup-body">
              <h2 class="popup-title">📍 Lokasi Dipilih</h2>
              <p>Lokasi ini akan digunakan untuk story Anda</p>
              <div class="popup-footer">
                <div class="popup-location">
                  <span class="popup-location-icon">🌐</span>
                  <span>Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>
        `, {
          maxWidth: 320,
          className: 'custom-popup',
        })
        .openPopup();

      this.#map.setView([lat, lon], 13, { animate: true });
    });

    const locationInfo = document.getElementById('selected-location');
    const clearButton = document.getElementById('clear-location');
    if (locationInfo) {
      locationInfo.innerHTML = `
        ${ICONS.pin}
        <span class="selected-location-text">Lokasi terpilih: ${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
      `;
      locationInfo.classList.add('has-location');
    }
    if (clearButton) {
      clearButton.style.display = 'inline-flex';
    }
  }

  #setupLocationClear() {
    const clearButton = document.getElementById('clear-location');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.#selectedLat = null;
        this.#selectedLon = null;

        if (this.#marker) {
          this.#map.removeLayer(this.#marker);
          this.#marker = null;
        }

        const locationInfo = document.getElementById('selected-location');
        if (locationInfo) {
          locationInfo.innerHTML = '<span class="selected-location-text">Belum ada lokasi yang dipilih</span>';
          locationInfo.classList.remove('has-location');
        }
        clearButton.style.display = 'none';
      });
    }
  }

  #setupCamera() {
    const cameraButton = document.getElementById('camera-button');
    const photoInput = document.getElementById('photo');

    if (cameraButton && photoInput) {
      cameraButton.addEventListener('click', async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Kamera tidak didukung di browser Anda.');
            return;
          }

          this.#stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });

          const video = document.createElement('video');
          video.className = 'camera-video';
          video.srcObject = this.#stream;
          video.autoplay = true;
          video.playsInline = true;
          video.muted = true;

          const videoWrap = document.createElement('div');
          videoWrap.className = 'camera-video-wrap';
          videoWrap.appendChild(video);

          const captureButton = document.createElement('button');
          captureButton.type = 'button';
          captureButton.className = 'btn btn-primary';
          captureButton.innerHTML = `${ICONS.check}<span>Ambil Foto</span>`;

          const cancelButton = document.createElement('button');
          cancelButton.type = 'button';
          cancelButton.className = 'btn btn-secondary';
          cancelButton.innerHTML = `${ICONS.close}<span>Batal</span>`;

          // Controls sit in their own row *below* the video, so they can
          // never end up floating beside or on top of the camera preview.
          const controls = document.createElement('div');
          controls.className = 'camera-controls';
          controls.appendChild(captureButton);
          controls.appendChild(cancelButton);

          const previewContainer = document.createElement('div');
          previewContainer.className = 'camera-preview';
          previewContainer.innerHTML = `
            <h2 class="camera-preview-title">
              ${ICONS.camera}
              <span>Ambil Foto</span>
            </h2>
          `;
          previewContainer.appendChild(videoWrap);
          previewContainer.appendChild(controls);

          const photoPreview = document.getElementById('photo-preview');
          photoPreview.innerHTML = '';
          photoPreview.appendChild(previewContainer);

          captureButton.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                photoInput.files = dataTransfer.files;

                this.#updatePhotoPreview(file);
              }
            }, 'image/jpeg', 0.9);

            this.#stopCamera();
          });

          cancelButton.addEventListener('click', () => {
            this.#stopCamera();
            photoPreview.innerHTML = '';
          });
        } catch (error) {
          console.error('Camera error:', error);
          alert('Tidak dapat mengakses kamera. Pastikan Anda memberikan izin akses kamera.');
        }
      });
    }

    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 1024 * 1024) {
            const photoError = document.getElementById('photo-error');
            if (photoError) {
              photoError.textContent = 'Ukuran file maksimal 1MB';
            }
            photoInput.value = '';
            return;
          }
          this.#updatePhotoPreview(file);
        }
      });
    }
  }

  #updatePhotoPreview(fileOrBlob) {
    const photoPreview = document.getElementById('photo-preview');
    const photoError = document.getElementById('photo-error');
    const photoFilename = document.getElementById('photo-filename');

    if (photoError) {
      photoError.textContent = '';
    }

    const sizeKb = (fileOrBlob.size / 1024).toFixed(0);
    if (photoFilename) {
      photoFilename.textContent = `${fileOrBlob.name || 'camera-photo.jpg'} · ${sizeKb} KB`;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.innerHTML = `
        <div class="photo-preview-card">
          <img src="${e.target.result}" alt="Pratinjau foto yang akan diunggah" />
          <button type="button" id="remove-photo" class="photo-remove-btn" aria-label="Hapus foto">
            ${ICONS.close}
          </button>
        </div>
      `;

      const removeButton = document.getElementById('remove-photo');
      if (removeButton) {
        removeButton.addEventListener('click', () => {
          const photoInput = document.getElementById('photo');
          if (photoInput) photoInput.value = '';
          if (photoFilename) photoFilename.textContent = '';
          photoPreview.innerHTML = '';
        });
      }
    };
    reader.readAsDataURL(fileOrBlob);
  }

  #stopCamera() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => track.stop());
      this.#stream = null;
    }
  }

  #setupForm() {
    const form = document.getElementById('add-story-form');
    const descriptionInput = document.getElementById('description');
    const descriptionError = document.getElementById('description-error');
    const formMessage = document.getElementById('form-message');

    this.#form = form;
    this.#submitButton = form.querySelector('button[type="submit"]');
    this.#originalSubmitLabel = this.#submitButton.innerHTML;

    if (descriptionInput) {
      descriptionInput.addEventListener('input', () => {
        if (descriptionError) descriptionError.textContent = '';
        if (formMessage) formMessage.textContent = '';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      this.#clearFormFeedback();

      const description = descriptionInput.value.trim();
      const photoInput = document.getElementById('photo');
      const photo = photoInput.files[0];

      if (!this.#validate(description, photo)) {
        return;
      }

      await this.#presenter.submitStory({
        description,
        photo,
        lat: this.#selectedLat,
        lon: this.#selectedLon,
      });
    });
  }

  // --- Presentation-only helpers below: form validation and rendering
  // feedback. Everything about *what happens* with the submission — calling
  // the API and interpreting the result — lives in AddStoryPresenter; this
  // View only ever reacts to what the Presenter tells it to show.

  #validate(description, photo) {
    const descriptionError = document.getElementById('description-error');
    const photoError = document.getElementById('photo-error');
    let isValid = true;

    if (!description) {
      if (descriptionError) descriptionError.textContent = 'Deskripsi harus diisi';
      isValid = false;
    }

    if (!photo) {
      if (photoError) photoError.textContent = 'Foto harus dipilih';
      isValid = false;
    } else if (photo.size > 1024 * 1024) {
      if (photoError) photoError.textContent = 'Ukuran file maksimal 1MB';
      isValid = false;
    } else if (!photo.type.startsWith('image/')) {
      if (photoError) photoError.textContent = 'File harus berupa gambar';
      isValid = false;
    }

    return isValid;
  }

  #clearFormFeedback() {
    const descriptionError = document.getElementById('description-error');
    const photoError = document.getElementById('photo-error');
    const formMessage = document.getElementById('form-message');

    if (descriptionError) descriptionError.textContent = '';
    if (photoError) photoError.textContent = '';
    if (formMessage) {
      formMessage.textContent = '';
      formMessage.className = 'form-message';
    }
  }

  // --- Methods called by AddStoryPresenter ---

  setSubmitting(isSubmitting) {
    this.#submitButton.disabled = isSubmitting;
    this.#submitButton.innerHTML = isSubmitting ? 'Mengirim...' : this.#originalSubmitLabel;
  }

  showFormError(message) {
    const formMessage = document.getElementById('form-message');
    if (formMessage) {
      formMessage.textContent = message;
      formMessage.className = 'form-message error';
    }
  }

  onSubmitQueued() {
    const formMessage = document.getElementById('form-message');
    if (formMessage) {
      formMessage.textContent = 'Kamu sedang offline. Story disimpan di perangkat dan akan otomatis terkirim saat koneksi kembali.';
      formMessage.className = 'form-message success';
    }

    this.#resetFormState();

    setTimeout(() => {
      window.location.hash = '#/';
    }, 2500);
  }

  onSubmitSuccess() {
    const formMessage = document.getElementById('form-message');
    if (formMessage) {
      formMessage.textContent = 'Story berhasil ditambahkan!';
      formMessage.className = 'form-message success';
    }

    this.#resetFormState();

    setTimeout(() => {
      window.location.hash = '#/';
    }, 2000);
  }

  #resetFormState() {
    this.#form.reset();
    this.#selectedLat = null;
    this.#selectedLon = null;
    if (this.#marker) {
      this.#map.removeLayer(this.#marker);
      this.#marker = null;
    }
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('photo-filename').textContent = '';
    document.getElementById('selected-location').innerHTML =
      '<span class="selected-location-text">Belum ada lokasi yang dipilih</span>';
    document.getElementById('selected-location').classList.remove('has-location');
    document.getElementById('clear-location').style.display = 'none';
  }
}
