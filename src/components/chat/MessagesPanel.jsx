/**
 * @file The "Messages" dialog that allows the user to send console messages
 * to the UAVs.
 */

import _, { flatMap, isNil } from 'lodash'
import CircularProgress from 'material-ui/CircularProgress'
import TextField from 'material-ui/TextField'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { addInboundMessage, addOutboundMessageToSelectedUAV,
  addErrorMessageInMessagesDialog } from '../../actions/messages'
import ActiveUAVsField from '../ActiveUAVsField'
import BackgroundHint from '../BackgroundHint'
import { ChatArea, ChatBubble, Marker } from '../chat'
import Flock from '../../model/flock'
import { MessageType } from '../../model/messages'
import messageHub from '../../message-hub'

/**
 * Converts a message object from the Redux store into React components
 * that can render it nicely.
 *
 * @param {Object} message  the message to convert
 * @return {React.Component[]}  the React components that render the message
 */
function convertMessageToComponent (message) {
  const keyBase = `message${message.id}`
  const inProgress = !message.responseId
  switch (message.type) {
    case MessageType.OUTBOUND:
      return [
        <ChatBubble key={keyBase} author={message.author} own
          date={message.date} body={message.body}
          rightComponent={inProgress ? <CircularProgress size={30} thickness={1.75} style={{ margin: 10 }} /> : false}
        />
      ]

    case MessageType.INBOUND:
      return [
        <ChatBubble key={keyBase} author={message.author} own={false}
          date={message.date} body={message.body} />
      ]

    case MessageType.ERROR:
      return [
        <Marker key={keyBase + 'Marker'} level={'error'}
          message={message.body} />
      ]

    default:
      return [
        <Marker key={keyBase + 'Marker'} level={'error'}
          message={`Invalid message type: ${message.type}`} />
      ]
  }
}

/**
 * Converts a collection of message objects from the Redux store into React
 * component that can render them nicely.
 *
 * @param {Object[]} messages  the messages to convert
 * @param {boolean}  textFieldsBelow  whether the text fields are below
 *        the chat area (true) or above it
 * @return {React.Component[]}  the React components that render the message
 */
function convertMessagesToComponents (messages, textFieldsBelow) {
  if (isNil(messages)) {
    return [
      <BackgroundHint key="backgroundHint" header="No UAV selected"
        text="Enter the ID of a UAV to talk to in the lower left corner" />
    ]
  } else if (messages.length === 0) {
    const hint = `Send a message to the selected UAV using the text box ${textFieldsBelow ? 'below' : 'above'}`
    return [
      <BackgroundHint key="backgroundHint" header="No messages" text={hint} />
    ]
  } else {
    return flatMap(messages, convertMessageToComponent)
  }
}

/**
 * Presentation component for the "Messages" panel, containing a text field
 * to type the messages into, and a target UAV selector.
 */
class MessagesPanelPresentation extends React.Component {
  constructor (props) {
    super(props)
    this._textFieldKeyDownHandler = this._textFieldKeyDownHandler.bind(this)
  }

  render () {
    const { chatEntries, flock, selectedUAVId, style, textFieldsAtBottom } = this.props
    const chatComponents = convertMessagesToComponents(chatEntries, textFieldsAtBottom)
    const contentStyle = Object.assign({
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }, style)
    const chatArea = <ChatArea key={'chatArea'}>{chatComponents}</ChatArea>
    const textFields =
      <div key="textFieldContainer" style={{ display: 'flex' }}>
        <ActiveUAVsField style={{ width: '8em', paddingRight: '1em' }}
          flock={flock} />
        <TextField fullWidth hintText="Message"
          onKeyDown={this._textFieldKeyDownHandler}
          disabled={isNil(selectedUAVId)} />
      </div>
    const children = textFieldsAtBottom ? [chatArea, textFields] : [textFields, chatArea]
    return <div style={contentStyle}>{children}</div>
  }

  /**
   * Handler called when the user presses a key in the message text field.
   * Sends the message if the user presses Enter.
   *
   * @param  {KeyboardEvent} event  the DOM event for the keypress
   * @return {undefined}
   */
  _textFieldKeyDownHandler (event) {
    if (event.keyCode === 13) {
      this.props.onSend(event.target.value)
      event.target.value = ''
    }
  }
}

MessagesPanelPresentation.propTypes = {
  chatEntries: PropTypes.arrayOf(PropTypes.object),
  flock: PropTypes.instanceOf(Flock),
  onSend: PropTypes.func,
  selectedUAVId: PropTypes.string,
  style: PropTypes.object,
  textFieldsAtBottom: PropTypes.bool.isRequired
}

MessagesPanelPresentation.defaultProps = {
  textFieldsAtBottom: false
}

/**
 * Messages panel container component to bind it to the Redux store.
 */
const MessagesPanel = connect(
  // mapStateToProps
  state => {
    const { messages } = state
    const { selectedUAVId } = messages
    const messageIds = selectedUAVId
      ? messages.uavIdsToMessageIds[selectedUAVId] : []
    const chatEntries = selectedUAVId
      ? _(messageIds).map(id => messages.byId[id]).reject(isNil).value()
      : null
    return {
      chatEntries,
      selectedUAVId
    }
  },

  // mapDispatchToProps
  dispatch => ({
    onSend (message) {
      // Dispatch a Redux action. This will update the store but will not
      // send any actual message
      const action = addOutboundMessageToSelectedUAV(message)
      dispatch(action)

      // Now also send the message via the message hub
      const { uavId, messageId } = action
      messageHub.sendCommandRequest(uavId, message).then(
        // success handler
        message => {
          const { response } = message.body
          dispatch(addInboundMessage(response, messageId))
        },
        // error handler
        error => {
          const message = error.userMessage || error.message
          dispatch(addErrorMessageInMessagesDialog(message, uavId, messageId))
        }
      )
    }
  }),
  null,
  { withRef: true }
)(MessagesPanelPresentation)

export default MessagesPanel
