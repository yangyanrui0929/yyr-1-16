import { Users, Clock, DoorOpen, Ticket } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { getCrowdLevelDescription } from '@/utils/crowd'
import type { LimitStrategy } from '@/types'

function getWaitMood(sat: number, waitTime: number): string {
  if (waitTime > 8 || sat < 30) return '😤'
  if (waitTime > 5 || sat < 50) return '😕'
  if (sat >= 70) return '😊'
  return '🙂'
}

export default function QueuePanel() {
  const {
    waitingCustomers,
    queueConfig,
    customers,
    phase,
    performanceActive,
    admitWaitingCustomer,
    setLimitStrategy,
    setStandingTicketPrice,
  } = useGameStore()

  if (phase !== 'night') return null

  const crowdLevel = queueConfig.crowdLevel
  const crowdDesc = getCrowdLevelDescription(crowdLevel)
  const crowdColor = crowdLevel >= 4 ? 'text-cinnabar' : crowdLevel >= 2 ? 'text-sandal' : 'text-tea'

  const seatedCount = customers.filter((c) => c.seatId !== null).length
  const standingCount = customers.filter((c) => c.isStanding).length

  const strategies = [
    { id: 'none', label: '不限流', desc: '客源最多' },
    { id: 'moderate', label: '适度限流', desc: '平衡客源与体验' },
    { id: 'strict', label: '严格限流', desc: '保证体验优先' },
  ]

  return (
    <div className="scroll-panel">
      <h2 className="text-2xl font-brush text-sandal mb-4 flex items-center gap-2">
        <DoorOpen className="w-6 h-6" /> 门口候场
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card-ancient text-center">
          <div className="stat-label">拥挤程度</div>
          <div className={`stat-value ${crowdColor}`}>{crowdDesc}</div>
          <div className="flex justify-center mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full mx-0.5 ${i < crowdLevel ? 'bg-cinnabar' : 'bg-paper-dark'}`}
              />
            ))}
          </div>
        </div>
        <div className="card-ancient text-center">
          <div className="stat-label">已入座</div>
          <div className="stat-value text-tea">{seatedCount} 人</div>
        </div>
        <div className="card-ancient text-center">
          <div className="stat-label">站票</div>
          <div className="stat-value text-sandal">{standingCount} / {queueConfig.standingCapacity}</div>
        </div>
        <div className="card-ancient text-center">
          <div className="stat-label">候场</div>
          <div className="stat-value text-cinnabar">{waitingCustomers.length} / {queueConfig.capacity}</div>
        </div>
      </div>

      {queueConfig.standingTicketEnabled && (
        <div className="mb-4 p-3 bg-gold/10 rounded-lg border border-gold/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-gold" />
              <span className="font-song text-sm text-ink">站票价格</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStandingTicketPrice(queueConfig.standingTicketPrice - 1)}
                className="w-6 h-6 rounded bg-paper-dark hover:bg-sandal/30 transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-gold">{queueConfig.standingTicketPrice}</span>
              <button
                onClick={() => setStandingTicketPrice(queueConfig.standingTicketPrice + 1)}
                className="w-6 h-6 rounded bg-paper-dark hover:bg-sandal/30 transition-colors"
              >
                +
              </button>
              <span className="text-xs text-ink-light">文</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="text-sm font-song text-ink-light mb-2">限流策略</div>
        <div className="grid grid-cols-3 gap-2">
          {strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => setLimitStrategy(s.id as LimitStrategy)}
              className={`p-2 rounded-lg text-center transition-all ${
                queueConfig.limitStrategy === s.id
                  ? 'bg-sandal/30 border-2 border-sandal'
                  : 'bg-paper-dark/50 border-2 border-transparent hover:bg-paper-dark'
              }`}
            >
              <div className="text-sm font-bold text-ink">{s.label}</div>
              <div className="text-xs text-ink-light">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {!performanceActive && waitingCustomers.length > 0 && (
        <button
          onClick={admitWaitingCustomer}
          className="w-full btn-gold mb-4 flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" /> 请进下一位客人
        </button>
      )}

      {waitingCustomers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-sandal" />
            <span className="text-sm font-song text-ink-light">等候名单</span>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
            {waitingCustomers.map((c) => (
              <div
                key={c.id}
                className={`card-ancient p-2 text-center transition-all ${
                  c.satisfaction < 30 ? 'animate-shake border-cinnabar/50' : ''
                }`}
              >
                <div className="text-xl">{c.emoji}</div>
                <div className="text-xs font-song truncate">{c.name}</div>
                <div className="text-lg my-0.5">{getWaitMood(c.satisfaction, c.waitTime)}</div>
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Clock className="w-3 h-3 text-ink-light" />
                  <span className="text-ink-light">{c.waitTime}</span>
                </div>
                <div className="h-1 bg-paper-dark rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${c.satisfaction}%`,
                      backgroundColor: c.satisfaction > 60 ? '#6B8E5A' : c.satisfaction > 40 ? '#C9A24B' : '#A83232',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {waitingCustomers.length === 0 && (
        <div className="text-center py-4 text-ink-light">
          <DoorOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <div className="font-song">门口暂无等候的客人</div>
        </div>
      )}
    </div>
  )
}
