import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DuplicatedIcpModelDTO {
  @Field(() => String)
  modelId: string;

  @Field(() => Number)
  version: number;
}
