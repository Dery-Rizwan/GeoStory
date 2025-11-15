import 'regenerator-runtime';
import '../styles/styles.css';
import App from './app.js';
import StoryAPI from './data/story-api.js';
import pushHelper from './utils/push-helper.js';

// Initialize app
const app = new App({
  content: document.querySelector('main'),
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found!');
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from SW:', event.data);
        
        // Handle token request from service worker
        if (event.data.type === 'GET_TOKEN') {
          const token = StoryAPI.getToken();
          event.ports[0].postMessage({ token });
        }
      });

      // Auto-subscribe to push notifications if previously enabled
      const wasSubscribed = localStorage.getItem('pushSubscribed') === 'true';
      if (wasSubscribed && pushHelper.isSupported()) {
        try {
          const permission = pushHelper.getPermission();
          if (permission === 'granted') {
            await pushHelper.subscribe(registration);
            console.log('✅ Auto-subscribed to push notifications');
          }
        } catch (error) {
          console.log('ℹ️ Could not auto-subscribe:', error.message);
        }
      }

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💡 Install prompt available');
  
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show custom install button/banner
  showInstallPromotion();
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA was installed');
  deferredPrompt = null;
  
  // Hide install promotion
  hideInstallPromotion();
  
  // Show thank you message
  showToast('App installed successfully! 🎉', 'success');
});

function showInstallPromotion() {
  // Create install banner
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <div class="install-content">
      <div>
        <strong>📱 Install Story App</strong>
        <p>Install our app for a better experience!</p>
      </div>
      <div class="install-actions">
        <button id="install-button" class="btn btn-primary btn-sm">Install</button>
        <button id="dismiss-button" class="btn btn-sm" style="background: transparent;">Later</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(banner);
  
  // Install button click
  document.getElementById('install-button').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    deferredPrompt = null;
    hideInstallPromotion();
  });
  
  // Dismiss button click
  document.getElementById('dismiss-button').addEventListener('click', () => {
    hideInstallPromotion();
  });
}

function hideInstallPromotion() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.remove();
  }
}

// Handle hash changes
window.addEventListener('hashchange', () => {
  const newHash = window.location.hash;
  console.log('🔄 Hash changed to:', newHash);
  
  // Update auth link first
  updateAuthLink();
  
  // Then render page
  app.renderPage();
});

// Handle initial load
window.addEventListener('load', () => {
  console.log('🚀 App loaded');
  
  // Update auth link on load
  updateAuthLink();
  
  // Set default hash if none
  if (!window.location.hash) {
    console.log('No hash found, setting default...');
    window.location.hash = '#/';
  } else {
    // Render current page
    app.renderPage();
  }
});

// Handle page visibility (when user comes back to tab)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('👁️ Page visible again, updating auth link...');
    updateAuthLink();
  }
});

// Function to update auth link
function updateAuthLink() {
  const authLink = document.getElementById('auth-link');
  
  if (!authLink) {
    console.warn('⚠️ Auth link not found');
    return;
  }
  
  if (StoryAPI.isLoggedIn()) {
    console.log('✅ User logged in, showing Logout');
    authLink.textContent = 'Logout';
    authLink.href = '#/logout';
    
    // Remove old event listener by cloning
    const newAuthLink = authLink.cloneNode(true);
    authLink.parentNode.replaceChild(newAuthLink, authLink);
    
    // Add new event listener
    newAuthLink.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  } else {
    console.log('❌ User not logged in, showing Login');
    authLink.textContent = 'Login';
    authLink.href = '#/login';
    
    // Remove event listener by cloning
    const newAuthLink = authLink.cloneNode(true);
    authLink.parentNode.replaceChild(newAuthLink, authLink);
  }
}

// Handle logout
function handleLogout() {
  console.log('👋 Logout clicked');
  
  if (confirm('Are you sure you want to logout?')) {
    console.log('Logging out...');
    StoryAPI.logout();
    
    // Update UI
    updateAuthLink();
    
    // Redirect to login
    window.location.hash = '#/login';
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 300);
  }, 3000);
}

// Make functions available globally
window.updateAuthLink = updateAuthLink;
window.handleLogout = handleLogout;
window.showToast = showToast;