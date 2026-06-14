import type {
  Customer,
  Story,
  StoryBranch,
  Seat,
  Renovation,
  StoryRecord,
  SettlementResult,
  Snack,
  WaitingCustomer,
  QueueConfig,
} from '@/types'
import { calcAvgTasteMatch } from './tasteMatch'
import { calcAvgSeatView } from './seatView'
import { calcStoryHeat } from './storyHeat'
import { calcSerialExpect } from './serialExpect'
import { calcBadReview, calcBadReviewGold } from './badReview'
import { SEAT_PRICE_MULTIPLIER } from '@/data/seats'
import {
  calcCrowdLevel,
  calcCrowdEffects,
  calcNoiseComplaintPenalty,
  calcEavesdropPenalty,
  calcBadReviewSpread,
} from './crowd'

export function calcSettlement(
  day: number,
  story: Story,
  branch: StoryBranch,
  customers: Customer[],
  waitingCustomers: WaitingCustomer[],
  seats: Seat[],
  renovations: Renovation[],
  history: StoryRecord[],
  lastStoryDay: Record<string, number>,
  storyScores: Record<string, number[]>,
  reputation: number,
  snacks: Snack[],
  queueConfig: QueueConfig
): SettlementResult {
  const audience = customers.filter((c) => c.seatId !== null)
  const audienceCount = audience.length
  const standing = customers.filter((c) => c.isStanding)
  const standingCount = standing.length
  const waitingCount = waitingCustomers.length

  const totalPeople = audienceCount + standingCount + waitingCount
  const crowdLevelCalc = calcCrowdLevel(
    totalPeople,
    seats.length,
    queueConfig.standingCapacity,
    queueConfig.capacity
  )
  const crowdLevel = crowdLevelCalc.value
  const crowdEffects = calcCrowdEffects(crowdLevel, renovations, reputation)

  const taste = calcAvgTasteMatch(audience, branch)
  const view = calcAvgSeatView(seats, renovations)
  const heat = calcStoryHeat(story, branch, history, reputation)
  const expect = calcSerialExpect(story.id, day, lastStoryDay, storyScores)
  const badReview = calcBadReview(customers, reputation)

  let baseEarnings = 0
  for (const c of audience) {
    const seat = seats.find((s) => s.id === c.seatId)
    const seatMul = seat ? SEAT_PRICE_MULTIPLIER[seat.tier] : 1
    baseEarnings += Math.round(5 * seatMul)
  }

  const standingTicketRevenue = standing.length * queueConfig.standingTicketPrice

  const crowdIncomeBonus = crowdEffects.incomeBonus
  const noiseComplaintCalc = calcNoiseComplaintPenalty(crowdEffects.noiseComplaints, reputation)
  const eavesdropCalc = calcEavesdropPenalty(crowdEffects.eavesdropCount, customers)
  const badReviewSpreadCalc = calcBadReviewSpread(crowdEffects.badReviewSpread, customers, reputation)

  const noiseComplaintPenalty = noiseComplaintCalc.value
  const eavesdropPenalty = eavesdropCalc.value
  const badReviewSpreadPenalty = badReviewSpreadCalc.value

  const tasteMatchBonus = Math.round(baseEarnings * (taste.value / 100) * 0.8)
  const seatViewBonus = Math.round(baseEarnings * (view.value / 100) * 0.5)
  const storyHeatBonus = Math.round(baseEarnings * (heat.value / 100) * 0.7)
  const serialExpectBonus = Math.round(baseEarnings * (expect.value / 100) * 0.4)

  let tips = 0
  const allPayingCustomers = [...audience, ...standing]
  for (const c of allPayingCustomers) {
    const satFactor = c.satisfaction / 100
    const genFactor = c.generosity / 5
    const standingFactor = c.isStanding ? 0.5 : 1
    tips += Math.round(c.wealth * satFactor * genFactor * 0.15 * standingFactor)
  }

  const badReviewPenalty = calcBadReviewGold(customers)

  let snackRevenue = 0
  const consumedSnacks: Record<string, number> = {}
  for (const c of allPayingCustomers) {
    if (c.satisfaction > 50 && Math.random() < (c.isStanding ? 0.3 : 0.6)) {
      const available = snacks.filter((s) => s.stock > 0)
      if (available.length > 0) {
        const s = available[Math.floor(Math.random() * available.length)]
        snackRevenue += s.price - s.cost
        consumedSnacks[s.id] = (consumedSnacks[s.id] || 0) + 1
      }
    }
  }
  for (const [id, n] of Object.entries(consumedSnacks)) {
    const s = snacks.find((x) => x.id === id)
    if (s) s.stock = Math.max(0, s.stock - n)
  }

  const totalEarnings =
    baseEarnings +
    standingTicketRevenue +
    crowdIncomeBonus +
    tasteMatchBonus +
    seatViewBonus +
    storyHeatBonus +
    serialExpectBonus +
    tips +
    snackRevenue -
    noiseComplaintPenalty -
    eavesdropPenalty -
    badReviewSpreadPenalty -
    badReviewPenalty

  const allAffectedCustomers = [...customers, ...waitingCustomers]
  const avgSatisfaction =
    allAffectedCustomers.length > 0
      ? Math.round(allAffectedCustomers.reduce((s, c) => s + c.satisfaction, 0) / allAffectedCustomers.length)
      : 0

  const satisfactionDelta = Math.round((avgSatisfaction - 50) * 0.15)
  const heatDelta = Math.round((heat.value - 50) * 0.1)
  const badReviewDelta = -badReview.value
  const noiseDelta = -Math.round(crowdEffects.noiseComplaints * 0.5)
  const spreadDelta = -badReviewSpreadCalc.value
  const reputationDelta = satisfactionDelta + heatDelta + badReviewDelta + noiseDelta + spreadDelta

  return {
    day,
    audienceCount,
    standingCount,
    waitingCount,
    baseEarnings,
    standingTicketRevenue,
    crowdIncomeBonus,
    tasteMatchBonus,
    seatViewBonus,
    storyHeatBonus,
    serialExpectBonus,
    noiseComplaintPenalty,
    eavesdropPenalty,
    badReviewSpreadPenalty,
    badReviewPenalty,
    tips,
    snackRevenue,
    totalEarnings,
    reputationDelta,
    avgSatisfaction,
    crowdLevel,
  }
}
