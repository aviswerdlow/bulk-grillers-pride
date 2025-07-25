import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { Input } from '../input';
import { useForm } from 'react-hook-form';
// Mock react-hook-form
let mockFormState = {
  errors: {},
  defaultValues: {},
  values: {},
};

const mockSetValue = jest.fn((name, value) => {
  mockFormState.values[name] = value;
});

const mockHandleSubmit = (fn) => (e) => {
  e?.preventDefault?.();
  // Pass the form values to the submit handler
  return fn(mockFormState.values);
};

jest.mock('react-hook-form', () => ({
  useForm: (options) => {
    // Store default values
    if (options?.defaultValues) {
      mockFormState.defaultValues = options.defaultValues;
      mockFormState.values = { ...options.defaultValues };
    }
    return {
      control: {},
      handleSubmit: mockHandleSubmit,
      formState: mockFormState,
      register: jest.fn(),
      setValue: mockSetValue,
      getValues: jest.fn(() => mockFormState.values),
      watch: jest.fn((name) => mockFormState.values[name]),
      reset: jest.fn(),
    };
  },
  Controller: ({ render, name, defaultValue, rules }) => {
    const value = mockFormState.values[name] || defaultValue || '';
    return render({
      field: {
        onChange: (e) => {
          const newValue = e?.target?.value !== undefined ? e.target.value : e;
          mockFormState.values[name] = newValue;
          // Simple validation
          if (rules?.required && !newValue) {
            mockFormState.errors[name] = { message: rules.required };
          } else if (rules?.pattern && !rules.pattern.value.test(newValue)) {
            mockFormState.errors[name] = { message: rules.pattern.message };
          } else if (rules?.min && Number(newValue) < rules.min.value) {
            mockFormState.errors[name] = { message: rules.min.message };
          } else {
            delete mockFormState.errors[name];
          }
        },
        onBlur: jest.fn(),
        value,
        name,
      },
      fieldState: {
        error: mockFormState.errors[name],
      },
    });
  },
  FormProvider: ({ children, ...props }) => children,
  useFormContext: () => ({
    control: {},
    formState: mockFormState,
    getFieldState: jest.fn((name) => ({ error: mockFormState.errors[name] })),
    register: jest.fn(),
  }),
}));

// Reset form state before each test
beforeEach(() => {
  mockFormState = {
    errors: {},
    defaultValues: {},
    values: {},
  };
});

import userEvent from '@testing-library/user-event';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../form';

interface TestFormData {
  username: string;
  email: string;
  age: number;
}

function TestForm({
  onSubmit,
  defaultValues = {},
}: {
  onSubmit: (data: TestFormData) => void;
  defaultValues?: Partial<TestFormData>;
}) {
  const form = useForm<TestFormData>({
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          rules={{ required: 'Username is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^\S+@\S+$/i,
              message: 'Invalid email address',
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="age"
          rules={{
            required: 'Age is required',
            min: { value: 18, message: 'Must be at least 18' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter age"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target?.value, 10))}
                />
              </FormControl>
              <FormDescription>You must be 18 or older.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe('Form', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Basic Rendering', () => {
    it('renders form fields correctly', () => {
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Age')).toBeInTheDocument();
      expect(screen.getByText('This is your public display name.')).toBeInTheDocument();
      expect(screen.getByText('You must be 18 or older.')).toBeInTheDocument();
    });

    it('renders with default values', () => {
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm
          onSubmit={mockSubmit}
          defaultValues={{
            username: 'johndoe',
            email: 'john@example.com',
            age: 25,
          }}
        />
      );

      expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows required field errors', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Age is required')).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('validates minimum age', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const ageInput = screen.getByLabelText('Age');
      await user.type(ageInput, '15');

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be at least 18')).toBeInTheDocument();
      });
    });

    it('clears errors when corrected', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      // Submit to trigger errors
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      
      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
      });

      // Fix the error
      const usernameInput = screen.getByLabelText('Username');
      await user.type(usernameInput, 'johndoe');

      await waitFor(() => {
        expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits valid form data', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      await user.type(screen.getByLabelText('Username'), 'johndoe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Age'), '25');

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          username: 'johndoe',
          email: 'john@example.com',
          age: 25,
        });
      });
    });
  });

  describe('Form Components', () => {
    it('FormLabel applies error styles', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      // Submit to trigger errors
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        const usernameLabel = screen.getByText('Username');
        expect(usernameLabel).toHaveAttribute('data-error', 'true');
        expect(usernameLabel).toHaveClass('data-[error=true]:text-destructive');
      });
    });

    it('FormControl sets ARIA attributes', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const usernameInput = screen.getByLabelText('Username');
      const descriptionId = usernameInput.getAttribute('aria-describedby');
      
      expect(descriptionId).toBeTruthy();
      expect(usernameInput).toHaveAttribute('aria-invalid', 'false');

      // Trigger error
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
        const newDescribedBy = usernameInput.getAttribute('aria-describedby');
        expect(newDescribedBy).toContain('form-item-message');
      });
    });

    it('FormDescription provides accessible descriptions', () => {
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const usernameInput = screen.getByLabelText('Username');
      const description = screen.getByText('This is your public display name.');
      
      expect(description).toHaveAttribute('id');
      const descriptionId = description.getAttribute('id');
      expect(usernameInput.getAttribute('aria-describedby')).toContain(descriptionId);
    });

    it('FormMessage displays error messages', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        const errorMessage = screen.getByText('Username is required');
        expect(errorMessage).toHaveClass('text-destructive', 'text-sm');
        expect(errorMessage).toHaveAttribute('id');
      });
    });
  });

  describe('Accessibility', () => {
    it('associates labels with inputs', () => {
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const usernameInput = screen.getByLabelText('Username');
      const usernameLabel = screen.getByText('Username');
      
      expect(usernameLabel).toHaveAttribute('for', usernameInput.id);
    });

    it('provides proper ARIA relationships', () => {
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      const ageInput = screen.getByLabelText('Age');
      const ageDescription = screen.getByText('You must be 18 or older.');
      
      const describedBy = ageInput.getAttribute('aria-describedby');
      const descriptionId = ageDescription.getAttribute('id');
      
      expect(describedBy).toContain(descriptionId);
    });

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      renderWithProviders(<TestForm onSubmit={mockSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email');
        const errorMessage = screen.getByText('Email is required');
        
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        const describedBy = emailInput.getAttribute('aria-describedby');
        const messageId = errorMessage.getAttribute('id');
        expect(describedBy).toContain(messageId);
      });
    });
  });

  describe('Custom Form Implementation', () => {
    it('works with custom form controls', () => {
      function CustomForm() {
        const form = useForm({
          defaultValues: { custom: '' },
        });

        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="custom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Field</FormLabel>
                    <FormControl>
                      <select {...field}>
                        <option value="">Select an option</option>
                        <option value="option1">Option 1</option>
                        <option value="option2">Option 2</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      }

      renderWithProviders(<CustomForm />);

      const select = screen.getByLabelText('Custom Field');
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe('SELECT');
    });

    it('handles dynamic form fields', async () => {
      const user = userEvent.setup();
      
      function DynamicForm() {
        const form = useForm();
        const [showExtra, setShowExtra] = React.useState(false);

        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Field</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <button type="button" onClick={() => setShowExtra(true)}>
                Add Field
              </button>

              {showExtra && (
                <FormField
                  control={form.control}
                  name="extra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Field</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        );
      }

      renderWithProviders(<DynamicForm />);

      expect(screen.getByLabelText('Base Field')).toBeInTheDocument();
      expect(screen.queryByLabelText('Extra Field')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Add Field' }));

      expect(screen.getByLabelText('Extra Field')).toBeInTheDocument();
    });
  });
});