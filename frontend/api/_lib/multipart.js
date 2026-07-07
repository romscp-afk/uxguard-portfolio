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

  if (!fileEntry || typeof fileEntry === "string") {
    throw new Error("No file provided");
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  return {
    file: {
      buffer,
      filename: fileEntry.name || "upload",
      mimeType: fileEntry.type || "application/octet-stream",
    },
    altText: typeof altText === "string" && altText.trim() ? altText.trim() : undefined,
  };
}
