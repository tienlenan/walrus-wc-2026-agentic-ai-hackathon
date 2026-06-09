import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

export type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";

export const SUI_NETWORK = (process.env.SUI_NETWORK as SuiNetwork | undefined) ?? "testnet";

const GRPC_URLS: Record<SuiNetwork, string> = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
  localnet: "http://127.0.0.1:9000",
};

const GRAPHQL_URLS: Record<SuiNetwork, string> = {
  mainnet: "https://graphql.mainnet.sui.io/graphql",
  testnet: "https://graphql.testnet.sui.io/graphql",
  devnet: "https://graphql.devnet.sui.io/graphql",
  localnet: "http://127.0.0.1:9125/graphql",
};

export function getSuiGrpcClient(): SuiGrpcClient {
  const transport = new GrpcWebFetchTransport({
    baseUrl: process.env.SUI_GRPC_URL ?? process.env.SUI_RPC_URL ?? GRPC_URLS[SUI_NETWORK],
  });
  return new SuiGrpcClient({
    network: SUI_NETWORK,
    transport,
  });
}

export function getSuiGraphQLClient(): SuiGraphQLClient {
  return new SuiGraphQLClient({
    network: SUI_NETWORK,
    url: process.env.SUI_GRAPHQL_URL ?? GRAPHQL_URLS[SUI_NETWORK],
  });
}
