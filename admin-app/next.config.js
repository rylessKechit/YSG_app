// next.config.js - Configuration Next.js pour le déploiement (CORRIGÉE)
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

    // ✅ CORRECTION : Garder les console.log en production si DEBUG activé
    const debugMode = process.env.NEXT_PUBLIC_DEBUG === 'true' || 
                     process.env.DEBUG_PRODUCTION === 'true';

    // ✅ SEULEMENT supprimer les console.log si pas en debug ET en production
    if (!dev && !debugMode) {
      config.optimization = {
        ...config.optimization,
        minimizer: [
          ...config.optimization.minimizer,
          new webpack.DefinePlugin({
            'console.log': 'function(){}',
            'console.warn': 'function(){}',
            'console.error': 'console.error', // Toujours garder les erreurs
            'console.info': 'function(){}',
          }),
        ],
      };
    }

    // ✅ AJOUT : Optimisations supplémentaires pour la production
    if (!dev) {
      // Optimiser les imports
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    // ✅ AJOUT : Support pour les alias personnalisés
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
    };

    return config;
  },

  // ===== CONFIGURATION EXPERIMENTALE =====
  experimental: {
    // Activer les optimisations de build
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // ✅ AJOUT : Optimisations Next.js 15
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // ===== CONFIGURATION DE BUILD =====
  output: 'standalone', // Pour Docker/déploiement
  
  // ✅ CORRECTION : Gestion des images améliorée
  images: {
    // Domaines autorisés pour les images externes
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
    // ✅ NE PAS désactiver l'optimisation par défaut
    // unoptimized: true, // ❌ SUPPRIMÉ - laissons Next.js optimiser
    formats: ['image/avif', 'image/webp'], // Formats modernes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ===== VARIABLES D'ENVIRONNEMENT =====
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
    // ✅ AJOUT : Variables d'environnement pour le debug
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
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
          // ✅ AJOUT : Headers supplémentaires pour la sécurité
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=self, microphone=self, geolocation=self',
          },
          // ✅ AJOUT : Cache control pour les assets statiques
          ...(process.env.NODE_ENV === 'production' ? [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ] : []),
        ],
      },
      // ✅ AJOUT : Headers spécifiques pour les API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
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
      // ✅ AJOUT : Redirections supplémentaires si nécessaire
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // ✅ AJOUT : Configuration PWA si nécessaire
  ...(process.env.ENABLE_PWA === 'true' && {
    pwa: {
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
    },
  }),

  // ✅ AJOUT : Configuration de compression
  compress: true,

  // ✅ AJOUT : Configuration des trailing slashes
  trailingSlash: false,

  // ✅ AJOUT : Configuration du serveur de dev
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
  }),

  // ✅ AJOUT : Configuration des erreurs personnalisées
  onDemandEntries: {
    // période pendant laquelle la page est gardée en cache
    maxInactiveAge: 25 * 1000,
    // nombre de pages à garder simultanément sans être libérées
    pagesBufferLength: 2,
  },

  // ✅ AJOUT : Configuration de monitoring
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, options) => {
      if (!options.isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: './analyze/client.html',
          })
        );
      }
      return config;
    },
  }),
};

// ✅ AJOUT : Vérification de configuration en développement
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Next.js Config chargée:');
  console.log('  - Debug mode:', process.env.NEXT_PUBLIC_DEBUG === 'true' ? '✅' : '❌');
  console.log('  - Standalone build:', nextConfig.output === 'standalone' ? '✅' : '❌');
  console.log('  - ESLint ignoré:', nextConfig.eslint.ignoreDuringBuilds ? '✅' : '❌');
}

module.exports = nextConfig;