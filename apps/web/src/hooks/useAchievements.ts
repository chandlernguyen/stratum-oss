import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ACHIEVEMENTS } from '@/components/gamification/AchievementToast'
import type { Achievement } from '@/components/gamification/AchievementToast'

interface UserProgress {
  totalXP: number
  level: number
  achievementsUnlocked: string[]
  agentsUsed: string[]
  outputsSaved: number
  campaignsCompleted: number
}

export function useAchievements() {
  const { user } = useAuthStore()
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    // Load from localStorage
    if (user) {
      const saved = localStorage.getItem(`user_progress_${user.id}`)
      if (saved) {
        return JSON.parse(saved)
      }
    }
    
    return {
      totalXP: 0,
      level: 1,
      achievementsUnlocked: [],
      agentsUsed: [],
      outputsSaved: 0,
      campaignsCompleted: 0
    }
  })
  
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([])
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null)

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`user_progress_${user.id}`, JSON.stringify(userProgress))
    }
  }, [userProgress, user])

  // Calculate level from XP
  const calculateLevel = (xp: number): number => {
    // Each level requires 100 more XP than the last
    // Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP, etc.
    let level = 1
    let requiredXP = 0
    
    while (xp >= requiredXP) {
      level++
      requiredXP += level * 100
    }
    
    return level - 1
  }

  // Check and unlock achievements
  const checkAchievements = useCallback(() => {
    const newAchievements: Achievement[] = []
    
    // Check first agent chat
    if (!userProgress.achievementsUnlocked.includes('first_agent_chat') && 
        userProgress.agentsUsed.length > 0) {
      newAchievements.push(ACHIEVEMENTS.first_agent_chat)
    }
    
    // Check first save
    if (!userProgress.achievementsUnlocked.includes('first_save') && 
        userProgress.outputsSaved > 0) {
      newAchievements.push(ACHIEVEMENTS.first_save)
    }
    
    // Check 5 agents used
    if (!userProgress.achievementsUnlocked.includes('five_agents_used') && 
        userProgress.agentsUsed.length >= 5) {
      newAchievements.push(ACHIEVEMENTS.five_agents_used)
    }
    
    // Check all agents used
    if (!userProgress.achievementsUnlocked.includes('all_agents_used') && 
        userProgress.agentsUsed.length >= 9) {
      newAchievements.push(ACHIEVEMENTS.all_agents_used)
    }
    
    // Check 10 outputs saved
    if (!userProgress.achievementsUnlocked.includes('ten_outputs_saved') && 
        userProgress.outputsSaved >= 10) {
      newAchievements.push(ACHIEVEMENTS.ten_outputs_saved)
    }
    
    // Check campaign completed
    if (!userProgress.achievementsUnlocked.includes('complete_campaign') && 
        userProgress.campaignsCompleted > 0) {
      newAchievements.push(ACHIEVEMENTS.complete_campaign)
    }
    
    // Queue new achievements
    if (newAchievements.length > 0) {
      setAchievementQueue(prev => [...prev, ...newAchievements])
      
      // Update progress
      const totalNewXP = newAchievements.reduce((sum, a) => sum + a.xp, 0)
      const newUnlocked = newAchievements.map(a => a.id)
      
      setUserProgress(prev => ({
        ...prev,
        totalXP: prev.totalXP + totalNewXP,
        level: calculateLevel(prev.totalXP + totalNewXP),
        achievementsUnlocked: [...prev.achievementsUnlocked, ...newUnlocked]
      }))
    }
  }, [userProgress])

  // Process achievement queue
  useEffect(() => {
    if (achievementQueue.length > 0 && !currentAchievement) {
      const [next, ...rest] = achievementQueue
      setCurrentAchievement(next)
      setAchievementQueue(rest)
    }
  }, [achievementQueue, currentAchievement])

  // Track agent usage
  const trackAgentUsage = useCallback((agentId: string) => {
    setUserProgress(prev => {
      const agentsUsed = prev.agentsUsed.includes(agentId) 
        ? prev.agentsUsed 
        : [...prev.agentsUsed, agentId]
      
      return { ...prev, agentsUsed }
    })
    
    // Check for new achievements
    setTimeout(checkAchievements, 100)
  }, [checkAchievements])

  // Track output saved
  const trackOutputSaved = useCallback(() => {
    setUserProgress(prev => ({
      ...prev,
      outputsSaved: prev.outputsSaved + 1
    }))
    
    // Check for new achievements
    setTimeout(checkAchievements, 100)
  }, [checkAchievements])

  // Track campaign completed
  const trackCampaignCompleted = useCallback(() => {
    setUserProgress(prev => ({
      ...prev,
      campaignsCompleted: prev.campaignsCompleted + 1
    }))
    
    // Check for new achievements
    setTimeout(checkAchievements, 100)
  }, [checkAchievements])

  // Track cross-agent share
  const trackCrossAgentShare = useCallback(() => {
    if (!userProgress.achievementsUnlocked.includes('cross_agent_share')) {
      setAchievementQueue(prev => [...prev, ACHIEVEMENTS.cross_agent_share])
      
      setUserProgress(prev => ({
        ...prev,
        totalXP: prev.totalXP + ACHIEVEMENTS.cross_agent_share.xp,
        level: calculateLevel(prev.totalXP + ACHIEVEMENTS.cross_agent_share.xp),
        achievementsUnlocked: [...prev.achievementsUnlocked, 'cross_agent_share']
      }))
    }
  }, [userProgress.achievementsUnlocked])

  // Track quick win completed
  const trackQuickWinCompleted = useCallback(() => {
    if (!userProgress.achievementsUnlocked.includes('quick_win_completed')) {
      setAchievementQueue(prev => [...prev, ACHIEVEMENTS.quick_win_completed])
      
      setUserProgress(prev => ({
        ...prev,
        totalXP: prev.totalXP + ACHIEVEMENTS.quick_win_completed.xp,
        level: calculateLevel(prev.totalXP + ACHIEVEMENTS.quick_win_completed.xp),
        achievementsUnlocked: [...prev.achievementsUnlocked, 'quick_win_completed']
      }))
    }
  }, [userProgress.achievementsUnlocked])

  // Clear current achievement
  const clearCurrentAchievement = useCallback(() => {
    setCurrentAchievement(null)
  }, [])

  return {
    userProgress,
    currentAchievement,
    clearCurrentAchievement,
    trackAgentUsage,
    trackOutputSaved,
    trackCampaignCompleted,
    trackCrossAgentShare,
    trackQuickWinCompleted,
    totalAchievements: Object.keys(ACHIEVEMENTS).length,
    unlockedAchievements: userProgress.achievementsUnlocked.length,
    nextLevelXP: (userProgress.level + 1) * 100,
    currentLevelProgress: userProgress.totalXP % 100
  }
}