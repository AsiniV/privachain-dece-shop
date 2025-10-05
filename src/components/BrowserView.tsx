import { useState, useEffect } from 'react';
import { TabData } from '@/lib/types';
import { contentResolver } from '@/lib/services';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, X, Plus, ArrowClockwise } from '@phosphor-icons/react';
import { useKV } from '@github/spark/hooks';

interface BrowserViewProps {
  initialUrl?: string;
}

export function BrowserView({ initialUrl }: BrowserViewProps) {
  const [tabs, setTabs] = useKV<TabData[]>('browser-tabs', []);
  const [activeTabId, setActiveTabId] = useKV<string>('active-tab', '');
  const [addressInput, setAddressInput] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const activeTab = tabs?.find(tab => tab.id === activeTabId);

  useEffect(() => {
    if (initialUrl && (!tabs || tabs.length === 0)) {
      createNewTab(initialUrl);
    }
  }, [initialUrl, tabs]);

  useEffect(() => {
    if (activeTab) {
      setAddressInput(activeTab.url);
    }
  }, [activeTab]);

  const createNewTab = (url?: string) => {
    const newTab: TabData = {
      id: Date.now().toString(),
      title: url ? 'Loading...' : 'New Tab',
      url: url || '',
      loading: false,
      canGoBack: false,
      canGoForward: false
    };

    setTabs(currentTabs => [...(currentTabs || []), newTab]);
    setActiveTabId(newTab.id);
    
    if (url) {
      navigateToUrl(url, newTab.id);
    }
  };

  const closeTab = (tabId: string) => {
    setTabs(currentTabs => {
      if (!currentTabs) return [];
      const newTabs = currentTabs.filter(tab => tab.id !== tabId);
      if (tabId === activeTabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      }
      return newTabs;
    });
  };

  const navigateToUrl = async (url: string, tabId?: string) => {
    const targetTabId = tabId || activeTabId;
    if (!targetTabId) return;

    setLoading(true);
    setLoadingProgress(10);

    try {
      setTabs(currentTabs => 
        (currentTabs || []).map(tab => 
          tab.id === targetTabId 
            ? { ...tab, loading: true, url }
            : tab
        )
      );

      setLoadingProgress(30);

      const result = await contentResolver.resolveContent(url);
      
      setLoadingProgress(70);

      let title = 'Untitled';
      if (result.content.includes('<title>')) {
        const titleMatch = result.content.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      } else if (url.startsWith('ipfs://')) {
        title = `IPFS: ${url.slice(7, 20)}...`;
      } else if (url.endsWith('.prv')) {
        title = url.replace(/^https?:\/\//, '');
      }

      setContent(result.content);
      setAddressInput(url);
      
      setTabs(currentTabs => 
        (currentTabs || []).map(tab => 
          tab.id === targetTabId 
            ? { ...tab, title, url, loading: false, canGoBack: true }
            : tab
        )
      );

      setLoadingProgress(100);
    } catch (error) {
      console.error('Navigation failed:', error);
      setContent(`
        <div style="padding: 2rem; text-align: center; color: #ef4444;">
          <h2>Failed to load content</h2>
          <p>${error}</p>
          <p>URL: ${url}</p>
        </div>
      `);
      
      setTabs(currentTabs => 
        (currentTabs || []).map(tab => 
          tab.id === targetTabId 
            ? { ...tab, title: 'Error', loading: false }
            : tab
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => setLoadingProgress(0), 1000);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      navigateToUrl(addressInput.trim());
    }
  };

  const reload = () => {
    if (activeTab?.url) {
      navigateToUrl(activeTab.url);
    }
  };

  const getTabTitle = (tab: TabData) => {
    if (tab.loading) return 'Loading...';
    if (tab.title.length > 20) return tab.title.slice(0, 20) + '...';
    return tab.title;
  };

  const getUrlIcon = (url: string) => {
    if (url.startsWith('ipfs://')) return '🗂️';
    if (url.endsWith('.prv')) return '🔗';
    if (url.includes('.onion')) return '🧅';
    return '🌐';
  };

  if (!tabs || tabs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to PrivaChain Browser</h2>
          <p className="text-muted-foreground mb-4">Start browsing the decentralized web</p>
          <Button onClick={() => createNewTab()}>
            <Plus className="w-4 h-4 mr-2" />
            New Tab
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Tab Bar */}
      <div className="flex bg-card border-b border-border">
        <div className="flex-1 flex overflow-x-auto">
          {(tabs || []).map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 border-r border-border cursor-pointer min-w-0 max-w-48 ${
                tab.id === activeTabId ? 'bg-background' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="text-sm">{getUrlIcon(tab.url)}</span>
              <span className="text-sm truncate flex-1">{getTabTitle(tab)}</span>
              {tab.loading && <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
              <Button
                variant="ghost"
                size="sm"
                className="w-5 h-5 p-0 hover:bg-destructive/20"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-3"
          onClick={() => createNewTab()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Address Bar */}
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          disabled={!activeTab?.canGoBack}
          className="px-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!activeTab?.canGoForward}
          className="px-2"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={reload}
          disabled={loading}
          className="px-2"
        >
          <ArrowClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        
        <form onSubmit={handleAddressSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm">
              {activeTab?.url && getUrlIcon(activeTab.url)}
            </span>
            <Input
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter IPFS hash, .prv domain, or URL..."
              className="pl-8 mono text-sm"
            />
          </div>
          <Button type="submit" disabled={loading}>
            Go
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-accent border-accent">
            <span className="w-2 h-2 bg-accent rounded-full mr-1" />
            Secure
          </Badge>
        </div>
      </div>

      {/* Loading Progress */}
      {loadingProgress > 0 && loadingProgress < 100 && (
        <Progress value={loadingProgress} className="h-1" />
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {content ? (
          <iframe
            srcDoc={content}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title={activeTab?.title || 'Content'}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-4">🌐</div>
              <p>Enter a URL to start browsing</p>
              <p className="text-sm mt-2">
                Try: ipfs://QmHash, example.prv, or https://example.com
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}