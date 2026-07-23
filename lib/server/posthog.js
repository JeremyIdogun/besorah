/* global process */
import { PostHog } from 'posthog-node';

const noop = () => {};
const noopClient = { capture: noop, identify: noop, captureException: noop, shutdown: noop };

let _client = null;

export function getPostHogClient() {
  if (!_client) {
    const apiKey = process.env.POSTHOG_API_KEY?.trim();
    if (!apiKey) return noopClient;
    _client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
  }
  return _client;
}
