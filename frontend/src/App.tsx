import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Today } from './screens/Today';
import { Tenders } from './screens/Tenders';
import { Check } from './screens/Check';
import { Documents } from './screens/Documents';
import { Map } from './screens/Map';
import { MapSector } from './screens/MapSector';
import { TenderDetail } from './screens/TenderDetail';
import { DocumentDetail } from './screens/DocumentDetail';
import { CheckMessage } from './screens/CheckMessage';
import { CheckResult } from './screens/CheckResult';
import { Alerts } from './screens/Alerts';
import { Bids } from './screens/Bids';
import { Meetings } from './screens/Meetings';
import { Ask } from './screens/Ask';
import { Profile } from './screens/Profile';
import { ScrollToTop } from './components/ScrollToTop';
import { AppProvider } from './context/AppState';
import { AccessibilityProvider } from './context/Accessibility';
import { SpeechProvider } from './context/Speech';

function App() {
  return (
    <AppProvider>
      <AccessibilityProvider>
        <SpeechProvider>
          <Router>
            <ScrollToTop />
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            {/* The app sits in a framed white shell on the lavender page */}
            <div className="min-h-screen lg:p-6">
              <div className="mx-auto flex min-h-screen max-w-360 flex-col bg-white lg:min-h-[calc(100vh-3rem)] lg:flex-row lg:overflow-hidden lg:rounded-4xl lg:shadow-shell lg:ring-8 lg:ring-white/50">
                <Header />
                <Routes>
                  <Route path="/" element={<Today />} />
                  <Route path="/tenders" element={<Tenders />} />
                  <Route path="/tenders/:id" element={<TenderDetail />} />
                  <Route path="/ask" element={<Ask />} />
                  <Route path="/check" element={<Check />} />
                  <Route path="/check/message" element={<CheckMessage />} />
                  <Route path="/check/result/:type" element={<CheckResult />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/documents/:id" element={<DocumentDetail />} />
                  <Route path="/map" element={<Map />} />
                  <Route path="/map/:sectorId" element={<MapSector />} />
                  <Route path="/bids" element={<Bids />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </Router>
        </SpeechProvider>
      </AccessibilityProvider>
    </AppProvider>
  );
}

export default App;
