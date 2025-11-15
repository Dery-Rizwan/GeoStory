import routes from './routes/routes.js';

class App {
  constructor({ content }) {
    this._content = content;
    this._initialAppShell();
  }

  _initialAppShell() {
    // Setup navigation
    this._setupNavigation();
  }

  _setupNavigation() {
    // Setup navigation links - only for anchor tags
    document.addEventListener('click', (e) => {
      // Check if clicked element is a link with hash (but not form submit buttons)
      const link = e.target.closest('a[href^="#"]');
      if (link && !e.target.closest('form')) {
        e.preventDefault();
        const hash = link.getAttribute('href');
        window.location.hash = hash;
      }
    });

    // --- Tambahan Logika untuk Hamburger Menu ---
    const menuToggle = document.querySelector('.app-bar__toggle');
    const nav = document.querySelector('.app-bar__navigation');

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Mencegah event click di document
      const isOpen = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
      menuToggle.textContent = isOpen ? '✕' : '☰'; // Ganti ikon
    });

    // Tutup menu saat link di dalam nav diklik
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
      }
    });

    // Tutup menu saat klik di luar area menu
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.textContent = '☰';
        }
      }
    });
    // --- Akhir Tambahan Logika ---
  }

  async renderPage() {
    try {
      // Get current hash
      const url = this._parseActiveUrlWithCombiner();
      
      console.log('🔄 Rendering page:', url);
      
      // Get page *loader function* from routes
      const pageLoader = routes[url];

      if (!pageLoader) {
        console.warn('⚠️ Route not found:', url, '- Redirecting to home');
        // Default to home if route not found
        window.location.hash = '#/';
        return;
      }

      // Selalu tampilkan loading spinner saat renderPage dipanggil
      // karena kita sekarang *selalu* me-load modul secara dinamis
      this._content.innerHTML = `
        <div class="loading-spinner" style="padding: 3rem;">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      `;
      
      // --- PERUBAHAN UTAMA ---
      // Panggil fungsi import() yang dinamis
      const pageModule = await pageLoader();
      // Ambil 'default' export dari modul yang sudah di-load
      const page = pageModule.default;
      // --- AKHIR PERUBAHAN ---


      // Render page HTML
      const content = await page.render();
      
      // Use View Transition API if supported
      if (document.startViewTransition) {
        await document.startViewTransition(() => {
          this._content.innerHTML = content;
        }).finished;
      } else {
        this._content.innerHTML = content;
      }
      
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Execute afterRender if exists
      if (page.afterRender) {
        await page.afterRender();
      }

      console.log('✅ Page rendered successfully');

      // Scroll to top
      window.scrollTo(0, 0);

      // Focus main content for accessibility
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
      }

    } catch (error) {
      console.error('❌ Error rendering page:', error);
      this._content.innerHTML = `
        <div class="container">
          <div class="text-center" style="padding: 3rem;">
            <h2>Oops! Something went wrong</h2>
            <p class="text-secondary mt-2">${error.message}</p>
            <div style="margin-top: 1rem;">
              <a href="#/" class="btn btn-primary">Go to Home</a>
              <button class="btn" style="background-color: var(--bg-secondary); margin-left: 0.5rem;" onclick="location.reload()">Reload Page</button>
            </div>
            <details style="margin-top: 2rem; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
              <summary style="cursor: pointer; color: var(--text-secondary);">Technical Details</summary>
              <pre style="background: var(--bg-secondary); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-top: 1rem; font-size: 0.875rem;">${error.stack || error.message}</pre>
            </details>
          </div>
        </div>
      `;
    }
  }

  _parseActiveUrlWithCombiner() {
    let url = window.location.hash.slice(1).toLowerCase();
    
    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Return root if empty
    if (!url || url === '') {
      return '/';
    }
    
    return url;
  }
}

export default App;