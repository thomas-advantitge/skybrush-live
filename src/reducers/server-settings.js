/**
 * @file Reducer function for handling the part of the state object that
 * stores the server to connect to.
 */

import { handleActions } from 'redux-actions'

/**
 * The default settings for the server to connect to, and whether the
 * server settings dialog is visible or not.
 */
const defaultState = {
  'hostName': 'flockwave.collmot.com',
  'port': 80,
  'dialogVisible': false
}

/**
 * The reducer function that handles actions related to the server
 * settings.
 */
const reducer = handleActions({

  SHOW_SERVER_SETTINGS_DIALOG (state, action) {
    return Object.assign({}, state, { 'dialogVisible': true })
  },

  CLOSE_SERVER_SETTINGS_DIALOG (state, action) {
    return Object.assign({}, state, action.payload, { 'dialogVisible': false })
  }

}, defaultState)

export default reducer
