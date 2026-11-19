import * as Sentry from '@sentry/nextjs';

import { sharedSentryOptions } from './lib/sentry-shared';

// Error tracking in the browser. It is off when NEXT_PUBLIC_SENTRY_DSN is empty.
if (sharedSentryOptions.dsn) {
  Sentry.init({
    ...sharedSentryOptions,
    // no breadcrumbs (they hold page URLs and API addresses)
    integrations: (defaults) =>
      defaults.filter((integration) => !['Breadcrumbs', 'Console'].includes(integration.name)),
  });
}
