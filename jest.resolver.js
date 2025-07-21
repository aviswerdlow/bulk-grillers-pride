/**
 * Custom Jest resolver to handle convex package imports
 * Forces convex to use CommonJS exports in Jest tests
 */

module.exports = (path, options) => {
  // Force convex imports to use CommonJS version
  if (path === 'convex' || path.startsWith('convex/')) {
    // Map common convex imports to their CJS equivalents
    const convexMappings = {
      'convex': 'convex/dist/cjs/index.js',
      'convex/browser': 'convex/dist/cjs/browser/index.js',
      'convex/server': 'convex/dist/cjs/server/index.js',
      'convex/values': 'convex/dist/cjs/values/index.js',
      'convex/react': 'convex/dist/cjs/react/index.js',
      'convex/react-clerk': 'convex/dist/cjs/react-clerk/index.js',
      'convex/nextjs': 'convex/dist/cjs/nextjs/index.js',
    };
    
    if (convexMappings[path]) {
      try {
        return options.defaultResolver(convexMappings[path], options);
      } catch (error) {
        // Fallback to default resolution if CJS path doesn't exist
        return options.defaultResolver(path, options);
      }
    }
    
    // For other convex subpaths, try the CJS version
    const subPath = path.replace('convex/', '');
    const cjsPath = `convex/dist/cjs/${subPath}/index.js`;
    
    try {
      return options.defaultResolver(cjsPath, options);
    } catch (error) {
      // Fallback to default resolution if CJS path doesn't exist
      return options.defaultResolver(path, options);
    }
  }
  
  // Use default resolver for all other imports
  return options.defaultResolver(path, options);
};