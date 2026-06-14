import type { CrowdEvent } from '@/types'

export const CROWD_EVENTS: Omit<CrowdEvent, 'id'>[] = [
  {
    type: 'noise',
    content: '隔壁邻居前来投诉，说茶坊太吵影响家中孩童读书。',
    effect: -2,
  },
  {
    type: 'noise',
    content: '地保路过，警告说书声太大扰民，需缴纳罚金。',
    effect: -3,
  },
  {
    type: 'noise',
    content: '读书人聚集抗议，说嘈杂环境影响他们温习功课。',
    effect: -2,
  },
  {
    type: 'eavesdrop',
    content: '门口有人偷听，客人抱怨隐私不保，精彩情节提前泄露。',
    effect: -3,
  },
  {
    type: 'eavesdrop',
    content: '隔墙有耳，听书人太多导致故事结局被路人剧透。',
    effect: -2,
  },
  {
    type: 'eavesdrop',
    content: '拥挤中有人大声议论情节，影响了其他客人的听书体验。',
    effect: -2,
  },
  {
    type: 'bad_review',
    content: '有客人不满拥挤环境，在市井间大肆宣扬茶坊的不是。',
    effect: -3,
  },
  {
    type: 'bad_review',
    content: '等候太久的客人负气离去，沿途向路人抱怨茶坊服务不周。',
    effect: -2,
  },
  {
    type: 'bad_review',
    content: '站票客人抱怨视野不佳，与其他客人发生口角，影响气氛。',
    effect: -2,
  },
]

export function getRandomCrowdEvent(crowdLevel: number): Omit<CrowdEvent, 'id'> | null {
  if (crowdLevel < 2) return null
  if (Math.random() > crowdLevel * 0.12) return null

  const pool = crowdLevel >= 4 ? CROWD_EVENTS : CROWD_EVENTS.filter(e => e.effect >= -2)
  return pool[Math.floor(Math.random() * pool.length)]
}
