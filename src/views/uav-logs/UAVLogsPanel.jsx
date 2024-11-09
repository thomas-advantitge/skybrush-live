import PropTypes from 'prop-types';
import React, { memo } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { useAsyncRetry } from 'react-use';

import Button from '@material-ui/core/Button';
import GetApp from '@material-ui/icons/GetApp';
import Error from '@material-ui/icons/Error';
import IconButton from '@material-ui/core/IconButton';

import BackgroundHint from '@skybrush/mui-components/lib/BackgroundHint';
import SmallProgressIndicator from '@skybrush/mui-components/lib/SmallProgressIndicator';

import useMessageHub from '~/hooks/useMessageHub';
import UAVLogListItem from '~/components/uavs/UAVLogListItem';
import { listOf } from '~/components/helpers/lists';
import { getUAVsInOrder } from '~/features/uavs/selectors';

const UAVLatestLogListItem = ({ id, triggerDownload }) => {
  const messageHub = useMessageHub();
  const state = useAsyncRetry(() => messageHub.query.getFlightLogList(id), [messageHub, id]);

  if (state.error && !state.loading) {
    return (
      <BackgroundHint
        icon={<Error />}
        text='Error while loading log'
        button={<Button onClick={state.retry}>Try again</Button>}
      />
    );
  }

  if (state.loading) {
    return <SmallProgressIndicator label='Retrieving log...' />;
  }

  if (!state.value) {
    return (
      <BackgroundHint
        text='Log not loaded yet'
        button={<Button onClick={state.retry}>Try again</Button>}
      />
    );
  }

  const latestLog = state.value.at(-1)
  if (!latestLog) {
    return <BackgroundHint text='No logs found' />;
  }

  return <UAVLogListItem key={id} uavId={id} triggerDownload={triggerDownload} {...latestLog} />
}

const UAVLogList = listOf(
  (item, props) => (
    <UAVLatestLogListItem key={item.id} triggerDownload={props.triggerDownload} {...item} />
  ),
  {
    dataProvider: 'items',
    backgroundHint: <BackgroundHint text='No uavs found' />,
  }
);

const UAVLogsPanel = memo(({uavs}) => {
  const [triggerDownload, setTriggerDownload] = React.useState(false);
  return (
    <>
      <div style={{display: 'flex', flexDirection: 'row-reverse', marginRight: '3px'}}>
        <IconButton onClick={() => {
          setTriggerDownload(true)
        }}>
          <GetApp />
        </IconButton>
      </div>
      <UAVLogList dense items={uavs} triggerDownload={triggerDownload} />
    </>
  )
});

UAVLogsPanel.propTypes = {
  uavs: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default connect(
  // mapStateToProps
  (state) => ({
    uavs: getUAVsInOrder(state),
  }),
  // mapDispatchToProps
  null
)(withTranslation()(UAVLogsPanel));
