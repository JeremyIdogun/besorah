/* global process */
import { PostHog } from 'posthog-node';

let _client = null;

export function getPostHogClient() {
  if (!_client) {
    _client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
  }
  return _client;
}
