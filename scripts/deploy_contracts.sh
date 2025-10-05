#!/bin/bash

# PrivaChain Smart Contract Deployment Script
# This script deploys the core smart contracts for the PrivaChain ecosystem

echo "🚀 Starting PrivaChain Smart Contract Deployment"

# Network configuration
CHAIN_ID="privachain-1"
NODE_URL="https://rpc.privachain.network"
DEPLOYER_KEY="deployer"
GAS_PRICES="0.025upriv"

# Contract paths (these would be compiled contracts)
MESSENGER_CONTRACT="./contracts/messenger.wasm"
PAYMENT_ROUTER_CONTRACT="./contracts/payment_router.wasm"
PRIVACY_VALIDATOR_CONTRACT="./contracts/privacy_validator.wasm"
DPI_BYPASS_CONTRACT="./contracts/dpi_bypass.wasm"

echo "📦 Deploying Messenger Contract..."
MESSENGER_CODE_ID=$(privachain tx wasm store $MESSENGER_CONTRACT \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')

echo "✅ Messenger contract stored with code ID: $MESSENGER_CODE_ID"

# Initialize messenger contract
MESSENGER_INIT_MSG='{
  "admin": "privachain1admin_address_here",
  "fee_collector": "privachain1fee_collector_address_here",
  "message_fee": "1000",
  "encryption_required": true,
  "max_message_size": 4096
}'

MESSENGER_ADDRESS=$(privachain tx wasm instantiate $MESSENGER_CODE_ID \
  "$MESSENGER_INIT_MSG" \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  --label "PrivaChain Messenger" \
  --admin $(privachain keys show $DEPLOYER_KEY -a) \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

echo "✅ Messenger contract deployed at: $MESSENGER_ADDRESS"

echo "📦 Deploying Payment Router Contract..."
PAYMENT_CODE_ID=$(privachain tx wasm store $PAYMENT_ROUTER_CONTRACT \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')

echo "✅ Payment Router contract stored with code ID: $PAYMENT_CODE_ID"

# Initialize payment router contract
PAYMENT_INIT_MSG='{
  "admin": "privachain1admin_address_here",
  "supported_denoms": ["upriv"],
  "min_payment": "1000",
  "max_payment": "1000000000000",
  "fee_percentage": "1"
}'

PAYMENT_ADDRESS=$(privachain tx wasm instantiate $PAYMENT_CODE_ID \
  "$PAYMENT_INIT_MSG" \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  --label "PrivaChain Payment Router" \
  --admin $(privachain keys show $DEPLOYER_KEY -a) \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

echo "✅ Payment Router contract deployed at: $PAYMENT_ADDRESS"

echo "📦 Deploying Privacy Validator Contract..."
PRIVACY_CODE_ID=$(privachain tx wasm store $PRIVACY_VALIDATOR_CONTRACT \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')

echo "✅ Privacy Validator contract stored with code ID: $PRIVACY_CODE_ID"

# Initialize privacy validator contract
PRIVACY_INIT_MSG='{
  "admin": "privachain1admin_address_here",
  "trusted_verifiers": ["privachain1verifier1", "privachain1verifier2"],
  "proof_validity_period": 3600,
  "zk_verification_enabled": true
}'

PRIVACY_ADDRESS=$(privachain tx wasm instantiate $PRIVACY_CODE_ID \
  "$PRIVACY_INIT_MSG" \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  --label "PrivaChain Privacy Validator" \
  --admin $(privachain keys show $DEPLOYER_KEY -a) \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

echo "✅ Privacy Validator contract deployed at: $PRIVACY_ADDRESS"

echo "📦 Deploying DPI Bypass Contract..."
DPI_CODE_ID=$(privachain tx wasm store $DPI_BYPASS_CONTRACT \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')

echo "✅ DPI Bypass contract stored with code ID: $DPI_CODE_ID"

# Initialize DPI bypass contract
DPI_INIT_MSG='{
  "admin": "privachain1admin_address_here",
  "supported_protocols": ["https", "http", "wss", "ws"],
  "domain_fronting_enabled": true,
  "traffic_obfuscation_enabled": true,
  "max_proxy_chains": 3
}'

DPI_ADDRESS=$(privachain tx wasm instantiate $DPI_CODE_ID \
  "$DPI_INIT_MSG" \
  --from $DEPLOYER_KEY \
  --chain-id $CHAIN_ID \
  --node $NODE_URL \
  --gas-prices $GAS_PRICES \
  --gas auto \
  --gas-adjustment 1.3 \
  --label "PrivaChain DPI Bypass" \
  --admin $(privachain keys show $DEPLOYER_KEY -a) \
  -y \
  --output json | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

echo "✅ DPI Bypass contract deployed at: $DPI_ADDRESS"

# Create configuration file
echo "📝 Creating deployment configuration..."
cat > deployment_config.json << EOF
{
  "chain_id": "$CHAIN_ID",
  "contracts": {
    "messenger": {
      "code_id": $MESSENGER_CODE_ID,
      "address": "$MESSENGER_ADDRESS"
    },
    "payment_router": {
      "code_id": $PAYMENT_CODE_ID,
      "address": "$PAYMENT_ADDRESS"
    },
    "privacy_validator": {
      "code_id": $PRIVACY_CODE_ID,
      "address": "$PRIVACY_ADDRESS"
    },
    "dpi_bypass": {
      "code_id": $DPI_CODE_ID,
      "address": "$DPI_ADDRESS"
    }
  },
  "deployment_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$(privachain keys show $DEPLOYER_KEY -a)"
}
EOF

echo "🎉 All contracts deployed successfully!"
echo ""
echo "📄 Deployment Summary:"
echo "├── Messenger Contract: $MESSENGER_ADDRESS"
echo "├── Payment Router: $PAYMENT_ADDRESS"
echo "├── Privacy Validator: $PRIVACY_ADDRESS"
echo "└── DPI Bypass: $DPI_ADDRESS"
echo ""
echo "Configuration saved to deployment_config.json"
echo ""
echo "🔧 Next steps:"
echo "1. Update your application's SMART_CONTRACTS configuration"
echo "2. Test contract interactions"
echo "3. Configure governance parameters"
echo "4. Set up monitoring and alerts"