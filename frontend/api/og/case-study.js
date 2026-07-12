import { getUserCaseStudy, getUserByUsername } from "../_lib/demo-data.js";
import { applyApiHeaders } from "../_lib/http.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "uxguard-portfolio.vercel.app";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function absoluteAsset(origin, url) {
  if (!url) return `${origin}/logo-icon@2x.png`;
  if (String(url).startsWith("http://") || String(url).startsWith("https://")) return String(url);
  return `${origin}${String(url).startsWith("/") ? url : `/${url}`}`;
}

function truncate(text, max = 200) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export default async function handler(req, res) {
  applyApiHeaders(res);

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const username = String(req.query.username || "").trim();
  const slug = String(req.query.slug || "").trim();
  if (!username || !slug) {
    res.status(400).json({ detail: "username and slug are required" });
    return;
  }

  const origin = siteOrigin(req);
  const pageUrl = `${origin}/u/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;

  try {
    const [study, author] = await Promise.all([
      getUserCaseStudy(username, slug),
      getUserByUsername(username),
    ]);

    if (!study) {
      res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send(`<!doctype html>
<html><head><meta charset="utf-8" /><title>Case study not found</title>
<meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head><body><p>Case study not found. <a href="${escapeHtml(pageUrl)}">Open portfolio</a></p></body></html>`);
      return;
    }

    const title = `${study.title} · ${author?.name || username} · UXGuard Studio`;
    const description = truncate(
      study.summary || study.subtitle || study.challenge || `Case study by ${author?.name || username} on UXGuard Studio`,
    );
    const image = absoluteAsset(origin, study.cover_image);
    const authorName = author?.name || username;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="UXGuard Studio" />
  <meta property="og:title" content="${escapeHtml(study.title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:alt" content="${escapeHtml(study.title)}" />
  <meta property="article:author" content="${escapeHtml(authorName)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(study.title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <main style="font-family: system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 16px;">
    <p style="color:#64748b; font-size:14px;">UXGuard Studio case study</p>
    <h1 style="font-size:28px; line-height:1.2;">${escapeHtml(study.title)}</h1>
    <p style="color:#475569;">${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(pageUrl)}">Continue to full case study</a></p>
  </main>
  <script>location.replace(${JSON.stringify(pageUrl)});</script>
</body>
</html>`;

    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    res.send(html);
  } catch (err) {
    res.status(500).json({ detail: err.message || "Failed to build share preview" });
  }
}
