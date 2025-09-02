-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER', 'LENDER', 'BORROWER', 'GUARANTOR', 'AUDITOR');

-- CreateEnum
CREATE TYPE "public"."LoanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."LoanType" AS ENUM ('STANDARD', 'EMERGENCY', 'EDUCATION', 'WEDDING', 'MEDICAL', 'PROFESSIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'DIRECT_DEBIT', 'CASH', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."GuaranteeType" AS ENUM ('SIMPLE', 'JOINT', 'COLLECTIVE', 'DEPOSIT', 'ASSET_BACKED');

-- CreateEnum
CREATE TYPE "public"."GuaranteeStatus" AS ENUM ('PENDING', 'ACTIVE', 'INVOKED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "public"."ApprovalVoteType" AS ENUM ('APPROVE', 'REJECT', 'ABSTAIN', 'REQUEST_INFO');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'BORROWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "nationalId" TEXT,
    "occupation" TEXT,
    "monthlyIncome" MONEY,
    "maritalStatus" TEXT,
    "numberOfChildren" INTEGER,
    "communityMemberSince" TIMESTAMP(3),
    "synagogue" TEXT,
    "referredBy" TEXT,
    "creditScore" INTEGER,
    "maxLoanAmount" MONEY,
    "reliabilityScore" DOUBLE PRECISION DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Loan" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "type" "public"."LoanType" NOT NULL,
    "status" "public"."LoanStatus" NOT NULL DEFAULT 'DRAFT',
    "purpose" TEXT NOT NULL,
    "purposeDetails" JSONB,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStartDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "rejectionDate" TIMESTAMP(3),
    "disbursementDate" TIMESTAMP(3),
    "expectedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "numberOfInstallments" INTEGER NOT NULL,
    "installmentAmount" MONEY,
    "totalRepaid" MONEY NOT NULL DEFAULT 0,
    "outstandingAmount" MONEY NOT NULL DEFAULT 0,
    "committeeNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Guarantee" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "guarantorId" TEXT NOT NULL,
    "type" "public"."GuaranteeType" NOT NULL,
    "status" "public"."GuaranteeStatus" NOT NULL DEFAULT 'PENDING',
    "amount" MONEY NOT NULL,
    "percentage" DOUBLE PRECISION,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedDate" TIMESTAMP(3),
    "activatedDate" TIMESTAMP(3),
    "releasedDate" TIMESTAMP(3),
    "signatureHash" TEXT,
    "signatureIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guarantee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "loanId" TEXT,
    "contributionId" TEXT,
    "amount" MONEY NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "public"."PaymentMethod" NOT NULL,
    "transactionRef" TEXT,
    "processorRef" TEXT,
    "processorResponse" JSONB,
    "scheduledDate" TIMESTAMP(3),
    "processedDate" TIMESTAMP(3),
    "failedDate" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RepaymentSchedule" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" MONEY NOT NULL,
    "principalAmount" MONEY NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "paidAmount" MONEY,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "daysLate" INTEGER NOT NULL DEFAULT 0,
    "lateFeesApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contribution" (
    "id" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "type" TEXT NOT NULL,
    "campaignId" TEXT,
    "taxReceiptIssued" BOOLEAN NOT NULL DEFAULT false,
    "taxReceiptNumber" TEXT,
    "taxReceiptDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetAmount" MONEY NOT NULL,
    "raisedAmount" MONEY NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "profileId" TEXT,
    "loanId" TEXT,
    "guaranteeId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionKey" TEXT,
    "checksum" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "loanId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalVote" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "vote" "public"."ApprovalVoteType" NOT NULL,
    "comment" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "loanId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanNumber_key" ON "public"."Loan"("loanNumber");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_idx" ON "public"."Loan"("borrowerId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "public"."Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_type_idx" ON "public"."Loan"("type");

-- CreateIndex
CREATE INDEX "Loan_loanNumber_idx" ON "public"."Loan"("loanNumber");

-- CreateIndex
CREATE INDEX "Guarantee_loanId_idx" ON "public"."Guarantee"("loanId");

-- CreateIndex
CREATE INDEX "Guarantee_guarantorId_idx" ON "public"."Guarantee"("guarantorId");

-- CreateIndex
CREATE INDEX "Guarantee_status_idx" ON "public"."Guarantee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Guarantee_loanId_guarantorId_key" ON "public"."Guarantee"("loanId", "guarantorId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentNumber_key" ON "public"."Payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "Payment_loanId_idx" ON "public"."Payment"("loanId");

-- CreateIndex
CREATE INDEX "Payment_contributionId_idx" ON "public"."Payment"("contributionId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paymentNumber_idx" ON "public"."Payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "RepaymentSchedule_loanId_idx" ON "public"."RepaymentSchedule"("loanId");

-- CreateIndex
CREATE INDEX "RepaymentSchedule_dueDate_idx" ON "public"."RepaymentSchedule"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "RepaymentSchedule_loanId_installmentNumber_key" ON "public"."RepaymentSchedule"("loanId", "installmentNumber");

-- CreateIndex
CREATE INDEX "Contribution_contributorId_idx" ON "public"."Contribution"("contributorId");

-- CreateIndex
CREATE INDEX "Contribution_campaignId_idx" ON "public"."Contribution"("campaignId");

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "public"."Campaign"("isActive");

-- CreateIndex
CREATE INDEX "Document_uploaderId_idx" ON "public"."Document"("uploaderId");

-- CreateIndex
CREATE INDEX "Document_profileId_idx" ON "public"."Document"("profileId");

-- CreateIndex
CREATE INDEX "Document_loanId_idx" ON "public"."Document"("loanId");

-- CreateIndex
CREATE INDEX "Document_guaranteeId_idx" ON "public"."Document"("guaranteeId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "public"."Document"("type");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "public"."Document"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "public"."Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ApprovalVote_loanId_idx" ON "public"."ApprovalVote"("loanId");

-- CreateIndex
CREATE INDEX "ApprovalVote_voterId_idx" ON "public"."ApprovalVote"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalVote_loanId_voterId_key" ON "public"."ApprovalVote"("loanId", "voterId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_sessionToken_idx" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "public"."SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "public"."SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guarantee" ADD CONSTRAINT "Guarantee_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guarantee" ADD CONSTRAINT "Guarantee_guarantorId_fkey" FOREIGN KEY ("guarantorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "public"."Contribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RepaymentSchedule" ADD CONSTRAINT "RepaymentSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contribution" ADD CONSTRAINT "Contribution_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contribution" ADD CONSTRAINT "Contribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_guaranteeId_fkey" FOREIGN KEY ("guaranteeId") REFERENCES "public"."Guarantee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalVote" ADD CONSTRAINT "ApprovalVote_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalVote" ADD CONSTRAINT "ApprovalVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
