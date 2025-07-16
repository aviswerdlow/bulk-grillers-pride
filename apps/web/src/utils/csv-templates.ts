// CSV Template generators for different import types

export function downloadProductsTemplate() {
  const headers = [
    'Title',
    'Description',
    'Vendor',
    'Product Type',
    'Handle',
    'Status',
    'Tags',
    'Price',
    'Compare At Price',
    'Cost',
    'SKU',
    'Barcode',
    'Inventory Quantity',
    'Weight',
    'Weight Unit',
    'Image URL',
  ];

  const sampleData = [
    [
      'Premium Ribeye Steak',
      'USDA Prime grade ribeye steak, perfectly marbled for maximum flavor',
      'Angus Farms',
      'Beef',
      'premium-ribeye-steak',
      'active',
      'beef,steak,premium,ribeye',
      '29.99',
      '34.99',
      '18.00',
      'RIB-001',
      '123456789012',
      '50',
      '16',
      'oz',
      'https://example.com/ribeye.jpg',
    ],
    [
      'Organic Chicken Breast',
      'Free-range organic chicken breast, no antibiotics or hormones',
      'Green Valley Farms',
      'Poultry',
      'organic-chicken-breast',
      'active',
      'chicken,organic,poultry,breast',
      '8.99',
      '10.99',
      '5.50',
      'CHK-001',
      '123456789013',
      '100',
      '1.5',
      'lb',
      'https://example.com/chicken.jpg',
    ],
    [
      'Wild-Caught Salmon Fillet',
      'Fresh Atlantic salmon, sustainably caught',
      'Ocean Fresh',
      'Seafood',
      'wild-salmon-fillet',
      'active',
      'salmon,seafood,fish,wild-caught',
      '18.99',
      '22.99',
      '12.00',
      'SAL-001',
      '123456789014',
      '30',
      '8',
      'oz',
      'https://example.com/salmon.jpg',
    ],
  ];

  // Create CSV content
  const csvContent = [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');

  // Download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadVariantsTemplate() {
  const headers = [
    'sku',
    'productHandle',
    'title',
    'price',
    'compareAtPrice',
    'costPrice',
    'barcode',
    'inventoryQuantity',
    'trackInventory',
    'weight',
    'weightUnit',
    'option1Name',
    'option1Value',
    'option2Name',
    'option2Value',
  ];

  const sampleData = [
    [
      'RIB-001-12OZ',
      'premium-ribeye-steak',
      '12oz Ribeye Steak',
      '22.99',
      '26.99',
      '14.00',
      '123456789015',
      '25',
      'true',
      '12',
      'oz',
      'Size',
      '12oz',
      '',
      '',
    ],
    [
      'RIB-001-16OZ',
      'premium-ribeye-steak',
      '16oz Ribeye Steak',
      '29.99',
      '34.99',
      '18.00',
      '123456789012',
      '50',
      'true',
      '16',
      'oz',
      'Size',
      '16oz',
      '',
      '',
    ],
    [
      'CHK-001-2LB',
      'organic-chicken-breast',
      '2lb Family Pack',
      '16.99',
      '19.99',
      '10.00',
      '123456789016',
      '40',
      'true',
      '2',
      'lb',
      'Size',
      '2lb Pack',
      'Type',
      'Family Pack',
    ],
  ];

  // Create CSV content
  const csvContent = [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');

  // Download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'variants-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCategoriesTemplate() {
  const template = [
    {
      category_id: 'aisle-001',
      name: 'Fresh Foods',
      level: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      category_id: 'product-type-001',
      name: 'Meat & Seafood',
      level: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      category_id: 'master-cat-001',
      name: 'Beef',
      level: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      category_id: 'category-001',
      name: 'Steaks',
      level: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      category_id: 'sub-cat-001',
      name: 'Ribeye Steaks',
      level: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Additional examples
    {
      category_id: 'sub-cat-002',
      name: 'Sirloin Steaks',
      level: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      category_id: 'category-002',
      name: 'Ground Beef',
      level: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      category_id: 'sub-cat-003',
      name: '85/15 Ground Beef',
      level: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const dataStr = JSON.stringify(template, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'categories-import-template.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
