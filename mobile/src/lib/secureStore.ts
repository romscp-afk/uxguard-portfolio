import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;

async function setChunkCount(key: string, count: number) {
  await SecureStore.setItemAsync(`${key}_chunks`, String(count));
}

export const chunkedSecureStore = {
  async getItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!countRaw) {
      return SecureStore.getItemAsync(key);
    }
    const count = Number(countRaw);
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      parts.push((await SecureStore.getItemAsync(`${key}_${i}`)) ?? '');
    }
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    const chunks = Math.max(1, Math.ceil(value.length / CHUNK));
    await setChunkCount(key, chunks);
    for (let i = 0; i < chunks; i += 1) {
      await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
  },
  async removeItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    const count = Number(countRaw || '0');
    await SecureStore.deleteItemAsync(key);
    await SecureStore.deleteItemAsync(`${key}_chunks`);
    for (let i = 0; i < Math.max(count, 8); i += 1) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
};
