// Smart Contract Interface Definitions for PrivaChain

// Messenger Smart Contract
export interface MessengerContract {
  // Send a message to another user
  send_message: {
    recipient: string;
    content: string; // Encrypted content
    payment_amount?: string;
    channel_id?: string;
  };
  
  // Create a new messaging channel
  create_channel: {
    name: string;
    channel_type: 'public' | 'private' | 'encrypted';
    initial_members: string[];
  };
  
  // Join an existing channel
  join_channel: {
    channel_id: string;
    proof_of_invitation?: string;
  };
  
  // Leave a channel
  leave_channel: {
    channel_id: string;
  };
  
  // Get messages for a user
  query_messages: {
    user_address: string;
    from_timestamp?: number;
    to_timestamp?: number;
    limit?: number;
  };
  
  // Get channel information
  query_channel: {
    channel_id: string;
  };
}

// Payment Router Smart Contract
export interface PaymentRouterContract {
  // Process a payment between users
  process_payment: {
    sender: string;
    recipient: string;
    amount: string;
    denom: string;
    message_id?: string;
    memo?: string;
  };
  
  // Setup recurring payments
  setup_recurring: {
    recipient: string;
    amount: string;
    denom: string;
    interval: number; // seconds
    total_payments: number;
  };
  
  // Cancel recurring payments
  cancel_recurring: {
    payment_id: string;
  };
  
  // Query payment history
  query_payments: {
    user_address: string;
    from_timestamp?: number;
    to_timestamp?: number;
    limit?: number;
  };
  
  // Query payment status
  query_payment: {
    payment_id: string;
  };
}

// Privacy Validator Smart Contract
export interface PrivacyValidatorContract {
  // Submit a zero-knowledge proof for validation
  validate_proof: {
    proof: string;
    public_inputs: string[];
    proof_type: 'identity' | 'balance' | 'membership' | 'custom';
    verifier_key: string;
  };
  
  // Register a new verifier
  register_verifier: {
    verifier_address: string;
    verifier_type: string;
    public_key: string;
    metadata: string;
  };
  
  // Update verifier status
  update_verifier: {
    verifier_address: string;
    status: 'active' | 'inactive' | 'revoked';
  };
  
  // Query proof validity
  query_proof: {
    proof_id: string;
  };
  
  // Query verifier information
  query_verifier: {
    verifier_address: string;
  };
}

// DPI Bypass Smart Contract
export interface DPIBypassContract {
  // Register a proxy endpoint
  register_proxy: {
    proxy_url: string;
    proxy_type: 'https' | 'socks5' | 'domain_fronting';
    supported_protocols: string[];
    geographic_location: string;
    reliability_score: number;
  };
  
  // Update proxy status
  update_proxy: {
    proxy_id: string;
    status: 'active' | 'inactive' | 'maintenance';
    reliability_score?: number;
  };
  
  // Request proxy chain for bypass
  request_proxy_chain: {
    target_url: string;
    bypass_type: 'dpi' | 'geo_blocking' | 'censorship';
    max_hops: number;
    preferred_locations?: string[];
  };
  
  // Report proxy performance
  report_performance: {
    proxy_id: string;
    success_rate: number;
    average_latency: number;
    throughput: number;
    timestamp: number;
  };
  
  // Query available proxies
  query_proxies: {
    location?: string;
    proxy_type?: string;
    min_reliability?: number;
    limit?: number;
  };
  
  // Query proxy chain
  query_proxy_chain: {
    chain_id: string;
  };
}

// Smart Contract Response Types
export interface ContractResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  gas_used: number;
  transaction_hash: string;
  block_height: number;
}

// Message Response from Messenger Contract
export interface MessageResponse {
  message_id: string;
  sender: string;
  recipient: string;
  encrypted_content: string;
  timestamp: number;
  block_height: number;
  transaction_hash: string;
  payment_amount?: string;
  channel_id?: string;
}

// Payment Response from Payment Router Contract
export interface PaymentResponse {
  payment_id: string;
  sender: string;
  recipient: string;
  amount: string;
  denom: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  timestamp: number;
  block_height: number;
  transaction_hash: string;
  message_id?: string;
  memo?: string;
}

// Proof Validation Response from Privacy Validator Contract
export interface ProofValidationResponse {
  proof_id: string;
  is_valid: boolean;
  proof_type: string;
  verifier_address: string;
  validation_timestamp: number;
  expiry_timestamp: number;
  public_inputs_hash: string;
  verification_key_hash: string;
}

// Proxy Chain Response from DPI Bypass Contract
export interface ProxyChainResponse {
  chain_id: string;
  proxy_endpoints: Array<{
    proxy_id: string;
    proxy_url: string;
    proxy_type: string;
    geographic_location: string;
    order: number;
  }>;
  target_url: string;
  bypass_type: string;
  estimated_latency: number;
  success_probability: number;
  expiry_timestamp: number;
}

// Channel Information from Messenger Contract
export interface ChannelInfo {
  channel_id: string;
  name: string;
  channel_type: 'public' | 'private' | 'encrypted';
  creator: string;
  members: string[];
  created_timestamp: number;
  last_activity: number;
  message_count: number;
  encryption_key_hash?: string;
}

// Error types for contract interactions
export type ContractError = 
  | 'InsufficientFunds'
  | 'UnauthorizedAccess'
  | 'InvalidInput'
  | 'ContractNotFound'
  | 'MessageTooLarge'
  | 'ChannelNotFound'
  | 'UserNotMember'
  | 'ProxyNotAvailable'
  | 'InvalidProof'
  | 'VerifierNotRegistered'
  | 'PaymentFailed'
  | 'RecurringPaymentNotFound';

// Contract execution context
export interface ContractExecutionContext {
  sender: string;
  contract_address: string;
  block_height: number;
  block_time: number;
  chain_id: string;
  gas_limit: number;
}

// Smart contract event types
export interface ContractEvent {
  type: string;
  attributes: Array<{
    key: string;
    value: string;
    index?: boolean;
  }>;
}

// Specific event types
export interface MessageSentEvent extends ContractEvent {
  type: 'message_sent';
  attributes: [
    { key: 'message_id'; value: string },
    { key: 'sender'; value: string },
    { key: 'recipient'; value: string },
    { key: 'timestamp'; value: string },
    { key: 'payment_amount'; value: string }
  ];
}

export interface PaymentProcessedEvent extends ContractEvent {
  type: 'payment_processed';
  attributes: [
    { key: 'payment_id'; value: string },
    { key: 'sender'; value: string },
    { key: 'recipient'; value: string },
    { key: 'amount'; value: string },
    { key: 'denom'; value: string }
  ];
}

export interface ProofValidatedEvent extends ContractEvent {
  type: 'proof_validated';
  attributes: [
    { key: 'proof_id'; value: string },
    { key: 'validator'; value: string },
    { key: 'is_valid'; value: string },
    { key: 'proof_type'; value: string }
  ];
}

export interface ProxyRegisteredEvent extends ContractEvent {
  type: 'proxy_registered';
  attributes: [
    { key: 'proxy_id'; value: string },
    { key: 'proxy_url'; value: string },
    { key: 'proxy_type'; value: string },
    { key: 'location'; value: string }
  ];
}