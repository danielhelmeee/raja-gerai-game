import { shapeName } from './rules'
import type { GameEvent, Player } from './types'

export type Tone = 'jual' | 'cilok' | 'pass' | 'collect' | 'pusing' | 'round' | 'info'

const who = (players: Player[], id: number) => (players[id]?.isHuman ? 'You' : players[id]?.name ?? '?')
const whose = (players: Player[], id: number) => (players[id]?.isHuman ? 'your' : `${players[id]?.name}'s`)

/** The telemetry banner line for an event. */
export function describe(event: GameEvent, players: Player[]): { text: string; tone: Tone } | null {
  switch (event.type) {
    case 'deal':
      return { text: `Round ${event.round}: ${who(players, event.starter)} open${players[event.starter]?.isHuman ? '' : 's'} the first Gerai`, tone: 'round' }
    case 'jual': {
      const verb = event.beat === null ? 'opened the Gerai with' : 'JUAL-ed'
      const tail = event.beat !== null ? `, beating ${whose(players, event.beat)} Gerai` : ''
      return { text: `${who(players, event.actor)} ${verb} ${shapeName(event.shape, event.cards)}${tail}!`, tone: 'jual' }
    }
    case 'cilok': {
      const side = event.stamp ? ' with the CILOK & JUAL stamp' : ''
      return {
        text: `${who(players, event.actor)} CILOK-ed the ${event.card.value} (${event.card.dish}) from ${whose(players, event.target)} Gerai${side}! +1 DUIT to ${who(players, event.target)}`,
        tone: 'cilok',
      }
    }
    case 'pass':
      return { text: `${who(players, event.actor)} ${players[event.actor]?.isHuman ? 'say' : 'says'} LALU`, tone: 'pass' }
    case 'collect':
      return { text: `${who(players, event.actor)} collect${players[event.actor]?.isHuman ? '' : 's'} ${event.count} dishes as HABUAN`, tone: 'collect' }
    case 'roundEnd':
      return { text: `${who(players, event.winner)} cleared the stall! Round over`, tone: 'round' }
    case 'gameOver':
      return { text: `${who(players, event.winner)} ${players[event.winner]?.isHuman ? 'are' : 'is'} Raja Pasar Malam!`, tone: 'round' }
  }
}
