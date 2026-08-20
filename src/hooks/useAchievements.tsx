import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  sort_order: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: Achievement;
}

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAchievements = async () => {
      try {
        const response = await api.get<{ achievements: Array<{ id: string; name: string; description: string; icon: string | null; sortOrder: number }> }>('/achievements/catalog');
        setAchievements(
          response.achievements.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            icon: item.icon,
            sort_order: item.sortOrder,
          })),
        );
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setAchievements([]);
      }
    };

    fetchAllAchievements();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserAchievements([]);
      setLoading(false);
      return;
    }

    const fetchUserAchievements = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ achievements: Array<{
          id: string;
          achievementId: string;
          unlockedAt: string;
          achievement: {
            id: string;
            name: string;
            description: string;
            icon: string | null;
            sortOrder: number;
          };
        }> }>('/achievements/me');
        const transformed = response.achievements.map((item) => ({
          id: item.id,
          achievement_id: item.achievementId,
          unlocked_at: item.unlockedAt,
          achievement: {
            id: item.achievement.id,
            name: item.achievement.name,
            description: item.achievement.description,
            icon: item.achievement.icon,
            sort_order: item.achievement.sortOrder,
          },
        })).sort((a, b) => a.achievement.sort_order - b.achievement.sort_order);

        setUserAchievements(transformed);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setUserAchievements([]);
      }
      setLoading(false);
    };

    fetchUserAchievements();
  }, [user]);

  // Get the latest unlocked achievement (most recent by unlocked_at)
  const latestAchievement = userAchievements.length > 0
    ? [...userAchievements].sort((a, b) => 
        new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
      )[0]
    : null;

  return { achievements, userAchievements, latestAchievement, loading };
}

// Function to assign the first achievement to a new user
export async function assignFirstAchievement(userId: string) {
  void userId;
}
