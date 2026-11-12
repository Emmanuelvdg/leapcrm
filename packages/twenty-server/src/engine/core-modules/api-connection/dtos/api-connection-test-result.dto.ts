import { Field, Int, ObjectType } from '@nestjs/graphql';

import { ApiConnectionDTO } from 'src/engine/core-modules/api-connection/dtos/api-connection.dto';

@ObjectType('ApiConnectionTestResult')
export class ApiConnectionTestResultDTO {
  @Field()
  success: boolean;

  @Field(() => Int, { nullable: true })
  httpStatus: number | null;

  @Field(() => Int, { nullable: true })
  durationMs: number | null;

  @Field(() => String, { nullable: true })
  responsePreview: string | null;

  @Field(() => String, { nullable: true })
  errorMessage: string | null;

  @Field(() => ApiConnectionDTO)
  connection: ApiConnectionDTO;
}
