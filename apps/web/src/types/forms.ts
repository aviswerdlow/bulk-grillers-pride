/**
 * Form-related types
 * These types are used for form validation, submission, and field management
 */

import { FieldError, UseFormReturn, FieldValues } from 'react-hook-form';
import { z } from 'zod';

/**
 * Generic form field configuration
 */
export interface FormField<T = any> {
  name: keyof T;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: any;
  options?: SelectOption[];
  validation?: z.ZodType<any>;
  description?: string;
}

/**
 * Select option configuration
 */
export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  description?: string;
}

/**
 * Form submission handler types
 */
export type FormSubmitHandler<T = any> = (data: T) => void | Promise<void>;
export type FormErrorHandler = (errors: Record<string, FieldError>) => void;

/**
 * Form validation error
 */
export interface FormValidationError {
  field: string;
  message: string;
  type?: string;
}

/**
 * File upload configuration
 */
export interface FileUploadConfig {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  maxFiles?: number;
  onUpload?: (files: File[]) => void | Promise<void>;
  validator?: (file: File) => boolean | string;
}

/**
 * Form section configuration for multi-step or sectioned forms
 */
export interface FormSection<T = any> {
  id: string;
  title: string;
  description?: string;
  fields: FormField<T>[];
  validation?: z.ZodType<any>;
}

/**
 * Multi-step form configuration
 */
export interface MultiStepFormConfig<T = any> {
  steps: FormStep<T>[];
  onComplete: FormSubmitHandler<T>;
  onStepChange?: (step: number) => void;
  allowSkip?: boolean;
  showProgress?: boolean;
}

/**
 * Form step configuration
 */
export interface FormStep<T = any> {
  id: string;
  title: string;
  description?: string;
  fields: FormField<T>[];
  validation?: z.ZodType<any>;
  canSkip?: boolean;
}

/**
 * Dynamic form field configuration
 */
export interface DynamicFormField<T = any> extends FormField<T> {
  dependsOn?: keyof T;
  showWhen?: (values: T) => boolean;
  requiredWhen?: (values: T) => boolean;
}

/**
 * Form state with validation
 */
export interface ValidatedFormState<T = any> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * Common form props for form components
 */
export interface BaseFormProps<T extends FieldValues = FieldValues> {
  form: UseFormReturn<T>;
  onSubmit: FormSubmitHandler<T>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

/**
 * Field array item for dynamic form lists
 */
export interface FieldArrayItem<T = any> {
  id: string;
  index: number;
  value: T;
}

/**
 * CSV field mapping configuration
 */
export interface CSVFieldMapping {
  csvColumn: string;
  targetField: string;
  transform?: (value: string) => any;
  required?: boolean;
  defaultValue?: any;
}

/**
 * Import configuration for file imports
 */
export interface ImportConfig {
  type: 'csv' | 'json' | 'excel';
  mappings: CSVFieldMapping[];
  validation?: z.ZodType<any>;
  duplicateHandling?: 'skip' | 'update' | 'create';
  batchSize?: number;
}

/**
 * Form builder configuration
 */
export interface FormBuilderConfig<T = any> {
  fields: DynamicFormField<T>[];
  layout?: 'vertical' | 'horizontal' | 'inline';
  columns?: number;
  gap?: number;
  validation?: z.ZodType<T>;
  defaultValues?: Partial<T>;
}

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Form context for nested forms
 */
export interface FormContext<T extends FieldValues = FieldValues> {
  form: UseFormReturn<T>;
  isSubmitting: boolean;
  errors: Record<string, FieldError>;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
}

/**
 * Search form configuration
 */
export interface SearchFormConfig {
  placeholder?: string;
  searchFields?: string[];
  onSearch: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  minLength?: number;
}

/**
 * Filter form configuration
 */
export interface FilterFormConfig<T = any> {
  filters: FilterField<T>[];
  onApply: (filters: T) => void;
  onReset?: () => void;
  defaultValues?: Partial<T>;
}

/**
 * Filter field configuration
 */
export interface FilterField<T = any> {
  name: keyof T;
  label: string;
  type: 'select' | 'range' | 'date' | 'boolean' | 'text';
  options?: SelectOption[];
  min?: number | Date;
  max?: number | Date;
  placeholder?: string;
}
