import React, { useState, useEffect } from 'react';
import { View } from './types';
import { authApi, TOKEN_KEY, aiCoachApi } from './api';
import type { AuthUser } from './api';
import { assessBodyFatFromImages } from './services/gemini';
import Login from './views/Login';
import Register from './views/Register';
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
import ActionCenter from './views/ActionCenter';
import WeightRecord from './views/WeightRecord';
import TodoList from './views/TodoList';
import TrainingLog from './views/TrainingLog';
import CommunityShare from './views/CommunityShare';
import BottomNav from './components/BottomNav';
import FloatingAdvisor from './components/FloatingAdvisor';

const USER_IMAGE_KEY = 'rightnow_user_image';
const USER_FACE_IMAGE_KEY = 'rightnow_user_face_image';
const IDEAL_BODY_IMAGE_KEY = 'rightnow_ideal_body_image';

const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const hasSeenSplash = typeof localStorage !== 'undefined' ? localStorage.getItem('rightnow_has_seen_splash') === 'true' : false;
  const [currentView, setCurrentView] = useState<View>(hasSeenSplash ? View.Login : View.Splash);

  // Lifted state to persist user data across views
  const [userImage, setUserImage] = useState<string | null>(() => typeof localStorage !== 'undefined' ? localStorage.getItem(USER_IMAGE_KEY) : null);
  const [userFaceImage, setUserFaceImage] = useState<string | null>(() => localStorage.getItem(USER_FACE_IMAGE_KEY));
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bodyStyle, setBodyStyle] = useState<string>('');
  const [hasUnreadAI, setHasUnreadAI] = useState<boolean>(false);
  const [idealBodyImage, setIdealBodyImage] = useState<string | null>(() => localStorage.getItem(IDEAL_BODY_IMAGE_KEY));
  const [coachTrigger, setCoachTrigger] = useState(false);
  const [visualAssessment, setVisualAssessment] = useState<{ currentBodyFat: number; targetBodyFat: number } | null>(null);
  const [pendingVisualAssessment, setPendingVisualAssessment] = useState<{
    currentImage: string;
    targetImage: string;
    gender: 'male' | 'female';
  } | null>(null);
  const [isRunningVisualAssessment, setIsRunningVisualAssessment] = useState(false);

  const [customPhotos, setCustomPhotos] = useState<string[]>([]);
  const [shareData, setShareData] = useState<any>(null);

  const syncAuthUserState = (user: AuthUser | null) => {
    setAuthUser(user);
    setIsProfileComplete(user?.isProfileComplete ?? false);

    if (user?.gender === 'male' || user?.gender === 'female') {
      setGender(user.gender);
    } else {
      setGender('male');
    }

    setBodyStyle(user?.bodyStyle ?? '');
  };

  const getPostAuthView = (user: AuthUser) =>
    user.isProfileComplete ? View.Dashboard : View.Onboarding;

  const resetSessionState = () => {
    setUserImage(null);
    setUserFaceImage(null);
    setIsProfileComplete(false);
    setGender('male');
    setBodyStyle('');
    setHasUnreadAI(false);
    setIdealBodyImage(null);
    setCoachTrigger(false);
    setVisualAssessment(null);
    setPendingVisualAssessment(null);
    setIsRunningVisualAssessment(false);
    setCustomPhotos([]);
    localStorage.removeItem(USER_IMAGE_KEY);
    localStorage.removeItem(USER_FACE_IMAGE_KEY);
    localStorage.removeItem(IDEAL_BODY_IMAGE_KEY);
  };

  useEffect(() => {
    if (userImage) {
      localStorage.setItem(USER_IMAGE_KEY, userImage);
    } else {
      localStorage.removeItem(USER_IMAGE_KEY);
    }
  }, [userImage]);

  useEffect(() => {
    if (userFaceImage) {
      localStorage.setItem(USER_FACE_IMAGE_KEY, userFaceImage);
    } else {
      localStorage.removeItem(USER_FACE_IMAGE_KEY);
    }
  }, [userFaceImage]);

  useEffect(() => {
    if (idealBodyImage) {
      localStorage.setItem(IDEAL_BODY_IMAGE_KEY, idealBodyImage);
    } else {
      localStorage.removeItem(IDEAL_BODY_IMAGE_KEY);
    }
  }, [idealBodyImage]);

  useEffect(() => {
    if (!pendingVisualAssessment || isRunningVisualAssessment) {
      return;
    }

    let isCancelled = false;
    setIsRunningVisualAssessment(true);

    const runVisualAssessment = async () => {
      try {
        const result = await assessBodyFatFromImages(
          pendingVisualAssessment.currentImage,
          pendingVisualAssessment.targetImage,
          pendingVisualAssessment.gender,
        );

        if (!result || isCancelled) {
          return;
        }

        setVisualAssessment(result);
        setHasUnreadAI(true);
        setCoachTrigger(true);

        try {
          await aiCoachApi.updateAssessment({
            bodyFatEstimate: result.currentBodyFat,
            targetBodyFatEstimate: result.targetBodyFat,
            isVisualAssessment: true,
          });
        } catch {
          // Backend save is best-effort
        }
      } catch {
        // Visual assessment is best-effort
      } finally {
        if (!isCancelled) {
          setPendingVisualAssessment(null);
        }
        setIsRunningVisualAssessment(false);
      }
    };

    void runVisualAssessment();

    return () => {
      isCancelled = true;
    };
  }, [pendingVisualAssessment]);

  // Check for existing token on mount (stay on Splash either way)
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      authApi.me()
        .then((user) => syncAuthUserState(user))
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  const handleAuthSuccess = (user: AuthUser) => {
    syncAuthUserState(user);
    setCurrentView(getPostAuthView(user));
  };

  const handleLogout = () => {
    authApi.logout();
    syncAuthUserState(null);
    resetSessionState();
    setCurrentView(View.Login);
  };

  const handleSaveActionCenter = (photo: string | null) => {
    if (photo) {
      setCustomPhotos(prev => [photo, ...prev]);
    }
  };

  const handleSplashComplete = () => {
    localStorage.setItem('rightnow_has_seen_splash', 'true');
    // Already logged in → skip login, go to Onboarding
    if (authUser) {
      setCurrentView(getPostAuthView(authUser));
    } else {
      setCurrentView(View.Login);
    }
  };

  const handleOnboardingComplete = (image: string | null, isComplete: boolean = true, userGender: 'male' | 'female' = 'male', userBodyStyle: string = '', customIdealImage: string | null = null) => {
    if (image) {
      setUserImage(image);
    }
    if (customIdealImage) {
      setUserFaceImage(customIdealImage); // Repurposing userFaceImage for customIdealImage
    }

    setIsProfileComplete(isComplete);
    setGender(userGender);
    setBodyStyle(userBodyStyle);
    setAuthUser((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        gender: userGender,
        bodyStyle: userBodyStyle || undefined,
        isProfileComplete: isComplete,
      };
    });

    if (isComplete) {
      // Normal flow: Co-creation
      setCurrentView(View.Evolution);
    } else {
      // Skipped flow: Go to Dashboard (Incomplete State)
      setCurrentView(View.Dashboard);
    }
  };

  const renderView = () => {
    // Splash is always accessible (shown first before auth)
    if (currentView === View.Splash) {
      return <Splash onComplete={handleSplashComplete} />;
    }

    // Auth screens (no guard needed)
    if (currentView === View.Login) {
      return <Login onLoginSuccess={handleAuthSuccess} onGoRegister={() => setCurrentView(View.Register)} />;
    }
    if (currentView === View.Register) {
      return <Register onRegisterSuccess={handleAuthSuccess} onGoLogin={() => setCurrentView(View.Login)} />;
    }

    // Route guard: redirect to login if not authenticated
    if (!authUser) {
      return <Login onLoginSuccess={handleAuthSuccess} onGoRegister={() => setCurrentView(View.Register)} />;
    }

    switch (currentView) {
      case View.Onboarding:
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Dashboard:
        return <Dashboard onNavigate={setCurrentView} isProfileComplete={isProfileComplete} authUser={authUser} onLogout={handleLogout} idealImage={idealBodyImage || userFaceImage || userImage} />;
      case View.Evolution:
        return <EvolutionEngine
          userImage={userImage}
          userFaceImage={userFaceImage}
          bodyStyle={bodyStyle}
          gender={gender}
          authUser={authUser}
          onComplete={(generatedImg?: string | null) => {
            if (generatedImg) {
              setIdealBodyImage(generatedImg);
            } else if (userFaceImage) {
              setIdealBodyImage(userFaceImage);
            } else if (userImage) {
              setIdealBodyImage(userImage);
            }

            setHasUnreadAI(false);
            setCoachTrigger(false);

            if (generatedImg && userImage) {
              setPendingVisualAssessment({
                currentImage: userImage,
                targetImage: generatedImg,
                gender,
              });
              setVisualAssessment(null);
            } else {
              setPendingVisualAssessment(null);
            }

            setCurrentView(View.Dashboard);
          }}
          onNavigate={setCurrentView}
        />;
      case View.Stats:
        return <DataDashboard onNavigate={setCurrentView} />;
      case View.Diet:
        return <DietLog />;
      case View.Community:
        return <Community />;
      case View.AIChat:
        return <AIChat onBack={() => { setCoachTrigger(false); setCurrentView(View.Dashboard); }} coachTrigger={coachTrigger || hasUnreadAI} />;
      case View.EvolutionRecord:
        return <EvolutionRecord onBack={() => setCurrentView(View.Stats)} onNavigate={setCurrentView} customPhotos={customPhotos} onUploadPhoto={handleSaveActionCenter} />;
      case View.EvolutionProgress:
        return <EvolutionProgress onBack={() => setCurrentView(View.Dashboard)} />;
      case View.EvolutionGallery: // New case
        return <EvolutionGallery onBack={() => setCurrentView(View.EvolutionRecord)} customPhotos={customPhotos} />;
      case View.ActionCenter:
        return <ActionCenter onClose={() => setCurrentView(View.Dashboard)} onSave={handleSaveActionCenter} />;
      case View.WeightRecord:
        return <WeightRecord onBack={() => setCurrentView(View.Stats)} />;

      case View.TodoList:
        return <TodoList onNavigate={setCurrentView} />;

      case View.TrainingLog:
        return (
          <TrainingLog
            onNavigate={(view, data) => {
              if (data) setShareData(data);
              setCurrentView(view);
            }}
            onBack={() => setCurrentView(View.TodoList)}
          />
        );

      case View.CommunityShare:
        return (
          <CommunityShare
            onNavigate={setCurrentView}
            onBack={() => setCurrentView(View.TrainingLog)}
            shareData={shareData}
          />
        );

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
        return <Dashboard authUser={authUser} isProfileComplete={isProfileComplete} idealImage={idealBodyImage || userFaceImage || userImage} />;
    }
  };

  // Views where Floating Advisor should be hidden (Immersive views or the Chat view itself)
  const shouldHideAdvisor =
    currentView === View.Login ||
    currentView === View.Register ||
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
    currentView === View.EvolutionGallery ||
    currentView === View.WeightRecord ||
    currentView === View.ActionCenter ||
    currentView === View.TodoList ||
    currentView === View.TrainingLog ||
    currentView === View.CommunityShare;

  // Views where BottomNav should be hidden
  const shouldHideBottomNav =
    currentView === View.Login ||
    currentView === View.Register ||
    currentView === View.Splash ||
    currentView === View.Onboarding ||
    currentView === View.Evolution ||
    currentView === View.AIChat ||
    currentView === View.EvolutionRecord || // Fixed button overlaps nav
    currentView === View.EvolutionGallery ||
    currentView === View.WeightRecord ||
    currentView === View.ActionCenter ||
    currentView === View.TodoList ||
    currentView === View.TrainingLog ||
    currentView === View.CommunityShare;

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black font-serif italic text-white mb-2">
            Right<span className="text-[#B8FF00]">Now</span>
          </h1>
          <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  const coachMessage = visualAssessment
    ? (() => {
        const weeks = Math.max(8, Math.ceil((visualAssessment.currentBodyFat - visualAssessment.targetBodyFat) / 0.5));
        return `当前约 ${visualAssessment.currentBodyFat}%，目标约 ${visualAssessment.targetBodyFat}%，大约需要 ${weeks} 周。点我开始你的教练之旅！`;
      })()
    : undefined;

  return (
    <div className="antialiased bg-black text-white min-h-screen">
      {!shouldHideAdvisor && <FloatingAdvisor
        currentView={currentView}
        hasNotification={hasUnreadAI}
        coachReady={hasUnreadAI}
        coachMessage={coachMessage}
        onCoachStart={() => {
          setHasUnreadAI(false);
          setCoachTrigger(true);
          setCurrentView(View.AIChat);
        }}
        onChatClick={() => {
          setHasUnreadAI(false);
          setCoachTrigger(false);
          setCurrentView(View.AIChat);
        }}
      />}
      {renderView()}
      {!shouldHideBottomNav && <BottomNav currentView={currentView} setView={setCurrentView} />}
    </div>
  );
};

export default App;
