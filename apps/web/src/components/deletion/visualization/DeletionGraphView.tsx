'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { 
  Package, 
  AlertTriangle,
  Layers,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DeletionImpactItem, VisualizationProps } from './types';
import { useAnnouncement } from '@/contexts/accessibility';

interface GraphNode {
  id: string;
  data: DeletionImpactItem;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'parent' | 'reference';
}

const impactColors = {
  direct: '#3b82f6', // blue
  cascade: '#f97316', // orange
  reference: '#eab308' // yellow
};

const severityRadii = {
  low: 20,
  medium: 25,
  high: 30,
  critical: 35
};

export function DeletionGraphView({
  items,
  selectedItems = new Set(),
  onItemToggle,
  onSelectAll,
  onDeselectAll,
  loading,
  error,
  className
}: VisualizationProps) {
  const { announce } = useAnnouncement();
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Build graph data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Flatten items and create nodes
    const processItems = (items: DeletionImpactItem[], depth = 0) => {
      items.forEach((item, index) => {
        const angle = (index / items.length) * 2 * Math.PI;
        const radius = 100 + depth * 150;
        
        const node: GraphNode = {
          id: item.id,
          data: item,
          x: dimensions.width / 2 + Math.cos(angle) * radius,
          y: dimensions.height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        };
        
        nodes.push(node);
        nodeMap.set(item.id, node);

        // Create parent-child links
        if (item.parentId && nodeMap.has(item.parentId)) {
          links.push({
            source: item.parentId,
            target: item.id,
            type: 'parent'
          });
        }

        // Process children
        if (item.children) {
          processItems(item.children, depth + 1);
        }
      });
    };

    processItems(items);

    return { nodes, links };
  }, [items, dimensions]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out' | 'fit') => {
    if (direction === 'fit') {
      setTransform({ x: 0, y: 0, scale: 1 });
      announce('Reset zoom to fit', 'polite');
    } else {
      setTransform(prev => {
        const newScale = direction === 'in' 
          ? Math.min(prev.scale * 1.2, 3) 
          : Math.max(prev.scale / 1.2, 0.3);
        announce(`Zoomed ${direction} to ${Math.round(newScale * 100)}%`, 'polite');
        return { ...prev, scale: newScale };
      });
    }
  }, [announce]);

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.currentTarget === e.target || e.currentTarget.contains(e.target as Node)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Node interaction
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.data.canExclude !== false && onItemToggle) {
      onItemToggle(node.id);
      const action = selectedItems.has(node.id) ? 'Deselected' : 'Selected';
      announce(`${action} ${node.data.name}`, 'polite');
    }
  }, [selectedItems, onItemToggle, announce]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading impact analysis...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedCount = selectedItems.size;
  const totalSelectableItems = graphData.nodes.filter(
    node => node.data.canExclude !== false
  ).length;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {selectedCount} of {totalSelectableItems} items selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={selectedCount === totalSelectableItems}
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={selectedCount === 0}
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleZoom('out')}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(transform.scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleZoom('in')}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleZoom('fit')}
            title="Fit to view"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Graph view */}
      <div className="flex-1 overflow-hidden relative">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#666"
              />
            </marker>
          </defs>

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {/* Links */}
            <g className="links">
              {graphData.links.map((link, index) => {
                const sourceNode = graphData.nodes.find(n => n.id === link.source);
                const targetNode = graphData.nodes.find(n => n.id === link.target);
                
                if (!sourceNode || !targetNode) return null;

                return (
                  <line
                    key={index}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={link.type === 'parent' ? '#666' : '#999'}
                    strokeWidth={link.type === 'parent' ? 2 : 1}
                    strokeDasharray={link.type === 'reference' ? '5,5' : undefined}
                    markerEnd="url(#arrowhead)"
                    opacity={0.6}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {graphData.nodes.map(node => {
                const isSelected = selectedItems.has(node.id);
                const isHovered = hoveredNode === node.id;
                const radius = severityRadii[node.data.severity];
                const Icon = impactIcons[node.data.impact] === impactColors.direct ? Package 
                  : impactIcons[node.data.impact] === impactColors.cascade ? Layers 
                  : AlertCircle;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleNodeClick(node)}
                    className="cursor-pointer"
                  >
                    {/* Node circle */}
                    <circle
                      r={radius}
                      fill={impactColors[node.data.impact]}
                      stroke={isSelected ? '#1d4ed8' : '#fff'}
                      strokeWidth={isSelected ? 4 : 2}
                      opacity={isHovered ? 1 : 0.8}
                    />

                    {/* Selection indicator */}
                    {node.data.canExclude !== false && (
                      <circle
                        r={radius + 5}
                        fill="none"
                        stroke="#1d4ed8"
                        strokeWidth={2}
                        strokeDasharray="3,3"
                        opacity={isSelected ? 1 : 0}
                      />
                    )}

                    {/* Icon */}
                    <foreignObject
                      x={-10}
                      y={-10}
                      width={20}
                      height={20}
                      className="pointer-events-none"
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </foreignObject>

                    {/* Severity indicator */}
                    {node.data.severity === 'critical' && (
                      <circle
                        cx={radius * 0.7}
                        cy={-radius * 0.7}
                        r={8}
                        fill="#dc2626"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}

                    {/* Label */}
                    <text
                      y={radius + 15}
                      textAnchor="middle"
                      className="fill-current text-xs font-medium select-none"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.data.name.length > 20 
                        ? node.data.name.substring(0, 20) + '...' 
                        : node.data.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Hover tooltip */}
        {hoveredNode && (
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-xs pointer-events-none">
            {(() => {
              const node = graphData.nodes.find(n => n.id === hoveredNode);
              if (!node) return null;

              return (
                <>
                  <h4 className="font-semibold mb-2">{node.data.name}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="text-xs">
                        {node.data.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impact:</span>
                      <Badge variant="secondary" className="text-xs">
                        {node.data.impact}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severity:</span>
                      <span className={cn('font-medium', {
                        'text-blue-600': node.data.severity === 'low',
                        'text-yellow-600': node.data.severity === 'medium',
                        'text-orange-600': node.data.severity === 'high',
                        'text-red-600': node.data.severity === 'critical'
                      })}>
                        {node.data.severity}
                      </span>
                    </div>
                    {node.data.metadata?.count && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contains:</span>
                        <span>{node.data.metadata.count} items</span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Pan indicator */}
        {isDragging && (
          <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded text-sm pointer-events-none">
            <Move className="inline h-3 w-3 mr-1" />
            Panning
          </div>
        )}
      </div>
    </div>
  );
}

const impactIcons = {
  direct: Package,
  cascade: Layers,
  reference: AlertCircle
};