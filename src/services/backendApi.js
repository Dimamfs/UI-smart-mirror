// Mirror ↔ Backend API service
// Connects the mirror to the Node.js/Express backend for login, profiles, and user management.

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const TOKEN_KEY = 'mirrorBackendToken';

export const backendApi = {
  // ── Auth ────────────────────────────────────────────────────────────────

  getToken: () => localStorage.getItem(TOKEN_KEY),

  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('storage'));
  },

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    return data; // { token, accountId, householdId, email }
  },

  // ── Profiles ─────────────────────────────────────────────────────────────

  _authHeaders: () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  }),

  getProfiles: async () => {
    const res = await fetch(`${API_URL}/api/profiles`, {
      headers: backendApi._authHeaders(),
    });
    if (res.status === 401) { backendApi.logout(); throw new Error('Session expired'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch profiles');
    return data; // [{ id, householdId, name, email, googleSub, createdAt }]
  },

  addProfile: async (name) => {
    const res = await fetch(`${API_URL}/api/profiles`, {
      method: 'POST',
      headers: backendApi._authHeaders(),
      body: JSON.stringify({ name }),
    });
    if (res.status === 401) { backendApi.logout(); throw new Error('Session expired'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add profile');
    return data; // { id, householdId, name, email, googleSub, createdAt }
  },

  // ── Mirror sync ───────────────────────────────────────────────────────────

  /**
   * Returns this mirror's permanent ID (a UUID).
   * Generated once on first call and persisted in localStorage.
   * The phone app enters this ID to link itself to this mirror.
   */
  getMirrorId: () => {
    const MIRROR_ID_KEY = 'smartMirrorId';
    let id = localStorage.getItem(MIRROR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(MIRROR_ID_KEY, id);
      console.log('[Mirror] Generated new Mirror ID:', id);
    } else {
      console.log('[Mirror] Loaded existing Mirror ID:', id);
    }
    return id;
  },

  /**
   * Polls the backend for whichever profile the phone app last activated.
   * Returns { id, name, email, gmailConnected, gmailEmail } or null.
   * No login needed — mirror identifies itself by its UUID.
   */
  getActiveUser: async (mirrorId) => {
    const url = `${API_URL}/api/mirrors/active-user/${mirrorId}`;
    try {
      console.log('[Mirror] Polling:', url);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[Mirror] Poll failed — HTTP', res.status, url);
        return null;
      }
      const data = await res.json();
      console.log('[Mirror] Poll response:', data);
      return data.profile || null;
    } catch (err) {
      console.warn('[Mirror] Poll error:', err.message, url);
      return null;
    }
  },
};

// Map backend profile shape → mirror profile shape
export const toMirrorProfile = (backendProfile) => ({
  id: String(backendProfile.id),
  name: backendProfile.name,
  source: 'backend',
  gmailConnected: !!(backendProfile.email && backendProfile.googleSub),
  gmailEmail: backendProfile.email || null,
  backendId: backendProfile.id,
});
