# Dashboard Navigation Test Plan

## Overview

This document outlines all navigation links that need to be tested for T40: Verify All Dashboard Links Work.

## Navigation Links in Layout (Sidebar)

1. **Dashboard** - `/${orgSlug}/dashboard`
2. **Projects** - `/${orgSlug}/projects`
3. **Products** - `/${orgSlug}/products`
4. **Categories** - `/${orgSlug}/categories`
5. **AI Categorization** - `/${orgSlug}/ai-categorization`
6. **Import Data** - `/${orgSlug}/imports`
7. **Team** - `/${orgSlug}/team`
8. **New Project** - `/${orgSlug}/projects/new`
9. **Settings** - `/${orgSlug}/settings`

## Dashboard Page Links

### Header Section

1. **New Project Button** - `/${orgSlug}/projects/new`

### Projects Section

1. **View All Projects** - `/${orgSlug}/projects`
2. **Open Project** - `/${orgSlug}/${project.slug}` (dynamic per project)
3. **Create Project** (when no projects) - `/${orgSlug}/projects/new`

### Quick Actions

1. **Import Products** - `/${orgSlug}/imports` ✅ (Fixed from `/products/import`)
2. **AI Categorization** - `/${orgSlug}/ai/categorization`
3. **View Analytics** - `/${orgSlug}/analytics`

### Recent Activity Section

1. **View All Activity** - `/${orgSlug}/activity`

## Test Checklist

- [ ] All sidebar navigation links navigate to correct pages
- [ ] All dashboard quick action buttons work correctly
- [ ] Project links open correct project pages
- [ ] New Project buttons work from multiple locations
- [ ] View All links navigate to listing pages
- [ ] No 404 errors on any navigation
- [ ] Back button works correctly after navigation
- [ ] Links preserve organization context (orgSlug)

## Notes

- Fixed Import Products link from `/products/import` to `/imports`
- Some routes may not exist yet (e.g., `/analytics`, `/activity`, `/settings`)
- Project links are dynamic based on project slugs
