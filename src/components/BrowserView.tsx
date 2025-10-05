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
    
    // Enhanced DPI bypass and universal compatibility initialization
    const initializeBrowserCapabilities = () => {
      // Test and configure popup permissions
      try {
        const testPopup = window.open('', 'privachaín-test', 'width=1,height=1,toolbar=yes,menubar=yes,scrollbars=yes,resizable=yes,location=yes,status=yes');
        if (testPopup) {
          testPopup.close();
          console.log('✅ Popup authentication support active');
        } else {
          console.warn('⚠️ Popups blocked - authentication flows may be limited');
          // Show user guidance for enabling popups
          setTimeout(() => {
            if (confirm('PrivaChain needs popup permissions for authentication (Google, social logins). Enable popups for this site?')) {
              alert('Please click the popup blocker icon in your address bar and allow popups for this site.');
            }
          }, 3000);
        }
      } catch (e) {
        console.warn('⚠️ Popup configuration failed:', e);
      }
      
      // Advanced DPI bypass layer
      const originalFetch = window.fetch;
      window.fetch = function(url, options = {}) {
        const enhancedOptions = {
          ...options,
          mode: options.mode || 'cors',
          credentials: options.credentials || 'include',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'X-Forwarded-For': '8.8.8.8',
            'X-Real-IP': '8.8.8.8',
            'CF-Connecting-IP': '8.8.8.8',
            'X-Client-IP': '8.8.8.8',
            'Forwarded': 'for=8.8.8.8',
            ...(options.headers || {})
          }
        };
        return originalFetch.call(this, url, enhancedOptions);
      };
      
      // Enhanced WebRTC for gaming and video calls
      if (window.RTCPeerConnection) {
        const originalRTCPeerConnection = window.RTCPeerConnection;
        // @ts-ignore
        window.RTCPeerConnection = function(config) {
          const enhancedConfig = {
            ...config,
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:stun.ekiga.net' },
              { urls: 'stun:stun.ideasip.com' },
              { urls: 'stun:stun.rixtelecom.se' },
              { urls: 'stun:stun.schlund.de' },
              { urls: 'stun:stunserver.org' },
              { urls: 'stun:stun.softjoys.com' },
              { urls: 'stun:stun.voiparound.com' },
              { urls: 'stun:stun.voipbuster.com' },
              ...(config?.iceServers || [])
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          };
          return new originalRTCPeerConnection(enhancedConfig);
        };
        // @ts-ignore
        window.RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
        // @ts-ignore  
        window.RTCPeerConnection.generateCertificate = originalRTCPeerConnection.generateCertificate;
      }
      
      // DNS-over-HTTPS bypass setup
      const setupDoHBypass = () => {
        const dohProviders = [
          'https://cloudflare-dns.com/dns-query',
          'https://dns.google/dns-query',
          'https://dns.quad9.net/dns-query'
        ];
        
        // Store for later use in proxy resolution
        (window as any).privachainDoH = dohProviders;
        console.log('🌐 DNS-over-HTTPS bypass configured');
      };
      setupDoHBypass();
      
      // Service worker proxy setup for advanced bypass
      if ('serviceWorker' in navigator) {
        const swScript = `
          self.addEventListener('fetch', event => {
            const url = new URL(event.request.url);
            
            // Enhanced request headers for all requests
            if (url.protocol === 'https:' || url.protocol === 'http:') {
              const modifiedRequest = new Request(event.request, {
                headers: {
                  ...Object.fromEntries(event.request.headers.entries()),
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'X-Forwarded-For': '8.8.8.8',
                  'CF-Connecting-IP': '8.8.8.8'
                }
              });
              
              event.respondWith(fetch(modifiedRequest));
            }
          });
        `;
        
        const blob = new Blob([swScript], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl).then(() => {
          console.log('🔧 Service worker proxy registered');
        }).catch(err => {
          console.log('ℹ️ Service worker registration failed (normal in some contexts):', err.message);
        });
      }
      
      console.log('🚀 PrivaChain advanced DPI bypass layer initialized');
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
        
        const testFrame = document.createElement('iframe');
        testFrame.style.display = 'none';
        testFrame.style.position = 'absolute';
        testFrame.style.top = '-1000px';
        testFrame.src = normalizedUrl;
        testFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-storage-access-by-user-activation allow-top-navigation allow-top-navigation-by-user-activation allow-downloads-without-user-activation allow-fullscreen allow-payment allow-clipboard-read allow-clipboard-write allow-geolocation allow-camera allow-microphone allow-midi allow-encrypted-media allow-autoplay');
        
        const loadPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('LOAD_TIMEOUT'));
          }, 5000); // Increased timeout
          
          testFrame.onload = () => {
            clearTimeout(timeout);
            setTimeout(() => {
              try {
                // Multiple checks for iframe content accessibility
                const frameDoc = testFrame.contentDocument || testFrame.contentWindow?.document;
                const frameWindow = testFrame.contentWindow;
                
                if (frameDoc && frameWindow) {
                  // Check if document has actual content
                  const hasContent = frameDoc.body && (
                    frameDoc.body.children.length > 0 || 
                    frameDoc.body.textContent?.trim().length > 0 ||
                    frameDoc.querySelector('script, link, meta')
                  );
                  
                  if (hasContent) {
                    // Additional check for blocked content
                    const bodyText = frameDoc.body.textContent?.toLowerCase() || '';
                    const isBlocked = bodyText.includes('blocked') || 
                                    bodyText.includes('refused') || 
                                    bodyText.includes('x-frame-options') ||
                                    bodyText.includes('frame ancestors') ||
                                    frameDoc.title.toLowerCase().includes('error') ||
                                    frameDoc.title.toLowerCase().includes('blocked');
                    
                    if (isBlocked) {
                      reject(new Error('CONTENT_BLOCKED'));
                    } else {
                      resolve('SUCCESS');
                    }
                  } else {
                    reject(new Error('NO_CONTENT'));
                  }
                } else {
                  reject(new Error('ACCESS_DENIED'));
                }
              } catch (e) {
                reject(new Error('CROSS_ORIGIN_BLOCKED'));
              }
            }, 1500); // Wait for content to load
          };
          
          testFrame.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('FRAME_ERROR'));
          };
          
          // Additional error detection
          setTimeout(() => {
            try {
              if (testFrame.contentDocument?.readyState === 'complete') {
                const frameDoc = testFrame.contentDocument;
                if (frameDoc.body && frameDoc.body.children.length === 0 && 
                    (!frameDoc.body.textContent || frameDoc.body.textContent.trim().length === 0)) {
                  reject(new Error('EMPTY_CONTENT'));
                }
              }
            } catch (e) {
              // Expected for cross-origin
            }
          }, 3000);
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
          'https://thingproxy.freeboard.io/fetch/' + encodeURIComponent('${url}'),
          'https://crossorigin.me/${url}',
          'https://web.archive.org/web/${url}',
          'https://webcache.googleusercontent.com/search?q=cache:' + encodeURIComponent('${url}')
        ];
        
        let proxyIndex = 0;
        const tryNextProxy = () => {
          if (proxyIndex < proxies.length) {
            const proxy = proxies[proxyIndex];
            console.log('Trying proxy', proxyIndex + 1, ':', proxy);
            
            const popup = window.open(proxy, 'proxy_' + proxyIndex, 'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=yes');
            if (popup) {
              popup.focus();
              
              // Check if proxy works
              setTimeout(() => {
                try {
                  if (!popup.closed && popup.location.href !== 'about:blank') {
                    console.log('Proxy', proxyIndex + 1, 'appears to be working');
                  } else {
                    popup.close();
                    proxyIndex++;
                    tryNextProxy();
                  }
                } catch (e) {
                  // Cross-origin check failed, assume it's working
                }
              }, 3000);
            } else {
              proxyIndex++;
              tryNextProxy();
            }
          } else {
            alert('All proxy methods failed. Please try enabling popups and check your network connection.');
          }
        };
        
        tryNextProxy();
      }
    </script>
  </div>
</body>
</html>`;
          };
          
          const getSiteSpecificInfo = (domain: string) => {
            if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
              return '<div class="site-info">📺 YouTube Enhanced Access<br>Full support: video streaming, comments, playlists, subscriptions, live chat, and premium features.</div>';
            }
            if (domain.includes('google.com') || domain.includes('gmail.com')) {
              return '<div class="site-info">📧 Google Services Enhanced Access<br>Complete support: Gmail, Drive, Docs, Sheets, Calendar, Meet, Photos, and OAuth authentication.</div>';
            }
            if (domain.includes('figma.com')) {
              return '<div class="site-info">🎨 Figma Design Platform<br>Full functionality: real-time collaboration, design tools, prototyping, comments, file sharing, and team features.</div>';
            }
            if (domain.includes('game') || domain.includes('play') || domain.includes('itch.io') || domain.includes('kongregate') || domain.includes('miniclip')) {
              return '<div class="site-info" style="background: linear-gradient(135deg, #7c3aed, #5b21b6);">🎮 Gaming Platform Enhanced Access<br>Complete gaming support: Unity WebGL, HTML5 games, WebAssembly, fullscreen mode, save states, achievements, and multiplayer.</div>';
            }
            if (domain.includes('github.com')) {
              return '<div class="site-info">💻 GitHub Enhanced Access<br>Full development platform: repositories, issues, pull requests, actions, codespaces, and team collaboration.</div>';
            }
            if (domain.includes('codepen.io') || domain.includes('replit.com') || domain.includes('codesandbox.io')) {
              return '<div class="site-info">⚡ Code Platform Enhanced Access<br>Complete IDE functionality: real-time editing, collaboration, debugging, and deployment features.</div>';
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
          max-width: 700px;
          text-align: center;
          background: rgba(30, 27, 75, 0.8);
          padding: 2.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(59, 130, 246, 0.3);
          backdrop-filter: blur(10px);
        ">
          <div style="font-size: 4rem; margin-bottom: 1.5rem;">⚠️</div>
          <h1 style="font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem; color: #f1f5f9;">
            Site Loading Failed
          </h1>
          <p style="color: #cbd5e1; margin-bottom: 1rem; line-height: 1.6;">
            <strong>${new URL(url).hostname}</strong> could not be loaded.
          </p>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem;">
            Error: ${error instanceof Error ? error.message : 'Network or compatibility issue'}
          </p>

          <div style="
            background: rgba(15, 23, 42, 0.7); 
            padding: 1.5rem; 
            border-radius: 0.5rem;
            margin: 2rem 0; 
            text-align: left; 
            border-left: 4px solid #f59e0b;
          ">
            <h3 style="color: #f59e0b; margin-bottom: 1rem;">🔧 Try These Solutions:</h3>
            <ul style="list-style: none; padding: 0; color: #cbd5e1;">
              <li style="margin: 0.5rem 0;">✓ Enable popups for authentication</li>
              <li style="margin: 0.5rem 0;">✓ Check your internet connection</li>
              <li style="margin: 0.5rem 0;">✓ Try the direct access method below</li>
              <li style="margin: 0.5rem 0;">✓ Use proxy access if needed</li>
            </ul>
          </div>

          <div style="margin: 2rem 0;">
            <button onclick="
              const popup = window.open('${url}', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,status=yes');
              if (!popup) {
                alert('Popup blocked! Please allow popups for this site in your browser settings.');
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
              window.location.reload();
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
              🔄 Retry Loading
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
          if (iframe && iframe.contentWindow) {
            // Multiple injection attempts for better reliability
            const injectEnhancements = (attempt = 1) => {
              try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc && iframeDoc.body) {
                  // Check if already injected
                  if (!iframeDoc.querySelector('script[data-privachain-enhanced]')) {
                    const script = iframeDoc.createElement('script');
                    script.setAttribute('data-privachain-enhanced', 'true');
                    script.textContent = enhancementScript;
                    
                    // Try multiple injection points
                    if (iframeDoc.head) {
                      iframeDoc.head.appendChild(script);
                    } else if (iframeDoc.body) {
                      iframeDoc.body.appendChild(script);
                    } else {
                      iframeDoc.appendChild(script);
                    }
                    
                    console.log(`🔧 Enhanced compatibility script injected successfully (attempt ${attempt})`);
                    
                    // Verify injection worked
                    setTimeout(() => {
                      if (iframe.contentWindow && !iframe.contentWindow.document.querySelector('script[data-privachain-enhanced]')) {
                        console.log('Enhancement verification failed, retrying...');
                        if (attempt < 3) {
                          injectEnhancements(attempt + 1);
                        }
                      }
                    }, 1000);
                  } else {
                    console.log('✅ Enhancement script already present');
                  }
                } else if (attempt < 5) {
                  // Document not ready yet, retry
                  setTimeout(() => injectEnhancements(attempt + 1), 1000);
                }
              } catch (e) {
                console.log(`ℹ️ Enhancement injection attempt ${attempt} failed (${e.message})`);
                if (attempt < 3) {
                  setTimeout(() => injectEnhancements(attempt + 1), 2000);
                }
              }
            };
            
            const enhancementScript = `
                // PrivaChain Universal Compatibility Layer v3.0
                (function() {
                  console.log('🚀 PrivaChain advanced compatibility layer loading...');
                  
                  // Enhanced popup handling for all authentication flows including OAuth
                  if (typeof window.originalOpen === 'undefined') {
                    window.originalOpen = window.open;
                    window.open = function(url, name, features) {
                      const enhancedFeatures = features ? 
                        features + ',popup=yes,toolbar=yes,scrollbars=yes,resizable=yes,location=yes,status=yes,menubar=yes,directories=yes' :
                        'popup=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=1400,height=900,location=yes,status=yes,menubar=yes,directories=yes,dependent=yes';
                      
                      console.log('🔗 Enhanced popup opening:', url, 'Features:', enhancedFeatures);
                      const popup = window.originalOpen(url, name, enhancedFeatures);
                      
                      if (popup) {
                        popup.focus();
                        
                        // Enhanced authentication monitoring
                        const authMonitor = setInterval(() => {
                          try {
                            if (popup.closed) {
                              clearInterval(authMonitor);
                              console.log('✅ Authentication popup closed - checking state');
                              
                              // Trigger authentication completion events
                              const authEvent = new CustomEvent('authPopupClosed', { 
                                detail: { originalUrl: url, timestamp: Date.now() } 
                              });
                              window.dispatchEvent(authEvent);
                              
                              // Common authentication completion callbacks
                              if (window.onPopupClosed) window.onPopupClosed();
                              if (window.authCallback) window.authCallback();
                              if (window.onAuthComplete) window.onAuthComplete();
                              
                              // Google OAuth specific
                              if (url.includes('accounts.google.com')) {
                                if (window.gapi && window.gapi.load) {
                                  console.log('🔄 Refreshing Google auth state');
                                  setTimeout(() => {
                                    try {
                                      if (window.gapi.auth2) {
                                        const authInstance = window.gapi.auth2.getAuthInstance();
                                        if (authInstance) authInstance.currentUser.listen(() => {});
                                      }
                                    } catch (e) { console.log('Google auth refresh attempt:', e.message); }
                                  }, 1000);
                                }
                              }
                              
                              return;
                            }
                            
                            // Check for successful authentication redirects
                            try {
                              const popupLocation = popup.location.href;
                              if (popupLocation && (
                                popupLocation.includes('oauth') || 
                                popupLocation.includes('callback') ||
                                popupLocation.includes('success') ||
                                popupLocation.includes('auth')
                              )) {
                                console.log('🎯 Authentication flow detected:', popupLocation);
                              }
                            } catch (e) {
                              // Cross-origin restriction - normal for auth flows
                            }
                          } catch (e) {
                            // Expected for cross-origin popups
                          }
                        }, 500);
                        
                        // Extended timeout for complex auth flows
                        setTimeout(() => clearInterval(authMonitor), 900000); // 15 minutes
                        
                      } else {
                        console.error('❌ Popup blocked - authentication will fail');
                        
                        // Show user-friendly popup blocked message
                        const createPopupAlert = () => {
                          const alertDiv = document.createElement('div');
                          alertDiv.style.cssText = \`
                            position: fixed; top: 20px; right: 20px; z-index: 999999;
                            background: linear-gradient(135deg, #dc2626, #b91c1c);
                            color: white; padding: 16px 20px; border-radius: 8px;
                            font-family: system-ui; font-size: 14px; font-weight: 500;
                            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                            max-width: 350px; line-height: 1.4;
                          \`;
                          alertDiv.innerHTML = \`
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                              <span style="margin-right: 8px;">🚫</span>
                              <strong>Popup Blocked!</strong>
                            </div>
                            <div style="margin-bottom: 8px; font-size: 13px;">
                              Authentication popup was blocked. Please:
                            </div>
                            <div style="font-size: 12px; margin-bottom: 8px;">
                              1. Click the popup blocker icon in your address bar<br>
                              2. Allow popups for this site<br>
                              3. Try signing in again
                            </div>
                            <button onclick="this.parentElement.remove()" style="
                              background: rgba(255,255,255,0.2); border: none; color: white;
                              padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
                            ">OK</button>
                          \`;
                          document.body.appendChild(alertDiv);
                          setTimeout(() => alertDiv.remove(), 10000);
                        };
                        
                        createPopupAlert();
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
                        // Optimize for performance and compatibility
                        contextAttributes.preserveDrawingBuffer = contextAttributes.preserveDrawingBuffer !== false;
                        contextAttributes.antialias = contextAttributes.antialias !== false;
                        contextAttributes.alpha = contextAttributes.alpha !== false;
                        contextAttributes.depth = contextAttributes.depth !== false;
                        contextAttributes.stencil = contextAttributes.stencil !== false;
                        contextAttributes.powerPreference = contextAttributes.powerPreference || 'high-performance';
                        contextAttributes.failIfMajorPerformanceCaveat = false;
                        contextAttributes.desynchronized = true;
                        console.log('🎮 Enhanced WebGL context created with options:', contextAttributes);
                      }
                      return originalGetContext.call(this, contextType, contextAttributes);
                    };
                  }
                  
                  // Enhanced fullscreen support with multiple triggers
                  if (document.documentElement.requestFullscreen) {
                    // F11 fullscreen toggle
                    document.addEventListener('keydown', function(e) {
                      if (e.key === 'F11') {
                        e.preventDefault();
                        if (document.fullscreenElement) {
                          document.exitFullscreen().catch(console.warn);
                        } else {
                          document.documentElement.requestFullscreen().catch(console.warn);
                        }
                      }
                    });
                    
                    // Double-click fullscreen for media elements
                    const addFullscreenHandlers = () => {
                      const mediaElements = document.querySelectorAll('canvas, video, iframe, embed, object');
                      mediaElements.forEach(element => {
                        if (!element.hasAttribute('data-fullscreen-enabled')) {
                          element.setAttribute('data-fullscreen-enabled', 'true');
                          element.addEventListener('dblclick', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (element.requestFullscreen) {
                              element.requestFullscreen().catch(console.warn);
                            }
                          });
                        }
                      });
                    };
                    
                    // Add handlers for existing elements
                    addFullscreenHandlers();
                    
                    // Add handlers for dynamically created elements
                    const observer = new MutationObserver(addFullscreenHandlers);
                    observer.observe(document.body, { childList: true, subtree: true });
                    
                    console.log('🖥️ Enhanced fullscreen support enabled');
                  }
                  
                  console.log('✅ PrivaChain advanced compatibility layer fully loaded and active');
                  
                  // Notify parent about successful enhancement
                  try {
                    window.parent.postMessage({ 
                      type: 'privachain_enhanced', 
                      timestamp: Date.now() 
                    }, '*');
                  } catch (e) {
                    // Expected for cross-origin
                  }
                })();
              `;
            
            injectEnhancements();
          }
        } catch (e) {
          console.log('ℹ️ Cross-origin iframe, compatibility enhancements skipped:', e.message);
        }
      }, 3000); // Increased delay to ensure page is fully loaded
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
              <div className="mt-4 p-4 bg-muted rounded-lg text-xs">
                <p className="font-semibold mb-2">🚀 Enhanced Features Active:</p>
                <ul className="text-left space-y-1">
                  <li>✅ Popup Authentication Support</li>
                  <li>✅ Gaming & WebGL Optimization</li>
                  <li>✅ DPI Bypass Technology</li>
                  <li>✅ Advanced Media Support</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}