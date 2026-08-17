import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import { isLoggedIn } from '../utils/index';

// Routes that require an authenticated user. Direct hash navigation (typed
// URL, bookmark, browser history) bypasses the nav-link visibility toggle in
// index.js, so this guard is the actual source of truth.
const PROTECTED_ROUTES = ['/add-story', '/saved'];

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #currentPage = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();

    // Safety net for cases outside the hash-routing flow entirely, e.g. the
    // user closes the tab or navigates to a different site while a camera
    // stream from the current page is still open.
    window.addEventListener('pagehide', () => this.#teardownCurrentPage());
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#toggleDrawer();
    });

    this.#drawerButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#toggleDrawer();
      }
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#closeDrawer();
      }

      this.#navigationDrawer.querySelectorAll('a, button').forEach((element) => {
        if (element.contains(event.target)) {
          this.#closeDrawer();
        }
      });
    });
  }

  #toggleDrawer() {
    const isOpen = this.#navigationDrawer.classList.toggle('open');
    this.#drawerButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.classList.toggle('drawer-open', isOpen);
  }

  #closeDrawer() {
    this.#navigationDrawer.classList.remove('open');
    this.#drawerButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }

  async renderPage() {
    const url = getActiveRoute();

    if (PROTECTED_ROUTES.includes(url) && !isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    const page = routes[url];

    // Always tear down the page we're leaving *before* anything else happens.
    // This runs on every navigation, including hash changes triggered by the
    // browser's Back/Forward buttons, so a page can never keep running in the
    // background (e.g. an active camera stream) after the user has moved on.
    this.#teardownCurrentPage();

    if (!page) {
      this.#content.innerHTML = '<section class="container"><h1>404 - Page Not Found</h1></section>';
      this.#currentPage = null;
      return;
    }

    const swapContent = async () => {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
      this.#setupSkipLink();
      this.#currentPage = page;
    };

    // Check if View Transition API is supported
    if (document.startViewTransition) {
      // Use View Transition API; the actual slide/fade choreography for the
      // ::view-transition-old(root)/::view-transition-new(root) pseudo-elements
      // is defined in styles.css.
      document.startViewTransition(swapContent);
    } else {
      // Fallback for browsers that don't support View Transition API
      await swapContent();
    }
  }

  #teardownCurrentPage() {
    if (this.#currentPage && typeof this.#currentPage.destroy === 'function') {
      try {
        this.#currentPage.destroy();
      } catch (error) {
        console.error('Error while destroying previous page:', error);
      }
    }
  }

  #setupSkipLink() {
    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.getElementById('main-content');
    
    if (skipLink && mainContent) {
      // Remove existing listeners to avoid duplicates
      const newSkipLink = skipLink.cloneNode(true);
      skipLink.parentNode.replaceChild(newSkipLink, skipLink);
      
      newSkipLink.addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Remove tabindex after focus to prevent tabbing to it
        const removeTabIndex = () => {
          mainContent.removeAttribute('tabindex');
        };
        mainContent.addEventListener('blur', removeTabIndex, { once: true });
      });
    }
  }
}

export default App;
