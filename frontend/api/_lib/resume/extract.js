import mammoth from "mammoth";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

const MAX_CHARS = 60_000;

function extensionOf(filename = "") {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

/** Prefer real PDF/DOCX MIME when browsers send octet-stream or mislabel DOCX as msword. */
export function resolveResumeUploadMime(mimeType, filename) {
  const mime = String(mimeType || "").toLowerCase().trim();
  const ext = extensionOf(filename);

  if (ext === "pdf") return PDF_MIME;
  if (ext === "docx") return DOCX_MIME;
  if (mime === PDF_MIME || mime === DOCX_MIME) return mime;
  if (mime && mime !== "application/octet-stream" && mime !== "binary/octet-stream") {
    return mime;
  }
  return mime || "application/octet-stream";
}

export function assertResumeUploadType(mimeType, filename) {
  const mime = resolveResumeUploadMime(mimeType, filename);
  const ext = extensionOf(filename);

  // Only reject true legacy .doc — some browsers send DOCX as application/msword.
  if (ext === "doc" || (mime === DOC_MIME && ext !== "docx" && ext !== "pdf")) {
    const error = new Error("Legacy .doc files are not supported. Please re-save as PDF or DOCX.");
    error.status = 400;
    error.code = "unsupported_doc";
    throw error;
  }

  const ok =
    mime === PDF_MIME ||
    mime === DOCX_MIME ||
    ext === "pdf" ||
    ext === "docx";

  if (!ok) {
    const error = new Error("Upload a PDF or Word (.docx) resume.");
    error.status = 400;
    error.code = "unsupported_type";
    throw error;
  }
}

async function extractPdfText(buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "").trim();
  } finally {
    try {
      await parser.destroy?.();
    } catch {
      /* ignore cleanup errors */
    }
  }
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return String(result?.value || "").trim();
}

export async function extractResumeText({ buffer, mimeType, filename }) {
  const mime = resolveResumeUploadMime(mimeType, filename);
  assertResumeUploadType(mime, filename);
  const ext = extensionOf(filename);

  let text = "";
  if (mime === PDF_MIME || ext === "pdf") {
    text = await extractPdfText(buffer);
  } else {
    text = await extractDocxText(buffer);
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) {
    const error = new Error("Could not extract text from this file. Try another PDF/DOCX export.");
    error.status = 422;
    error.code = "empty_extract";
    throw error;
  }

  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS)}\n\n[Truncated for parsing]`;
  }

  return text;
}
