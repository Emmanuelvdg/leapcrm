import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsString, IsUrl } from 'class-validator';

@InputType()
export class PreviewOpenApiImportInput {
  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  @Field(() => String, { nullable: true })
  specUrl?: string | null;

  @IsString()
  @IsOptional()
  @Field(() => String, { nullable: true })
  specJson?: string | null;
}
