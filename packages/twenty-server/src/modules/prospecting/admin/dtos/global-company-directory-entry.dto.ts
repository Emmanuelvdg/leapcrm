import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GlobalCompanyDirectoryEntryDTO {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  countryCode: string | null;

  @Field(() => String, { nullable: true })
  canonicalDomain: string | null;

  @Field(() => String, { nullable: true })
  lei: string | null;

  @Field(() => String, { nullable: true })
  registrationAuthority: string | null;

  @Field(() => String, { nullable: true })
  registrationNumber: string | null;

  @Field(() => String, { nullable: true })
  industry: string | null;

  @Field(() => Int, { nullable: true })
  employeeCount: number | null;

  @Field(() => [String])
  sourceProviderIds: string[];

  @Field(() => Boolean)
  isQuarantined: boolean;

  @Field(() => Date)
  lastVerifiedAt: Date;
}

@ObjectType()
export class GlobalCompanyDirectoryPageDTO {
  @Field(() => [GlobalCompanyDirectoryEntryDTO])
  entries: GlobalCompanyDirectoryEntryDTO[];

  @Field(() => Int)
  totalCount: number;
}
