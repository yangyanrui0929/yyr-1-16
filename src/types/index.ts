export type Phase = 'day' | 'night'

export type Weather = '晴' | '云' | '雨' | '雪'

export type SnackCategory = '茶' | '小吃' | '点心'

export interface Snack {
  id: string
  name: string
  category: SnackCategory
  stock: number
  maxStock: number
  price: number
  cost: number
  quality: number
  emoji: string
}

export type SeatTier = '普通' | '雅座' | '贵宾'

export interface Seat {
  id: number
  x: number
  y: number
  tier: SeatTier
  occupied: boolean
}

export interface Renovation {
  id: string
  name: string
  level: number
  maxLevel: number
  baseCost: number
  bonusReputation: number
  bonusComfort: number
  bonusQueueCapacity: number
  bonusStandingCapacity: number
  description: string
  emoji: string
}

export interface StoryBranch {
  id: string
  title: string
  content: string
  tags: string[]
  heatModifier: number
}

export interface Story {
  id: string
  title: string
  tags: string[]
  heat: number
  branches: StoryBranch[]
  summary: string
}

export type CustomerType = '书生' | '商贾' | '妇人' | '江湖人' | '官员' | '平民'

export interface CustomerTemplate {
  type: CustomerType
  name: string
  preferenceTags: string[]
  generosity: number
  patience: number
  baseWealth: number
  socialInfluence: number
  emoji: string
}

export interface Customer {
  id: string
  type: CustomerType
  name: string
  preferenceTags: string[]
  generosity: number
  patience: number
  wealth: number
  socialInfluence: number
  seatId: number | null
  isStanding: boolean
  satisfaction: number
  waitTime: number
  emoji: string
}

export interface WaitingCustomer {
  id: string
  type: CustomerType
  name: string
  preferenceTags: string[]
  generosity: number
  patience: number
  wealth: number
  socialInfluence: number
  satisfaction: number
  waitTime: number
  emoji: string
}

export type LimitStrategy = 'none' | 'moderate' | 'strict'

export interface CrowdEffects {
  incomeBonus: number
  noiseComplaints: number
  eavesdropCount: number
  badReviewSpread: number
}

export interface QueueConfig {
  capacity: number
  standingCapacity: number
  benchCount: number
  standingTicketEnabled: boolean
  standingTicketPrice: number
  limitStrategy: LimitStrategy
  crowdLevel: number
}

export interface CrowdEvent {
  id: string
  type: 'noise' | 'eavesdrop' | 'bad_review'
  content: string
  effect: number
}

export interface InterruptionOption {
  text: string
  satisfactionEffect: number
  reputationEffect: number
  goldEffect: number
}

export interface InterruptionEvent {
  id: string
  customerType: CustomerType
  content: string
  options: InterruptionOption[]
}

export type LedgerType = '收入' | '支出'

export interface LedgerRecord {
  day: number
  id: string
  type: LedgerType
  category: string
  amount: number
  note: string
  timestamp: number
}

export interface StoryRecord {
  day: number
  storyId: string
  branchId: string
  audienceCount: number
  earnings: number
  avgSatisfaction: number
}

export interface ReputationHistory {
  day: number
  value: number
  delta: number
  reason: string
}

export interface GameState {
  day: number
  phase: Phase
  gold: number
  reputation: number
  weather: Weather
  snacks: Snack[]
  seats: Seat[]
  renovations: Renovation[]
  customers: Customer[]
  waitingCustomers: WaitingCustomer[]
  queueConfig: QueueConfig
  crowdEvents: CrowdEvent[]
  currentCrowdEvent: CrowdEvent | null
  currentStory: Story | null
  currentBranch: StoryBranch | null
  storyProgress: number
  availableStories: Story[]
  interruptions: InterruptionEvent[]
  currentInterruption: InterruptionEvent | null
  performanceActive: boolean
  ledger: LedgerRecord[]
  storyHistory: StoryRecord[]
  reputationHistory: ReputationHistory[]
  lastStoryDay: Record<string, number>
  storyScores: Record<string, number[]>
  isSettlement: boolean
  lastSettlement: SettlementResult | null
}

export interface SettlementResult {
  day: number
  audienceCount: number
  standingCount: number
  waitingCount: number
  baseEarnings: number
  standingTicketRevenue: number
  crowdIncomeBonus: number
  tasteMatchBonus: number
  seatViewBonus: number
  storyHeatBonus: number
  serialExpectBonus: number
  noiseComplaintPenalty: number
  eavesdropPenalty: number
  badReviewSpreadPenalty: number
  badReviewPenalty: number
  tips: number
  snackRevenue: number
  totalEarnings: number
  reputationDelta: number
  avgSatisfaction: number
  crowdLevel: number
}

export interface CalcResult {
  value: number
  details: Record<string, number>
}
