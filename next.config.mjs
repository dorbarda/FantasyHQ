/** @type {import('next').NextConfig} */
const nextConfig = {
  // Snapshot and per-year playoff JSON are read with fs at request time
  // (ISR revalidation), which static analysis can't trace — include them
  // in every serverless bundle.
  outputFileTracingIncludes: {
    '/**': ['./data/snapshots/*.json', './data/playoffs/**/*.json', './data/projections/**/*.json'],
    // Owner-only trade advice: bundled for its own pages, nowhere else.
    '/trades/**': ['./data/trades/**/*.json'],
    '/trades': ['./data/trades/**/*.json'],
  },
};

export default nextConfig;
