import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SmartMirror from './pages/SmartMirror';
import Settings from './pages/Settings';
import Model from './pages/Model';
import ModelSettings from './pages/ModelSettings';
import PairingScreen from './components/PairingScreen';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { GuestModeProvider, useGuestMode } from './contexts/GuestModeContext';

// Separated so useGuestMode can access the context provided by GuestModeProvider
function AppShell() {
  const { guestMode } = useGuestMode();

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="App">
        {/* Full-screen overlay during pairing; hidden in guest mode or once linked */}
        {!guestMode && <PairingScreen />}
        <Routes>
          <Route path="/"             element={<SmartMirror />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="/model"        element={<Model />} />
          <Route path="/modelsettings" element={<ModelSettings />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <GuestModeProvider>
      <ProfileProvider>
        <LanguageProvider>
          <AppShell />
        </LanguageProvider>
      </ProfileProvider>
    </GuestModeProvider>
  );
}

export default App;
