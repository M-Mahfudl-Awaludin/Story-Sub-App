import CONFIG from '../config';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_GUEST: `${CONFIG.BASE_URL}/stories/guest`,
  NOTIFICATIONS_SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
};

function getAuthToken() {
  return localStorage.getItem('token');
}

export async function registerUser({ name, email, password }) {
  const response = await fetch(ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });
  return await response.json();
}

export async function loginUser({ email, password }) {
  const response = await fetch(ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return await response.json();
}

export async function getAllStories({ page = 1, size = 10, location = 0 } = {}) {
  const token = getAuthToken();
  const url = new URL(ENDPOINTS.STORIES);
  url.searchParams.append('page', page);
  url.searchParams.append('size', size);
  url.searchParams.append('location', location);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
  return await response.json();
}

export async function getStoryDetail(id) {
  const token = getAuthToken();
  const response = await fetch(`${ENDPOINTS.STORIES}/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
  return await response.json();
}

export async function addStory({ description, photo, lat, lon }, isGuest = false) {
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photo);
  if (lat !== undefined && lat !== null) {
    formData.append('lat', lat);
  }
  if (lon !== undefined && lon !== null) {
    formData.append('lon', lon);
  }

  const endpoint = isGuest ? ENDPOINTS.STORIES_GUEST : ENDPOINTS.STORIES;
  const headers = {};

  if (!isGuest) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });
  return await response.json();
}

export async function subscribeNotification({ endpoint, keys }) {
  const token = getAuthToken();
  const response = await fetch(ENDPOINTS.NOTIFICATIONS_SUBSCRIBE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({
      endpoint: endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    }),
  });
  return await response.json();
}

export async function unsubscribeNotification(endpoint) {
  const token = getAuthToken();
  const response = await fetch(ENDPOINTS.NOTIFICATIONS_SUBSCRIBE, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ endpoint }),
  });
  return await response.json();
}