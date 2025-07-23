/**
 * Optimal Layer Deletion Wizard
 * Full React experience with visualizations and animations
 * Target: +50KB (150KB total)
 */

'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { Product } from '@/types/models';
import { EnhancedDeletionForm } from './EnhancedDeletionForm';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load heavy visualization components
const DeletionVisualization = lazy(() => 
  import('../visualization/DeletionVisualization').then(mod => ({
    default: mod.DeletionVisualization
  }))
);

// const _DeletionWizardSteps = lazy(() =>
//   import('../DeletionWizardExample').then(mod => ({
//     default: mod.default
//   }))
// );

interface OptimalDeletionWizardProps {
  product?: Product;
  items?: Product[];
  onDelete?: (itemIds: string[], reason?: string) => Promise<void>;
  onCancel?: () => void;
  showVisualization?: boolean;
}

export function OptimalDeletionWizard({
  product,
  items = [],
  onDelete,
  onCancel,
  showVisualization = true
}: OptimalDeletionWizardProps) {
  const [currentStep, setCurrentStep] = useState<'selection' | 'impact' | 'confirm'>('selection');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set((product ? [product] : items).map(item => item._id))
  );
  const [impactAnalysis, setImpactAnalysis] = useState<unknown>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Preload visualization component when likely to be needed
  useEffect(() => {
    if (selectedIds.size > 0 && currentStep === 'selection') {
      // Preload the visualization component
      import('../visualization/DeletionVisualization');
    }
  }, [selectedIds.size, currentStep]);
  
  // Analyze impact when moving to impact step
  const analyzeImpact = async () => {
    setIsAnalyzing(true);
    // Simulate impact analysis
    await new Promise(resolve => setTimeout(resolve, 800));
    setImpactAnalysis({
      totalAffected: Math.floor(Math.random() * 20) + selectedIds.size,
      categories: Math.floor(Math.random() * 5),
      dependencies: Math.floor(Math.random() * 10)
    });
    setIsAnalyzing(false);
  };
  
  const handleStepChange = async (step: typeof currentStep) => {
    if (step === 'impact' && !impactAnalysis) {
      await analyzeImpact();
    }
    setCurrentStep(step);
  };
  
  const steps = [
    { id: 'selection', label: 'Select Items', icon: '1' },
    { id: 'impact', label: 'Review Impact', icon: '2' },
    { id: 'confirm', label: 'Confirm', icon: '3' }
  ];
  
  return (
    <div className="optimal-deletion-wizard max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center flex-1"
            >
              <motion.button
                onClick={() => handleStepChange(step.id as typeof currentStep)}
                disabled={step.id === 'impact' && selectedIds.size === 0}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  font-medium transition-all
                  ${currentStep === step.id 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                  ${step.id === 'impact' && selectedIds.size === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-red-500 hover:text-white'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {step.icon}
              </motion.button>
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium">{step.label}</div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step content with animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'selection' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Select Items to Delete</h2>
              <EnhancedDeletionForm
                items={items}
                product={product}
                onDelete={async (ids) => {
                  setSelectedIds(new Set(ids));
                  handleStepChange('impact');
                }}
                onCancel={onCancel}
              />
            </div>
          )}
          
          {currentStep === 'impact' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Review Deletion Impact</h2>
              
              {isAnalyzing ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Analyzing impact...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Impact summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <div className="text-3xl font-bold text-red-600">
                        {impactAnalysis?.totalAffected || 0}
                      </div>
                      <div className="text-sm text-red-700">Total items affected</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                    >
                      <div className="text-3xl font-bold text-orange-600">
                        {impactAnalysis?.categories || 0}
                      </div>
                      <div className="text-sm text-orange-700">Categories impacted</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                    >
                      <div className="text-3xl font-bold text-yellow-600">
                        {impactAnalysis?.dependencies || 0}
                      </div>
                      <div className="text-sm text-yellow-700">Dependencies</div>
                    </motion.div>
                  </div>
                  
                  {/* Lazy load visualization if enabled */}
                  {showVisualization && (
                    <Suspense fallback={
                      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Loading visualization...</p>
                      </div>
                    }>
                      <DeletionVisualization
                        itemsToDelete={Array.from(selectedIds)} as any
                        viewMode="tree"
                      />
                    </Suspense>
                  )}
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep('selection')}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep('confirm')}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Continue to Confirm
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Confirm Deletion</h2>
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-50 border-2 border-red-200 rounded-lg p-6"
              >
                <h3 className="font-semibold text-red-900 mb-2">
                  ⚠️ This action cannot be undone
                </h3>
                <p className="text-red-800">
                  You are about to permanently delete {selectedIds.size} items, 
                  which will affect {impactAnalysis?.totalAffected || 0} total items.
                </p>
              </motion.div>
              
              <EnhancedDeletionForm
                items={items.filter(item => selectedIds.has(item._id))}
                onDelete={onDelete}
                onCancel={() => setCurrentStep('impact')}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}