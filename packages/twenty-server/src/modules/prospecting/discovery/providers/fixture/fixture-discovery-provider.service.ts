import { Injectable } from '@nestjs/common';

import { FIXTURE_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/fixture/constants/fixture-discovery-capabilities.constant';
import { FIXTURE_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/fixture/constants/fixture-discovery-provider-id.constant';
import { FIXTURE_DISCOVERY_RECORD_COUNT } from 'src/modules/prospecting/discovery/providers/fixture/constants/fixture-discovery-record-count.constant';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import {
  type DiscoveryPage,
  type DiscoveryProvider,
  type DiscoveryRequest,
} from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { parseOffsetCursor } from 'src/modules/prospecting/discovery/utils/offset-cursor.util';

const FIXTURE_RETRIEVED_AT = '2026-01-01T00:00:00.000Z';

@Injectable()
export class FixtureDiscoveryProvider implements DiscoveryProvider {
  readonly id = FIXTURE_DISCOVERY_PROVIDER_ID;

  getCapabilities(): DiscoveryCapabilities {
    return FIXTURE_DISCOVERY_CAPABILITIES;
  }

  async search(request: DiscoveryRequest): Promise<DiscoveryPage> {
    const offset = parseOffsetCursor(request.cursor);
    const countryCode = request.countryCode ?? 'SG';
    const industry = request.icp.targetIndustries[0] ?? 'Software';
    const recordCount = Math.max(
      Math.min(request.pageSize, FIXTURE_DISCOVERY_RECORD_COUNT - offset),
      0,
    );

    const records = Array.from({ length: recordCount }, (_, pageIndex) =>
      this.buildRecord({
        index: offset + pageIndex + 1,
        countryCode,
        industry,
      }),
    );

    return {
      records,
      nextCursor:
        offset + records.length < FIXTURE_DISCOVERY_RECORD_COUNT
          ? String(offset + records.length)
          : null,
    };
  }

  private buildRecord({
    index,
    countryCode,
    industry,
  }: {
    index: number;
    countryCode: string;
    industry: string;
  }): CompanyDiscoveryRecord {
    const slug = `${countryCode.toLowerCase()}-${index}`;

    return {
      providerId: this.id,
      externalId: `fixture-${slug}`,
      sourceUrl: null,
      licenceId: FIXTURE_DISCOVERY_CAPABILITIES.licence.id,
      retrievedAt: FIXTURE_RETRIEVED_AT,
      name: `Fixture ${countryCode} Company ${index}`,
      domain: `fixture-${slug}.example.com`,
      countryCode,
      region: null,
      registrationAuthority: null,
      registrationNumber: null,
      lei: null,
      industry,
      industryCode: null,
      employeeCount: index * 10,
      description: `Fixture company ${index} for ${industry} in ${countryCode}`,
    };
  }
}
