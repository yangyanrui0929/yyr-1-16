import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameState,
  Weather,
  Seat,
  Customer,
  Story,
  InterruptionOption,
  LedgerRecord,
  StoryRecord,
  ReputationHistory,
  LimitStrategy,
  CrowdEvent,
} from '@/types'
import { STORIES } from '@/data/stories'
import { initSnacks } from '@/data/snacks'
import { initSeats } from '@/data/seats'
import { initRenovations, getUpgradeCost } from '@/data/renovations'
import { INTERRUPTIONS } from '@/data/interruptions'
import { generateRandomCustomers } from '@/data/customers'
import { calcSettlement } from '@/utils/settlement'
import {
  initQueueConfig,
  updateQueueConfig,
  calculateExpectedCustomers,
  generateWaitingCustomers,
  processQueueArrival,
  convertWaitingToCustomer,
  updateWaitingCustomers,
} from '@/utils/queue'
import {
  applyCrowdSatisfactionEffects,
  calcCrowdLevel,
} from '@/utils/crowd'
import { getRandomCrowdEvent } from '@/data/crowdEvents'

const WEATHERS: Weather[] = ['晴', '晴', '晴', '云', '云', '雨', '雪']

function randomWeather(): Weather {
  return WEATHERS[Math.floor(Math.random() * WEATHERS.length)]
}

function pickRandomStories(count: number): Story[] {
  const pool = [...STORIES]
  const result: Story[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

function uid(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const initRenovationsData = initRenovations()

const initialState: GameState = {
  day: 1,
  phase: 'day',
  gold: 200,
  reputation: 30,
  weather: '晴',
  snacks: initSnacks(),
  seats: initSeats(),
  renovations: initRenovationsData,
  customers: [],
  waitingCustomers: [],
  queueConfig: initQueueConfig(initRenovationsData),
  crowdEvents: [],
  currentCrowdEvent: null,
  currentStory: null,
  currentBranch: null,
  storyProgress: 0,
  availableStories: [],
  interruptions: INTERRUPTIONS,
  currentInterruption: null,
  performanceActive: false,
  ledger: [],
  storyHistory: [],
  reputationHistory: [],
  lastStoryDay: {},
  storyScores: {},
  isSettlement: false,
  lastSettlement: null,
}

interface GameActions {
  buySnack: (snackId: string, qty: number) => void
  moveSeat: (seatId: number, x: number, y: number) => void
  upgradeRenovation: (renoId: string) => void
  switchToNight: () => void
  selectStory: (storyId: string, branchId: string) => void
  startPerformance: () => void
  tickPerformance: () => void
  handleInterruption: (option: InterruptionOption) => void
  handleCrowdEvent: (dismiss: boolean) => void
  doSettlement: () => void
  nextDay: () => void
  resetGame: () => void
  setLimitStrategy: (strategy: LimitStrategy) => void
  setStandingTicketPrice: (price: number) => void
  addLedgerRecord: (type: LedgerRecord['type'], category: string, amount: number, note: string) => void
  admitWaitingCustomer: () => void
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      buySnack: (snackId: string, qty: number) => {
        const state = get()
        const snack = state.snacks.find((s) => s.id === snackId)
        if (!snack) return
        const totalCost = snack.cost * qty
        if (state.gold < totalCost) return
        const newStock = Math.min(snack.maxStock, snack.stock + qty)
        const actualQty = newStock - snack.stock
        if (actualQty <= 0) return
        const actualCost = snack.cost * actualQty

        set((s) => ({
          gold: s.gold - actualCost,
          snacks: s.snacks.map((x) =>
            x.id === snackId ? { ...x, stock: newStock } : x
          ),
        }))
        get().addLedgerRecord('支出', '茶点采购', actualCost, `采购${snack.name} x${actualQty}`)
      },

      moveSeat: (seatId: number, x: number, y: number) => {
        set((s) => ({
          seats: s.seats.map((seat) =>
            seat.id === seatId ? { ...seat, x, y } : seat
          ),
        }))
      },

      upgradeRenovation: (renoId: string) => {
        const state = get()
        const reno = state.renovations.find((r) => r.id === renoId)
        if (!reno || reno.level >= reno.maxLevel) return
        const cost = getUpgradeCost(reno)
        if (state.gold < cost) return

        const repGain = reno.bonusReputation
        const newRenovations = state.renovations.map((r) =>
          r.id === renoId ? { ...r, level: r.level + 1 } : r
        )
        const newQueueConfig = updateQueueConfig(state.queueConfig, newRenovations)

        set((s) => ({
          gold: s.gold - cost,
          reputation: Math.min(100, s.reputation + repGain),
          renovations: newRenovations,
          queueConfig: newQueueConfig,
          reputationHistory: [
            ...s.reputationHistory,
            {
              day: s.day,
              value: Math.min(100, s.reputation + repGain),
              delta: repGain,
              reason: `装修升级：${reno.name}`,
            },
          ],
        }))
        get().addLedgerRecord('支出', '装修升级', cost, `升级${reno.name}至${reno.level + 1}级`)
      },

      switchToNight: () => {
        const state = get()
        const { weather, reputation, seats, queueConfig } = state

        const availableStories = pickRandomStories(3)
        const expectedStory = availableStories.length > 0 ? availableStories[0] : null
        const expectedCustomers = calculateExpectedCustomers(
          reputation,
          expectedStory,
          weather,
          queueConfig.limitStrategy
        )

        const seatCount = seats.length
        const arrival = processQueueArrival(expectedCustomers, seatCount, queueConfig)

        const allSeats = [...seats].map((s) => ({ ...s, occupied: false }))
        const sortedSeats = [...allSeats].sort((a, b) => {
          const order: Record<Seat['tier'], number> = { 贵宾: 0, 雅座: 1, 普通: 2 }
          return order[a.tier] - order[b.tier]
        })

        const seatedCustomers = generateRandomCustomers(arrival.seated)
        for (let i = 0; i < Math.min(seatedCustomers.length, sortedSeats.length); i++) {
          const seat = sortedSeats[i]
          seatedCustomers[i].seatId = seat.id
          const idx = allSeats.findIndex((s) => s.id === seat.id)
          if (idx >= 0) allSeats[idx].occupied = true
        }

        const standingCustomers: Customer[] = []
        if (queueConfig.standingTicketEnabled && arrival.standing > 0) {
          const standing = generateRandomCustomers(arrival.standing)
          for (const c of standing) {
            c.isStanding = true
            standingCustomers.push(c)
          }
        }

        const customers = [...seatedCustomers, ...standingCustomers]
        const waitingCustomers = generateWaitingCustomers(arrival.waiting)

        const totalPeople = customers.length + waitingCustomers.length
        const crowdLevelCalc = calcCrowdLevel(
          totalPeople,
          seatCount,
          queueConfig.standingCapacity,
          queueConfig.capacity
        )
        const crowdEffects = applyCrowdSatisfactionEffects(
          customers,
          waitingCustomers,
          crowdLevelCalc.value
        )

        if (arrival.turnedAway > 0) {
          get().addLedgerRecord('支出', '客源流失', arrival.turnedAway * 5, `${arrival.turnedAway}位客人因满员离去`)
        }

        const newQueueConfig = {
          ...queueConfig,
          crowdLevel: crowdLevelCalc.value,
        }

        set({
          phase: 'night',
          customers: crowdEffects.customers,
          waitingCustomers: crowdEffects.waitingCustomers,
          seats: allSeats,
          queueConfig: newQueueConfig,
          crowdEvents: [],
          currentCrowdEvent: null,
          availableStories,
          currentStory: null,
          currentBranch: null,
          storyProgress: 0,
          performanceActive: false,
          currentInterruption: null,
        })
      },

      selectStory: (storyId: string, branchId: string) => {
        const state = get()
        const story = state.availableStories.find((s) => s.id === storyId)
        const branch = story?.branches.find((b) => b.id === branchId)
        if (!story || !branch) return
        set({ currentStory: story, currentBranch: branch, storyProgress: 0 })
      },

      startPerformance: () => {
        const state = get()
        if (!state.currentStory || !state.currentBranch) return
        set({ performanceActive: true, storyProgress: 0 })
      },

      tickPerformance: () => {
        const state = get()
        if (!state.performanceActive) return

        const newProgress = Math.min(100, state.storyProgress + 4)

        if (!state.currentInterruption && !state.currentCrowdEvent) {
          if (Math.random() < 0.18 && state.storyProgress > 10 && state.storyProgress < 90) {
            const seatedCustomers = state.customers.filter((c) => c.seatId !== null)
            if (seatedCustomers.length > 0) {
              const c = seatedCustomers[Math.floor(Math.random() * seatedCustomers.length)]
              const matching = state.interruptions.filter((i) => i.customerType === c.type)
              const pool = matching.length > 0 ? matching : state.interruptions
              const ev = pool[Math.floor(Math.random() * pool.length)]
              set({ currentInterruption: ev, storyProgress: newProgress })
              return
            }
          }

          const crowdEvent = getRandomCrowdEvent(state.queueConfig.crowdLevel)
          if (crowdEvent) {
            const ev: CrowdEvent = {
              ...crowdEvent,
              id: `ce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            }
            set({ currentCrowdEvent: ev, storyProgress: newProgress })
            return
          }
        }

        const { waiting: updatedWaiting, impatient } = updateWaitingCustomers(state.waitingCustomers)
        let customers = [...state.customers]

        if (impatient.length > 0) {
          for (const c of impatient) {
            const loss = Math.round(c.wealth * 0.1)
            get().addLedgerRecord('支出', '客人离去', loss, `${c.name}因等候太久负气离去`)
            set((s) => ({
              reputation: Math.max(0, s.reputation - 1),
            }))
          }
        }

        customers = customers.map((c) => {
          if (c.seatId === null && !c.isStanding) return c
          let delta = Math.random() < 0.7 ? 1 : -1
          if (state.currentStory && state.currentBranch) {
            const match = state.currentBranch.tags.some((t) => c.preferenceTags.includes(t))
            if (match) delta += 1
          }
          if (c.isStanding) delta -= 1
          return { ...c, satisfaction: Math.max(0, Math.min(100, c.satisfaction + delta)) }
        })

        if (newProgress >= 100) {
          set({ performanceActive: false, storyProgress: 100, customers, waitingCustomers: updatedWaiting })
          setTimeout(() => get().doSettlement(), 600)
        } else {
          set({ storyProgress: newProgress, customers, waitingCustomers: updatedWaiting })
        }
      },

      handleInterruption: (option: InterruptionOption) => {
        const state = get()
        if (!state.currentInterruption) return

        const customers = state.customers.map((c) => ({
          ...c,
          satisfaction: Math.max(0, Math.min(100, c.satisfaction + option.satisfactionEffect)),
        }))

        const newReputation = Math.max(0, Math.min(100, state.reputation + option.reputationEffect))

        set({
          currentInterruption: null,
          customers,
          gold: state.gold + option.goldEffect,
          reputation: newReputation,
        })

        if (option.goldEffect !== 0) {
          get().addLedgerRecord(
            option.goldEffect > 0 ? '收入' : '支出',
            '插话应对',
            Math.abs(option.goldEffect),
            option.text.slice(0, 20)
          )
        }

        if (option.reputationEffect !== 0) {
          set((s) => ({
            reputationHistory: [
              ...s.reputationHistory,
              {
                day: s.day,
                value: newReputation,
                delta: option.reputationEffect,
                reason: option.reputationEffect > 0 ? '插话应对得当' : '插话处理失当',
              },
            ],
          }))
        }
      },

      handleCrowdEvent: (dismiss: boolean) => {
        const state = get()
        if (!state.currentCrowdEvent) return

        const event = state.currentCrowdEvent
        let reputationDelta = event.effect
        let goldDelta = 0

        if (dismiss) {
          if (event.type === 'noise') {
            goldDelta = -20
            reputationDelta = event.effect
          } else if (event.type === 'bad_review') {
            reputationDelta = event.effect * 2
          }
        } else {
          if (event.type === 'noise') {
            reputationDelta = event.effect * 2
          } else if (event.type === 'eavesdrop') {
            const customers = state.customers.map((c) => ({
              ...c,
              satisfaction: Math.max(0, c.satisfaction - 5),
            }))
            set({ customers })
          }
        }

        const newReputation = Math.max(0, Math.min(100, state.reputation + reputationDelta))
        const newGold = state.gold + goldDelta

        set((s) => ({
          currentCrowdEvent: null,
          gold: newGold,
          reputation: newReputation,
          crowdEvents: [...s.crowdEvents, event],
        }))

        if (goldDelta !== 0) {
          get().addLedgerRecord(
            goldDelta > 0 ? '收入' : '支出',
            event.type === 'noise' ? '噪声投诉' : event.type === 'eavesdrop' ? '偷听漏句' : '差评处理',
            Math.abs(goldDelta),
            event.content.slice(0, 20)
          )
        }

        if (reputationDelta !== 0) {
          set((s) => ({
            reputationHistory: [
              ...s.reputationHistory,
              {
                day: s.day,
                value: newReputation,
                delta: reputationDelta,
                reason: event.type === 'noise' ? '噪声扰民' : event.type === 'eavesdrop' ? '偷听漏句' : '差评扩散',
              },
            ],
          }))
        }
      },

      doSettlement: () => {
        const state = get()
        if (!state.currentStory || !state.currentBranch) return

        const result = calcSettlement(
          state.day,
          state.currentStory,
          state.currentBranch,
          state.customers,
          state.waitingCustomers,
          state.seats,
          state.renovations,
          state.storyHistory,
          state.lastStoryDay,
          state.storyScores,
          state.reputation,
          state.snacks,
          state.queueConfig
        )

        const storyRecord: StoryRecord = {
          day: state.day,
          storyId: state.currentStory.id,
          branchId: state.currentBranch.id,
          audienceCount: result.audienceCount,
          earnings: result.totalEarnings,
          avgSatisfaction: result.avgSatisfaction,
        }

        const newStoryScores = { ...state.storyScores }
        if (!newStoryScores[state.currentStory.id]) {
          newStoryScores[state.currentStory.id] = []
        }
        newStoryScores[state.currentStory.id] = [
          ...newStoryScores[state.currentStory.id],
          result.avgSatisfaction,
        ].slice(-10)

        const newRep = Math.max(0, Math.min(100, state.reputation + result.reputationDelta))

        const repHistory: ReputationHistory = {
          day: state.day,
          value: newRep,
          delta: result.reputationDelta,
          reason: result.reputationDelta >= 0 ? '说书好评' : '差评影响',
        }

        set((s) => ({
          isSettlement: true,
          lastSettlement: result,
          gold: s.gold + result.totalEarnings,
          reputation: newRep,
          storyHistory: [...s.storyHistory, storyRecord],
          lastStoryDay: { ...s.lastStoryDay, [state.currentStory!.id]: state.day },
          storyScores: newStoryScores,
          reputationHistory: [...s.reputationHistory, repHistory],
        }))

        get().addLedgerRecord('收入', '基础门票', result.baseEarnings, '晚场门票')
        if (result.standingTicketRevenue > 0)
          get().addLedgerRecord('收入', '站票收入', result.standingTicketRevenue, `${result.standingCount}位站票客人`)
        if (result.crowdIncomeBonus > 0)
          get().addLedgerRecord('收入', '拥挤红利', result.crowdIncomeBonus, '客源旺盛带来的额外收入')
        if (result.tasteMatchBonus > 0)
          get().addLedgerRecord('收入', '口味匹配', result.tasteMatchBonus, '故事对味')
        if (result.seatViewBonus > 0)
          get().addLedgerRecord('收入', '视野加成', result.seatViewBonus, '座位优良')
        if (result.storyHeatBonus > 0)
          get().addLedgerRecord('收入', '热度加成', result.storyHeatBonus, '故事热门')
        if (result.serialExpectBonus > 0)
          get().addLedgerRecord('收入', '连载期待', result.serialExpectBonus, '观众期待')
        if (result.tips > 0)
          get().addLedgerRecord('收入', '客人打赏', result.tips, '客人满意打赏')
        if (result.snackRevenue > 0)
          get().addLedgerRecord('收入', '茶点售卖', result.snackRevenue, '消费茶点')
        if (result.noiseComplaintPenalty > 0)
          get().addLedgerRecord('支出', '噪声投诉', result.noiseComplaintPenalty, '扰民罚金')
        if (result.eavesdropPenalty > 0)
          get().addLedgerRecord('支出', '偷听漏句', result.eavesdropPenalty, '情节泄露损失')
        if (result.badReviewSpreadPenalty > 0)
          get().addLedgerRecord('支出', '差评扩散', result.badReviewSpreadPenalty, '口碑受损')
        if (result.badReviewPenalty > 0)
          get().addLedgerRecord('支出', '差评损失', result.badReviewPenalty, '客人不满索赔')
      },

      nextDay: () => {
        set((s) => ({
          day: s.day + 1,
          phase: 'day',
          weather: randomWeather(),
          customers: [],
          waitingCustomers: [],
          crowdEvents: [],
          currentCrowdEvent: null,
          currentStory: null,
          currentBranch: null,
          storyProgress: 0,
          availableStories: [],
          performanceActive: false,
          currentInterruption: null,
          isSettlement: false,
          seats: s.seats.map((seat) => ({ ...seat, occupied: false })),
          queueConfig: {
            ...s.queueConfig,
            crowdLevel: 0,
          },
        }))
      },

      resetGame: () => {
        set({ ...initialState, weather: randomWeather() })
      },

      setLimitStrategy: (strategy: LimitStrategy) => {
        set((s) => ({
          queueConfig: {
            ...s.queueConfig,
            limitStrategy: strategy,
          },
        }))
      },

      setStandingTicketPrice: (price: number) => {
        set((s) => ({
          queueConfig: {
            ...s.queueConfig,
            standingTicketPrice: Math.max(1, Math.min(10, price)),
          },
        }))
      },

      admitWaitingCustomer: () => {
        const state = get()
        if (state.waitingCustomers.length === 0) return

        const seats = [...state.seats]
        const emptySeat = seats.find((s) => !s.occupied)
        const canAdmitStanding = state.queueConfig.standingTicketEnabled &&
          state.customers.filter((c) => c.isStanding).length < state.queueConfig.standingCapacity

        if (!emptySeat && !canAdmitStanding) return

        const waiting = [...state.waitingCustomers]
        const nextCustomer = waiting.shift()!

        let isStanding = false
        if (emptySeat) {
          emptySeat.occupied = true
        } else {
          isStanding = true
        }

        const newCustomer = convertWaitingToCustomer(nextCustomer, isStanding)
        if (emptySeat) {
          newCustomer.seatId = emptySeat.id
        }

        set((s) => ({
          customers: [...s.customers, newCustomer],
          waitingCustomers: waiting,
          seats,
        }))

        if (isStanding) {
          get().addLedgerRecord('收入', '站票收入', state.queueConfig.standingTicketPrice, `${newCustomer.name}购买站票入场`)
        }
      },

      addLedgerRecord: (type, category, amount, note) => {
        set((s) => ({
          ledger: [
            ...s.ledger,
            {
              day: s.day,
              id: uid(),
              type,
              category,
              amount,
              note,
              timestamp: Date.now(),
            },
          ],
        }))
      },
    }),
    {
      name: 'teahouse-storyteller-save',
      partialize: (s) => ({
        day: s.day,
        gold: s.gold,
        reputation: s.reputation,
        snacks: s.snacks,
        seats: s.seats,
        renovations: s.renovations,
        queueConfig: s.queueConfig,
        ledger: s.ledger,
        storyHistory: s.storyHistory,
        reputationHistory: s.reputationHistory,
        lastStoryDay: s.lastStoryDay,
        storyScores: s.storyScores,
      }),
    }
  )
)
