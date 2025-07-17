import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import ImportsPage from '../page';
import { mockUseQuery } from '@/__tests__/test-utils';
import { useParams } from 'next/navigation';

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
    open ? (
      <div data-testid="create-import-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

describe('ImportsPage', () => {
  const mockOrganization = {
    _id: 'org_123' as any,
    name: 'Test Organization',
    slug: 'test-org',
  };

  const mockProject = {
    _id: 'proj_123' as any,
    name: 'Test Project',
    organizationId: 'org_123' as any,
  };

  const mockImportJob = {
    _id: 'job_123',
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
    
    render(<ImportsPage />);
    
    expect(screen.getByText('Loading imports...')).toBeInTheDocument();
  });

  it('renders error when organization not found', () => {
    mockUseQuery
      .mockReturnValueOnce(null) // organization query
      .mockReturnValueOnce([]); // projects query
    
    render(<ImportsPage />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders error when no projects found', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization) // organization query
      .mockReturnValueOnce([]); // projects query
    
    render(<ImportsPage />);
    
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
    expect(screen.getByText('Create a project first to import data')).toBeInTheDocument();
  });

  it('renders import page with empty state', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization) // organization query
      .mockReturnValueOnce([mockProject]) // projects query
      .mockReturnValueOnce([]); // import jobs query
    
    render(<ImportsPage />);
    
    expect(screen.getByRole('heading', { name: 'Data Import' })).toBeInTheDocument();
    expect(screen.getByText('No imports yet')).toBeInTheDocument();
    expect(screen.getByText('Start by importing your first data file')).toBeInTheDocument();
  });

  it('renders import page with data', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization) // organization query
      .mockReturnValueOnce([mockProject]) // projects query
      .mockReturnValueOnce([mockImportJob]); // import jobs query
    
    render(<ImportsPage />);
    
    // Check header
    expect(screen.getByRole('heading', { name: 'Data Import' })).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('Total Imports')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total imports count
    
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
    
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce(jobs);
    
    render(<ImportsPage />);
    
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
    
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([jobWithProgress]);
    
    render(<ImportsPage />);
    
    // Check progress display
    expect(screen.getByText('150/200')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // 150/200 * 100
  });

  it('opens create import dialog when clicking import button', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([]);
    
    render(<ImportsPage />);
    
    const importButton = screen.getAllByRole('button', { name: /Import Data/i })[0];
    fireEvent.click(importButton);
    
    expect(screen.getByTestId('create-import-dialog')).toBeInTheDocument();
  });

  it('renders import templates section', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([]);
    
    render(<ImportsPage />);
    
    expect(screen.getByText('Import Templates')).toBeInTheDocument();
    expect(screen.getByText('Products Template')).toBeInTheDocument();
    expect(screen.getByText('Categories Template (JSON)')).toBeInTheDocument();
    expect(screen.getByText('Variants Template')).toBeInTheDocument();
  });

  it('calls download functions when clicking template buttons', () => {
    const { downloadProductsTemplate, downloadCategoriesTemplate, downloadVariantsTemplate } = 
      require('@/utils/csv-templates');
    
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([]);
    
    render(<ImportsPage />);
    
    // Find and click download buttons
    const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
    
    fireEvent.click(downloadButtons[0]); // Products template
    expect(downloadProductsTemplate).toHaveBeenCalled();
    
    fireEvent.click(downloadButtons[1]); // Categories template
    expect(downloadCategoriesTemplate).toHaveBeenCalled();
    
    fireEvent.click(downloadButtons[2]); // Variants template
    expect(downloadVariantsTemplate).toHaveBeenCalled();
  });

  it('displays validation errors when present', () => {
    const jobWithErrors = {
      ...mockImportJob,
      validationErrors: ['Invalid SKU format', 'Missing required field'],
    };
    
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([jobWithErrors]);
    
    render(<ImportsPage />);
    
    expect(screen.getByText('2 errors')).toBeInTheDocument();
  });

  it('shows correct stats in cards', () => {
    const jobs = [
      { ...mockImportJob, _id: 'job_1', status: 'completed', progress: { ...mockImportJob.progress, importedRows: 50 } },
      { ...mockImportJob, _id: 'job_2', status: 'importing', progress: { ...mockImportJob.progress, importedRows: 30 } },
      { ...mockImportJob, _id: 'job_3', status: 'failed', progress: { ...mockImportJob.progress, importedRows: 0 } },
    ];
    
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce(jobs);
    
    render(<ImportsPage />);
    
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