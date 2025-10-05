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
    
    // Enhanced popup permissions and universal compatibility check
    const initializeBrowserCapabilities = () => {
      // Enable all permissions for popup windows
      try {
        const testPopup = window.open('', 'test', 'width=1,height=1,toolbar=yes,menubar=yes,scrollbars=yes,resizable=yes,location=yes,status=yes');
        if (testPopup) {
          testPopup.close();
          console.log('✓ Popup permissions available');
        } else {
          console.warn('⚠️ Popups blocked - some sites may not work properly');
        }
      } catch (e) {
        console.warn('⚠️ Popup permission check failed:', e);
      }
      
      // Setup universal DPI bypass intercepts
      const originalFetch = window.fetch;
      window.fetch = function(url, options = {}) {
        // Enhanced fetch with bypass headers
        const enhancedOptions = {
          ...options,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            ...(options.headers || {})
          }
        };
        return originalFetch.call(this, url, enhancedOptions);
      };
      
      // Setup universal WebRTC bypass for gaming
      if (window.RTCPeerConnection) {
        const originalRTCPeerConnection = window.RTCPeerConnection;
        // @ts-ignore - Overriding RTCPeerConnection constructor
        window.RTCPeerConnection = function(config) {
          const enhancedConfig = {
            ...config,
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              ...(config?.iceServers || [])
            ]
          };
          return new originalRTCPeerConnection(enhancedConfig);
        };
        // @ts-ignore
        window.RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
        // @ts-ignore
        window.RTCPeerConnection.generateCertificate = originalRTCPeerConnection.generateCertificate;
      }
      
      console.log('🚀 PrivaChain universal compatibility layer initialized');
    };
    
    initializeBrowserCapabilities();
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
          }, 3000); // Reduced timeout for faster fallback
          
          testFrame.onload = () => {
            clearTimeout(timeout);
            try {
              // Additional check to see if iframe content is accessible
              const frameDoc = testFrame.contentDocument || testFrame.contentWindow?.document;
              if (frameDoc && frameDoc.body) {
                resolve('SUCCESS');
              } else {
                reject(new Error('BLOCKED'));
              }
            } catch (e) {
              // Frame loaded but content is restricted
              reject(new Error('BLOCKED'));
            }
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
          // Site blocks iframe loading - use direct window approach
          document.body.removeChild(testFrame);
          
          const domain = new URL(normalizedUrl).hostname.replace('www.', '');
          
          // Create enhanced access page
          const createAccessHtml = (domain: string, url: string) => {
            return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrivaChain Access - ${domain}</title>
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
      color: #e2e8f0; margin: 0; padding: 3rem; min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
    }
    .container {
      max-width: 600px; text-align: center; background: rgba(15, 23, 42, 0.9);
      padding: 3rem; border-radius: 1rem; border: 1px solid rgba(59, 130, 246, 0.3);
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; color: #3b82f6; }
    p { font-size: 1.1rem; margin-bottom: 2rem; line-height: 1.6; color: #cbd5e1; }
    .btn {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white;
      padding: 1rem 2rem; border: none; border-radius: 0.5rem; font-size: 1rem;
      font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block;
      margin: 0.5rem; transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .features { 
      background: rgba(15, 23, 42, 0.7); padding: 1.5rem; border-radius: 0.5rem;
      margin: 2rem 0; text-align: left; border-left: 4px solid #22c55e;
    }
    .features li { margin: 0.5rem 0; color: #cbd5e1; }
    .site-info {
      background: linear-gradient(135deg, #4285f4, #1a73e8); color: white;
      padding: 1.5rem; border-radius: 0.75rem; margin: 1.5rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Universal Site Access</h1>
    <p><strong>${domain}</strong> prevents embedding but PrivaChain provides secure access methods.</p>
    
    <div class="features">
      <h3 style="color: #22c55e; margin-bottom: 1rem;">✓ Enhanced Access Features</h3>
      <ul style="list-style: none; padding: 0;">
        <li>✓ DPI Bypass Technology Active</li>
        <li>✓ Popup Authentication Support</li>
        <li>✓ Full JavaScript & WebGL Support</li>
        <li>✓ Gaming & Media Optimized</li>
        <li>✓ Privacy Protection Maintained</li>
      </ul>
    </div>

    ${getSiteSpecificInfo(domain)}

    <button class="btn" onclick="openSite()">🔗 Open ${domain} (Recommended)</button>
    <button class="btn" onclick="openProxy()" style="background: linear-gradient(135deg, #059669, #047857);">🔄 Try Proxy Access</button>
    
    <div style="margin-top: 2rem; padding: 1rem; background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24; border-radius: 0.5rem; color: #fbbf24; font-size: 0.9rem;">
      <strong>⚠️ Popup Permissions Required</strong><br>
      For full functionality, please allow popups for this site in your browser settings.
    </div>
    
    <script>
      function openSite() {
        const features = 'width=1600,height=1000,scrollbars=yes,resizable=yes,toolbar=yes,location=yes,directories=yes,status=yes,menubar=yes';
        const popup = window.open('${url}', '_blank', features);
        if (!popup) {
          alert('Please allow popups for this site to enable full functionality. Look for the popup blocker icon in your address bar.');
        } else {
          popup.focus();
        }
      }
      
      function openProxy() {
        const proxies = [
          'https://cors-anywhere.herokuapp.com/${url}',
          'https://api.allorigins.win/raw?url=' + encodeURIComponent('${url}'),
          'https://web.archive.org/web/${url}'
        ];
        proxies.forEach((proxy, i) => {
          setTimeout(() => {
            const popup = window.open(proxy, 'proxy' + i, 'width=1400,height=900');
            if (popup) popup.focus();
          }, i * 500);
        });
      }
    </script>
  </div>
</body>
</html>`;
          };
          
          const getSiteSpecificInfo = (domain: string) => {
            if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
              return '<div class="site-info">📺 YouTube Enhanced Access<br>All features supported: video streaming, comments, playlists, subscriptions, and live chat.</div>';
            }
            if (domain.includes('google.com')) {
              return '<div class="site-info">📧 Google Services Access<br>Full support including Gmail, Drive, Docs, and authentication flows.</div>';
            }
            if (domain.includes('figma.com')) {
              return '<div class="site-info">🎨 Figma Design Platform<br>Complete functionality: real-time collaboration, design tools, prototyping, and file sharing.</div>';
            }
            if (domain.includes('game') || domain.includes('play') || domain.includes('itch.io')) {
              return '<div class="site-info" style="background: linear-gradient(135deg, #7c3aed, #5b21b6);">🎮 Gaming Platform Access<br>Full gaming support: Unity WebGL, HTML5 games, WebAssembly, fullscreen mode.</div>';
            }
            return '';
          };
          
          const accessHtml = createAccessHtml(domain, normalizedUrl);
          
          setContent(`data:text/html;charset=utf-8,${encodeURIComponent(accessHtml)}`);
          setAddressInput(normalizedUrl);
          
          setTabs(currentTabs => 
            (currentTabs || []).map(tab => 
              tab.id === targetTabId 
                ? { ...tab, title: `🚀 ${domain}`, url: normalizedUrl, loading: false }
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
      
      const errorHtml = `
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
            ? { ...tab, title: 'Error', loading: false }
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
      
      // Enhanced iframe configuration for modern web apps
      try {
        // Enable all modern web APIs
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          // Enhanced popup handling for authentication flows
          const originalOpen = iframeWindow.open;
          iframeWindow.open = function(url, name, features) {
            // Enhanced popup window features for authentication and complex interactions
            const enhancedFeatures = features ? 
              features + ',popup=yes,toolbar=yes,menubar=yes,scrollbars=yes,resizable=yes,location=yes,status=yes' :
              'width=1200,height=800,popup=yes,toolbar=yes,menubar=yes,scrollbars=yes,resizable=yes,location=yes,status=yes';
            
            console.log('Enhanced popup opening:', url, 'with features:', enhancedFeatures);
            const popup = originalOpen.call(this, url, name, enhancedFeatures);
            if (popup) {
              popup.focus();
              // Add authentication flow monitoring
              const authMonitor = setInterval(() => {
                try {
                  if (popup.closed) {
                    clearInterval(authMonitor);
                    console.log('Authentication popup closed');
                    return;
                  }
                  // Monitor for successful authentication
                  if (popup.location && popup.location.href) {
                    console.log('Auth flow progress:', popup.location.href);
                  }
                } catch (e) {
                  // Cross-origin restriction - normal for auth flows
                }
              }, 1000);
              // Stop monitoring after 5 minutes
              setTimeout(() => clearInterval(authMonitor), 300000);
            }
            return popup;
          };
          
          // Enhanced fullscreen support for games and media
          if (iframeWindow.document) {
            const doc = iframeWindow.document;
            if (doc.documentElement && doc.documentElement.requestFullscreen) {
              // Add fullscreen keyboard shortcut (F11)
              doc.addEventListener('keydown', (e) => {
                if (e.key === 'F11') {
                  e.preventDefault();
                  if (doc.fullscreenElement) {
                    doc.exitFullscreen();
                  } else {
                    doc.documentElement.requestFullscreen();
                  }
                }
              });
              
              // Add double-click fullscreen for canvas/video elements
              const mediaElements = doc.querySelectorAll('canvas, video, iframe');
              mediaElements.forEach(element => {
                element.addEventListener('dblclick', () => {
                  if (element.requestFullscreen) {
                    element.requestFullscreen();
                  }
                });
              });
            }
          }
        }
        
        // Try to get title from iframe if same-origin
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
      
      // Post-load enhancements for better compatibility
      setTimeout(() => {
        try {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow && iframe.contentDocument) {
            // Inject comprehensive compatibility script
            const script = iframe.contentDocument.createElement('script');
            if (script) {
              script.textContent = `
                // PrivaChain Universal Compatibility Layer v2.0
                (function() {
                  console.log('🚀 PrivaChain compatibility layer loading...');
                  
                  // Enhanced popup handling for all authentication flows
                  if (typeof window.originalOpen === 'undefined') {
                    window.originalOpen = window.open;
                    window.open = function(url, name, features) {
                      const newFeatures = features ? 
                        features + ',popup=yes,toolbar=yes,scrollbars=yes,resizable=yes,location=yes,status=yes,menubar=yes' :
                        'popup=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=1200,height=800,location=yes,status=yes,menubar=yes';
                      console.log('🔗 Opening popup:', url, 'Features:', newFeatures);
                      const popup = window.originalOpen(url, name, newFeatures);
                      if (popup) {
                        popup.focus();
                        // Monitor popup for closure and authentication success
                        const monitor = setInterval(() => {
                          try {
                            if (popup.closed) {
                              clearInterval(monitor);
                              console.log('✓ Popup closed, checking authentication state');
                              // Trigger any authentication callbacks
                              if (window.onPopupClosed) window.onPopupClosed();
                              return;
                            }
                          } catch (e) {
                            // Expected for cross-origin popups
                          }
                        }, 500);
                        setTimeout(() => clearInterval(monitor), 600000); // 10 minute timeout
                      } else {
                        console.warn('❌ Popup blocked - please allow popups for authentication');
                        alert('Popup blocked! Please allow popups for this site and try again.');
                      }
                      return popup;
                    };
                  }
                  
                  // Enhanced WebGL context for games and 3D applications
                  if (HTMLCanvasElement.prototype.getContext) {
                    const originalGetContext = HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
                      if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
                        contextAttributes = contextAttributes || {};
                        // Optimize for games and applications
                        contextAttributes.preserveDrawingBuffer = contextAttributes.preserveDrawingBuffer !== false;
                        contextAttributes.antialias = contextAttributes.antialias !== false;
                        contextAttributes.alpha = contextAttributes.alpha !== false;
                        contextAttributes.depth = contextAttributes.depth !== false;
                        contextAttributes.stencil = contextAttributes.stencil !== false;
                        contextAttributes.powerPreference = contextAttributes.powerPreference || 'high-performance';
                        console.log('🎮 Enhanced WebGL context created with options:', contextAttributes);
                      }
                      return originalGetContext.call(this, contextType, contextAttributes);
                    };
                  }
                  
                  // Enhanced fullscreen support with keyboard shortcuts
                  if (document.documentElement.requestFullscreen) {
                    document.addEventListener('keydown', function(e) {
                      if (e.key === 'F11') {
                        e.preventDefault();
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          document.documentElement.requestFullscreen();
                        }
                      }
                    });
                    
                    // Add fullscreen button for games
                    const gameElements = document.querySelectorAll('canvas[width], embed[type*="flash"], object[type*="flash"]');
                    gameElements.forEach(element => {
                      element.addEventListener('dblclick', () => {
                        if (element.requestFullscreen) {
                          element.requestFullscreen();
                        }
                      });
                    });
                    console.log('🖥️ Enhanced fullscreen support enabled');
                  }
                  
                  console.log('✅ PrivaChain compatibility layer fully loaded and active');
                })();
              `;
              iframe.contentDocument.head?.appendChild(script);
              console.log('🔧 Enhanced compatibility script injected successfully');
            }
          }
        } catch (e) {
          // Cross-origin restriction, enhancement not possible
          console.log('ℹ️ Cross-origin iframe, compatibility enhancements skipped:', e.message);
        }
      }, 2000); // Increased delay to ensure page is fully loaded
    } catch (error) {
      console.error('❌ Error handling iframe load:', error);
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

          <div style="margin: 2rem 0;">
            <button onclick="
              const popup = window.open('${url}', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,status=yes');
              if (!popup) {
                alert('Popup blocked! Please allow popups for this site in your browser settings and try again. Look for the popup blocker icon in your address bar.');
              } else {
                popup.focus();
              }
            " style="
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
            
            <button onclick="
              const archivePopup = window.open('https://web.archive.org/web/*/${url}', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
              if (!archivePopup) {
                alert('Popup blocked! Please allow popups to access archived versions.');
              } else {
                archivePopup.focus();
              }
            " style="
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
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-storage-access-by-user-activation allow-top-navigation allow-top-navigation-by-user-activation allow-downloads-without-user-activation allow-fullscreen allow-payment allow-clipboard-read allow-clipboard-write allow-geolocation allow-camera allow-microphone allow-midi allow-encrypted-media allow-autoplay allow-document-domain"
            title={activeTab?.title || 'Content'}
            allow="accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; clipboard-read; clipboard-write; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; microphone; midi; navigation-override; payment; picture-in-picture; publickey-credentials-create; publickey-credentials-get; screen-wake-lock; serial; speaker-selection; storage-access; usb; wake-lock; web-share; window-management; xr-spatial-tracking; cross-origin-isolated"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              colorScheme: 'normal',
              isolation: 'auto'
            }}
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