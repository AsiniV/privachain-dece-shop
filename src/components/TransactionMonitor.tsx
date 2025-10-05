import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  ArrowRight, 
  Shield, 
  Eye,
  Info
} from '@phosphor-icons/react';
import { cosmosService } from '@/lib/cosmos';
import { developerWallet } from '@/lib/developer-wallet';
import { useKV } from '@github/spark/hooks';

interface TransactionLog {
  id: string;
  type: 'message' | 'privacy' | 'proxy' | 'storage';
  status: 'processing' | 'confirmed' | 'failed';
  timestamp: number;
  hash?: string;
  details: string;
  cost: string;
}

export function TransactionMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [developerWalletStatus, setDeveloperWalletStatus] = useState<any>(null);
  const [transactionLogs, setTransactionLogs] = useKV<TransactionLog[]>('transaction-logs', []);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    confirmedTransactions: 0,
    totalCost: 0,
  });

  useEffect(() => {
    // Monitor developer wallet status
    const checkWalletStatus = () => {
      const status = cosmosService.getDeveloperWalletStatus();
      setDeveloperWalletStatus(status);
    };

    checkWalletStatus();
    const interval = setInterval(checkWalletStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate statistics from transaction logs
    if (!transactionLogs) return;
    
    const confirmed = transactionLogs.filter(tx => tx.status === 'confirmed').length;
    const totalCost = transactionLogs.reduce((sum, tx) => sum + parseFloat(tx.cost || '0'), 0);
    
    setStats({
      totalTransactions: transactionLogs.length,
      confirmedTransactions: confirmed,
      totalCost,
    });
  }, [transactionLogs]);

  const addTransactionLog = (log: Omit<TransactionLog, 'id' | 'timestamp'>) => {
    const newLog: TransactionLog = {
      ...log,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: Date.now(),
    };
    
    setTransactionLogs((current) => {
      const currentLogs = current || [];
      return [newLog, ...currentLogs].slice(0, 50); // Keep last 50 transactions
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'privacy': return '🔒';
      case 'proxy': return '🌐';
      case 'storage': return '💾';
      default: return '⚡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const clearLogs = () => {
    setTransactionLogs([]);
  };

  // Simulate some transaction activity for demo
  const simulateTransaction = () => {
    const types: Array<'message' | 'privacy' | 'proxy' | 'storage'> = ['message', 'privacy', 'proxy', 'storage'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    addTransactionLog({
      type,
      status: 'processing',
      details: `Processing ${type} operation`,
      cost: (Math.random() * 0.01 + 0.001).toFixed(6),
    });

    // Simulate confirmation after delay
    setTimeout(() => {
      setTransactionLogs((current) => {
        const currentLogs = current || [];
        return currentLogs.map((tx, index) => 
          index === 0 
            ? { 
                ...tx, 
                status: 'confirmed' as const, 
                hash: `COSMOS_${Math.random().toString(36).substring(2).toUpperCase()}`,
                details: `${type} operation confirmed on blockchain`
              }
            : tx
        );
      });
    }, 2000 + Math.random() * 3000);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm border-primary/20"
        >
          <Shield className="w-4 h-4 mr-2" />
          Blockchain Status
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold">Blockchain Monitor</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={simulateTransaction}
                className="h-6 px-2 text-xs"
              >
                Test
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsVisible(false)}
                className="h-6 px-2"
              >
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Developer Wallet Status */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Developer Wallet</span>
              <Badge 
                className={`${
                  developerWalletStatus?.isReady 
                    ? 'bg-green-500/20 text-green-400 border-green-500' 
                    : 'bg-red-500/20 text-red-400 border-red-500'
                }`}
              >
                {developerWalletStatus?.isReady ? 'Ready' : 'Initializing'}
              </Badge>
            </div>
            {developerWalletStatus?.address && (
              <div className="text-xs text-muted-foreground mono mt-1">
                {developerWalletStatus.address.slice(0, 8)}...{developerWalletStatus.address.slice(-6)}
              </div>
            )}
          </div>

          <Separator className="my-3" />

          {/* Transaction Statistics */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{stats.totalTransactions}</div>
              <div className="text-xs text-muted-foreground">Total Tx</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{stats.confirmedTransactions}</div>
              <div className="text-xs text-muted-foreground">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-accent">{stats.totalCost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">ATOM</div>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Transaction Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recent Transactions</span>
              {transactionLogs && transactionLogs.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearLogs}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {!transactionLogs || transactionLogs.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      No transactions yet. All blockchain operations will be logged here.
                    </AlertDescription>
                  </Alert>
                ) : (
                  transactionLogs.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getTypeIcon(tx.type)}</span>
                        <div>
                          <div className="text-xs font-medium">{tx.details}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-right">
                          <div className="text-muted-foreground">{tx.cost} ATOM</div>
                          {tx.hash && (
                            <div className="mono text-muted-foreground">
                              {tx.hash.slice(0, 6)}...
                            </div>
                          )}
                        </div>
                        <div className={getStatusColor(tx.status)}>
                          {getStatusIcon(tx.status)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground text-center">
              🔒 All transactions secured by Cosmos blockchain
              <br />
              💰 Payments processed transparently by developer wallet
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}