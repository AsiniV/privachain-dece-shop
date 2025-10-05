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

// Cosmos chain configuration for PrivaChain network
export const PRIVACHAIN_CONFIG = {
  chainId: "privachain-1",
  chainName: "PrivaChain Network",
  rpc: "https://rpc.privachain.network", // This would be your actual RPC endpoint
  rest: "https://api.privachain.network", // This would be your actual REST endpoint
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "privachain",
    bech32PrefixAccPub: "privachainpub",
    bech32PrefixValAddr: "privachainvaloper",
    bech32PrefixValPub: "privachainvaloperpub",
    bech32PrefixConsAddr: "privachainvalcons",
    bech32PrefixConsPub: "privachainvalconspub",
  },
  currencies: [
    {
      coinDenom: "PRIV",
      coinMinimalDenom: "upriv",
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "PRIV",
      coinMinimalDenom: "upriv",
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "PRIV",
    coinMinimalDenom: "upriv",
    coinDecimals: 6,
  },
};

// Smart contract addresses on PrivaChain network
export const SMART_CONTRACTS = {
  MESSENGER: "privachain1messenger_contract_address_here",
  PAYMENT_ROUTER: "privachain1payment_router_contract_address_here",
  PRIVACY_VALIDATOR: "privachain1privacy_validator_contract_address_here",
  DPI_BYPASS: "privachain1dpi_bypass_contract_address_here",
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

  async connect(keplrOfflineSigner?: OfflineDirectSigner): Promise<string> {
    try {
      if (keplrOfflineSigner) {
        // Use Keplr wallet
        this.wallet = keplrOfflineSigner;
        const accounts = await this.wallet.getAccounts();
        this.address = accounts[0].address;
      } else {
        // Create a development wallet (for testing purposes)
        const mnemonic = "your test mnemonic here for development only";
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
          gasPrice: GasPrice.fromString("0.025upriv"),
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

    const balance = await this.client.getBalance(this.address, "upriv");
    return (parseInt(balance.amount) / 1_000_000).toString(); // Convert micropriv to PRIV
  }

  async sendMessage(
    recipient: string,
    content: string,
    paymentAmount?: string,
    channelId?: string
  ): Promise<MessengerMessage> {
    if (!this.signingClient || !this.address) {
      throw new Error("Not connected to blockchain");
    }

    // Encrypt message content
    const encryptedContent = await this.encryptMessage(content, recipient);

    // Prepare the smart contract execution message
    const executeMsg: MessengerContract['send_message'] = {
      recipient,
      content: encryptedContent,
      payment_amount: paymentAmount,
      channel_id: channelId,
    };

    const msg = {
      typeUrl: CONTRACT_MSG_TYPES.WASM_EXECUTE,
      value: {
        sender: this.address,
        contract: SMART_CONTRACTS.MESSENGER,
        msg: Buffer.from(JSON.stringify({ send_message: executeMsg })),
        funds: paymentAmount ? coins(parseInt(paymentAmount) * 1_000_000, "upriv") : [],
      },
    };

    // Calculate gas and fee
    const gasEstimate = await this.signingClient.simulate(this.address, [msg], "");
    const fee = {
      amount: coins(Math.ceil(gasEstimate * 0.025), "upriv"),
      gas: gasEstimate.toString(),
    };

    // Execute the transaction
    const result = await this.signingClient.signAndBroadcast(this.address, [msg], fee);
    
    if (result.code !== 0) {
      throw new Error(`Transaction failed: ${result.rawLog}`);
    }

    // Parse the smart contract response
    const messageId = this.extractMessageIdFromEvents([...result.events]);

    // Create message object
    const message: MessengerMessage = {
      id: messageId || `${result.transactionHash}-${Date.now()}`,
      sender: this.address,
      recipient,
      content,
      encrypted: true,
      timestamp: Date.now(),
      channelId,
      paymentAmount,
      transactionHash: result.transactionHash,
    };

    return message;
  }

  async processPayment(
    recipient: string,
    amount: string,
    messageId?: string
  ): Promise<PaymentTransaction> {
    if (!this.signingClient || !this.address) {
      throw new Error("Not connected to blockchain");
    }

    const amountInMicroPriv = parseInt(amount) * 1_000_000;

    // Prepare the smart contract execution message
    const executeMsg: PaymentRouterContract['process_payment'] = {
      sender: this.address,
      recipient,
      amount: amountInMicroPriv.toString(),
      denom: "upriv",
      message_id: messageId,
    };

    const msg = {
      typeUrl: CONTRACT_MSG_TYPES.WASM_EXECUTE,
      value: {
        sender: this.address,
        contract: SMART_CONTRACTS.PAYMENT_ROUTER,
        msg: Buffer.from(JSON.stringify({ process_payment: executeMsg })),
        funds: coins(amountInMicroPriv, "upriv"),
      },
    };

    const gasEstimate = await this.signingClient.simulate(this.address, [msg], "");
    const fee = {
      amount: coins(Math.ceil(gasEstimate * 0.025), "upriv"),
      gas: gasEstimate.toString(),
    };

    const result = await this.signingClient.signAndBroadcast(this.address, [msg], fee);
    
    if (result.code !== 0) {
      throw new Error(`Payment failed: ${result.rawLog}`);
    }

    const paymentId = this.extractPaymentIdFromEvents([...result.events]);

    const transaction: PaymentTransaction = {
      id: paymentId || result.transactionHash,
      from: this.address,
      to: recipient,
      amount,
      denom: "PRIV",
      messageId,
      status: 'confirmed',
      transactionHash: result.transactionHash,
      blockHeight: result.height,
      timestamp: Date.now(),
    };

    return transaction;
  }

  async queryMessages(address?: string, limit: number = 50): Promise<MessengerMessage[]> {
    if (!this.client) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Query the smart contract for messages using CosmWasmClient
      // For now, return empty array as this requires proper CosmWasm client setup
      console.log("Querying messages from blockchain...");
      return [];
    } catch (error) {
      console.error("Failed to query messages:", error);
      return [];
    }
  }

  async validatePrivacyProof(proof: string, proofType: string = 'identity'): Promise<boolean> {
    if (!this.signingClient || !this.address) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Prepare the smart contract execution message
      const executeMsg: PrivacyValidatorContract['validate_proof'] = {
        proof,
        public_inputs: [],
        proof_type: proofType as any,
        verifier_key: "default_verifier",
      };

      const msg = {
        typeUrl: CONTRACT_MSG_TYPES.WASM_EXECUTE,
        value: {
          sender: this.address,
          contract: SMART_CONTRACTS.PRIVACY_VALIDATOR,
          msg: Buffer.from(JSON.stringify({ validate_proof: executeMsg })),
          funds: coins(1000, "upriv"), // Small fee for validation
        },
      };

      const gasEstimate = await this.signingClient.simulate(this.address, [msg], "");
      const fee = {
        amount: coins(Math.ceil(gasEstimate * 0.025), "upriv"),
        gas: gasEstimate.toString(),
      };

      const result = await this.signingClient.signAndBroadcast(this.address, [msg], fee);
      
      if (result.code !== 0) {
        console.error("Proof validation failed:", result.rawLog);
        return false;
      }

      // Extract validation result from events
      return this.extractValidationResultFromEvents([...result.events]);
    } catch (error) {
      console.error("Failed to validate privacy proof:", error);
      return false;
    }
  }

  async requestProxyChain(targetUrl: string, bypassType: string = 'dpi'): Promise<ProxyChainResponse | null> {
    if (!this.signingClient || !this.address) {
      throw new Error("Not connected to blockchain");
    }

    try {
      // Prepare the smart contract execution message
      const executeMsg: DPIBypassContract['request_proxy_chain'] = {
        target_url: targetUrl,
        bypass_type: bypassType as any,
        max_hops: 3,
      };

      const msg = {
        typeUrl: CONTRACT_MSG_TYPES.WASM_EXECUTE,
        value: {
          sender: this.address,
          contract: SMART_CONTRACTS.DPI_BYPASS,
          msg: Buffer.from(JSON.stringify({ request_proxy_chain: executeMsg })),
          funds: coins(5000, "upriv"), // Fee for proxy chain request
        },
      };

      const gasEstimate = await this.signingClient.simulate(this.address, [msg], "");
      const fee = {
        amount: coins(Math.ceil(gasEstimate * 0.025), "upriv"),
        gas: gasEstimate.toString(),
      };

      const result = await this.signingClient.signAndBroadcast(this.address, [msg], fee);
      
      if (result.code !== 0) {
        console.error("Proxy chain request failed:", result.rawLog);
        return null;
      }

      // Extract proxy chain information from events
      return this.extractProxyChainFromEvents([...result.events]);
    } catch (error) {
      console.error("Failed to request proxy chain:", error);
      return null;
    }
  }

  // Helper methods for event parsing
  private extractMessageIdFromEvents(events: any[]): string | null {
    for (const event of events) {
      if (event.type === 'wasm') {
        for (const attr of event.attributes) {
          if (attr.key === 'message_id') {
            return attr.value;
          }
        }
      }
    }
    return null;
  }

  private extractPaymentIdFromEvents(events: any[]): string | null {
    for (const event of events) {
      if (event.type === 'wasm') {
        for (const attr of event.attributes) {
          if (attr.key === 'payment_id') {
            return attr.value;
          }
        }
      }
    }
    return null;
  }

  private extractValidationResultFromEvents(events: any[]): boolean {
    for (const event of events) {
      if (event.type === 'wasm') {
        for (const attr of event.attributes) {
          if (attr.key === 'is_valid') {
            return attr.value === 'true';
          }
        }
      }
    }
    return false;
  }

  private extractProxyChainFromEvents(events: any[]): ProxyChainResponse | null {
    for (const event of events) {
      if (event.type === 'wasm') {
        for (const attr of event.attributes) {
          if (attr.key === 'proxy_chain') {
            try {
              return JSON.parse(attr.value);
            } catch {
              return null;
            }
          }
        }
      }
    }
    return null;
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
}

// Global instance
export const cosmosService = new CosmosService();