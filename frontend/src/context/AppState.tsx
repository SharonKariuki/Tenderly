import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Tender, BusinessDocument, Alert, User } from '../lib/types';

interface AppContextType {
  user: User | null;
  tenders: Tender[];
  documents: BusinessDocument[];
  alerts: Alert[];
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  setTenders: (tenders: Tender[]) => void;
  setDocuments: (documents: BusinessDocument[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <AppContext.Provider
      value={{
        user,
        tenders,
        documents,
        alerts,
        isLoggedIn,
        setUser,
        setTenders,
        setDocuments,
        setAlerts,
        setIsLoggedIn,
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
