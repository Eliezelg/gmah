import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApprovalVoteType } from '@prisma/client';

export class VoteLoanDto {
  @ApiProperty({ enum: ApprovalVoteType, description: 'Vote type' })
  @IsNotEmpty()
  @IsEnum(ApprovalVoteType)
  vote: ApprovalVoteType;

  @ApiPropertyOptional({ description: 'Comment about the vote' })
  @IsOptional()
  @IsString()
  comment?: string;
}