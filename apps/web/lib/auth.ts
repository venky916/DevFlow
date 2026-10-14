import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';

import { useAuthStore } from '../stores/auth.store';
import { api } from './axios';
import { auth, githubProvider, googleProvider } from './firebase';
import type { IApiResponse, IUser } from '@devflow/types';

// after firebase signin → get user from our backend
async function syncWithBackend(): Promise<IUser> {
  // api.ts interceptor auto attaches firebase token
  const res = await api.get<IApiResponse<IUser>>('/users/me');
  const user = res.data.data;
  useAuthStore.getState().setUser(user);
  return user;
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
  return syncWithBackend();
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await user.getIdToken(true);
  return syncWithBackend();
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
  return syncWithBackend();
}

export async function signInWithGithub() {
  await signInWithPopup(auth, githubProvider);
  return syncWithBackend();
}

export async function signOut() {
  await firebaseSignOut(auth);
  useAuthStore.getState().clearAuth();
}

export async function sendResetEmail(email: string) {
  await api.post('/auth/forgot-password', { email });
}

export async function verifyResetCode(oobCode: string) {
  // returns the email tied to this code — throws if expired/invalid/used
  return verifyPasswordResetCode(auth, oobCode);
}

export async function confirmReset(oobCode: string, newPassword: string) {
  await confirmPasswordReset(auth, oobCode, newPassword);
}
