import { PartialType } from '@nestjs/swagger';
import { CreateWithdrawalRequestDto } from './create-withdrawal-request.dto';

export class UpdateWithdrawalRequestDto extends PartialType(CreateWithdrawalRequestDto) {}