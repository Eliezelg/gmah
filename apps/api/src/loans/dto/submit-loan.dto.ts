import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SubmitLoanDto {
  @ApiPropertyOptional({ 
    description: 'Whether the loan requires a guarantee',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  requiresGuarantee?: boolean;

  @ApiPropertyOptional({ 
    description: 'Skip document check for testing (development only)',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  skipDocumentCheck?: boolean;
}