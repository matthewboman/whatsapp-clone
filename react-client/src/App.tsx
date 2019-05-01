import React from 'react'
import { BrowserRouter, Route, Redirect } from 'react-router-dom'

import AnimatedSwitch from './components/AnimatedSwitch'
import AuthScreen from './components/AuthScreen'
import ChatsListScreen from './components/ChatsListScreen'
import ChatRoomScreen from './components/ChatRoomScreen'
import NewChatScreen from './components/NewChatScreen'
import SettingsScreen from './components/SettingsScreen'
import { withAuth } from './services/auth.service'

const RedirectToChats = () => (
  <Redirect to="/chats" />
)

export default () => (
  <BrowserRouter>
    <AnimatedSwitch>
      <Route exact path="/sign-(in|up)" component={AuthScreen} />
      <Route exact path="/chats" component={withAuth(ChatsListScreen)} />
      <Route exact path="/chats/:chatId" component={withAuth(ChatRoomScreen)} />
      <Route exact path="/new-chat" component={withAuth(NewChatScreen)} />
      <Route exact path="/settings" component={withAuth(SettingsScreen)} />
      <Route component={RedirectToChats} />
    </AnimatedSwitch>
  </BrowserRouter>
)
