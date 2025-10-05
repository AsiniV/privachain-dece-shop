# PrivaChain Testing Guide

## Overview

This comprehensive testing guide covers all aspects of PrivaChain Decentral, including smart contract functionality, privacy features, browser capabilities, and blockchain integration.

## Pre-Testing Setup

### Environment Preparation

1. **Test Environment Setup**
   ```bash
   # Clone and setup test environment
   git clone https://github.com/privachain/privachain-decentral
   cd privachain-decentral
   npm install
   
   # Setup test configuration
   cp .env.example .env.test
   ```

2. **Test Environment Variables**
   ```bash
   # .env.test configuration
   VITE_COSMOS_RPC=https://cosmos-testnet-rpc.allthatnode.com:26657
   VITE_COSMOS_REST=https://cosmos-testnet-api.allthatnode.com:1317
   VITE_COSMOS_CHAIN_ID=theta-testnet-001
   VITE_DEVELOPER_WALLET_ADDRESS=cosmos1...
   VITE_DEVELOPER_PRIVATE_KEY=df449cf7393c69c5ffc164a3fb4f1095f1b923e61762624aa0351e38de9fb306
   
   # Test contract addresses (update after deployment)
   VITE_MESSENGER_CONTRACT=cosmos1...
   VITE_PRIVACY_CONTRACT=cosmos1...
   VITE_PAYMENT_CONTRACT=cosmos1...
   VITE_DPI_CONTRACT=cosmos1...
   ```

3. **Start Test Environment**
   ```bash
   npm run dev
   # Application should be available at http://localhost:5173
   ```

## Smart Contract Testing

### 1. Contract Deployment Verification

#### Test Messenger Contract
```bash
# Verify messenger contract deployment
wasmd query wasm contract-state smart $MESSENGER_CONTRACT '{"get_config":{}}'

# Expected output:
# {
#   "admin": "cosmos1...",
#   "encryption_enabled": true,
#   "message_count": 0
# }
```

#### Test Privacy Validator Contract
```bash
# Verify privacy contract
wasmd query wasm contract-state smart $PRIVACY_CONTRACT '{"get_status":{}}'

# Expected output:
# {
#   "zk_verification": true,
#   "supported_algorithms": ["plonk", "groth16"],
#   "total_proofs_verified": 0
# }
```

#### Test Payment Router Contract
```bash
# Verify payment contract
wasmd query wasm contract-state smart $PAYMENT_CONTRACT '{"get_fee_info":{}}'

# Expected output:
# {
#   "base_fee": "1000uatom",
#   "gas_multiplier": "1.5",
#   "fee_collector": "cosmos1..."
# }
```

### 2. Contract Interaction Testing

#### Messenger Contract Tests
```bash
# Test sending a message
MESSAGE='{"send_message":{"recipient":"cosmos1...","content":"encrypted_content","proof":"zk_proof"}}'
wasmd tx wasm execute $MESSENGER_CONTRACT "$MESSAGE" \
  --from developer \
  --gas 500000 \
  --gas-prices 0.025uatom \
  --chain-id theta-testnet-001

# Verify message was stored
wasmd query wasm contract-state smart $MESSENGER_CONTRACT '{"get_messages":{"user":"cosmos1..."}}'
```

#### Privacy Contract Tests
```bash
# Test zero-knowledge proof verification
PROOF='{"verify_proof":{"proof_data":"proof_bytes","public_inputs":["input1","input2"]}}'
wasmd tx wasm execute $PRIVACY_CONTRACT "$PROOF" \
  --from developer \
  --gas 300000 \
  --gas-prices 0.025uatom

# Check verification result
wasmd query wasm contract-state smart $PRIVACY_CONTRACT '{"get_last_verification":{}}'
```

### 3. Integration Testing

#### End-to-End Transaction Flow
```bash
# Test complete transaction flow
# 1. Send message with payment
# 2. Verify privacy proof
# 3. Process DPI bypass request
# 4. Check all contracts updated correctly

# Monitor transaction success
wasmd query tx $TX_HASH
```

## Application Testing

### 1. Core Browser Functionality

#### Website Loading Tests

**Test Case 1: Standard HTTPS Website**
1. Navigate to Search view
2. Enter "https://www.github.com" in search
3. Click on result or press Enter
4. **Expected**: Website loads in iframe with full functionality
5. **Verify**: Navigation controls work, page renders correctly

**Test Case 2: Complex JavaScript Application**
1. Navigate to "https://www.figma.com"
2. **Expected**: Figma loads completely with all design tools
3. **Verify**: Can create shapes, use tools, real-time collaboration works
4. **Test**: Login functionality through OAuth popup

**Test Case 3: Media Streaming Platform**
1. Navigate to "https://www.youtube.com"
2. **Expected**: YouTube loads with all features
3. **Verify**: Video playback, comments, subscriptions, live chat
4. **Test**: 4K video streaming, playlist functionality

**Test Case 4: Gaming Platform**
1. Navigate to Unity WebGL game site
2. **Expected**: Game loads and runs smoothly
3. **Verify**: 3D graphics, audio, save states, multiplayer
4. **Test**: Performance optimization features

#### Multi-Tab Functionality
```javascript
// Test tab persistence
describe('Multi-Tab Browser', () => {
  it('should maintain tab state across sessions', () => {
    // Open multiple tabs
    cy.visit('http://localhost:5173');
    cy.get('[data-testid="new-tab"]').click();
    cy.get('[data-testid="address-bar"]').type('https://github.com');
    cy.get('[data-testid="navigate"]').click();
    
    // Reload page
    cy.reload();
    
    // Verify tabs persisted
    cy.get('[data-testid="tab"]').should('have.length', 2);
    cy.get('[data-testid="active-tab"]').should('contain', 'github.com');
  });
});
```

### 2. Privacy Features Testing

#### DPI Bypass Testing

**Test Case 1: Blocked Website Access**
1. Navigate to a website known to be blocked in certain regions
2. **Expected**: Site loads successfully through DPI bypass
3. **Verify**: Check Privacy Dashboard shows "DPI Bypass Active"
4. **Monitor**: Check for proxy cascade activation

**Test Case 2: Proxy Chain Fallback**
1. Block primary proxy endpoints (simulate network restrictions)
2. Navigate to external website
3. **Expected**: Automatic fallback to secondary proxies
4. **Verify**: Website still loads, proxy method shown in dashboard

**Test Case 3: TOR Network Integration**
1. Enable TOR mode in Privacy Dashboard
2. Navigate to .onion address
3. **Expected**: Onion service loads correctly
4. **Verify**: TOR circuit information displayed

#### Privacy Dashboard Tests
```javascript
describe('Privacy Dashboard', () => {
  it('should show active protection status', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-testid="privacy-tab"]').click();
    
    // Verify all privacy features enabled
    cy.get('[data-testid="dpi-bypass-status"]').should('contain', 'Active');
    cy.get('[data-testid="encryption-status"]').should('contain', 'Enabled');
    cy.get('[data-testid="tor-status"]').should('contain', 'Connected');
    cy.get('[data-testid="zk-proofs"]').should('contain', 'Operational');
  });
});
```

### 3. Messaging System Testing

#### Real-Time Messaging Tests

**Test Case 1: Message Sending and Persistence**
1. Navigate to Messenger view
2. Send test message: "Hello PrivaChain"
3. **Expected**: Message appears in chat immediately
4. **Verify**: Message persists after page refresh
5. **Check**: Blockchain transaction recorded

**Test Case 2: Message Encryption**
1. Send message with sensitive content
2. **Expected**: Message encrypted before blockchain storage
3. **Verify**: Raw blockchain data shows encrypted content
4. **Test**: Message decrypts correctly for recipient

**Test Case 3: File Sharing**
1. Attach file to message
2. **Expected**: File uploaded to IPFS
3. **Verify**: IPFS hash generated and shared
4. **Test**: File downloadable by recipient

```javascript
describe('Messaging System', () => {
  it('should send and persist messages', async () => {
    const { render, user } = setupTest();
    render(<MessengerView />);
    
    // Send message
    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    // Verify message appears
    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    // Verify blockchain transaction
    const txHash = await waitForTransaction();
    expect(txHash).toBeTruthy();
  });
});
```

### 4. Search Engine Testing

#### Multi-Protocol Search Tests

**Test Case 1: Bang Commands**
1. Search: "!yt cats playing"
2. **Expected**: Direct navigation to YouTube search results
3. **Verify**: Results load in browser view

**Test Case 2: IPFS Content Search**
1. Search: "!ipfs QmXXXXXXX"
2. **Expected**: IPFS content loads directly
3. **Verify**: Content displayed through IPFS gateway

**Test Case 3: .prv Domain Resolution**
1. Search: "example.prv"
2. **Expected**: Domain resolved through Cosmos
3. **Verify**: Content loaded from IPFS hash

```javascript
describe('Search Engine', () => {
  it('should handle bang commands correctly', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-testid="search-input"]').type('!yt cats{enter}');
    
    // Should navigate to YouTube
    cy.get('[data-testid="browser-iframe"]')
      .should('have.attr', 'src')
      .and('include', 'youtube.com');
  });
});
```

## Blockchain Integration Testing

### 1. Transaction Processing Tests

#### Automated Transaction Handling
```javascript
describe('Blockchain Integration', () => {
  it('should process transactions transparently', async () => {
    // Send message (should trigger blockchain transaction)
    const messagePromise = sendMessage('Test blockchain integration');
    
    // Transaction should be processed automatically
    const result = await messagePromise;
    expect(result.success).toBe(true);
    expect(result.txHash).toBeTruthy();
    
    // User should not see blockchain complexity
    expect(screen.queryByText('Sign transaction')).not.toBeInTheDocument();
    expect(screen.queryByText('Gas fee')).not.toBeInTheDocument();
  });
});
```

#### Developer Wallet Monitoring
```bash
# Test wallet balance and transaction processing
npm run test:wallet-monitor

# Should output:
# ✓ Developer wallet connected
# ✓ Sufficient balance for operations
# ✓ Transaction processing active
# ✓ Smart contracts responsive
```

### 2. Smart Contract Integration Tests

#### Contract Interaction Verification
```javascript
describe('Smart Contract Integration', () => {
  beforeEach(async () => {
    // Setup test contracts
    await deployTestContracts();
  });

  it('should interact with messenger contract', async () => {
    const message = await sendMessageViaContract('Test message');
    expect(message.encrypted).toBe(true);
    expect(message.stored).toBe(true);
  });

  it('should verify privacy proofs', async () => {
    const proof = generateTestProof();
    const result = await verifyProofViaContract(proof);
    expect(result.valid).toBe(true);
  });
});
```

## Performance Testing

### 1. Load Testing

#### Website Loading Performance
```bash
# Test website loading times
npm run test:performance

# Benchmark results should show:
# - Initial load: < 2 seconds
# - Subsequent loads: < 500ms
# - DPI bypass overhead: < 200ms
# - Blockchain transactions: < 3 seconds
```

#### Memory Usage Testing
```javascript
describe('Performance', () => {
  it('should maintain reasonable memory usage', () => {
    // Monitor memory during extended use
    const initialMemory = performance.memory.usedJSHeapSize;
    
    // Simulate heavy usage
    for (let i = 0; i < 100; i++) {
      simulateWebsiteNavigation();
    }
    
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
```

### 2. Stress Testing

#### Concurrent Operations
```javascript
describe('Stress Testing', () => {
  it('should handle concurrent operations', async () => {
    const operations = [];
    
    // Create 50 concurrent operations
    for (let i = 0; i < 50; i++) {
      operations.push(sendMessage(`Message ${i}`));
      operations.push(loadWebsite(`https://example${i}.com`));
      operations.push(performSearch(`query ${i}`));
    }
    
    // All operations should complete successfully
    const results = await Promise.allSettled(operations);
    const failures = results.filter(r => r.status === 'rejected');
    expect(failures.length).toBe(0);
  });
});
```

## Security Testing

### 1. Privacy Protection Tests

#### Data Leak Prevention
```javascript
describe('Privacy Protection', () => {
  it('should not leak user data', () => {
    // Monitor network requests
    cy.intercept('**', (req) => {
      // Verify no sensitive data in requests
      expect(req.body).not.to.contain('user_private_key');
      expect(req.headers).not.to.have.property('x-real-ip');
    });
    
    // Perform normal operations
    cy.visit('http://localhost:5173');
    cy.get('[data-testid="search-input"]').type('sensitive query');
  });
});
```

#### Encryption Verification
```bash
# Test message encryption
npm run test:encryption

# Should verify:
# ✓ Messages encrypted before blockchain storage
# ✓ Encryption keys properly managed
# ✓ Decryption only possible by intended recipients
```

### 2. Security Vulnerability Tests

#### Cross-Site Scripting (XSS) Protection
```javascript
describe('XSS Protection', () => {
  it('should sanitize user inputs', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    
    cy.get('[data-testid="search-input"]').type(maliciousInput);
    cy.get('[data-testid="search-submit"]').click();
    
    // Script should not execute
    cy.window().then((win) => {
      expect(win.alert).not.to.have.been.called;
    });
  });
});
```

## User Acceptance Testing

### 1. User Experience Tests

#### Web2 Experience Verification
1. **Test**: New user opens application
2. **Expected**: Interface appears as traditional browser
3. **Verify**: No blockchain complexity visible
4. **Check**: All features work seamlessly

#### Compatibility Tests
```javascript
describe('Browser Compatibility', () => {
  ['chrome', 'firefox', 'safari', 'edge'].forEach(browser => {
    it(`should work correctly in ${browser}`, () => {
      // Test core functionality in each browser
      testCoreFeatures();
      testPrivacyFeatures();
      testMessaging();
      testWebsiteLoading();
    });
  });
});
```

### 2. Accessibility Testing

#### Screen Reader Support
```javascript
describe('Accessibility', () => {
  it('should support screen readers', () => {
    cy.visit('http://localhost:5173');
    
    // Check ARIA labels
    cy.get('[data-testid="search-input"]')
      .should('have.attr', 'aria-label');
    
    // Check keyboard navigation
    cy.get('body').tab().tab().should('have.focus');
  });
});
```

## Integration Testing Scenarios

### 1. Complete User Journey Tests

#### Scenario: Privacy-Focused Web Browsing
```javascript
describe('Complete User Journey', () => {
  it('should provide secure browsing experience', async () => {
    // 1. Open PrivaChain
    cy.visit('http://localhost:5173');
    
    // 2. Search for sensitive content
    cy.get('[data-testid="search-input"]').type('sensitive research topic');
    cy.get('[data-testid="search-submit"]').click();
    
    // 3. Navigate to search results
    cy.get('[data-testid="search-result"]').first().click();
    
    // 4. Verify privacy protection active
    cy.get('[data-testid="privacy-tab"]').click();
    cy.get('[data-testid="dpi-bypass-status"]').should('contain', 'Active');
    
    // 5. Send encrypted message about findings
    cy.get('[data-testid="messenger-tab"]').click();
    cy.get('[data-testid="message-input"]').type('Found interesting information');
    cy.get('[data-testid="send-message"]').click();
    
    // 6. Verify message encrypted and stored on blockchain
    const txHash = await waitForBlockchainConfirmation();
    expect(txHash).toBeTruthy();
  });
});
```

### 2. Cross-Feature Integration Tests

#### Messaging + Privacy + Blockchain Integration
```javascript
describe('Cross-Feature Integration', () => {
  it('should integrate messaging with privacy features', async () => {
    // Send message through privacy proxy
    const message = await sendMessageThroughProxy('Test integration');
    
    // Verify message encrypted
    expect(message.encrypted).toBe(true);
    
    // Verify blockchain transaction
    expect(message.txHash).toBeTruthy();
    
    // Verify privacy protection maintained
    const privacyStatus = await getPrivacyStatus();
    expect(privacyStatus.exposed).toBe(false);
  });
});
```

## Automated Testing Setup

### 1. Continuous Integration Tests

```yaml
# .github/workflows/test.yml
name: PrivaChain Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Test smart contract integration
        run: npm run test:contracts
```

### 2. Test Reporting

```javascript
// Configure test reporting
module.exports = {
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports',
      filename: 'report.html',
      expand: true
    }]
  ],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts'
  ]
};
```

## Test Result Validation

### Success Criteria

#### Core Functionality (Must Pass)
- [ ] All websites load correctly in iframe
- [ ] DPI bypass works for blocked sites
- [ ] Privacy features active by default
- [ ] Messages send and persist correctly
- [ ] Search returns relevant results
- [ ] Blockchain transactions process automatically

#### Performance (Must Meet)
- [ ] Website loading: < 3 seconds
- [ ] Message sending: < 2 seconds
- [ ] Search results: < 1 second
- [ ] Memory usage: < 100MB sustained
- [ ] Privacy overhead: < 500ms

#### Security (Must Verify)
- [ ] No user data leaks in network requests
- [ ] All messages encrypted before storage
- [ ] Privacy protection cannot be disabled
- [ ] XSS and injection attacks prevented
- [ ] Blockchain operations secured

### Failure Investigation

#### Common Issues and Solutions

1. **Website Loading Failures**
   - Check iframe sandbox permissions
   - Verify DPI bypass service functionality
   - Test proxy endpoint availability

2. **Blockchain Transaction Failures**
   - Verify developer wallet balance
   - Check smart contract deployment
   - Validate RPC endpoint connectivity

3. **Privacy Feature Failures**
   - Test individual bypass methods
   - Verify TOR network connectivity
   - Check encryption key generation

## Testing Schedule

### Development Testing
- Unit tests: Every commit
- Integration tests: Daily
- E2E tests: Before each release

### Pre-Production Testing
- Full test suite: Weekly
- Performance testing: Bi-weekly
- Security audit: Monthly

### Production Monitoring
- Health checks: Every 5 minutes
- Performance monitoring: Continuous
- Security scanning: Daily

This comprehensive testing guide ensures PrivaChain meets all functional, performance, and security requirements while maintaining the seamless Web2 user experience with complete privacy protection.