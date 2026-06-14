import { AlertTriangle, Volume2, Ear, MessageSquare, X, Coins } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import type { CrowdEvent } from '@/types'

function getEventIcon(type: CrowdEvent['type']) {
  switch (type) {
    case 'noise': return <Volume2 className="w-8 h-8 text-cinnabar" />
    case 'eavesdrop': return <Ear className="w-8 h-8 text-sandal" />
    case 'bad_review': return <MessageSquare className="w-8 h-8 text-cinnabar" />
  }
}

function getEventTitle(type: CrowdEvent['type']) {
  switch (type) {
    case 'noise': return '噪声投诉'
    case 'eavesdrop': return '偷听漏句'
    case 'bad_review': return '差评扩散'
  }
}

export default function CrowdEventModal() {
  const { currentCrowdEvent, handleCrowdEvent } = useGameStore()

  if (!currentCrowdEvent) return null

  const event = currentCrowdEvent

  return (
    <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4">
      <div className="scroll-panel max-w-lg w-full animate-unroll">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cinnabar/20 mb-3">
            {getEventIcon(event.type)}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-cinnabar" />
            <h3 className="font-brush text-2xl text-cinnabar">{getEventTitle(event.type)}</h3>
          </div>
        </div>

        <div className="bg-paper-dark/50 rounded-lg p-4 mb-6">
          <p className="font-song text-ink text-center leading-relaxed">
            {event.content}
          </p>
        </div>

        {event.type === 'noise' && (
          <div className="space-y-3">
            <button
              onClick={() => handleCrowdEvent(true)}
              className="w-full btn-gold flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              花钱打点 (-20文)
            </button>
            <button
              onClick={() => handleCrowdEvent(false)}
              className="w-full btn-wood flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              不予理会 (声望损失加倍)
            </button>
          </div>
        )}

        {event.type === 'eavesdrop' && (
          <div className="space-y-3">
            <button
              onClick={() => handleCrowdEvent(false)}
              className="w-full btn-wood flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              继续说书 (客人满意度下降)
            </button>
          </div>
        )}

        {event.type === 'bad_review' && (
          <div className="space-y-3">
            <button
              onClick={() => handleCrowdEvent(true)}
              className="w-full btn-gold flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              极力辩解 (声望损失加倍但挽回面子)
            </button>
            <button
              onClick={() => handleCrowdEvent(false)}
              className="w-full btn-wood flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              默默承受
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
