import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;
const memory = new Map<string, string>();

function canUseNativeStore() {
  return Platform.OS !== 'web' && typeof SecureStore.getItemAsync === 'function';
}

async function getRaw(key: string) {
  if (!canUseNativeStore()) return memory.get(key) ?? null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

async function setRaw(key: string, value: string) {
  if (!canUseNativeStore()) {
    memory.set(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memory.set(key, value);
  }
}

async function deleteRaw(key: string) {
  memory.delete(key);
  if (!canUseNativeStore()) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Native store is unavailable in web/SSR.
  }
}

export const chunkedSecureStore = {
  async getItem(key: string) {
    const countRaw = await getRaw(`${key}_chunks`);
    if (!countRaw) {
      return getRaw(key);
    }
    const count = Number(countRaw);
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      parts.push((await getRaw(`${key}_${i}`)) ?? '');
    }
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    const chunks = Math.max(1, Math.ceil(value.length / CHUNK));
    await setRaw(`${key}_chunks`, String(chunks));
    for (let i = 0; i < chunks; i += 1) {
      await setRaw(`${key}_${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
  },
  async removeItem(key: string) {
    const countRaw = await getRaw(`${key}_chunks`);
    const count = Number(countRaw || '0');
    await deleteRaw(key);
    await deleteRaw(`${key}_chunks`);
    for (let i = 0; i < Math.max(count, 8); i += 1) {
      await deleteRaw(`${key}_${i}`);
    }
  },
};
