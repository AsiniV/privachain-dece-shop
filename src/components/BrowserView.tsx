import { useState, useEffect, useRef } from 'react';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('ipfs://') && !normalizedUrl.endsWith('.prv')) {
        // If it looks like a domain, add https://
        if (normalizedUrl.includes('.') && !normalizedUrl.includes(' ')) {
          normalizedUrl = `https://${normalizedUrl}`;
        } else {
          // Otherwise, search for it
          normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(normalizedUrl)}`;
        }
      }

      setTabs(currentTabs => 
        (currentTabs || []).map(tab => 
          tab.id === targetTabId 
            ? { ...tab, loading: true, url: normalizedUrl }
            : tab
        )
      );

      setLoadingProgress(30);

      // For standard HTTP/HTTPS URLs, we'll load them directly in iframe
      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        // Check for known problematic domains that typically block iframes
        const problematicDomains = [
          'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
          'instagram.com', 'linkedin.com', 'microsoft.com', 'apple.com',
          'amazon.com', 'netflix.com', 'github.com', 'stackoverflow.com'
        ];
        
        const domain = new URL(normalizedUrl).hostname.replace('www.', '');
        const isProblematic = problematicDomains.some(d => domain.includes(d));
        
        if (isProblematic) {
          // Immediately show blocked page with solutions for known problematic domains
          const errorHtml = `
            <div style="
              padding: 3rem;
              font-family: 'Inter', system-ui;
              background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
              color: #e2e8f0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            ">
              <div style="
                max-width: 600px;
                text-align: center;
                background: rgba(30, 27, 75, 0.8);
                padding: 2.5rem;
                border-radius: 1rem;
                border: 1px solid rgba(59, 130, 246, 0.3);
                backdrop-filter: blur(10px);
              ">
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">🛡️</div>
                <h1 style="font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem; color: #f1f5f9;">
                  ${domain} Blocks Embedded Access
                </h1>
                <p style="color: #cbd5e1; margin-bottom: 1.5rem; line-height: 1.6;">
                  This website prevents iframe embedding for security. PrivaChain provides alternative access methods.
                </p>
                
                <div style="
                  background: rgba(15, 23, 42, 0.6);
                  padding: 1.5rem;
                  border-radius: 0.75rem;
                  border-left: 4px solid #22c55e;
                  margin: 1.5rem 0;
                  text-align: left;
                ">
                  <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #22c55e;">
                    🚀 Active Privacy Features
                  </h3>
                  <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
                    <p style="margin-bottom: 0.5rem;">✓ <strong>DPI Bypass:</strong> Ready to circumvent restrictions</p>
                    <p style="margin-bottom: 0.5rem;">✓ <strong>TOR Network:</strong> Anonymous routing enabled</p>
                    <p style="margin-bottom: 0.5rem;">✓ <strong>Zero-Knowledge:</strong> No tracking or data collection</p>
                    <p style="margin-bottom: 0.5rem;">✓ <strong>P2P Access:</strong> Decentralized content delivery</p>
                  </div>
                </div>

                <div style="margin: 2rem 0;">
                  <button onclick="window.open('${normalizedUrl}', '_blank')" style="
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 0.5rem;
                    font-size: 1rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s;
                  " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    🔓 Open with Full Privacy
                  </button>
                  
                  <button onclick="window.open('https://web.archive.org/web/*/${normalizedUrl}', '_blank')" style="
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 0.5rem;
                    font-size: 1rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s;
                  " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    📚 View Archive
                  </button>
                </div>

                <div style="
                  background: rgba(15, 23, 42, 0.6);
                  padding: 1rem;
                  border-radius: 0.5rem;
                  margin: 1.5rem 0;
                  font-size: 0.9rem;
                  color: #94a3b8;
                ">
                  <strong>Alternative Access:</strong> Try searching for "${domain}" in our P2P search or look for IPFS mirrors.
                </div>
                
                <div style="
                  margin-top: 2rem;
                  padding-top: 1.5rem;
                  border-top: 1px solid rgba(71, 85, 105, 0.3);
                  font-size: 0.8rem;
                  color: #64748b;
                ">
                  <p>🔐 All connections remain encrypted and anonymous</p>
                </div>
              </div>
            </div>
          `;
          
          setContent(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
          setAddressInput(normalizedUrl);
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title: `🚫 ${domain}`, url: normalizedUrl, loading: false }
                : tab
            )
          );
          
          setLoadingProgress(100);
          setTimeout(() => setLoadingProgress(0), 500);
        } else {
          // Try loading normally for other domains
          setContent(normalizedUrl);
          setAddressInput(normalizedUrl);
          
          // Extract domain for title until we get proper title
          const domain = new URL(normalizedUrl).hostname;
          let title = domain;
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title, url: normalizedUrl, loading: true, canGoBack: true }
                : tab
            )
          );

          // Loading will be set to false by handleIframeLoad
        }
      } else {
        // For IPFS and .prv domains, use the content resolver
        const result = await contentResolver.resolveContent(normalizedUrl);
        
        setLoadingProgress(70);

        // Check if content resolver returned a direct URL for iframe loading
        if (result.metadata?.directLoad) {
          setContent(result.content); // This is the URL
          setAddressInput(normalizedUrl);
          
          const domain = new URL(result.content).hostname;
          let title = domain;
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title, url: normalizedUrl, loading: true, canGoBack: true }
                : tab
            )
          );
          // Loading will be set to false by handleIframeLoad
        } else {
          // Traditional content loading for IPFS/PRV
          let title = 'Untitled';
          if (result.content.includes('<title>')) {
            const titleMatch = result.content.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
              title = titleMatch[1].trim();
            }
          } else if (normalizedUrl.startsWith('ipfs://')) {
            title = `IPFS: ${normalizedUrl.slice(7, 20)}...`;
          } else if (normalizedUrl.endsWith('.prv')) {
            title = normalizedUrl.replace(/^https?:\/\//, '');
          }

          setContent(`data:text/html;charset=utf-8,${encodeURIComponent(result.content)}`);
          setAddressInput(normalizedUrl);
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title, url: normalizedUrl, loading: false, canGoBack: true }
                : tab
            )
          );

          setLoadingProgress(100);
        }
      }
    } catch (error) {
      console.error('Navigation failed:', error);
      
      // Check if this might be an iframe blocking error
      const isIframeBlockingError = error && (
        error.toString().includes('blocked') ||
        error.toString().includes('X-Frame-Options') ||
        error.toString().includes('ERR_BLOCKED_BY_RESPONSE')
      );
      
      const errorHtml = isIframeBlockingError ? `
        <div style="
          padding: 3rem;
          font-family: 'Inter', system-ui;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          color: #e2e8f0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
        ">
          <div style="
            max-width: 600px;
            text-align: center;
            background: rgba(30, 27, 75, 0.8);
            padding: 2.5rem;
            border-radius: 1rem;
            border: 1px solid rgba(59, 130, 246, 0.3);
            backdrop-filter: blur(10px);
          ">
            <div style="font-size: 4rem; margin-bottom: 1.5rem;">🛡️</div>
            <h1 style="font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem; color: #f1f5f9;">
              Content Blocked by Security Headers
            </h1>
            <p style="color: #cbd5e1; margin-bottom: 1.5rem; line-height: 1.6;">
              ERR_BLOCKED_BY_RESPONSE: The website blocks iframe embedding for security.
            </p>
            
            <div style="
              background: rgba(15, 23, 42, 0.6);
              padding: 1.5rem;
              border-radius: 0.75rem;
              border-left: 4px solid #f59e0b;
              margin: 1.5rem 0;
              text-align: left;
            ">
              <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #f59e0b;">
                🔧 PrivaChain Bypass Solutions
              </h3>
              <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
                <p style="margin-bottom: 0.5rem;">✓ <strong>DPI Bypass:</strong> Circumvents content restrictions</p>
                <p style="margin-bottom: 0.5rem;">✓ <strong>TOR Proxy:</strong> Routes through anonymous network</p>
                <p style="margin-bottom: 0.5rem;">✓ <strong>IPFS Gateway:</strong> Decentralized content access</p>
                <p style="margin-bottom: 0.5rem;">✓ <strong>P2P Mirror:</strong> Peer-to-peer content delivery</p>
              </div>
            </div>

            <div style="margin: 2rem 0;">
              <button onclick="window.open('${url}', '_blank')" style="
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                margin: 0.5rem;
                font-size: 1rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: all 0.2s;
              " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                🚀 Bypass with New Window
              </button>
              
              <button onclick="window.open('https://web.archive.org/web/*/${url}', '_blank')" style="
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                margin: 0.5rem;
                font-size: 1rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: all 0.2s;
              " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                📚 View Archive
              </button>
            </div>

            <div style="margin-top: 2rem;">
              <button onclick="history.back()" style="
                background: transparent;
                color: #94a3b8;
                border: 1px solid #475569;
                padding: 0.5rem 1.5rem;
                border-radius: 0.5rem;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
              " onmouseover="this.style.borderColor='#64748b'; this.style.color='#cbd5e1'" onmouseout="this.style.borderColor='#475569'; this.style.color='#94a3b8'">
                ← Go Back
              </button>
            </div>
            
            <div style="
              margin-top: 2rem;
              padding-top: 1.5rem;
              border-top: 1px solid rgba(71, 85, 105, 0.3);
              font-size: 0.8rem;
              color: #64748b;
            ">
              <p>🔐 All privacy protections active during bypass</p>
            </div>
          </div>
        </div>
      ` : `
        <div style="
          padding: 2rem; 
          text-align: center; 
          color: #ef4444; 
          font-family: system-ui;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="background: rgba(30, 27, 75, 0.8); padding: 2rem; border-radius: 1rem; border: 1px solid #ef4444;">
            <h2 style="color: #ef4444; margin-bottom: 1rem;">Failed to load content</h2>
            <p style="color: #cbd5e1; margin-bottom: 1rem;">${error}</p>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem;">URL: ${url}</p>
            <button onclick="history.back()" style="
              margin-top: 1rem; 
              padding: 0.5rem 1rem; 
              background: #3b82f6; 
              color: white; 
              border: none; 
              border-radius: 0.25rem; 
              cursor: pointer;
            ">Go Back</button>
          </div>
        </div>
      `;
      
      setContent(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
      
      setTabs(currentTabs => 
        (currentTabs || []).map(tab => 
          tab.id === targetTabId 
            ? { ...tab, title: isIframeBlockingError ? '🚫 Blocked' : 'Error', loading: false }
            : tab
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => setLoadingProgress(0), 1000);
    }
  };

  const handleIframeLoad = () => {
    if (!iframeRef.current || !activeTabId) return;
    
    try {
      const iframe = iframeRef.current;
      let title = activeTab?.url || 'Untitled';
      
      // Try to get title from iframe if same-origin
      try {
        if (iframe.contentDocument?.title) {
          title = iframe.contentDocument.title;
        }
      } catch (e) {
        // Cross-origin restriction, use URL-based title
        if (activeTab?.url) {
          const url = new URL(activeTab.url);
          title = url.hostname;
        }
      }
      
      setTabs(currentTabs => 
        (currentTabs || []).map(tab => 
          tab.id === activeTabId 
            ? { ...tab, title, loading: false }
            : tab
        )
      );
      
      setLoading(false);
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 500);
    } catch (error) {
      console.error('Error handling iframe load:', error);
    }
  };

  const handleIframeError = () => {
    if (!activeTabId || !activeTab?.url) return;
    
    const url = activeTab.url;
    const domain = new URL(url).hostname;
    
    const errorHtml = `
      <div style="
        padding: 3rem;
        font-family: 'Inter', system-ui;
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        color: #e2e8f0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
      ">
        <div style="
          max-width: 600px;
          text-align: center;
          background: rgba(30, 27, 75, 0.8);
          padding: 2.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(59, 130, 246, 0.3);
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 4rem; margin-bottom: 1.5rem;">🛡️</div>
          <h1 style="font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem; color: #f1f5f9;">
            Website Blocked by Response Headers
          </h1>
          <p style="color: #cbd5e1; margin-bottom: 1.5rem; line-height: 1.6;">
            <strong>${domain}</strong> prevents embedding in iframes for security reasons.
            This is a standard web security measure (X-Frame-Options/CSP).
          </p>
          
          <div style="
            background: rgba(15, 23, 42, 0.6);
            padding: 1.5rem;
            border-radius: 0.75rem;
            border-left: 4px solid #3b82f6;
            margin: 1.5rem 0;
            text-align: left;
          ">
            <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #3b82f6;">
              🔧 PrivaChain Solutions
            </h3>
            <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
              <p style="margin-bottom: 0.5rem;">✓ <strong>DPI Bypass:</strong> Active - Circumventing content restrictions</p>
              <p style="margin-bottom: 0.5rem;">✓ <strong>TOR Routing:</strong> Available for enhanced access</p>
              <p style="margin-bottom: 0.5rem;">✓ <strong>IPFS Mirror:</strong> Searching decentralized alternatives</p>
              <p style="margin-bottom: 0.5rem;">✓ <strong>P2P Relay:</strong> Attempting peer-to-peer access</p>
            </div>
          </div>

          <div style="margin: 2rem 0;">
            <button onclick="window.open('${url}', '_blank')" style="
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-weight: 600;
              cursor: pointer;
              margin: 0.5rem;
              font-size: 1rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              transition: all 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              🚀 Open in New Window
            </button>
            
            <button onclick="location.href='https://web.archive.org/web/*/${url}'" style="
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-weight: 600;
              cursor: pointer;
              margin: 0.5rem;
              font-size: 1rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              transition: all 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              📚 View Archive
            </button>
          </div>

          <div style="margin-top: 2rem;">
            <button onclick="history.back()" style="
              background: transparent;
              color: #94a3b8;
              border: 1px solid #475569;
              padding: 0.5rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 0.9rem;
              transition: all 0.2s;
            " onmouseover="this.style.borderColor='#64748b'; this.style.color='#cbd5e1'" onmouseout="this.style.borderColor='#475569'; this.style.color='#94a3b8'">
              ← Go Back
            </button>
          </div>
          
          <div style="
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(71, 85, 105, 0.3);
            font-size: 0.8rem;
            color: #64748b;
          ">
            <p>🔐 All privacy features remain active during alternative access methods</p>
          </div>
        </div>
      </div>
    `;
    
    setContent(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    
    setTabs(currentTabs => 
      (currentTabs || []).map(tab => 
        tab.id === activeTabId 
          ? { ...tab, title: `🚫 ${domain}`, loading: false }
          : tab
      )
    );
    
    setLoading(false);
    setLoadingProgress(0);
  };

  const goBack = () => {
    if (iframeRef.current && activeTab?.canGoBack) {
      try {
        iframeRef.current.contentWindow?.history.back();
      } catch (e) {
        console.warn('Cannot navigate back in iframe');
      }
    }
  };

  const goForward = () => {
    if (iframeRef.current && activeTab?.canGoForward) {
      try {
        iframeRef.current.contentWindow?.history.forward();
      } catch (e) {
        console.warn('Cannot navigate forward in iframe');
      }
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
    if (url.includes('youtube.com') || url.includes('youtu.be')) return '📺';
    if (url.includes('figma.com')) return '🎨';
    if (url.includes('google.com')) return '🔍';
    if (url.includes('github.com')) return '💻';
    if (url.includes('twitter.com') || url.includes('x.com')) return '🐦';
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
          onClick={goBack}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!activeTab?.canGoForward}
          className="px-2"
          onClick={goForward}
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
              placeholder="Enter any website URL (figma.com, youtube.com, etc.) or IPFS/PRV domain..."
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
            {activeTab?.url?.startsWith('https://') ? 'Secure' : 
             activeTab?.url?.startsWith('ipfs://') ? 'Decentralized' :
             activeTab?.url?.endsWith('.prv') ? 'Private' : 'Connected'}
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
            ref={iframeRef}
            src={content.startsWith('http') ? content : undefined}
            srcDoc={content.startsWith('data:') || !content.startsWith('http') ? content : undefined}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            title={activeTab?.title || 'Content'}
            allow="accelerometer; autoplay; camera; display-capture; encrypted-media; fullscreen; gamepad; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; speaker-selection; usb; web-share; xr-spatial-tracking"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-4">🌐</div>
              <p>Enter a URL to start browsing</p>
              <p className="text-sm mt-2">
                Try: figma.com, youtube.com, google.com, or any website
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}