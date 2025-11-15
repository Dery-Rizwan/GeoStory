import StoryAPI from '../../data/story-api.js';
import MapHelper from '../../utils/map-helper.js';
import idbHelper from '../../utils/idb-helper.js';

const IMAGE_CACHE = 'story-app-images-v1';

const HomePage = {
  _map: null,
  _markers: [],
  _stories: [],

  async render() {
    return `
      <div class="container">
        <section class="hero-section mb-3">
          <h2>Welcome to GeoStory</h2>
          <p class="text-secondary">Discover and share amazing stories from around Indonesia</p>
          
          <!-- Online/Offline Indicator -->
          <div id="connection-status" class="connection-status">
            <span class="status-indicator"></span>
            <span class="status-text">Checking connection...</span>
          </div>
        </section>

        <section class="map-section mb-3">
          <h3 class="mb-2">Story Locations</h3>
          <div id="map" class="map-container" style="height: 400px; border-radius: 0.75rem; overflow: hidden;"></div>
        </section>

        <section class="stories-section">
          <div class="stories-header mb-2">
            <h3>Recent Stories</h3>
            <div class="header-actions">
              <a href="#/favorites" class="btn btn-secondary">
                Archive
              </a>
            </div>
          </div>
          <div id="stories-list" class="stories-grid">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>Loading stories...</p>
            </div>
          </div>
        </section>
      </div>
    `;
  },

  async afterRender() {
    if (!StoryAPI.isLoggedIn()) {
      console.log('❌ User not logged in, redirecting...');
      window.location.hash = '#/login';
      return;
    }

    console.log('✅ User is logged in');

    this._updateConnectionStatus();

    this._initMap();

    await this._loadStories();

    window.addEventListener('online', () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());
  },

  _initMap() {
    this._map = MapHelper.initMap('map', [-2.5489, 118.0149], 5);
  },

  async _loadStories() {
    const storiesListElement = document.getElementById('stories-list');

    try {
      console.log('📡 Starting to load stories...');
      
      this._stories = await StoryAPI.getAllStories();
      console.log('✅ Stories loaded from API:', this._stories.length);

      if (this._stories.length > 0) {
        await idbHelper.cacheStories(this._stories);
        console.log('💾 Stories cached to IndexedDB');
      }

      if (this._stories.length === 0) {
        storiesListElement.innerHTML = `
          <div class="text-center" style="grid-column: 1/-1; padding: 3rem;">
            <h3>📝 No stories yet</h3>
            <p class="text-secondary mt-2">Be the first to share your story!</p>
            <a href="#/add-story" class="btn btn-primary mt-2">Add Your Story</a>
          </div>
        `;
        return;
      }

      this._renderStories();

    } catch (error) {
      console.error('❌ Error loading stories from API:', error);
      
      await this._loadFromCache(storiesListElement);
    }
  },

  async _loadFromCache(storiesListElement) {
    try {
      console.log('🔄 Trying to load from cache...');
      this._stories = await idbHelper.getCachedStories();
      
      if (this._stories.length > 0) {
        console.log('✅ Loaded stories from cache:', this._stories.length);
        
        storiesListElement.innerHTML = `
          <div class="offline-notice" style="grid-column: 1/-1; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; margin-bottom: 1rem;">
            <p style="margin: 0; text-align: center;">
              📡 <strong>Offline Mode</strong> - Showing cached stories
            </p>
          </div>
        `;
        
        this._renderStories();
      } else {
        throw new Error('No cached stories available');
      }
    } catch (cacheError) {
      console.error('❌ Failed to load from cache:', cacheError);
      storiesListElement.innerHTML = `
        <div class="text-center" style="grid-column: 1/-1; padding: 3rem;">
          <h3 style="color: var(--danger-color);">⚠️ Failed to Load Stories</h3>
          <p class="text-secondary mt-2">
            You are offline and no cached data is available.
            Please check your connection and try again.
          </p>
          <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  },

  async _renderStories() {
    const storiesListElement = document.getElementById('stories-list');
    
    const offlineNotice = storiesListElement.querySelector('.offline-notice');
    if (!offlineNotice) {
      storiesListElement.innerHTML = '';
    }

    for (const story of this._stories) {
      const isFavorite = await idbHelper.isFavorite(story.id);
      const storyCard = this._createStoryCard(story, isFavorite);
      storiesListElement.appendChild(storyCard);
    }

    this._addMarkersToMap();
  },

  _createStoryCard(story, isFavorite = false) {
    const card = document.createElement('article');
    card.className = 'card story-card';
    card.setAttribute('data-story-id', story.id);

    const photoUrl = story.photoUrl || 'https://via.placeholder.com/400x200?text=No+Image';
    const description = story.description || 'No description';
    const name = story.name || 'Anonymous';
    const createdAt = new Date(story.createdAt).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    card.innerHTML = `
      <img 
        src="${photoUrl}" 
        alt="Story by ${name}"
        loading="lazy"
      >
      <div class="card-body" style="padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <h4 style="margin: 0;">${name}</h4>
          <button 
            class="btn-icon favorite-btn ${isFavorite ? 'active' : ''}" 
            data-id="${story.id}"
            title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
            aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
          >
            ${isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
        <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 0.75rem;">${createdAt}</p>
        <p style="margin-bottom: 0.75rem;">${description}</p>
        ${story.lat && story.lon ? `
          <button class="btn btn-secondary btn-sm locate-btn" data-lat="${story.lat}" data-lon="${story.lon}">
            <i class="fa-solid fa-location-dot"></i> <span>Show on Map</span>
          </button>
        ` : ''}
      </div>
    `;

    const locateBtn = card.querySelector('.locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        this._highlightStory(story);
      });
    }

    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this._toggleFavorite(story, favoriteBtn);
    });

    return card;
  },

  async _cacheFavoriteImage(url) {
    if (!url || !('caches' in window)) {
      return;
    }

    try {
      const cache = await caches.open(IMAGE_CACHE);
      const response = await cache.match(url);
      if (!response) {
        console.log(`[Cache] Proactively caching favorite image: ${url}`);
        await cache.add(url);
      }
    } catch (error) {
      console.error(`[Cache] Failed to cache image ${url}`, error);
    }
  },

  async _toggleFavorite(story, button) {
    try {
      const isCurrentlyFavorite = button.classList.contains('active');
      
      if (isCurrentlyFavorite) {
        await idbHelper.removeFromFavorites(story.id);
        button.classList.remove('active');
        button.textContent = '🤍';
        button.title = 'Add to favorites';
        this._showToast('Removed from favorites', 'info');
      } else {
        await idbHelper.addToFavorites(story);
        await this._cacheFavoriteImage(story.photoUrl);
        button.classList.add('active');
        button.textContent = '❤️';
        button.title = 'Remove from favorites';
        this._showToast('Added to favorites', 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      this._showToast('Failed to update favorites', 'error');
    }
  },

  _addMarkersToMap() {
    this._markers.forEach(marker => marker.remove());
    this._markers = [];

    const validLocations = this._stories.filter(story => story.lat && story.lon);

    console.log('📍 Adding markers for', validLocations.length, 'stories');

    validLocations.forEach((story) => {
      const popupContent = `
        <div style="min-width: 200px;">
          <img src="${story.photoUrl}" alt="${story.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 0.375rem; margin-bottom: 0.5rem;">
          <h5 style="margin: 0 0 0.25rem 0;">${story.name}</h5>
          <p style="margin: 0; font-size: 0.875rem;">${story.description.substring(0, 100)}${story.description.length > 100 ? '...' : ''}</p>
        </div>
      `;

      const marker = MapHelper.addClickableMarker(
        this._map,
        story.lat,
        story.lon,
        popupContent,
        () => {
          this._scrollToStory(story.id);
        }
      );

      this._markers.push(marker);
    });

    if (validLocations.length > 0) {
      MapHelper.fitBounds(this._map, validLocations);
    }
  },

  _highlightStory(story) {
    if (!story.lat || !story.lon) return;

    console.log('🎯 Highlighting story:', story.name);

    MapHelper.flyToLocation(this._map, story.lat, story.lon, 13);

    const markerIndex = this._stories.findIndex(s => s.id === story.id && s.lat && s.lon);
    if (markerIndex !== -1) {
      const marker = this._markers[markerIndex];
      
      this._markers.forEach(m => MapHelper.resetMarkerIcon(m));
      
      MapHelper.highlightMarker(marker);
      marker.openPopup();
    }
  },

  _scrollToStory(storyId) {
    const storyCard = document.querySelector(`[data-story-id="${storyId}"]`);
    if (storyCard) {
      storyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      storyCard.style.boxShadow = '0 0 0 3px var(--primary-color)';
      setTimeout(() => {
        storyCard.style.boxShadow = '';
      }, 2000);
    }
  },

  _updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    
    if (!statusElement) {
      return;
    }
    
    const isOnline = navigator.onLine;
    
    if (isOnline) {
      statusElement.innerHTML = `
        <span class="status-indicator online"></span>
        <span class="status-text">Online</span>
      `;
      statusElement.className = 'connection-status online';
    } else {
      statusElement.innerHTML = `
        <span class="status-indicator offline"></span>
        <span class="status-text">Offline</span>
      `;
      statusElement.className = 'connection-status offline';
    }
  },

  _handleOnline() {
    console.log('🌐 Connection restored');
    this._updateConnectionStatus();
    this._showToast('Connection restored', 'success');
    
    setTimeout(() => {
      if (window.location.hash === '#/' || window.location.hash === '') {
        location.reload();
      }
    }, 1000);
  },

  _handleOffline() {
    console.log('📡 Connection lost');
    this._updateConnectionStatus();
    this._showToast('You are offline - showing cached data', 'info');
  },

  _showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? 'var(--color-primary-navy)' : type === 'error' ? 'var(--danger-color)' : 'var(--color-primary-navy)'};
      color: white;
      border-radius: 0.5rem;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

export default HomePage;