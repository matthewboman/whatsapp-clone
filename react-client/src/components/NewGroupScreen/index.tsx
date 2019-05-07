import React, { useState, Suspense } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import styled from 'styled-components'

import Navbar from '../Navbar'
import UsersList from '../UsersList'
import CreateGroupButton from './CreateGroupButton'
import NewGroupNavbar from './NewGroupNavbar'
import NewGroupButton from './NewGroupButton'

const Style = styled.div`
  .UsersList {
    height: calc(100% - 56px);
    overflow-y: overlay;
  }
`

export default ({ history }: RouteComponentProps) => {
  const [selectedUsers, setSelectedUsers] = useState([])

  return (
    <Style className="NewGroupScreen Screen">
      <Navbar>
        <NewGroupNavbar history={history} />
      </Navbar>
      <div className="NewChatScreen-users-list">
        <NewGroupButton history={history} />
        <Suspense fallback={null}>
          <UsersList selectable onSelectionChange={setSelectedUsers} />
        </Suspense>
      </div>
      {
        !!selectedUsers.length && <CreateGroupButton history={history} />
      }
    </Style>
  )
}
