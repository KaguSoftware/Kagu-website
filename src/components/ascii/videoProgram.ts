/*
  A real video → live ASCII. The <video> element is owned by the caller
  (AsciiVideo) so it can be revealed/played for real; this program just
  samples its current frame into the grid at the field's fps (levels and a
  small-radius local contrast are recomputed per frame; it is cheap at this
  grid size). Nothing is drawn until the first frame is decodable.
*/
import type { FieldProgram } from "./AsciiField";
import { MONO_PALETTE, shade } from "./noise";
import { enhance, sampleLuma } from "./imageProgram";

/** videoId: the id of the owner's <video> element (looked up at frame time) */
export function videoProgram(videoId: string): () => FieldProgram {
  return () => {
    let ctx: CanvasRenderingContext2D | null = null;
    let el: HTMLVideoElement | null = null;
    return {
      palette: MONO_PALETTE,
      frame(g) {
        if (!el || !el.isConnected) el = document.getElementById(videoId) as HTMLVideoElement | null;
        const v = el;
        if (!v || v.readyState < 2 || !v.videoWidth) {
          g.ch.fill(32);
          return;
        }
        ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const raw = sampleLuma(g, v, v.videoWidth, v.videoHeight, "cover", ctx);
        const lum = enhance(raw, g.cols, g.rows, false, 3, 1);
        for (let i = 0; i < lum.length; i++) {
          const [c, l] = shade(Math.pow(lum[i], 1.1), 1);
          g.ch[i] = c;
          g.col[i] = l;
        }
      },
    };
  };
}
