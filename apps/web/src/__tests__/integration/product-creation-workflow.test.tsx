/**
 * @jest-environment jsdom
 */
import React from 'react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cleanupTest, createMockProduct, mockUseMutation, render, screen, setupTest, waitFor, within, renderWithProviders } from '@/__tests__/test-helpers';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { ProductCard } from '@/components/products/product-card';
import { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
;

// Mock dependencies
jest.mock('sonner');
// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

describe('Product Creation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCreateProduct = jest.fn();
  const mockUploadImage = jest.fn();
  const mockGetUploadUrl = jest.fn();
  
  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
    
    mockUseMutation.mockImplementation((fn) => {
      if (fn.name?.includes('createProduct')) return mockCreateProduct;
      if (fn.name?.includes('uploadImage')) return mockUploadImage;
      if (fn.name?.includes('getUploadUrl')) return mockGetUploadUrl;
      return jest.fn();
    });

    // Mock successful responses
    mockGetUploadUrl.mockResolvedValue('https://upload.url');
    mockUploadImage.mockResolvedValue({ storageId: 'uploaded_image_123' });
    mockCreateProduct.mockResolvedValue({ _id: 'new_product_123' });
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Complete Product Creation Flow', () => {
    it('creates a product from start to finish', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      
      // Render the product creation dialog
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Step 1: Fill in basic product information
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Premium Grill');

      const handleInput = screen.getByLabelText(/handle/i);
      expect(handleInput).toHaveValue('premium-grill'); // Auto-generated

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'A high-quality outdoor grill perfect for backyard barbecues.');

      // Step 2: Add product details
      const vendorInput = screen.getByLabelText(/vendor/i);
      await user.type(vendorInput, 'GrillMaster Co.');

      const typeInput = screen.getByLabelText(/product type/i);
      await user.type(typeInput, 'Outdoor Grills');

      // Step 3: Add tags
      const tagsInput = screen.getByLabelText(/tags/i);
      await user.type(tagsInput, 'outdoor');
      await user.keyboard('{Enter}');
      await user.type(tagsInput, 'barbecue');
      await user.keyboard('{Enter}');

      // Verify tags were added
      expect(screen.getByText('outdoor')).toBeInTheDocument();
      expect(screen.getByText('barbecue')).toBeInTheDocument();

      // Step 4: Add SEO information
      const seoButton = screen.getByRole('button', { name: /seo metadata/i });
      await user.click(seoButton);

      const seoTitleInput = screen.getByLabelText(/seo title/i);
      await user.type(seoTitleInput, 'Premium Outdoor Grill | Best BBQ Grills');

      const seoDescInput = screen.getByLabelText(/seo description/i);
      await user.type(seoDescInput, 'Shop our premium outdoor grill - perfect for barbecues and outdoor cooking.');

      // Step 5: Submit the form
      const submitButton = screen.getByRole('button', { name: /create product/i });
      await user.click(submitButton);

      // Verify the product was created with correct data
      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith({
          organizationId: 'org_123',
          projectId: 'project_123',
          title: 'Premium Grill',
          handle: 'premium-grill',
          description: 'A high-quality outdoor grill perfect for backyard barbecues.',
          vendor: 'GrillMaster Co.',
          productType: 'Outdoor Grills',
          tags: ['outdoor', 'barbecue'],
          seo: {
            title: 'Premium Outdoor Grill | Best BBQ Grills',
            description: 'Shop our premium outdoor grill - perfect for barbecues and outdoor cooking.',
          },
          status: 'draft',
          publishedAt: null,
        });
      });

      // Verify success feedback
      expect(toast.success).toHaveBeenCalledWith('Product created successfully');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('handles duplicate handle error gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock duplicate handle error
      mockCreateProduct.mockRejectedValueOnce(new Error('Handle already exists'));
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/title/i), 'Existing Product');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /create product/i }));

      // Verify error is shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to create product. Please check the handle is unique.'
        );
      });

      // User can modify handle and retry
      const handleInput = screen.getByLabelText(/handle/i);
      await user.clear(handleInput);
      await user.type(handleInput, 'unique-product-handle');

      // Mock successful creation after retry
      mockCreateProduct.mockResolvedValueOnce({ _id: 'new_product_123' });
      
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Product created successfully');
      });
    });
  });

  describe('Product Card Integration', () => {
    it('displays newly created product in product card', async () => {
      const newProduct = createMockProduct({
        _id: 'new_product_123',
        title: 'Premium Grill',
        handle: 'premium-grill',
        description: 'A high-quality outdoor grill',
        vendor: 'GrillMaster Co.',
        productType: 'Outdoor Grills',
        tags: ['outdoor', 'barbecue'],
        createdAt: Date.now(),
      });

      renderWithProviders(<ProductCard product={newProduct as any} />);

      // Verify all product information is displayed
      expect(screen.getByText('Premium Grill')).toBeInTheDocument();
      expect(screen.getByText('premium-grill')).toBeInTheDocument();
      expect(screen.getByText('GrillMaster Co.')).toBeInTheDocument();
      expect(screen.getByText('Outdoor Grills')).toBeInTheDocument();
      
      // Verify tags
      const tagsContainer = screen.getByText('outdoor').closest('div');
      expect(within(tagsContainer!).getByText('outdoor')).toBeInTheDocument();
      expect(within(tagsContainer!).getByText('barbecue')).toBeInTheDocument();
    });
  });

  describe('Form Validation Flow', () => {
    it('validates required fields before submission', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create product/i });
      await user.click(submitButton);

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });

      // Fix validation error
      await user.type(screen.getByLabelText(/title/i), 'Valid Product');

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      });
    });

    it('validates handle format', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Enter invalid handle
      const handleInput = screen.getByLabelText(/handle/i);
      await user.clear(handleInput);
      await user.type(handleInput, 'Invalid Handle!');

      // Move focus to trigger validation
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/handle must be lowercase/i)).toBeInTheDocument();
      });
    });
  });

  describe('Image Upload Flow', () => {
    it('handles image upload during product creation', async () => {
      const user = userEvent.setup();
      const file = new File(['image content'], 'product.jpg', { type: 'image/jpeg' });
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Product with Image');

      // Upload image
      const fileInput = screen.getByLabelText(/product image/i);
      await user.upload(fileInput, file);

      // Verify upload process
      await waitFor(() => {
        expect(mockGetUploadUrl).toHaveBeenCalled();
        expect(mockUploadImage).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://upload.url',
            file: expect.any(File),
          })
        );
      });

      // Submit form
      await user.click(screen.getByRole('button', { name: /create product/i }));

      // Verify product created with image
      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Product with Image',
            image: 'uploaded_image_123',
          })
        );
      });
    });

    it('shows error for invalid image types', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      const fileInput = screen.getByLabelText(/product image/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/only image files are allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-step Workflow', () => {
    it('allows saving as draft and publishing later', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Fill product details
      await user.type(screen.getByLabelText(/title/i), 'Draft Product');
      
      // Ensure status is draft
      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toHaveValue('draft');

      // Create as draft
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Draft Product',
            status: 'draft',
            publishedAt: null,
          })
        );
      });
    });

    it('allows immediate publishing', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // Fill product details
      await user.type(screen.getByLabelText(/title/i), 'Published Product');
      
      // Change status to active
      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'active');

      // Create and publish
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Published Product',
            status: 'active',
            publishedAt: expect.any(Number),
          })
        );
      });
    });
  });
});