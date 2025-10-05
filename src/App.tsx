import { useState } from 'react';
import { SearchView } from '@/components/SearchView';
import { BrowserView } from '@/components/BrowserView';
import { MessengerView } from '@/components/MessengerView';
import { PrivacyDashboard } from '@/components/PrivacyDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { Globe, MagnifyingGlass, ChatCircle, Shield } from '@phosphor-icons/react';

type View = 'search' | 'browser' | 'messenger' | 'privacy';

function App() {
  const [currentView, setCurrentView] = useState<View>('search');
  const [browserUrl, setBrowserUrl] = useState<string>('');

  const handleNavigate = (url: string) => {
    setBrowserUrl(url);
    setCurrentView('browser');
  };

  const getViewIcon = (view: View) => {
    switch (view) {
      case 'search': return <MagnifyingGlass className="w-5 h-5" />;
      case 'browser': return <Globe className="w-5 h-5" />;
      case 'messenger': return <ChatCircle className="w-5 h-5" />;
      case 'privacy': return <Shield className="w-5 h-5" />;
    }
  };

  const getViewTitle = (view: View) => {
    switch (view) {
      case 'search': return 'Search';
      case 'browser': return 'Browser';
      case 'messenger': return 'Messenger';
      case 'privacy': return 'Privacy';
    }
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-background">
        {/* Top Navigation */}
        <nav className="flex items-center justify-between p-4 bg-card border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-lg">PrivaChain</span>
            </div>
            
            <div className="flex gap-1">
              {(['search', 'browser', 'messenger', 'privacy'] as View[]).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView(view)}
                  className="flex items-center gap-2"
                >
                  {getViewIcon(view)}
                  <span className="hidden sm:inline">{getViewTitle(view)}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-accent/20 text-accent border-accent">
              <span className="w-2 h-2 bg-accent rounded-full mr-1 animate-pulse" />
              Decentralized
            </Badge>
            <Badge variant="outline" className="text-green-400 border-green-400">
              <Shield className="w-3 h-3 mr-1" />
              Max Privacy
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-1" />
              All Features Active
            </Badge>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {currentView === 'search' && <SearchView onNavigate={handleNavigate} />}
          {currentView === 'browser' && <BrowserView initialUrl={browserUrl} />}
          {currentView === 'messenger' && <MessengerView />}
          {currentView === 'privacy' && <PrivacyDashboard />}
        </main>
      </div>
      <Toaster />
    </>
  );
}

export default App;