import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type IcpTierThresholds } from 'twenty-shared/icp-analysis';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledThresholds = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(3, minmax(0, 1fr));
`;

const StyledThreshold = styled.label`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledThresholdInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  padding: ${themeCssVariables.spacing[1]};
`;

type IcpTierThresholdsEditorProps = {
  thresholds: IcpTierThresholds;
  isEditable: boolean;
  onChange: (thresholds: IcpTierThresholds) => void;
};

export const IcpTierThresholdsEditor = ({
  thresholds,
  isEditable,
  onChange,
}: IcpTierThresholdsEditorProps) => {
  const { t } = useLingui();

  const fields: { key: keyof IcpTierThresholds; label: string }[] = [
    { key: 'priority', label: t`Priority from` },
    { key: 'target', label: t`Target from` },
    { key: 'nurture', label: t`Nurture from` },
  ];

  return (
    <StyledThresholds>
      {fields.map(({ key, label }) => (
        <StyledThreshold key={key}>
          {label}
          <StyledThresholdInput
            type="number"
            min={0}
            max={100}
            value={thresholds[key]}
            disabled={!isEditable}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);

              if (!Number.isNaN(value)) {
                onChange({
                  ...thresholds,
                  [key]: Math.min(100, Math.max(0, value)),
                });
              }
            }}
          />
        </StyledThreshold>
      ))}
    </StyledThresholds>
  );
};
