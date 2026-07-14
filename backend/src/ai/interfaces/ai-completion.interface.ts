export interface AiCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AiCompletionResult {
  text: string;
  model: string;
  usedFallback: false;
}

export interface AiFallbackResult {
  usedFallback: true;
  reason: string;
}

export type AiResult = AiCompletionResult | AiFallbackResult;

export function isAiFallback(result: AiResult): result is AiFallbackResult {
  return result.usedFallback === true;
}
