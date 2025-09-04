import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ImportFileType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import { ImportPreviewDto } from '../dto/import-response.dto';

export interface ParsedFileData {
  columns: string[];
  data: any[][];
  totalRows: number;
  encoding: string;
  hasHeaders: boolean;
}

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  async parseFile(
    filePath: string, 
    fileType: ImportFileType,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
      encoding?: string;
      sampleSize?: number;
    } = {}
  ): Promise<ParsedFileData> {
    this.logger.log(`Parsing file: ${filePath}, type: ${fileType}`);
    
    try {
      switch (fileType) {
        case ImportFileType.EXCEL:
          return await this.parseExcelFile(filePath, options);
        case ImportFileType.CSV:
          return await this.parseCsvFile(filePath, options);
        default:
          throw new BadRequestException(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse file: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }
  }

  async generatePreview(
    filePath: string,
    fileType: ImportFileType,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
      encoding?: string;
    } = {}
  ): Promise<ImportPreviewDto> {
    const parsedData = await this.parseFile(filePath, fileType, {
      ...options,
      sampleSize: 10
    });

    // Generate suggested mappings based on column names
    const suggestedMapping = this.generateColumnSuggestions(parsedData.columns);

    return {
      columns: parsedData.columns,
      sampleData: parsedData.data,
      totalRows: parsedData.totalRows,
      encoding: parsedData.encoding,
      hasHeaders: parsedData.hasHeaders,
      suggestedMapping
    };
  }

  private async parseExcelFile(
    filePath: string, 
    options: {
      hasHeaders?: boolean;
      sampleSize?: number;
    } = {}
  ): Promise<ParsedFileData> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1); // Get first worksheet
    if (!worksheet) {
      throw new BadRequestException('No worksheet found in Excel file');
    }

    const data: any[][] = [];
    let columns: string[] = [];
    let totalRows = worksheet.rowCount;
    const hasHeaders = options.hasHeaders !== false;

    // Process rows
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = [];
      
      // Convert row to array
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[colNumber - 1] = this.getCellValue(cell);
      });

      if (rowNumber === 1 && hasHeaders) {
        // First row as headers
        columns = rowData.map(cell => String(cell || `Column${rowData.indexOf(cell) + 1}`));
      } else {
        // Data row
        if (options.sampleSize && data.length >= options.sampleSize) {
          return; // Stop processing if we have enough sample data
        }
        data.push(rowData);
      }
    });

    // If no headers, generate column names
    if (!hasHeaders && data.length > 0) {
      columns = data[0].map((_, index) => `Column${index + 1}`);
    }

    // Adjust total rows if headers were used
    if (hasHeaders) {
      totalRows = Math.max(0, totalRows - 1);
    }

    return {
      columns,
      data,
      totalRows,
      encoding: 'utf8', // Excel files are already decoded
      hasHeaders
    };
  }

  private async parseCsvFile(
    filePath: string,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
      encoding?: string;
      sampleSize?: number;
    } = {}
  ): Promise<ParsedFileData> {
    const encoding = options.encoding || 'utf8';
    const delimiter = options.delimiter || ',';
    const hasHeaders = options.hasHeaders !== false;
    
    // Read file with proper encoding
    let fileContent: string;
    try {
      const buffer = fs.readFileSync(filePath);
      
      // Try to detect encoding if not specified
      if (encoding === 'auto') {
        const detectedEncoding = this.detectEncoding(buffer);
        fileContent = iconv.decode(buffer, detectedEncoding);
      } else {
        fileContent = iconv.decode(buffer, encoding);
      }
    } catch (error) {
      throw new BadRequestException(`Failed to read CSV file: ${error.message}`);
    }

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        delimiter,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            let data = results.data as any[][];
            let columns: string[] = [];
            let totalRows = data.length;

            if (hasHeaders && data.length > 0) {
              columns = data[0].map(cell => String(cell || `Column${data[0].indexOf(cell) + 1}`));
              data = data.slice(1);
              totalRows = Math.max(0, totalRows - 1);
            } else {
              // Generate column names
              if (data.length > 0) {
                columns = data[0].map((_, index) => `Column${index + 1}`);
              }
            }

            // Limit sample size if specified
            if (options.sampleSize) {
              data = data.slice(0, options.sampleSize);
            }

            resolve({
              columns,
              data,
              totalRows,
              encoding,
              hasHeaders
            });
          } catch (error) {
            reject(new BadRequestException(`Failed to process CSV data: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new BadRequestException(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  private getCellValue(cell: ExcelJS.Cell): any {
    if (cell.type === ExcelJS.ValueType.Date) {
      return cell.value;
    } else if (cell.type === ExcelJS.ValueType.Number) {
      return cell.value;
    } else if (cell.type === ExcelJS.ValueType.Boolean) {
      return cell.value;
    } else {
      return cell.text || cell.value || '';
    }
  }

  private detectEncoding(buffer: Buffer): string {
    // Simple encoding detection
    const utf8String = buffer.toString('utf8');
    const latin1String = buffer.toString('latin1');
    
    // Check for UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8';
    }
    
    // Check if valid UTF-8
    if (utf8String.length === buffer.length) {
      return 'utf8';
    }
    
    // Default to latin1 (ISO-8859-1)
    return 'latin1';
  }

  private generateColumnSuggestions(columns: string[]) {
    const suggestions: { columnName: string; suggestedField: string; confidence: number }[] = [];
    
    // Common mapping patterns
    const mappingPatterns = {
      email: ['email', 'e-mail', 'mail', 'adresse email', 'courriel'],
      firstName: ['first name', 'firstname', 'prenom', 'prénom', 'given name'],
      lastName: ['last name', 'lastname', 'nom', 'surname', 'family name'],
      phone: ['phone', 'telephone', 'tel', 'mobile', 'cellphone'],
      address: ['address', 'adresse', 'street', 'rue'],
      city: ['city', 'ville', 'town'],
      postalCode: ['postal code', 'zip code', 'zip', 'code postal'],
      amount: ['amount', 'montant', 'sum', 'total']
    };

    columns.forEach(column => {
      const columnLower = column.toLowerCase().trim();
      let bestMatch = { field: '', confidence: 0 };

      for (const [field, patterns] of Object.entries(mappingPatterns)) {
        for (const pattern of patterns) {
          if (columnLower.includes(pattern)) {
            const confidence = columnLower === pattern ? 100 : 80;
            if (confidence > bestMatch.confidence) {
              bestMatch = { field, confidence };
            }
          }
        }
      }

      suggestions.push({
        columnName: column,
        suggestedField: bestMatch.field || 'unmapped',
        confidence: bestMatch.confidence
      });
    });

    return suggestions;
  }

  async validateFileStructure(filePath: string, fileType: ImportFileType): Promise<boolean> {
    try {
      if (fileType === ImportFileType.EXCEL) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        return workbook.worksheets.length > 0;
      } else if (fileType === ImportFileType.CSV) {
        const stats = fs.statSync(filePath);
        return stats.size > 0;
      }
      return false;
    } catch (error) {
      this.logger.error(`File validation failed: ${error.message}`);
      return false;
    }
  }
}