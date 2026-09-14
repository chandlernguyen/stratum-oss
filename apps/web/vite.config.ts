import { defineConfig } from 'vite'
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import removeConsole from 'vite-plugin-remove-console'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Build-time HTTPS enforcement for production deployments
 * Fails the build if HTTP URLs are detected in production env vars
 * Defense Layer 1: Prevent misconfiguration at build time
 * @date 2025-10-21
 */
function validateProductionUrls(mode: string) {
  // Only enforce in production builds
  if (mode !== 'production') return;

  const apiUrl = process.env.VITE_API_URL || '';
  const errors: string[] = [];

  // Check for HTTP (should be HTTPS)
  if (apiUrl && apiUrl.trim().startsWith('http://')) {
    // Allow localhost for local production testing
    if (!apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      errors.push(
        `\n❌ HTTPS ENFORCEMENT FAILED\n` +
        `\n   Environment Variable: VITE_API_URL` +
        `\n   Current Value: ${apiUrl}` +
        `\n   Expected: https://...` +
        `\n\n   🔧 Fix for Cloudflare Pages:` +
        `\n   1. Go to Cloudflare Dashboard → Pages → Your Project → Settings` +
        `\n   2. Navigate to Environment Variables` +
        `\n   3. Set: VITE_API_URL = ${apiUrl.replace('http://', 'https://')}` +
        `\n   4. Redeploy` +
        `\n\n   🔧 Fix for local production build:` +
        `\n   Update apps/web/.env.production:` +
        `\n   VITE_API_URL=${apiUrl.replace('http://', 'https://')}\n`
      );
    }
  }

  // Check for trailing whitespace/newlines (common mistake from printf/echo)
  if (apiUrl && apiUrl !== apiUrl.trim()) {
    errors.push(
      `\n⚠️  WHITESPACE DETECTED IN ENVIRONMENT VARIABLE\n` +
      `\n   Variable: VITE_API_URL` +
      `\n   Raw Value: "${apiUrl}"` +
      `\n   Trimmed: "${apiUrl.trim()}"` +
      `\n\n   This may cause subtle bugs. Re-set the environment variable.\n`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `\n${'='.repeat(80)}\n` +
      `🚨 BUILD FAILED: HTTPS Enforcement\n` +
      `${'='.repeat(80)}` +
      errors.join('\n') +
      `\n${'='.repeat(80)}\n` +
      `This build has been stopped to prevent deploying with insecure HTTP URLs.\n` +
      `Fix the environment variables above and rebuild.\n` +
      `${'='.repeat(80)}\n`
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Validate production URLs at build time
  validateProductionUrls(mode);

  return {
    plugins: [
      mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
        rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
      }),
      react(),
      // Production console log removal
      // Only in production builds, strips console.log, console.debug, console.trace
      // Keeps console.error and console.warn for production debugging
      mode === 'production' && removeConsole({
        includes: ['log', 'debug', 'trace']
      }),
      // Bundle visualizer for optimization analysis
      // Generates interactive HTML report at dist/stats.html
      // @date 2025-11-03
      mode === 'production' && visualizer({
        filename: './dist/stats.html',
        open: false, // Don't auto-open in CI/CD
        gzipSize: true,
        brotliSize: true,
        template: 'treemap' // Visual size representation
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      // Force a single React instance. This must not be done with an alias to
      // ./node_modules/react: npm hoists React to the repository root, so that
      // path does not exist and Vite fails dependency optimization with
      // "Cannot read file: .../apps/web/node_modules/react". dedupe resolves
      // through the normal module graph instead, which works whether React is
      // hoisted to the root or installed locally.
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '127.0.0.1',
      port: 56310,
      proxy: {
        '/api': {
          target: 'http://localhost:56300',
          changeOrigin: true,
        }
      }
    },
    build: {
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          /**
           * ROLLBACK: Simple chunking for React 19 compatibility (2025-11-03)
           *
           * Previous smart chunking caused module initialization errors in production:
           * "Uncaught ReferenceError: Cannot access 'G' before initialization"
           *
           * React 19 requires all vendor code together to avoid initialization issues.
           * Keep all node_modules in single vendor bundle for stability.
           */
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Keep all vendor code together to avoid initialization issues
              return 'vendor';
            }
          }
        }
      }
    }
  }
});
