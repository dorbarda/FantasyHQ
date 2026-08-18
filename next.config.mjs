/** @type {import('next').NextConfig} */
const nextConfig = {
  // Snapshot JSON is read with fs at request time (ISR revalidation), which
  // static analysis can't trace — include it in every serverless bundle.
  outputFileTracingIncludes: {
    '/**': ['./data/snapshots/*.json'],
  },
};

export default nextConfig;
