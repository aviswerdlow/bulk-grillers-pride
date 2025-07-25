import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, mockUseQuery, render, screen, waitFor, renderWithProviders } from '@/__tests__/test-helpers';
import { downloadCategoriesTemplate, downloadProductsTemplate, downloadVariantsTemplate } from '@/utils/csv-templates';
import { useParams } from 'next/navigation';
import ImportsPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock utils
jest.mock('@/utils/csv-templates', () => ({
  downloadProductsTemplate: jest.fn(),
  downloadVariantsTemplate: jest.fn(),
  downloadCategoriesTemplate: jest.fn(),
}));

// Mock the CreateImportJobDialog
jest.mock('@/components/imports/create-import-job-dialog', () => ({
  CreateImportJobDialog: ({ open, onOpenChange }: any) => 
    (open as boolean) ? (
      <div data-testid="create-import-dialog">
        <button onClick={() => (onOpenChange as any)(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock loading component
jest.mock('@/components/loading', () => ({
  Loading: ({ size, text }: { size?: string; text?: string }) => 
    <div data-testid="loading" data-size={size}>{text || 'Loading...'}</div>,
  PageLoading: ({ text }: { text?: string }) => 
    <div data-testid="page-loading">{text || 'Loading...'}</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Upload: () => <div>Upload Icon</div>,
  Download: () => <div>Download Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  CheckCircle: () => <div>CheckCircle Icon</div>,
  XCircle: () => <div>XCircle Icon</div>,
  Clock: () => <div>Clock Icon</div>,
  Loader2: () => <div>Loader2 Icon</div>,
  AlertTriangle: () => <div>AlertTriangle Icon</div>,
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => 
    <span className={className as string}>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => 
    <div data-testid="progress" data-value={value as number}>Progress: {value as number}%</div>,
}));

describe('ImportsPage', () => {
  const mockOrganization = {
    _id: 'org_123',
    _creationTime: Date.now(),
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockProject = {
    _id: 'proj_123',
    _creationTime: Date.now(),
    name: 'Test Project',
    organizationId: 'org_123',
  };

  const mockImportJob = {
    _id: 'job_123',
    _creationTime: Date.now(),
    status: 'completed',
    fileName: 'products.csv',
    fileSize: 102400,
    importType: 'products',
    progress: {
      totalRows: 100,
      processedRows: 100,
      importedRows: 95,
      skippedRows: 5,
    },
    validationErrors: [],
    createdAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ orgSlug: 'test-org' });
  });

  it('renders loading state while fetching data', () => {
    mockUseQuery.mockReturnValue(undefined);
    
    renderWithProviders(<ImportsPage />);
    
    expect(screen.getByText('Loading imports...')).toBeInTheDocument();
  });

  it('renders error when organization not found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return null;
      if (callCount === 2) return [];
      return undefined;
    }) as any); // projects query
    
    renderWithProviders(<ImportsPage />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders error when no projects found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [];
      return undefined;
    }) as any); // projects query
    
    renderWithProviders(<ImportsPage />);
    
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
    expect(screen.getByText('Create a project first to import data')).toBeInTheDocument();
  });

  it('renders import page with empty state', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [];
      return undefined;
    }) as any); // import jobs query
    
    renderWithProviders(<ImportsPage />);
    
    expect(screen.getByRole('heading', { name: 'Data Import' })).toBeInTheDocument();
    expect(screen.getByText('No imports yet')).toBeInTheDocument();
    expect(screen.getByText('Start by importing your first data file')).toBeInTheDocument();
  });

  it('renders import page with data', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockImportJob];
      return undefined;
    }) as any); // import jobs query
    
    renderWithProviders(<ImportsPage />);
    
    // Check header
    expect(screen.getByRole('heading', { name: 'Data Import' })).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('Total Imports')).toBeInTheDocument();
    
    // Get the total imports count specifically from the card
    const totalCard = screen.getByText('Total Imports').closest('[data-slot="card"]');
    expect(totalCard).toHaveTextContent('1');
    
    // Check import job in table
    expect(screen.getByText('products.csv')).toBeInTheDocument();
    expect(screen.getByText('100 KB')).toBeInTheDocument(); // Formatted file size
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('95 imported')).toBeInTheDocument();
    expect(screen.getByText('5 skipped')).toBeInTheDocument();
  });

  it('shows correct status icons and badges', () => {
    const jobs = [
      { ...mockImportJob, _id: 'job_1', status: 'completed' },
      { ...mockImportJob, _id: 'job_2', status: 'importing' },
      { ...mockImportJob, _id: 'job_3', status: 'failed' },
      { ...mockImportJob, _id: 'job_4', status: 'uploaded' },
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return jobs;
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    // Check status badges
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('importing')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('uploaded')).toBeInTheDocument();
  });

  it('calculates and displays progress correctly', () => {
    const jobWithProgress = {
      ...mockImportJob,
      progress: {
        totalRows: 200,
        processedRows: 150,
        importedRows: 140,
        skippedRows: 10,
      },
    };
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [jobWithProgress];
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    // Check progress display
    expect(screen.getByText('150/200')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // 150/200 * 100
  });

  it('opens create import dialog when clicking import button', async () => {
    // Mock all useQuery calls to return the expected values
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      // Check what query is being called based on the function name
      if (query?.toString().includes('getOrganizationBySlug')) {
        return mockOrganization;
      }
      if (query?.toString().includes('getOrganizationProjects')) {
        return [mockProject];
      }
      if (query?.toString().includes('getImportJobs')) {
        return [];
      }
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    // Wait for the page to load and find the import button
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Data Import' })).toBeInTheDocument();
    });
    
    const importButton = screen.getAllByRole('button', { name: /Import Data/i })[0];
    if (importButton) {
      fireEvent.click(importButton as HTMLElement);
    }
    
    expect(screen.getByTestId('create-import-dialog')).toBeInTheDocument();
  });

  it('renders import templates section', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [];
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    expect(screen.getByText('Import Templates')).toBeInTheDocument();
    expect(screen.getByText('Products Template')).toBeInTheDocument();
    expect(screen.getByText('Categories Template (JSON)')).toBeInTheDocument();
    expect(screen.getByText('Variants Template')).toBeInTheDocument();
  });

  it('calls download functions when clicking template buttons', () => {
    // Download functions are imported at the top of the file
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [];
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    // Find and click download buttons
    const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
    
    if (downloadButtons[0]) {
      fireEvent.click(downloadButtons[0] as HTMLElement); // Products template
      expect(downloadProductsTemplate).toHaveBeenCalled();
    }
    
    if (downloadButtons[1]) {
      fireEvent.click(downloadButtons[1] as HTMLElement); // Categories template
      expect(downloadCategoriesTemplate).toHaveBeenCalled();
    }
    
    if (downloadButtons[2]) {
      fireEvent.click(downloadButtons[2] as HTMLElement); // Variants template
      expect(downloadVariantsTemplate).toHaveBeenCalled();
    }
  });

  it('displays validation errors when present', () => {
    const jobWithErrors = {
      ...mockImportJob,
      validationErrors: ['Invalid SKU format', 'Missing required field'],
    };
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [jobWithErrors];
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    expect(screen.getByText('2 errors')).toBeInTheDocument();
  });

  it('shows correct stats in cards', () => {
    const jobs = [
      { ...mockImportJob, _id: 'job_1', status: 'completed', progress: { ...mockImportJob.progress, importedRows: 50 } },
      { ...mockImportJob, _id: 'job_2', status: 'importing', progress: { ...mockImportJob.progress, importedRows: 30 } },
      { ...mockImportJob, _id: 'job_3', status: 'failed', progress: { ...mockImportJob.progress, importedRows: 0 } },
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return jobs;
      return undefined;
    }) as any);
    
    renderWithProviders(<ImportsPage />);
    
    // Total imports
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Completed count
    const completedCard = screen.getByText('Completed').closest('.space-y-0')?.nextElementSibling;
    expect(completedCard?.textContent).toBe('1');
    
    // Processing count (importing + validating)
    const processingCard = screen.getByText('Processing').closest('.space-y-0')?.nextElementSibling;
    expect(processingCard?.textContent).toBe('1');
    
    // Total records imported
    const recordsCard = screen.getByText('Records Imported').closest('.space-y-0')?.nextElementSibling;
    expect(recordsCard?.textContent).toBe('80'); // 50 + 30 + 0
  });
});