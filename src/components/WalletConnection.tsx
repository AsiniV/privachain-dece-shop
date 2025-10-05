import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Key, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import { useKV } from '@github/spark/hooks';
import { cosmosService, PRIVACHAIN_CONFIG } from '@/lib/cosmos';
import { toast } from 'sonner';

interface WalletConfig {
  rpcEndpoint: string;
  restEndpoint: string;
  apiKey: string;
  autoConnect: boolean;
}

interface WalletConnectionProps {
  onConnectionChange: (connected: boolean, address?: string) => void;
}

export function WalletConnection({ onConnectionChange }: WalletConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  // Store wallet configuration and API keys
  const [walletConfig, setWalletConfig] = useKV<WalletConfig>('wallet-config', {
    rpcEndpoint: PRIVACHAIN_CONFIG.rpc,
    restEndpoint: PRIVACHAIN_CONFIG.rest,
    apiKey: '',
    autoConnect: false,
  });

  const [keplrInstalled, setKeplrInstalled] = useState(false);

  useEffect(() => {
    // Check if Keplr wallet is installed
    const checkKeplr = () => {
      if (window.keplr) {
        setKeplrInstalled(true);
        if (walletConfig?.autoConnect) {
          connectWallet();
        }
      } else {
        setKeplrInstalled(false);
        setConnectionError('Keplr wallet not found. Please install Keplr extension.');
      }
    };

    checkKeplr();
    
    // Listen for Keplr installation
    window.addEventListener('keplr_keystorechange', checkKeplr);
    
    return () => {
      window.removeEventListener('keplr_keystorechange', checkKeplr);
    };
  }, [walletConfig?.autoConnect]);

  const suggestChain = async () => {
    if (!window.keplr) {
      throw new Error('Keplr not installed');
    }

    if (!walletConfig) return;

    // Add the custom chain configuration with API endpoints
    await window.keplr.experimentalSuggestChain({
      ...PRIVACHAIN_CONFIG,
      rpc: walletConfig.rpcEndpoint,
      rest: walletConfig.restEndpoint,
      features: ['stargate', 'ibc-transfer', 'cosmwasm'],
    });
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setConnectionError('');

    try {
      if (!keplrInstalled) {
        throw new Error('Keplr wallet not installed');
      }

      if (!walletConfig?.apiKey) {
        setShowApiKeyDialog(true);
        setIsConnecting(false);
        return;
      }

      // Suggest the chain to Keplr
      await suggestChain();

      // Enable the chain
      await window.keplr!.enable(PRIVACHAIN_CONFIG.chainId);

      // Get the offline signer
      const offlineSigner = window.keplr!.getOfflineSigner(PRIVACHAIN_CONFIG.chainId);

      // Connect to Cosmos service
      const connectedAddress = await cosmosService.connect(offlineSigner);
      
      setAddress(connectedAddress);
      setIsConnected(true);
      
      // Get balance
      const walletBalance = await cosmosService.getBalance();
      setBalance(walletBalance);

      onConnectionChange(true, connectedAddress);
      toast.success('Wallet connected successfully');

      // Update auto-connect preference
      if (walletConfig) {
        setWalletConfig({ ...walletConfig, autoConnect: true });
      }

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await cosmosService.disconnect();
      setIsConnected(false);
      setAddress('');
      setBalance('0');
      setConnectionError('');
      onConnectionChange(false);
      
      // Disable auto-connect
      if (walletConfig) {
        setWalletConfig({ ...walletConfig, autoConnect: false });
      }
      
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const saveApiConfiguration = () => {
    if (!walletConfig?.apiKey?.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!walletConfig?.rpcEndpoint?.trim() || !walletConfig?.restEndpoint?.trim()) {
      toast.error('Please enter valid RPC and REST endpoints');
      return;
    }

    setShowApiKeyDialog(false);
    toast.success('Configuration saved');
    
    // Try to connect after saving configuration
    connectWallet();
  };

  const refreshBalance = async () => {
    if (isConnected) {
      try {
        const newBalance = await cosmosService.getBalance();
        setBalance(newBalance);
        toast.success('Balance refreshed');
      } catch (error) {
        console.error('Failed to refresh balance:', error);
        toast.error('Failed to refresh balance');
      }
    }
  };

  if (!keplrInstalled) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3 text-amber-400">
          <Warning className="w-5 h-5" />
          <div>
            <p className="font-medium">Keplr Wallet Required</p>
            <p className="text-sm text-muted-foreground">
              Install Keplr extension to connect to the blockchain
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.open('https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap', '_blank')}
            >
              Install Keplr
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Cosmos Wallet</span>
                {isConnected ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-400 border-red-400">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
              {isConnected && (
                <div className="text-sm text-muted-foreground">
                  <p className="mono">{address.slice(0, 12)}...{address.slice(-8)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span>{balance} PRIV</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={refreshBalance}
                      className="h-auto p-0 text-xs underline"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="w-4 h-4 mr-1" />
                  Config
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Wallet Configuration</DialogTitle>
                  <DialogDescription>
                    Configure your blockchain connection settings and API access
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your blockchain API key"
                      value={walletConfig?.apiKey || ''}
                      onChange={(e) => {
                        if (walletConfig) {
                          setWalletConfig({ ...walletConfig, apiKey: e.target.value });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for transaction processing and smart contract interactions
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="rpcEndpoint">RPC Endpoint</Label>
                    <Input
                      id="rpcEndpoint"
                      placeholder="https://rpc.privachain.network"
                      value={walletConfig?.rpcEndpoint || ''}
                      onChange={(e) => {
                        if (walletConfig) {
                          setWalletConfig({ ...walletConfig, rpcEndpoint: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="restEndpoint">REST API Endpoint</Label>
                    <Input
                      id="restEndpoint"
                      placeholder="https://api.privachain.network"
                      value={walletConfig?.restEndpoint || ''}
                      onChange={(e) => {
                        if (walletConfig) {
                          setWalletConfig({ ...walletConfig, restEndpoint: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <Button onClick={saveApiConfiguration} className="w-full">
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {isConnected ? (
              <Button variant="outline" size="sm" onClick={disconnectWallet}>
                Disconnect
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={connectWallet} 
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </div>

        {connectionError && (
          <Alert className="mt-3 border-red-500/20 bg-red-500/10">
            <Warning className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              {connectionError}
            </AlertDescription>
          </Alert>
        )}
      </Card>
    </>
  );
}

// Extend window type for Keplr
declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      experimentalSuggestChain: (chainInfo: any) => Promise<void>;
      getOfflineSigner: (chainId: string) => any;
    };
  }
}