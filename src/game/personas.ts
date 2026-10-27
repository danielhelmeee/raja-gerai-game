import type { PersonaId } from './types'

export interface Persona {
  id: PersonaId
  name: string
  stall: string
  accent: string
  lines: {
    jual: string[]
    big: string[]
    beaten: string[]
    pass: string[]
    last: string[]
    win: string[]
    lose: string[]
  }
}

const NONE = { jual: [], big: [], beaten: [], pass: [], last: [], win: [], lose: [] }

export const PERSONAS: Record<PersonaId, Persona> = {
  you: { id: 'you', name: 'You', stall: 'Gerai Anda', accent: '#00A859', lines: NONE },
  ahseng: {
    id: 'ahseng',
    name: 'Uncle Ah Seng',
    stall: 'Kedai Kopi Ah Seng',
    accent: '#3B6FB6',
    lines: {
      jual: ['Wah, steady lah!', 'Hot hot, come buy!', 'Uncle still got it!'],
      big: ['Huat ah! Big one!', 'Uncle special!'],
      beaten: ['Aiyo!', 'Eh, why like that?', 'Wah, so fierce ah?'],
      pass: ['Lalu, lalu.', 'Uncle rest a while.'],
      last: ['Last one, ah!', 'Uncle almost done!'],
      win: ['Kopi on the house!', 'Huat ah!'],
      lose: ['Aiyo, next round lah.'],
    },
  },
  lina: {
    id: 'lina',
    name: 'Kak Lina',
    stall: 'Nasi Lemak Kak Lina',
    accent: '#E2557A',
    lines: {
      jual: ['Sedap tak terkata!', 'Laku keras, adik!', 'Habis licin!'],
      big: ['Amboi, padu!', 'Set lengkap!'],
      beaten: ['Eh! Kurang asam!', 'Amboi, beraninya!', 'Alamak!'],
      pass: ['Lalu dulu.', 'Kak tunggu.'],
      last: ['Tinggal satu!', 'Kak dah nak habis!'],
      win: ['Alhamdulillah, laku!', 'Nasi lemak juara!'],
      lose: ['Takpe, esok ada lagi.'],
    },
  },
  mat: {
    id: 'mat',
    name: 'Abang Mat',
    stall: 'Roti Abang Mat',
    accent: '#F4B42A',
    lines: {
      jual: ['Mantap, bang!', 'Pap! Terbaik!', 'Roti panas, panas!'],
      big: ['Gempak gila!', 'Ambik kau!'],
      beaten: ['Woi!', 'Alamak, kena!', 'Ish, licik betul!'],
      pass: ['Lalu, bang.', 'Tak boleh lawan.'],
      last: ['Satu lagi, bang!', 'Nak menang dah!'],
      win: ['Abang Mat juara!', 'Gempak!'],
      lose: ['Rugi, rugi...'],
    },
  },
}

export const OPPONENT_ORDER: PersonaId[] = ['ahseng', 'lina', 'mat']

export const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
