import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { ProductCardMini } from '../product-card-mini';
import { ProductCardSkeleton } from '../product-card-skeleton';
import { setupTest, cleanupTest, createMockProduct } from '@/__tests__/frontend-test-helpers';
import { Product } from '@/types/models';

describe('ProductCardMini', () => {
  const mockProduct: Product = createMockProduct({
    _id: 'product_123',
    title: 'Mini Product',
    handle: 'mini-product',
    image: 'https://example.com/mini.jpg',
    productType: 'Electronics',
    vendor: 'Test Vendor',
  }) as Product;

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders product title and handle', () => {
      render(<ProductCardMini product={mockProduct} />);

      expect(screen.getByText('Mini Product')).toBeInTheDocument();
      expect(screen.getByText('mini-product')).toBeInTheDocument();
    });

    it('renders product image when available', () => {
      render(<ProductCardMini product={mockProduct} />);

      const image = screen.getByAltText('Mini Product');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/mini.jpg');
    });

    it('renders placeholder icon when no image', () => {
      const productWithoutImage = { ...mockProduct, image: null };
      const { container } = render(<ProductCardMini product={productWithoutImage} />);

      const packageIcon = container.querySelector('svg.lucide-package');
      expect(packageIcon).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProductCardMini product={mockProduct} className="custom-mini-class" />
      );

      expect(container.firstChild).toHaveClass('custom-mini-class');
    });

    it('renders in compact format', () => {
      const { container } = render(<ProductCardMini product={mockProduct} />);

      // Should have smaller dimensions than regular card
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-3'); // Compact padding
    });
  });

  describe('Hover Effects', () => {
    it('applies hover styles', () => {
      const { container } = render(<ProductCardMini product={mockProduct} />);

      const card = container.firstChild;
      expect(card).toHaveClass('hover:shadow-md');
      expect(card).toHaveClass('transition-shadow');
    });
  });

  describe('Content Display', () => {
    it('truncates long titles', () => {
      const longTitleProduct = {
        ...mockProduct,
        title: 'This is a very long product title that should be truncated in the mini card view',
      };
      
      render(<ProductCardMini product={longTitleProduct} />);

      const titleElement = screen.getByText(/This is a very long product title/);
      expect(titleElement).toHaveClass('line-clamp-1');
    });

    it('shows product type if available', () => {
      render(<ProductCardMini product={mockProduct} />);

      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    it('handles missing optional fields', () => {
      const minimalProduct = {
        ...mockProduct,
        productType: null,
        vendor: null,
      };

      render(<ProductCardMini product={minimalProduct} />);

      expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Vendor')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<ProductCardMini product={mockProduct} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Mini Product'));
    });

    it('provides alternative text for images', () => {
      render(<ProductCardMini product={mockProduct} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Mini Product');
    });
  });
});

describe('ProductCardSkeleton', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  it('renders loading skeleton', () => {
    const { container } = render(<ProductCardSkeleton />);

    // Check for skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('matches dimensions of ProductCardMini', () => {
    const { container: skeletonContainer } = render(<ProductCardSkeleton />);
    const { container: miniContainer } = render(
      <ProductCardMini 
        product={createMockProduct({ title: 'Test' }) as Product} 
      />
    );

    const skeletonCard = skeletonContainer.firstChild as HTMLElement;
    const miniCard = miniContainer.firstChild as HTMLElement;

    // Should have same padding classes
    expect(skeletonCard.className).toContain('p-3');
    expect(miniCard.className).toContain('p-3');
  });

  it('shows placeholder for image area', () => {
    const { container } = render(<ProductCardSkeleton />);

    const imagePlaceholder = container.querySelector('.aspect-square');
    expect(imagePlaceholder).toBeInTheDocument();
    expect(imagePlaceholder).toHaveClass('bg-gray-200');
  });

  it('shows placeholder for text content', () => {
    const { container } = render(<ProductCardSkeleton />);

    // Should have placeholders for title and handle
    const textPlaceholders = container.querySelectorAll('.h-4.bg-gray-200');
    expect(textPlaceholders.length).toBeGreaterThanOrEqual(2);
  });

  it('applies skeleton animation', () => {
    const { container } = render(<ProductCardSkeleton />);

    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('supports custom className', () => {
    const { container } = render(<ProductCardSkeleton className="custom-skeleton" />);

    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});