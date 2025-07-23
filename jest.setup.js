// Jest Setup
import '@testing-library/jest-dom';

// Global mocks for both node and jsdom environments
if (typeof window === 'undefined') {
  // In node environment (Convex tests), create a minimal window object
  global.window = {
    matchMedia: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
    scrollTo: jest.fn(),
    location: {
      href: 'http://localhost',
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: ''
    },
    navigator: {
      userAgent: 'node.js',
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(''),
      }
    },
    document: {
      createElement: jest.fn(() => ({
        style: {},
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
      getElementById: jest.fn(),
      getElementsByClassName: jest.fn(() => []),
      getElementsByTagName: jest.fn(() => []),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
    },
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 0)),
    cancelAnimationFrame: jest.fn(id => clearTimeout(id)),
  };
  
  // Also set it on global for direct access
  for (const key in global.window) {
    if (!(key in global)) {
      global[key] = global.window[key];
    }
  }

  // Mock HTMLElement for node environment
  global.HTMLElement = class HTMLElement {
    constructor() {
      this.style = {};
      this.classList = {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn(),
      };
      this.dataset = {};
      this.attributes = {};
    }
    
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    
    getAttribute(name) {
      return this.attributes[name];
    }
    
    removeAttribute(name) {
      delete this.attributes[name];
    }
    
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {}
    appendChild() {}
    removeChild() {}
    insertBefore() {}
    querySelector() { return null; }
    querySelectorAll() { return []; }
    scrollIntoView() {}
    focus() {}
    blur() {}
    click() {}
  };
  
  // Also mock other HTML elements that might be needed
  global.HTMLDivElement = global.HTMLElement;
  global.HTMLSpanElement = global.HTMLElement;
  global.HTMLButtonElement = global.HTMLElement;
  global.HTMLInputElement = global.HTMLElement;
  global.HTMLFormElement = global.HTMLElement;
  global.HTMLAnchorElement = global.HTMLElement;
  global.HTMLImageElement = global.HTMLElement;
  global.HTMLVideoElement = global.HTMLElement;
  global.HTMLCanvasElement = global.HTMLElement;
  global.HTMLIFrameElement = global.HTMLElement;

}



// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLElement.prototype.releasePointerCapture = jest.fn();
HTMLElement.prototype.hasPointerCapture = jest.fn();

// Global console mocks
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
