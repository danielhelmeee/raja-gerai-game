import type { Paint } from './paint'

export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

export interface SpriteOpts {
  /** How many pixels in from the edge the surface curves (0 = flat). */
  bevel?: number
  /** How much brightness variation reads as surface bumps. */
  detail?: number
}

const SIZE = 2048
const PAD = 2

/**
 * Packs every sprite into one albedo atlas plus a matching normal-map atlas.
 * Normals are generated automatically: a bevel from each sprite's silhouette
 * plus a little relief from its own shading, so lights can rake across it.
 */
export class Atlas {
  readonly albedo: HTMLCanvasElement
  readonly normal: HTMLCanvasElement
  private actx: CanvasRenderingContext2D
  private nctx: CanvasRenderingContext2D
  private frames = new Map<string, Frame>()
  private cx = PAD
  private cy = PAD
  private rowH = 0

  constructor() {
    this.albedo = document.createElement('canvas')
    this.normal = document.createElement('canvas')
    this.albedo.width = this.albedo.height = SIZE
    this.normal.width = this.normal.height = SIZE
    this.actx = this.albedo.getContext('2d')!
    this.nctx = this.normal.getContext('2d')!
  }

  get size() {
    return SIZE
  }

  has(name: string) {
    return this.frames.has(name)
  }

  get(name: string): Frame {
    const f = this.frames.get(name)
    if (!f) throw new Error(`missing sprite ${name}`)
    return f
  }

  add(name: string, p: Paint, opts: SpriteOpts = {}): Frame {
    if (this.cx + p.w + PAD > SIZE) {
      this.cx = PAD
      this.cy += this.rowH + PAD
      this.rowH = 0
    }
    if (this.cy + p.h + PAD > SIZE) throw new Error('sprite atlas full')
    const f = { x: this.cx, y: this.cy, w: p.w, h: p.h }
    this.cx += p.w + PAD
    this.rowH = Math.max(this.rowH, p.h)
    this.actx.drawImage(p.c, f.x, f.y)
    this.nctx.putImageData(normalMap(p, opts.bevel ?? 2, opts.detail ?? 0.35), f.x, f.y)
    this.frames.set(name, f)
    return f
  }
}

function normalMap(p: Paint, bevel: number, detail: number): ImageData {
  const { w, h } = p
  const src = p.ctx.getImageData(0, 0, w, h).data
  const alpha = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3] > 0 ? 1 : 0)

  // Distance (in px, capped at bevel) from each opaque pixel to the nearest transparent one.
  const dist = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!alpha(x, y)) continue
      let d = bevel
      for (let r = 1; r <= bevel && d === bevel; r++) {
        for (let k = -r; k <= r; k++) {
          if (!alpha(x + k, y - r) || !alpha(x + k, y + r) || !alpha(x - r, y + k) || !alpha(x + r, y + k)) {
            d = r - 1
            break
          }
        }
      }
      dist[y * w + x] = d
    }
  }
  const height = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const lum = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255
    const b = bevel > 0 ? Math.sin((Math.min(dist[i], bevel) / bevel) * (Math.PI / 2)) : 1
    height[i] = src[i * 4 + 3] ? b + lum * detail : 0
  }
  const H = (x: number, y: number) => height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]
  const out = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!src[i * 4 + 3]) continue
      const dx = (H(x + 1, y) - H(x - 1, y)) * 1.6
      const dy = (H(x, y + 1) - H(x, y - 1)) * 1.6
      let nx = -dx
      let ny = -dy
      let nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      nz /= len
      out.data[i * 4] = (nx * 0.5 + 0.5) * 255
      out.data[i * 4 + 1] = (ny * 0.5 + 0.5) * 255
      out.data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255
      out.data[i * 4 + 3] = 255
    }
  }
  return out
}
