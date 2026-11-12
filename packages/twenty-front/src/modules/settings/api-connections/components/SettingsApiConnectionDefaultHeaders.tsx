import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconPlus, IconTrash } from 'twenty-ui/icon';
import { Button, IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 1fr 1fr auto;
`;

export type ApiConnectionHeaderRow = { name: string; value: string };

type SettingsApiConnectionDefaultHeadersProps = {
  instanceId: string;
  headers: ApiConnectionHeaderRow[];
  onChange: (headers: ApiConnectionHeaderRow[]) => void;
};

export const SettingsApiConnectionDefaultHeaders = ({
  instanceId,
  headers,
  onChange,
}: SettingsApiConnectionDefaultHeadersProps) => {
  const { t } = useLingui();

  const updateRow = (
    rowIndex: number,
    changes: Partial<ApiConnectionHeaderRow>,
  ) => {
    onChange(
      headers.map((header, index) =>
        index === rowIndex ? { ...header, ...changes } : header,
      ),
    );
  };

  return (
    <StyledRows>
      {headers.map((header, index) => (
        <StyledRow key={index}>
          <SettingsTextInput
            instanceId={`${instanceId}-header-name-${index}`}
            placeholder={t`Header name`}
            value={header.name}
            onChange={(name) => updateRow(index, { name })}
            fullWidth
          />
          <SettingsTextInput
            instanceId={`${instanceId}-header-value-${index}`}
            placeholder={t`Value`}
            value={header.value}
            onChange={(value) => updateRow(index, { value })}
            fullWidth
          />
          <IconButton
            Icon={IconTrash}
            variant="tertiary"
            size="small"
            ariaLabel={t`Remove header`}
            onClick={() =>
              onChange(
                headers.filter((_, headerIndex) => headerIndex !== index),
              )
            }
          />
        </StyledRow>
      ))}
      <div>
        <Button
          Icon={IconPlus}
          title={t`Add header`}
          size="small"
          variant="secondary"
          onClick={() => onChange([...headers, { name: '', value: '' }])}
        />
      </div>
    </StyledRows>
  );
};
