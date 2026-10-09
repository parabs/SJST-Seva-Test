import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DonationRecord, TrustConfig } from '../types';
import { sendGmailRestMessage, SendEmailResult } from '../services/gmailService';
import { loadAppConfig } from '../services/appConfig';

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({ prompt: 'select_account' });

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: unknown) => void;
            prompt?: string;
          }) => TokenClient;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  scope?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  uid?: string;
}

interface GmailAuthContextType {
  accessToken: string | null;
  userProfile: GoogleUserProfile | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clientId: string;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendDonationReceipt: (
    donation: DonationRecord,
    trustConfig: TrustConfig,
    options?: {
      senderEmail?: string;
      senderName?: string;
      customBlessing?: string;
      subjectPrefix?: string;
    }
  ) => Promise<SendEmailResult>;
}

const GmailAuthContext = createContext<GmailAuthContextType | undefined>(undefined);

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export function GmailAuthProvider({ children }: { children: React.ReactNode }) {
  
  const [resolvedClientId, setResolvedClientId] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem('sjst_gmail_access_token') || localStorage.getItem('sjst_gmail_access_token') || null;
  });

  const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(() => {
    const saved = sessionStorage.getItem('sjst_gmail_user_profile') || localStorage.getItem('sjst_gmail_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);


  useEffect(() => {
    let active = true;

    loadAppConfig()
      .then((config) => {
        if (!active) return;

        const clientId = config.google?.oauthClientId?.trim() || '';
        setResolvedClientId(clientId);

        if (!clientId) {
          setError(
            'Google OAuth Client ID is missing from the Google Configuration sheet (google.oauthClientId).'
          );
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load Google OAuth configuration.'
          );
        }
      })
      .finally(() => {
        if (active) setConfigLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);


  // Initialize Google Identity Services token client when available
  useEffect(() => {
    let script: HTMLScriptElement | null = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    
      const initGsi = () => {
        if (!configLoaded || !resolvedClientId) return;

        if (window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: resolvedClientId,
            scope: GMAIL_SCOPES,
            callback: async (tokenResponse: TokenResponse) => {
              if (tokenResponse.error) {
                setError(tokenResponse.error_description || tokenResponse.error);
                setIsLoading(false);
                return;
              }

              if (tokenResponse.access_token) {
                const token = tokenResponse.access_token;
                setAccessToken(token);
                sessionStorage.setItem('sjst_gmail_access_token', token);
                localStorage.setItem('sjst_gmail_access_token', token);

                // Fetch authenticated user profile
                try {
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (userInfoRes.ok) {
                    const profileData = await userInfoRes.json();
                    const profile: GoogleUserProfile = {
                      email: profileData.email,
                      name: profileData.name || profileData.email.split('@')[0],
                      picture: profileData.picture
                    };
                    setUserProfile(profile);
                    sessionStorage.setItem('sjst_gmail_user_profile', JSON.stringify(profile));
                    localStorage.setItem('sjst_gmail_user_profile', JSON.stringify(profile));
                  }
                } catch (e) {
                  console.error('Failed to fetch user profile:', e);
                }

                setIsLoading(false);
                setError(null);
                
              }
            },
            error_callback: (err: unknown) => {
              console.error('GSI token error:', err);
              setIsLoading(false);
            }
          });
          setTokenClient(client);
        } catch (err) {
          console.error('Error initializing GSI client:', err);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.head.appendChild(script);
    } else {
      initGsi();
    }
  }, [resolvedClientId, configLoaded]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && !userProfile) {
        const profile: GoogleUserProfile = {
          email: user.email || 'shreejagannathsevatrust.thane@gmail.com',
          name: user.displayName || user.email?.split('@')[0] || 'Admin',
          picture: user.photoURL || undefined,
          uid: user.uid
        };
        setUserProfile(profile);
        sessionStorage.setItem('sjst_gmail_user_profile', JSON.stringify(profile));
      }
    });
    return () => unsubscribe();
  }, [userProfile]);

  // Listen to global token expiry events triggered by failed API calls (401 Unauthorized)
  useEffect(() => {
    const handleAuthExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ reason?: string; message?: string }>;
      console.warn('Google Auth token expired or invalidated:', customEvent.detail);
      setAccessToken(null);
      sessionStorage.removeItem('sjst_gmail_access_token');
      localStorage.removeItem('sjst_gmail_access_token');
      setError('Google session expired or invalid credentials. Please re-authenticate your Google Account.');
    };

    window.addEventListener('google_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('google_auth_expired', handleAuthExpired);
  }, []);

  /**
   * Triggers the Google OAuth flow requesting gmail.send scope.
   * Tries GSI popup first; falls back seamlessly to Firebase popup with GoogleAuthProvider.
   */
  const loginWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);


    if (!resolvedClientId) {
      setError(
        'Google OAuth Client ID is not configured. Please check the Configuration sheet.'
      );
      setIsLoading(false);
      return;
    }

    // 1. If GSI Token Client is ready, use it for direct token retrieval
    if (tokenClient) {
      try {
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('GSI client request failed, attempting Firebase Popup fallback:', err);
      }
    }

    // 2. Fallback to Firebase GoogleAuthProvider Popup
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Google Sign-in succeeded, but no OAuth access token was returned.');
      }

      setAccessToken(token);
      sessionStorage.setItem('sjst_gmail_access_token', token);
      localStorage.setItem('sjst_gmail_access_token', token);

      const profile: GoogleUserProfile = {
        email: result.user.email || 'shreejagannathsevatrust.thane@gmail.com',
        name: result.user.displayName || result.user.email?.split('@')[0] || 'Admin',
        picture: result.user.photoURL || undefined,
        uid: result.user.uid
      };
      setUserProfile(profile);
      sessionStorage.setItem('sjst_gmail_user_profile', JSON.stringify(profile));
      localStorage.setItem('sjst_gmail_user_profile', JSON.stringify(profile));
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Google authentication failed';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setAccessToken(null);
    setUserProfile(null);
    setFirebaseUser(null);
    sessionStorage.removeItem('sjst_gmail_access_token');
    sessionStorage.removeItem('sjst_gmail_user_profile');
    localStorage.removeItem('sjst_gmail_access_token');
    localStorage.removeItem('sjst_gmail_user_profile');
  };

  const sendDonationReceipt = useCallback(async (
    donation: DonationRecord,
    trustConfig: TrustConfig,
    options?: {
      senderEmail?: string;
      senderName?: string;
      customBlessing?: string;
      subjectPrefix?: string;
    }
  ): Promise<SendEmailResult> => {
    if (!accessToken) {
      return {
        success: false,
        error: 'Sender Google Account is not connected. Please authenticate in Email & Receipts tab.',
        isAuthError: true
      };
    }

    const result = await sendGmailRestMessage({
      donation,
      trustConfig,
      accessToken,
      senderEmail: options?.senderEmail || userProfile?.email || trustConfig.email,
      senderName: options?.senderName || userProfile?.name || trustConfig.name,
      customBlessingMessage: options?.customBlessing,
      subjectPrefix: options?.subjectPrefix
    });

    if (result.isAuthError) {
      setAccessToken(null);
      sessionStorage.removeItem('sjst_gmail_access_token');
      localStorage.removeItem('sjst_gmail_access_token');
      setError(result.error || 'Google session expired. Please re-authenticate your Google Account.');
    }

    return result;
  }, [accessToken, userProfile]);

  return (
    <GmailAuthContext.Provider
      value={{
        accessToken,
        userProfile,
        firebaseUser,
        isAuthenticated: !!accessToken,
        isLoading,
        error,
        clientId: resolvedClientId,
        loginWithGoogle,
        logout,
        sendDonationReceipt
      }}
    >
      {children}
    </GmailAuthContext.Provider>
  );
}

export function useGmailAuth() {
  const context = useContext(GmailAuthContext);
  if (!context) {
    throw new Error('useGmailAuth must be used within a GmailAuthProvider');
  }
  return context;
}
