/**
 * @file Component that displays the status of the known UAVs in a Skybrush
 * flock.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

import type { GroupSelectionInfo } from './types';
import UAVListSection, { type UAVListSectionProps } from './UAVListSection';
import type { UAVListLayout } from '~/features/settings/types';

type UAVListBodyProps = Readonly<{
  editingMapping: boolean;
  itemFactory: UAVListSectionProps['itemFactory'];
  itemFactoryOptions: UAVListSectionProps['itemFactoryOptions'];
  layout: UAVListLayout;
  onSelectSection: UAVListSectionProps['onSelect'];
  selectionInfo: {
    mainUAVIds: GroupSelectionInfo;
    spareUAVIds: GroupSelectionInfo;
    extraSlots: GroupSelectionInfo;
  };
  showMissionIds: boolean;
  uavIds: {
    mainUAVIds: string[];
    spareUAVIds: string[];
  };
}>;

/**
 * Presentation component for showing the drone show configuration view.
 */
const UAVListBody = ({
  itemFactory,
  itemFactoryOptions,
  editingMapping,
  layout,
  onSelectSection,
  selectionInfo,
  showMissionIds,
  uavIds,
}: UAVListBodyProps): JSX.Element => {
  const { mainUAVIds, spareUAVIds } = uavIds;
  const { t } = useTranslation();

  return (
    <>
      <UAVListSection
        ids={mainUAVIds}
        itemFactory={itemFactory}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        itemFactoryOptions={itemFactoryOptions}
        label={
          showMissionIds ? t('UAVList.assignedUAVs') : t('UAVList.allUAVs')
        }
        layout={layout}
        value='mainUAVIds'
        onSelect={onSelectSection}
        {...selectionInfo.mainUAVIds}
      />
      <UAVListSection
        ids={spareUAVIds}
        itemFactory={itemFactory}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        itemFactoryOptions={itemFactoryOptions}
        label={t('UAVList.spareUAVs')}
        layout={layout}
        value='spareUAVIds'
        forceVisible={editingMapping}
        onSelect={onSelectSection}
        {...selectionInfo.spareUAVIds}
      />
    </>
  );
};

export default UAVListBody;
