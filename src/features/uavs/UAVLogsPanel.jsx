import PropTypes from 'prop-types';
import React, { memo } from 'react';
import { useAsyncRetry } from 'react-use';

import Button from '@material-ui/core/Button';
import Error from '@material-ui/icons/Error';

import BackgroundHint from '@skybrush/mui-components/lib/BackgroundHint';
import LargeProgressIndicator from '@skybrush/mui-components/lib/LargeProgressIndicator';

import useMessageHub from '~/hooks/useMessageHub';
import UAVLogList from '~/components/uavs/UAVLogList';

const UAVLogsPanel = memo(({ uavId }) => {
  const messageHub = useMessageHub();
  const state = useAsyncRetry(
    () => (uavId ? messageHub.query.getFlightLogList(uavId) : {}),
    [messageHub, uavId]
  );

  if (state.error && !state.loading) {
    return (
      <BackgroundHint
        icon={<Error />}
        text='Error while loading log list'
        button={<Button onClick={state.retry}>Try again</Button>}
      />
    );
  }

  if (state.loading) {
    return <LargeProgressIndicator fullHeight label='Retrieving log list...' />;
  }

  if (!Array.isArray(state.value)) {
    return (
      <BackgroundHint
        text='Log list not loaded yet'
        button={<Button onClick={state.retry}>Try again</Button>}
      />
    );
  }

  return <UAVLogList dense uavId={uavId} items={state.value} />;
});

UAVLogsPanel.propTypes = {
  uavId: PropTypes.string,
};

export default UAVLogsPanel;
