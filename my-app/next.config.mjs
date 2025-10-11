/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', 
  images: {
    domains: ["i.pravatar.cc", "wallpaperaccess.com"],
    unoptimized: true, 
  },
};

export default nextConfig;
