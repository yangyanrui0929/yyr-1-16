import type { Customer, WaitingCustomer, Renovation, CalcResult, CrowdEffects, LimitStrategy } from '@/types'

export function calcCrowdLevel(
  totalCustomers: number,
  seatCount: number,
  standingCount: number,
  queueCapacity: number
): CalcResult {
  const details: Record<string, number> = {}

  const maxCapacity = seatCount + standingCount + queueCapacity
  const crowdRatio = totalCustomers / Math.max(1, maxCapacity)
  details['总客人数'] = totalCustomers
  details['最大容量'] = maxCapacity
  details['拥挤比例'] = Math.round(crowdRatio * 100)

  let crowdLevel = 0
  if (crowdRatio > 1.5) crowdLevel = 5
  else if (crowdRatio > 1.2) crowdLevel = 4
  else if (crowdRatio > 1.0) crowdLevel = 3
  else if (crowdRatio > 0.8) crowdLevel = 2
  else if (crowdRatio > 0.5) crowdLevel = 1

  details['拥挤等级'] = crowdLevel
  return { value: crowdLevel, details }
}

export function calcCrowdEffects(
  crowdLevel: number,
  renovations: Renovation[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _reputation: number
): CrowdEffects {
  const soundproofLevel = renovations.find(r => r.id === 'soundproof')?.level || 1
  const soundproofReduction = (soundproofLevel - 1) * 0.15

  const incomeBonus = crowdLevel * 8
  const noiseComplaints = Math.max(0, Math.round(crowdLevel * 1.5 * (1 - soundproofReduction)))
  const eavesdropCount = Math.max(0, Math.round(crowdLevel * 0.8 * (1 - soundproofReduction)))
  const badReviewSpread = Math.max(0, crowdLevel - 1)

  return {
    incomeBonus,
    noiseComplaints,
    eavesdropCount,
    badReviewSpread,
  }
}

export function calcNoiseComplaintPenalty(
  complaints: number,
  reputation: number
): CalcResult {
  const details: Record<string, number> = {}
  details['投诉次数'] = complaints

  const basePenalty = complaints * 15
  const repMitigation = Math.round(reputation * 0.1)
  details['基础罚金'] = basePenalty
  details['声望减免'] = -repMitigation

  const value = Math.max(0, basePenalty - repMitigation)
  details['最终罚金'] = value

  return { value, details }
}

export function calcEavesdropPenalty(
  eavesdrops: number,
  customers: Customer[]
): CalcResult {
  const details: Record<string, number> = {}
  details['偷听次数'] = eavesdrops

  const seated = customers.filter(c => c.seatId !== null)
  const avgSatisfaction = seated.length > 0
    ? seated.reduce((s, c) => s + c.satisfaction, 0) / seated.length
    : 50

  const satisfactionLoss = eavesdrops * 5
  const goldLoss = Math.round(eavesdrops * avgSatisfaction * 0.1)

  details['满意度损失'] = satisfactionLoss
  details['收入损失'] = goldLoss
  details['最终损失'] = goldLoss

  return { value: goldLoss, details }
}

export function calcBadReviewSpread(
  spreadLevel: number,
  customers: Customer[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _reputation: number
): CalcResult {
  const details: Record<string, number> = {}
  details['扩散等级'] = spreadLevel

  const unsatisfied = customers.filter(c => c.satisfaction < 40)
  const spreadMultiplier = 1 + spreadLevel * 0.2
  const baseRepLoss = unsatisfied.length * spreadLevel * 2
  const repLoss = Math.round(baseRepLoss * spreadMultiplier)

  details['不满人数'] = unsatisfied.length
  details['扩散系数'] = Math.round(spreadMultiplier * 100)
  details['声望损失'] = repLoss

  return { value: repLoss, details }
}

export function applyCrowdSatisfactionEffects(
  customers: Customer[],
  waitingCustomers: WaitingCustomer[],
  crowdLevel: number
): { customers: Customer[]; waitingCustomers: WaitingCustomer[] } {
  const crowdPenalty = crowdLevel * 3

  const updatedCustomers = customers.map(c => {
    let satDelta = -crowdPenalty
    if (c.isStanding) satDelta -= 5
    return {
      ...c,
      satisfaction: Math.max(0, Math.min(100, c.satisfaction + satDelta)),
    }
  })

  const updatedWaiting = waitingCustomers.map(c => {
    const waitPenalty = Math.floor(c.waitTime / 3)
    return {
      ...c,
      satisfaction: Math.max(0, Math.min(100, c.satisfaction - crowdPenalty - waitPenalty)),
    }
  })

  return { customers: updatedCustomers, waitingCustomers: updatedWaiting }
}

export function getLimitMultiplier(strategy: LimitStrategy): number {
  switch (strategy) {
    case 'strict': return 0.6
    case 'moderate': return 0.8
    case 'none':
    default: return 1.0
  }
}

export function getCrowdLevelDescription(level: number): string {
  const descriptions = [
    '门可罗雀',
    '三三两两',
    '座无虚席',
    '人头攒动',
    '水泄不通',
    '摩肩接踵',
  ]
  return descriptions[Math.min(level, descriptions.length - 1)]
}
