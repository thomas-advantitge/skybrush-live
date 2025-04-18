import {
  add,
  endOfDay,
  fromUnixTime,
  getUnixTime,
  isPast,
  isValid,
  setSeconds,
  startOfDay,
  startOfSecond,
} from 'date-fns';
import type { FormApi } from 'final-form';
import type { TFunction } from 'i18next';
import {
  Checkboxes,
  KeyboardDatePicker,
  KeyboardTimePicker,
  Select,
} from 'mui-rff';
import React, { useMemo } from 'react';
import { Form, type FormProps } from 'react-final-form';
import { useTranslation, withTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import DateFnsUtils from '@date-io/date-fns';

import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import FormGroup from '@material-ui/core/FormGroup';
import MenuItem from '@material-ui/core/MenuItem';
import AccessTime from '@material-ui/icons/AccessTime';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';

import Header from '@skybrush/mui-components/lib/FormHeader';

import { HMSDurationField } from '~/components/forms/fields';
import { CommonClockId } from '~/features/clocks/types';
import { authorizeIfAndOnlyIfHasStartTime } from '~/features/show/actions';
import { StartMethod } from '~/features/show/enums';
import {
  closeStartTimeDialog,
  setStartMethod,
  setStartTime,
  synchronizeShowSettings,
} from '~/features/show/slice';
import type { RootState } from '~/store/reducers';
import { formatDurationHMS } from '~/utils/formatting';
import { parseDurationHMS } from '~/utils/parsing';

import StartTimeDisplay from './StartTimeDisplay';
import type { StartTimeSuggestion } from './StartTimeSuggestions';
import StartTimeSuggestionsBox from './StartTimeSuggestionsBox';

enum LocalClockId {
  ABSOLUTE = '__local__',
  RELATIVE = '__local_relative__',
}

/* Not all clock IDs are allowed for the start time; here we explicitly
 * describe which ones are allowed. */
type AllowedClockIdsForStartTime =
  | LocalClockId.ABSOLUTE
  | LocalClockId.RELATIVE
  | CommonClockId.MTC;

/** Type guard for AllowedClockIdsForStartTime */
const validateClockIdForStartTimeForm = (
  clock: any
): clock is AllowedClockIdsForStartTime => {
  return (
    clock === LocalClockId.ABSOLUTE ||
    clock === LocalClockId.RELATIVE ||
    clock === CommonClockId.MTC
  );
};

type StartTimeFormValues = {
  authorizeWhenSettingStartTime: boolean;
  clock: AllowedClockIdsForStartTime;
  method: StartMethod;
  timeOnClock: string;
  utcDate: Date;
  utcTime: Date;
};

type FormErrors = { [P in keyof StartTimeFormValues]?: ReturnType<TFunction> };

function createDateTimeFromParts(date: Date, time: Date): Date {
  const result = startOfDay(date);
  result.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
  return result;
}

const makeFormValidator =
  (t: TFunction) =>
  (values: StartTimeFormValues): FormErrors => {
    const errors: FormErrors = {};

    if (!isValid(values.utcDate)) {
      errors.utcDate = t('startTimeDialog.errors.invalidDate');
    } else if (!isValid(values.utcTime)) {
      errors.utcTime = t('startTimeDialog.errors.invalidTime');
    } else if (values.clock === LocalClockId.ABSOLUTE) {
      /* both start date and start time are valid. We need to check whether
       * they are in the past only if the start time is based on an absolute
       * timestamp and not a fixed delay (or MIDI timecode).
       */
      if (isPast(endOfDay(values.utcDate))) {
        errors.utcDate = t('startTimeDialog.errors.pastDate');
      } else {
        const dateTime = createDateTimeFromParts(
          values.utcDate,
          values.utcTime
        );
        if (isPast(dateTime)) {
          errors.utcTime = t('startTimeDialog.errors.pastTime');
        }
      }
    }

    return errors;
  };

const setStartTimeFromSuggestion = (
  form: FormApi<StartTimeFormValues>,
  suggestion: StartTimeSuggestion
): void => {
  const { time, relative } = suggestion;

  if (relative) {
    form.change('clock', LocalClockId.RELATIVE);
    form.change('timeOnClock', formatDurationHMS(time, { padHours: true }));
  } else {
    form.batch(() => {
      form.change('clock', LocalClockId.ABSOLUTE);
      form.change('utcDate', time);
      form.change('utcTime', time);
    });
  }
};

type StartTimeFormPresentationProps = Readonly<{
  alwaysAllowSubmission: boolean;
  onClose: () => void;
}> &
  Pick<FormProps<StartTimeFormValues>, 'onSubmit' | 'initialValues'>;

/**
 * Form in the start time management dialog that keeps track of the changes
 * made by the user before the changes are submitted.
 */
const StartTimeFormPresentation = ({
  alwaysAllowSubmission,
  initialValues,
  onClose,
  onSubmit,
}: StartTimeFormPresentationProps): JSX.Element => {
  const { t } = useTranslation();
  const validateForm = useMemo(() => makeFormValidator(t), [t]);

  return (
    <Form
      initialValues={initialValues}
      validate={validateForm}
      onSubmit={onSubmit}
    >
      {({ dirty, form, handleSubmit, invalid, values }) => (
        <form id='start-time-form' onSubmit={handleSubmit}>
          <DialogContent>
            <StartTimeDisplay />

            <Box mt={2}>
              <Header>{t('startTimeDialog.setTheStartTime')}</Header>
            </Box>

            <FormGroup row>
              <Box mr={1} minWidth={180}>
                <Select
                  labelId='reference-clock-label'
                  name='clock'
                  label={t('startTimeDialog.reference')}
                  formControlProps={{
                    fullWidth: true,
                    margin: 'dense',
                    variant: 'filled',
                  }}
                >
                  <MenuItem value={LocalClockId.ABSOLUTE}>
                    {t('startTimeDialog.localTime')}
                  </MenuItem>
                  <MenuItem value={LocalClockId.RELATIVE}>
                    {t('startTimeDialog.localTimeRelative')}
                  </MenuItem>
                  <MenuItem value={CommonClockId.MTC}>
                    {t('startTimeDialog.SMPTETimecode')}
                  </MenuItem>
                </Select>
              </Box>

              {values.clock === LocalClockId.ABSOLUTE ? (
                <>
                  {/* we use separate pickers for the date and the time; this is
                   * because in most cases the date should default to the current
                   * day, but the time needs to be adjusted by the user */}

                  <Box flex={1} mr={1}>
                    <KeyboardDatePicker
                      disablePast
                      format='yyyy-MM-dd'
                      fullWidth={false}
                      inputVariant='filled'
                      label={t('startTimeDialog.startDate')}
                      margin='dense'
                      name='utcDate'
                      variant='dialog'
                    />
                  </Box>
                  <Box flex={1}>
                    <KeyboardTimePicker
                      ampm={false}
                      format='HH:mm:ss'
                      fullWidth={false}
                      inputVariant='filled'
                      keyboardIcon={<AccessTime />}
                      label={t('startTimeDialog.startTime')}
                      margin='dense'
                      name='utcTime'
                      variant='dialog'
                    />
                  </Box>
                </>
              ) : (
                <Box flex={1}>
                  <HMSDurationField
                    label={t('startTimeDialog.startTimeHms')}
                    margin='dense'
                    name='timeOnClock'
                    variant='filled'
                  />
                </Box>
              )}
            </FormGroup>

            {(values.clock === LocalClockId.ABSOLUTE ||
              values.clock === LocalClockId.RELATIVE) && (
              <StartTimeSuggestionsBox
                label={t('startTimeDialog.suggestions')}
                onChange={(suggestion) => {
                  setStartTimeFromSuggestion(form, suggestion);
                }}
              />
            )}

            <Box mt={2}>
              <Header>
                {invalid ? 'invalid' : t('startTimeDialog.additionalSettings')}
              </Header>
            </Box>

            <Select
              labelId='start-signal-label'
              name='method'
              label={t('startTimeDialog.startSignal')}
              formControlProps={{
                fullWidth: true,
                margin: 'dense',
                variant: 'filled',
              }}
            >
              <MenuItem value={StartMethod.RC}>
                {t('startTimeDialog.startShowWithRC')}
              </MenuItem>
              <MenuItem value={StartMethod.AUTO}>
                {t('startTimeDialog.startShowAuto')}
              </MenuItem>
            </Select>

            <Checkboxes
              name='authorizeWhenSettingStartTime'
              data={{
                label: t('startTimeDialog.authorizeWhenSettingStartTime'),
                value: true,
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              disabled={!dirty}
              onClick={() => {
                form.reset();
              }}
            >
              {t('startTimeDialog.resetForm')}
            </Button>
            {onClose && (
              <Button onClick={onClose}>{t('general.action.close')}</Button>
            )}
            <Button
              color='primary'
              type='submit'
              disabled={invalid || (!alwaysAllowSubmission && !dirty)}
            >
              {t('startTimeDialog.setNewStartTime')}
            </Button>
          </DialogActions>
        </form>
      )}
    </Form>
  );
};

const StartTimeForm = withTranslation()(StartTimeFormPresentation);

type StartTimeDialogProps = Readonly<{
  authorizeWhenSettingStartTime?: boolean;
  clock?: string;
  method?: StartMethod;
  onClose: () => void;
  onUpdateSettings: (values: StartTimeFormValues) => void;
  open?: boolean;
  timeOnClock?: number;
  utcTime?: number;
}>;

/**
 * Presentation component for the dialog that allows the user to set up the
 * start time and the start method of the drone show.
 */
const StartTimeDialog = ({
  authorizeWhenSettingStartTime = false,
  clock,
  method = StartMethod.RC,
  open = false,
  onClose,
  onUpdateSettings,
  timeOnClock,
  utcTime,
}: StartTimeDialogProps): JSX.Element => {
  const hasUtcStartTime = typeof utcTime === 'number';
  const hasStartTimeOnClock = typeof timeOnClock === 'number';
  const startDateTimeInUtc = hasUtcStartTime
    ? fromUnixTime(utcTime)
    : setSeconds(add(new Date(), { minutes: 30 }), 0);
  const initialStartTimeOnClock = hasStartTimeOnClock ? timeOnClock : 0;
  const initialClock = validateClockIdForStartTimeForm(clock)
    ? clock
    : LocalClockId.ABSOLUTE;

  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <Dialog fullWidth open={open} maxWidth='sm' onClose={onClose}>
        <StartTimeForm
          alwaysAllowSubmission={!hasUtcStartTime}
          initialValues={{
            authorizeWhenSettingStartTime,
            method,
            clock: initialClock,
            timeOnClock: formatDurationHMS(initialStartTimeOnClock, {
              padHours: true,
            }),
            utcDate: startOfDay(startDateTimeInUtc),
            utcTime: startDateTimeInUtc,
          }}
          onClose={onClose}
          onSubmit={onUpdateSettings}
        />
      </Dialog>
    </MuiPickersUtilsProvider>
  );
};

export default connect(
  // mapStateToProps
  (state: RootState) => ({
    ...state.show.startTimeDialog,
    ...state.show.start,
  }),

  // mapDispatchToProps
  (dispatch) => ({
    onClose(): void {
      dispatch(closeStartTimeDialog());
    },

    onUpdateSettings({
      authorizeWhenSettingStartTime,
      clock,
      method,
      timeOnClock,
      utcDate,
      utcTime,
    }: StartTimeFormValues): void {
      dispatch(setStartMethod(method));

      if (clock === LocalClockId.ABSOLUTE) {
        /* Absolute start time formed from utcDate and utcTime */
        dispatch(
          setStartTime({
            time: getUnixTime(createDateTimeFromParts(utcDate, utcTime)),
            clock: undefined,
          })
        );
      } else if (clock === LocalClockId.RELATIVE) {
        /* Relative start time formed by adding timeOnClock to the current time */
        const parsedTime = parseDurationHMS(timeOnClock);
        dispatch(
          setStartTime({
            time: Number.isNaN(parsedTime)
              ? undefined
              : getUnixTime(
                  startOfSecond(add(Date.now(), { seconds: parsedTime }))
                ),
            clock: undefined,
          })
        );
      } else {
        /* Server clock based start time formed by parsing timeOnClock */
        const parsedTime = parseDurationHMS(timeOnClock);
        dispatch(
          setStartTime({
            time: Number.isNaN(parsedTime) ? undefined : parsedTime,
            clock,
          })
        );
      }

      if (authorizeWhenSettingStartTime) {
        dispatch(authorizeIfAndOnlyIfHasStartTime() as any);
      }

      dispatch(synchronizeShowSettings('toServer'));

      dispatch(closeStartTimeDialog({ authorizeWhenSettingStartTime }));
    },
  })
)(StartTimeDialog);
