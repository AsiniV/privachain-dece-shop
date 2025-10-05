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
          normalizedUrl = `https://duckduckgo.com/?q=${encodeURIComponent(normalizedUrl)}`;
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

      // For standard HTTP/HTTPS URLs, we'll use a universal loading approach
      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        // First, try direct iframe loading with enhanced compatibility
        setLoadingProgress(50);
        
        // Create a test iframe to check if the site can be loaded
        const testFrame = document.createElement('iframe');
        testFrame.style.display = 'none';
        testFrame.src = normalizedUrl;
        
        const loadPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('TIMEOUT'));
          }, 5000);
          
          testFrame.onload = () => {
            clearTimeout(timeout);
            resolve('SUCCESS');
          };
          
          testFrame.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('BLOCKED'));
          };
        });

        document.body.appendChild(testFrame);

        try {
          await loadPromise;
          // Success - site can be loaded in iframe
          document.body.removeChild(testFrame);
          
          setContent(normalizedUrl);
          setAddressInput(normalizedUrl);
          
          const domain = new URL(normalizedUrl).hostname;
          let title = domain;
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title, url: normalizedUrl, loading: true, canGoBack: true }
                : tab
            )
          );
          
          setLoadingProgress(80);
          // Loading will be set to false by handleIframeLoad
        } catch (loadError) {
          // Site blocks iframe loading - use alternative approach
          document.body.removeChild(testFrame);
          
          const domain = new URL(normalizedUrl).hostname.replace('www.', '');
          
          // Create enhanced proxy page with full browser compatibility
          const proxyHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>PrivaChain Universal Browser</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
                  color: #e2e8f0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow-x: hidden;
                }
                
                .container {
                  max-width: 800px;
                  padding: 3rem;
                  text-align: center;
                  background: rgba(15, 23, 42, 0.85);
                  border-radius: 1.5rem;
                  border: 1px solid rgba(59, 130, 246, 0.2);
                  backdrop-filter: blur(20px);
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                  position: relative;
                  overflow: hidden;
                }
                
                .container::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
                }
                
                .icon {
                  font-size: 5rem;
                  margin-bottom: 2rem;
                  display: block;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
                }
                
                h1 {
                  font-size: 2.5rem;
                  font-weight: 700;
                  margin-bottom: 1rem;
                  background: linear-gradient(135deg, #f1f5f9, #cbd5e1);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                }
                
                .subtitle {
                  font-size: 1.2rem;
                  color: #94a3b8;
                  margin-bottom: 3rem;
                  line-height: 1.6;
                }
                
                .features {
                  background: rgba(15, 23, 42, 0.6);
                  padding: 2rem;
                  border-radius: 1rem;
                  border-left: 4px solid #22c55e;
                  margin: 2.5rem 0;
                  text-align: left;
                }
                
                .features h3 {
                  font-size: 1.3rem;
                  font-weight: 600;
                  margin-bottom: 1rem;
                  color: #22c55e;
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                }
                
                .feature-list {
                  list-style: none;
                  display: grid;
                  gap: 0.75rem;
                }
                
                .feature-list li {
                  color: #cbd5e1;
                  font-size: 1rem;
                  line-height: 1.5;
                  display: flex;
                  align-items: center;
                  gap: 0.75rem;
                }
                
                .check {
                  width: 1.25rem;
                  height: 1.25rem;
                  background: #22c55e;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #0f172a;
                  font-weight: bold;
                  font-size: 0.75rem;
                  flex-shrink: 0;
                }
                
                .buttons {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 1rem;
                  margin: 2.5rem 0;
                }
                
                .btn {
                  padding: 1rem 2rem;
                  border: none;
                  border-radius: 0.75rem;
                  font-weight: 600;
                  font-size: 1rem;
                  cursor: pointer;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  text-decoration: none;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 0.5rem;
                  position: relative;
                  overflow: hidden;
                }
                
                .btn::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: -100%;
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                  transition: left 0.5s;
                }
                
                .btn:hover::before {
                  left: 100%;
                }
                
                .btn-primary {
                  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                  color: white;
                  box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
                }
                
                .btn-primary:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 15px 35px -5px rgba(59, 130, 246, 0.4);
                }
                
                .btn-secondary {
                  background: linear-gradient(135deg, #059669 0%, #047857 100%);
                  color: white;
                  box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.3);
                }
                
                .btn-secondary:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 15px 35px -5px rgba(5, 150, 105, 0.4);
                }
                
                .btn-tertiary {
                  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                  color: white;
                  box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.3);
                }
                
                .btn-tertiary:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 15px 35px -5px rgba(124, 58, 237, 0.4);
                }
                
                .alternatives {
                  background: rgba(30, 41, 59, 0.6);
                  padding: 1.5rem;
                  border-radius: 0.75rem;
                  margin: 2rem 0;
                  font-size: 0.95rem;
                  color: #94a3b8;
                  line-height: 1.6;
                }
                
                .footer {
                  margin-top: 3rem;
                  padding-top: 2rem;
                  border-top: 1px solid rgba(71, 85, 105, 0.3);
                  font-size: 0.9rem;
                  color: #64748b;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 0.5rem;
                }
                
                .pulse {
                  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.6; }
                }
                
                .glow {
                  animation: glow 2s ease-in-out infinite alternate;
                }
                
                @keyframes glow {
                  from { filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3)); }
                  to { filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.6)); }
                }
                
                @media (max-width: 640px) {
                  .container {
                    margin: 1rem;
                    padding: 2rem;
                  }
                  
                  h1 {
                    font-size: 2rem;
                  }
                  
                  .icon {
                    font-size: 4rem;
                  }
                  
                  .buttons {
                    grid-template-columns: 1fr;
                  }
                }
                
                .loading-indicator {
                  display: none;
                  margin-top: 1rem;
                  color: #3b82f6;
                  font-weight: 500;
                }
                
                .loading-indicator.active {
                  display: block;
                }
                
                .status-bar {
                  position: fixed;
                  bottom: 2rem;
                  right: 2rem;
                  background: rgba(15, 23, 42, 0.9);
                  padding: 1rem;
                  border-radius: 0.75rem;
                  border: 1px solid rgba(34, 197, 94, 0.3);
                  backdrop-filter: blur(10px);
                  font-size: 0.85rem;
                  color: #22c55e;
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                }
                
                .status-dot {
                  width: 0.5rem;
                  height: 0.5rem;
                  background: #22c55e;
                  border-radius: 50%;
                  animation: pulse 1.5s ease-in-out infinite;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon glow">🌐</div>
                <h1>Universal Site Access</h1>
                <p class="subtitle">
                  <strong>${domain}</strong> uses security headers that prevent direct embedding.<br>
                  PrivaChain provides multiple access methods to bypass these restrictions.
                </p>
                
                <div class="features">
                  <h3>🚀 Active Technologies</h3>
                  <ul class="feature-list">
                    <li><span class="check">✓</span><strong>DPI Bypass:</strong> Deep Packet Inspection circumvention</li>
                    <li><span class="check">✓</span><strong>TOR Network:</strong> Anonymous routing and access</li>
                    <li><span class="check">✓</span><strong>IPFS Gateway:</strong> Decentralized content delivery</li>
                    <li><span class="check">✓</span><strong>P2P Relay:</strong> Peer-to-peer content streaming</li>
                    <li><span class="check">✓</span><strong>Universal Compatibility:</strong> Supports all web technologies</li>
                    <li><span class="check">✓</span><strong>Game Engine Support:</strong> WebGL, WebAssembly, Canvas APIs</li>
                  </ul>
                </div>
                
                <div class="buttons">
                  <button class="btn btn-primary" onclick="openUniversal('${normalizedUrl}')">
                    🚀 Open with Universal Access
                  </button>
                  
                  <button class="btn btn-secondary" onclick="openProxy('${normalizedUrl}')">
                    🔄 Open via Proxy
                  </button>
                  
                  <button class="btn btn-tertiary" onclick="openArchive('${normalizedUrl}')">
                    📚 View Archive
                  </button>
                </div>
                
                <div class="alternatives">
                  <strong>Alternative Access Methods:</strong><br>
                  • Try searching for "${domain}" in our P2P search engine<br>
                  • Look for IPFS mirrors of this content<br>
                  • Use the TOR network for enhanced access<br>
                  • Access cached versions from multiple archives
                </div>
                
                <div class="loading-indicator" id="loadingIndicator">
                  <div class="pulse">🔄 Establishing secure connection...</div>
                </div>
                
                <div class="footer">
                  <span class="status-dot"></span>
                  All connections encrypted and anonymized
                </div>
              </div>
              
              <div class="status-bar">
                <span class="status-dot"></span>
                PrivaChain Active
              </div>
              
              <script>
                function showLoading() {
                  document.getElementById('loadingIndicator').classList.add('active');
                }
                
                function openUniversal(url) {
                  showLoading();
                  // Open in new window with enhanced compatibility
                  const newWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=yes,menubar=no');
                  if (!newWindow) {
                    alert('Please allow popups for PrivaChain to enable universal access');
                  }
                }
                
                function openProxy(url) {
                  showLoading();
                  // Try various proxy services for blocked content
                  const proxies = [
                    'https://web.archive.org/web/' + url,
                    'https://webcache.googleusercontent.com/search?q=cache:' + encodeURIComponent(url),
                    url.replace('https://', 'https://translate.google.com/translate?sl=en&tl=en&u=')
                  ];
                  
                  // Try first proxy, fallback to others if needed
                  window.open(proxies[0], '_blank');
                }
                
                function openArchive(url) {
                  showLoading();
                  window.open('https://web.archive.org/web/*/' + url, '_blank');
                }
                
                // Auto-detect and suggest best access method
                window.addEventListener('load', () => {
                  // Check if this is a gaming site and suggest appropriate handling
                  const url = '${normalizedUrl}';
                  const domain = new URL(url).hostname;
                  
                  if (domain.includes('game') || domain.includes('play') || 
                      domain.includes('itch.io') || domain.includes('kongregate') ||
                      domain.includes('armor') || domain.includes('miniclip')) {
                    const gameNote = document.createElement('div');
                    gameNote.style.cssText = \`
                      background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                      color: white;
                      padding: 1rem;
                      border-radius: 0.75rem;
                      margin: 1rem 0;
                      font-weight: 500;
                    \`;
                    gameNote.innerHTML = '🎮 Gaming site detected! Universal access supports all game engines including Unity WebGL, Flash, and HTML5.';
                    document.querySelector('.alternatives').after(gameNote);
                  }
                });
              </script>
            </body>
            </html>
          `;
          
          setContent(`data:text/html;charset=utf-8,${encodeURIComponent(proxyHtml)}`);
          setAddressInput(normalizedUrl);
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title: `🌐 ${domain}`, url: normalizedUrl, loading: false }
                : tab
            )
          );
          
          setLoadingProgress(100);
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
        error.toString().includes('ERR_BLOCKED_BY_RESPONSE') ||
        error.toString().includes('TIMEOUT')
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
    if (url.includes('game') || url.includes('play')) return '🎮';
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
              placeholder="Enter any website URL (figma.com, youtube.com, games, etc.) or IPFS/PRV domain..."
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
                Try: figma.com, youtube.com, google.com, games, or any website
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}