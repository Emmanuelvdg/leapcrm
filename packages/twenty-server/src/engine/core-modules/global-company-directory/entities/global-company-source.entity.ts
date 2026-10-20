import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { GlobalCompanyEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company.entity';
import { type GlobalCompanyValues } from 'src/engine/core-modules/global-company-directory/types/global-company-values.type';

// Each source keeps its own values so every directory field can be traced to
// a public source, and the entry rebuilt if a source has to be removed.
@Entity({ name: 'globalCompanySource', schema: 'core' })
@Index(
  'IDX_GLOBAL_COMPANY_SOURCE_PROVIDER_EXTERNAL_ID_UNIQUE',
  ['providerId', 'externalId'],
  { unique: true },
)
@Index('IDX_GLOBAL_COMPANY_SOURCE_GLOBAL_COMPANY_ID', ['globalCompanyId'])
export class GlobalCompanySourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  globalCompanyId: string;

  @ManyToOne(() => GlobalCompanyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'globalCompanyId' })
  globalCompany: Relation<GlobalCompanyEntity>;

  @Column({ type: 'varchar', nullable: false })
  providerId: string;

  @Column({ type: 'varchar', nullable: false })
  externalId: string;

  @Column({ type: 'varchar', nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'varchar', nullable: false })
  licenceId: string;

  @Column({ type: 'timestamptz', nullable: false })
  retrievedAt: Date;

  // Lower ranks are more precise sources (registries before open knowledge).
  @Column({ type: 'integer', nullable: false })
  sourceRank: number;

  @Column({ type: 'jsonb', nullable: false })
  values: GlobalCompanyValues;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
