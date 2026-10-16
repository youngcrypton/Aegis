# Alchemy Smart WebSockets — Elysium L2 Testnet

Real-time, persistent event streaming on Elysium L2 via Alchemy Smart WebSockets.

## Setup & Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure your `.env` contains your Alchemy API Key:
   ```env
   ALCHEMY_API_KEY=your_alchemy_api_key_here
   ```

## Running the Demo

```bash
node demo-script.js
```
*(Or use `npm start`)*

## How It Works

1. **Persistent WSS Connection**:
   Connects to `wss://elysium-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`.

2. **JSON-RPC Subscription (`eth_subscribe`)**:
   Sends:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "eth_subscribe",
     "params": ["newHeads"]
   }
   ```

3. **Instant Server Confirmation**:
   Alchemy returns a unique `subscriptionId`:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "result": "0x51c70e..."
   }
   ```

4. **Real-time Event Stream (`eth_subscription`)**:
   Whenever a new block is mined on Elysium, Alchemy pushes the block header without any HTTP polling:
   - **`number`**: Hex block height (parsed to decimal).
   - **`hash`**: Block hash.
   - **`timestamp`**: Block production time.
   - **`gasUsed`**: Real-time compute units consumed.
   - **`parentHash`**: Cryptographic link to previous block.

5. **Graceful Teardown (`Ctrl+C`)**:
   Sends `eth_unsubscribe` to clean up the subscription and closes the socket cleanly.
