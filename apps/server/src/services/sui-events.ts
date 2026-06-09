import { getSuiGraphQLClient } from "./sui-clients.js";

export interface ChainEventCursor {
  after: string | null;
}

export interface ChainEvent {
  id: { txDigest: string; eventSeq: string };
  parsedJson?: unknown;
  cursor: ChainEventCursor;
}

export interface ChainEventPage {
  events: ChainEvent[];
  hasNextPage: boolean;
  nextCursor: ChainEventCursor | null;
}

interface QueryEventsResult {
  events?: {
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    edges?: Array<{
      cursor?: string | null;
      node?: {
        sequenceNumber?: number | string;
        contents?: { json?: unknown } | null;
        transaction?: { digest?: string | null } | null;
      } | null;
    } | null>;
  } | null;
}

const QUERY_EVENTS = `
  query QueryEvents($type: String!, $first: Int!, $after: String) {
    events(first: $first, after: $after, filter: { type: $type }) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          sequenceNumber
          contents { json }
          transaction { digest }
        }
      }
    }
  }
`;

export async function queryMoveEvents(input: {
  type: string;
  after?: string | null;
  first?: number;
}): Promise<ChainEventPage> {
  const result = await getSuiGraphQLClient().query<QueryEventsResult, { type: string; first: number; after: string | null }>({
    query: QUERY_EVENTS,
    variables: { type: input.type, first: input.first ?? 50, after: input.after ?? null },
  });
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join("; "));

  const edges = result.data?.events?.edges ?? [];
  const events: ChainEvent[] = [];
  for (const edge of edges) {
    const node = edge?.node;
    const digest = node?.transaction?.digest;
    if (!node || !digest || !edge?.cursor) continue;
    events.push({
      id: { txDigest: digest, eventSeq: String(node.sequenceNumber ?? "") },
      parsedJson: node.contents?.json,
      cursor: { after: edge.cursor },
    });
  }

  const endCursor = result.data?.events?.pageInfo?.endCursor ?? null;
  return {
    events,
    hasNextPage: Boolean(result.data?.events?.pageInfo?.hasNextPage),
    nextCursor: endCursor ? { after: endCursor } : null,
  };
}
