import { 
  render, 
  screen, 
  fireEvent
} from '@/__tests__/test-utils';
import {
  setupTest, 
  cleanupTest,
  createMockProduct,
  seedMockData 
} from '@/__tests__/frontend-test-helpers';
import { ProductCard } from '../product-card';
import { Product } from '@/types/models';

// Use standardized mock product creation
const mockProduct: Product = createMockProduct({
  handle: 'test-product',
  title: 'Test Product',
  description: 'A test product description',
  vendor: 'Test Vendor',
  productType: 'Electronics',
  status: 'active',
  categories: ['category1', 'category2', 'category3', 'category4'],
  image: 'https://example.com/product.jpg',
  tags: [],
  importJobId: 'import_123' as any,
}) as Product;

describe('ProductCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnView = jest.fn();
  const mockOnArchive = jest.fn();

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('test-product')).toBeInTheDocument();
    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('displays status badge with correct variant', () => {
    const { rerender } = render(<ProductCard product={mockProduct} />);

    let badge = screen.getByText('active');
    expect(badge).toHaveClass('bg-primary'); // default variant

    rerender(<ProductCard product={{ ...mockProduct, status: 'draft' }} />);
    badge = screen.getByText('draft');
    expect(badge).toHaveClass('bg-secondary'); // secondary variant

    rerender(<ProductCard product={{ ...mockProduct, status: 'archived' }} />);
    badge = screen.getByText('archived');
    expect(badge).toHaveClass('border'); // outline variant
  });

  it('shows product image when available', () => {
    render(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/product.jpg');
  });

  it('shows placeholder icon when no image', () => {
    const productWithoutImage = { ...mockProduct, image: null };
    const { container } = render(<ProductCard product={productWithoutImage} />);

    const packageIcon = container.querySelector('svg.lucide-package');
    expect(packageIcon).toBeInTheDocument();
  });

  it('displays categories with limit of 3', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.getByText('Category 2')).toBeInTheDocument();
    expect(screen.getByText('Category 3')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument(); // 4 total, showing 3
  });

  it('formats and displays update date', () => {
    const fixedDate = new Date('2024-01-15').getTime();
    const productWithDate = createMockProduct({ 
      ...mockProduct, 
      updatedAt: fixedDate 
    }) as Product;

    render(<ProductCard product={productWithDate} />);

    // The date format depends on locale, so we check for the presence of "Updated" and the date parts
    const dateText = screen.getByText(/Updated/);
    expect(dateText).toBeInTheDocument();
    expect(dateText.textContent).toMatch(/Updated/);
    expect(dateText.textContent).toContain('2024');
  });

  it('shows actions menu on hover', async () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onView={mockOnView}
        onArchive={mockOnArchive}
      />
    );

    // Actions button should be present but invisible initially
    const actionsButton = screen.getByLabelText('More actions');
    expect(actionsButton).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(actionsButton);

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Edit Product')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('calls action handlers when menu items clicked', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        onView={mockOnView}
        onArchive={mockOnArchive}
      />
    );

    const actionsButton = screen.getByLabelText('More actions');
    fireEvent.click(actionsButton);

    fireEvent.click(screen.getByText('View Details'));
    expect(mockOnView).toHaveBeenCalledWith(mockProduct);

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByText('Edit Product'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct);

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByText('Archive'));
    expect(mockOnArchive).toHaveBeenCalledWith(mockProduct);
  });

  it('only shows available actions', () => {
    render(
      <ProductCard
        product={mockProduct}
        onEdit={mockOnEdit}
        // No onView or onArchive
      />
    );

    const actionsButton = screen.getByLabelText('More actions');
    fireEvent.click(actionsButton);

    expect(screen.getByText('Edit Product')).toBeInTheDocument();
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ProductCard product={mockProduct} className="custom-class" />);

    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('shows vendor with icon when available', () => {
    render(<ProductCard product={mockProduct} />);

    const vendorText = screen.getByText('Test Vendor');
    expect(vendorText).toBeInTheDocument();

    // Check for Store icon
    const vendorContainer = vendorText.parentElement;
    const storeIcon = vendorContainer?.querySelector('svg.lucide-store');
    expect(storeIcon).toBeInTheDocument();
  });

  it('shows product type with icon when available', () => {
    render(<ProductCard product={mockProduct} />);

    const typeText = screen.getByText('Electronics');
    expect(typeText).toBeInTheDocument();

    // Check for Tag icon
    const typeContainer = typeText.parentElement;
    const tagIcon = typeContainer?.querySelector('svg.lucide-tag');
    expect(tagIcon).toBeInTheDocument();
  });

  it('handles products without vendor or type', () => {
    const minimalProduct = {
      ...mockProduct,
      vendor: null,
      productType: null,
      categories: [],
    };

    render(<ProductCard product={minimalProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.queryByText('Test Vendor')).not.toBeInTheDocument();
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Category 1')).not.toBeInTheDocument();
  });
});
