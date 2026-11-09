import {
  type IcpAttributePatterns,
  type IcpCriterion,
  type IcpPatternBucket,
} from 'twenty-shared/icp-analysis';

const DEFAULT_ADDED_WEIGHT = 10;

// A starting point the user tunes in the editor: the bucket's direction sets
// the sign, Suggest weights gives evidence-based sizes.
export const buildIcpCriterionFromBucket = ({
  attribute,
  bucket,
}: {
  attribute: IcpAttributePatterns;
  bucket: IcpPatternBucket;
}): IcpCriterion => ({
  id: bucket.key,
  attributeKey: attribute.attributeKey,
  attributeLabel: attribute.label,
  label: `${attribute.label}: ${bucket.label}`,
  category: attribute.category,
  match: bucket.match,
  weight:
    bucket.direction === 'NEGATIVE'
      ? -DEFAULT_ADDED_WEIGHT
      : DEFAULT_ADDED_WEIGHT,
  isHardExclusion: false,
});
