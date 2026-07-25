import { createHmac } from "node:crypto";

/**
 * Build ICE servers that work across networks.
 * Prefer env TURN_*, else Open Relay static-auth (TURN REST / coturn HMAC).
 */
export function getIceServers() {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  const turnUrls = String(process.env.TURN_URLS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (turnUrls.length) {
    servers.push({
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
    return servers;
  }

  const meteredUser = process.env.METERED_TURN_USERNAME;
  const meteredPass = process.env.METERED_TURN_CREDENTIAL;
  if (meteredUser && meteredPass) {
    servers.push(
      {
        urls: "turn:a.relay.metered.ca:80",
        username: meteredUser,
        credential: meteredPass,
      },
      {
        urls: "turn:a.relay.metered.ca:80?transport=tcp",
        username: meteredUser,
        credential: meteredPass,
      },
      {
        urls: "turn:a.relay.metered.ca:443",
        username: meteredUser,
        credential: meteredPass,
      },
      {
        urls: "turns:a.relay.metered.ca:443?transport=tcp",
        username: meteredUser,
        credential: meteredPass,
      },
    );
    return servers;
  }

  // Open Relay static-auth (coturn TURN REST). Works without a paid account.
  // Spec: username = expiry unix ts, credential = base64(hmac-sha1(secret, username))
  const secret =
    process.env.OPENRELAY_TURN_SECRET ||
    process.env.TURN_STATIC_AUTH_SECRET ||
    "openrelayprojectsecret";
  const ttlSec = Number(process.env.OPENRELAY_TURN_TTL_SEC || 24 * 3600);
  const expiry = Math.floor(Date.now() / 1000) + (Number.isFinite(ttlSec) ? ttlSec : 24 * 3600);
  const username = String(expiry);
  const credential = createHmac("sha1", secret).update(username).digest("base64");

  servers.push(
    {
      urls: "turn:staticauth.openrelay.metered.ca:80",
      username,
      credential,
    },
    {
      urls: "turn:staticauth.openrelay.metered.ca:80?transport=tcp",
      username,
      credential,
    },
    {
      urls: "turn:staticauth.openrelay.metered.ca:443",
      username,
      credential,
    },
    {
      urls: "turns:staticauth.openrelay.metered.ca:443?transport=tcp",
      username,
      credential,
    },
  );

  return servers;
}
