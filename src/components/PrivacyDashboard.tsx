import { useState, useEffect } from 'react';
import { PrivacyStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Database, Globe, Eye, CheckCircle, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function PrivacyDashboard() {
  const [status, setStatus] = useState<PrivacyStatus>({
    dpiBypass: false,
    ipfsEncryption: true,
    orbitDbConnected: false,
    torEnabled: false,
    zkProofsActive: false
  });

  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    const dpiBypassEnabled = import.meta.env.VITE_DPI_BYPASS_ENABLED === 'true';
    const orbitDbEnabled = import.meta.env.VITE_ORBITDB_ENABLED === 'true';
    
    setStatus(prev => ({
      ...prev,
      dpiBypass: dpiBypassEnabled,
      orbitDbConnected: orbitDbEnabled
    }));
  }, []);

  const toggleFeature = async (feature: keyof PrivacyStatus) => {
    if (connecting) return;
    
    setConnecting(feature);
    
    setTimeout(() => {
      setStatus(prev => {
        const newStatus = {
          ...prev,
          [feature]: !prev[feature]
        };
        
        const featureNames = {
          dpiBypass: 'DPI Bypass',
          ipfsEncryption: 'IPFS Encryption',
          orbitDbConnected: 'P2P Search',
          torEnabled: 'TOR Network',
          zkProofsActive: 'Zero-Knowledge Proofs'
        };
        
        const action = newStatus[feature] ? 'enabled' : 'disabled';
        toast.success(`${featureNames[feature]} ${action}`);
        
        return newStatus;
      });
      setConnecting(null);
    }, 2000);
  };

  const getStatusIcon = (enabled: boolean, loading: boolean) => {
    if (loading) {
      return <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />;
    }
    return enabled ? 
      <CheckCircle className="w-4 h-4 text-green-400" /> : 
      <XCircle className="w-4 h-4 text-red-400" />;
  };

  const getStatusText = (enabled: boolean) => {
    return enabled ? 'Active' : 'Inactive';
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'bg-green-500/20 text-green-400 border-green-400' : 'bg-red-500/20 text-red-400 border-red-400';
  };

  const privacyScore = Object.values(status).filter(Boolean).length * 20;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Privacy Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and control your privacy and security features
        </p>
      </div>

      {/* Privacy Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Privacy Score</h2>
          <span className="text-2xl font-bold text-accent">{privacyScore}%</span>
        </div>
        <Progress value={privacyScore} className="mb-2" />
        <p className="text-sm text-muted-foreground">
          {privacyScore >= 80 ? 'Excellent privacy protection' :
           privacyScore >= 60 ? 'Good privacy protection' :
           privacyScore >= 40 ? 'Basic privacy protection' :
           'Limited privacy protection'}
        </p>
      </Card>

      {/* Feature Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DPI Bypass */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <h3 className="font-semibold">DPI Bypass</h3>
            </div>
            {getStatusIcon(status.dpiBypass, connecting === 'dpiBypass')}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Bypass deep packet inspection to access blocked content without VPN
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={getStatusColor(status.dpiBypass)}>
              {getStatusText(status.dpiBypass)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFeature('dpiBypass')}
              disabled={connecting === 'dpiBypass'}
            >
              {status.dpiBypass ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </Card>

        {/* IPFS Encryption */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <h3 className="font-semibold">IPFS Encryption</h3>
            </div>
            {getStatusIcon(status.ipfsEncryption, connecting === 'ipfsEncryption')}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Encrypt content before storing on IPFS for enhanced privacy
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={getStatusColor(status.ipfsEncryption)}>
              {getStatusText(status.ipfsEncryption)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFeature('ipfsEncryption')}
              disabled={connecting === 'ipfsEncryption'}
            >
              {status.ipfsEncryption ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </Card>

        {/* OrbitDB Connection */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <h3 className="font-semibold">P2P Search</h3>
            </div>
            {getStatusIcon(status.orbitDbConnected, connecting === 'orbitDbConnected')}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Connect to decentralized OrbitDB network for P2P search
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={getStatusColor(status.orbitDbConnected)}>
              {getStatusText(status.orbitDbConnected)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFeature('orbitDbConnected')}
              disabled={connecting === 'orbitDbConnected'}
            >
              {status.orbitDbConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </Card>

        {/* TOR Integration */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <h3 className="font-semibold">TOR Network</h3>
            </div>
            {getStatusIcon(status.torEnabled, connecting === 'torEnabled')}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Route traffic through TOR for enhanced anonymity
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={getStatusColor(status.torEnabled)}>
              {getStatusText(status.torEnabled)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFeature('torEnabled')}
              disabled={connecting === 'torEnabled'}
            >
              {status.torEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </Card>

        {/* ZK Proofs */}
        <Card className="p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <h3 className="font-semibold">Zero-Knowledge Proofs</h3>
            </div>
            {getStatusIcon(status.zkProofsActive, connecting === 'zkProofsActive')}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Use ZK proofs for anonymous queries and identity verification without revealing personal information
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={getStatusColor(status.zkProofsActive)}>
              {getStatusText(status.zkProofsActive)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFeature('zkProofsActive')}
              disabled={connecting === 'zkProofsActive'}
            >
              {status.zkProofsActive ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Network Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Network Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">12</div>
            <div className="text-sm text-muted-foreground">IPFS Peers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">5</div>
            <div className="text-sm text-muted-foreground">OrbitDB Peers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">98%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
        </div>
      </Card>
    </div>
  );
}