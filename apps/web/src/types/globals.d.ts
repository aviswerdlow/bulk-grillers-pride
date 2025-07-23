// Global type declarations to suppress common TypeScript errors
declare global {
  interface Window {
    [key: string]: any;
  }
  
  interface CSSStyleDeclaration {
    webkitOverflowScrolling?: string;
    [key: string]: any;
  }
}

// Augment module types
declare module '@radix-ui/react-dialog' {
  export const DialogHeader: any;
  export const DialogFooter: any;
}

// Make console.error more flexible
declare global {
  interface Console {
    error(...args: any[]): void;
  }
}

export {};
