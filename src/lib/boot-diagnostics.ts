/**
 * Diagnóstico de boot — usado para investigar a rejeição "tela em branco"
 * da Apple (Guideline 2.1(a)) em iPadOS/iOS.
 *
 * Objetivos:
 *  - Todo evento tem um `request_id` estável por sessão (sobrevive ao retry
 *    de reload), para correlacionar o que aconteceu antes e depois.
 *  - Registra rota, chunk que falhou, erro e ambiente (iPadOS/iOS, WebView
 *    do Capacitor, standalone, online/offline).
 *  - Mantém um buffer em sessionStorage, então após o reload automático dá
 *    para ver a sequência inteira em `window.__UPPLIN_BOOT_LOG__()`.
 *
 * Sem dependências: é importado no começo do main.tsx, antes do React.
 */

const REQUEST_ID_KEY = "__upplin_boot_request_id__";
const BUFFER_KEY = "__upplin_boot_log__";
const MAX_ENTRIES = 40;

export type BootEvent =
  | "boot_start"
  | "boot_mounted"
  | "boot_fatal"
  | "chunk_error"
  | "chunk_retry_reload"
  | "chunk_retry_exhausted"
  | "fallback_shown"
  | "fallback_stalled"
  | "fallback_manual_retry"
  | "watchdog_timeout"
  | "window_error"
  | "unhandled_rejection";

type Details = Record<string, unknown>;

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* Safari privado pode bloquear — ignoramos */
  }
}

function createId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** ID estável por sessão da aba — sobrevive ao reload de retry. */
export function getBootRequestId(): string {
  const existing = safeSessionGet(REQUEST_ID_KEY);
  if (existing) return existing;
  const id = createId();
  safeSessionSet(REQUEST_ID_KEY, id);
  return id;
}

/** Ambiente do dispositivo — o que interessa para reproduzir no review. */
export function getBootEnvironment() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ se identifica como Mac com touch
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);

  return {
    platform: isIOS ? (/iPad/.test(ua) || /Macintosh/.test(ua) ? "ipados" : "ios") : "other",
    user_agent: ua,
    is_capacitor: window.location.protocol === "capacitor:" || "Capacitor" in window,
    is_standalone:
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia?.("(display-mode: standalone)")?.matches === true,
    is_iframe: window.self !== window.top,
    online: navigator.onLine,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    lang: navigator.language,
  };
}

function currentRoute() {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function serializeError(err: unknown) {
  if (!err) return null;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 6).join("\n"),
    };
  }
  if (typeof err === "object") {
    try {
      return JSON.parse(JSON.stringify(err));
    } catch {
      return { message: String(err) };
    }
  }
  return { message: String(err) };
}

/** Extrai a URL do chunk a partir da mensagem de erro do Vite/browser. */
export function extractChunkUrl(err: unknown): string | null {
  const source =
    (err as { payload?: unknown })?.payload ??
    (err as { target?: { src?: string } })?.target?.src ??
    err;

  if (typeof source === "string" && /https?:\/\//.test(source)) {
    const match = source.match(/https?:\/\/\S+?\.(?:js|css|mjs)/);
    if (match) return match[0];
  }

  const msg = String((source as Error)?.message ?? source ?? "");
  const match = msg.match(/https?:\/\/\S+?\.(?:js|css|mjs)/);
  return match ? match[0] : null;
}

function readBuffer(): unknown[] {
  const raw = safeSessionGet(BUFFER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Registra um evento de boot com request_id, rota, chunk e erro.
 * Sempre imprime no console (visível no Safari Web Inspector conectado ao
 * iPad, que é como a Apple e nós reproduzimos o problema).
 */
export function logBootEvent(event: BootEvent, details: Details = {}) {
  if (typeof window === "undefined") return;

  const entry = {
    request_id: getBootRequestId(),
    event,
    route: currentRoute(),
    at: new Date().toISOString(),
    uptime_ms: Math.round(performance?.now?.() ?? 0),
    ...getBootEnvironment(),
    ...details,
    ...(details.error !== undefined ? { error: serializeError(details.error) } : {}),
  };

  const isFailure =
    event === "boot_fatal" ||
    event === "chunk_error" ||
    event === "chunk_retry_exhausted" ||
    event === "watchdog_timeout" ||
    event === "window_error" ||
    event === "unhandled_rejection";

  // eslint-disable-next-line no-console
  (isFailure ? console.error : console.warn)(`[boot:${event}]`, entry);

  const buffer = readBuffer();
  buffer.push(entry);
  safeSessionSet(BUFFER_KEY, JSON.stringify(buffer.slice(-MAX_ENTRIES)));

  const w = window as typeof window & { __UPPLIN_BOOT_LOG__?: () => unknown[] };
  if (!w.__UPPLIN_BOOT_LOG__) {
    w.__UPPLIN_BOOT_LOG__ = () => readBuffer();
  }
}

/** Histórico completo desta sessão (inclui o que veio antes do retry). */
export function getBootLog(): unknown[] {
  return readBuffer();
}
