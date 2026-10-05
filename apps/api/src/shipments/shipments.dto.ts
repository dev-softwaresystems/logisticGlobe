import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../common/pagination.dto.js';
import type { ShipmentStatus, ShipmentPriority } from '@logistics-globe/shared';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class ShipmentQuery extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status?: ShipmentStatus;
  @ApiPropertyOptional({ enum: ['NORMAL', 'HIGH'] })
  @IsOptional()
  @IsIn(['NORMAL', 'HIGH'])
  priority?: ShipmentPriority;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
export class CreateShipmentDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(3, 64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  reference!: string;
  @ApiProperty() @Transform(trim) @IsString() @Length(2, 200) origin!: string;
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  destination!: string;
  @ApiProperty({ enum: ['NORMAL', 'HIGH'] })
  @IsIn(['NORMAL', 'HIGH'])
  priority: ShipmentPriority = 'NORMAL';
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
export class ChangeShipmentDto {
  @ApiProperty({ enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] })
  @IsIn(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status!: ShipmentStatus;
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  expectedUpdatedAt!: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
