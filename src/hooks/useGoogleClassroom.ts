import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClassroomAssignment,
  ClassroomAssignmentBuckets,
  ClassroomCourse,
} from '@/types/classroom';
import { fetchGoogleProfile, getClassroomAssignments } from '@/services/classroomService';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const DEFAULT_BUCKETS: ClassroomAssignmentBuckets = { pending: [], upcoming: [], completed: [] };

interface UseGoogleClassroomResult {
  assignments: ClassroomAssignmentBuckets;
  flatAssignments: ClassroomAssignment[];
  courses: ClassroomCourse[];
  loading: boolean;
  error: string | null;
  userProfile: { name?: string; email?: string; picture?: string } | null;
  lastSyncedAt: number | null;
  isConnected: boolean;
  connectAndSync: () => Promise<void>;
  refreshAssignments: () => Promise<void>;
  disconnect: () => void;
}

export const useGoogleClassroom = (): UseGoogleClassroomResult => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const proxyUrl = import.meta.env.VITE_CLASSROOM_PROXY_URL;
  const tokenClientRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ClassroomAssignmentBuckets>(DEFAULT_BUCKETS);
  const [flatAssignments, setFlatAssignments] = useState<ClassroomAssignment[]>([]);
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; picture?: string } | null>(
    null,
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const ensureGoogleScript = useCallback(() => {
    if (scriptLoadedRef.current) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window object not available'));
        return;
      }

      const google = (window as any).google;
      if (google?.accounts?.oauth2) {
        scriptLoadedRef.current = true;
        resolve();
        return;
      }

      const existingScript = document.getElementById('google-identity-services');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          scriptLoadedRef.current = true;
          resolve();
        });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.body.appendChild(script);
    });
  }, []);

  const initTokenClient = useCallback(() => {
    if (!clientId) {
      throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
    }
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      throw new Error('Google Identity Services SDK not ready');
    }

    tokenClientRef.current = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: () => undefined,
    });
  }, [clientId]);

  const ensureTokenClient = useCallback(async () => {
    if (tokenClientRef.current) return;
    await ensureGoogleScript();
    initTokenClient();
  }, [ensureGoogleScript, initTokenClient]);

  const requestAccessToken = useCallback(
    async (prompt: 'consent' | 'none' = 'none') => {
      await ensureTokenClient();
      return new Promise<string>((resolve, reject) => {
        const client = tokenClientRef.current;
        if (!client) {
          reject(new Error('Token client not initialized'));
          return;
        }

        client.callback = (response: { access_token?: string; error?: string; error_description?: string }) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('No access token returned by Google'));
            return;
          }
          setAccessToken(response.access_token);
          resolve(response.access_token);
        };

        client.requestAccessToken({ prompt });
      });
    },
    [ensureTokenClient],
  );

  const resetState = useCallback(() => {
    setAssignments(DEFAULT_BUCKETS);
    setFlatAssignments([]);
    setCourses([]);
    setUserProfile(null);
    setLastSyncedAt(null);
  }, []);

  const hydrateFromProxy = useCallback(
    async (token: string) => {
      if (!proxyUrl) return null;
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        throw new Error('Supabase proxy responded with an error');
      }
      return response.json();
    },
    [proxyUrl],
  );

  const syncAssignments = useCallback(
    async (token?: string) => {
      const activeToken = token || accessToken || (await requestAccessToken('consent'));
      if (!activeToken) {
        throw new Error('Unable to obtain Google access token');
      }

      setLoading(true);
      setError(null);
      try {
        if (proxyUrl) {
          const proxyPayload = await hydrateFromProxy(activeToken);
          if (proxyPayload) {
            if (proxyPayload.buckets) {
              setAssignments(proxyPayload.buckets);
            }
            if (Array.isArray(proxyPayload.assignments)) {
              setFlatAssignments(proxyPayload.assignments);
            }
            if (Array.isArray(proxyPayload.courses)) {
              setCourses(proxyPayload.courses);
            }
          }
        } else {
          const { courses: fetchedCourses, assignments: fetchedAssignments, buckets } =
            await getClassroomAssignments(activeToken);
          setAssignments(buckets);
          setFlatAssignments(fetchedAssignments);
          setCourses(fetchedCourses);
        }

        const profile = await fetchGoogleProfile(activeToken).catch(() => null);
        if (profile) {
          setUserProfile(profile);
        }
        setLastSyncedAt(Date.now());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync Google Classroom data';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [accessToken, hydrateFromProxy, proxyUrl, requestAccessToken],
  );

  const connectAndSync = useCallback(async () => {
    try {
      const token = await requestAccessToken(accessToken ? 'none' : 'consent');
      await syncAssignments(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to Google Classroom');
      throw err;
    }
  }, [accessToken, requestAccessToken, syncAssignments]);

  const refreshAssignments = useCallback(async () => {
    if (!accessToken) {
      await connectAndSync();
      return;
    }
    await syncAssignments(accessToken);
  }, [accessToken, connectAndSync, syncAssignments]);

  const disconnect = useCallback(() => {
    if (accessToken && typeof window !== 'undefined') {
      const google = (window as any).google;
      if (google?.accounts?.oauth2?.revoke) {
        google.accounts.oauth2.revoke(accessToken, () => undefined);
      }
    }
    setAccessToken(null);
    resetState();
  }, [accessToken, resetState]);

  useEffect(() => {
    if (clientId) {
      ensureGoogleScript().catch(() => undefined);
    }
  }, [clientId, ensureGoogleScript]);

  return {
    assignments,
    flatAssignments,
    courses,
    loading,
    error,
    userProfile,
    lastSyncedAt,
    isConnected: Boolean(accessToken),
    connectAndSync,
    refreshAssignments,
    disconnect,
  };
};

export default useGoogleClassroom;
