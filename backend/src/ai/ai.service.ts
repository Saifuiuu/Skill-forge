import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiCompletionOptions,
  AiCompletionResult,
  AiFallbackResult,
  AiResult,
  isAiFallback,
} from './interfaces/ai-completion.interface';

const DEFAULT_MODEL = 'claude-sonnet-5';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  isDisabled(): boolean {
    const flag = this.configService.get<string>('AI_DISABLED', 'false');
    return flag === 'true' || flag === '1';
  }

  private getApiKey(): string | null {
    return this.configService.get<string>('ANTHROPIC_API_KEY') ?? null;
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options: AiCompletionOptions = {},
  ): Promise<AiResult> {
    if (this.isDisabled()) {
      return { usedFallback: true, reason: 'AI_DISABLED flag is set' };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { usedFallback: true, reason: 'ANTHROPIC_API_KEY is not configured' };
    }

    const model = options.model ?? DEFAULT_MODEL;
    const maxTokens = options.maxTokens ?? 2048;

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Anthropic API error ${response.status}: ${body}`);
        return {
          usedFallback: true,
          reason: `Anthropic API returned ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };

      const text = data.content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('')
        .trim();

      if (!text) {
        return { usedFallback: true, reason: 'Empty response from Anthropic API' };
      }

      return { text, model, usedFallback: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Anthropic API call failed: ${message}`);
      return { usedFallback: true, reason: message };
    }
  }

  async completeJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options: AiCompletionOptions = {},
  ): Promise<{ data: T | null; result: AiResult }> {
    const jsonSystemPrompt = `${systemPrompt}\n\nRespond with valid JSON only. No markdown fences or extra commentary.`;
    const result = await this.complete(jsonSystemPrompt, userPrompt, options);

    if (isAiFallback(result)) {
      return { data: null, result };
    }

    try {
      const parsed = JSON.parse(this.extractJson(result.text)) as T;
      return { data: parsed, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'JSON parse error';
      this.logger.warn(`Failed to parse AI JSON response: ${message}`);
      return {
        data: null,
        result: { usedFallback: true, reason: `Invalid JSON from AI: ${message}` },
      };
    }
  }

  private extractJson(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }
    return text.trim();
  }
}
