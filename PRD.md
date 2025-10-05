# PrivaChain Decentral - Product Requirements Document

A decentralized browser with hybrid search engine and built-in Web3 messenger that provides Web2-like UX without servers or registration.

**Experience Qualities**:
1. **Seamless** - Navigation feels like traditional browsers despite decentralized architecture
2. **Private** - Complete anonymity without trusting servers or intermediaries
3. **Accessible** - Access blocked content without VPNs or complex setup

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Multi-layered architecture integrating IPFS, Cosmos blockchain, P2P search, and encrypted messaging with sophisticated content resolution and privacy features.

## Essential Features

### Decentralized Content Navigation
- **Functionality**: Resolve and display content from IPFS, .prv domains, and HTTP sources with DPI bypass
- **Purpose**: Access any content without censorship or geographic restrictions
- **Trigger**: User enters URL in address bar
- **Progression**: URL input → Content type detection → Protocol-specific resolution → Content display → Caching
- **Success Criteria**: All three content types load successfully with sub-3 second response times

### Hybrid Search Engine
- **Functionality**: P2P search using OrbitDB with bang commands and fallback indexing
- **Purpose**: Find content across decentralized networks without centralized search providers
- **Trigger**: User enters search query or bang command
- **Progression**: Query input → OrbitDB lookup → Fallback search → Result aggregation → Ranked display
- **Success Criteria**: Returns relevant results within 2 seconds, supports all bang commands (!ipfs, !prv, !cosmos, etc.)

### Web3 Messenger
- **Functionality**: End-to-end encrypted messaging over P2P networks with offline delivery
- **Purpose**: Secure communication without revealing metadata to servers
- **Trigger**: User selects contact or creates new conversation
- **Progression**: Contact selection → Key exchange → Message composition → E2E encryption → P2P delivery → Receipt confirmation
- **Success Criteria**: Messages delivered within 5 seconds when both parties online, stored for offline delivery

### Privacy Layer
- **Functionality**: DPI bypass, content encryption, and ZK proofs for anonymous interactions
- **Purpose**: Complete privacy and anonymity without trusting third parties
- **Trigger**: Any network request or content access
- **Progression**: Request initiation → Privacy technique selection → Obfuscated transmission → Encrypted response → Local decryption
- **Success Criteria**: All requests untraceable, content encrypted by default, no metadata leakage

## Edge Case Handling

- **Network Failures**: Graceful fallback to alternative IPFS gateways and cached content
- **Blockchain Disconnection**: Local-only mode with reduced functionality but continued browsing
- **OrbitDB Unavailability**: Automatic fallback to local search index and SubQuery
- **Key Management Errors**: Clear recovery flows without exposing private keys
- **Large Content Loading**: Progressive loading with cancel options for IPFS content
- **Malicious Content**: Content validation and user warnings for unverified sources

## Design Direction

The interface should feel cutting-edge yet familiar, like a premium browser with subtle sci-fi elements that hint at its decentralized nature without being overwhelming. Minimal interface that prioritizes content while providing powerful tools for privacy-conscious users.

## Color Selection

Custom palette - A dark, sophisticated theme with electric accents that conveys privacy and advanced technology.

- **Primary Color**: Electric Blue (oklch(0.6 0.2 240)) - Represents connectivity and trust in decentralized systems
- **Secondary Colors**: Deep Space Gray (oklch(0.15 0.02 240)) - Sophisticated background that doesn't strain eyes during long browsing sessions
- **Accent Color**: Neon Green (oklch(0.75 0.15 130)) - Attention-grabbing highlight for privacy indicators and successful connections
- **Foreground/Background Pairings**: 
  - Background (Deep Space): Light Gray (oklch(0.9 0.02 240)) - Ratio 12.1:1 ✓
  - Card (Charcoal): White (oklch(0.98 0.01 240)) - Ratio 15.8:1 ✓
  - Primary (Electric Blue): White (oklch(0.98 0.01 240)) - Ratio 7.2:1 ✓
  - Secondary (Space Gray): Light Gray (oklch(0.9 0.02 240)) - Ratio 6.8:1 ✓
  - Accent (Neon Green): Dark Gray (oklch(0.2 0.02 240)) - Ratio 8.4:1 ✓

## Font Selection

Typography should convey technical precision and modernity while maintaining excellent readability for extended browsing sessions. Inter for its excellent legibility across all sizes and weights.

- **Typographic Hierarchy**: 
  - H1 (Page Titles): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal letter spacing  
  - H3 (Subsections): Inter Medium/18px/normal letter spacing
  - Body (Content): Inter Regular/16px/relaxed line height (1.6)
  - Small (Metadata): Inter Regular/14px/normal letter spacing
  - Code (Addresses/Hashes): JetBrains Mono Regular/14px/monospace spacing

## Animations

Subtle micro-interactions that provide feedback for complex operations like content resolution and P2P connections, with smooth transitions that don't distract from content consumption.

- **Purposeful Meaning**: Loading animations indicate network activity, success states confirm privacy protections, and connection indicators show P2P network status
- **Hierarchy of Movement**: Content loading gets priority animation focus, followed by navigation feedback, then subtle UI enhancements

## Component Selection

- **Components**: Dialog for settings/key management, Card for search results and message threads, Form for search input with auto-complete, Tabs for browser navigation, Progress for content loading, Badge for privacy status indicators, Avatar for messenger contacts
- **Customizations**: Custom browser tab component with close/reload actions, specialized search result cards with metadata and source indicators, privacy status dashboard with real-time network information
- **States**: All interactive elements have distinct hover/active/disabled states with smooth transitions, form inputs show validation states, buttons indicate loading during network operations
- **Icon Selection**: Phosphor icons for navigation (Globe, MagnifyingGlass, ChatCircle), privacy indicators (Shield, Eye), and network status (WifiHigh, Database)
- **Spacing**: Consistent 8px grid system using Tailwind's spacing scale (p-2, p-4, p-6, p-8) for predictable layouts
- **Mobile**: Responsive design with collapsible sidebar for tabs, bottom navigation for core functions, and optimized touch targets for all interactive elements