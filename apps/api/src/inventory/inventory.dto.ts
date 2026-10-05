import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class InventoryQuery extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
  @ApiPropertyOptional({ enum: ['open', 'resolved', 'all'] })
  @IsOptional()
  @IsIn(['open', 'resolved', 'all'])
  state: 'open' | 'resolved' | 'all' = 'open';
}
export class CreateWarehouseDto {
  @ApiProperty() @IsString() @Length(2, 50) @Transform(trim) code!: string;
  @ApiProperty() @IsString() @Length(2, 120) @Transform(trim) name!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(1000000000) capacityUnits!: number;
}
export class CreateItemDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() warehouseId!: string;
  @ApiProperty() @IsString() @Length(2, 64) @Transform(trim) sku!: string;
  @ApiProperty() @IsString() @Length(2, 160) @Transform(trim) name!: string;
  @ApiProperty() @IsInt() @Min(0) @Max(1000000000) quantity!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1000000000) minimumQuantity!: number;
}
export class AdjustItemDto {
  @ApiProperty() @IsInt() @Min(0) @Max(1000000000) quantity!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1000000000) minimumQuantity!: number;
  @ApiProperty() @IsString() @Length(5, 240) @Transform(trim) reason!: string;
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  expectedUpdatedAt!: string;
}
