import { createHash } from "node:crypto";

export function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

export function shortHash(input: string | Buffer) {
  return sha256(input).slice(0, 12);
}
