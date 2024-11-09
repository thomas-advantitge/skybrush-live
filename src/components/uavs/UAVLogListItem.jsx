import isNil from 'lodash-es/isNil';
import prettyBytes from 'pretty-bytes';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import IconButton from '@material-ui/core/IconButton';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import GetApp from '@material-ui/icons/GetApp';
import Save from '@material-ui/icons/Save';

import StatusLight from '@skybrush/mui-components/lib/StatusLight';

import ListItemProgressBar from '~/components/ListItemProgressBar';
import { showNotification } from '~/features/snackbar/actions';
import { MessageSemantics } from '~/features/snackbar/types';
import {
    getLogDownloadState,
    initiateLogDownload,
    LogDownloadStatus,
    retrieveDownloadedLog,
    setLogDownloadError,
    setLogDownloadProgress,
    storeDownloadedLog,
} from '~/features/uavs/log-download';
import useMessageHub from '~/hooks/useMessageHub';
import { describeFlightLogKind } from '~/model/enums';
import { convertFlightLogToBlob } from '~/model/flight-logs';
import { writeBlobToFile } from '~/utils/filesystem';
import { formatUnixTimestamp } from '~/utils/formatting';

const SEPARATOR = ' · ';

const useStyles = makeStyles(
  (theme) => ({
    progress: {
      // Make sure that the progress bar (if any) has exactly the same height
      // as the secondary text
      padding: theme.spacing(1, 0),
    },
  }),
  {
    name: 'UAVLogListItem',
  }
);

const saveLogToFile = (log) => {
  const { filename, blob } = convertFlightLogToBlob(log);
  writeBlobToFile(blob, filename);
};

const UAVLogListItem = ({ id, kind, size, timestamp, uavId, triggerDownload }) => {
  /* Hooks */

  const dispatch = useDispatch();
  const messageHub = useMessageHub();
  const classes = useStyles();

  const downloadState = useSelector(getLogDownloadState(uavId, id));
  const log = useSelector(retrieveDownloadedLog(uavId, id));

  const download = useCallback((auto) => {
    dispatch(initiateLogDownload(uavId, id));
    messageHub.query
      .getFlightLog(uavId, id, {
        onProgress({ progress }) {
          dispatch(setLogDownloadProgress(uavId, id, progress));
        },
      })
      .then((log) => {
        dispatch(storeDownloadedLog(uavId, id, log));
        // Don't show notification if the download was triggered in bulk from the UAVLogsPanel
        if (auto !== true) dispatch(
          showNotification({
            message: `Log ${id} of UAV ${uavId} downloaded successfully.`,
            semantics: MessageSemantics.SUCCESS,
            buttons: [{ label: 'Save', action: () => saveLogToFile(log) }],
            timeout: 20000,
          })
        );
      })
      .catch(({ message }) => {
        dispatch(
          showNotification({
            message: `Couldn't download log ${id} of UAV ${uavId}: ${message}`,
            semantics: MessageSemantics.ERROR,
            buttons: [{ label: 'Retry', action: download }],
            timeout: 20000,
          })
        );
        dispatch(setLogDownloadError(uavId, id, message));
      });
  }, [dispatch, id, messageHub, uavId]);

  useEffect(() => {
    // Hack to trigger download from parent component, could be improved by abstracting the dispatching
    if (triggerDownload) download(true);
  }, [download, triggerDownload]);

  const save = useCallback(() => {
    saveLogToFile(log);
  }, [log]);

  /* Display */

  const primaryParts = [uavId.padStart(3, '0')];
  const secondaryParts = [];

  if (!isNil(id)) {
    primaryParts.push(id);
  }

  primaryParts.push(
    isNil(timestamp) ? 'Date unknown' : formatUnixTimestamp(timestamp)
  );

  if (downloadState?.status === LogDownloadStatus.ERROR) {
    secondaryParts.push(downloadState?.error);
  } else {
    secondaryParts.push(describeFlightLogKind(kind));
    if (!isNil(size)) {
      secondaryParts.push(prettyBytes(size));
    }
  }

  const secondaryComponent =
    downloadState?.status === LogDownloadStatus.LOADING ? (
      <div className={classes.progress}>
        <ListItemProgressBar progress={downloadState.progress} />
      </div>
    ) : (
      <Typography variant='body2' color='textSecondary'>
        {secondaryParts.join(SEPARATOR)}
      </Typography>
    );

  const isLoading = downloadState?.status === LogDownloadStatus.LOADING;
  const onClick = isLoading ? undefined : log ? save : download;
  
  return (
    <ListItem button onClick={onClick}>
      <StatusLight
        status={
          {
            [LogDownloadStatus.LOADING]: 'next',
            [LogDownloadStatus.ERROR]: 'error',
            [LogDownloadStatus.SUCCESS]: 'success',
          }[downloadState?.status] ?? 'off'
        }
      />
      <ListItemText
        disableTypography
        primary={
          <Typography variant='body2'>
            {primaryParts.join(SEPARATOR)}
          </Typography>
        }
        secondary={secondaryComponent}
      />
      <ListItemSecondaryAction>
        <IconButton edge='end' disabled={isLoading} onClick={onClick}>
          {downloadState?.status === LogDownloadStatus.SUCCESS ? (
            <Save />
          ) : (
            <GetApp />
          )}
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

UAVLogListItem.propTypes = {
  id: PropTypes.string,
  kind: PropTypes.string,
  size: PropTypes.number,
  timestamp: PropTypes.number,
  uavId: PropTypes.string,
  triggerDownload: PropTypes.bool,
};

export default UAVLogListItem;