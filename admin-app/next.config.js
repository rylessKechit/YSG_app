// next.config.js - Configuration Next.js pour le déploiement
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===== CONFIGURATION ESLINT =====
  eslint: {
    // Option 1: Ignorer ESLint complètement pendant le build
    ignoreDuringBuilds: true,
    
    // Option 2: Utiliser notre configuration personnalisée (à activer si Option 1 désactivée)
    // dirs: ['src'], // Limiter ESLint au dossier src seulement
  },

  // ===== CONFIGURATION TYPESCRIPT =====
  typescript: {
    // Ignorer les erreurs TypeScript pendant le build (optionnel)
    // ignoreBuildErrors: true,
  },

  // ===== OPTIMISATIONS WEBPACK =====
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ignorer les warnings spécifiques pendant le build
    config.stats = {
      warnings: false,
    };

    // Supprimer les console.log en production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimizer: [
          ...config.optimization.minimizer,
          new webpack.DefinePlugin({
            'console.log': 'function(){}',
            'console.warn': 'function(){}',
            'console.error': 'console.error', // Garder les erreurs
          }),
        ],
      };
    }

    return config;
  },

  // ===== CONFIGURATION EXPERIMENTALE =====
  experimental: {
    // Activer les optimisations de build
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // ===== CONFIGURATION DE BUILD =====
  output: 'standalone', // Pour Docker/déploiement
  
  // Gestion des images
  images: {
    domains: [], // Ajouter les domaines d'images si nécessaire
    unoptimized: true, // Désactiver l'optimisation d'images si problématique
  },

  // ===== VARIABLES D'ENVIRONNEMENT =====
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // ===== HEADERS DE SÉCURITÉ =====
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

  // ===== REDIRECTIONS =====
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;