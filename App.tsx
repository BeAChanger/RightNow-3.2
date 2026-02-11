import React, { useState } from 'react';
import { View } from './types';
import Splash from './views/Splash';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import EvolutionEngine from './views/EvolutionEngine';
import DataDashboard from './views/DataDashboard';
import DietLog from './views/DietLog';
import Community from './views/Community';
import AIChat from './views/AIChat';
import EvolutionRecord from './views/EvolutionRecord';
import EvolutionProgress from './views/EvolutionProgress';
import CheckInType from './views/CheckInType';
import CheckInBody from './views/CheckInBody';
import CheckInSuccess from './views/CheckInSuccess';
import CheckInShare from './views/CheckInShare';
import EvolutionGallery from './views/EvolutionGallery';
import BottomNav from './components/BottomNav';
import FloatingAdvisor from './components/FloatingAdvisor';

const App: React.FC = () => {
  // Start with Splash screen
  const [currentView, setCurrentView] = useState<View>(View.Splash);

  // Lifted state to persist user data across views
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userFaceImage, setUserFaceImage] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bodyStyle, setBodyStyle] = useState<string>('');

  const handleSplashComplete = () => {
    setCurrentView(View.Onboarding);
  };

  const handleOnboardingComplete = (image: string | null, faceImage: string | null, isComplete: boolean = true, userGender: 'male' | 'female' = 'male', userBodyStyle: string = '') => {
    if (image) {
      setUserImage(image);
    }
    if (faceImage) {
      setUserFaceImage(faceImage);
    }

    setIsProfileComplete(isComplete);
    setGender(userGender);
    setBodyStyle(userBodyStyle);

    if (isComplete) {
      // Normal flow: Co-creation
      setCurrentView(View.Evolution);
    } else {
      // Skipped flow: Go to Dashboard (Incomplete State)
      setCurrentView(View.Dashboard);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case View.Splash:
        return <Splash onComplete={handleSplashComplete} />;
      case View.Onboarding:
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Dashboard:
        return <Dashboard onNavigate={setCurrentView} isProfileComplete={isProfileComplete} />;
      case View.Evolution:
        return <EvolutionEngine userImage={userImage} userFaceImage={userFaceImage} bodyStyle={bodyStyle} onComplete={() => setCurrentView(View.Dashboard)} />;
      case View.Stats:
        return <DataDashboard onNavigate={setCurrentView} />;
      case View.Diet:
        return <DietLog />;
      case View.Community:
        return <Community />;
      case View.AIChat:
        return <AIChat onBack={() => setCurrentView(View.Dashboard)} />;
      case View.EvolutionRecord:
        return <EvolutionRecord onBack={() => setCurrentView(View.Stats)} onNavigate={setCurrentView} />;
      case View.EvolutionProgress:
        return <EvolutionProgress onBack={() => setCurrentView(View.Dashboard)} />;
      case View.EvolutionGallery: // New case
        return <EvolutionGallery onBack={() => setCurrentView(View.EvolutionRecord)} />;

      // Check-In Flow
      case View.CheckInType:
        return <CheckInType onClose={() => setCurrentView(View.Dashboard)} onNext={() => setCurrentView(View.CheckInSuccess)} />;
      case View.CheckInBody:
        return <CheckInBody onBack={() => setCurrentView(View.CheckInSuccess)} onSave={() => setCurrentView(View.CheckInSuccess)} />;
      case View.CheckInSuccess:
        return <CheckInSuccess onNavigate={setCurrentView} onClose={() => setCurrentView(View.Dashboard)} />;
      case View.CheckInShare:
        return <CheckInShare onClose={() => setCurrentView(View.Dashboard)} />;

      default:
        return <Dashboard />;
    }
  };

  // Views where Floating Advisor should be hidden (Immersive views or the Chat view itself)
  const shouldHideAdvisor =
    currentView === View.Onboarding ||
    currentView === View.Splash ||
    currentView === View.Evolution ||
    currentView === View.AIChat ||
    currentView === View.EvolutionRecord ||
    currentView === View.EvolutionProgress ||
    currentView === View.CheckInType ||
    currentView === View.CheckInBody ||
    currentView === View.CheckInSuccess ||
    currentView === View.CheckInShare ||
    currentView === View.EvolutionGallery; // Hide on Gallery

  // Views where BottomNav should be hidden
  const shouldHideBottomNav =
    currentView === View.Splash ||
    currentView === View.Onboarding ||
    currentView === View.Evolution ||
    currentView === View.AIChat ||
    currentView === View.EvolutionRecord || // Fixed button overlaps nav
    currentView === View.EvolutionGallery;

  return (
    <div className="antialiased bg-black text-white min-h-screen">
      {!shouldHideAdvisor && <FloatingAdvisor onChatClick={() => setCurrentView(View.AIChat)} />}
      {renderView()}
      {!shouldHideBottomNav && <BottomNav currentView={currentView} setView={setCurrentView} />}
    </div>
  );
};

export default App;