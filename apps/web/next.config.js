import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@devflow/ui'],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // do not send build statistics about this project to Sentry
  telemetry: false,
  widenClientFileUpload: true,
  // the maps are uploaded to Sentry, then removed, so the public site does not serve them
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
