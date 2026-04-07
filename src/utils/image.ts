import { readFile } from 'node:fs/promises';
import { ImageInputError } from '../types/errors.js';
import type { ImageInput, SupportedMediaType } from '../types/receipt.js';

const MAGIC_BYTES: Array<[SupportedMediaType, number[], number]> = [
  ['image/jpeg', [0xff, 0xd8, 0xff], 0],
  ['image/png', [0x89, 0x50, 0x4e, 0x47], 0],
  ['image/gif', [0x47, 0x49, 0x46], 0],
  ['image/webp', [0x52, 0x49, 0x46, 0x46], 0],
];

export function detectMediaType(buffer: Buffer): SupportedMediaType {
  for (const [type, bytes] of MAGIC_BYTES) {
    if (bytes.every((b, i) => buffer[i] === b)) {
      return type;
    }
  }
  throw new ImageInputError(
    'Unsupported image format. Supported: JPEG, PNG, GIF, WEBP.',
  );
}

function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

export async function resolveImageInput(
  input: ImageInput,
): Promise<{ base64: string; mediaType: SupportedMediaType } | { url: string }> {
  if (typeof input === 'string') {
    if (isUrl(input)) {
      // Fetch and encode as base64 for maximum provider compatibility
      let response: Response;
      try {
        response = await fetch(input);
      } catch (cause) {
        throw new ImageInputError(
          `Could not fetch image URL "${input}": ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
      if (!response.ok) {
        throw new ImageInputError(`Failed to fetch image URL "${input}": HTTP ${response.status}`);
      }
      const arrayBuf = await response.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const contentType = response.headers.get('content-type') ?? '';
      const mediaType = contentType.startsWith('image/')
        ? (contentType.split(';')[0]?.trim() as SupportedMediaType)
        : detectMediaType(buf);
      return { base64: buf.toString('base64'), mediaType };
    }
    // File path
    let buf: Buffer;
    try {
      buf = await readFile(input);
    } catch (cause) {
      throw new ImageInputError(
        `Could not read image file "${input}": ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    return {
      base64: buf.toString('base64'),
      mediaType: detectMediaType(buf),
    };
  }

  if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return {
      base64: buf.toString('base64'),
      mediaType: detectMediaType(buf),
    };
  }

  // { base64, mediaType } object
  return { base64: input.base64, mediaType: input.mediaType };
}
