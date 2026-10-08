import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';
import type { VehicleStatus } from '@logistics-globe/shared';
export class VehicleQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: ['AVAILABLE', 'ON_ROUTE', 'MAINTENANCE'] })
  @IsOptional()
  @IsIn(['AVAILABLE', 'ON_ROUTE', 'MAINTENANCE'])
  status?: VehicleStatus;
}
export class CreateVehicleDto {
  @ApiPropertyOptional({
    description: 'Nominal payload in kg; not warehouse units',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  capacityKg?: number;
  @ApiProperty()
  @IsString()
  @Length(3, 32)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  plate!: string;
}
export class ChangeVehicleDto {
  @ApiProperty({ enum: ['AVAILABLE', 'MAINTENANCE'] })
  @IsIn(['AVAILABLE', 'MAINTENANCE'])
  status!: 'AVAILABLE' | 'MAINTENANCE';
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  expectedUpdatedAt!: string;
}
export class PositionDto {
  @ApiPropertyOptional({
    description: 'Explicit local simulation; rejected in production',
  })
  @IsOptional()
  @IsBoolean()
  simulated?: boolean;
  @ApiPropertyOptional({ description: 'Speed in km/h' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  speedKph?: number;
  @ApiPropertyOptional({
    description: 'Heading clockwise from north in degrees',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359.999)
  headingDegrees?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(10000)
  accuracyMeters?: number;
  @ApiProperty({
    description: 'Idempotency key for this observation',
    format: 'uuid',
  })
  @IsUUID()
  id!: string;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;
  @ApiProperty({ format: 'date-time' }) @IsDateString() observedAt!: string;
}
export class PositionQuery extends PaginationDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
