export async function parseMultipartForm(req) {
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", resolve);
    req.on("error", reject);
  });

  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }

  const formData = await new Request("http://local", {
    method: req.method || "POST",
    headers,
    body,
  }).formData();

  const fileEntry = formData.get("file");
  const altText = formData.get("alt_text");
  const fields = {};
  for (const [key, value] of formData.entries()) {
    if (key === "file") continue;
    if (typeof value === "string") fields[key] = value;
  }

  if (!fileEntry || typeof fileEntry === "string") {
    throw new Error("No file provided");
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const filename = fileEntry.name || "upload";
  let mimeType = fileEntry.type || "application/octet-stream";
  if (!mimeType || mimeType === "application/octet-stream") {
    const ext = String(filename).split(".").pop()?.toLowerCase();
    const byExt = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    if (ext && byExt[ext]) mimeType = byExt[ext];
  }
  return {
    file: {
      buffer,
      filename,
      mimeType,
    },
    fields,
    altText: typeof altText === "string" && altText.trim() ? altText.trim() : undefined,
  };
}
