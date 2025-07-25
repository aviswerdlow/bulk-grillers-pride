/**
 * Optimized Jest resolver with caching and efficient module resolution
 */

const path = require('path');
const fs = require('fs');

// Cache for resolved modules to avoid repeated filesystem operations
const moduleCache = new Map();

// Pre-compiled regex patterns for better performance
const patterns = {
  convexGenerated: /^(@convex|convex|.*\/convex)\/_generated\/(api|dataModel)$/,
  radixUi: /^@radix-ui\/react-(dialog|primitive|slot|label|checkbox|select|scroll-area|progress)$/,
  pathAlias: /^[@~]\/(.*)$/,
  cssModules: /\.(css|less|scss|sass)$/,
};

// Mock mappings with priorities
const mockMappings = {
  // Convex mocks
  '@convex/_generated/api': '/__mocks__/convex/_generated/api.js',
  '@convex/_generated/dataModel': '/__mocks__/convex/_generated/dataModel.js',
  'convex/_generated/api': '/__mocks__/convex/_generated/api.js',
  'convex/_generated/dataModel': '/__mocks__/convex/_generated/dataModel.js',
  'convex/react': '/__mocks__/convex/react.jsx',
  
  // UI library mocks
  'lucide-react': '/apps/web/src/__tests__/__mocks__/lucide-react.jsx',
  '@radix-ui/react-dialog': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-dialog.tsx',
  '@radix-ui/react-primitive': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-primitive.js',
  '@radix-ui/react-slot': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-slot.js',
  '@radix-ui/react-label': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-label.js',
  '@radix-ui/react-checkbox': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-checkbox.js',
  '@radix-ui/react-select': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-select.js',
  '@radix-ui/react-scroll-area': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-scroll-area.js',
  '@radix-ui/react-progress': '/apps/web/src/__tests__/__mocks__/@radix-ui/react-progress.js',
};

// Path alias mappings
const pathAliases = {
  '@': {
    web: 'apps/web/src',
    convex: 'convex',
  },
  '~': {
    web: 'apps/web',
  },
};

function resolvePathAlias(request, options) {
  const match = request.match(patterns.pathAlias);
  if (!match) return null;
  
  const [, aliasPath] = match;
  const alias = request[0];
  const projectName = detectProject(options.basedir);
  
  const basePath = pathAliases[alias]?.[projectName];
  if (!basePath) return null;
  
  const resolvedPath = path.join(options.rootDir, basePath, aliasPath);
  
  // Try with different extensions
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.json', ''];
  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    // Also try index files
    const indexPath = path.join(resolvedPath, 'index' + ext);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  return resolvedPath;
}

function detectProject(basedir) {
  if (basedir.includes('/apps/web')) return 'web';
  if (basedir.includes('/convex')) return 'convex';
  if (basedir.includes('/packages/test-factories')) return 'test-factories';
  return 'unknown';
}

function resolveConvexGenerated(request, options) {
  if (!patterns.convexGenerated.test(request)) return null;
  
  // Extract the specific file being requested
  const isApi = request.includes('/api');
  const mockFile = isApi ? 'api.js' : 'dataModel.js';
  
  return path.join(options.rootDir, '__mocks__/convex/_generated', mockFile);
}

function resolveMock(request, options) {
  const mockPath = mockMappings[request];
  if (!mockPath) return null;
  
  return path.join(options.rootDir, mockPath);
}

function resolveCssModule(request) {
  if (!patterns.cssModules.test(request)) return null;
  return 'identity-obj-proxy';
}

module.exports = function customResolver(request, options) {
  // Check cache first
  const cacheKey = `${request}:${options.basedir}`;
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey);
  }

  let resolved = null;

  // Try resolvers in order of likelihood
  resolved = resolved || resolveCssModule(request);
  resolved = resolved || resolveMock(request, options);
  resolved = resolved || resolveConvexGenerated(request, options);
  resolved = resolved || resolvePathAlias(request, options);
  
  // Special handling for @convex paths
  if (!resolved && request.startsWith('@convex/') && !request.includes('_generated')) {
    const convexPath = request.replace('@convex/', '');
    resolved = path.join(options.rootDir, 'convex', convexPath);
  }

  // Fall back to default resolver
  if (!resolved) {
    resolved = options.defaultResolver(request, options);
  }

  // Cache the result
  moduleCache.set(cacheKey, resolved);
  
  return resolved;
};