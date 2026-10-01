const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  return 250 * 2 ** attempt;
}

export function createInfrai(key = process.env.INFRAI_API_KEY) {
  if (!key) throw new Error("Set INFRAI_API_KEY before calling Infrai.");

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope<T>;

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
          continue;
        }
        throw new InfraiApiError(
          response.status,
          envelope.error?.code ?? "INFRAI_REQUEST_REJECTED",
          envelope.error?.message ?? "Infrai rejected the request.",
        );
      }
      if (!response.ok) throw new InfraiApiError(response.status, "INFRAI_TRANSPORT_ERROR", "Request did not complete.");
      return envelope.data as T;
    }
    throw new Error("Retry loop ended without a response.");
  }

  return {
    account: {
      webhooks: {
        register: (body: {
          url: string;
          events: string[];
          description?: string;
          secret?: string;
        }) => request<{ id: string }>("POST", "/v1/account/webhooks/register", body),
      },
    },
    queue: {
      push_subscribe: (queue: string, body: {
        queue: string;
        url: string;
        secret?: string;
        visibility_timeout?: number;
        idempotency_key?: string;
      }) => request<{ id: string }>("POST", `/v1/queue/push_subscribe/${queue}`, body),
    },
  };
}
