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
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
    
    try {
      const response = await fetch(gatewayUrl);
      const content = await response.text();
      const result = {
        content,
        type: 'text/html',
        metadata: {
          cid,
          size: response.headers.get('content-length'),
          contentType: response.headers.get('content-type')
        }
      };
      
      this.cache.set(url, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to resolve IPFS content: ${error}`);
    }
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
    const bypassEnabled = import.meta.env.VITE_DPI_BYPASS_ENABLED === 'true';
    
    try {
      let response: Response;
      
      if (bypassEnabled) {
        response = await this.fetchWithDPIBypass(url);
      } else {
        response = await fetch(url);
      }
      
      const content = await response.text();
      const result = {
        content,
        type: response.headers.get('content-type') || 'text/html',
        metadata: {
          status: response.status,
          bypassUsed: bypassEnabled
        }
      };
      
      this.cache.set(url, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to resolve HTTP content: ${error}`);
    }
  }

  private async fetchWithDPIBypass(url: string): Promise<Response> {
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
    return fetch(proxyUrl, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
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
    return [
      {
        id: `ipfs-${Date.now()}`,
        title: `IPFS: ${term}`,
        url: `ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`,
        description: `Decentralized content related to "${term}"`,
        type: 'ipfs',
        metadata: {
          hash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          size: '2.3 MB'
        },
        verified: true
      }
    ];
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
    return [
      {
        id: `file-${Date.now()}`,
        title: `Document: ${term}`,
        url: `ipfs://QmFile${Date.now()}`,
        description: `File containing "${term}"`,
        type: 'file',
        metadata: {
          contentType: 'application/pdf',
          size: '1.2 MB'
        }
      }
    ];
  }

  private async searchVideos(term: string): Promise<SearchResult[]> {
    return [
      {
        id: `video-${Date.now()}`,
        title: `Video: ${term}`,
        url: `ipfs://QmVideo${Date.now()}`,
        description: `Video content about "${term}"`,
        type: 'video',
        metadata: {
          contentType: 'video/mp4',
          size: '50 MB'
        }
      }
    ];
  }

  private async searchWeb(term: string): Promise<SearchResult[]> {
    return [
      {
        id: `web-${Date.now()}`,
        title: `Web result for ${term}`,
        url: `https://example.com/search?q=${encodeURIComponent(term)}`,
        description: `Traditional web content about "${term}"`,
        type: 'http'
      }
    ];
  }
}

export const contentResolver = new ContentResolverService();
export const searchService = new SearchService();