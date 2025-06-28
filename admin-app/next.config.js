/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration TypeScript stricte
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configuration ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configuration des images
  images: {
    domains: [
      'localhost',
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configuration des redirections
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Configuration Webpack personnalisée
  webpack: (config, { dev, isServer }) => {
    // Optimisations pour la production
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@tanstack/react-query-devtools': false,
      };
    }

    return config;
  },

  // Configuration CORS pour l'API
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },

  // Configuration du mode strict de React
  reactStrictMode: true,

  // Activer SWC pour de meilleures performances
  swcMinify: true,

  // Configuration du compilateur
  compiler: {
    // Supprimer les console.log en production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;