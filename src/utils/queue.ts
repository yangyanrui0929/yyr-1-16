import type { Customer, WaitingCustomer, Story, Renovation, QueueConfig, LimitStrategy, Weather } from '@/types'
import { CUSTOMER_TEMPLATES } from '@/data/customers'
import { getLimitMultiplier } from './crowd'

export function calculateQueueCapacity(renovations: Renovation[]): number {
  const baseCapacity = 5
  const bonus = renovations.reduce((sum, r) => sum + (r.bonusQueueCapacity * r.level), 0)
  return baseCapacity + bonus
}

export function calculateStandingCapacity(renovations: Renovation[]): number {
  const standingPermit = renovations.find(r => r.id === 'standing_permit')
  if (!standingPermit || standingPermit.level <= 1) return 0

  const baseCapacity = (standingPermit.level - 1) * 4
  const bonus = renovations.reduce((sum, r) => sum + (r.bonusStandingCapacity * r.level), 0)
  return baseCapacity + bonus
}

export function calculateExpectedCustomers(
  reputation: number,
  story: Story | null,
  weather: Weather,
  limitStrategy: LimitStrategy
): number {
  let baseCount = 6

  if (weather === '雨') baseCount = Math.max(2, baseCount - 3)
  if (weather === '雪') baseCount = Math.max(2, baseCount - 4)
  if (weather === '云') baseCount = Math.max(3, baseCount - 1)

  if (reputation > 50) baseCount += 2
  if (reputation > 80) baseCount += 3
  if (reputation > 90) baseCount += 2

  if (story) {
    const heatBonus = Math.floor(story.heat / 25)
    baseCount += heatBonus
  }

  const multiplier = getLimitMultiplier(limitStrategy)
  return Math.max(3, Math.floor(baseCount * multiplier))
}

export function generateWaitingCustomers(count: number): WaitingCustomer[] {
  const result: WaitingCustomer[] = []
  for (let i = 0; i < count; i++) {
    const tpl = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)]
    result.push({
      id: `w-${Date.now()}-${i}`,
      type: tpl.type,
      name: `${tpl.name}${['甲', '乙', '丙', '丁', '戊', '己'][i % 6]}`,
      preferenceTags: [...tpl.preferenceTags],
      generosity: tpl.generosity + Math.floor(Math.random() * 2) - 1,
      patience: tpl.patience + Math.floor(Math.random() * 2) - 1,
      wealth: tpl.baseWealth + Math.floor(Math.random() * tpl.baseWealth * 0.5),
      socialInfluence: tpl.socialInfluence,
      satisfaction: 50,
      waitTime: 0,
      emoji: tpl.emoji,
    })
  }
  return result
}

export function convertWaitingToCustomer(waiting: WaitingCustomer, isStanding: boolean = false): Customer {
  return {
    ...waiting,
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    seatId: null,
    isStanding,
    waitTime: waiting.waitTime,
  }
}

export function processQueueArrival(
  expectedCustomers: number,
  seatedCapacity: number,
  queueConfig: QueueConfig
): { seated: number; standing: number; waiting: number; turnedAway: number } {
  const { standingCapacity, capacity: queueCapacity, standingTicketEnabled } = queueConfig

  let remaining = expectedCustomers
  const seated = Math.min(remaining, seatedCapacity)
  remaining -= seated

  let standing = 0
  if (standingTicketEnabled && standingCapacity > 0) {
    standing = Math.min(remaining, standingCapacity)
    remaining -= standing
  }

  const waiting = Math.min(remaining, queueCapacity)
  remaining -= waiting

  const turnedAway = remaining

  return { seated, standing, waiting, turnedAway }
}

export function updateWaitingCustomers(waiting: WaitingCustomer[]): {
  waiting: WaitingCustomer[]
  impatient: WaitingCustomer[]
} {
  const updated: WaitingCustomer[] = []
  const impatient: WaitingCustomer[] = []

  for (const customer of waiting) {
    const newWaitTime = customer.waitTime + 1
    const patienceThreshold = 10 - customer.patience

    if (newWaitTime >= patienceThreshold && Math.random() < 0.3) {
      impatient.push({
        ...customer,
        waitTime: newWaitTime,
        satisfaction: Math.max(0, customer.satisfaction - 15),
      })
    } else {
      let satDelta = -2
      if (newWaitTime > 5) satDelta -= 1
      if (newWaitTime > 8) satDelta -= 2

      updated.push({
        ...customer,
        waitTime: newWaitTime,
        satisfaction: Math.max(0, customer.satisfaction + satDelta),
      })
    }
  }

  return { waiting: updated, impatient }
}

export function initQueueConfig(renovations: Renovation[]): QueueConfig {
  return {
    capacity: calculateQueueCapacity(renovations),
    standingCapacity: calculateStandingCapacity(renovations),
    benchCount: renovations.find(r => r.id === 'benches')?.level || 1,
    standingTicketEnabled: (renovations.find(r => r.id === 'standing_permit')?.level || 1) > 1,
    standingTicketPrice: 3,
    limitStrategy: 'none',
    crowdLevel: 0,
  }
}

export function updateQueueConfig(
  current: QueueConfig,
  renovations: Renovation[]
): QueueConfig {
  return {
    ...current,
    capacity: calculateQueueCapacity(renovations),
    standingCapacity: calculateStandingCapacity(renovations),
    benchCount: renovations.find(r => r.id === 'benches')?.level || 1,
    standingTicketEnabled: (renovations.find(r => r.id === 'standing_permit')?.level || 1) > 1,
  }
}
