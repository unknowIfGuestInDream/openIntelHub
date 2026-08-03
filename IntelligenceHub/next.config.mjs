/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  experimental: {
    // TypeScript 7 (原生实现) 不再提供 Next.js 默认使用的编译器 API，
    // 改用 TS CLI 进行类型检查以完全适配 TypeScript 7。
    useTypeScriptCli: true,
  },
};

export default nextConfig;
