import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class GlobalCompanyDirectoryEntriesInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  offset: number;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}

@InputType()
export class SetGlobalCompanyQuarantinedInput {
  @Field(() => String)
  @IsUUID()
  globalCompanyId: string;

  @Field(() => Boolean)
  @IsBoolean()
  isQuarantined: boolean;
}
