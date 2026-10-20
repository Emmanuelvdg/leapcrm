import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GlobalCompanyCandidateLinkEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company-candidate-link.entity';
import { GlobalCompanySourceEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company-source.entity';
import { GlobalCompanyEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company.entity';
import { GlobalCompanyDirectoryService } from 'src/engine/core-modules/global-company-directory/services/global-company-directory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GlobalCompanyEntity,
      GlobalCompanySourceEntity,
      GlobalCompanyCandidateLinkEntity,
    ]),
  ],
  providers: [GlobalCompanyDirectoryService],
  exports: [GlobalCompanyDirectoryService],
})
export class GlobalCompanyDirectoryModule {}
