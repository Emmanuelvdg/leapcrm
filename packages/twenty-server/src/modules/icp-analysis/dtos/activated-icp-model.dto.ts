import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ActivatedIcpModelDTO {
  @Field(() => String)
  modelId: string;

  @Field(() => Number)
  version: number;

  @Field(() => Number)
  archivedModelCount: number;
}
