import { useEffect, useState } from 'react'
import { Trophy, Star, Zap, Target, Users, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ElementType
  xp: number
  unlockedAt?: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_agent_chat: {
    id: 'first_agent_chat',
    title: 'First Contact',
    description: 'Had your first conversation with an AI agent',
    icon: Zap,
    xp: 10,
    rarity: 'common'
  },
  first_save: {
    id: 'first_save',
    title: 'Knowledge Keeper',
    description: 'Saved your first agent output',
    icon: Star,
    xp: 20,
    rarity: 'common'
  },
  cross_agent_share: {
    id: 'cross_agent_share',
    title: 'Workflow Master',
    description: 'Shared data between agents',
    icon: Users,
    xp: 50,
    rarity: 'rare'
  },
  complete_campaign: {
    id: 'complete_campaign',
    title: 'Campaign Champion',
    description: 'Completed your first campaign',
    icon: Trophy,
    xp: 100,
    rarity: 'epic'
  },
  five_agents_used: {
    id: 'five_agents_used',
    title: 'Team Player',
    description: 'Used 5 different AI agents',
    icon: Users,
    xp: 75,
    rarity: 'rare'
  },
  ten_outputs_saved: {
    id: 'ten_outputs_saved',
    title: 'Data Hoarder',
    description: 'Saved 10 agent outputs',
    icon: Star,
    xp: 50,
    rarity: 'rare'
  },
  quick_win_completed: {
    id: 'quick_win_completed',
    title: 'Quick Winner',
    description: 'Completed a quick win template',
    icon: Zap,
    xp: 30,
    rarity: 'common'
  },
  roi_improved: {
    id: 'roi_improved',
    title: 'ROI Optimizer',
    description: 'Improved campaign ROI by 20%',
    icon: TrendingUp,
    xp: 150,
    rarity: 'legendary'
  },
  all_agents_used: {
    id: 'all_agents_used',
    title: 'Master Marketer',
    description: 'Used all 9 AI agents',
    icon: Trophy,
    xp: 200,
    rarity: 'legendary'
  },
  strategy_to_execution: {
    id: 'strategy_to_execution',
    title: 'Full Cycle',
    description: 'Went from strategy to campaign execution',
    icon: Target,
    xp: 100,
    rarity: 'epic'
  }
}

interface AchievementToastProps {
  achievement: Achievement
  onClose: () => void
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(onClose, 300)
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const Icon = achievement.icon

  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-amber-400 to-amber-600',
    legendary: 'from-yellow-400 to-orange-600'
  }

  const rarityBorders = {
    common: 'border-gray-300',
    rare: 'border-blue-300',
    epic: 'border-amber-300',
    legendary: 'border-yellow-300'
  }

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 transition-all duration-300",
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className={cn(
        "bg-white rounded-lg shadow-2xl border-2 p-4 min-w-[320px]",
        rarityBorders[achievement.rarity]
      )}>
        {/* Achievement Header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            rarityColors[achievement.rarity]
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{achievement.title}</h3>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full text-white capitalize",
                "bg-gradient-to-r",
                rarityColors[achievement.rarity]
              )}>
                {achievement.rarity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {achievement.description}
            </p>
            
            {/* XP Reward */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <Zap className="w-4 h-4" />
                +{achievement.xp} XP
              </div>
            </div>
          </div>
        </div>

        {/* Progress effect */}
        <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full bg-gradient-to-r animate-pulse",
              rarityColors[achievement.rarity]
            )}
            style={{
              animation: 'slide 2s ease-in-out infinite',
              width: '100%'
            }}
          />
        </div>
      </div>

    </div>
  )
}