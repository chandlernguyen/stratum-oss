import { Trophy, Zap, Star } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UserProgressProps {
  level: number
  totalXP: number
  currentLevelProgress: number
  nextLevelXP: number
  achievementsUnlocked: number
  totalAchievements: number
  className?: string
  compact?: boolean
}

export function UserProgress({
  level,
  totalXP,
  currentLevelProgress,
  nextLevelXP,
  achievementsUnlocked,
  totalAchievements,
  className,
  compact = false
}: UserProgressProps) {
  const progressPercentage = (currentLevelProgress / nextLevelXP) * 100

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Badge variant="outline" className="gap-1">
          <Star className="w-3 h-3" />
          Lvl {level}
        </Badge>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span className="text-sm font-medium">{totalXP} XP</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span className="text-sm">{achievementsUnlocked}/{totalAchievements}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4 p-4 bg-gradient-to-br from-slate-50 to-amber-50 rounded-lg", className)}>
      {/* Level and XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-600 to-amber-600 rounded-lg">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Level {level}</h3>
            <p className="text-sm text-muted-foreground">{totalXP} Total XP</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium">Next Level</p>
          <p className="text-xs text-muted-foreground">
            {currentLevelProgress}/{nextLevelXP} XP
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(progressPercentage)}% to Level {level + 1}
        </p>
      </div>

      {/* Achievements */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium">Achievements</span>
        </div>
        <Badge variant="secondary">
          {achievementsUnlocked}/{totalAchievements} Unlocked
        </Badge>
      </div>

      {/* Level Perks Preview */}
      <div className="bg-white/70 rounded p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Level Perks:</p>
        <div className="flex flex-wrap gap-2">
          {level >= 5 && (
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Expert Mode
            </Badge>
          )}
          {level >= 10 && (
            <Badge variant="outline" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Priority Support
            </Badge>
          )}
          {level >= 15 && (
            <Badge variant="outline" className="text-xs">
              <Trophy className="w-3 h-3 mr-1" />
              Beta Features
            </Badge>
          )}
          {level < 5 && (
            <span className="text-xs text-muted-foreground">
              Reach Level 5 to unlock Expert Mode
            </span>
          )}
        </div>
      </div>
    </div>
  )
}