import mammoth from "mammoth";
import { normalizeDocumentText } from "@/lib/documents/chunk";

export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function detectDocumentKind(fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    return "pdf";
  }

  if (mimeType === "text/plain" || lower.endsWith(".txt")) {
    return "txt";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }

  return "unsupported";
}

export async function extractTextFromDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const kind = detectDocumentKind(fileName, mimeType);

  if (kind === "txt") {
    return normalizeDocumentText(buffer.toString("utf8"));
  }

  if (kind === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeDocumentText(result.value);
  }

  if (kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return normalizeDocumentText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Unsupported file type. Upload a PDF, TXT, or DOCX file.");
}
