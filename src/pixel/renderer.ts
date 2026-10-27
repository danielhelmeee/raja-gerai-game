import type { Atlas, Frame } from './atlas'

export interface Light {
  x: number
  y: number
  /** Height above the table in pixels: higher lights rake less. */
  z: number
  radius: number
  color: [number, number, number]
  intensity: number
}

export interface Draw {
  f: Frame
  x: number
  y: number
  /** Draw size (defaults to the frame size). */
  w?: number
  h?: number
  flipX?: boolean
  color?: [number, number, number, number]
  /** Sub-rectangle of the frame, for clipped drawing. */
  sx?: number
  sy?: number
  sw?: number
  sh?: number
}

export interface Frame3 {
  lit: Draw[]
  emissive: Draw[]
  ui: Draw[]
  lights: Light[]
  ambient: [number, number, number]
  flash: [number, number, number]
  shake: [number, number]
  scanlines: boolean
  /** A rect (logical px) whose light never drops below `level`: keeps your hand readable. */
  floor: { x: number; y: number; w: number; h: number; level: number }
}

const MAX_LIGHTS = 28
const FLOATS_PER_VERT = 9
const MAX_QUADS = 8000

const SPRITE_VS = `#version 300 es
in vec2 aPos; in vec2 aUV; in vec4 aColor; in float aFlip;
uniform vec2 uRes;
out vec2 vUV; out vec4 vColor; out float vFlip;
void main() {
  vUV = aUV; vColor = aColor; vFlip = aFlip;
  gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0);
}`

const SPRITE_FS = `#version 300 es
precision mediump float;
in vec2 vUV; in vec4 vColor; in float vFlip;
uniform sampler2D uTex; uniform int uMode;
out vec4 o;
void main() {
  vec4 t = texture(uTex, vUV);
  if (t.a < 0.5) discard;
  if (uMode == 1) {
    vec3 n = t.rgb * 2.0 - 1.0;
    n.x *= vFlip;
    o = vec4(n * 0.5 + 0.5, 1.0);
  } else {
    o = vec4(t.rgb * vColor.rgb, vColor.a);
  }
}`

const FULL_VS = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }`

const LIGHT_FS = `#version 300 es
precision highp float;
uniform sampler2D uAlbedo; uniform sampler2D uNormal; uniform sampler2D uEmissive;
uniform vec2 uRes; uniform int uCount;
uniform vec4 uLightPos[${MAX_LIGHTS}]; uniform vec4 uLightCol[${MAX_LIGHTS}];
uniform vec3 uAmbient; uniform vec3 uFlash;
uniform vec4 uFloorRect; uniform float uFloor;
out vec4 o;
const float BANDS = 6.0;
float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[y * 4 + x]) + 0.5) / 16.0;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 alb = texture(uAlbedo, uv).rgb;
  vec3 n = normalize(texture(uNormal, uv).xyz * 2.0 - 1.0);
  vec3 light = uAmbient;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uCount) break;
    vec4 lp = uLightPos[i]; vec4 lc = uLightCol[i];
    vec3 L = vec3(lp.xy - p, lp.z);
    float att = clamp(1.0 - length(L.xy) / lp.w, 0.0, 1.0);
    att *= att;
    float ndl = max(dot(n, normalize(L)), 0.0);
    light += lc.rgb * lc.a * att * (0.3 + 0.7 * ndl);
  }
  if (p.x >= uFloorRect.x && p.y >= uFloorRect.y && p.x < uFloorRect.z && p.y < uFloorRect.w) light = max(light, vec3(uFloor));
  // Posterise the light into bands with an ordered dither: the 16-bit look.
  light = floor(light * BANDS + bayer(floor(p))) / BANDS;
  vec4 em = texture(uEmissive, uv);
  o = vec4(alb * light + em.rgb * em.a + uFlash, 1.0);
}`

const BLIT_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uCanvas; uniform vec2 uRes; uniform vec2 uShake;
uniform float uScale; uniform int uScan;
out vec4 o;
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 lp = floor(frag / uScale) - uShake;
  vec3 c = texture(uTex, (lp + 0.5) / uRes).rgb;
  if (uScan == 1 && uScale >= 3.0 && mod(frag.y, uScale) < 1.0) c *= 0.78;
  vec2 v = frag / uCanvas - 0.5;
  c *= 1.0 - 0.35 * pow(length(v) * 1.35, 3.0);
  o = vec4(c, 1.0);
}`

interface Target {
  fb: WebGLFramebuffer
  tex: WebGLTexture
}

export class Renderer {
  private gl: WebGL2RenderingContext
  private sprite: WebGLProgram
  private lightProg: WebGLProgram
  private blit: WebGLProgram
  private vao: WebGLVertexArrayObject
  private vbo: WebGLBuffer
  private data = new Float32Array(MAX_QUADS * 6 * FLOATS_PER_VERT)
  private albedoAtlas: WebGLTexture
  private normalAtlas: WebGLTexture
  private targets: Record<'albedo' | 'normal' | 'emissive' | 'composite', Target> | null = null
  private uni = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>()
  private atlasSize: number
  W = 480
  H = 270
  scale = 1

  constructor(
    private canvas: HTMLCanvasElement,
    atlas: Atlas,
  ) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) throw new Error('WebGL2 is not available in this browser')
    this.gl = gl
    this.sprite = this.program(SPRITE_VS, SPRITE_FS)
    this.lightProg = this.program(FULL_VS, LIGHT_FS)
    this.blit = this.program(FULL_VS, BLIT_FS)
    this.atlasSize = atlas.size
    this.albedoAtlas = this.texture(atlas.albedo)
    this.normalAtlas = this.texture(atlas.normal)

    this.vao = gl.createVertexArray()!
    this.vbo = gl.createBuffer()!
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW)
    const stride = FLOATS_PER_VERT * 4
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(this.sprite, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4)
    }
    attr('aPos', 2, 0)
    attr('aUV', 2, 2)
    attr('aColor', 4, 4)
    attr('aFlip', 1, 8)
    gl.bindVertexArray(null)
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error')
    return p
  }

  private u(p: WebGLProgram, name: string) {
    let m = this.uni.get(p)
    if (!m) this.uni.set(p, (m = new Map()))
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name))
    return m.get(name)!
  }

  private texture(src: TexImageSource | null, w = 0, h = 0): WebGLTexture {
    const gl = this.gl
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  resize(W: number, H: number, scale: number) {
    const gl = this.gl
    this.W = W
    this.H = H
    this.scale = scale
    this.canvas.width = W * scale
    this.canvas.height = H * scale
    if (this.targets) {
      for (const t of Object.values(this.targets)) {
        gl.deleteFramebuffer(t.fb)
        gl.deleteTexture(t.tex)
      }
    }
    const make = (): Target => {
      const tex = this.texture(null, W, H)
      const fb = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      return { fb, tex }
    }
    this.targets = { albedo: make(), normal: make(), emissive: make(), composite: make() }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private drawSprites(draws: Draw[], atlas: WebGLTexture, mode: 0 | 1) {
    const gl = this.gl
    const inv = 1 / this.atlasSize
    gl.useProgram(this.sprite)
    gl.uniform2f(this.u(this.sprite, 'uRes'), this.W, this.H)
    gl.uniform1i(this.u(this.sprite, 'uMode'), mode)
    gl.uniform1i(this.u(this.sprite, 'uTex'), 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, atlas)
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    let n = 0
    const flush = () => {
      if (!n) return
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, n * 6 * FLOATS_PER_VERT)
      gl.drawArrays(gl.TRIANGLES, 0, n * 6)
      n = 0
    }
    const d = this.data
    for (const s of draws) {
      if (n >= MAX_QUADS) flush()
      const sx = s.sx ?? 0
      const sy = s.sy ?? 0
      const sw = s.sw ?? s.f.w
      const sh = s.sh ?? s.f.h
      const x0 = Math.round(s.x)
      const y0 = Math.round(s.y)
      const x1 = x0 + Math.round(s.w ?? sw)
      const y1 = y0 + Math.round(s.h ?? sh)
      let u0 = (s.f.x + sx) * inv
      let u1 = (s.f.x + sx + sw) * inv
      const v0 = (s.f.y + sy) * inv
      const v1 = (s.f.y + sy + sh) * inv
      if (s.flipX) [u0, u1] = [u1, u0]
      const [r, g, b, a] = s.color ?? [1, 1, 1, 1]
      const flip = s.flipX ? -1 : 1
      let o = n * 6 * FLOATS_PER_VERT
      const v = (x: number, y: number, u: number, vv: number) => {
        d[o++] = x
        d[o++] = y
        d[o++] = u
        d[o++] = vv
        d[o++] = r
        d[o++] = g
        d[o++] = b
        d[o++] = a
        d[o++] = flip
      }
      v(x0, y0, u0, v0)
      v(x1, y0, u1, v0)
      v(x0, y1, u0, v1)
      v(x0, y1, u0, v1)
      v(x1, y0, u1, v0)
      v(x1, y1, u1, v1)
      n++
    }
    flush()
  }

  render(f: Frame3) {
    const gl = this.gl
    const t = this.targets!
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.viewport(0, 0, this.W, this.H)

    gl.bindFramebuffer(gl.FRAMEBUFFER, t.albedo.fb)
    gl.clearColor(0.05, 0.03, 0.08, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.drawSprites(f.lit, this.albedoAtlas, 0)

    gl.bindFramebuffer(gl.FRAMEBUFFER, t.normal.fb)
    gl.clearColor(0.5, 0.5, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.drawSprites(f.lit, this.normalAtlas, 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, t.emissive.fb)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.drawSprites(f.emissive, this.albedoAtlas, 0)

    // Lighting composite.
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.composite.fb)
    gl.disable(gl.BLEND)
    gl.useProgram(this.lightProg)
    const lp = new Float32Array(MAX_LIGHTS * 4)
    const lc = new Float32Array(MAX_LIGHTS * 4)
    const lights = f.lights.slice(0, MAX_LIGHTS)
    lights.forEach((l, i) => {
      lp.set([l.x, l.y, l.z, l.radius], i * 4)
      lc.set([...l.color, l.intensity], i * 4)
    })
    gl.uniform4fv(this.u(this.lightProg, 'uLightPos'), lp)
    gl.uniform4fv(this.u(this.lightProg, 'uLightCol'), lc)
    gl.uniform1i(this.u(this.lightProg, 'uCount'), lights.length)
    gl.uniform2f(this.u(this.lightProg, 'uRes'), this.W, this.H)
    gl.uniform3fv(this.u(this.lightProg, 'uAmbient'), f.ambient)
    gl.uniform3fv(this.u(this.lightProg, 'uFlash'), f.flash)
    gl.uniform4f(this.u(this.lightProg, 'uFloorRect'), f.floor.x, f.floor.y, f.floor.x + f.floor.w, f.floor.y + f.floor.h)
    gl.uniform1f(this.u(this.lightProg, 'uFloor'), f.floor.level)
    const bind = (unit: number, tex: WebGLTexture, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(this.u(this.lightProg, name), unit)
    }
    bind(0, t.albedo.tex, 'uAlbedo')
    bind(1, t.normal.tex, 'uNormal')
    bind(2, t.emissive.tex, 'uEmissive')
    gl.bindVertexArray(null)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // Unlit UI on top.
    gl.enable(gl.BLEND)
    this.drawSprites(f.ui, this.albedoAtlas, 0)

    // Upscale to the canvas with hard pixels.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.disable(gl.BLEND)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.blit)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, t.composite.tex)
    gl.uniform1i(this.u(this.blit, 'uTex'), 0)
    gl.uniform2f(this.u(this.blit, 'uCanvas'), this.canvas.width, this.canvas.height)
    gl.uniform2f(this.u(this.blit, 'uRes'), this.W, this.H)
    gl.uniform2f(this.u(this.blit, 'uShake'), Math.round(f.shake[0]), -Math.round(f.shake[1]))
    gl.uniform1f(this.u(this.blit, 'uScale'), this.scale)
    gl.uniform1i(this.u(this.blit, 'uScan'), f.scanlines ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
