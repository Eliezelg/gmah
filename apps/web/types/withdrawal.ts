export enum WithdrawalStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum ApprovalMode {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  COMMITTEE = 'COMMITTEE',
}

export enum UrgencyLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ReasonCategory {
  EMERGENCY = 'EMERGENCY',
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  STANDING_ORDER = 'STANDING_ORDER',
}

export interface Deposit {
  id: string;
  depositNumber: string;
  amount: number;
  currentBalance: number;
  currency: string;
  type: string;
  depositDate: string;
  maturityDate?: string;
  isActive: boolean;
  description?: string;
}

export interface WithdrawalRequest {
  id: string;
  requestNumber: string;
  depositId: string;
  depositorId: string;
  amount: number;
  reason: string;
  reasonCategory?: ReasonCategory;
  urgency: UrgencyLevel;
  requestDate: string;
  plannedDate?: string;
  approvalDate?: string;
  rejectionDate?: string;
  processingDate?: string;
  completedDate?: string;
  status: WithdrawalStatus;
  approvalMode: ApprovalMode;
  approvedBy?: string;
  approvalComments?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  paymentMethod?: PaymentMethod;
  bankDetails?: BankDetails;
  transactionRef?: string;
  treasuryImpact?: any;
  requiresApproval: boolean;
  autoApproved: boolean;
  metadata?: any;
  
  // Relations
  deposit?: Deposit;
  depositor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  rejecter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents?: any[];
  treasuryFlows?: any[];
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  accountHolderName: string;
  iban?: string;
  swift?: string;
}

export interface CreateWithdrawalRequest {
  depositId: string;
  amount: number;
  reason: string;
  reasonCategory?: ReasonCategory;
  urgency?: UrgencyLevel;
  plannedDate?: string;
  paymentMethod?: PaymentMethod;
  bankDetails?: BankDetails;
  metadata?: any;
}

export interface UpdateWithdrawalRequest {
  amount?: number;
  reason?: string;
  reasonCategory?: ReasonCategory;
  urgency?: UrgencyLevel;
  plannedDate?: string;
  paymentMethod?: PaymentMethod;
  bankDetails?: BankDetails;
  metadata?: any;
}

export interface ApproveWithdrawalRequest {
  approvalComments?: string;
  paymentMethod?: PaymentMethod;
  bankDetails?: BankDetails;
}

export interface RejectWithdrawalRequest {
  rejectionReason: string;
}

export interface WithdrawalQuery {
  page?: number;
  limit?: number;
  status?: WithdrawalStatus;
  approvalMode?: ApprovalMode;
  depositorId?: string;
  depositId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WithdrawalListResponse {
  data: WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WithdrawalStats {
  totalRequests: number;
  pendingApproval: number;
  approved: number;
  completed: number;
  totalAmount: number;
  avgProcessingTime?: number;
}

export interface TreasuryImpact {
  [key: string]: number;
  total: number;
  byUrgency: {
    [key in UrgencyLevel]?: number;
  };
}