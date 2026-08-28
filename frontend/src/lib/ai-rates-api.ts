export type AiCreditRate = {
  id: string;
  feature: string;
  size_tier: string;
  threshold_max: number | null;
  credits: number;
  updated_at: string;
};

export type AiCreditRateUpdate = {
  feature: string;
  size_tier: string;
  threshold_max: number | null;
  credits: number;
};

export type AiModelRate = {
  id: string;
  model: string;
  cost_per_1k_input_tokens: string | number;
  cost_per_1k_output_tokens: string | number;
  updated_at: string;
};

export type AiModelRateUpdate = {
  model: string;
  cost_per_1k_input_tokens: string;
  cost_per_1k_output_tokens: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class AiRatesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AiRatesApiError";
  }
}

async function aiRatesRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/ai-rates/${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // The fallback below handles non-JSON upstream errors.
    }
    throw new AiRatesApiError(
      payload.detail || "Ratele AI nu au putut fi salvate.",
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getAdminCreditRates(): Promise<AiCreditRate[]> {
  return aiRatesRequest<AiCreditRate[]>("credits");
}

export function updateAdminCreditRates(
  rates: AiCreditRateUpdate[],
): Promise<AiCreditRate[]> {
  return aiRatesRequest<AiCreditRate[]>("credits", {
    method: "PUT",
    body: JSON.stringify({ rates }),
  });
}

export function getAdminModelRates(): Promise<AiModelRate[]> {
  return aiRatesRequest<AiModelRate[]>("models");
}

export function updateAdminModelRates(
  rates: AiModelRateUpdate[],
): Promise<AiModelRate[]> {
  return aiRatesRequest<AiModelRate[]>("models", {
    method: "PUT",
    body: JSON.stringify({ rates }),
  });
}
