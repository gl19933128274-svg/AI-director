/** @type {import('next').NextConfig} */
// 注意：不要在这里把 OPENAI_API_KEY / BAIDU_* 等敏感 Key 放入 `env`，
// 否则会被注入到客户端 bundle，导致 Key 泄露。
// 服务端代码（如 src/app/api/**/route.ts）直接通过 process.env 读取即可。
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
