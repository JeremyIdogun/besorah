import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';

export default function PostHogAdminIdentity() {
  const posthog = usePostHog();

  useEffect(() => {
    let cancelled = false;

    async function syncAdminIdentity() {
      try {
        const res = await fetch('/api/admin/session', {
          credentials: 'include',
        });
        const data = await res.json();

        if (!cancelled && data.authenticated && data.email) {
          posthog.identify(data.email, {
            email: data.email,
            role: 'admin',
          });
        }
      } catch {
        // Leave PostHog anonymous if session lookup fails.
      }
    }

    syncAdminIdentity();
    return () => {
      cancelled = true;
    };
  }, [posthog]);

  return null;
}
