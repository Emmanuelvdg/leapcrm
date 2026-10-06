import { DATA_QUALITY } from 'src/constants/data-quality';

export const buildDataQualityOptions = ({
  cleanOptionId,
  incompleteOptionId,
  possibleDuplicateOptionId,
}: {
  cleanOptionId: string;
  incompleteOptionId: string;
  possibleDuplicateOptionId: string;
}) => [
  {
    id: cleanOptionId,
    value: DATA_QUALITY.CLEAN,
    label: 'Clean',
    color: 'green' as const,
    position: 0,
  },
  {
    id: incompleteOptionId,
    value: DATA_QUALITY.INCOMPLETE,
    label: 'Incomplete',
    color: 'orange' as const,
    position: 1,
  },
  {
    id: possibleDuplicateOptionId,
    value: DATA_QUALITY.POSSIBLE_DUPLICATE,
    label: 'Possible duplicate',
    color: 'red' as const,
    position: 2,
  },
];
