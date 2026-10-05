import { Type } from 'class-transformer';
import { IsNumber, Max, Min, ValidateNested, IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CoordinateDto {
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
}
export class RouteDto {
  @ApiProperty({ type: CoordinateDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CoordinateDto)
  origin!: CoordinateDto;
  @ApiProperty({ type: CoordinateDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CoordinateDto)
  destination!: CoordinateDto;
}
