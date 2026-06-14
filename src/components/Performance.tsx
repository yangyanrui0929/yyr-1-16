import { useEffect } from 'react'
import { Users, UserCheck } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import Interruption from './Interruption'
import CrowdEventModal from './CrowdEventModal'
import { getCrowdLevelDescription } from '@/utils/crowd'

function getMood(sat: number): string {
  if (sat >= 80) return '😍'
  if (sat >= 60) return '😊'
  if (sat >= 40) return '😐'
  if (sat >= 20) return '😕'
  return '😠'
}

export default function Performance() {
  const {
    customers,
    currentStory,
    currentBranch,
    storyProgress,
    performanceActive,
    currentInterruption,
    currentCrowdEvent,
    queueConfig,
    tickPerformance,
    handleInterruption,
  } = useGameStore()

  useEffect(() => {
    if (!performanceActive) return
    const timer = setInterval(tickPerformance, 800)
    return () => clearInterval(timer)
  }, [performanceActive, tickPerformance])

  const seated = customers.filter((c) => c.seatId !== null)
  const standing = customers.filter((c) => c.isStanding)
  const allAudience = [...seated, ...standing]
  const avgSat =
    allAudience.length > 0
      ? Math.round(allAudience.reduce((s, c) => s + c.satisfaction, 0) / allAudience.length)
      : 0

  const crowdLevel = queueConfig.crowdLevel
  const crowdDesc = getCrowdLevelDescription(crowdLevel)
  const crowdColor = crowdLevel >= 4 ? 'text-cinnabar' : crowdLevel >= 2 ? 'text-sandal' : 'text-tea'

  if (!performanceActive && storyProgress === 0) {
    return (
      <div className="scroll-panel text-center py-12">
        <span className="text-6xl mb-4 block">🎭</span>
        <div className="font-brush text-2xl text-sandal mb-2">等待开讲</div>
        <div className="text-ink-light">请先选择故事与分支</div>
      </div>
    )
  }

  return (
    <div className="scroll-panel">
      <h2 className="text-2xl font-brush text-sandal mb-4 flex items-center gap-2">
        <Users className="w-6 h-6" /> 开讲现场
      </h2>

      {currentInterruption && <Interruption event={currentInterruption} onChoose={handleInterruption} />}
      {currentCrowdEvent && <CrowdEventModal />}

      <div className="relative">
        {crowdLevel >= 2 && (
          <div className={`mb-4 p-3 rounded-lg border-2 flex items-center justify-between ${
            crowdLevel >= 4 ? 'bg-cinnabar/10 border-cinnabar/30' : 'bg-sandal/10 border-sandal/30'
          }`}>
            <div className="flex items-center gap-2">
              <Users className={`w-5 h-5 ${crowdColor}`} />
              <span className="font-song text-sm text-ink">现场状态：</span>
              <span className={`font-bold ${crowdColor}`}>{crowdDesc}</span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${i < crowdLevel ? 'bg-cinnabar animate-pulse' : 'bg-paper-dark'}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-center py-6 bg-gradient-to-b from-cinnabar/10 to-paper rounded-xl border-2 border-cinnabar/30 mb-6">
          <div className="text-7xl mb-2">🎙️</div>
          <div className="font-brush text-2xl text-cinnabar">{currentStory?.title}</div>
          <div className="text-ink-light mt-1">{currentBranch?.title}</div>
          <div className="text-sm text-sandal mt-3 font-song italic">
            {currentBranch?.content?.slice(0, Math.floor((storyProgress / 100) * currentBranch.content.length))}
            <span className="animate-pulse text-cinnabar">▊</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-song">说书进度</span>
            <span className="font-semibold text-sandal">{storyProgress}%</span>
          </div>
          <div className="h-3 bg-paper-dark rounded-full overflow-hidden border border-sandal/30">
            <div
              className="h-full bg-gradient-to-r from-gold via-cinnabar to-sandal transition-all duration-500"
              style={{ width: `${storyProgress}%` }}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="text-sm text-ink-light">
              观众 <span className="font-semibold text-ink">{seated.length}</span> 人
            </div>
            {standing.length > 0 && (
              <div className="text-sm text-ink-light flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-sandal" />
                站票 <span className="font-semibold text-sandal">{standing.length}</span> 人
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-light">平均满意度</span>
            <span className="text-2xl">{getMood(avgSat)}</span>
            <span className="font-bold text-lg" style={{ color: avgSat > 60 ? '#6B8E5A' : avgSat > 40 ? '#C9A24B' : '#A83232' }}>
              {avgSat}
            </span>
          </div>
        </div>

        {seated.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-song text-ink-light mb-2">入座客人</div>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
              {seated.map((c) => (
                <div
                  key={c.id}
                  className={`card-ancient p-2 text-center transition-all ${c.satisfaction < 40 ? 'animate-shake border-cinnabar' : ''}`}
                >
                  <div className="text-2xl">{c.emoji}</div>
                  <div className="text-xs font-song truncate">{c.name}</div>
                  <div className="text-xl my-1">{getMood(c.satisfaction)}</div>
                  <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
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

        {standing.length > 0 && (
          <div>
            <div className="text-sm font-song text-ink-light mb-2 flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-sandal" /> 站票客人
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
              {standing.map((c) => (
                <div
                  key={c.id}
                  className={`card-ancient p-2 text-center transition-all border-sandal/50 bg-sandal/5 ${
                    c.satisfaction < 40 ? 'animate-shake border-cinnabar' : ''
                  }`}
                >
                  <div className="text-2xl opacity-80">{c.emoji}</div>
                  <div className="text-xs font-song truncate text-ink-light">{c.name}</div>
                  <div className="text-lg my-1 opacity-80">{getMood(c.satisfaction)}</div>
                  <div className="text-xs text-sandal font-song">站票</div>
                  <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all opacity-70"
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
      </div>
    </div>
  )
}
