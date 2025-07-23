import React from 'react';

export const Form = ({ children }) => children;
export const FormField = ({ render }) => render({ field: {} });
export const FormItem = ({ children }) => <div>{children}</div>;
export const FormLabel = ({ children }) => <label>{children}</label>;
export const FormControl = ({ children }) => children;
export const FormDescription = ({ children }) => <p>{children}</p>;
export const FormMessage = ({ children }) => <p>{children}</p>;
export const useFormField = () => ({ error: null });