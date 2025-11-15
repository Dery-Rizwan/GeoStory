const DB_NAME = 'story-app-db';
const DB_VERSION = 1;

class IDBHelper {
  constructor() {
    this.db = null;
  }

  async openDB() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('Upgrading IndexedDB...');

        // Create object stores
        if (!db.objectStoreNames.contains('favorites')) {
          const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' });
          favoritesStore.createIndex('createdAt', 'createdAt', { unique: false });
          favoritesStore.createIndex('name', 'name', { unique: false });
          console.log('Created favorites store');
        }

        if (!db.objectStoreNames.contains('pending-stories')) {
          const pendingStore = db.createObjectStore('pending-stories', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Created pending-stories store');
        }

        if (!db.objectStoreNames.contains('cached-stories')) {
          const cachedStore = db.createObjectStore('cached-stories', { keyPath: 'id' });
          cachedStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('Created cached-stories store');
        }
      };
    });
  }

  // ===== FAVORITES OPERATIONS =====
  
  async addToFavorites(story) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('favorites', 'readwrite');
      const store = tx.objectStore('favorites');
      
      const favoriteStory = {
        ...story,
        favoritedAt: new Date().toISOString()
      };
      
      await store.add(favoriteStory);
      await tx.complete;
      
      console.log('Added to favorites:', story.id);
      return { success: true };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(storyId) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('favorites', 'readwrite');
      const store = tx.objectStore('favorites');
      
      await store.delete(storyId);
      await tx.complete;
      
      console.log('Removed from favorites:', storyId);
      return { success: true };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }

  async getFavorites(options = {}) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('favorites', 'readonly');
      const store = tx.objectStore('favorites');
      
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          let favorites = request.result;
          
          // Apply search filter
          if (options.search) {
            const searchLower = options.search.toLowerCase();
            favorites = favorites.filter(story => 
              story.name?.toLowerCase().includes(searchLower) ||
              story.description?.toLowerCase().includes(searchLower)
            );
          }
          
          // Apply sorting
          if (options.sortBy) {
            favorites = this._sortStories(favorites, options.sortBy, options.sortOrder);
          }
          
          console.log('Retrieved favorites:', favorites.length);
          resolve(favorites);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting favorites:', error);
      throw error;
    }
  }

  async isFavorite(storyId) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('favorites', 'readonly');
      const store = tx.objectStore('favorites');
      
      const request = store.get(storyId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  // ===== PENDING STORIES (for offline sync) =====
  
  async addPendingStory(storyData) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending-stories', 'readwrite');
      const store = tx.objectStore('pending-stories');
      
      const pendingStory = {
        ...storyData,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      const request = store.add(pendingStory);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Added pending story:', request.result);
          resolve({ success: true, id: request.result });
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error adding pending story:', error);
      throw error;
    }
  }

  async getPendingStories() {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending-stories', 'readonly');
      const store = tx.objectStore('pending-stories');
      
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Retrieved pending stories:', request.result.length);
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting pending stories:', error);
      throw error;
    }
  }

  async removePendingStory(id) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('pending-stories', 'readwrite');
      const store = tx.objectStore('pending-stories');
      
      await store.delete(id);
      await tx.complete;
      
      console.log('Removed pending story:', id);
      return { success: true };
    } catch (error) {
      console.error('Error removing pending story:', error);
      throw error;
    }
  }

  // ===== CACHED STORIES =====
  
  async cacheStories(stories) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cached-stories', 'readwrite');
      const store = tx.objectStore('cached-stories');
      
      // Clear old cache
      await store.clear();
      
      // Add new stories
      const cachedAt = new Date().toISOString();
      for (const story of stories) {
        await store.put({ ...story, cachedAt });
      }
      
      await tx.complete;
      console.log('Cached stories:', stories.length);
      return { success: true };
    } catch (error) {
      console.error('Error caching stories:', error);
      throw error;
    }
  }

  async getCachedStories() {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cached-stories', 'readonly');
      const store = tx.objectStore('cached-stories');
      
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Retrieved cached stories:', request.result.length);
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached stories:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====
  
  _sortStories(stories, sortBy, sortOrder = 'desc') {
    return stories.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'name':
          valueA = (a.name || '').toLowerCase();
          valueB = (b.name || '').toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.createdAt || a.favoritedAt);
          valueB = new Date(b.createdAt || b.favoritedAt);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  async clearAllData() {
    try {
      const db = await this.openDB();
      const stores = ['favorites', 'pending-stories', 'cached-stories'];
      
      for (const storeName of stores) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();
        await tx.complete;
      }
      
      console.log('Cleared all IndexedDB data');
      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const [favorites, pending, cached] = await Promise.all([
        this.getFavorites(),
        this.getPendingStories(),
        this.getCachedStories()
      ]);
      
      return {
        favorites: favorites.length,
        pending: pending.length,
        cached: cached.length
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { favorites: 0, pending: 0, cached: 0 };
    }
  }
}

// Create singleton instance
const idbHelper = new IDBHelper();

export default idbHelper;