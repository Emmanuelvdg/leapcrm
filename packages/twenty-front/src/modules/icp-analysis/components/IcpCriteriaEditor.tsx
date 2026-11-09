import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  ICP_ATTRIBUTE_CATEGORIES,
  ICP_CATEGORY_WEIGHT_CAPS,
  ICP_CRITERION_MAX_WEIGHT,
  ICP_CRITERION_MIN_WEIGHT,
  type IcpAttributeCategory,
  type IcpCriterion,
} from 'twenty-shared/icp-analysis';
import { IconTrash } from 'twenty-ui/icon';
import { Checkbox, IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCategory = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledCategoryHeader = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: space-between;
`;

const StyledRow = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 1fr 72px auto auto;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledWeightInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  padding: ${themeCssVariables.spacing[1]};
  text-align: right;
  width: 100%;
`;

// Not a <label>: base-ui would point the checkbox's aria-labelledby at it and
// every row would be announced as just "Exclude".
const StyledExclusion = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  white-space: nowrap;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
`;

const StyledEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const clampWeight = (weight: number): number =>
  Math.min(
    ICP_CRITERION_MAX_WEIGHT,
    Math.max(ICP_CRITERION_MIN_WEIGHT, weight),
  );

type IcpCriteriaEditorProps = {
  criteria: IcpCriterion[];
  isEditable: boolean;
  onChange: (criteria: IcpCriterion[]) => void;
};

export const IcpCriteriaEditor = ({
  criteria,
  isEditable,
  onChange,
}: IcpCriteriaEditorProps) => {
  const { t } = useLingui();

  const categoryLabels: Record<IcpAttributeCategory, string> = {
    FIRMOGRAPHIC: t`Firmographic`,
    INTENT: t`Intent`,
    TECHNOGRAPHIC: t`Technographic`,
    TRIGGER: t`Trigger`,
  };

  const updateCriterion = (
    criterionId: string,
    update: Partial<IcpCriterion>,
  ) =>
    onChange(
      criteria.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, ...update } : criterion,
      ),
    );

  const handleWeightChange = (criterion: IcpCriterion, rawWeight: string) => {
    const parsedWeight = Number.parseInt(rawWeight, 10);

    if (Number.isNaN(parsedWeight)) {
      return;
    }

    const weight = clampWeight(parsedWeight);

    updateCriterion(criterion.id, {
      weight,
      isHardExclusion: criterion.isHardExclusion && weight <= 0,
    });
  };

  if (criteria.length === 0) {
    return (
      <StyledEmpty>
        {t`No criteria yet. Suggest weights from the analysis, or add values from the patterns.`}
      </StyledEmpty>
    );
  }

  return (
    <StyledEditor>
      {ICP_ATTRIBUTE_CATEGORIES.map((category) => {
        const categoryCriteria = criteria.filter(
          (criterion) => criterion.category === category,
        );

        if (categoryCriteria.length === 0) {
          return null;
        }

        const bestPositiveWeightByAttribute = categoryCriteria.reduce<
          Record<string, number>
        >(
          (bestWeights, { attributeKey, weight }) => ({
            ...bestWeights,
            [attributeKey]: Math.max(bestWeights[attributeKey] ?? 0, weight),
          }),
          {},
        );
        const categoryPoints = Object.values(
          bestPositiveWeightByAttribute,
        ).reduce((total, weight) => total + weight, 0);
        const categoryCap = ICP_CATEGORY_WEIGHT_CAPS[category];

        return (
          <StyledCategory key={category}>
            <StyledCategoryHeader>
              <span>{categoryLabels[category]}</span>
              <span>{t`${categoryPoints} of ${categoryCap} points`}</span>
            </StyledCategoryHeader>
            {categoryCriteria.map((criterion) => (
              <StyledRow key={criterion.id}>
                <StyledLabel title={criterion.label}>
                  {criterion.label}
                </StyledLabel>
                <StyledWeightInput
                  type="number"
                  min={ICP_CRITERION_MIN_WEIGHT}
                  max={ICP_CRITERION_MAX_WEIGHT}
                  step={5}
                  value={criterion.weight}
                  disabled={!isEditable}
                  aria-label={t`Weight for ${criterion.label}`}
                  onChange={(event) =>
                    handleWeightChange(criterion, event.target.value)
                  }
                />
                <StyledExclusion>
                  <Checkbox
                    checked={criterion.isHardExclusion}
                    disabled={!isEditable || criterion.weight > 0}
                    aria-label={t`Always exclude ${criterion.label}`}
                    onCheckedChange={(isHardExclusion) =>
                      updateCriterion(criterion.id, { isHardExclusion })
                    }
                  />
                  {t`Exclude`}
                </StyledExclusion>
                <IconButton
                  Icon={IconTrash}
                  size="small"
                  variant="tertiary"
                  disabled={!isEditable}
                  ariaLabel={t`Remove ${criterion.label}`}
                  onClick={() =>
                    onChange(criteria.filter(({ id }) => id !== criterion.id))
                  }
                />
              </StyledRow>
            ))}
          </StyledCategory>
        );
      })}
    </StyledEditor>
  );
};
