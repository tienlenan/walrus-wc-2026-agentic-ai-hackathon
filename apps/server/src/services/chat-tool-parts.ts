export interface ChatTextPart {
  type: "text";
  text: string;
}

export interface ChatToolPart<TInput = unknown, TOutput = unknown> {
  type: `tool-${string}`;
  toolCallId: string;
  state: "output-available";
  input: TInput;
  output: TOutput;
}

export type ChatRenderPart = ChatTextPart | ChatToolPart;

export function toolPart<TInput, TOutput>(toolName: string, input: TInput, output: TOutput): ChatToolPart<TInput, TOutput> {
  return {
    type: `tool-${toolName}`,
    toolCallId: `${toolName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    state: "output-available",
    input,
    output,
  };
}

export function compactId(value: string | null | undefined): string {
  if (!value) return "none";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}
