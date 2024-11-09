import React from 'react';

import BackgroundHint from '@skybrush/mui-components/lib/BackgroundHint';

import { listOf } from '~/components/helpers/lists';
import UAVLogListItem from '~/components/uavs/UAVLogListItem';

const UAVLogList = listOf(
  (item, props) => (
    <UAVLogListItem key={item.id} uavId={props.uavId} {...item} />
  ),
  {
    dataProvider: 'items',
    backgroundHint: <BackgroundHint text='No logs found' />,
  }
);

export default UAVLogList;
