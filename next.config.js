/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  // Next.js 16.3 appends its own rules block to AGENTS.md when `next dev`
  // detects an AI agent. AGENTS.md is hand-maintained, so this is off.
  agentRules: false,
};

module.exports = nextConfig;
