import type { PersonaId } from './types'

export interface Persona {
  id: PersonaId
  name: string
  stall: string
  skin: string
  shirt: string
  apron: string
  accent: string
  lines: {
    jual: string[]
    stolen: string[]
    cilok: string[]
    pass: string[]
    win: string[]
    lose: string[]
  }
}

export const PERSONAS: Record<PersonaId, Persona> = {
  you: {
    id: 'you',
    name: 'You',
    stall: 'Gerai Anda',
    skin: '#C68B59',
    shirt: '#00A859',
    apron: '#FBF6EA',
    accent: '#00A859',
    lines: { jual: [], stolen: [], cilok: [], pass: [], win: [], lose: [] },
  },
  ahseng: {
    id: 'ahseng',
    name: 'Uncle Ah Seng',
    stall: 'Kopitiam Ah Seng',
    skin: '#E8C095',
    shirt: '#F2EFE6',
    apron: '#3B6FB6',
    accent: '#3B6FB6',
    lines: {
      jual: ['Wah, steady lah!', 'Hot hot, come buy!', 'Uncle still got it!'],
      stolen: ['Aiyo! My dish!', 'Eh eh eh, why like that?', 'Wah, you cilok me ah?'],
      cilok: ['Uncle borrow first ya.', 'Heh, thank you!'],
      pass: ['Lalu, lalu.', 'Uncle rest a while.'],
      win: ['Kopi on the house!', 'Huat ah!'],
      lose: ['Aiyo, next round lah.'],
    },
  },
  lina: {
    id: 'lina',
    name: 'Kak Lina',
    stall: 'Nasi Lemak Kak Lina',
    skin: '#D9A273',
    shirt: '#E2557A',
    apron: '#FFE9A8',
    accent: '#E2557A',
    lines: {
      jual: ['Sedap tak terkata!', 'Laku keras, adik!', 'Habis licin!'],
      stolen: ['Eh! Kurang asam!', 'Siapa cilok tu?!', 'Amboi, beraninya!'],
      cilok: ['Kak pinjam sekejap ye.', 'Hehe, rezeki!'],
      pass: ['Lalu dulu.', 'Kak tunggu.'],
      win: ['Alhamdulillah, laku!', 'Nasi lemak juara!'],
      lose: ['Takpe, esok ada lagi.'],
    },
  },
  mat: {
    id: 'mat',
    name: 'Abang Mat',
    stall: 'Roti Abang Mat',
    skin: '#B97A4E',
    shirt: '#7A3E9D',
    apron: '#F4B42A',
    accent: '#F4B42A',
    lines: {
      jual: ['Mantap, bang!', 'Pap! Terbaik!', 'Roti panas, panas!'],
      stolen: ['Woi! Pulangkan!', 'Alamak, kena cilok!', 'Ish, licik betul!'],
      cilok: ['Abang ambil sikit.', 'Cilok sikit je!'],
      pass: ['Lalu, bang.', 'Tak boleh lawan.'],
      win: ['Abang Mat juara!', 'Gempak!'],
      lose: ['Rugi, rugi...'],
    },
  },
}

export const OPPONENT_ORDER: PersonaId[] = ['ahseng', 'lina', 'mat']

export const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
