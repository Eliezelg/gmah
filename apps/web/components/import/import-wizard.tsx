'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useImportStore } from '@/lib/stores/import-store';
import { ImportWizardStep } from '@/types/import';
import { UploadStep } from './steps/upload-step';
import { PreviewStep } from './steps/preview-step';
import { MappingStep } from './steps/mapping-step';
import { ValidationStep } from './steps/validation-step';
import { ImportStep } from './steps/import-step';
import { CompleteStep } from './steps/complete-step';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImportWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

const STEP_NAMES = [
  'Upload',
  'Preview',
  'Mapping',
  'Validation',
  'Import',
  'Complete'
];

const STEP_DESCRIPTIONS = [
  'Upload your CSV or Excel file',
  'Preview and configure data',
  'Map columns to fields',
  'Validate your data',
  'Start the import process',
  'Review results'
];

export function ImportWizard({ onClose, onComplete }: ImportWizardProps) {
  const { 
    currentStep, 
    isLoading, 
    error, 
    canProceedToNextStep,
    nextStep,
    previousStep,
    resetWizard 
  } = useImportStore();

  const [isOpen, setIsOpen] = useState(true);

  const progress = ((currentStep + 1) / STEP_NAMES.length) * 100;

  const handleClose = () => {
    setIsOpen(false);
    resetWizard();
    onClose();
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case ImportWizardStep.UPLOAD:
        return <UploadStep />;
      case ImportWizardStep.PREVIEW:
        return <PreviewStep />;
      case ImportWizardStep.MAPPING:
        return <MappingStep />;
      case ImportWizardStep.VALIDATION:
        return <ValidationStep />;
      case ImportWizardStep.IMPORT:
        return <ImportStep />;
      case ImportWizardStep.COMPLETE:
        return <CompleteStep onComplete={onComplete} />;
      default:
        return <UploadStep />;
    }
  };

  const canGoNext = canProceedToNextStep() && currentStep < ImportWizardStep.COMPLETE;
  const canGoPrevious = currentStep > ImportWizardStep.UPLOAD && currentStep !== ImportWizardStep.IMPORT;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                Assistant d'import de données
              </DialogTitle>
              <DialogDescription className="mt-2">
                {STEP_DESCRIPTIONS[currentStep]}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Étape {currentStep + 1} sur {STEP_NAMES.length}</span>
              <Badge variant="outline">
                {STEP_NAMES[currentStep]}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-center space-x-4 py-2">
            {STEP_NAMES.map((stepName, index) => (
              <div key={index} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${index === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : index < currentStep 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                {index < STEP_NAMES.length - 1 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${index < currentStep ? 'bg-green-500' : 'bg-muted'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md border border-destructive/20">
            <p className="text-sm font-medium">Erreur:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="py-6">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < ImportWizardStep.COMPLETE && (
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoPrevious || isLoading}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
                className="flex items-center gap-2"
              >
                {currentStep === ImportWizardStep.VALIDATION ? 'Démarrer l\'import' : 'Suivant'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}