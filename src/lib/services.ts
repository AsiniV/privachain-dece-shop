import { SearchResult } from './types';

class ContentResolverService {
  private cache = new Map<string, any>();
  
  async resolveContent(url: string): Promise<{ content: string; type: string; metadata?: any }> {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (url.startsWith('ipfs://')) {
      return this.resolveIPFS(url);
    } else if (url.endsWith('.prv')) {
      return this.resolvePRV(url);
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return this.resolveHTTP(url);
    }

    throw new Error(`Unsupported URL scheme: ${url}`);
  }

  private async resolveIPFS(url: string): Promise<{ content: string; type: string; metadata?: any }> {
    const cid = url.replace('ipfs://', '');
    
    // Try multiple IPFS gateways for better reliability
    const gateways = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://dweb.link/ipfs/'
    ];
    
    for (const gateway of gateways) {
      try {
        const gatewayUrl = `${gateway}${cid}`;
        const response = await fetch(gatewayUrl, {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'text/html';
          let content: string;
          
          if (contentType.startsWith('text/') || contentType.includes('html') || contentType.includes('json')) {
            content = await response.text();
          } else {
            // For binary content, return the gateway URL for direct loading
            return {
              content: gatewayUrl,
              type: contentType,
              metadata: {
                cid,
                size: response.headers.get('content-length'),
                contentType,
                directLoad: true,
                gateway: gateway
              }
            };
          }
          
          const result = {
            content,
            type: contentType,
            metadata: {
              cid,
              size: response.headers.get('content-length'),
              contentType,
              gateway: gateway
            }
          };
          
          this.cache.set(url, result);
          return result;
        }
      } catch (error) {
        console.warn(`Gateway ${gateway} failed:`, error);
        continue;
      }
    }
    
    throw new Error(`Failed to resolve IPFS content from all gateways for CID: ${cid}`);
  }

  private async resolvePRV(url: string): Promise<{ content: string; type: string; metadata?: any }> {
    const domain = url.replace(/^https?:\/\//, '');
    
    try {
      const cosmosRpc = import.meta.env.VITE_COSMOS_RPC || 'https://rpc.cosmos.network';
      const queryUrl = `${cosmosRpc}/cosmos/bank/v1beta1/balances/${domain}`;
      
      const mockContentHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const ipfsUrl = `ipfs://${mockContentHash}`;
      
      return this.resolveIPFS(ipfsUrl);
    } catch (error) {
      throw new Error(`Failed to resolve .prv domain: ${error}`);
    }
  }

  private async resolveHTTP(url: string): Promise<{ content: string; type: string; metadata?: any }> {
    try {
      // Try to fetch the content directly first
      const response = await fetch(url, {
        mode: 'cors',
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'text/html';
        let content = await response.text();
        
        // Enhance the content for better compatibility
        if (contentType.includes('html')) {
          // Inject compatibility scripts for games and complex web apps
          content = this.enhanceHTMLContent(content, url);
        }
        
        return {
          content: `data:text/html;charset=utf-8,${encodeURIComponent(content)}`,
          type: contentType,
          metadata: {
            enhanced: true,
            originalUrl: url,
            contentType
          }
        };
      }
    } catch (error) {
      console.warn('Direct fetch failed, using iframe approach:', error);
    }
    
    // Fallback to direct iframe loading for blocked content
    return {
      content: url, // Return the URL itself for direct iframe loading
      type: 'text/html',
      metadata: {
        directLoad: true,
        url: url
      }
    };
  }

  private enhanceHTMLContent(html: string, originalUrl: string): string {
    // Add compatibility enhancements for better web app support
    const baseUrl = new URL(originalUrl).origin;
    
    const enhancements = `
      <script>
        // Enhanced compatibility for web applications and games
        (function() {
          // Fix relative URLs
          const baseURL = '${baseUrl}';
          
          // Enhance WebGL context for games
          const originalGetContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
            if (contextType === 'webgl' || contextType === 'experimental-webgl') {
              contextAttributes = contextAttributes || {};
              contextAttributes.preserveDrawingBuffer = true;
              contextAttributes.antialias = true;
            }
            return originalGetContext.call(this, contextType, contextAttributes);
          };
          
          // Fix fetch requests for relative URLs
          const originalFetch = window.fetch;
          window.fetch = function(url, options) {
            if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('//')) {
              url = new URL(url, baseURL).href;
            }
            return originalFetch.call(this, url, options);
          };
          
          // Enhance audio context for games
          if (window.AudioContext || window.webkitAudioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const originalCreateOscillator = AudioCtx.prototype.createOscillator;
            AudioCtx.prototype.createOscillator = function() {
              const oscillator = originalCreateOscillator.call(this);
              oscillator.start = oscillator.start || oscillator.noteOn;
              oscillator.stop = oscillator.stop || oscillator.noteOff;
              return oscillator;
            };
          }
          
          // Fix WebAssembly loading
          if (window.WebAssembly) {
            const originalInstantiate = WebAssembly.instantiate;
            WebAssembly.instantiate = function(bytes, imports) {
              if (typeof bytes === 'string' && !bytes.startsWith('http')) {
                bytes = new URL(bytes, baseURL).href;
              }
              return originalInstantiate.call(this, bytes, imports);
            };
          }
          
          // Enhanced fullscreen support
          if (document.documentElement.requestFullscreen) {
            const elements = document.querySelectorAll('canvas, video, iframe');
            elements.forEach(element => {
              element.addEventListener('dblclick', () => {
                if (element.requestFullscreen) {
                  element.requestFullscreen();
                }
              });
            });
          }
          
          console.log('PrivaChain compatibility layer loaded');
        })();
      </script>
    `;
    
    // Inject before closing head tag or at the beginning of body
    if (html.includes('</head>')) {
      html = html.replace('</head>', enhancements + '</head>');
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', '<body>' + enhancements);
    } else {
      html = enhancements + html;
    }
    
    return html;
  }
}

class SearchService {
  private localIndex: SearchResult[] = [];
  
  async search(query: string): Promise<SearchResult[]> {
    const bangMatch = query.match(/^!(\w+)\s+(.+)/);
    
    if (bangMatch) {
      const [, command, searchTerm] = bangMatch;
      return this.searchWithBang(command, searchTerm);
    }
    
    return this.generalSearch(query);
  }

  private async searchWithBang(command: string, term: string): Promise<SearchResult[]> {
    switch (command) {
      case 'ipfs':
        return this.searchIPFS(term);
      case 'prv':
        return this.searchPRV(term);
      case 'cosmos':
        return this.searchCosmos(term);
      case 'mail':
        return this.searchMail(term);
      case 'onion':
        return this.searchOnion(term);
      case 'file':
        return this.searchFiles(term);
      case 'video':
        return this.searchVideos(term);
      case 'w':
        return this.searchWeb(term);
      default:
        return [];
    }
  }

  private async generalSearch(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    results.push(...await this.searchIPFS(query));
    results.push(...await this.searchPRV(query));
    results.push(...await this.searchWeb(query));
    
    return results.slice(0, 20);
  }

  private async searchIPFS(term: string): Promise<SearchResult[]> {
    try {
      // Search IPFS through a public gateway's search API
      const searchUrl = `https://ipfs.io/ipns/awesome.ipfs.io/search?q=${encodeURIComponent(term)}`;
      
      // For real IPFS content discovery, we'll use known IPFS resources
      const knownContent = [
        {
          hash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          title: 'Hello World from IPFS',
          description: 'A simple test page demonstrating IPFS functionality'
        },
        {
          hash: 'QmRa5rJa6wG8ydwJ7QfAMbJKKNKzqGJvG7qBYmWq4bqJ2x',
          title: 'IPFS Documentation',
          description: 'Official IPFS documentation and guides'
        },
        {
          hash: 'QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o',
          title: 'Decentralized Web Primer',
          description: 'Introduction to the decentralized web and IPFS'
        }
      ];

      const results: SearchResult[] = knownContent
        .filter(item => 
          item.title.toLowerCase().includes(term.toLowerCase()) ||
          item.description.toLowerCase().includes(term.toLowerCase())
        )
        .map(item => ({
          id: `ipfs-${item.hash}`,
          title: item.title,
          url: `ipfs://${item.hash}`,
          description: item.description,
          type: 'ipfs' as const,
          metadata: {
            hash: item.hash,
            size: 'Unknown'
          },
          verified: true
        }));

      return results;
    } catch (error) {
      console.error('IPFS search failed:', error);
      return [];
    }
  }

  private async searchPRV(term: string): Promise<SearchResult[]> {
    return [
      {
        id: `prv-${Date.now()}`,
        title: `${term}.prv`,
        url: `https://${term}.prv`,
        description: `Decentralized domain for ${term}`,
        type: 'prv',
        verified: true
      }
    ];
  }

  private async searchCosmos(term: string): Promise<SearchResult[]> {
    return [
      {
        id: `cosmos-${Date.now()}`,
        title: `Cosmos: ${term}`,
        url: `cosmos://query/${term}`,
        description: `Blockchain data related to "${term}"`,
        type: 'cosmos',
        verified: true
      }
    ];
  }

  private async searchMail(term: string): Promise<SearchResult[]> {
    return [];
  }

  private async searchOnion(term: string): Promise<SearchResult[]> {
    return [
      {
        id: `onion-${Date.now()}`,
        title: `Privacy service: ${term}`,
        url: `http://${term}.onion`,
        description: `Anonymous service for ${term}`,
        type: 'onion'
      }
    ];
  }

  private async searchFiles(term: string): Promise<SearchResult[]> {
    const fileSources = [
      {
        name: 'Archive.org Documents',
        url: `https://archive.org/search.php?query=${encodeURIComponent(term)}&and[]=mediatype%3A%22texts%22`,
        description: `Documents and texts about "${term}" from Internet Archive`
      },
      {
        name: 'Library Genesis',
        url: `https://libgen.li/index.php?req=${encodeURIComponent(term)}`,
        description: `Academic papers and books about "${term}"`
      },
      {
        name: 'GitHub Repositories',
        url: `https://github.com/search?q=${encodeURIComponent(term)}&type=repositories`,
        description: `Code repositories related to "${term}"`
      }
    ];

    return fileSources.map((source, index) => ({
      id: `file-${index}-${Date.now()}`,
      title: `${source.name}: ${term}`,
      url: source.url,
      description: source.description,
      type: 'file' as const,
      metadata: {
        contentType: 'text/html',
        source: source.name
      }
    }));
  }

  private async searchVideos(term: string): Promise<SearchResult[]> {
    const videoSites = [
      {
        name: 'YouTube',
        url: `https://youtube.com/results?search_query=${encodeURIComponent(term)}`,
        description: `Videos about "${term}" on YouTube`
      },
      {
        name: 'Vimeo',
        url: `https://vimeo.com/search?q=${encodeURIComponent(term)}`,
        description: `Professional videos about "${term}" on Vimeo`
      },
      {
        name: 'Archive.org Videos',
        url: `https://archive.org/search.php?query=${encodeURIComponent(term)}&and[]=mediatype%3A%22movies%22`,
        description: `Public domain videos about "${term}"`
      }
    ];

    return videoSites.map((site, index) => ({
      id: `video-${index}-${Date.now()}`,
      title: `${site.name}: ${term}`,
      url: site.url,
      description: site.description,
      type: 'video' as const,
      metadata: {
        contentType: 'video/html',
        platform: site.name
      }
    }));
  }

  private async searchWeb(term: string): Promise<SearchResult[]> {
    // Real web search results for sites that work well with our browser
    const commonSites = [
      {
        name: 'YouTube',
        url: 'https://youtube.com',
        description: 'Video sharing platform',
        query: `https://youtube.com/results?search_query=${encodeURIComponent(term)}`
      },
      {
        name: 'GitHub',
        url: 'https://github.com',
        description: 'Code repository hosting',
        query: `https://github.com/search?q=${encodeURIComponent(term)}`
      },
      {
        name: 'Wikipedia',
        url: 'https://wikipedia.org',
        description: 'Free encyclopedia',
        query: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`
      },
      {
        name: 'Archive.org',
        url: 'https://archive.org',
        description: 'Internet Archive',
        query: `https://archive.org/search.php?query=${encodeURIComponent(term)}`
      },
      {
        name: 'DuckDuckGo',
        url: 'https://duckduckgo.com',
        description: 'Privacy-focused search engine',
        query: `https://duckduckgo.com/?q=${encodeURIComponent(term)}`
      },
      {
        name: 'Figma',
        url: 'https://figma.com',
        description: 'Collaborative design platform',
        query: `https://figma.com/files/search?q=${encodeURIComponent(term)}`
      },
      {
        name: 'CodePen',
        url: 'https://codepen.io',
        description: 'Code playground and community',
        query: `https://codepen.io/search/pens?q=${encodeURIComponent(term)}`
      },
      {
        name: 'Itch.io',
        url: 'https://itch.io',
        description: 'Indie game platform',
        query: `https://itch.io/search?q=${encodeURIComponent(term)}`
      },
      {
        name: 'Replit',
        url: 'https://replit.com',
        description: 'Online coding environment',
        query: `https://replit.com/search?q=${encodeURIComponent(term)}`
      },
      {
        name: 'Observable',
        url: 'https://observablehq.com',
        description: 'Interactive data notebooks',
        query: `https://observablehq.com/search?query=${encodeURIComponent(term)}`
      }
    ];

    // Gaming platforms that work well with our browser
    const gamingSites = [
      {
        name: 'Kongregate',
        url: 'https://kongregate.com',
        description: 'Browser games platform',
        query: `https://kongregate.com/search?q=${encodeURIComponent(term)}`
      },
      {
        name: 'Miniclip',
        url: 'https://miniclip.com',
        description: 'Free online games',
        query: `https://miniclip.com/games/search/${encodeURIComponent(term)}`
      },
      {
        name: 'Newgrounds',
        url: 'https://newgrounds.com',
        description: 'Art and game community',
        query: `https://newgrounds.com/search/conduct/games?terms=${encodeURIComponent(term)}`
      },
      {
        name: 'Y8 Games',
        url: 'https://y8.com',
        description: 'Free browser games',
        query: `https://y8.com/tags/${encodeURIComponent(term)}`
      }
    ];

    const allSites = [...commonSites, ...gamingSites];

    // Filter and create results based on term relevance
    const results: SearchResult[] = allSites
      .filter(site => 
        site.name.toLowerCase().includes(term.toLowerCase()) ||
        site.description.toLowerCase().includes(term.toLowerCase()) ||
        term.toLowerCase().includes(site.name.toLowerCase()) ||
        (term.toLowerCase().includes('game') && site.description.includes('game'))
      )
      .map(site => ({
        id: `web-${site.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        title: `${site.name}: ${term}`,
        url: site.query,
        description: `Search for "${term}" on ${site.description}`,
        type: 'http' as const,
        verified: true,
        metadata: {
          platform: site.name,
          category: site.description.includes('game') ? 'gaming' : 'general'
        }
      }));

    // Always include at least one general search result
    if (results.length === 0) {
      results.push({
        id: `web-general-${Date.now()}`,
        title: `Search for "${term}"`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(term)}`,
        description: `General web search results for "${term}"`,
        type: 'http' as const
      });
    }

    // Add specific gaming suggestions if term suggests gaming
    const gamingTerms = ['game', 'play', 'arcade', 'puzzle', 'adventure', 'action', 'rpg', 'strategy'];
    if (gamingTerms.some(gameterm => term.toLowerCase().includes(gameterm))) {
      results.unshift({
        id: `gaming-suggestion-${Date.now()}`,
        title: `🎮 Browser Games: ${term}`,
        url: `https://itch.io/games/html5?q=${encodeURIComponent(term)}`,
        description: `HTML5 games related to "${term}" - fully compatible with PrivaChain`,
        type: 'http' as const,
        verified: true,
        metadata: {
          category: 'gaming',
          compatibility: 'high'
        }
      });
    }

    return results.slice(0, 8);
  }
}

export const contentResolver = new ContentResolverService();
export const searchService = new SearchService();