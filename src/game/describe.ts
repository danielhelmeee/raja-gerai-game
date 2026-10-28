import { shapeName } from './rules'
import type { GameEvent, Player } from './types'

export type Tone = 'jual' | 'big' | 'pass' | 'clear' | 'round' | 'alert' | 'info'

const who = (players: Player[], id: number) => (players[id]?.isHuman ? 'You' : players[id]?.name ?? '?')
const whose = (players: Player[], id: number) => (players[id]?.isHuman ? 'your' : `${players[id]?.name}'s`)
const s = (players: Player[], id: number, verb: string) => `${who(players, id)} ${verb}${players[id]?.isHuman ? '' : 's'}`

/** The telemetry banner line for an event. */
export function describe(event: GameEvent, players: Player[]): { text: string; tone: Tone } | null {
  switch (event.type) {
    case 'deal':
      return { text: `Round ${event.round}: ${s(players, event.starter, 'open')} the first Gerai`, tone: 'round' }
    case 'jual': {
      const name = shapeName(event.shape)
      const big = event.shape.kind === 'five'
      if (event.beat === null) return { text: `${s(players, event.actor, 'open')} with ${name}${big ? '!' : ''}`, tone: big ? 'big' : 'jual' }
      return { text: `${who(players, event.actor)} JUAL ${name}, beating ${whose(players, event.beat)} Gerai!`, tone: big ? 'big' : 'jual' }
    }
    case 'pass':
      return { text: `${s(players, event.actor, 'say')} LALU`, tone: 'pass' }
    case 'clear':
      return { text: `Everyone passed: ${s(players, event.actor, 'win')} the Gerai and ${players[event.actor]?.isHuman ? 'lead' : 'leads'} again`, tone: 'clear' }
    case 'roundEnd': {
      const pot = event.payouts.reduce((t, p) => t + p.amount, 0)
      return { text: `${who(players, event.winner)} cleared the stall! +${pot} DUIT`, tone: 'round' }
    }
    case 'gameOver':
      return { text: `${who(players, event.winner)} ${players[event.winner]?.isHuman ? 'are' : 'is'} Raja Gerai!`, tone: 'round' }
  }
}
