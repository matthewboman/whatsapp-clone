import React from 'react'
import { History } from 'history'
import { Button } from '@material-ui/core'
import { ArrowBack as ArrrowBackIcon } from '@material-ui/icons'
import styled from 'styled-components'

const Style = styled.div`
  padding: 0;
  display: flex;
  flex-direction: row;
  margin-left: -20px;

  .NewChatNavbar-title {
    line-height: 56px;
  }

  .NewChatNavbar-back-button {
    color: var(--primary-text);
  }
`

interface NewChatNavbarProps {
  history: History
}

export default ({ history }: NewChatNavbarProps) => {
  const navToChats = () => {
    history.push('/chats')
  }

  return (
    <Style className="NewChatNavbar">
      <Button className="NewChatNavbar-back-button" onClick={navToChats}>
        <ArrrowBackIcon />
      </Button>
      <div className="NewChatNavbar-title">New Chat</div>
    </Style>
  )
}
