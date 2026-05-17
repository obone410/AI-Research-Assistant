import { NextRequest } from "next/server";
import { fail, ok, unknownFail } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { chunkDocument } from "@/lib/documents/chunk";
import {
  detectDocumentKind,
  extractTextFromDocument,
} from "@/lib/documents/extract";
import { sha256 } from "@/lib/research/hash";
import {
  createProjectFromDocument,
  getResearchContext,
} from "@/lib/research/repository";
import { generateEmbeddingsForChunks } from "@/lib/research/processing";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARS = 280_000;
const MAX_CHUNKS_PER_DOCUMENT = 180;

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "documents:upload", 10, 60_000);
  if (!limit.allowed) {
    return fail(
      "rate_limit_exceeded",
      "Upload rate limit exceeded.",
      429,
      { retryAfter: limit.retryAfter },
    );
  }

  try {
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to upload documents.", 401);
    }

    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();

    if (!(file instanceof File)) {
      return fail("bad_request", "Upload a PDF, TXT, or DOCX file.", 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return fail("bad_request", "File size must be 15MB or less.", 400);
    }

    if (detectDocumentKind(file.name, file.type) === "unsupported") {
      return fail("bad_request", "Only PDF, TXT, and DOCX files are supported.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromDocument(buffer, file.name, file.type);

    if (rawText.length < 20) {
      return fail(
        "bad_request",
        "The document did not contain enough extractable text.",
        400,
      );
    }

    if (rawText.length > MAX_EXTRACTED_TEXT_CHARS) {
      return fail(
        "payload_too_large",
        "The extracted document text is too large for this workspace. Split the document and upload a smaller section.",
        413,
      );
    }

    const chunks = chunkDocument({ text: rawText });

    if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
      return fail(
        "payload_too_large",
        "The document produced too many chunks. Split it into smaller research projects before processing.",
        413,
      );
    }
    const embeddings = await generateEmbeddingsForChunks(chunks);
    const contentHash = sha256(buffer);

    const project = await createProjectFromDocument(ctx, {
      title: title || file.name.replace(/\.[^.]+$/, ""),
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      contentHash,
      rawText,
      storageBuffer: buffer,
      chunks: chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
      })),
    });

    return ok({ project, chunkCount: chunks.length }, { status: 201 });
  } catch (error) {
    return unknownFail(error);
  }
}
