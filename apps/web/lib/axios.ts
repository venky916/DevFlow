import axios, { isAxiosError } from 'axios';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';
import { auth } from './firebase';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// attach fresh firebase token on every request
api.interceptors.request.use(async (config) => {
  try {
    // wait for firebase auth to be ready
    await auth.authStateReady();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      console.log('[axios] token:', token);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('[axios] token error:', err);
  }
  return config;
});
// several requests can fail with SESSION_EXPIRED at once: handle it only once
let isHandlingExpiry = false;

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const isExpired =
      isAxiosError<{ code?: string }>(error) && error.response?.data?.code === 'SESSION_EXPIRED';

    if (isExpired && !isHandlingExpiry) {
      isHandlingExpiry = true;
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.error('[axios] sign out failed:', err);
      }
      useAuthStore.getState().clearAuth();

      const { pathname, search } = window.location;
      const alreadyOnSignIn = pathname.startsWith(ROUTES.signIn);
      window.location.href = alreadyOnSignIn
        ? ROUTES.signIn
        : `${ROUTES.signIn}?redirect=${encodeURIComponent(pathname + search)}`;
    }

    return Promise.reject(error);
  },
);
