import type { PersonaId } from './types'

export interface Persona {
  id: PersonaId
  name: string
  /** Shorter name for narrow screens. */
  short: string
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
  you: { id: 'you', name: 'You', short: 'You', stall: 'Gerai Anda', accent: '#00A859', lines: NONE },
  ahseng: {
    id: 'ahseng',
    name: 'Uncle Ah Seng',
    short: 'Ah Seng',
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
    short: 'Kak Lina',
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
    short: 'Abang Mat',
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
  ayan: {
    id: 'ayan',
    name: 'Ayan',
    short: 'Ayan',
    stall: 'Kek Batik Ayan',
    accent: '#3B7FD6',
    lines: {
      jual: ['Okay, jual!', 'Cun, kan?', 'Easy je ni.'],
      big: ['Boom! Terima kasih!', 'Hah, rasakan!'],
      beaten: ['Seriously?', 'Eh, sampai hati!', 'Alah, tak aci!'],
      pass: ['Pass dulu, okay.', 'Lalu, sayang.'],
      last: ['One more to go!', 'Dah nak habis, tau!'],
      win: ['Yay, menang!', 'Ayan the queen!'],
      lose: ['Takpe, round depan.'],
    },
  },
  pakdan: {
    id: 'pakdan',
    name: 'Pak Dan',
    short: 'Pak Dan',
    stall: 'Sate Pak Dan',
    accent: '#8E2A3E',
    lines: {
      jual: ['Hah, ambik ni.', 'Pak Dan jual!', 'Sate panas!'],
      big: ['Masya-Allah, cantik!', 'Ini baru betul!'],
      beaten: ['Ish, budak ni!', 'Hah? Biar betul!', 'Amboi, nakal!'],
      pass: ['Lalu, lalu.', 'Pak Dan rehat.'],
      last: ['Sikit lagi, nak!', 'Satu je lagi!'],
      win: ['Alhamdulillah!', 'Rezeki Pak Dan!'],
      lose: ['Sabar, sabar...'],
    },
  },
  meiling: {
    id: 'meiling',
    name: 'Auntie Mei Ling',
    short: 'Mei Ling',
    stall: 'Chee Cheong Fun Mei Ling',
    accent: '#C8355A',
    lines: {
      jual: ['Aiyah, take this!', 'Auntie sell first!', 'Very nice one, ah.'],
      big: ['Wah, so lucky!', 'Ho yeh!'],
      beaten: ['Aiyah! Mm hou gam!', 'Wah lau!', 'Siao ah you?'],
      pass: ['Pass, pass.', 'Auntie wait first.'],
      last: ['Last one, ah!', 'Auntie almost win!'],
      win: ['Auntie win! Ho yeh!', 'Lucky day!'],
      lose: ['Aiyah, never mind.'],
    },
  },
  anand: {
    id: 'anand',
    name: 'Anand',
    short: 'Anand',
    stall: 'Thosai Anand',
    accent: '#E07A1A',
    lines: {
      jual: ['Macha, take this!', 'Seri, seri!', 'Super, da!'],
      big: ['Aiyoyo, power!', 'Macha, see this!'],
      beaten: ['Aiyoyo!', 'Enna da ithu?', 'Macha, why like that?'],
      pass: ['Pass, macha.', 'Let it go, da.'],
      last: ['One more, macha!', 'Almost done, da!'],
      win: ['Champion, macha!', 'Super win!'],
      lose: ['Aiyo, next time da.'],
    },
  },
  kavitha: {
    id: 'kavitha',
    name: 'Aunty Kavitha',
    short: 'Kavitha',
    stall: 'Murukku Kavitha',
    accent: '#C2187A',
    lines: {
      jual: ['Romba nalla!', 'Here, kanna!', 'Aunty sells!'],
      big: ['Aiyo, so good!', 'Super, kanna!'],
      beaten: ['Aiyo, kanna!', 'Enna ithu?', 'So naughty, ah!'],
      pass: ['Pass, kanna.', 'Aunty will wait.'],
      last: ['Last one, kanna!', 'Almost finish!'],
      win: ['Romba santhosham!', 'Aunty wins!'],
      lose: ['Never mind, kanna.'],
    },
  },
  gurdev: {
    id: 'gurdev',
    name: 'Gurdev Singh',
    short: 'Gurdev',
    stall: 'Chapati Gurdev',
    accent: '#1F3F8A',
    lines: {
      jual: ['Balle balle!', 'Take this, friend!', 'Very good, ji!'],
      big: ['Chak de!', 'Oye, see this!'],
      beaten: ['Oye! Why like that?', 'Arre yaar!', 'Wah, very clever!'],
      pass: ['Pass, ji.', 'You go, friend.'],
      last: ['One more, ji!', 'Almost there!'],
      win: ['Balle balle! I win!', 'Chak de phatte!'],
      lose: ['Okay lah, next round.'],
    },
  },
  dayang: {
    id: 'dayang',
    name: 'Dayang',
    short: 'Dayang',
    stall: 'Kolo Mee Dayang',
    accent: '#B8862A',
    lines: {
      jual: ['Nyamai!', 'Ambik tok!', 'Bagus, kan?'],
      big: ['Agi idup agi ngelaban!', 'Mantap gilak!'],
      beaten: ['Adoi!', 'Kati tok?', 'Eh, sik patut!'],
      pass: ['Pass dolok.', 'Lalu gik.'],
      last: ['Sikit agik!', 'Satu agik!'],
      win: ['Nyamai! Menang!', 'Sarawak juara!'],
      lose: ['Sik apa, lain kali.'],
    },
  },
  joanne: {
    id: 'joanne',
    name: 'Joanne',
    short: 'Joanne',
    stall: 'Hinava Joanne',
    accent: '#2E9A6A',
    lines: {
      jual: ['Kotobian!', 'Ambil ni, bah!', 'Bagus bah!'],
      big: ['Aramaiti!', 'Mantap bah!'],
      beaten: ['Ish, kamurang ni!', 'Aduii!', 'Bah, kenapa?'],
      pass: ['Pass dulu, bah.', 'Lalu saja.'],
      last: ['Satu lagi, bah!', 'Mau habis sudah!'],
      win: ['Aramaiti! Menang!', 'Sabah juara, bah!'],
      lose: ['Bah, lain kali.'],
    },
  },
  robert: {
    id: 'robert',
    name: 'Uncle Robert',
    short: 'Robert',
    stall: 'Devil Curry Robert',
    accent: '#D6852E',
    lines: {
      jual: ['There you go, my dear!', 'Not bad, eh?', 'Uncle Robert sells!'],
      big: ['Ho ho! Jinggli Nona!', 'Bravo!'],
      beaten: ['Aiyo, my dear!', 'Ay, what is this?', 'Cheeky, cheeky!'],
      pass: ['I pass, my dear.', 'After you.'],
      last: ['Last one, eh!', 'Almost home!'],
      win: ['Bravo! Uncle wins!', 'Jinggli Nona!'],
      lose: ['Ay, next time.'],
    },
  },
  ahkow: {
    id: 'ahkow',
    name: 'Ah Kow',
    short: 'Ah Kow',
    stall: 'Char Kuey Teow Ah Kow',
    accent: '#4A8A3A',
    lines: {
      jual: ['Huat ah!', 'Steady, bro!', 'Take this one!'],
      big: ['Wah piang, power!', 'Gao gao!'],
      beaten: ['Wah piang!', 'Simi lai eh?', 'Walao, bro!'],
      pass: ['Paiseh, pass.', 'Pass, bro.'],
      last: ['Last card, bro!', 'Ah Kow almost win!'],
      win: ['Huat ah! Win liao!', 'Ah Kow champion!'],
      lose: ['Sui liao...'],
    },
  },
  sweelian: {
    id: 'sweelian',
    name: 'Swee Lian',
    short: 'Swee Lian',
    stall: 'Kuih Nyonya Swee Lian',
    accent: '#C24E9A',
    lines: {
      jual: ['Nah, ambik!', 'Sedap, ah?', 'Swee Lian jual!'],
      big: ['Aiyo, cantik sekali!', 'Wah, ini baru betul!'],
      beaten: ['Aiyo, nakal!', 'Apa ini, ah?', 'Ish, kurang ajar!'],
      pass: ['Pass dulu, ah.', 'Swee Lian tunggu.'],
      last: ['Satu lagi, ah!', 'Mau habis sudah!'],
      win: ['Swee Lian menang!', 'Aiyo, syok!'],
      lose: ['Takpa, lain kali.'],
    },
  },
  mamakali: {
    id: 'mamakali',
    name: 'Mamak Ali',
    short: 'Mamak Ali',
    stall: 'Mamak Ali',
    accent: '#2A7A8A',
    lines: {
      jual: ['Boss, ambik!', 'Satu, siap!', 'Teh tarik kurang manis!'],
      big: ['Boss, power punya!', 'Mantap, boss!'],
      beaten: ['Aiyo, boss!', 'Apa ini, boss?', 'Wah, kasi chance la!'],
      pass: ['Lalu, boss.', 'Boss dulu.'],
      last: ['Satu lagi, boss!', 'Tapau sudah!'],
      win: ['Boss, saya menang!', 'Mamak juara!'],
      lose: ['Takpa boss, esok.'],
    },
  },
}

export const ALL_OPPONENTS = (Object.keys(PERSONAS) as PersonaId[]).filter((id) => id !== 'you')
/** The tutorial's lineup, which its script refers to by name. */
export const TUTORIAL_OPPONENTS: PersonaId[] = ['ahseng', 'lina', 'mat']

export function randomLineup(): PersonaId[] {
  const pool = [...ALL_OPPONENTS]
  const out: PersonaId[] = []
  while (out.length < 3) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  return out
}

export const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
