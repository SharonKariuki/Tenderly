import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Today } from './screens/Today';
import { Tenders } from './screens/Tenders';
import { Check } from './screens/Check';
import { Documents } from './screens/Documents';
import { Map } from './screens/Map';
import { AppProvider } from './context/AppState';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-white/50 via-white/30 to-white/40">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar - Hidden on mobile, visible on lg+ */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <div
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/tenders" element={<Tenders />} />
            <Route path="/check" element={<Check />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/map" element={<Map />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout />
      </Router>
    </AppProvider>
  );
}

export default App;
