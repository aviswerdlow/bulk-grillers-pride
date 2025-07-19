"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Package,
  Tag,
  Brain,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  confidence: number;
  rationale: string;
  isAssigned: boolean;
  assignmentStatus: string;
}

interface ProductResult {
  productId: string;
  title: string;
  description?: string;
  vendor?: string;
  productType?: string;
  handle?: string;
  status: string;
  imageUrl?: string;
  suggestions: CategorySuggestion[];
  newCategorySuggestions?: Array<{
    name: string;
    reason: string;
  }>;
  error?: string;
}

interface ProductResultsTableProps {
  results: ProductResult[];
  onApplyCategory?: (productId: string, categoryId: string, confidence: number, rationale: string) => void;
  isLoading?: boolean;
}

export function ProductResultsTable({ results, onApplyCategory, isLoading }: ProductResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");

  // Filter results based on search and filters
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        result.title.toLowerCase().includes(searchLower) ||
        result.vendor?.toLowerCase().includes(searchLower) ||
        result.productType?.toLowerCase().includes(searchLower) ||
        result.suggestions.some(s => s.categoryName.toLowerCase().includes(searchLower));

      // Status filter
      const matchesStatus = statusFilter === "all" || result.status === statusFilter;

      // Confidence filter
      let matchesConfidence = true;
      if (confidenceFilter !== "all" && result.suggestions.length > 0) {
        const avgConfidence = result.suggestions.reduce((sum, s) => sum + s.confidence, 0) / result.suggestions.length;
        switch (confidenceFilter) {
          case "high":
            matchesConfidence = avgConfidence >= 0.8;
            break;
          case "medium":
            matchesConfidence = avgConfidence >= 0.5 && avgConfidence < 0.8;
            break;
          case "low":
            matchesConfidence = avgConfidence < 0.5;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesConfidence;
    });
  }, [results, searchQuery, statusFilter, confidenceFilter]);

  const toggleRow = (productId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return "default";
    if (confidence >= 0.5) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All confidence</SelectItem>
            <SelectItem value="high">High (≥80%)</SelectItem>
            <SelectItem value="medium">Medium (50-79%)</SelectItem>
            <SelectItem value="low">Low (&lt;50%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {filteredResults.length} of {results.length} products
        </p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {results.filter(r => r.status === "success").length} successful
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-600" />
            {results.filter(r => r.status === "error").length} failed
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Suggested Categories</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((result) => {
                const isExpanded = expandedRows.has(result.productId);
                const avgConfidence = result.suggestions.length > 0
                  ? result.suggestions.reduce((sum, s) => sum + s.confidence, 0) / result.suggestions.length
                  : 0;

                return (
                  <>
                    <TableRow key={result.productId} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(result.productId)}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(result.productId);
                        }}>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {result.imageUrl && (
                            <img
                              src={result.imageUrl}
                              alt={result.title}
                              className="h-12 w-12 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{result.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {result.vendor && <span>{result.vendor}</span>}
                              {result.vendor && result.productType && <span> • </span>}
                              {result.productType && <span>{result.productType}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.status === "error" ? (
                          <span className="text-sm text-red-600">Failed to categorize</span>
                        ) : result.suggestions.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No categories suggested</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {result.suggestions.slice(0, 2).map((suggestion, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {suggestion.categoryName}
                              </Badge>
                            ))}
                            {result.suggestions.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{result.suggestions.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.status === "success" && result.suggestions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Progress value={avgConfidence * 100} className="w-[60px]" />
                            <span className="text-sm text-muted-foreground">
                              {Math.round(avgConfidence * 100)}%
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="text-sm capitalize">{result.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <div className="bg-muted/30 p-6 space-y-4">
                            {/* Product details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Product Details
                                </h4>
                                <dl className="space-y-1 text-sm">
                                  <div className="flex gap-2">
                                    <dt className="text-muted-foreground">Handle:</dt>
                                    <dd className="font-mono">{result.handle || "N/A"}</dd>
                                  </div>
                                  {result.description && (
                                    <div className="flex gap-2">
                                      <dt className="text-muted-foreground">Description:</dt>
                                      <dd className="line-clamp-2">{result.description}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            </div>

                            {/* AI Suggestions */}
                            {result.status === "success" && result.suggestions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <Brain className="h-4 w-4" />
                                  AI Category Suggestions
                                </h4>
                                <div className="space-y-2">
                                  {result.suggestions.map((suggestion, idx) => (
                                    <Card key={idx} className={cn(
                                      "border",
                                      suggestion.isAssigned && "border-green-200 bg-green-50"
                                    )}>
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Tag className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-medium">{suggestion.categoryName}</span>
                                              <Badge variant={getConfidenceBadgeVariant(suggestion.confidence)}>
                                                {Math.round(suggestion.confidence * 100)}% confidence
                                              </Badge>
                                              {suggestion.isAssigned && (
                                                <Badge variant="outline" className="border-green-600 text-green-600">
                                                  <CheckCircle className="h-3 w-3 mr-1" />
                                                  Applied
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                              Path: {suggestion.categoryPath}
                                            </p>
                                            <div className="bg-muted/50 rounded-md p-3">
                                              <p className="text-sm flex items-start gap-2">
                                                <Sparkles className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                <span className="italic">{suggestion.rationale}</span>
                                              </p>
                                            </div>
                                          </div>
                                          {!suggestion.isAssigned && onApplyCategory && (
                                            <Button
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onApplyCategory(
                                                  result.productId,
                                                  suggestion.categoryId,
                                                  suggestion.confidence,
                                                  suggestion.rationale
                                                );
                                              }}
                                            >
                                              Apply
                                            </Button>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* New category suggestions */}
                            {result.newCategorySuggestions && result.newCategorySuggestions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  Suggested New Categories
                                </h4>
                                <div className="space-y-2">
                                  {result.newCategorySuggestions.map((suggestion, idx) => (
                                    <Card key={idx} className="border-dashed">
                                      <CardContent className="p-4">
                                        <div className="space-y-1">
                                          <p className="font-medium">{suggestion.name}</p>
                                          <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Error details */}
                            {result.status === "error" && result.error && (
                              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                                <h4 className="text-sm font-medium text-red-900 mb-1 flex items-center gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Error Details
                                </h4>
                                <p className="text-sm text-red-800">{result.error}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}