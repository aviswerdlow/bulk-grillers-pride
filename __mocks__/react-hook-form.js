// Mock for react-hook-form
const mockRegister = jest.fn((name) => ({
  name,
  onChange: jest.fn(),
  onBlur: jest.fn(),
  ref: jest.fn(),
}));

const mockHandleSubmit = jest.fn((onValid, onInvalid) => {
  return jest.fn((e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    // Default to calling onValid for testing
    return onValid && onValid({});
  });
});

const mockWatch = jest.fn((field) => undefined);
const mockSetValue = jest.fn();
const mockGetValues = jest.fn(() => ({}));
const mockReset = jest.fn();
const mockSetError = jest.fn();
const mockClearErrors = jest.fn();
const mockTrigger = jest.fn(() => Promise.resolve(true));

const defaultFormState = {
  isDirty: false,
  isValid: true,
  isSubmitting: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  errors: {},
  touchedFields: {},
  dirtyFields: {},
  defaultValues: {},
};

const useForm = jest.fn(() => ({
  register: mockRegister,
  handleSubmit: mockHandleSubmit,
  watch: mockWatch,
  setValue: mockSetValue,
  getValues: mockGetValues,
  reset: mockReset,
  setError: mockSetError,
  clearErrors: mockClearErrors,
  trigger: mockTrigger,
  formState: defaultFormState,
  control: {},
}));

// Export individual mocks for test access
useForm.mockRegister = mockRegister;
useForm.mockHandleSubmit = mockHandleSubmit;
useForm.mockWatch = mockWatch;
useForm.mockSetValue = mockSetValue;
useForm.mockGetValues = mockGetValues;
useForm.mockReset = mockReset;
useForm.mockSetError = mockSetError;
useForm.mockClearErrors = mockClearErrors;
useForm.mockTrigger = mockTrigger;

const Controller = ({ render, name, control, defaultValue }) => {
  return render({
    field: {
      name,
      value: defaultValue || '',
      onChange: jest.fn(),
      onBlur: jest.fn(),
      ref: jest.fn(),
    },
    fieldState: {
      error: undefined,
      isDirty: false,
      isTouched: false,
    },
    formState: defaultFormState,
  });
};

const useFieldArray = jest.fn(() => ({
  fields: [],
  append: jest.fn(),
  prepend: jest.fn(),
  insert: jest.fn(),
  swap: jest.fn(),
  move: jest.fn(),
  update: jest.fn(),
  replace: jest.fn(),
  remove: jest.fn(),
}));

const useWatch = jest.fn(() => undefined);

const useFormContext = jest.fn(() => ({
  register: mockRegister,
  handleSubmit: mockHandleSubmit,
  watch: mockWatch,
  setValue: mockSetValue,
  getValues: mockGetValues,
  reset: mockReset,
  setError: mockSetError,
  clearErrors: mockClearErrors,
  trigger: mockTrigger,
  formState: defaultFormState,
  control: {},
}));

const FormProvider = ({ children, ...methods }) => children;

module.exports = {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  useFormContext,
  FormProvider,
  // Re-export mock functions for backward compatibility
  register: mockRegister,
  handleSubmit: mockHandleSubmit,
  watch: mockWatch,
  setValue: mockSetValue,
  getValues: mockGetValues,
  reset: mockReset,
  setError: mockSetError,
  clearErrors: mockClearErrors,
  trigger: mockTrigger,
};