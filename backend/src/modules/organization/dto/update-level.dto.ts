import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  level_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

