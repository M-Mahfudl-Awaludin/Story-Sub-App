// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import { isLoggedIn, getUserData, logout } from './utils/index';
import { registerServiceWorker, isPushSupported, isSubscribed, togglePushSubscription } from './utils/push-notification';
import { initSyncManager, onSyncStateChange, getPendingCount } from './utils/sync-manager';

function updateNavigation() {
  const authNavItem = document.getElementById('auth-nav-item');
  const userNavItem = document.getElementById('user-nav-item');
  const addStoryNavItem = document.getElementById('add-story-nav-item');
  const savedStoriesNavItem = document.getElementById('saved-stories-nav-item');
  const pushToggleNavItem = document.getElementById('push-toggle-nav-item');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');

  if (isLoggedIn()) {
    const userData = getUserData();
    if (authNavItem) authNavItem.style.display = 'none';
    if (userNavItem) userNavItem.style.display = 'flex';
    if (addStoryNavItem) addStoryNavItem.style.display = '';
    if (savedStoriesNavItem) savedStoriesNavItem.style.display = '';
    if (pushToggleNavItem && isPushSupported()) pushToggleNavItem.hidden = false;
    if (userName && userData) {
      userName.textContent = userData.name;
    }
    if (userAvatar && userData?.name) {
      userAvatar.textContent = userData.name.trim().charAt(0).toUpperCase();
    }
  } else {
    if (authNavItem) authNavItem.style.display = 'block';
    if (userNavItem) userNavItem.style.display = 'none';
    if (addStoryNavItem) addStoryNavItem.style.display = 'none';
    if (savedStoriesNavItem) savedStoriesNavItem.style.display = 'none';
    if (pushToggleNavItem) pushToggleNavItem.hidden = true;
  }
}

async function updatePushToggleLabel() {
  const label = document.getElementById('push-toggle-label');
  if (!label || !isLoggedIn() || !isPushSupported()) return;

  try {
    const subscribed = await isSubscribed();
    label.textContent = subscribed ? 'Nonaktifkan Notifikasi' : 'Aktifkan Notifikasi';
  } catch (error) {
    console.error('Failed to read push subscription state:', error);
  }
}

function setupPushToggle() {
  const button = document.getElementById('push-toggle-button');
  if (!button) return;

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await togglePushSubscription();
      await updatePushToggleLabel();
    } catch (error) {
      console.error('Push subscription toggle failed:', error);
      alert(error.message || 'Gagal mengubah pengaturan notifikasi.');
    } finally {
      button.disabled = false;
    }
  });
}

function setupInstallPrompt() {
  const installNavItem = document.getElementById('install-nav-item');
  const installButton = document.getElementById('install-button');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installNavItem) installNavItem.hidden = false;
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (installNavItem) installNavItem.hidden = true;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installNavItem) installNavItem.hidden = true;
    deferredPrompt = null;
  });
}

function setupOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;

  const update = () => {
    banner.hidden = navigator.onLine;
  };

  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

async function updatePendingSyncBadge() {
  const badge = document.getElementById('pending-sync-badge');
  if (!badge) return;

  const count = await getPendingCount();
  if (count > 0) {
    badge.hidden = false;
    badge.textContent = String(count);
    badge.setAttribute('aria-label', `${count} story menunggu sinkronisasi`);
  } else {
    badge.hidden = true;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  updateNavigation();
  await app.renderPage();

  await registerServiceWorker();
  setupOfflineBanner();
  setupInstallPrompt();
  setupPushToggle();
  await updatePushToggleLabel();

  initSyncManager();
  await updatePendingSyncBadge();
  onSyncStateChange(() => updatePendingSyncBadge());

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      logout();
      updateNavigation();
      if (window.location.hash === '#/add-story') {
        window.location.hash = '#/';
      }
    });
  }

  window.addEventListener('hashchange', async () => {
    updateNavigation();
    await app.renderPage();
    await updatePushToggleLabel();
  });
});
