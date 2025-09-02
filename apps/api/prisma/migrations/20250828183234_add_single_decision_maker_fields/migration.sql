-- AlterTable
ALTER TABLE "public"."Loan" ADD COLUMN     "approvalComments" TEXT,
ADD COLUMN     "approvalConditions" TEXT,
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionComments" TEXT;
