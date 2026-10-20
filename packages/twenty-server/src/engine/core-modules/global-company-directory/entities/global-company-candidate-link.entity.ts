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
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// Lives in core rather than as a field on the candidate object: workspace
// objects are readable through the tenant APIs, and a field there would
// reveal that the directory exists.
@Entity({ name: 'globalCompanyCandidateLink', schema: 'core' })
@Index(
  'IDX_GLOBAL_COMPANY_CANDIDATE_LINK_WORKSPACE_CANDIDATE_UNIQUE',
  ['workspaceId', 'candidateId'],
  { unique: true },
)
@Index('IDX_GLOBAL_COMPANY_CANDIDATE_LINK_GLOBAL_COMPANY_ID', [
  'globalCompanyId',
])
export class GlobalCompanyCandidateLinkEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  candidateId: string;

  @Column({ type: 'uuid', nullable: false })
  globalCompanyId: string;

  @ManyToOne(() => GlobalCompanyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'globalCompanyId' })
  globalCompany: Relation<GlobalCompanyEntity>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
