import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SearchResult, BANG_COMMANDS } from '@/lib/types';
import { searchService } from '@/lib/services';
import { MagnifyingGlass, Globe, Database, Shield, ChatCircle, FileText, VideoCamera } from '@phosphor-icons/react';

interface SearchViewProps {
  onNavigate: (url: string) => void;
}

export function SearchView({ onNavigate }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await searchService.search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'ipfs': return <Database className="w-4 h-4" />;
      case 'prv': return <Globe className="w-4 h-4" />;
      case 'cosmos': return <Shield className="w-4 h-4" />;
      case 'mail': return <ChatCircle className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      case 'video': return <VideoCamera className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'ipfs': return 'bg-blue-500/20 text-blue-400';
      case 'prv': return 'bg-accent/20 text-accent';
      case 'cosmos': return 'bg-purple-500/20 text-purple-400';
      case 'mail': return 'bg-green-500/20 text-green-400';
      case 'onion': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          PrivaChain Search
        </h1>
        <p className="text-muted-foreground">
          Decentralized search across IPFS, Cosmos, and the open web
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search or try !ipfs, !prv, !cosmos..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowCommands(e.target.value.startsWith('!'));
            }}
            onKeyPress={handleKeyPress}
            className="pl-10 text-lg py-3"
            onFocus={() => setShowCommands(query.startsWith('!'))}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} className="px-6">
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {showCommands && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Bang Commands</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {BANG_COMMANDS.map((cmd) => (
              <div
                key={cmd.command}
                className="p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                onClick={() => setQuery(cmd.example)}
              >
                <div className="font-mono text-sm text-primary">{cmd.command}</div>
                <div className="text-sm text-muted-foreground">{cmd.description}</div>
                <div className="text-xs text-muted-foreground mt-1">e.g., {cmd.example}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Results ({results.length})</h2>
          {results.map((result) => (
            <Card
              key={result.id}
              className="p-4 hover:bg-card/80 cursor-pointer transition-colors"
              onClick={() => onNavigate(result.url)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getResultIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{result.title}</h3>
                    <Badge className={getTypeColor(result.type)}>
                      {result.type.toUpperCase()}
                    </Badge>
                    {result.verified && (
                      <Badge variant="outline" className="text-accent border-accent">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-2">{result.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="mono truncate">{result.url}</span>
                    {result.metadata?.size && (
                      <span>{result.metadata.size}</span>
                    )}
                    {result.metadata?.contentType && (
                      <span>{result.metadata.contentType}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <MagnifyingGlass className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No results found for "{query}"</p>
          <p className="text-sm mt-2">Try using bang commands like !ipfs or !prv</p>
        </div>
      )}
    </div>
  );
}