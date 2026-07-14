import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  const createService = (config: Record<string, string>) => {
    return Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) =>
              config[key] ?? defaultValue,
          },
        },
      ],
    }).compile();
  };

  it('reports disabled when AI_DISABLED=true', async () => {
    const module = await createService({ AI_DISABLED: 'true' });
    service = module.get(AiService);
    expect(service.isDisabled()).toBe(true);

    const result = await service.complete('system', 'user');
    expect(result).toEqual({
      usedFallback: true,
      reason: 'AI_DISABLED flag is set',
    });
  });

  it('falls back when API key is missing', async () => {
    const module = await createService({ AI_DISABLED: 'false' });
    service = module.get(AiService);

    const result = await service.complete('system', 'user');
    expect(result).toEqual({
      usedFallback: true,
      reason: 'ANTHROPIC_API_KEY is not configured',
    });
  });

  it('parses JSON from fenced model output', async () => {
    const module = await createService({
      AI_DISABLED: 'true',
    });
    service = module.get(AiService);

    const extractJson = (service as any).extractJson.bind(service);
    expect(extractJson('```json\n{"ok":true}\n```')).toBe('{"ok":true}');
    expect(extractJson('{"ok":true}')).toBe('{"ok":true}');
  });
});
