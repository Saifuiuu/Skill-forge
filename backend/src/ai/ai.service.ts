import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiCompletionOptions,
  AiResult,
  isAiFallback,
} from './interfaces/ai-completion.interface';

// -------------------------
// GROQ CONFIG
// -------------------------
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// -------------------------
// ANTHROPIC CONFIG (COMMENTED)
// -------------------------
// const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
// const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  isDisabled(): boolean {
    const flag = this.configService.get<string>('AI_DISABLED', 'false');
    return flag === 'true' || flag === '1';
  }

  private getApiKey(): string | null {
    const key = this.configService.get<string>('GROQ_API_KEY') ?? null;
    return key?.trim() ? key.trim() : null;
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
      return {
        usedFallback: true,
        reason: 'GROQ_API_KEY is not configured',
      };
    }

    const model = options.model ?? DEFAULT_MODEL;
    const maxTokens = options.maxTokens ?? 2048;

    const requestPayload = {
      model,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: maxTokens,
    };

    this.logger.log(
      `Groq request model=${model} max_tokens=${maxTokens} ` +
        `systemChars=${systemPrompt.length} userChars=${userPrompt.length}`,
    );

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Groq API error ${response.status}: ${body.slice(0, 800)}`);
        return {
          usedFallback: true,
          reason: `Groq API returned ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
        usage?: { total_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content?.trim();
      this.logger.log(
        `Groq response tokens=${data.usage?.total_tokens ?? 'n/a'} ` +
          `contentChars=${text?.length ?? 0} preview=${JSON.stringify((text ?? '').slice(0, 240))}`,
      );

      if (!text) {
        return {
          usedFallback: true,
          reason: 'Empty response from GROQ API',
        };
      }

      return {
        text,
        model,
        usedFallback: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`Groq API call failed: ${message}`);

      return {
        usedFallback: true,
        reason: message,
      };
    }
  }

  async completeJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options: AiCompletionOptions = {},
  ): Promise<{ data: T | null; result: AiResult }> {
    const jsonSystemPrompt = `${systemPrompt}

Respond with valid JSON only. No markdown fences or extra commentary.`;

    const result = await this.complete(
      jsonSystemPrompt,
      userPrompt,
      options,
    );

    if (isAiFallback(result)) {
      return {
        data: null,
        result,
      };
    }

    try {
      const parsed = JSON.parse(this.extractJson(result.text)) as T;

      return {
        data: parsed,
        result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'JSON parse error';

      this.logger.warn(
        `Failed to parse AI JSON response: ${message}`,
      );

      return {
        data: null,
        result: {
          usedFallback: true,
          reason: `Invalid JSON from AI: ${message}`,
        },
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