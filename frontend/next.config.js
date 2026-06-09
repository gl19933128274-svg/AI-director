/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BAIDU_API_KEY: process.env.BAIDU_API_KEY,
    BAIDU_SECRET_KEY: process.env.BAIDU_SECRET_KEY,
    USE_REAL_AI: process.env.USE_REAL_AI || 'false',
  },
}

module.exports = nextConfig
