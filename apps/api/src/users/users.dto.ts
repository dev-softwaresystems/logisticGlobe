import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto.js';
export const USER_ROLES = [
  'ADMIN',
  'LOGISTICS_ADMIN',
  'FLEET_SUPERVISOR',
  'TRAFFIC_COORDINATOR',
  'WAREHOUSE_MANAGER',
  'VIEWER',
] as const;
export class UsersQuery extends PaginationDto {
  @IsOptional() @IsIn(['active', 'inactive']) state?: 'active' | 'inactive';
}
export class CreateUserDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
  @ApiProperty({ writeOnly: true, minLength: 12, maxLength: 72 })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
  @ApiProperty({ enum: USER_ROLES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(USER_ROLES, { each: true })
  roles!: (typeof USER_ROLES)[number][];
}
export class UpdateUserDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
  @ApiProperty() @IsBoolean() active!: boolean;
  @ApiProperty({ enum: USER_ROLES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(USER_ROLES, { each: true })
  roles!: (typeof USER_ROLES)[number][];
  @ApiProperty() @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}
