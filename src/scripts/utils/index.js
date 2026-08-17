export function showFormattedDate(date, locale = 'en-US', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

export function getUserData() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('userData');
  if (token && userData) {
    try {
      return JSON.parse(userData);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function saveUserData(userData) {
  localStorage.setItem('token', userData.token);
  localStorage.setItem('userData', JSON.stringify({
    userId: userData.userId,
    name: userData.name,
  }));
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
}

export function createPageTransition(content) {
  return `
    <div class="page-transition">
      <div class="page-content">
        ${content}
      </div>
    </div>
  `;
}
