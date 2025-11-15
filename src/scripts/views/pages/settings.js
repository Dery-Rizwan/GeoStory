import StoryAPI from '../../data/story-api.js';
import pushHelper from '../../utils/push-helper.js';
import idbHelper from '../../utils/idb-helper.js';

const SettingsPage = {
  async render() {
    return `
      <div class="container">
        <div class="settings-container">
          <h2 class="text-center mb-3">Settings</h2>
          
          <!-- Notification Settings -->
          <section class="settings-section">
            <h3>🔔 Push Notifications</h3>
            <p class="text-secondary">Get notified when new stories are posted</p>
            
            <div class="setting-item">
              <div class="setting-info">
                <strong>Enable Notifications</strong>
                <p class="text-secondary" style="font-size: 0.875rem; margin-top: 0.25rem;">
                  Receive push notifications for new stories
                </p>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" id="notification-toggle" disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div id="notification-status" class="status-box mt-2">
              <p>Checking notification status...</p>
            </div>

            <button id="test-notification-btn" class="btn btn-secondary mt-2" style="display: none;">
              Test Notification
            </button>
          </section>

          <!-- Storage Info -->
          <section class="settings-section mt-3">
            <h3>💾 Storage & Cache</h3>
            <p class="text-secondary">Manage offline data and cache</p>
            
            <div id="storage-stats" class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">-</div>
                <div class="stat-label">Favorites</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">-</div>
                <div class="stat-label">Cached Stories</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">-</div>
                <div class="stat-label">Pending Sync</div>
              </div>
            </div>

            <button id="clear-cache-btn" class="btn btn-secondary mt-2">
              Clear Cache
            </button>
          </section>

          <!-- Account Settings -->
          <section class="settings-section mt-3">
            <h3>👤 Account</h3>
            <p class="text-secondary">Manage your account settings</p>
            
            <div class="setting-item">
              <div class="setting-info">
                <strong>Logged in as</strong>
                <p id="user-name" class="text-secondary" style="font-size: 0.875rem; margin-top: 0.25rem;">
                  Loading...
                </p>
              </div>
            </div>

            <button id="logout-btn" class="btn btn-danger mt-2">
              Logout
            </button>
          </section>

          <!-- About -->
          <section class="settings-section mt-3">
            <h3>ℹ️ About</h3>
            <div class="about-info">
              <p><strong>Story App</strong></p>
              <p class="text-secondary">Version 2.0.0</p>
              <p class="text-secondary mt-1">
                A Progressive Web App for sharing stories with location
              </p>
              <div class="mt-2">
                <span class="badge badge-success">✓ PWA Enabled</span>
                <span class="badge badge-success">✓ Offline Support</span>
                <span class="badge badge-success" id="sw-status">⏳ Service Worker</span>
              </div>
            </div>
          </section>

          <div class="text-center mt-3">
            <a href="#/" class="btn" style="background-color: var(--bg-secondary);">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    `;
  },

  async afterRender() {
    // Check if user is logged in
    if (!StoryAPI.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    // Display user info
    this._displayUserInfo();

    // Check service worker status
    await this._checkServiceWorker();

    // Setup notification toggle
    await this._setupNotificationToggle();

    // Load storage stats
    await this._loadStorageStats();

    // Setup event listeners
    this._setupEventListeners();
  },

  _displayUserInfo() {
    const userName = StoryAPI.getUserName();
    document.getElementById('user-name').textContent = userName || 'Unknown User';
  },

  async _checkServiceWorker() {
    const statusBadge = document.getElementById('sw-status');
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        statusBadge.textContent = '✓ Service Worker';
        statusBadge.className = 'badge badge-success';
      } else {
        statusBadge.textContent = '✗ Service Worker';
        statusBadge.className = 'badge badge-danger';
      }
    } else {
      statusBadge.textContent = '✗ Not Supported';
      statusBadge.className = 'badge badge-danger';
    }
  },

  async _setupNotificationToggle() {
    const toggle = document.getElementById('notification-toggle');
    const statusBox = document.getElementById('notification-status');
    const testBtn = document.getElementById('test-notification-btn');

    // Check if notifications are supported
    if (!pushHelper.isSupported()) {
      statusBox.innerHTML = `
        <p style="color: var(--danger-color);">
          ⚠️ Push notifications are not supported in this browser
        </p>
      `;
      return;
    }

    // Check current permission
    const permission = pushHelper.getPermission();
    const isSubscribed = await pushHelper.isSubscribed();

    toggle.disabled = false;
    toggle.checked = isSubscribed;

    // Update status
    this._updateNotificationStatus(permission, isSubscribed);

    // Show test button if subscribed
    if (isSubscribed) {
      testBtn.style.display = 'block';
    }

    // Toggle event
    toggle.addEventListener('change', async (e) => {
      const shouldEnable = e.target.checked;
      
      try {
        toggle.disabled = true;
        
        if (shouldEnable) {
          // Subscribe
          const registration = await navigator.serviceWorker.ready;
          await pushHelper.subscribe(registration);
          
          statusBox.innerHTML = `
            <p style="color: var(--secondary-color);">
              ✅ Push notifications enabled successfully!
            </p>
          `;
          
          testBtn.style.display = 'block';
          
        } else {
          // Unsubscribe
          await pushHelper.unsubscribe();
          
          statusBox.innerHTML = `
            <p style="color: var(--text-secondary);">
              🔕 Push notifications disabled
            </p>
          `;
          
          testBtn.style.display = 'none';
        }
        
      } catch (error) {
        console.error('Error toggling notifications:', error);
        toggle.checked = !shouldEnable;
        
        statusBox.innerHTML = `
          <p style="color: var(--danger-color);">
            ⚠️ Failed to ${shouldEnable ? 'enable' : 'disable'} notifications: ${error.message}
          </p>
        `;
      } finally {
        toggle.disabled = false;
      }
    });

    // Test notification button
    testBtn.addEventListener('click', async () => {
      try {
        await pushHelper.testNotification();
        
        statusBox.innerHTML = `
          <p style="color: var(--secondary-color);">
            ✅ Test notification sent! Check your notifications.
          </p>
        `;
      } catch (error) {
        statusBox.innerHTML = `
          <p style="color: var(--danger-color);">
            ⚠️ Failed to send test notification: ${error.message}
          </p>
        `;
      }
    });
  },

  _updateNotificationStatus(permission, isSubscribed) {
    const statusBox = document.getElementById('notification-status');
    
    if (permission === 'denied') {
      statusBox.innerHTML = `
        <p style="color: var(--danger-color);">
          ⚠️ Notification permission denied. Please enable it in your browser settings.
        </p>
      `;
    } else if (permission === 'granted' && isSubscribed) {
      statusBox.innerHTML = `
        <p style="color: var(--secondary-color);">
          ✅ Push notifications are enabled
        </p>
      `;
    } else if (permission === 'granted' && !isSubscribed) {
      statusBox.innerHTML = `
        <p style="color: var(--text-secondary);">
          🔕 Push notifications are disabled
        </p>
      `;
    } else {
      statusBox.innerHTML = `
        <p style="color: var(--text-secondary);">
          ℹ️ Enable push notifications to get updates about new stories
        </p>
      `;
    }
  },

  async _loadStorageStats() {
    try {
      const stats = await idbHelper.getStats();
      
      document.querySelector('.stats-grid').innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${stats.favorites}</div>
          <div class="stat-label">Favorites</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.cached}</div>
          <div class="stat-label">Cached Stories</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.pending}</div>
          <div class="stat-label">Pending Sync</div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  },

  _setupEventListeners() {
    // Clear cache button
    document.getElementById('clear-cache-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all cached data? This will remove offline stories but keep your favorites.')) {
        return;
      }

      try {
        // Clear cache (but keep favorites)
        await idbHelper.clearAllData();
        
        // Clear service worker cache
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        alert('Cache cleared successfully! ✅');
        
        // Reload stats
        await this._loadStorageStats();
        
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Failed to clear cache: ' + error.message);
      }
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        StoryAPI.logout();
        window.location.hash = '#/login';
      }
    });
  },
};

export default SettingsPage;