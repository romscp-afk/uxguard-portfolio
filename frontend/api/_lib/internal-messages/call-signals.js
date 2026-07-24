import { get, put, head, BlobPreconditionFailedError } from "@vercel/blob";

const SIGNAL_PREFIX = "uxguard/call-signals";
const WRITE_MAX_ATTEMPTS = 10;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMissingBlobError(error) {
  return (
    error?.code === "not_found" ||
    error?.status === 404 ||
    error?.name === "BlobNotFoundError" ||
    String(error?.message || "").toLowerCase().includes("not found")
  );
}

function isPreconditionFailed(error) {
  return (
    error instanceof BlobPreconditionFailedError ||
    error?.name === "BlobPreconditionFailedError" ||
    error?.status === 412 ||
    String(error?.message || "").toLowerCase().includes("precondition")
  );
}

function signalPath(callId) {
  return `${SIGNAL_PREFIX}/${String(callId)}.json`;
}

export function emptyCallSignal() {
  return {
    version: 0,
    offer: null,
    answer: null,
    ice: [],
    updated_at: null,
  };
}

export function normalizeCallSignal(raw) {
  if (!raw || typeof raw !== "object") return emptyCallSignal();
  return {
    version: Number(raw.version) || 0,
    offer: raw.offer || null,
    answer: raw.answer || null,
    ice: Array.isArray(raw.ice) ? raw.ice.slice(-80) : [],
    updated_at: raw.updated_at || null,
  };
}

function pickNewerPart(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  const aV = Number(a.version) || 0;
  const bV = Number(b.version) || 0;
  return bV >= aV ? b : a;
}

function mergeSignals(remoteRaw, localRaw) {
  const remote = normalizeCallSignal(remoteRaw);
  const local = normalizeCallSignal(localRaw);
  const iceById = new Map();
  for (const item of [...remote.ice, ...local.ice]) {
    const id = String(item?.id || "").trim();
    if (!id) continue;
    iceById.set(id, item);
  }
  const ice = [...iceById.values()]
    .sort((a, b) => (Number(a.version) || 0) - (Number(b.version) || 0))
    .slice(-80);
  const version = Math.max(
    remote.version,
    local.version,
    Number(pickNewerPart(remote.offer, local.offer)?.version) || 0,
    Number(pickNewerPart(remote.answer, local.answer)?.version) || 0,
    ...ice.map((item) => Number(item.version) || 0),
  );
  return {
    version,
    offer: pickNewerPart(remote.offer, local.offer),
    answer: pickNewerPart(remote.answer, local.answer),
    ice,
    updated_at: new Date().toISOString(),
  };
}

/** In-memory fallback for tests / local without Blob token. */
const memorySignals = new Map();
const memoryLocks = new Map();

async function withMemoryLock(callId, fn) {
  const key = String(callId);
  const prev = memoryLocks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  memoryLocks.set(
    key,
    prev.then(() => gate),
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (memoryLocks.get(key) === gate) memoryLocks.delete(key);
  }
}

async function readSignalBlob(callId) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      data: memorySignals.get(String(callId)) || emptyCallSignal(),
      etag: null,
    };
  }

  const pathname = signalPath(callId);
  let etag = null;
  try {
    const meta = await head(pathname);
    etag = meta?.etag || null;
  } catch (error) {
    if (!isMissingBlobError(error)) throw error;
  }

  try {
    const result = await get(pathname, {
      access: "private",
      headers: {
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
    });
    if (!result || result.statusCode === 404) {
      return { data: emptyCallSignal(), etag: null };
    }
    if (result.statusCode === 304) {
      return { data: emptyCallSignal(), etag };
    }
    if (result.statusCode !== 200 || !result.stream) {
      return { data: emptyCallSignal(), etag };
    }
    const text = await new Response(result.stream).text();
    const raw = text ? JSON.parse(text) : emptyCallSignal();
    return {
      data: normalizeCallSignal(raw),
      etag: result.blob?.etag || etag,
    };
  } catch (error) {
    if (isMissingBlobError(error)) return { data: emptyCallSignal(), etag: null };
    throw error;
  }
}

async function writeSignalBlob(callId, signal, etag) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    memorySignals.set(String(callId), normalizeCallSignal(signal));
    return memorySignals.get(String(callId));
  }

  const pathname = signalPath(callId);
  const options = {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  };
  if (etag) options.ifMatch = etag;
  await put(pathname, JSON.stringify(normalizeCallSignal(signal)), options);
  return signal;
}

export async function readCallSignal(callId) {
  const { data } = await readSignalBlob(callId);
  return data;
}

/**
 * Atomically merge a signal update for one call into a dedicated blob.
 * Keeps WebRTC SDP/ICE out of the giant platform store.
 */
export async function updateCallSignal(callId, mutator) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return withMemoryLock(callId, async () => {
      const remote = memorySignals.get(String(callId)) || emptyCallSignal();
      const draft = structuredClone(normalizeCallSignal(remote));
      const next = mutator(draft) || draft;
      const merged = mergeSignals(remote, next);
      memorySignals.set(String(callId), merged);
      return merged;
    });
  }

  let lastError = null;
  for (let attempt = 1; attempt <= WRITE_MAX_ATTEMPTS; attempt++) {
    try {
      const { data: remote, etag } = await readSignalBlob(callId);
      const draft = structuredClone(normalizeCallSignal(remote));
      const next = mutator(draft) || draft;
      const merged = mergeSignals(remote, next);
      const requireMatch = Boolean(etag) && attempt < WRITE_MAX_ATTEMPTS - 1;
      try {
        await writeSignalBlob(callId, merged, requireMatch ? etag : null);
        return merged;
      } catch (error) {
        lastError = error;
        if (!isPreconditionFailed(error) || attempt === WRITE_MAX_ATTEMPTS) throw error;
        await sleep(25 * attempt);
      }
    } catch (error) {
      lastError = error;
      if (attempt === WRITE_MAX_ATTEMPTS) throw error;
      await sleep(25 * attempt);
    }
  }
  throw lastError || new Error("Could not update call signal");
}

export function resetCallSignalsForTests() {
  memorySignals.clear();
}
