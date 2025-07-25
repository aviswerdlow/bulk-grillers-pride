# Import Templates Guide

## Overview

This guide explains how to use the CSV import templates for bulk importing products, variants, and categories into the system.

## Product Import Template

### Download Template
1. Navigate to the Imports page in your dashboard
2. Click "Download Template" under the Products section
3. A file named `products-import-template.csv` will be downloaded

### Required Fields
- **Title**: Product name (e.g., "Premium Ribeye Steak")
- **Handle**: URL-friendly identifier (e.g., "premium-ribeye-steak")
- **Status**: Product status - must be one of: `active`, `draft`, or `archived`

### Optional Fields
- **Description**: Detailed product description
- **Vendor**: Supplier or manufacturer name
- **Product Type**: Category or type (e.g., "Beef", "Poultry", "Seafood")
- **Tags**: Comma-separated list of tags
- **Price**: Regular price (numeric, e.g., "29.99")
- **Compare At Price**: Original/MSRP price for showing discounts
- **Cost**: Your cost for the product
- **SKU**: Stock Keeping Unit - unique product identifier (NEW)
- **Barcode**: Product barcode (UPC, EAN, etc.)
- **Inventory Quantity**: Current stock level
- **Weight**: Product weight (numeric)
- **Weight Unit**: Unit of weight (e.g., "oz", "lb", "kg")
- **Image URL**: Direct link to product image

### SKU Field Guidelines
- **Format**: Alphanumeric, hyphens allowed (e.g., "RIB-001", "CHK-001-ORGANIC")
- **Uniqueness**: Each SKU must be unique within your catalog
- **Best Practices**:
  - Use consistent prefixes for product categories
  - Include size/variant information in the SKU
  - Keep SKUs short but descriptive
  - Examples:
    - Beef products: `BEF-XXX`
    - Chicken products: `CHK-XXX`
    - Seafood products: `SEA-XXX`

### Sample Data
The template includes three sample products:
1. Premium Ribeye Steak (SKU: RIB-001)
2. Organic Chicken Breast (SKU: CHK-001)
3. Wild-Caught Salmon Fillet (SKU: SAL-001)

## Variant Import Template

### Download Template
1. Navigate to the Imports page
2. Click "Download Template" under the Variants section
3. A file named `variants-import-template.csv` will be downloaded

### Required Fields
- **sku**: Variant SKU (must be unique)
- **productHandle**: Handle of the parent product
- **title**: Variant title

### Optional Fields
- **price**: Variant-specific price
- **compareAtPrice**: Original price
- **costPrice**: Your cost
- **barcode**: Variant barcode
- **inventoryQuantity**: Stock level
- **trackInventory**: true/false
- **weight**: Variant weight
- **weightUnit**: Weight unit
- **option1Name/Value**: First option (e.g., "Size" / "12oz")
- **option2Name/Value**: Second option (e.g., "Type" / "Family Pack")

### Variant SKU Format
- Base product SKU + variant identifier
- Examples:
  - `RIB-001-12OZ` (12oz ribeye)
  - `RIB-001-16OZ` (16oz ribeye)
  - `CHK-001-2LB` (2lb chicken pack)

## Categories Import Template

### Download Template
1. Navigate to the Imports page
2. Click "Download Template" under the Categories section
3. A file named `categories-import-template.json` will be downloaded

### Structure
Categories use a hierarchical structure with 5 levels:
1. **Level 1**: Aisle (e.g., "Fresh Foods")
2. **Level 2**: Product Type (e.g., "Meat & Seafood")
3. **Level 3**: Master Category (e.g., "Beef")
4. **Level 4**: Category (e.g., "Steaks")
5. **Level 5**: Subcategory (e.g., "Ribeye Steaks")

### Required Fields
- **category_id**: Unique identifier
- **name**: Category name
- **level**: Hierarchy level (1-5)
- **created_at**: ISO timestamp
- **updated_at**: ISO timestamp

## Import Process

1. **Prepare Your Data**
   - Download the appropriate template
   - Replace sample data with your own
   - Ensure all required fields are filled
   - Validate SKUs are unique

2. **Review Before Import**
   - Check for duplicate SKUs
   - Verify product handles match existing products (for variants)
   - Ensure status values are valid
   - Confirm numeric fields contain only numbers

3. **Import Your File**
   - Navigate to the Imports page
   - Select your project
   - Choose import type (Products/Variants/Categories)
   - Upload your prepared file
   - Review the validation results

4. **Handle Errors**
   - Download error report if validation fails
   - Fix issues in your file
   - Re-upload corrected file

## Best Practices

### SKU Management
- Establish a consistent SKU naming convention
- Document your SKU format for team reference
- Use SKUs in inventory management and reporting
- Update SKUs when products change significantly

### Data Quality
- Clean data before importing (remove extra spaces, fix capitalization)
- Use consistent units (all weights in oz or all in lb)
- Verify URLs are accessible before import
- Test with a small batch first

### Performance Tips
- Import in batches of 1000 or fewer items
- Import products before variants
- Import categories before products if using category assignments

## Troubleshooting

### Common Issues
1. **"Duplicate SKU" Error**
   - Ensure each SKU appears only once in your file
   - Check if SKU already exists in the system

2. **"Invalid Status" Error**
   - Status must be exactly: `active`, `draft`, or `archived`
   - Check for typos or extra spaces

3. **"Product Handle Not Found" (Variants)**
   - Ensure parent product exists
   - Verify handle matches exactly

### Getting Help
- Check import logs for detailed error messages
- Contact support with your import ID for assistance
- Review this guide for field requirements