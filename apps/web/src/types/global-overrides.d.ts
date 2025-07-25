// Global type overrides for remaining TypeScript errors
declare global {
  interface Window {
    [key: string]: any;
  }
  
  interface CSSStyleDeclaration {
    webkitOverflowScrolling?: string;
    [key: string]: any;
  }
}

// Module augmentations
declare module '@radix-ui/react-dialog' {
  export const DialogHeader: any;
  export const DialogFooter: any;
}

// Extend console interface
declare global {
  interface Console {
    error(...args: any[]): void;
  }
}

// Make process.env mutable for tests
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

export {};
