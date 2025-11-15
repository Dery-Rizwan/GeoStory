import StoryAPI from '../../data/story-api.js';
import MapHelper from '../../utils/map-helper.js';
import Validator from '../../utils/validator.js';
import pushHelper from '../../utils/push-helper.js';
import idbHelper from '../../utils/idb-helper.js';

const AddStoryPage = {
  _map: null,
  _marker: null,
  _selectedLat: null,
  _selectedLon: null,

  async render() {
    return `
      <div class="container">
        <div class="add-story-container">
          <h2 class="text-center mb-3">Share Your Story</h2>
          
          <form id="add-story-form" class="add-story-form" novalidate>
            <div class="form-group">
              <label for="description">Story Description *</label>
              <textarea 
                id="description" 
                name="description" 
                class="form-control" 
                rows="5"
                placeholder="Tell us your story..."
                required
                aria-required="true"
                aria-describedby="description-error"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="photo">Photo *</label>
              <input 
                type="file" 
                id="photo" 
                name="photo" 
                class="form-control" 
                accept="image/jpeg,image/jpg,image/png"
                required
                aria-required="true"
                aria-describedby="photo-error"
              >
              <small class="text-secondary">Accepted formats: JPG, JPEG, PNG (Max 5MB)</small>
              
              <!-- Image Preview -->
              <div id="image-preview" class="image-preview" style="display: none; margin-top: 1rem;">
                <img id="preview-img" alt="Preview" style="max-width: 100%; height: auto; border-radius: 0.5rem;">
              </div>
            </div>

            <div class="form-group">
              <label for="map">Location * (Click on the map)</label>
              <div 
                id="add-story-map" 
                class="map-container" 
                style="height: 350px; border-radius: 0.5rem; overflow: hidden; border: 2px solid var(--border-color);"
              ></div>
              <div id="coordinates-display" class="mt-1" style="font-size: 0.875rem; color: var(--text-secondary);">
                Click on the map to select location
              </div>
            </div>

            <div class="form-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
              <a href="#/" class="btn" style="background-color: var(--bg-secondary); color: var(--text-primary);">
                Cancel
              </a>
              <button type="submit" class="btn btn-primary">
                Share Story
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async afterRender() {
    if (!StoryAPI.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    this._initMap();

    const form = document.getElementById('add-story-form');
    const descriptionInput = document.getElementById('description');
    const photoInput = document.getElementById('photo');

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      
      if (file) {
        const validation = Validator.validateFile(file);
        
        if (!validation.isValid) {
          Validator.showError(photoInput, validation.message);
          return;
        }
        
        Validator.clearError(photoInput);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const previewContainer = document.getElementById('image-preview');
          const previewImg = document.getElementById('preview-img');
          previewImg.src = event.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    descriptionInput.addEventListener('blur', () => {
      const validation = Validator.validateDescription(descriptionInput.value);
      if (!validation.isValid) {
        Validator.showError(descriptionInput, validation.message);
      } else {
        Validator.clearError(descriptionInput);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const description = descriptionInput.value.trim();
      const photo = photoInput.files[0];

      const descriptionValidation = Validator.validateDescription(description);
      const photoValidation = Validator.validateFile(photo);
      const coordinatesValidation = Validator.validateCoordinates(this._selectedLat, this._selectedLon);

      let isValid = true;

      if (!descriptionValidation.isValid) {
        Validator.showError(descriptionInput, descriptionValidation.message);
        isValid = false;
      } else {
        Validator.clearError(descriptionInput);
      }

      if (!photoValidation.isValid) {
        Validator.showError(photoInput, photoValidation.message);
        isValid = false;
      } else {
        Validator.clearError(photoInput);
      }

      if (!coordinatesValidation.isValid) {
        const coordinatesDisplay = document.getElementById('coordinates-display');
        coordinatesDisplay.innerHTML = `<span class="error-message">${coordinatesValidation.message}</span>`;
        isValid = false;
      }

      if (!isValid) {
        alert('Please fix the errors before submitting.');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';

      if (!navigator.onLine) {
        console.log('[Offline] Saving story to IndexedDB for later sync.');
        try {
          await idbHelper.addPendingStory({
            description,
            photo, 
            lat: this._selectedLat,
            lon: this._selectedLon,
          });

          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-stories');
            console.log('[Offline] Background sync registered: sync-stories');
          }
          
          alert('You are offline. Your story has been saved and will be uploaded automatically when you are back online.');
          
          window.location.hash = '#/';
          
        } catch (error) {
          console.error('[Offline] Failed to save pending story:', error);
          alert(`Failed to save story for offline sync: ${error.message}`);
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
        return; 
      }

      try {
        await StoryAPI.addStory(description, photo, this._selectedLat, this._selectedLon);
        
        if (pushHelper.isSupported()) {
          pushHelper.showLocalNotification('Cerita Berhasil Dibagikan!', {
            body: 'Cerita barumu telah berhasil ditambahkan.',
            tag: 'story-added-success',
            data: {
              url: '/#/' 
            }
          });
        } else {
          alert('Story shared successfully!');
        }
        
        setTimeout(() => {
          window.location.hash = '#/';
        }, 500);
        
      } catch (error) {
        alert(`Failed to share story: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  },

  _initMap() {
    this._map = MapHelper.initMap('add-story-map', [-2.5489, 118.0149], 5);

    MapHelper.addClickListener(this._map, (lat, lon) => {
      this._selectLocation(lat, lon);
    });
  },

  _selectLocation(lat, lon) {
    if (this._marker) {
      this._marker.remove();
    }

    this._marker = MapHelper.addMarker(this._map, lat, lon, 'Selected Location');
    this._marker.openPopup();

    this._selectedLat = lat;
    this._selectedLon = lon;

    const coordinatesDisplay = document.getElementById('coordinates-display');
    coordinatesDisplay.innerHTML = `
      <span style="color: var(--secondary-color);">
        ✓ Location selected: ${lat.toFixed(6)}, ${lon.toFixed(6)}
      </span>
    `;

    MapHelper.flyToLocation(this._map, lat, lon, 13);
  },
};

export default AddStoryPage;