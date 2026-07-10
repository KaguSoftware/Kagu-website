import "server-only";
import { promises as fs } from "fs";
import path from "path";

/*
  Intrinsic width/height for images that live under /public (thumbnail paths
  stored in the DB, e.g. "/cases/genbuzz/ThumbnailGen.png"). Lets server
  components render them through next/image with real dimensions — the
  optimizer then serves resized WebP/AVIF and the layout reserves the exact
  aspect ratio (no CLS). Returns null for remote URLs or unreadable files,
  in which case callers fall back to a plain <img>.
*/

export type ImageDims = { width: number; height: number };

function pngSize(buf: Buffer): ImageDims | null {
  // PNG signature + IHDR: width/height are big-endian uint32 at bytes 16/20.
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf: Buffer): ImageDims | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) return null;
    const marker = buf[off + 1];
    // SOF0–SOF15 (except DHT/JPG/DAC markers) carry the frame dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buf.readUInt16BE(off + 5),
        width: buf.readUInt16BE(off + 7),
      };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return null;
}

/** Dimensions for a /public-relative image path ("/cases/…"); null if unknown. */
export async function publicImageSize(src: string): Promise<ImageDims | null> {
  if (!src.startsWith("/")) return null; // remote URL — can't probe cheaply
  try {
    const file = path.join(process.cwd(), "public", src);
    const buf = await fs.readFile(file);
    if (src.toLowerCase().endsWith(".png")) return pngSize(buf);
    if (/\.jpe?g$/i.test(src)) return jpegSize(buf);
    return pngSize(buf) ?? jpegSize(buf);
  } catch {
    return null;
  }
}
