import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Screen } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AIChat from './components/AIChat';
import Inventory from './components/Inventory';
import SalesRecords from './components/SalesRecords';
import PurchaseOrders from './components/PurchaseOrders';
import Settings from './components/Settings';

function AppInner() {
  const { token } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Splash);

  const navigate = (screen: Screen) => setCurrentScreen(screen);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === Screen.Splash && (
          <SplashScreen
            key="splash"
            onNext={() => navigate(token ? Screen.Dashboard : Screen.Login)}
          />
        )}
        {currentScreen === Screen.Login && (
          <LoginScreen
            key="login"
            onLogin={() => navigate(Screen.Dashboard)}
          />
        )}
        {currentScreen === Screen.Dashboard && (
          <Dashboard key="dashboard" onNavigate={navigate} />
        )}
        {currentScreen === Screen.AIChat && (
          <AIChat key="ai-chat" onNavigate={navigate} />
        )}
        {currentScreen === Screen.Inventory && (
          <Inventory key="inventory" onNavigate={navigate} />
        )}
        {currentScreen === Screen.SalesRecords && (
          <SalesRecords key="sales-records" onNavigate={navigate} />
        )}
        {currentScreen === Screen.PurchaseOrders && (
          <PurchaseOrders key="purchase-orders" onNavigate={navigate} />
        )}
        {currentScreen === Screen.Settings && (
          <Settings
            key="settings"
            onNavigate={navigate}
            onLogout={() => navigate(Screen.Login)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}