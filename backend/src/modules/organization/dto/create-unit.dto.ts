import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  level_key: string; // FK → org_levels.key

  @IsOptional()
  @IsInt()
  parent_id?: number | null; // FK → org_units.id

  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

