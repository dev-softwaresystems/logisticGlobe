import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RouteDto, CoordinateDto } from './routing.dto.js';
import { PaginationDto } from '../../common/pagination.dto.js';
export class AuthorizedStopDto extends CoordinateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  reference?: string;
  @ApiProperty() @IsInt() @Min(20) @Max(1000) radiusMeters!: number;
}
export class PlanDto extends RouteDto {
  @ApiProperty() @IsUUID() requestId!: string;
  @ApiProperty() @IsUUID() vehicleId!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  shipmentIds!: string[];
  @ApiProperty() @IsInt() @Min(20) @Max(5000) corridorMeters = 200;
  @ApiProperty() @IsInt() @Min(30) @Max(3600) confirmSeconds = 60;
  @ApiProperty() @IsInt() @Min(2) @Max(20) confirmObservations = 3;
  @ApiProperty() @IsInt() @Min(20) @Max(200) stopRadiusMeters = 30;
  @ApiProperty() @IsInt() @Min(60) @Max(7200) stopSeconds = 300;
  @ApiProperty() @IsInt() @Min(30) @Max(600) maxGapSeconds = 120;
  @ApiProperty() @IsInt() @Min(5) @Max(500) maxAccuracyMeters = 100;
  @ApiPropertyOptional({ type: [AuthorizedStopDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AuthorizedStopDto)
  authorizedStops: AuthorizedStopDto[] = [];
}
export class IncidentQuery extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
}
export class AcknowledgeDto {
  @ApiProperty() @IsDateString() expectedLastObservedAt!: string;
  @ApiProperty() @IsString() @Length(3, 200) note!: string;
}
