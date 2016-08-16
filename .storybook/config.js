import { configure } from '@kadira/storybook'
import injectTapEventPlugin from 'react-tap-event-plugin'

require('../assets/css/screen.less')
require('../assets/css/chat.less')
require('../assets/css/kbd.css')

// Enable tap events on the UI
injectTapEventPlugin()

function loadStories () {
  require('../src/stories/ChatArea')
  require('../src/stories/ChatBubble')
  require('../src/stories/ConnectionList')
}

configure(loadStories, module)