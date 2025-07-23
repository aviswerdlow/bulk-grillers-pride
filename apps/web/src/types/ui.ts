/**
 * Common UI component types
 * These types are used across UI components to ensure consistency
 */

import React, { ReactNode } from 'react';

/**
 * Base props for all dialog components
 */
export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Common loading state management
 */
export interface LoadingState {
  isLoading: boolean;
  isSaving: boolean;
  error?: string | null;
}

/**
 * Form state management
 */
export interface FormState<T = Record<string, unknown>> {
  isSubmitting: boolean;
  isDirty: boolean;
  errors?: Record<string, string>;
  values?: T;
}

/**
 * Common event handlers
 */
export interface CommonEventHandlers {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onDelete?: () => void;
}

/**
 * Action button configuration
 */
export interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Table column configuration
 */
export interface TableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => unknown);
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => ReactNode;
}

/**
 * Toast/Notification configuration
 */
export interface ToastConfig {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Modal/Dialog sizes
 */
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * View modes
 */
export type ViewMode = 'grid' | 'list' | 'table';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Component visibility state
 */
export interface VisibilityState {
  isVisible: boolean;
  isHidden: boolean;
  isCollapsed?: boolean;
  isExpanded?: boolean;
}

/**
 * Selection state for multi-select components
 */
export interface SelectionState<T = unknown> {
  selectedItems: T[];
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

/**
 * Dropdown item configuration
 */
export interface DropdownItem {
  id: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

/**
 * Tab configuration
 */
export interface TabConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ActionButton;
}

/**
 * Error state configuration
 */
export interface ErrorStateConfig {
  title: string;
  message: string;
  retry?: () => void;
  canRetry?: boolean;
}

/**
 * Progress indicator configuration
 */
export interface ProgressConfig {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

/**
 * Badge configuration
 */
export interface BadgeConfig {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Tree node for hierarchical components
 */
export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  value: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  level?: number;
}
