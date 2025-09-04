import { create } from 'zustand';
import { 
  ImportWizardState, 
  ImportWizardStep, 
  ImportSession, 
  ImportPreview, 
  FieldMapping, 
  ValidationResult, 
  ImportReport 
} from '@/types/import';

interface ImportStore extends ImportWizardState {
  // Actions
  setCurrentStep: (step: ImportWizardStep) => void;
  setSession: (session: ImportSession) => void;
  setPreview: (preview: ImportPreview) => void;
  setMapping: (mapping: FieldMapping[]) => void;
  setValidations: (validations: ValidationResult[]) => void;
  setReport: (report: ImportReport) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWizard: () => void;
  canProceedToNextStep: () => boolean;
}

const initialState: ImportWizardState = {
  currentStep: ImportWizardStep.UPLOAD,
  sessionId: undefined,
  session: undefined,
  preview: undefined,
  mapping: undefined,
  validations: undefined,
  report: undefined,
  isLoading: false,
  error: undefined
};

export const useImportStore = create<ImportStore>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),
  
  setSession: (session) => set({ 
    session, 
    sessionId: session.id,
    error: undefined 
  }),
  
  setPreview: (preview) => set({ 
    preview,
    error: undefined 
  }),
  
  setMapping: (mapping) => set({ 
    mapping,
    error: undefined 
  }),
  
  setValidations: (validations) => set({ 
    validations,
    error: undefined 
  }),
  
  setReport: (report) => set({ 
    report,
    error: undefined 
  }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),

  nextStep: () => {
    const { currentStep, canProceedToNextStep } = get();
    if (canProceedToNextStep() && currentStep < ImportWizardStep.COMPLETE) {
      set({ currentStep: currentStep + 1 });
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > ImportWizardStep.UPLOAD) {
      set({ currentStep: currentStep - 1 });
    }
  },

  canProceedToNextStep: () => {
    const { currentStep, session, preview, mapping, validations } = get();
    
    switch (currentStep) {
      case ImportWizardStep.UPLOAD:
        return !!session;
      case ImportWizardStep.PREVIEW:
        return !!preview;
      case ImportWizardStep.MAPPING:
        return !!mapping && mapping.length > 0;
      case ImportWizardStep.VALIDATION:
        return !!validations;
      case ImportWizardStep.IMPORT:
        return validations ? validations.filter(v => v.severity === 'ERROR').length === 0 : false;
      default:
        return false;
    }
  },

  resetWizard: () => set(initialState)
}));