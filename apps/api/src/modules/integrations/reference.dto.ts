import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class ReferenceStockDto {
  @ApiProperty() @IsString() @Length(1, 80) externalId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) version!: number;
  @ApiProperty() @IsDateString() observedAt!: string;
  @ApiProperty() @IsString() @Length(2, 50) warehouseCode!: string;
  @ApiProperty() @IsString() @Length(2, 64) sku!: string;
  @ApiProperty() @IsInt() @Min(0) @Max(1000000000) quantity!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1000000000) minimumQuantity!: number;
  @ApiProperty() @IsDateString() expectedUpdatedAt!: string;
}
export class StockBatchDto {
  @ApiProperty({ type: [ReferenceStockDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  records!: unknown[];
}
export class StockCsvDto {
  @ApiProperty() @IsString() @MaxLength(95000) csv!: string;
}
