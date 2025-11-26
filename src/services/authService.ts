import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password, name }: SignUpData) {
  try {
    // Create auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Wait for the database trigger to create the profile automatically
    // The trigger should handle profile creation, but we'll wait and verify
    let profile = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!profile && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (data && !error) {
        profile = data;
        break;
      }
      attempts++;
    }

    // If trigger didn't create the profile, try to create it manually
    if (!profile) {
      const { data: newProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          xp: 0,
          level: 1,
          streak: 0,
        })
        .select()
        .single();

      if (profileError) {
        // Check one more time if profile exists
        const { data: finalCheck } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (!finalCheck) {
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
        profile = finalCheck;
      } else {
        profile = newProfile;
      }
    }

    // Update local store with profile data
    if (profile) {
      useUserStore.getState().login(profile.email, profile.name);
      useUserStore.setState({
        user: {
          name: profile.name,
          email: profile.email,
          xp: profile.xp || 0,
          level: profile.level || 1,
          streak: profile.streak || 0,
        },
      });
    }

    return { user: authData.user, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { user: null, error: error.message || 'Failed to sign up' };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user data returned');

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    // Update local store
    useUserStore.getState().login(profile.email, profile.name);
    useUserStore.setState({
      user: {
        name: profile.name,
        email: profile.email,
        xp: profile.xp,
        level: profile.level,
        streak: profile.streak,
      },
    });

    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { user: null, error: error.message || 'Failed to sign in' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Update local store
    useUserStore.getState().logout();

    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { error: error.message || 'Failed to sign out' };
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error: any) {
    return { session: null, error: error.message };
  }
}

/**
 * Initialize auth state on app load
 */
export async function initializeAuth() {
  try {
    const { session, error } = await getSession();
    if (error || !session) {
      useUserStore.getState().logout();
      return;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      useUserStore.getState().logout();
      return;
    }

    // Update local store
    useUserStore.getState().login(profile.email, profile.name);
    useUserStore.setState({
      isAuthenticated: true,
      user: {
        name: profile.name,
        email: profile.email,
        xp: profile.xp,
        level: profile.level,
        streak: profile.streak,
      },
    });
  } catch (error) {
    console.error('Auth initialization error:', error);
    useUserStore.getState().logout();
  }
}

