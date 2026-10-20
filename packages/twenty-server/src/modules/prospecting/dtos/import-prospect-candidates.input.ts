import { Field, InputType, Int } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { PROSPECT_CANDIDATE_IMPORT_MAX_ROWS } from 'src/modules/prospecting/constants/prospect-candidate-import-max-rows.constant';

@InputType()
export class ImportProspectCompanyInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  domain?: string;

  @Field({ nullable: true, description: 'Country code or English name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  registrationNumber?: string;

  @Field({ nullable: true, description: 'GLEIF registration authority code' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  registrationAuthority?: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  lei?: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  industry?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  employeeCount?: number;
}

@InputType()
export class ImportProspectCandidatesInput {
  @Field(() => String)
  @IsUUID()
  campaignId: string;

  @Field(() => [ImportProspectCompanyInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PROSPECT_CANDIDATE_IMPORT_MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportProspectCompanyInput)
  companies: ImportProspectCompanyInput[];
}
