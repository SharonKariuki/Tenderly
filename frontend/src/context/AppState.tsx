import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Tender, BusinessDocument, Alert, User, AgpoCategory, Lang } from '../lib/types';
import { accessApi } from '../api/client';
import { readStored, writeStored } from '../lib/storage';
import { mockAlerts, BID_STEPS } from '../data/mock';

interface Profile {
  ownerName: string;
  businessName: string;
  agpoCategory: AgpoCategory;
  // Language the easy read summary is read and shown in.
  listenLang: Lang;
}

const PROFILE_KEY = 'tr_profile';
const DEFAULT_PROFILE: Profile = {
  ownerName: 'Sharon Kariuki',
  businessName: 'Tech Solutions Ltd',
  agpoCategory: 'women',
  listenLang: 'en',
};

interface AppContextType {
  user: User | null;
  tenders: Tender[];
  documents: BusinessDocument[];
  alerts: Alert[];
  isLoggedIn: boolean;
  profile: Profile;
  setUser: (user: User | null) => void;
  setTenders: (tenders: Tender[]) => void;
  setDocuments: (documents: BusinessDocument[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  updateProfile: (changes: Partial<Profile>) => void;
  markAlertRead: (id: number) => void;
  markAllAlertsRead: () => void;
  /** Done or not, for each step in BID_STEPS. */
  bidSteps: boolean[];
  toggleBidStep: (index: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [bidSteps, setBidSteps] = useState<boolean[]>(() => BID_STEPS.map((_, i) => i === 0));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>(() => readStored(PROFILE_KEY, DEFAULT_PROFILE));

  useEffect(() => {
    accessApi
      .getAgpo()
      .then(({ data }) => setProfile((p) => ({ ...p, agpoCategory: data.agpo_category })))
      .catch(() => {
        // Not signed in or offline: keep this browser's copy.
      });
  }, []);

  const updateProfile = (changes: Partial<Profile>) => {
    setProfile((current) => {
      const next = { ...current, ...changes };
      writeStored(PROFILE_KEY, next);
      return next;
    });
    if (changes.agpoCategory) {
      accessApi.setAgpoCategory(changes.agpoCategory).catch(() => {});
    }
  };

  const markAlertRead = (id: number) => setAlerts((list) => list.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  const markAllAlertsRead = () => setAlerts((list) => list.map((a) => ({ ...a, isRead: true })));
  const toggleBidStep = (index: number) => setBidSteps((steps) => steps.map((done, i) => (i === index ? !done : done)));

  return (
    <AppContext.Provider
      value={{
        user,
        tenders,
        documents,
        alerts,
        isLoggedIn,
        profile,
        setUser,
        setTenders,
        setDocuments,
        setAlerts,
        setIsLoggedIn,
        updateProfile,
        markAlertRead,
        markAllAlertsRead,
        bidSteps,
        toggleBidStep,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
