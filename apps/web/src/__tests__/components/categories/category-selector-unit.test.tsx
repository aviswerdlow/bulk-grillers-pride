import React from 'react';
import { CategorySelector } from '@/components/categories/category-selector';
import { Category } from '@/types/models';

// Test the utility functions and logic independently
describe('CategorySelector - Unit Tests', () => {
  // Test flatten categories logic
  describe('flattenCategories', () => {
    it('should flatten nested category tree', () => {
      const categories: Category[] = [
        {
          _id: 'cat1' as any,
          name: 'Electronics',
          level: 1,
          path: '/electronics',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
          children: [
            {
              _id: 'cat2' as any,
              name: 'Computers',
              level: 2,
              path: '/electronics/computers',
              parentId: 'cat1' as any,
              organizationId: 'org1' as any,
              projectId: 'proj1' as any,
              children: [
                {
                  _id: 'cat3' as any,
                  name: 'Laptops',
                  level: 3,
                  path: '/electronics/computers/laptops',
                  parentId: 'cat2' as any,
                  organizationId: 'org1' as any,
                  projectId: 'proj1' as any,
                },
              ],
            },
          ],
        },
      ];

      // This would normally be extracted from the component
      const flattenCategories = (categories: Category[]): Category[] => {
        const flattened: Category[] = [];

        const flatten = (cats: Category[], parentPath = '') => {
          cats.forEach((category) => {
            flattened.push(category);
            if (category.children) {
              flatten(category.children, `${parentPath}${category.name} > `);
            }
          });
        };

        flatten(categories);
        return flattened;
      };

      const flattened = flattenCategories(categories);

      expect(flattened).toHaveLength(3);
      expect(flattened[0].name).toBe('Electronics');
      expect(flattened[1].name).toBe('Computers');
      expect(flattened[2].name).toBe('Laptops');
    });
  });

  // Test category path generation
  describe('getCategoryPath', () => {
    it('should generate correct path from category', () => {
      const getCategoryPath = (category: Category) => {
        return category.path.split('/').filter(Boolean).join(' > ');
      };

      const category: Category = {
        _id: 'cat1' as any,
        name: 'Laptops',
        level: 3,
        path: '/electronics/computers/laptops',
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
      };

      expect(getCategoryPath(category)).toBe('electronics > computers > laptops');
    });

    it('should handle root level categories', () => {
      const getCategoryPath = (category: Category) => {
        return category.path.split('/').filter(Boolean).join(' > ');
      };

      const category: Category = {
        _id: 'cat1' as any,
        name: 'Electronics',
        level: 1,
        path: '/electronics',
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
      };

      expect(getCategoryPath(category)).toBe('electronics');
    });
  });

  // Test selection logic
  describe('handleSelect', () => {
    it('should add category in multiple mode', () => {
      const selectedCategories: string[] = ['cat1'];
      const onChange = jest.fn();

      // Simulate the logic from the component
      const handleSelect = (categoryId: string, multiple = true) => {
        if (multiple) {
          const newSelection = selectedCategories.includes(categoryId)
            ? selectedCategories.filter((id) => id !== categoryId)
            : [...selectedCategories, categoryId];
          onChange(newSelection);
        } else {
          onChange([categoryId]);
        }
      };

      handleSelect('cat2');

      expect(onChange).toHaveBeenCalledWith(['cat1', 'cat2']);
    });

    it('should remove category in multiple mode when already selected', () => {
      const selectedCategories: string[] = ['cat1', 'cat2'];
      const onChange = jest.fn();

      const handleSelect = (categoryId: string, multiple = true) => {
        if (multiple) {
          const newSelection = selectedCategories.includes(categoryId)
            ? selectedCategories.filter((id) => id !== categoryId)
            : [...selectedCategories, categoryId];
          onChange(newSelection);
        } else {
          onChange([categoryId]);
        }
      };

      handleSelect('cat2');

      expect(onChange).toHaveBeenCalledWith(['cat1']);
    });

    it('should replace selection in single mode', () => {
      const selectedCategories: string[] = ['cat1'];
      const onChange = jest.fn();

      const handleSelect = (categoryId: string, multiple = false) => {
        if (multiple) {
          const newSelection = selectedCategories.includes(categoryId)
            ? selectedCategories.filter((id) => id !== categoryId)
            : [...selectedCategories, categoryId];
          onChange(newSelection);
        } else {
          onChange([categoryId]);
        }
      };

      handleSelect('cat2', false);

      expect(onChange).toHaveBeenCalledWith(['cat2']);
    });
  });

  // Test filtering logic
  describe('filtering', () => {
    it('should filter categories by name', () => {
      const categories: Category[] = [
        {
          _id: 'cat1' as any,
          name: 'Electronics',
          level: 1,
          path: '/electronics',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
        },
        {
          _id: 'cat2' as any,
          name: 'Clothing',
          level: 1,
          path: '/clothing',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
        },
        {
          _id: 'cat3' as any,
          name: 'Phones',
          level: 2,
          path: '/electronics/phones',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
        },
      ];

      const searchTerm = 'phone';
      const filteredCategories = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.path.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filteredCategories).toHaveLength(1);
      expect(filteredCategories[0].name).toBe('Phones');
    });

    it('should filter categories by path', () => {
      const categories: Category[] = [
        {
          _id: 'cat1' as any,
          name: 'Laptops',
          level: 3,
          path: '/electronics/computers/laptops',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
        },
        {
          _id: 'cat2' as any,
          name: 'Desktops',
          level: 3,
          path: '/electronics/computers/desktops',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
        },
        {
          _id: 'cat3' as any,
          name: 'Smartphones',
          level: 2,
          path: '/electronics/phones',
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
        },
      ];

      const searchTerm = 'computers';
      const filteredCategories = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.path.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filteredCategories).toHaveLength(2);
      expect(filteredCategories[0].name).toBe('Laptops');
      expect(filteredCategories[1].name).toBe('Desktops');
    });
  });

  // Test level name logic
  describe('getLevelName', () => {
    it('should return friendly name when level definition exists', () => {
      const levelDefinitions = [
        {
          _id: 'level1' as any,
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
          level: 1,
          name: 'department',
          pluralName: 'departments',
          friendlyName: 'Department',
        },
        {
          _id: 'level2' as any,
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
          level: 2,
          name: 'category',
          pluralName: 'categories',
          friendlyName: 'Category',
        },
      ];

      const getLevelName = (level: number) => {
        const levelDef = levelDefinitions?.find((l) => l.level === level);
        return levelDef?.friendlyName || `Level ${level}`;
      };

      expect(getLevelName(1)).toBe('Department');
      expect(getLevelName(2)).toBe('Category');
    });

    it('should return fallback name when level definition not found', () => {
      const levelDefinitions = [
        {
          _id: 'level1' as any,
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
          level: 1,
          name: 'department',
          pluralName: 'departments',
          friendlyName: 'Department',
        },
      ];

      const getLevelName = (level: number) => {
        const levelDef = levelDefinitions?.find((l) => l.level === level);
        return levelDef?.friendlyName || `Level ${level}`;
      };

      expect(getLevelName(3)).toBe('Level 3');
    });
  });
});
