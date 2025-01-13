/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ant-design/icons', '@ant-design/icons-svg', 'antd', 'rc-util', 'rc-pagination', 'rc-picker'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // 'rewrite'가 아닌 'rewrites'로 수정
    return [
      {
        source: '/s3-proxy/:path*',
        destination: 'https://mindqna.s3.amazonaws.com/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
