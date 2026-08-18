/** @type {import('next').NextConfig} */
const nextConfig = {
  // Snapshot and per-year playoff JSON are read with fs at request time
  // (ISR revalidation), which static analysis can't trace — include them
  // in every serverless bundle.
  outputFileTracingIncludes: {
    '/**': ['./data/snapshots/*.json', './data/playoffs/**/*.json'],
  },
};

export default nextConfig;
