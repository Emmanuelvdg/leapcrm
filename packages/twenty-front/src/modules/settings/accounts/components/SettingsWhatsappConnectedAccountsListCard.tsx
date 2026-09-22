import { styled } from '@linaria/react';

import { useMutation, useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { type ThemeColor } from 'twenty-ui/theme';
import { IconBrandWhatsapp, IconDotsVertical, IconTrash } from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { MenuItem } from 'twenty-ui/navigation';
import { Status } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useConnectWhatsapp } from '@/settings/accounts/hooks/useConnectWhatsapp';
import { DISCONNECT_WHATSAPP_CHANNEL } from '@/settings/accounts/graphql/mutations/disconnectWhatsappChannel';
import { GET_WHATSAPP_CHANNELS } from '@/settings/accounts/graphql/queries/getWhatsappChannels';
import { type WhatsappChannel } from '@/settings/accounts/types/WhatsappChannel';
import { SettingsListCard } from '@/settings/components/SettingsListCard';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';

const StyledRowRightContainer = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
`;

const CONNECTION_STATUS_COLOR: Record<
  WhatsappChannel['connectionStatus'],
  ThemeColor
> = {
  CONNECTED: 'green',
  DISCONNECTED: 'gray',
  ERROR: 'red',
};

const CONNECTION_STATUS_LABEL: Record<
  WhatsappChannel['connectionStatus'],
  string
> = {
  CONNECTED: t`Connected`,
  DISCONNECTED: t`Disconnected`,
  ERROR: t`Connection error`,
};

const WhatsappChannelRowRightComponent = ({
  item,
}: {
  item: WhatsappChannel;
}) => {
  const dropdownId = `settings-whatsapp-channel-row-${item.id}`;
  const disconnectModalId = `disconnect-whatsapp-channel-modal-${item.id}`;

  const { openModal } = useModal();
  const { closeDropdown } = useCloseDropdown();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [disconnectWhatsappChannel] = useMutation(DISCONNECT_WHATSAPP_CHANNEL, {
    refetchQueries: [{ query: GET_WHATSAPP_CHANNELS }],
  });

  const handleDisconnect = async () => {
    try {
      await disconnectWhatsappChannel({ variables: { id: item.id } });
      enqueueSuccessSnackBar({ message: t`WhatsApp disconnected` });
    } catch (error) {
      if (error instanceof Error) {
        enqueueErrorSnackBar({ apolloError: error });
      } else {
        enqueueErrorSnackBar({ message: t`Failed to disconnect WhatsApp` });
      }
    }
  };

  return (
    <StyledRowRightContainer>
      <Status
        color={CONNECTION_STATUS_COLOR[item.connectionStatus]}
        text={CONNECTION_STATUS_LABEL[item.connectionStatus]}
        weight="medium"
      />
      <Dropdown
        dropdownId={dropdownId}
        dropdownPlacement="right-start"
        clickableComponent={
          <LightIconButton
            Icon={IconDotsVertical}
            accent="tertiary"
            aria-label={t`More options`}
          />
        }
        dropdownComponents={
          <DropdownContent>
            <DropdownMenuItemsContainer>
              <MenuItem
                accent="danger"
                LeftIcon={IconTrash}
                text={t`Disconnect`}
                onClick={() => {
                  closeDropdown(dropdownId);
                  openModal(disconnectModalId);
                }}
              />
            </DropdownMenuItemsContainer>
          </DropdownContent>
        }
      />
      <ConfirmationModal
        modalInstanceId={disconnectModalId}
        title={t`Disconnect WhatsApp`}
        subtitle={
          <Trans>
            This will stop new WhatsApp messages from syncing to this workspace.
            Existing conversations are kept.
          </Trans>
        }
        onConfirmClick={handleDisconnect}
        confirmButtonText={t`Disconnect`}
      />
    </StyledRowRightContainer>
  );
};

export const SettingsWhatsappConnectedAccountsListCard = () => {
  const { connectWhatsapp, isConnecting } = useConnectWhatsapp();

  const { data, loading } = useQuery<{
    getWhatsappChannels: WhatsappChannel[];
  }>(GET_WHATSAPP_CHANNELS);

  const channels = data?.getWhatsappChannels ?? [];

  return (
    <SettingsListCard
      items={channels}
      isLoading={loading}
      getItemLabel={(item) => item.displayPhoneNumber ?? item.phoneNumberId}
      getItemDescription={() => t`WhatsApp Business account`}
      RowIcon={IconBrandWhatsapp}
      RowRightComponent={WhatsappChannelRowRightComponent}
      // One WhatsApp channel per workspace for now, so the "connect" footer
      // only shows up when there isn't one already.
      hasFooter={channels.length === 0}
      footerButtonLabel={isConnecting ? t`Connecting...` : t`Connect WhatsApp`}
      onFooterButtonClick={() => {
        if (!isConnecting) {
          void connectWhatsapp();
        }
      }}
      rounded
    />
  );
};
