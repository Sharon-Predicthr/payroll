import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateLevelDto {
  @IsString()
  key: string; // internal name: region, factory, section...

  @IsString()
  display_name: string; // tenant label

  @IsInt()
  @Min(1)
  @Max(6)
  level_order: number; // 1..6

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

