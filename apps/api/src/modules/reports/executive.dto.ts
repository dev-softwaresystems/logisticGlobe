import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
export class ExecutiveQuery {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
  @ApiPropertyOptional({
    enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  @ApiPropertyOptional({ enum: ['NORMAL', 'HIGH'] })
  @IsOptional()
  @IsIn(['NORMAL', 'HIGH'])
  priority?: 'NORMAL' | 'HIGH';
}
