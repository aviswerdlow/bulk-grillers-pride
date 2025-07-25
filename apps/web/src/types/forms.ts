/**
 * Form-related types
 * These types are used for form validation, submission, and field management
 */

import { FieldError, UseFormReturn, FieldValues } from 'react-hook-form';
import { z } from 'zod';

/**
 * Generic form field configuration
 */
export interface FormField<T = unknown> {
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
  defaultValue?: unknown;
  options?: SelectOption[];
  validation?: z.ZodType<unknown>;
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
export type FormSubmitHandler<T = unknown> = (data: T) => void | Promise<void>;
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
export interface FormSection<T = unknown> {
  id: string;
  title: string;
  description?: string;
  fields: FormField<T>[];
  validation?: z.ZodType<unknown>;
}

/**
 * Multi-step form configuration
 */
export interface MultiStepFormConfig<T = unknown> {
  steps: FormStep<T>[];
  onComplete: FormSubmitHandler<T>;
  onStepChange?: (step: number) => void;
  allowSkip?: boolean;
  showProgress?: boolean;
}

/**
 * Form step configuration
 */
export interface FormStep<T = unknown> {
  id: string;
  title: string;
  description?: string;
  fields: FormField<T>[];
  validation?: z.ZodType<unknown>;
  canSkip?: boolean;
}

/**
 * Dynamic form field configuration
 */
export interface DynamicFormField<T = unknown> extends FormField<T> {
  dependsOn?: keyof T;
  showWhen?: (values: T) => boolean;
  requiredWhen?: (values: T) => boolean;
}

/**
 * Form state with validation
 */
export interface ValidatedFormState<T = unknown> {
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
export interface FieldArrayItem<T = unknown> {
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
  transform?: (value: string) => unknown;
  required?: boolean;
  defaultValue?: unknown;
}

/**
 * Import configuration for file imports
 */
export interface ImportConfig {
  type: 'csv' | 'json' | 'excel';
  mappings: CSVFieldMapping[];
  validation?: z.ZodType<unknown>;
  duplicateHandling?: 'skip' | 'update' | 'create';
  batchSize?: number;
}

/**
 * Form builder configuration
 */
export interface FormBuilderConfig<T = unknown> {
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
  value?: unknown;
  message: string;
  validator?: (value: unknown) => boolean;
}

/**
 * Form context for nested forms
 */
export interface FormContext<T extends FieldValues = FieldValues> {
  form: UseFormReturn<T>;
  isSubmitting: boolean;
  errors: Record<string, FieldError>;
  setFieldValue: (field: keyof T, value: unknown) => void;
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
export interface FilterFormConfig<T = unknown> {
  filters: FilterField<T>[];
  onApply: (filters: T) => void;
  onReset?: () => void;
  defaultValues?: Partial<T>;
}

/**
 * Filter field configuration
 */
export interface FilterField<T = unknown> {
  name: keyof T;
  label: string;
  type: 'select' | 'range' | 'date' | 'boolean' | 'text';
  options?: SelectOption[];
  min?: number | Date;
  max?: number | Date;
  placeholder?: string;
}
