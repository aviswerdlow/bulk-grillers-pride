"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, FolderTree, ChevronRight, MoreHorizontal, Edit, Trash2, FolderPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog";
import { Loading } from "@/components/loading";

interface CategoryTreeNode {
  _id: string;
  name: string;
  handle: string;
  level: number;
  parentId?: string;
  children: CategoryTreeNode[];
  status: "active" | "hidden" | "archived";
  isVisible: boolean;
  updatedAt: number;
}

export default function CategoriesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryTreeNode | null>(null);
  const [selectedParent, setSelectedParent] = useState<string | undefined>(undefined);

  // Get organization
  const organization = useQuery((api as any).functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get projects for this organization
  const projects = useQuery(
    (api as any).functions.projects.projects.getOrganizationProjects,
    organization ? { organizationId: organization._id } : "skip"
  );

  // Use first project for now (TODO: add project selection)
  const currentProject = projects?.[0];

  // Get category tree for the current project
  const categoryTree = useQuery(
    (api as any).functions.categories.categories.getCategoryTree,
    currentProject ? {
      organizationId: organization!._id,
      projectId: currentProject._id,
    } : "skip"
  );

  if (organization === undefined || projects === undefined) {
    return <Loading size="lg" text="Loading categories..." />;
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <FolderTree className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Projects Found</h3>
          <p className="text-muted-foreground">Create a project first to manage categories</p>
        </div>
      </div>
    );
  }

  const categories = categoryTree || [];
  const isLoading = categoryTree === undefined;

  // Flatten categories for counting and searching
  const flattenCategories = (cats: CategoryTreeNode[]): CategoryTreeNode[] => {
    const result: CategoryTreeNode[] = [];
    cats.forEach(cat => {
      result.push(cat);
      if (cat.children.length > 0) {
        result.push(...flattenCategories(cat.children));
      }
    });
    return result;
  };

  const allCategories = flattenCategories(categories);

  // Filter categories based on search term
  const filterCategories = (cats: CategoryTreeNode[], term: string): CategoryTreeNode[] => {
    return cats.filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(term.toLowerCase()) ||
                           cat.handle.toLowerCase().includes(term.toLowerCase());
      
      if (matchesSearch) return true;
      
      // Check if any children match
      const filteredChildren = filterCategories(cat.children, term);
      if (filteredChildren.length > 0) {
        cat.children = filteredChildren;
        return true;
      }
      
      return false;
    });
  };

  const filteredCategories = searchTerm
    ? filterCategories(JSON.parse(JSON.stringify(categories)), searchTerm)
    : categories;

  const CategoryTreeView = ({ categories, level = 0 }: { categories: CategoryTreeNode[], level?: number }) => {
    return (
      <div className="space-y-1">
        {categories.map((category) => (
          <div key={category._id}>
            {/* Category Row */}
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
                {category.children.length > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {category.children.length === 0 && level > 0 && (
                  <div className="w-4 h-4" />
                )}
                <FolderTree className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">{category.handle}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge variant={category.status === "active" ? "default" : "secondary"}>
                  {category.status}
                </Badge>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedParent(category._id);
                      setShowCreateDialog(true);
                    }}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Subcategory
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => {
                        // TODO: Implement delete functionality
                        console.log("Delete category:", category._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Children */}
            {category.children.length > 0 && (
              <CategoryTreeView categories={category.children} level={level + 1} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Organize your products with hierarchical categories for {currentProject?.name || "your project"}
          </p>
        </div>
        <Button onClick={() => {
          setSelectedParent(undefined);
          setShowCreateDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCategories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Root Categories</CardTitle>
            <Badge variant="default" className="h-4 text-xs">●</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Depth</CardTitle>
            <Badge variant="secondary" className="h-4 text-xs">●</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCategories.length > 0 ? Math.max(...allCategories.map(c => c.level)) + 1 : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default" className="h-4 text-xs">●</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCategories.filter(c => c.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="md" text="Loading categories..." />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No categories found" : "No categories yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search"
                  : "Get started by creating your first category"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => {
                  setSelectedParent(undefined);
                  setShowCreateDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              )}
            </div>
          ) : (
            <CategoryTreeView categories={filteredCategories} />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {currentProject && (
        <CreateCategoryDialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) setSelectedParent(undefined);
          }}
          organizationId={organization._id}
          projectId={currentProject._id}
          parentId={selectedParent}
        />
      )}

      {editingCategory && (
        <EditCategoryDialog
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          category={editingCategory}
        />
      )}
    </div>
  );
}