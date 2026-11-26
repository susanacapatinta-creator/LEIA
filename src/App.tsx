import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { HomeView } from './components/modules/HomeView';
import { PdfManagerView } from './components/modules/PdfManagerView';
import { GuidedReadingView } from './components/modules/GuidedReadingView';
import { ReadAloudView } from './components/modules/ReadAloudView';
import { ExamGeneratorView } from './components/modules/ExamGeneratorView';
import { VocabularyView } from './components/modules/VocabularyView';
import { LiteraryAnalysisView } from './components/modules/LiteraryAnalysisView';
import { CharactersView } from './components/modules/CharactersView';
import { ProgressView } from './components/modules/ProgressView';
import { SettingsView } from './components/modules/SettingsView';
import { OfflineIndicator, MobileInstallBanner } from './components/pwa/PWAInstallUI';
import { AuthModal } from './components/auth/AuthModal';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Error inesperado en la interfaz.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Algo salió mal en esta vista</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white cursor-pointer"
            >
              Reintentar ahora
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainContent: React.FC = () => {
  const { activeModule } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeView />;
      case 'documents':
        return <PdfManagerView />;
      case 'guided_reading':
        return <GuidedReadingView />;
      case 'read_aloud':
        return <ReadAloudView />;
      case 'exam':
        return <ExamGeneratorView />;
      case 'vocabulary':
        return <VocabularyView />;
      case 'literary_analysis':
        return <LiteraryAnalysisView />;
      case 'characters':
        return <CharactersView />;
      case 'progress':
        return <ProgressView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <div className="flex flex-1">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderModule()}
        </main>
      </div>
      <MobileInstallBanner />
      <OfflineIndicator />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </AppErrorBoundary>
  );
}
