/**
 * Public on-chain ids for the wc_predict package. Object ids and addresses are
 * public on Sui — safe to commit. Secrets (private keys) live only in the local
 * sui keystore / server env, never here.
 *
 * Published to testnet on 2026-06-08 (digest WB88ypF8nGUTrU55kiQnxMCL5QQPnAM3GVib3wKva6z).
 */
export const TESTNET_DEPLOYMENT = {
  network: "testnet",
  rpc: "https://fullnode.testnet.sui.io:443",
  packageId: "0x4e62c20fc179f4492d777046dccd06eebd0cedaa83511ea8fde7b8262c6a58a5",
  registryId: "0x80397659cc299b6e6d2e8b3849a25fb695a498f18e5fcd82b50b8d5d577e349f",
  scoreboardId: "0x18b4c86498ca88289e0c05bc1a0c58eaca21a8b74fb6bff4a2c882af6adc39fb",
  // Admin/Oracle caps are held by the deployer wallet; ids are public but only the
  // holder of the cap object can use them (server-side signing).
  adminCapId: "0x837dd54c2a1e800c494ab0cba7609413a059aa757cbfb46cb15924c2aefd9898",
  oracleCapId: "0x8507abecde0c135926846ca768a6707e5b1e6cce330706d281c45c4b04661a08",
  deployer: "0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d",
} as const;
