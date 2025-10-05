# PrivaChain Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying PrivaChain Decentral, a fully decentralized browser with integrated Cosmos blockchain functionality, to production environments.

## Prerequisites

### System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git
- Modern web browser with WebRTC support
- HTTPS-enabled deployment environment
- Access to Cosmos testnet/mainnet RPC endpoints

### Required Services
- **Cosmos RPC Endpoint**: For blockchain operations
- **IPFS Gateway**: For decentralized content access
- **Domain/Hosting**: HTTPS-enabled web server
- **SSL Certificate**: Required for WebRTC and service worker functionality

## Smart Contract Deployment

### 1. Cosmos Testnet Deployment

#### Prerequisites
- Cosmos testnet access
- Developer wallet with testnet ATOM tokens
- CosmWasm enabled chain (recommended: `theta-testnet-001`)

#### Contract Deployment Steps

1. **Prepare Contract Code**
   ```bash
   # Clone and build smart contracts
   git clone https://github.com/privachain/cosmos-contracts
   cd cosmos-contracts
   cargo build --release --target wasm32-unknown-unknown
   ```

2. **Deploy Messenger Contract**
   ```bash
   # Upload and instantiate messenger contract
   wasmd tx wasm store artifacts/messenger.wasm \
     --from developer \
     --gas 5000000 \
     --gas-prices 0.025uatom \
     --chain-id theta-testnet-001 \
     --node https://cosmos-testnet-rpc.allthatnode.com:26657
   
   # Get code ID from transaction response
   CODE_ID=<returned_code_id>
   
   # Instantiate contract
   INIT_MSG='{"admin":"cosmos1...","encryption_enabled":true}'
   wasmd tx wasm instantiate $CODE_ID "$INIT_MSG" \
     --from developer \
     --label "PrivaChain Messenger v1.0" \
     --admin cosmos1... \
     --gas 1000000 \
     --gas-prices 0.025uatom \
     --chain-id theta-testnet-001
   ```

3. **Deploy Privacy Validator Contract**
   ```bash
   # Upload privacy validator contract
   wasmd tx wasm store artifacts/privacy_validator.wasm \
     --from developer \
     --gas 5000000 \
     --gas-prices 0.025uatom \
     --chain-id theta-testnet-001
   
   # Instantiate with zero-knowledge proof support
   PRIVACY_INIT='{"zk_verification":true,"proof_algorithms":["plonk","groth16"]}'
   wasmd tx wasm instantiate $PRIVACY_CODE_ID "$PRIVACY_INIT" \
     --from developer \
     --label "PrivaChain Privacy Validator v1.0" \
     --admin cosmos1... \
     --gas 1000000 \
     --gas-prices 0.025uatom
   ```

4. **Deploy Payment Router Contract**
   ```bash
   # Upload payment router contract
   wasmd tx wasm store artifacts/payment_router.wasm \
     --from developer \
     --gas 5000000 \
     --gas-prices 0.025uatom
   
   # Instantiate with fee configuration
   PAYMENT_INIT='{"fee_collector":"cosmos1...","base_fee":"1000uatom","gas_multiplier":"1.5"}'
   wasmd tx wasm instantiate $PAYMENT_CODE_ID "$PAYMENT_INIT" \
     --from developer \
     --label "PrivaChain Payment Router v1.0" \
     --admin cosmos1... \
     --gas 1000000 \
     --gas-prices 0.025uatom
   ```

5. **Deploy DPI Bypass Contract**
   ```bash
   # Upload DPI bypass management contract
   wasmd tx wasm store artifacts/dpi_bypass.wasm \
     --from developer \
     --gas 5000000 \
     --gas-prices 0.025uatom
   
   # Instantiate with proxy configuration
   DPI_INIT='{"proxy_endpoints":["proxy1.privachain.network","proxy2.privachain.network"],"tor_enabled":true}'
   wasmd tx wasm instantiate $DPI_CODE_ID "$DPI_INIT" \
     --from developer \
     --label "PrivaChain DPI Bypass v1.0" \
     --admin cosmos1... \
     --gas 1000000 \
     --gas-prices 0.025uatom
   ```

### 2. Contract Addresses Documentation

After deployment, record all contract addresses:

```env
# Contract addresses (update after deployment)
VITE_MESSENGER_CONTRACT=cosmos1...
VITE_PRIVACY_CONTRACT=cosmos1...
VITE_PAYMENT_CONTRACT=cosmos1...
VITE_DPI_CONTRACT=cosmos1...
```

### 3. Mainnet Deployment Preparation

For mainnet deployment:
1. Deploy to mainnet using same process with mainnet endpoints
2. Fund developer wallet with sufficient ATOM for operations
3. Update configuration to use mainnet RPC endpoints
4. Enable monitoring and alerting for contract operations

## Application Deployment

### 1. Environment Configuration

Create production environment configuration:

```bash
# Create .env.production file
cat > .env.production << EOF
# Cosmos Configuration
VITE_COSMOS_RPC=https://cosmos-rpc.privachain.network
VITE_COSMOS_REST=https://cosmos-api.privachain.network
VITE_COSMOS_CHAIN_ID=cosmoshub-4
VITE_COSMOS_PREFIX=cosmos

# Developer Wallet (Production)
VITE_DEVELOPER_WALLET_ADDRESS=cosmos1...
VITE_DEVELOPER_PRIVATE_KEY_ENCRYPTED=<encrypted_private_key>

# Contract Addresses
VITE_MESSENGER_CONTRACT=cosmos1...
VITE_PRIVACY_CONTRACT=cosmos1...
VITE_PAYMENT_CONTRACT=cosmos1...
VITE_DPI_CONTRACT=cosmos1...

# IPFS Configuration
VITE_IPFS_GATEWAY=https://ipfs.privachain.network
VITE_IPFS_FALLBACK_GATEWAYS=https://ipfs.io,https://cloudflare-ipfs.com

# Privacy Features (Always Enabled)
VITE_DPI_BYPASS_ENABLED=true
VITE_TOR_ENABLED=true
VITE_ZK_PROOFS_ENABLED=true
VITE_P2P_SEARCH_ENABLED=true
VITE_IPFS_ENCRYPTION_ENABLED=true

# Security Configuration
VITE_CSP_ENABLED=true
VITE_HTTPS_ONLY=true
VITE_SECURE_COOKIES=true

# Performance Optimization
VITE_CACHE_ENABLED=true
VITE_SERVICE_WORKER_ENABLED=true
VITE_PRELOAD_CRITICAL=true

# Monitoring
VITE_ANALYTICS_ENABLED=false
VITE_ERROR_REPORTING_ENABLED=true
VITE_PERFORMANCE_MONITORING=true
EOF
```

### 2. Build Process

```bash
# Install dependencies
npm install --production

# Run security audit
npm audit --audit-level high

# Build for production
npm run build

# Verify build output
ls -la dist/
```

### 3. Deployment Options

#### Option A: Static Hosting (Recommended)

Deploy to static hosting services like Vercel, Netlify, or CloudFlare Pages:

```bash
# Vercel deployment
npm install -g vercel
vercel --prod

# Netlify deployment
npm install -g netlify-cli
netlify deploy --prod --dir=dist

# CloudFlare Pages
# Upload dist/ folder via dashboard or CLI
```

#### Option B: Self-Hosted Server

```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Configure nginx
sudo tee /etc/nginx/sites-available/privachain << EOF
server {
    listen 80;
    server_name privachain.your-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name privachain.your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    root /var/www/privachain/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # CSP for WebRTC and iframe functionality
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https: wss: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; frame-src 'self' https:; worker-src 'self' blob:;";

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site and restart nginx
sudo ln -s /etc/nginx/sites-available/privachain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate Setup

```bash
# Using Let's Encrypt (certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d privachain.your-domain.com

# Verify certificate auto-renewal
sudo certbot renew --dry-run
```

### 5. Service Worker Configuration

Ensure service worker is properly configured for offline functionality:

```javascript
// public/sw.js - Service Worker for enhanced privacy
self.addEventListener('install', (event) => {
  console.log('PrivaChain Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('PrivaChain Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Enhanced fetch with DPI bypass
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/bypass/')) {
    event.respondWith(handleBypassRequest(event.request));
  }
});
```

### 6. Domain Configuration

For .prv domain support:

1. **DNS Configuration**
   ```
   # Add DNS records
   privachain.your-domain.com    A    <server_ip>
   *.prv.your-domain.com        A    <server_ip>
   ```

2. **Wildcard SSL Certificate**
   ```bash
   # Get wildcard certificate for .prv domains
   sudo certbot certonly --manual --preferred-challenges dns \
     -d "*.prv.your-domain.com" -d "prv.your-domain.com"
   ```

## Production Monitoring Setup

### 1. Health Check Endpoints

Configure monitoring for critical systems:

```bash
# Create monitoring script
cat > /opt/privachain/monitor.sh << EOF
#!/bin/bash

# Check application health
curl -f https://privachain.your-domain.com/health || exit 1

# Check Cosmos connectivity
curl -f https://cosmos-rpc.privachain.network/status || exit 1

# Check contract availability
wasmd query wasm contract-state smart \$MESSENGER_CONTRACT '{"get_status":{}}' || exit 1

echo "All systems operational"
EOF

chmod +x /opt/privachain/monitor.sh

# Add to crontab for regular checks
echo "*/5 * * * * /opt/privachain/monitor.sh" | crontab -
```

### 2. Log Management

```bash
# Configure log rotation
sudo tee /etc/logrotate.d/privachain << EOF
/var/log/nginx/privachain.*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
EOF
```

### 3. Performance Monitoring

```javascript
// Add performance monitoring to application
const monitor = {
  trackPageLoad: () => {
    window.addEventListener('load', () => {
      const perfData = {
        loadTime: performance.now(),
        timing: performance.getEntriesByType('navigation')[0]
      };
      // Send to monitoring service
      console.log('Performance data:', perfData);
    });
  },
  
  trackErrors: () => {
    window.addEventListener('error', (event) => {
      console.error('Application error:', event.error);
      // Send error to monitoring service
    });
  }
};

monitor.trackPageLoad();
monitor.trackErrors();
```

## Security Considerations

### 1. Wallet Security

- Developer wallet private key must be encrypted in production
- Implement key rotation policy
- Monitor wallet balance and transaction patterns
- Set up alerts for unusual activity

### 2. Network Security

- All communications must use HTTPS/WSS
- Implement rate limiting for API endpoints
- Configure proper CORS policies
- Regular security audits of smart contracts

### 3. Privacy Protection

- Ensure all privacy features are enabled by default
- Regular testing of DPI bypass functionality
- Monitor for privacy leaks or data exposure
- Implement zero-knowledge proof verification

## Backup and Recovery

### 1. Data Backup

```bash
# Backup critical configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  /var/www/privachain \
  /etc/nginx/sites-available/privachain \
  /etc/ssl/certs/privachain*

# Store backup securely
scp backup-$(date +%Y%m%d).tar.gz backup-server:/backups/
```

### 2. Disaster Recovery

1. **Infrastructure**: Document all server configurations
2. **Smart Contracts**: Maintain contract source code and deployment scripts
3. **Monitoring**: Set up alerts for system failures
4. **Communication**: Establish incident response procedures

## Scaling Considerations

### 1. Horizontal Scaling

- Deploy behind load balancer for high availability
- Use CDN for static asset distribution
- Implement database sharding for user data
- Scale smart contract interactions

### 2. Performance Optimization

- Enable browser caching for static assets
- Implement service worker for offline functionality
- Optimize bundle size and lazy loading
- Monitor and optimize blockchain transaction costs

This deployment guide ensures a secure, scalable, and fully functional PrivaChain deployment with all privacy features enabled by default and transparent blockchain integration.