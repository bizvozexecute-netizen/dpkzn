import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { connect as tlsConnect } from "node:tls";
import type { Socket } from "node:net";

/**
 * Отправка в Telegram Bot API через node:https, а не fetch/undici.
 *
 * История (диагностика 02.09.2026, потерянные лиды): с этого VPS undici-fetch
 * к api.telegram.org стабильно виснет (6/6 таймаутов даже с прикнутым IPv4 и
 * выключенной family-autoselection), при этом node:https и curl проходят
 * 6/6 за ~250мс. Прокси BOT_API_PROXY были костылём вокруг этого и умерли —
 * заявки молча терялись. Поэтому: node:https, принудительный IPv4 (DNS VPS
 * отдаёт AAAA, а IPv6-маршрутизации у хоста нет), таймаут и повтор.
 *
 * Прокси (BOT_API_PROXY, http://user:pass@host:port) — опция, НЕ единственная
 * точка отказа: порядок попыток «прокси (если задан) → прямое → прямое ещё
 * раз». Умерший прокси теперь стоит одну задержку, а не потерянный лид.
 */

export interface TelegramSendOptions {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
}

export interface TelegramSendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

const ATTEMPT_TIMEOUT_MS = 10_000;
const HOST = "api.telegram.org";

function requestOverSocket(
  socket: Socket | null,
  token: string,
  payload: string,
): Promise<TelegramSendResult> {
  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host: HOST,
        path: `/bot${token}/sendMessage`,
        method: "POST",
        timeout: ATTEMPT_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        // Прямое соединение: принудительный IPv4 (DNS VPS отдаёт мёртвый v6).
        // Через прокси: уже установленный TLS-сокет поверх CONNECT-туннеля.
        ...(socket
          ? { createConnection: () => socket, agent: undefined }
          : { family: 4 }),
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const ok = res.statusCode === 200;
          resolve({ ok, status: res.statusCode, ...(ok ? {} : { error: body.slice(0, 300) }) });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e: NodeJS.ErrnoException) => {
      resolve({ ok: false, error: `${e.code ?? ""} ${e.message}`.trim() });
    });
    req.end(payload);
  });
}

/** CONNECT-туннель через HTTP-прокси + TLS поверх. Ошибка — резолв null. */
function openProxyTunnel(proxyUrl: string): Promise<Socket | null> {
  return new Promise((resolve) => {
    let u: URL;
    try {
      u = new URL(proxyUrl);
    } catch {
      resolve(null);
      return;
    }
    const req = httpRequest({
      host: u.hostname,
      port: Number(u.port) || 80,
      method: "CONNECT",
      path: `${HOST}:443`,
      timeout: ATTEMPT_TIMEOUT_MS,
      headers: {
        ...(u.username
          ? { "Proxy-Authorization": `Basic ${Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString("base64")}` }
          : {}),
      },
    });
    req.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        resolve(null);
        return;
      }
      const tls = tlsConnect({ socket, servername: HOST }, () => resolve(tls));
      tls.on("error", () => resolve(null));
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

export async function sendTelegramMessage(
  token: string,
  options: TelegramSendOptions,
): Promise<TelegramSendResult> {
  const payload = JSON.stringify({
    chat_id: options.chatId,
    text: options.text,
    ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
  });

  const errors: string[] = [];

  // 1. Прокси, если задан — но никогда не единственная точка отказа
  const proxyUrl = process.env.BOT_API_PROXY;
  if (proxyUrl) {
    const socket = await openProxyTunnel(proxyUrl);
    if (socket) {
      const viaProxy = await requestOverSocket(socket, token, payload);
      if (viaProxy.ok) return viaProxy;
      errors.push(`proxy: ${viaProxy.error}`);
    } else {
      errors.push("proxy: tunnel failed");
    }
  }

  // 2-3. Прямое соединение с одним повтором (сеть хостера флапает)
  for (let i = 0; i < 2; i++) {
    const direct = await requestOverSocket(null, token, payload);
    if (direct.ok) return direct;
    errors.push(`direct${i + 1}: ${direct.error}`);
  }
  return { ok: false, error: errors.join("; ") };
}
