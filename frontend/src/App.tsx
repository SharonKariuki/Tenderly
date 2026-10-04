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
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Header />
                <Routes>
                  <Route path="/" element={<Today />} />
                  <Route path="/tenders" element={<Tenders />} />
                  <Route path="/tenders/:id" element={<TenderDetail />} />
                  <Route path="/ask" element={<Ask />} />
                  <Route path="/check" element={<Check />} />
                  <Route path="/check/message" element={<CheckMessage />} />
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
          </Router>
        </SpeechProvider>
      </AccessibilityProvider>
    </AppProvider>
  );
}

export default App;
