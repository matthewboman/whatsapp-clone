import React, { useState } from 'react'
import { Button } from '@material-ui/core'
import { Send as SendIcon } from '@material-ui/icons'
import { defaultDataIdFromObject } from 'apollo-cache-inmemory'
import gql from 'graphql-tag'
import { useMutation } from 'react-apollo-hooks'
import { time as uniqid } from 'uniqid'
import styled from 'styled-components'

import * as fragments from '../../graphql/fragments'
import { MessageBoxMutation, FullChat, Message } from '../../graphql/types'
import { useMe } from '../../services/auth.service'

const Style = styled.div`
  display: flex;
  height: 50px;
  padding: 5px;
  width: calc(100% - 10px)

  .MessageBox-input {
    width: calc(100% - 50px);
    border: none;
    border-radius: 999px;
    padding: 10px;
    padding-left: 20px;
    padding-right: 20px;
    font-size: 15px;
    outline: none;
    box-shadow: 0 1px silver;
    font-size: 18px;
    line-height: 45px;
  }

  .MessageBox-button {
    min-width: 50px;
    width: 50px;
    border-radius: 999px;
    background-color: var(--primary-bg);
    margin: 0 5px;
    margin-right: 0;
    color: white;
    padding-left: 20px;

    svg {
      margin-left: -3px;
    }
  }
`

const mutation = gql`
  mutation MessageBoxMutation($chatId: ID!, $content: String!) {
    addMessage(chatId: $chatId, content: $content) {
      ...Message
    }
  }
  ${fragments.message}
`

interface MessageBoxProps {
  chatId: string
}

export default ({ chatId }: MessageBoxProps) => {
  const [message, setMessage] = useState('')
  const me = useMe()

  const addMessage = useMutation<MessageBoxMutation.Mutation, MessageBoxMutation.Variables>(
    mutation,
    {
      variables: {
        chatId,
        content: message
      },
      optimisticResponse: {
        __typeName: 'Mutation',
        addMesage: {
          id: uniqid(),
          __typename: 'Message',
          chat: {
            id: chatId,
            __typename: 'Chat'
          },
          sender: {
            id: me.id,
            __typename: 'User',
            name: me.name,
          },
          content: message,
          createdAt: new Date(),
          type: 0,
          recipients: [],
          ownership: true
        }
      },
      update: (client, { data: { addMessage } }) => {
        client.writeFragment({
          id: defaultDataIdFromObject(addMesage),
          fragment: fragments.message,
          data: addMesage
        })

        let fullChat

        try {
          fullChat = client.readFragment<FullChat.Fragment>({
            id: defaultDataIdFromObject(addMesage.chat),
            fragment: fragments.fullChat,
            fragmentName: 'FullChat'
          })
        } catch(e) {}

        if (fullChat && !fullChat.messages.some(message => message.id === addMesage.id)) {
          fullChat.messages.push(addMesage)
          fullChat.lastMessage = addMesage

          client.writeFragment({
            id: defaultDataIdFromObject(addMesage.chat),
            fragment: fragments.fullChat,
            fragmentName: 'FullChat',
            data: fullChat
          })
        }
      }
    }
  )

  const onKeyPress = e => {
    if (e.charCode === 13) {
      submitMessage()
    }
  }

  const onChange = ({ target }) => {
    setMessage(target.value)
  }

  const submitMessage = () => {
    if (!message) return

    addMesage()
    setMessage('')
  }

  return (
    <Style className="MessageBox">
      <input
        className="MessageBox-input"
        type="text"
        placeholder="Type a message"
        value={message}
        onKeyPress={onKeyPress}
        onChange={onChange}
      />
      <Button
        variant="contained"
        color="primary"
        className="MessageBox-button"
        onClick={submitMessage}
      >
        <SendIcon />
      </Button>
    </Style>
  )
}
