-- CreateEnum
CREATE TYPE "public"."ForecastScenario" AS ENUM ('OPTIMISTIC', 'REALISTIC', 'PESSIMISTIC');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('LOW_CASH_FLOW', 'NEGATIVE_BALANCE', 'HIGH_DEMAND', 'LIQUIDITY_WARNING', 'PAYMENT_DELAY');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TreasuryFlowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "public"."TreasuryFlowCategory" AS ENUM ('LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'CONTRIBUTION', 'DEPOSIT_WITHDRAWAL', 'OPERATIONAL_EXPENSE', 'INTEREST_EARNED', 'FEE_INCOME', 'OTHER');

-- CreateTable
CREATE TABLE "public"."TreasuryForecast" (
    "id" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "scenario" "public"."ForecastScenario" NOT NULL DEFAULT 'REALISTIC',
    "currentBalance" MONEY NOT NULL,
    "projectedBalance" MONEY NOT NULL,
    "minBalance" MONEY NOT NULL,
    "maxBalance" MONEY NOT NULL,
    "totalInflows" MONEY NOT NULL DEFAULT 0,
    "totalOutflows" MONEY NOT NULL DEFAULT 0,
    "netCashFlow" MONEY NOT NULL DEFAULT 0,
    "liquidityRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volatilityIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationTime" INTEGER NOT NULL,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForecastAlert" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "type" "public"."AlertType" NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectedDate" TIMESTAMP(3),
    "amount" MONEY,
    "threshold" MONEY,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "recommendations" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreasuryFlow" (
    "id" TEXT NOT NULL,
    "type" "public"."TreasuryFlowType" NOT NULL,
    "category" "public"."TreasuryFlowCategory" NOT NULL,
    "amount" MONEY NOT NULL,
    "description" TEXT NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "isActual" BOOLEAN NOT NULL DEFAULT false,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "loanId" TEXT,
    "paymentId" TEXT,
    "contributionId" TEXT,
    "forecastId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "sourceRef" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryFlow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreasuryForecast_forecastDate_idx" ON "public"."TreasuryForecast"("forecastDate");

-- CreateIndex
CREATE INDEX "TreasuryForecast_periodDays_idx" ON "public"."TreasuryForecast"("periodDays");

-- CreateIndex
CREATE INDEX "TreasuryForecast_scenario_idx" ON "public"."TreasuryForecast"("scenario");

-- CreateIndex
CREATE INDEX "ForecastAlert_forecastId_idx" ON "public"."ForecastAlert"("forecastId");

-- CreateIndex
CREATE INDEX "ForecastAlert_type_idx" ON "public"."ForecastAlert"("type");

-- CreateIndex
CREATE INDEX "ForecastAlert_severity_idx" ON "public"."ForecastAlert"("severity");

-- CreateIndex
CREATE INDEX "ForecastAlert_isActive_idx" ON "public"."ForecastAlert"("isActive");

-- CreateIndex
CREATE INDEX "ForecastAlert_triggeredAt_idx" ON "public"."ForecastAlert"("triggeredAt");

-- CreateIndex
CREATE INDEX "TreasuryFlow_type_idx" ON "public"."TreasuryFlow"("type");

-- CreateIndex
CREATE INDEX "TreasuryFlow_category_idx" ON "public"."TreasuryFlow"("category");

-- CreateIndex
CREATE INDEX "TreasuryFlow_expectedDate_idx" ON "public"."TreasuryFlow"("expectedDate");

-- CreateIndex
CREATE INDEX "TreasuryFlow_isActual_idx" ON "public"."TreasuryFlow"("isActual");

-- CreateIndex
CREATE INDEX "TreasuryFlow_loanId_idx" ON "public"."TreasuryFlow"("loanId");

-- CreateIndex
CREATE INDEX "TreasuryFlow_paymentId_idx" ON "public"."TreasuryFlow"("paymentId");

-- CreateIndex
CREATE INDEX "TreasuryFlow_contributionId_idx" ON "public"."TreasuryFlow"("contributionId");

-- CreateIndex
CREATE INDEX "TreasuryFlow_forecastId_idx" ON "public"."TreasuryFlow"("forecastId");

-- AddForeignKey
ALTER TABLE "public"."ForecastAlert" ADD CONSTRAINT "ForecastAlert_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "public"."TreasuryForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreasuryFlow" ADD CONSTRAINT "TreasuryFlow_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreasuryFlow" ADD CONSTRAINT "TreasuryFlow_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreasuryFlow" ADD CONSTRAINT "TreasuryFlow_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "public"."Contribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreasuryFlow" ADD CONSTRAINT "TreasuryFlow_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "public"."TreasuryForecast"("id") ON DELETE SET NULL ON UPDATE CASCADE;
