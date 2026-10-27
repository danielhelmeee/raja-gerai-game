import * as THREE from 'three'
import { ALL_CARDS, GROUP_LABEL, dishIndex } from '../game/cards'
import type { Card, Group } from '../game/types'

export const CARD_W = 0.72
export const CARD_H = 1.0
const TW = 360
const TH = 500

export const GROUP_STYLE: Record<Group, { ink: string; roundel: string; ring: string }> = {
  kopitiam: { ink: '#6B3E26', roundel: '#F7D9C4', ring: '#D9A585' },
  nasi: { ink: '#24774A', roundel: '#CDEBD6', ring: '#8CC7A2' },
  roti: { ink: '#B8740E', roundel: '#FCEAB4', ring: '#E8C46A' },
  kuih: { ink: '#C2416C', roundel: '#F9D3E1', ring: '#E59AB6' },
}

const DISPLAY = '"Bungee", "Cooper Black", Georgia, serif'
const SERIF = '"Fraunces", Georgia, serif'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function toTexture(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '90,60,30' : '255,255,255'},${Math.random() * alpha})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5)
  }
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string) {
  ellipse(ctx, x, y, r, r, fill, stroke)
}

// ───────────────────────── food illustrations ─────────────────────────
// All drawn around (0,0) inside a ~100px radius, in a flat 1970s print style.

const OUTLINE = '#3B2416'

function plate(ctx: CanvasRenderingContext2D, rx = 82, ry = 46, y = 28) {
  ellipse(ctx, 0, y + 6, rx + 4, ry + 4, 'rgba(59,36,22,0.18)')
  ellipse(ctx, 0, y, rx, ry, '#FFFDF6', OUTLINE)
  ctx.lineWidth = 3
  ellipse(ctx, 0, y, rx - 6, ry - 4, 'rgba(0,0,0,0)', '#3E6FB0')
  ctx.lineWidth = 2.5
}

function drawDrink(ctx: CanvasRenderingContext2D, v: number) {
  ctx.lineWidth = 3
  ctx.strokeStyle = OUTLINE
  if (v === 0 || v === 4) {
    // Kopitiam ceramic cup on saucer.
    ellipse(ctx, 0, 58, 78, 20, '#FFFDF6', OUTLINE)
    ctx.beginPath()
    ctx.moveTo(-48, -22)
    ctx.lineTo(48, -22)
    ctx.lineTo(36, 52)
    ctx.lineTo(-36, 52)
    ctx.closePath()
    ctx.fillStyle = '#FFFDF6'
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#2F8F5B'
    ctx.fillRect(-44, 0, 88, 9)
    ctx.beginPath()
    ctx.arc(54, 12, 16, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    ellipse(ctx, 0, -22, 48, 11, v === 0 ? '#2B160C' : '#9A6338', OUTLINE)
    if (v === 4) ellipse(ctx, -8, -22, 20, 5, '#F2E2C2')
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 4
    for (const x of [-18, 6, 28]) {
      ctx.beginPath()
      ctx.moveTo(x, -42)
      ctx.bezierCurveTo(x - 12, -56, x + 12, -66, x, -84)
      ctx.stroke()
    }
    return
  }
  // Tall glass drinks.
  const liquid = v === 1 ? '#C8925A' : v === 2 ? '#5A3420' : '#F08DAE'
  ctx.beginPath()
  ctx.moveTo(-38, -70)
  ctx.lineTo(38, -70)
  ctx.lineTo(30, 72)
  ctx.lineTo(-30, 72)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-36, -44)
  ctx.lineTo(36, -44)
  ctx.lineTo(30, 70)
  ctx.lineTo(-30, 70)
  ctx.closePath()
  ctx.fillStyle = liquid
  ctx.fill()
  if (v === 1) {
    ctx.fillStyle = '#F6E7CC'
    ctx.fillRect(-36, -58, 72, 16)
  } else {
    // Ice cubes and a straw.
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (const [x, y] of [
      [-16, -30],
      [10, -18],
      [-6, 2],
    ]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(0.3)
      ctx.fillRect(-10, -10, 20, 20)
      ctx.restore()
    }
    ctx.strokeStyle = v === 2 ? '#2F8F5B' : '#F4B42A'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(14, 40)
    ctx.lineTo(26, -92)
    ctx.lineTo(44, -100)
    ctx.stroke()
  }
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-38, -70)
  ctx.lineTo(-30, 72)
  ctx.lineTo(30, 72)
  ctx.lineTo(38, -70)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-26, -50)
  ctx.lineTo(-21, 50)
  ctx.stroke()
}

function drawNasi(ctx: CanvasRenderingContext2D, v: number) {
  ctx.lineWidth = 2.5
  ctx.strokeStyle = OUTLINE
  if (v === 0) {
    // Banana leaf under nasi lemak.
    ctx.save()
    ctx.rotate(-0.25)
    ellipse(ctx, 0, 22, 96, 60, '#3E9B4F', OUTLINE)
    ctx.strokeStyle = '#2C7239'
    ctx.beginPath()
    ctx.moveTo(-90, 22)
    ctx.lineTo(90, 22)
    ctx.stroke()
    ctx.restore()
  } else plate(ctx)
  const rice = ['#FFFDF8', '#E9A24A', '#7FA7E6', '#D9B98C', '#FFF6DC'][v]
  ctx.strokeStyle = OUTLINE
  ctx.beginPath()
  ctx.ellipse(-10, 10, 46, 38, 0, Math.PI, 0)
  ctx.lineTo(36, 28)
  ctx.lineTo(-56, 28)
  ctx.closePath()
  ctx.fillStyle = rice
  ctx.fill()
  ctx.stroke()
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(-46 + Math.random() * 70, -18 + Math.random() * 40, 5, 2)
  }
  if (v === 0) {
    ellipse(ctx, 44, -8, 22, 16, '#C8261C', OUTLINE)
    ellipse(ctx, 38, 36, 20, 14, '#FFFFFF', OUTLINE)
    circle(ctx, 38, 36, 9, '#F4B42A')
    for (const x of [-60, -48]) ellipse(ctx, x, 44, 11, 7, '#9BD27A', OUTLINE)
    for (let i = 0; i < 9; i++) ellipse(ctx, -20 + i * 6, 46 + (i % 2) * 4, 4, 3, '#C98B4A')
  } else if (v === 1) {
    ellipse(ctx, -6, -20, 24, 16, '#FFFFFF', OUTLINE)
    circle(ctx, -6, -20, 9, '#F4B42A')
    for (let i = 0; i < 5; i++) ellipse(ctx, 30 + i * 5, 6 + i * 4, 5, 3, '#D7362B')
  } else if (v === 2) {
    for (let i = 0; i < 10; i++) ellipse(ctx, 30 + Math.random() * 24, -6 + Math.random() * 30, 6, 3, '#4F9B3A')
    ellipse(ctx, 44, 34, 18, 9, '#C9A06A', OUTLINE)
  } else if (v === 3) {
    ellipse(ctx, 46, 14, 26, 18, '#E28A2B', OUTLINE)
    ellipse(ctx, 46, 12, 16, 8, '#F4D4A4')
  } else {
    ctx.save()
    ctx.translate(42, 6)
    ctx.rotate(0.4)
    ellipse(ctx, 0, 0, 26, 16, '#E7B46C', OUTLINE)
    ctx.restore()
    for (const x of [-56, -44]) ellipse(ctx, x, 40, 10, 6, '#9BD27A', OUTLINE)
  }
}

function drawRoti(ctx: CanvasRenderingContext2D, v: number) {
  ctx.lineWidth = 2.5
  ctx.strokeStyle = OUTLINE
  if (v === 4) {
    // Roti tisu: a tall golden cone.
    plate(ctx, 70, 30, 54)
    ctx.beginPath()
    ctx.moveTo(-48, 52)
    ctx.lineTo(0, -92)
    ctx.lineTo(48, 52)
    ctx.closePath()
    ctx.fillStyle = '#F2C15A'
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#C98A22'
    for (let i = 1; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(-48 + i * 4, 52 - i * 24)
      ctx.lineTo(48 - i * 4, 52 - i * 22)
      ctx.stroke()
    }
    return
  }
  plate(ctx, 88, 50, 22)
  if (v === 2) {
    for (const [x, r] of [
      [-22, -0.2],
      [26, 0.25],
    ]) {
      ctx.save()
      ctx.translate(x, 8)
      ctx.rotate(r)
      ctx.beginPath()
      ctx.moveTo(-34, 30)
      ctx.lineTo(34, 30)
      ctx.lineTo(0, -34)
      ctx.closePath()
      ctx.fillStyle = '#D9933F'
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#7FAE3A'
      ctx.fillRect(-20, 4, 40, 8)
      ctx.fillStyle = '#FFE58A'
      ctx.fillRect(-12, 14, 24, 6)
      ctx.restore()
    }
    return
  }
  if (v === 3) {
    ctx.strokeStyle = '#E5A72A'
    ctx.lineWidth = 3
    for (let r = 0; r < 4; r++) {
      ctx.save()
      ctx.translate(-30 + r * 20, 16)
      ctx.beginPath()
      ctx.ellipse(0, 0, 28, 20, 0, 0, Math.PI * 2)
      ctx.stroke()
      for (let k = -20; k <= 20; k += 8) {
        ctx.beginPath()
        ctx.moveTo(k, -18)
        ctx.lineTo(-k, 18)
        ctx.stroke()
      }
      ctx.restore()
    }
    ellipse(ctx, 54, -14, 18, 10, '#E9B73E', OUTLINE)
    return
  }
  if (v === 1) {
    ctx.save()
    ctx.rotate(0.1)
    ctx.fillStyle = '#E9B45A'
    ctx.fillRect(-46, -20, 92, 70)
    ctx.strokeRect(-46, -20, 92, 70)
    for (const [x, y] of [
      [-20, 0],
      [16, 24],
      [24, -6],
    ]) {
      ellipse(ctx, x, y, 14, 9, '#FFE15C')
    }
    ctx.restore()
  } else {
    ellipse(ctx, -8, 18, 62, 36, '#EBB654', OUTLINE)
    ctx.strokeStyle = '#B97A1F'
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(-8, 18, 62 - i * 15, 36 - i * 9, 0.2 * i, 0.3, Math.PI * 1.7)
      ctx.stroke()
    }
  }
  // Small bowl of dhal.
  ctx.strokeStyle = OUTLINE
  ellipse(ctx, 62, -18, 22, 12, '#E7A43A', OUTLINE)
  ellipse(ctx, 62, -20, 16, 6, '#F6C561')
}

function drawKuih(ctx: CanvasRenderingContext2D, v: number) {
  ctx.lineWidth = 2.5
  ctx.strokeStyle = OUTLINE
  plate(ctx, 86, 46, 34)
  if (v === 0 || v === 2) {
    for (const [x, y] of [
      [-30, 0],
      [26, 8],
    ]) {
      ctx.save()
      ctx.translate(x, y)
      const h = 54
      if (v === 0) {
        const colors = ['#E9467B', '#FFF4E8', '#E9467B', '#FFF4E8', '#E9467B', '#FFF4E8', '#E9467B']
        colors.forEach((c, i) => {
          ctx.fillStyle = c
          ctx.fillRect(-22, -h / 2 + (i * h) / colors.length, 44, h / colors.length + 0.5)
        })
      } else {
        ctx.fillStyle = '#5BB04A'
        ctx.fillRect(-22, -h / 2, 44, h * 0.45)
        ctx.fillStyle = '#FFFBEF'
        ctx.fillRect(-22, -h / 2 + h * 0.45, 44, h * 0.55)
      }
      ctx.strokeRect(-22, -h / 2, 44, h)
      ctx.restore()
    }
    return
  }
  if (v === 1) {
    for (const [x, y] of [
      [-30, 18],
      [26, 18],
      [-2, -12],
    ]) {
      circle(ctx, x, y, 26, '#3FA34D', OUTLINE)
      ctx.fillStyle = '#FFFFFF'
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * 22
        ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 2)
      }
    }
    return
  }
  if (v === 3) {
    for (const y of [-6, 24]) {
      ctx.save()
      ctx.translate(0, y)
      ctx.fillStyle = '#52A84B'
      ctx.fillRect(-56, -14, 112, 28)
      ctx.strokeRect(-56, -14, 112, 28)
      ellipse(ctx, 56, 0, 9, 14, '#8A4B20', OUTLINE)
      ctx.restore()
    }
    return
  }
  // Apam balik: folded half-moon pancake with peanuts.
  ctx.beginPath()
  ctx.arc(0, 30, 70, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = '#E3A548'
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 30, 58, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = '#F2D07A'
  ctx.fill()
  for (let i = 0; i < 22; i++) {
    const a = Math.PI + Math.random() * Math.PI
    const r = Math.random() * 52
    ellipse(ctx, Math.cos(a) * r, 30 + Math.sin(a) * r, 4, 3, '#B5732F')
  }
}

const ILLUSTRATE: Record<Group, (ctx: CanvasRenderingContext2D, v: number) => void> = {
  kopitiam: drawDrink,
  nasi: drawNasi,
  roti: drawRoti,
  kuih: drawKuih,
}

// ───────────────────────── cards ─────────────────────────

function cornerValue(ctx: CanvasRenderingContext2D, card: Card, ink: string) {
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `86px ${DISPLAY}`
  ctx.fillText(String(card.value), 62, 104)
  ctx.font = `700 15px ${SERIF}`
  ctx.fillText(GROUP_LABEL[card.group].toUpperCase(), 62, 128)
}

function drawCardFront(card: Card): HTMLCanvasElement {
  const [c, ctx] = canvas(TW, TH)
  const style = GROUP_STYLE[card.group]
  ctx.fillStyle = '#FBF3DF'
  ctx.fillRect(0, 0, TW, TH)
  speckle(ctx, TW, TH, 2600, 0.09)

  ctx.strokeStyle = style.ink
  ctx.lineWidth = 6
  ctx.strokeRect(16, 16, TW - 32, TH - 32)
  ctx.lineWidth = 1.5
  ctx.strokeRect(25, 25, TW - 50, TH - 50)

  // Roundel.
  const cx = TW / 2
  const cy = 238
  circle(ctx, cx, cy, 112, style.ring)
  circle(ctx, cx, cy, 102, style.roundel)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 102, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(cx, cy)
  ILLUSTRATE[card.group](ctx, dishIndex(card.value))
  ctx.restore()
  // Sunburst ticks around the roundel, a nod to old food-wrapper prints.
  ctx.strokeStyle = style.ring
  ctx.lineWidth = 3
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * 118, cy + Math.sin(a) * 118)
    ctx.lineTo(cx + Math.cos(a) * 128, cy + Math.sin(a) * 128)
    ctx.stroke()
  }

  ctx.fillStyle = style.ink
  ctx.textAlign = 'center'
  ctx.font = `800 26px ${SERIF}`
  ctx.fillText(card.dish, cx, 398)

  cornerValue(ctx, card, style.ink)
  ctx.save()
  ctx.translate(TW, TH)
  ctx.rotate(Math.PI)
  cornerValue(ctx, card, style.ink)
  ctx.restore()

  // Worn paper edges.
  const g = ctx.createRadialGradient(cx, TH / 2, TH * 0.35, cx, TH / 2, TH * 0.75)
  g.addColorStop(0, 'rgba(120,80,30,0)')
  g.addColorStop(1, 'rgba(120,80,30,0.16)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TW, TH)
  return c
}

function batikMotif(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save()
  ctx.translate(x, y)
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4)
    ctx.beginPath()
    ctx.ellipse(0, -s * 0.55, s * 0.18, s * 0.38, 0, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 ? '#F4B42A' : '#E8735A'
    ctx.fill()
  }
  circle(ctx, 0, 0, s * 0.22, '#FBF3DF')
  circle(ctx, 0, 0, s * 0.1, '#7A2335')
  ctx.restore()
}

function drawCardBack(): HTMLCanvasElement {
  const [c, ctx] = canvas(TW, TH)
  ctx.fillStyle = '#7A2335'
  ctx.fillRect(0, 0, TW, TH)
  ctx.fillStyle = '#22305C'
  ctx.fillRect(22, 22, TW - 44, TH - 44)
  // Diagonal canting lines.
  ctx.save()
  ctx.beginPath()
  ctx.rect(22, 22, TW - 44, TH - 44)
  ctx.clip()
  ctx.strokeStyle = 'rgba(251,243,223,0.35)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 6])
  for (let k = -TH; k < TW + TH; k += 30) {
    ctx.beginPath()
    ctx.moveTo(k, 0)
    ctx.lineTo(k - TH, TH)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(k - TH, 0)
    ctx.lineTo(k, TH)
    ctx.stroke()
  }
  ctx.setLineDash([])
  for (let y = 40; y < TH; y += 84) {
    for (let x = (y / 84) % 2 ? 40 : 82; x < TW; x += 84) batikMotif(ctx, x, y, 34)
  }
  ctx.restore()
  // Border dots.
  for (let x = 30; x < TW; x += 16) {
    circle(ctx, x, 11, 3.5, '#F4B42A')
    circle(ctx, x, TH - 11, 3.5, '#F4B42A')
  }
  for (let y = 30; y < TH; y += 16) {
    circle(ctx, 11, y, 3.5, '#F4B42A')
    circle(ctx, TW - 11, y, 3.5, '#F4B42A')
  }
  // Centre badge.
  ellipse(ctx, TW / 2, TH / 2, 118, 64, '#FBF3DF', '#7A2335')
  ctx.lineWidth = 5
  ellipse(ctx, TW / 2, TH / 2, 108, 54, 'rgba(0,0,0,0)', '#F4B42A')
  ctx.fillStyle = '#7A2335'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `48px ${DISPLAY}`
  ctx.fillText('CILOK!', TW / 2, TH / 2 + 2)
  speckle(ctx, TW, TH, 1500, 0.08)
  return c
}

let cardTextures: Map<string, THREE.Texture> | null = null
let backTexture: THREE.Texture | null = null

export function getCardTexture(id: string): THREE.Texture {
  if (!cardTextures) {
    cardTextures = new Map(ALL_CARDS.map((card) => [card.id, toTexture(drawCardFront(card))]))
  }
  return cardTextures.get(id)!
}

export function getCardBack(): THREE.Texture {
  if (!backTexture) backTexture = toTexture(drawCardBack())
  return backTexture
}

// ───────────────────────── table & props ─────────────────────────

export function makeWoodTexture(): THREE.Texture {
  const S = 1024
  const [c, ctx] = canvas(S, S)
  const planks = 6
  const ph = S / planks
  for (let p = 0; p < planks; p++) {
    const hue = 24 + Math.random() * 6
    const light = 30 + Math.random() * 8
    ctx.fillStyle = `hsl(${hue}, 45%, ${light}%)`
    ctx.fillRect(0, p * ph, S, ph)
    for (let i = 0; i < 70; i++) {
      const y = p * ph + Math.random() * ph
      ctx.strokeStyle = `hsla(${hue - 4}, 50%, ${light - 12 + Math.random() * 8}%, ${0.25 + Math.random() * 0.35})`
      ctx.lineWidth = 0.6 + Math.random() * 2
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= S; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 3 + (Math.random() - 0.5) * 2)
      ctx.stroke()
    }
    // Knots.
    for (let k = 0; k < 2; k++) {
      const kx = Math.random() * S
      const ky = p * ph + ph * (0.3 + Math.random() * 0.4)
      for (let r = 4; r < 26; r += 4) {
        ctx.strokeStyle = `rgba(50,25,10,${0.35 - r / 100})`
        ctx.beginPath()
        ctx.ellipse(kx, ky, r * 2.2, r * 0.8, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.fillStyle = 'rgba(25,12,5,0.75)'
    ctx.fillRect(0, p * ph, S, 3)
  }
  // Worn patches and kopi ring stains.
  for (let i = 0; i < 14; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 120)
    g.addColorStop(0, 'rgba(255,220,170,0.12)')
    g.addColorStop(1, 'rgba(255,220,170,0)')
    ctx.save()
    ctx.translate(Math.random() * S, Math.random() * S)
    ctx.fillStyle = g
    ctx.fillRect(-120, -120, 240, 240)
    ctx.restore()
  }
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(60,30,10,${0.18 + Math.random() * 0.15})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(Math.random() * S, Math.random() * S, 26 + Math.random() * 10, 0, Math.PI * (1.4 + Math.random() * 0.6))
    ctx.stroke()
  }
  speckle(ctx, S, S, 9000, 0.12)
  const t = toTexture(c, true)
  t.repeat.set(1.4, 1)
  return t
}

export function makeCoinFace(): THREE.Texture {
  const S = 256
  const [c, ctx] = canvas(S, S)
  const g = ctx.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S / 2)
  g.addColorStop(0, '#FFE7A0')
  g.addColorStop(0.55, '#D9A441')
  g.addColorStop(1, '#8A5A1C')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  ctx.lineWidth = 10
  ctx.strokeStyle = '#B07A2A'
  circle(ctx, S / 2, S / 2, S / 2 - 12, 'rgba(0,0,0,0)', '#9C6A22')
  ctx.lineWidth = 3
  circle(ctx, S / 2, S / 2, S / 2 - 30, 'rgba(0,0,0,0)', '#FFE7A0')
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    circle(ctx, S / 2 + Math.cos(a) * (S / 2 - 21), S / 2 + Math.sin(a) * (S / 2 - 21), 3, '#7A4E16')
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `128px ${DISPLAY}`
  ctx.fillStyle = '#6E4512'
  ctx.fillText('1', S / 2 + 4, S / 2 + 10)
  ctx.fillStyle = '#FFE9A8'
  ctx.fillText('1', S / 2 - 2, S / 2 + 4)
  ctx.font = `700 22px ${SERIF}`
  ctx.fillStyle = '#6E4512'
  ctx.fillText('DUIT', S / 2, S / 2 + 74)
  return toTexture(c)
}

export function makePlateTexture(): THREE.Texture {
  const S = 512
  const [c, ctx] = canvas(S, S)
  ctx.fillStyle = '#F7F4EC'
  ctx.fillRect(0, 0, S, S)
  const cx = S / 2
  ctx.lineWidth = 18
  circle(ctx, cx, cx, S / 2 - 10, 'rgba(0,0,0,0)', '#2F5FA8')
  ctx.lineWidth = 3
  circle(ctx, cx, cx, S / 2 - 64, 'rgba(0,0,0,0)', '#2F5FA8')
  // Floral rim: red blooms with green leaves.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const x = cx + Math.cos(a) * (S / 2 - 40)
    const y = cx + Math.sin(a) * (S / 2 - 40)
    for (const s of [-1, 1]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a + s * 0.9)
      ellipse(ctx, 0, -16, 6, 14, '#3E8E4A')
      ctx.restore()
    }
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2
      circle(ctx, x + Math.cos(pa) * 9, y + Math.sin(pa) * 9, 8, i % 2 ? '#D7362B' : '#E86A9A')
    }
    circle(ctx, x, y, 5, '#F4B42A')
  }
  // Enamel chips.
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2
    circle(ctx, cx + Math.cos(a) * (S / 2 - 8), cx + Math.sin(a) * (S / 2 - 8), 3 + Math.random() * 5, '#2A2320')
  }
  speckle(ctx, S, S, 1500, 0.05)
  return toTexture(c)
}

export function makeStampFace(): THREE.Texture {
  const S = 256
  const [c, ctx] = canvas(S, S)
  ctx.fillStyle = '#C8352B'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = '#FBF3DF'
  ctx.lineWidth = 8
  ctx.strokeRect(14, 14, S - 28, S - 28)
  ctx.fillStyle = '#FBF3DF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `46px ${DISPLAY}`
  ctx.fillText('CILOK', S / 2, S / 2 - 34)
  ctx.font = `30px ${DISPLAY}`
  ctx.fillText('&', S / 2, S / 2 + 4)
  ctx.font = `46px ${DISPLAY}`
  ctx.fillText('JUAL', S / 2, S / 2 + 44)
  return toTexture(c)
}

export function makeAwning(colors: [string, string]): THREE.Texture {
  const [c, ctx] = canvas(256, 64)
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[i % 2]
    ctx.fillRect(i * 32, 0, 32, 64)
  }
  return toTexture(c)
}

export function makeSign(text: string, bg: string, fg: string): THREE.Texture {
  const [c, ctx] = canvas(512, 128)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = fg
  ctx.lineWidth = 6
  ctx.strokeRect(8, 8, 496, 112)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `60px ${DISPLAY}`
  ctx.shadowColor = fg
  ctx.shadowBlur = 18
  ctx.fillText(text, 256, 68)
  return toTexture(c)
}

export function makeSoftSprite(ring = false): THREE.Texture {
  const S = 128
  const [c, ctx] = canvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  if (ring) {
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.75, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.9, 'rgba(255,255,255,0.95)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  return t
}

/** A rounded-rectangle plane with UVs spanning 0..1. */
export function roundedRectGeometry(w: number, h: number, r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const geo = new THREE.ShapeGeometry(s, 6)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h)
  uv.needsUpdate = true
  return geo
}
