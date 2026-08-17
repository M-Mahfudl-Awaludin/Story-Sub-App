import CONFIG from '../config';
import * as StoryAPI from '../data/api';

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service worker not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function isSubscribed() {
  const subscription = await getExistingSubscription();
  return !!subscription;
}

export async function subscribePush() {
  if (!isPushSupported()) {
    throw new Error('Push notification tidak didukung di browser ini.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
  });

  const subscriptionJson = subscription.toJSON();
  const response = await StoryAPI.subscribeNotification({
    endpoint: subscriptionJson.endpoint,
    keys: subscriptionJson.keys,
  });

  if (response.error) {
    await subscription.unsubscribe();
    throw new Error(response.message || 'Gagal mengaktifkan notifikasi di server.');
  }

  return subscription;
}

export async function unsubscribePush() {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  try {
    await StoryAPI.unsubscribeNotification(subscription.endpoint);
  } finally {
    await subscription.unsubscribe();
  }
}

export async function togglePushSubscription() {
  const subscribed = await isSubscribed();
  if (subscribed) {
    await unsubscribePush();
    return false;
  }
  await subscribePush();
  return true;
}
