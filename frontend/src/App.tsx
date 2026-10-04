import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Today } from './screens/Today';
import { Tenders } from './screens/Tenders';
import { Check } from './screens/Check';
import { Documents } from './screens/Documents';
import { Map } from './screens/Map';
import { AppProvider } from './context/AppState';

function App() {
  return (
    <AppProvider>
      <Router>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Header />
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/tenders" element={<Tenders />} />
          <Route path="/check" element={<Check />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/map" element={<Map />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
