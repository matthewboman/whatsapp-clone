import React from 'react'
import { History } from 'history'
import { Button } from '@material-ui/core'
import { ArrowBack as ArrowBackIcon } from '@material-ui/icons'
import styled from 'styled-components'

const Style = styled.div`
  padding: 0;
  display: flex;
  flex-direction: row;
  margin-left: -20px;

  .GroupDetailsNavbar-title {
    line-height: 56px;
  }

  .GroupDetailsNavbar-back-button {
    color: var(--primary-text);
  }
`

interface GroupDetailsNavbarProps {
  history: History
}

export default ({ history }: GroupDetailsNavbarProps) => {
  const navToNewGroup = () => {
    history.push('/new-chat-group')
  }

  return (
    <Style className="GroupDetailsNavbar">
      <Button className="GroupDetailsNavbar-back-button" onClick={navNewToGroup}>
        <ArrowBackIcon />
      </Button>
      <div className="GroupDetailsNavbar-title">Group Details</div>
    </Style>
  )
}
