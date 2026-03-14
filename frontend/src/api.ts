import { AnalyzeStrategyResponse, StrategyStep, TextCheckResponse } from './types';

/**
 * Типы ошибок API для безопасной и понятной обработки в UI.
 */
export type ApiErrorKind = 'network' | 'http' | 'abort' | 'unknown';

/**
 * Типизированная ошибка клиентского API-слоя.
 */
export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status: number | null;
  details: string | null;

  constructor(message: string, kind: ApiErrorKind, status: number | null = null, details: string | null = null) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

interface ErrorPayload {
  detail?: string;
  message?: string;
  error?: string;
}

/**
 * Возвращает базовый URL API из env (если задан) без завершающего слеша.
 * Пример: VITE_API_BASE_URL=https://example.com
 */
function getApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
  return fromEnv.replace(/\/+$/, '');
}

/**
 * Собирает итоговый URL к API с учетом опционального базового адреса.
 */
function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${baseUrl}${path}`;
  }

  return `${baseUrl}/${path}`;
}

/**
 * Безопасно извлекает строку с деталями ошибки из тела ответа API.
 */
async function getErrorDetails(response: Response): Promise<string | null> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as ErrorPayload;
    return payload.detail ?? payload.message ?? payload.error ?? null;
  }

  const text = (await response.text()).trim();
  return text || null;
}

/**
 * Универсальный POST JSON с типобезопасным ответом и нормализованными ошибками.
 */
async function postJson<TPayload extends Record<string, unknown>, TResult>(
  path: string,
  payload: TPayload,
  signal?: AbortSignal,
): Promise<TResult> {
  try {
    const response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const details = await getErrorDetails(response);
      throw new ApiClientError(`HTTP ${response.status}`, 'http', response.status, details);
    }

    return (await response.json()) as TResult;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError('Request aborted', 'abort');
    }

    if (error instanceof TypeError) {
      throw new ApiClientError('Network error', 'network');
    }

    throw new ApiClientError('Unknown API error', 'unknown');
  }
}

/**
 * Запрашивает правовой анализ стратегии.
 */
export async function analyzeStrategy(
  steps: StrategyStep[],
  signal?: AbortSignal,
): Promise<AnalyzeStrategyResponse> {
  return postJson<{ steps_config: Array<{ id: string; module: string; settings: Record<string, unknown> }> }, AnalyzeStrategyResponse>(
    '/api/analyze-strategy',
    {
      steps_config: steps.map((step) => ({
        id: step.id,
        module: step.module,
        settings: step.settings,
      })),
    },
    signal,
  );
}

/**
 * Проверяет рекламный текст через backend-валидатор.
 */
export async function checkText(text: string): Promise<TextCheckResponse> {
  return postJson<{ text: string }, TextCheckResponse>('/api/check-text', { text });
}
