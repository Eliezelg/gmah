import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { Response } from 'express';

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
}

export interface ReportOptions {
  format: ReportFormat;
  startDate?: Date;
  endDate?: Date;
  includeDetails?: boolean;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateLoansReport(options: ReportOptions, res: Response) {
    const where: Prisma.LoanWhereInput = {};
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        borrower: true,
        guarantees: {
          include: {
            guarantor: true,
          },
        },
        payments: true,
        repaymentSchedule: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    switch (options.format) {
      case ReportFormat.EXCEL:
        return this.generateExcelReport(loans, res);
      case ReportFormat.PDF:
        return this.generatePDFReport(loans, res);
      case ReportFormat.CSV:
        return this.generateCSVReport(loans, res);
      case ReportFormat.JSON:
        return res.json(loans);
      default:
        throw new Error('Invalid report format');
    }
  }

  async generatePaymentsReport(options: ReportOptions, res: Response) {
    const where: Prisma.PaymentWhereInput = {};
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        loan: {
          include: {
            borrower: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedPayments = payments.map(payment => ({
      paymentNumber: payment.paymentNumber,
      loanNumber: payment.loan?.loanNumber || 'N/A',
      borrowerName: payment.loan ? `${payment.loan.borrower.firstName} ${payment.loan.borrower.lastName}` : 'N/A',
      amount: Number(payment.amount),
      method: payment.method,
      status: payment.status,
      date: payment.processedDate || payment.createdAt,
      transactionRef: payment.transactionRef,
    }));

    switch (options.format) {
      case ReportFormat.EXCEL:
        return this.generatePaymentsExcel(formattedPayments, res);
      case ReportFormat.CSV:
        return this.generatePaymentsCSV(formattedPayments, res);
      case ReportFormat.JSON:
        return res.json(formattedPayments);
      default:
        throw new Error('Invalid report format');
    }
  }

  async generateDefaultersReport(res: Response) {
    const defaultedLoans = await this.prisma.loan.findMany({
      where: {
        OR: [
          { status: 'DEFAULTED' },
          {
            repaymentSchedule: {
              some: {
                dueDate: {
                  lt: new Date(),
                },
                isPaid: false,
              },
            },
          },
        ],
      },
      include: {
        borrower: true,
        repaymentSchedule: {
          where: {
            dueDate: {
              lt: new Date(),
            },
            isPaid: false,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Defaulters');

    worksheet.columns = [
      { header: 'Loan Number', key: 'loanNumber', width: 20 },
      { header: 'Borrower Name', key: 'borrowerName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Loan Amount', key: 'loanAmount', width: 15 },
      { header: 'Outstanding', key: 'outstanding', width: 15 },
      { header: 'Overdue Days', key: 'overdueDays', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    defaultedLoans.forEach(loan => {
      const repaymentSchedule = (loan as any).repaymentSchedule || [];
      const oldestOverdue = repaymentSchedule.reduce((oldest: any, current: any) => {
        return !oldest || current.dueDate < oldest.dueDate ? current : oldest;
      }, repaymentSchedule[0]);

      const overdueDays = oldestOverdue 
        ? Math.floor((Date.now() - oldestOverdue.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const borrower = (loan as any).borrower;
      worksheet.addRow({
        loanNumber: loan.loanNumber,
        borrowerName: borrower ? `${borrower.firstName} ${borrower.lastName}` : 'N/A',
        email: borrower?.email || 'N/A',
        phone: borrower?.phoneNumber || 'N/A',
        loanAmount: Number(loan.amount),
        outstanding: Number(loan.outstandingAmount),
        overdueDays,
        status: loan.status,
      });
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE74C3C' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="defaulters-${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
  }

  async generateFinancialSummary(year: number, month?: number, res?: Response) {
    const startDate = month 
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const [
      totalDisbursed,
      totalCollected,
      totalOutstanding,
      newLoans,
      completedLoans,
      defaultedLoans,
    ] = await Promise.all([
      this.prisma.loan.aggregate({
        where: {
          disbursementDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          processedDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      this.prisma.loan.aggregate({
        where: {
          status: { in: ['ACTIVE', 'DISBURSED'] },
        },
        _sum: { outstandingAmount: true },
      }),
      this.prisma.loan.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'DEFAULTED',
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    const summary = {
      period: month ? `${year}-${String(month).padStart(2, '0')}` : year.toString(),
      totalDisbursed: Number(totalDisbursed._sum.amount || 0),
      totalCollected: Number(totalCollected._sum.amount || 0),
      totalOutstanding: Number(totalOutstanding._sum.outstandingAmount || 0),
      newLoans,
      completedLoans,
      defaultedLoans,
      collectionRate: totalDisbursed._sum.amount 
        ? ((Number(totalCollected._sum.amount || 0) / Number(totalDisbursed._sum.amount)) * 100).toFixed(2)
        : '0',
    };

    if (res) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Financial Summary');

      // Add title
      worksheet.mergeCells('A1:B1');
      worksheet.getCell('A1').value = `Financial Summary - ${summary.period}`;
      worksheet.getCell('A1').font = { bold: true, size: 16 };

      // Add data
      const data = [
        ['Metric', 'Value'],
        ['Total Disbursed', `€${summary.totalDisbursed.toLocaleString()}`],
        ['Total Collected', `€${summary.totalCollected.toLocaleString()}`],
        ['Outstanding Amount', `€${summary.totalOutstanding.toLocaleString()}`],
        ['Collection Rate', `${summary.collectionRate}%`],
        ['New Loans', summary.newLoans],
        ['Completed Loans', summary.completedLoans],
        ['Defaulted Loans', summary.defaultedLoans],
      ];

      data.forEach((row, index) => {
        worksheet.addRow(row);
        if (index === 0 && worksheet.lastRow) {
          worksheet.getRow(worksheet.lastRow.number).font = { bold: true };
        }
      });

      // Style columns
      worksheet.columns = [
        { width: 25 },
        { width: 20 },
      ];

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="financial-summary-${summary.period}.xlsx"`
      );

      await workbook.xlsx.write(res);
    }

    return summary;
  }

  private async generateExcelReport(loans: any[], res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Loans Report');

    worksheet.columns = [
      { header: 'Loan Number', key: 'loanNumber', width: 20 },
      { header: 'Borrower', key: 'borrower', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Purpose', key: 'purpose', width: 25 },
      { header: 'Created Date', key: 'createdDate', width: 15 },
      { header: 'Disbursed Date', key: 'disbursedDate', width: 15 },
      { header: 'Outstanding', key: 'outstanding', width: 15 },
    ];

    loans.forEach(loan => {
      worksheet.addRow({
        loanNumber: loan.loanNumber,
        borrower: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
        amount: Number(loan.amount),
        status: loan.status,
        type: loan.type,
        purpose: loan.purpose,
        createdDate: loan.createdAt,
        disbursedDate: loan.disbursementDate,
        outstanding: Number(loan.outstandingAmount),
      });
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667EEA' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="loans-report-${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
  }

  private generatePDFReport(loans: any[], res: Response) {
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="loans-report-${Date.now()}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Loans Report', { align: 'center' });
    doc.moveDown();

    // Date
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Table header
    doc.fontSize(12).font('Helvetica-Bold');
    const startX = 50;
    let y = doc.y;

    doc.text('Loan Number', startX, y, { width: 100 });
    doc.text('Borrower', startX + 110, y, { width: 150 });
    doc.text('Amount', startX + 270, y, { width: 80 });
    doc.text('Status', startX + 360, y, { width: 80 });
    doc.text('Outstanding', startX + 450, y, { width: 80 });

    doc.moveDown();
    y = doc.y;

    // Data rows
    doc.font('Helvetica').fontSize(10);
    loans.forEach(loan => {
      doc.text(loan.loanNumber, startX, y, { width: 100 });
      doc.text(`${loan.borrower.firstName} ${loan.borrower.lastName}`, startX + 110, y, { width: 150 });
      doc.text(`€${Number(loan.amount).toLocaleString()}`, startX + 270, y, { width: 80 });
      doc.text(loan.status, startX + 360, y, { width: 80 });
      doc.text(`€${Number(loan.outstandingAmount).toLocaleString()}`, startX + 450, y, { width: 80 });
      
      y += 20;
      
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  }

  private generateCSVReport(loans: any[], res: Response) {
    const data = loans.map(loan => ({
      'Loan Number': loan.loanNumber,
      'Borrower': `${loan.borrower.firstName} ${loan.borrower.lastName}`,
      'Amount': Number(loan.amount),
      'Status': loan.status,
      'Type': loan.type,
      'Purpose': loan.purpose,
      'Created Date': loan.createdAt.toISOString(),
      'Disbursed Date': loan.disbursementDate?.toISOString() || '',
      'Outstanding': Number(loan.outstandingAmount),
    }));

    const csv = stringify(data, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="loans-report-${Date.now()}.csv"`
    );

    res.send(csv);
  }

  private generatePaymentsExcel(payments: any[], res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments Report');

    worksheet.columns = [
      { header: 'Payment Number', key: 'paymentNumber', width: 20 },
      { header: 'Loan Number', key: 'loanNumber', width: 20 },
      { header: 'Borrower', key: 'borrowerName', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Method', key: 'method', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Transaction Ref', key: 'transactionRef', width: 25 },
    ];

    payments.forEach(payment => {
      worksheet.addRow(payment);
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF28A745' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments-report-${Date.now()}.xlsx"`
    );

    workbook.xlsx.write(res);
  }

  private generatePaymentsCSV(payments: any[], res: Response) {
    const csv = stringify(payments, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments-report-${Date.now()}.csv"`
    );

    res.send(csv);
  }
}