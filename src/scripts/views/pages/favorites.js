import StoryAPI from '../../data/story-api.js';
import idbHelper from '../../utils/idb-helper.js';
import MapHelper from '../../utils/map-helper.js';

const FavoritesPage = {
  _map: null,
  _markers: [],
  _favorites: [],
  _currentSort: 'date',
  _currentOrder: 'desc',
  _searchQuery: '',

  async render() {
    return `
      <div class="container">
        <section class="favorites-header mb-3">
          <div class="header-content">
            <h2>Archive</h2>
            <p class="text-secondary">Your saved stories collection</p>
          </div>
        </section>

        <!-- Search and Filter Controls -->
        <section class="controls-section mb-3">
          <div class="controls-grid">
            <div class="search-box">
              <input 
                type="search" 
                id="search-input" 
                class="form-control" 
                placeholder="Search stories..."
                aria-label="Search stories"
              >
            </div>
            
            <div class="sort-controls">
              <select id="sort-select" class="form-control" aria-label="Sort by">
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Map Section -->
        <section class="map-section mb-3">
          <h3 class="mb-2">Favorite Locations</h3>
          <div id="favorites-map" class="map-container" style="height: 400px; border-radius: 0.75rem; overflow: hidden;"></div>
        </section>

        <!-- Favorites List -->
        <section class="favorites-section">
          <div class="favorites-stats mb-2" id="favorites-stats">
            <p class="text-secondary">Loading favorites...</p>
          </div>
          
          <div id="favorites-list" class="stories-grid">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>Loading favorites...</p>
            </div>
          </div>
        </section>
      </div>
    `;
  },

  async afterRender() {
    // Check if user is logged in
    if (!StoryAPI.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    // Initialize map
    this._initMap();

    // Load favorites
    await this._loadFavorites();

    // Setup event listeners
    this._setupEventListeners();
  },

  _initMap() {
    this._map = MapHelper.initMap('favorites-map', [-2.5489, 118.0149], 5);
  },

  async _loadFavorites() {
    const favoritesListElement = document.getElementById('favorites-list');
    const statsElement = document.getElementById('favorites-stats');

    try {
      // Get favorites from IndexedDB with filters
      this._favorites = await idbHelper.getFavorites({
        search: this._searchQuery,
        sortBy: this._currentSort,
        sortOrder: this._currentOrder
      });

      console.log('Loaded favorites:', this._favorites.length);

      // Update stats
      statsElement.innerHTML = `
        <p class="text-secondary">
          <strong>${this._favorites.length}</strong> favorite ${this._favorites.length === 1 ? 'story' : 'stories'}
          ${this._searchQuery ? `matching "${this._searchQuery}"` : ''}
        </p>
      `;

      if (this._favorites.length === 0) {
        favoritesListElement.innerHTML = `
          <div class="text-center" style="grid-column: 1/-1; padding: 3rem;">
            <h3>${this._searchQuery ? 'No matching favorites found' : 'No favorites yet'}</h3>
            <p class="text-secondary mt-2">
              ${this._searchQuery 
                ? 'Try a different search term' 
                : 'Start adding stories to your favorites from the home page!'}
            </p>
            ${!this._searchQuery ? `<a href="#/" class="btn btn-primary mt-2">Explore Stories</a>` : ''}
          </div>
        `;
        return;
      }

      // Render favorites
      favoritesListElement.innerHTML = '';
      this._favorites.forEach((story, index) => {
        const storyCard = this._createFavoriteCard(story, index);
        favoritesListElement.appendChild(storyCard);
      });

      // Add markers to map
      this._addMarkersToMap();

    } catch (error) {
      console.error('Error loading favorites:', error);
      favoritesListElement.innerHTML = `
        <div class="text-center" style="grid-column: 1/-1; padding: 3rem;">
          <h3 style="color: var(--danger-color);">⚠️ Failed to Load Favorites</h3>
          <p class="text-secondary mt-2">${error.message}</p>
          <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  },

  _createFavoriteCard(story, index) {
    const card = document.createElement('article');
    card.className = 'card story-card';
    card.setAttribute('data-story-id', story.id);
    card.setAttribute('data-index', index);

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
            class="btn-icon remove-favorite" 
            data-id="${story.id}"
            title="Remove from favorites"
            aria-label="Remove from favorites"
          >
            ❤️
          </button>
        </div>
        <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 0.75rem;">${createdAt}</p>
        <p style="margin-bottom: 0.75rem;">${description}</p>
        ${story.lat && story.lon ? `
          <button class="btn btn-secondary btn-sm locate-btn" data-index="${index}">
            <i class="fa-solid fa-location-dot"></i> <span>Show on Map</span>
          </button>
        ` : ''}
      </div>
    `;

    // Add event listeners
    const locateBtn = card.querySelector('.locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        this._highlightStory(index);
      });
    }

    const removeBtn = card.querySelector('.remove-favorite');
    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this._removeFavorite(story.id);
    });

    return card;
  },

  async _removeFavorite(storyId) {
    if (!confirm('Remove this story from favorites?')) {
      return;
    }

    try {
      await idbHelper.removeFromFavorites(storyId);
      
      // Show success feedback
      this._showToast('Removed from favorites', 'success');
      
      // Reload favorites
      await this._loadFavorites();
      
    } catch (error) {
      console.error('Error removing favorite:', error);
      this._showToast('Failed to remove favorite', 'error');
    }
  },

  _addMarkersToMap() {
    // Clear existing markers
    this._markers.forEach(marker => marker.remove());
    this._markers = [];

    // Add new markers
    const validLocations = this._favorites.filter(story => story.lat && story.lon);

    console.log('Adding markers for', validLocations.length, 'favorites');

    validLocations.forEach((story, index) => {
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
          const storyIndex = this._favorites.findIndex(s => s.id === story.id);
          this._scrollToStory(storyIndex);
        }
      );

      this._markers.push(marker);
    });

    // Fit map to show all markers
    if (validLocations.length > 0) {
      MapHelper.fitBounds(this._map, validLocations);
    }
  },

  _highlightStory(index) {
    const story = this._favorites[index];
    
    if (!story.lat || !story.lon) return;

    // Fly to location
    MapHelper.flyToLocation(this._map, story.lat, story.lon, 13);

    // Highlight marker
    const marker = this._markers[index];
    if (marker) {
      this._markers.forEach(m => MapHelper.resetMarkerIcon(m));
      MapHelper.highlightMarker(marker);
      marker.openPopup();
    }
  },

  _scrollToStory(index) {
    const storyCard = document.querySelector(`[data-index="${index}"]`);
    if (storyCard) {
      storyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add temporary highlight effect
      storyCard.style.boxShadow = '0 0 0 3px var(--primary-color)';
      setTimeout(() => {
        storyCard.style.boxShadow = '';
      }, 2000);
    }
  },

  _setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this._searchQuery = e.target.value.trim();
        this._loadFavorites();
      }, 300);
    });

    // Sort
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
      const [sortBy, sortOrder] = e.target.value.split('-');
      this._currentSort = sortBy;
      this._currentOrder = sortOrder;
      this._loadFavorites();
    });
  },

  _showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? 'var(--secondary-color)' : 'var(--danger-color)'};
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

export default FavoritesPage;