export interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  type: 'ipfs' | 'prv' | 'http' | 'cosmos' | 'mail' | 'onion' | 'file' | 'video';
  metadata?: {
    size?: string;
    lastModified?: string;
    contentType?: string;
    hash?: string;
  };
  verified?: boolean;
}

export interface TabData {
  id: string;
  title: string;
  url: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  delivered: boolean;
  read: boolean;
}

export interface Contact {
  id: string;
  name: string;
  publicKey: string;
  avatar?: string;
  lastSeen?: number;
  status: 'online' | 'offline' | 'unknown';
}

export interface PrivacyStatus {
  dpiBypass: boolean;
  ipfsEncryption: boolean;
  orbitDbConnected: boolean;
  torEnabled: boolean;
  zkProofsActive: boolean;
}

export interface BangCommand {
  command: string;
  description: string;
  example: string;
}

export const BANG_COMMANDS: BangCommand[] = [
  { command: '!ipfs', description: 'Search IPFS content', example: '!ipfs distributed systems' },
  { command: '!prv', description: 'Search .prv domains', example: '!prv decentralized web' },
  { command: '!cosmos', description: 'Query Cosmos blockchain', example: '!cosmos osmosis swap' },
  { command: '!mail', description: 'Search messages', example: '!mail from:alice' },
  { command: '!onion', description: 'Search onion services', example: '!onion privacy tools' },
  { command: '!file', description: 'Search files', example: '!file type:pdf privacy' },
  { command: '!video', description: 'Search videos', example: '!video blockchain tutorials' },
  { command: '!w', description: 'Search web', example: '!w decentralized browsers' }
];