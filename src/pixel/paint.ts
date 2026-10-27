import { GLYPH_ADV, glyphRows } from './font'

/** A tiny pixel canvas for authoring sprites one pixel at a time. */
export class Paint {
  readonly c: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.c = document.createElement('canvas')
    this.c.width = w
    this.c.height = h
    this.ctx = this.c.getContext('2d', { willReadFrequently: true })!
    this.ctx.imageSmoothingEnabled = false
  }

  px(x: number, y: number, col: string) {
    this.ctx.fillStyle = col
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }

  rect(x: number, y: number, w: number, h: number, col: string) {
    this.ctx.fillStyle = col
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  /** Rectangle with its four corner pixels knocked out. */
  rrect(x: number, y: number, w: number, h: number, col: string) {
    this.rect(x + 1, y, w - 2, h, col)
    this.rect(x, y + 1, 1, h - 2, col)
    this.rect(x + w - 1, y + 1, 1, h - 2, col)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, col: string) {
    this.ctx.fillStyle = col
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.25)
        const dy = (y + 0.5 - cy) / (ry + 0.25)
        if (dx * dx + dy * dy <= 1) this.ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  circle(cx: number, cy: number, r: number, col: string) {
    this.ellipse(cx, cy, r, r, col)
  }

  /** Ellipse outline only. */
  ring(cx: number, cy: number, rx: number, ry: number, col: string, thick = 1) {
    this.ctx.fillStyle = col
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.25)
        const dy = (y + 0.5 - cy) / (ry + 0.25)
        const ix = (x + 0.5 - cx) / Math.max(rx - thick + 0.25, 0.1)
        const iy = (y + 0.5 - cy) / Math.max(ry - thick + 0.25, 0.1)
        if (dx * dx + dy * dy <= 1 && ix * ix + iy * iy > 1) this.ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, col: string) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.px(x0, y0, col)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  /** Checkerboard dither inside a rect. */
  dither(x: number, y: number, w: number, h: number, col: string, phase = 0) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j + phase) % 2 === 0) this.px(x + i, y + j, col)
  }

  text(str: string, x: number, y: number, col: string, scale = 1) {
    let cx = x
    for (const ch of str) {
      glyphRows(ch).forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') this.rect(cx + rx * scale, y + ry * scale, scale, scale, col)
      })
      cx += GLYPH_ADV * scale
    }
  }

  /** Dark outline around every opaque pixel (4-neighbour), the classic SNES sprite edge. */
  outline(col: string) {
    const img = this.ctx.getImageData(0, 0, this.w, this.h)
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : img.data[(y * this.w + x) * 4 + 3])
    const marks: [number, number][] = []
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (a(x, y) > 0) continue
        if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) marks.push([x, y])
      }
    }
    for (const [x, y] of marks) this.px(x, y, col)
  }

  /** Mirror horizontally into a new Paint. */
  flipped(): Paint {
    const p = new Paint(this.w, this.h)
    p.ctx.translate(this.w, 0)
    p.ctx.scale(-1, 1)
    p.ctx.drawImage(this.c, 0, 0)
    return p
  }
}
