import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  level_key?: string;

  @IsOptional()
  @IsInt()
  parent_id?: number | null;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

