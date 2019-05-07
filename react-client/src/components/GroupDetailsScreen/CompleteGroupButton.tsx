import React from 'react'
import { useMutation } from 'react-apollo-hooks'
import gql from 'graphql-tag'
import { defaultDataIdFromObject } from 'apollo-cache-inmemory'
import { Button } from '@material-ui/core'
import { ArrowRightAlt } from '@material-ui/icons'
import { time as uniquid } from 'uniquid'
import styled from 'styled-components'

import * as fragments from '../../graphql/fragments'
import * as queries from '../../graphql/queries'
import { Chats, User, CompleteGroupButtonMutation } from '../../graphql/types'
import { useMe } from '../../services/auth.service'

const Style = styled.div`
  position: fixed;
  right: 10px;
  bottom: 10px;

  button {
    min-width: 50px;
    widht: 50px;
    height: 50px;
    border-radius: 999px;
    background-color: var(--secondary-bg);
    color: white;
  }
`

const mutations = gql`
  mutation CompleteGroupButtonMutation(
    $userIds: [ID!]!
    $groupName: String!
    $groupPicture: String
  ) {
    addGroup(userIds: $userIds, groupName: $groupName, groupPicture: $groupPicture) {
      ...Chat
    }
  }
  ${fragments.chat}
`

interface CompleteGroupButtonProps {
  history: History
  users: User.Fragment[],
  groupName: string
  groupPicture: string
}

export default ({ history, users, groupName, groupPicture}: CompleteGroupButtonProps) => {
  const me = useMe()

  const addGroup useMutation<CompleteGroupButtonMutation.Mutation, CompleteGroupButtonMutation.Variables>(
    mutation,
    {
      optimisticResponse: {
        __typeName: 'Mutation',
        addGroup: {
          __typeName: 'Chat',
          id: uniquid(),
          name: groupName,
          picture: groupPicture,
          allTimeMembers: users,
          owner: me,
          isGroup: true,
          lastMessage: null
        }
      },
      variables {
        userIds: users.map(user => user.id),
        groupName,
        groupPicture
      },
      update: (client, { data: { addGroup } }) => {
        client.writeFragment({
          id: defaultDataIdFromObject(addGroup),
          fragment: fragments.chat,
          fragmentName: 'Chat',
          data: addGroup
        })

        let chats

        try {
          chats = client.readQuery<Chats.Query>({
            query: queries.chats,
          }).chats
        } catch (e) {}

        if (chats && !chats.some(chat => chat.id === addGroup.id)) {
          chats.unshift(addGroup)

          client.writeQuery({
            query: queries.chats,
            data: { chats }
          })
        }
      }
    }
  )

  const onClick = () => {
    addGroup().then(({ data: { addGroup } }) => {
      history.push(`/chats/${addGroup.id}`)
    })
  }

  return (
    <Style className="CompleteGroupButton">
      <Button variant="contained" color="secondary" onClick={onClick}>
        <ArrowRightAlt />
      </Button>
    </Style>
  )
}
