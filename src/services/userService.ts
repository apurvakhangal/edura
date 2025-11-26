import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

/**
 * Update user XP and level
 */
export async function updateUserXP(userId: string, xpToAdd: number) {
  try {
    // Get current XP from database first
    const { data: currentUserData, error: fetchError } = await supabase
      .from('users')
      .select('xp, level')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentXP = currentUserData?.xp || 0;
    const newXP = currentXP + xpToAdd;
    const newLevel = Math.floor(newXP / 100) + 1;

    // Update in database
    const { error } = await supabase
      .from('users')
      .update({
        xp: newXP,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // Update local store
    useUserStore.setState((state) => {
      if (state.user) {
        return {
          user: {
            ...state.user,
            xp: newXP,
            level: newLevel,
          },
        };
      }
      return state;
    });

    return { xp: newXP, level: newLevel, error: null };
  } catch (error: any) {
    console.error('Error updating XP:', error);
    return { xp: null, level: null, error: error.message };
  }
}

/**
 * Update user streak
 */
export async function updateUserStreak(userId: string, streak: number) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        streak,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // Update local store
    useUserStore.setState((state) => {
      if (state.user) {
        return {
          user: {
            ...state.user,
            streak,
          },
        };
      }
      return state;
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error updating streak:', error);
    return { error: error.message };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { profile: data, error: null };
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return { profile: null, error: error.message };
  }
}

