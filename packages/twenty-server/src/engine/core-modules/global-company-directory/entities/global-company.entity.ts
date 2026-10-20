import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Instance-wide on purpose: no workspaceId. Holds only company facts from
// public sources and is never exposed through any tenant API; see
// GlobalCompanyDirectoryService.
@Entity({ name: 'globalCompany', schema: 'core' })
@Index('IDX_GLOBAL_COMPANY_LEI_UNIQUE', ['lei'], {
  unique: true,
  where: '"lei" IS NOT NULL',
})
@Index(
  'IDX_GLOBAL_COMPANY_REGISTRATION_UNIQUE',
  ['registrationAuthority', 'registrationNumber'],
  {
    unique: true,
    where:
      '"registrationAuthority" IS NOT NULL AND "registrationNumber" IS NOT NULL',
  },
)
@Index(
  'IDX_GLOBAL_COMPANY_DOMAIN_COUNTRY_UNIQUE',
  ['canonicalDomain', 'countryCode'],
  {
    unique: true,
    where: '"canonicalDomain" IS NOT NULL AND "countryCode" IS NOT NULL',
  },
)
@Index('IDX_GLOBAL_COMPANY_COUNTRY_CODE', ['countryCode'])
export class GlobalCompanyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  normalizedName: string | null;

  @Column({ type: 'varchar', nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  @Column({ type: 'varchar', nullable: true })
  canonicalDomain: string | null;

  @Column({ type: 'varchar', nullable: true })
  lei: string | null;

  @Column({ type: 'varchar', nullable: true })
  registrationAuthority: string | null;

  @Column({ type: 'varchar', nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', nullable: true })
  industryCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  industryCodeScheme: string | null;

  @Column({ type: 'integer', nullable: true })
  employeeCount: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Quarantined entries keep collecting sources but are never served.
  @Column({ type: 'boolean', nullable: false, default: false })
  isQuarantined: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  quarantinedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: false, default: () => 'now()' })
  firstSeenAt: Date;

  @Column({ type: 'timestamptz', nullable: false, default: () => 'now()' })
  lastVerifiedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
