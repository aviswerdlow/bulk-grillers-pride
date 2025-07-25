import '@testing-library/react';

declare module '@testing-library/react' {
  interface Screen {
    getByText(text: string | RegExp, options?: any): HTMLElement;
    getAllByText(text: string | RegExp, options?: any): HTMLElement[];
    queryByText(text: string | RegExp, options?: any): HTMLElement | null;
    findByText(text: string | RegExp, options?: any): Promise<HTMLElement>;
    
    getByRole(role: string, options?: any): HTMLElement;
    getAllByRole(role: string, options?: any): HTMLElement[];
    queryByRole(role: string, options?: any): HTMLElement | null;
    findByRole(role: string, options?: any): Promise<HTMLElement>;
    
    getByTestId(testId: string, options?: any): HTMLElement;
    getAllByTestId(testId: string, options?: any): HTMLElement[];
    queryByTestId(testId: string, options?: any): HTMLElement | null;
    findByTestId(testId: string, options?: any): Promise<HTMLElement>;
    
    getByLabelText(text: string | RegExp, options?: any): HTMLElement;
    getAllByLabelText(text: string | RegExp, options?: any): HTMLElement[];
    queryByLabelText(text: string | RegExp, options?: any): HTMLElement | null;
    findByLabelText(text: string | RegExp, options?: any): Promise<HTMLElement>;
    
    getByPlaceholderText(text: string | RegExp, options?: any): HTMLElement;
    getAllByPlaceholderText(text: string | RegExp, options?: any): HTMLElement[];
    queryByPlaceholderText(text: string | RegExp, options?: any): HTMLElement | null;
    findByPlaceholderText(text: string | RegExp, options?: any): Promise<HTMLElement>;
    
    getByDisplayValue(value: string | RegExp, options?: any): HTMLElement;
    getAllByDisplayValue(value: string | RegExp, options?: any): HTMLElement[];
    queryByDisplayValue(value: string | RegExp, options?: any): HTMLElement | null;
    findByDisplayValue(value: string | RegExp, options?: any): Promise<HTMLElement>;
  }
}