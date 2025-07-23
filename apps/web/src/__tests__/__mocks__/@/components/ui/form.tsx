import React, { PropsWithChildren, ReactElement } from 'react';

interface FormFieldProps {
  render: (props: { field: Record<string, unknown> }) => ReactElement;
}

export const Form = ({ children }: PropsWithChildren) => children;
export const FormField = ({ render }: FormFieldProps) => render({ field: {} });
export const FormItem = ({ children }: PropsWithChildren) => <div>{children}</div>;
export const FormLabel = ({ children }: PropsWithChildren) => <label>{children}</label>;
export const FormControl = ({ children }: PropsWithChildren) => children;
export const FormDescription = ({ children }: PropsWithChildren) => <p>{children}</p>;
export const FormMessage = ({ children }: PropsWithChildren) => <p>{children}</p>;
export const useFormField = () => ({ error: null });