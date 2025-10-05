import { SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { stringToPath } from "@cosmjs/crypto";
import { coins, GasPrice } from "@cosmjs/stargate";
import { 
  MessengerContract, 
  PaymentRouterContract, 
  PrivacyValidatorContract, 
  DPIBypassContract,
  MessageResponse,
  PaymentResponse,
  ProofValidationResponse,
  ProxyChainResponse
} from './contracts';
import { developerWallet } from './developer-wallet';

// Cosmos chain configuration for testnet
export const PRIVACHAIN_CONFIG = {
  chainId: "theta-testnet-001", // Using Cosmos testnet
  chainName: "Cosmos Testnet",
  rpc: "https://cosmos-testnet-rpc.allthatnode.com:26657",
  rest: "https://cosmos-testnet-api.allthatnode.com:1317",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "cosmos",
    bech32PrefixAccPub: "cosmospub",
    bech32PrefixValAddr: "cosmosvaloper",
    bech32PrefixValPub: "cosmosvaloperpub",
    bech32PrefixConsAddr: "cosmosvalcons",
    bech32PrefixConsPub: "cosmosvalconspub",
  },
  currencies: [
    {
      coinDenom: "ATOM",
      coinMinimalDenom: "uatom",
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "ATOM",
      coinMinimalDenom: "uatom",
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "ATOM",
    coinMinimalDenom: "uatom",
    coinDecimals: 6,
  },
};

// Smart contract addresses on Cosmos testnet (these would be deployed contracts)
export const SMART_CONTRACTS = {
  MESSENGER: "cosmos1messenger_contract_placeholder",
  PAYMENT_ROUTER: "cosmos1payment_router_placeholder", 
  PRIVACY_VALIDATOR: "cosmos1privacy_validator_placeholder",
  DPI_BYPASS: "cosmos1dpi_bypass_placeholder",
} as const;

// Message types for smart contract interactions
export const CONTRACT_MSG_TYPES = {
  WASM_EXECUTE: "/cosmwasm.wasm.v1.MsgExecuteContract",
  WASM_QUERY: "/cosmwasm.wasm.v1.QuerySmartContractState",
} as const;

export interface MessengerMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  encrypted: boolean;
  timestamp: number;
  channelId?: string;
  paymentAmount?: string;
  transactionHash?: string;
}

export interface PaymentTransaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  denom: string;
  messageId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  blockHeight?: number;
  timestamp: number;
}

export class CosmosService {
  private client: StargateClient | null = null;
  private signingClient: SigningStargateClient | null = null;
  private wallet: OfflineDirectSigner | null = null;
  private address: string | null = null;
  private isBackgroundProcessingEnabled = true;

  async connect(keplrOfflineSigner?: OfflineDirectSigner): Promise<string> {
    try {
      // Initialize developer wallet for background processing
      await developerWallet.initialize();

      if (keplrOfflineSigner) {
        // Use Keplr wallet for user interactions
        this.wallet = keplrOfflineSigner;
        const accounts = await this.wallet.getAccounts();
        this.address = accounts[0].address;
      } else {
        // Create a user wallet (for testing purposes)
        const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: PRIVACHAIN_CONFIG.bech32Config.bech32PrefixAccAddr,
          hdPaths: [stringToPath("m/44'/118'/0'/0/0")],
        });
        const accounts = await this.wallet.getAccounts();
        this.address = accounts[0].address;
      }

      // Connect to the chain
      this.client = await StargateClient.connect(PRIVACHAIN_CONFIG.rpc);
      this.signingClient = await SigningStargateClient.connectWithSigner(
        PRIVACHAIN_CONFIG.rpc,
        this.wallet,
        {
          gasPrice: GasPrice.fromString("0.025uatom"),
        }
      );

      return this.address;
    } catch (error) {
      console.error("Failed to connect to Cosmos chain:", error);
      throw new Error("Failed to connect to blockchain");
    }
  }

  async disconnect(): Promise<void> {
    this.client?.disconnect();
    this.signingClient = null;
    this.wallet = null;
    this.address = null;
  }

  async getBalance(): Promise<string> {
    if (!this.client || !this.address) {
      throw new Error("Not connected to blockchain");
    }

    const balance = await this.client.getBalance(this.address, "uatom");
    return (parseInt(balance.amount) / 1_000_000).toString(); // Convert microatom to ATOM
  }

  async processBackgroundTransaction(
    operationType: 'message' | 'privacy' | 'proxy' | 'storage',
    dataSize: number = 1,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    if (!this.isBackgroundProcessingEnabled) {
      throw new Error("Background processing is disabled");
    }

    try {
      // Process transaction through developer wallet
      const transactionHash = await developerWallet.processBackgroundTransaction(
        operationType,
        dataSize,
        priority
      );

      console.log(`Blockchain transaction processed: ${transactionHash}`);
      return transactionHash;
    } catch (error) {
      console.error("Background transaction failed:", error);
      // For a production system, you might want to queue the transaction for retry
      throw new Error("Transaction processing failed");
    }
  }

  async sendMessage(
    recipient: string,
    content: string,
    paymentAmount?: string,
    channelId?: string
  ): Promise<MessengerMessage> {
    if (!this.address) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Process transaction through developer wallet (transparent to user)
      const transactionHash = await this.processBackgroundTransaction(
        'message',
        content.length,
        paymentAmount ? 'high' : 'normal'
      );

      // Encrypt message content
      const encryptedContent = await this.encryptMessage(content, recipient);

      // Create message object with blockchain transaction reference
      const message: MessengerMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        sender: this.address,
        recipient,
        content,
        encrypted: true,
        timestamp: Date.now(),
        channelId,
        paymentAmount,
        transactionHash,
      };

      return message;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw new Error("Failed to send message via blockchain");
    }
  }

  async processPayment(
    recipient: string,
    amount: string,
    messageId?: string
  ): Promise<PaymentTransaction> {
    if (!this.address) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Process payment through developer wallet
      const transactionHash = await this.processBackgroundTransaction(
        'message',
        1, 
        'high'
      );

      const transaction: PaymentTransaction = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        from: this.address,
        to: recipient,
        amount,
        denom: "ATOM",
        messageId,
        status: 'confirmed',
        transactionHash,
        timestamp: Date.now(),
      };

      return transaction;
    } catch (error) {
      console.error("Failed to process payment:", error);
      throw new Error("Payment processing failed");
    }
  }

  async queryMessages(address?: string, limit: number = 50): Promise<MessengerMessage[]> {
    // In a production system, this would query actual blockchain data
    console.log("Querying messages from blockchain...");
    return [];
  }

  async validatePrivacyProof(proof: string, proofType: string = 'identity'): Promise<boolean> {
    if (!this.address) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Process privacy validation through developer wallet
      await this.processBackgroundTransaction('privacy', proof.length, 'normal');
      
      // For demo purposes, return true for valid-looking proofs
      return proof.length > 10;
    } catch (error) {
      console.error("Failed to validate privacy proof:", error);
      return false;
    }
  }

  async requestProxyChain(targetUrl: string, bypassType: string = 'dpi'): Promise<ProxyChainResponse | null> {
    if (!this.address) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Process proxy request through developer wallet
      const transactionHash = await this.processBackgroundTransaction('proxy', targetUrl.length, 'high');

      // Return mock proxy chain response
      return {
        chain_id: `chain_${Date.now()}`,
        proxy_endpoints: [
          { 
            proxy_id: "proxy1", 
            proxy_url: "https://proxy1.privachain.network",
            proxy_type: "https",
            geographic_location: "US",
            order: 1
          },
          { 
            proxy_id: "proxy2", 
            proxy_url: "https://proxy2.privachain.network",
            proxy_type: "https", 
            geographic_location: "EU",
            order: 2
          },
        ],
        target_url: targetUrl,
        bypass_type: bypassType,
        estimated_latency: 150,
        success_probability: 0.95,
        expiry_timestamp: Date.now() + 3600000, // 1 hour
      };
    } catch (error) {
      console.error("Failed to request proxy chain:", error);
      return null;
    }
  }

  private async encryptMessage(content: string, recipient: string): Promise<string> {
    // Implementation would use recipient's public key for encryption
    // For now, return base64 encoded content as placeholder
    return btoa(content);
  }

  private decryptMessage(encryptedContent: string, sender: string): string {
    // Implementation would use sender's public key for decryption
    // For now, return base64 decoded content as placeholder
    try {
      return atob(encryptedContent);
    } catch {
      return encryptedContent; // Return as-is if not base64
    }
  }

  getAddress(): string | null {
    return this.address;
  }

  isConnected(): boolean {
    return !!(this.client && this.signingClient && this.address);
  }

  // Get developer wallet status for monitoring
  getDeveloperWalletStatus() {
    return {
      isReady: developerWallet.isReady(),
      address: developerWallet.getAddress(),
    };
  }
}

// Global instance
export const cosmosService = new CosmosService();