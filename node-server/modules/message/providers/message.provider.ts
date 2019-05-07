import { Injectable } from '@graphql-modules/di'
import { Connection } from 'typeorm'
import { PubSub } from 'apollo-server-express'

import { MessageType } from '../../../db'
import { Chat } from '../../../entity/chat'
import { Message } from '../../../entity/message'
import { User } from '../../../entity/user'
import { AuthProvider } from '../../auth/providers/auth.provider'
import { ChatProvider } from '../../chat/providers/chat.provider'
import { UserProvider } from '../../user/providers/user.provider'

@Injectable()
export class MessageProvider {
  constructor(
    private connection: Connection,
    private pubsub: PubSub,
    private chatProvider: ChatProvider,
    private authProvider: AuthProvider,
    private userProvider: UserProvider
  ) {}

  repository = this.connection.getRepository(Message)
  currentUser = this.authProvider.currentUser

  createQueryBuilder() {
    return this.connection.createQueryBuilder(Message, 'message')
  }

  async addMessage(chatId: string, content: string) {
    if (content === null || content === '') {
      throw new Error(`Cannot add empy or null messages`)
    }

    let chat = await this.chatProvider.createQueryBuilder()
      .whereInIds(chatId)
      .innerJoinAndSelect('chat.allTimeMembers', 'allTimeMembers')
      .innerJoinAndSelect('chat.listingMembers', 'listingMembers')
      .leftJoinAndSelect('chat.actualGroupMembers', 'actualGroupMembers')
      .getOne()

    if (!chat) {
      throw new Error(`Cannot find chat ${chatId}`)
    }

    let holders: User[]

    if (!chat.name) {
      // single chat
      if (!chat.listingMembers.map(user => user.id).includes(this.currentUser.id)) {
        throw new Error(`The chat ${chatId} must be listed for the current user in order to add a message`)
      }

      const user = chat.allTimeMembers.find(user => user.id !== this.currentUser.id)

      if (!user) {
        throw new Error(`Cannot find the receiver`)
      }

      if (!chat.listingMembers.find(listingMember => listingMember.id === user.id)) {
        chat.listingMembers.push(user)
        await this.chatProvider.repository.save(chat)

        this.pubsub.publish('chatAdded', {
          creatorId: this.currentUser.id,
          chatAdded: chat
        })
      }

      holders = chat.listingMembers

    } else {
      if (!chat.actualGroupMembers || !chat.actualGroupMembers.find(user => user.id === this.currentUser.id)) {
        throw new Error(`The user is not a member of the group ${chatId}`)
      }
      holders = chat.actualGroupMembers
    }

    const message = await this.repository.save(new Message({
      chat,
      sender: this.currentUser,
      content,
      type: MessageType.TEXT,
      holders
    }))

    this.pubsub.publish('messageAdded', { messageAdded: message })

    return message || null
  }

  async _removeMessages(chatId: string, { messageIds, all }: { messageIds?: string[], all?: boolean } = {}) {
    const chat = await this.chatProvider
      .createQueryBuilder()
      .whereInIds(chatId)
      .innerJoinAndSelect('chat.listingMembers', 'listingMembers')
      .innerJoinAndSelect('chat.messages', 'messages')
      .innerJoinAndSelect('messages.holders', 'holders')
      .getOne()

    if (!chat) {
      throw new Error(`Cannot find chat ${chatId}`)
    }

    if (!chat.listingMembers.find(user => user.id === this.currentUser.id)) {
      throw new Error(`The chat/group ${chatId} is not listed for the current user`)
    }

    if (all && messageIds) {
      throw new Error(`Cannot specify both 'all' and 'messageIds'`)
    }

    if (!all && !messageIds) {
      throw new Error(`'all' or 'messageIds' must be specified`)
    }

    let deletedIds: string[] = []
    let removedMessages: Message[] = []

    chat.messages = await chat.messages.reduce<Promise<Message[]>>(async (filtered$, message) => {
      const filtered = await filtered$

      if (all || !messageIds.includes(message.id)) {
        deletedIds.push(message.id)
        message.holders = message.holders.filter(user => user.id !== this.currentUser.id)
      }

      if (message.holders.length === 0) {
        removedMessages.push(message)
      } else {
        await this.repository.save(message)
        filtered.push(mressage)
      }

      return filtered
    }, Promse.resolve([]))

    return { deletedIds, removedMessages }
  }

  async removeMessages(chatId: string, { messageIds, all }: { messageIds?: string, all?: boolean } = {}) {
    const { deletedIds, removedMessages } = await this._removeMessages(chatId, { messageIds, all })

    for (let message of removedMessages) {
      await this.repository.remove(message)
    }

    return deletedIds
  }

  async _removeChatGetMessages(chatId: string) {
    let messages = await this.createQueryBuilder()
      .innerJoin(
        'message.chat',
        'chat',
        'chat.id = :chatId',
        { chatId }
      )
      .innerJoinAndSelect('message.holders', 'holders')
      .getMany()

    messages = messages.map(message => ({
      ...message,
      holders: message.holders.filter(user => user.id !== this.currentUser.id)
    }))

    return messages
  }

  async removeChat(chatId: string, messages?: Message[]) {
    if (!messages) {
      messages = await this._removeChatGetMessages(chatId)
    }

    for (let message of messages) {
      message.holders = message.holders.filter(user => user.id !== this.currentUser.id)

      if (message.holders.length === 0) {
        await this.repository.remove(message)
      } else {
        await this.repository.save(message)
      }
    }
    return await this.chatProvider.removeChat(chatId)
  }

  async getMessageSender(message: Message) {
    const sender = await this.userProvider
      .createQueryBuilder()
      .innerJoin(
        'user.senderMessages',
        'senderMessages',
        'senderMessages.id = messageId', {
          messageId: message.id
        }
      )
      .getOne()

    if (!sender) {
      throw new Error('Message must have a sender')
    }
    return sender
  }

  async getMessageOwnership(message: Message) {
    return !!(await this.userProvider
      .createQueryBuilder()
      .whereInIds(this.currentUser.id)
      .innerJoin(
        'user.senderMessages',
        'senderMessages',
        'senderMessages.id = messageId',
        {
          messageId: message.id
        }
      )
      .getCount()
    )
  }

  async getMessageHolders(message: Message) {
    return await this.userProvider
      .createQueryBuilder()
      .innerJoin(
        'user.holderMessages',
        'holderMessages',
        'holderMessages.id = :messageId',
        { messageId: message.id }
      )
      .getMany()
  }

  async getMessageChat(message: Message) {
    const chat = await this.chatProvider
    .createQueryBuilder()
    .innerJoin(
      'chat.messages',
      'messages',
      'messages.id = :messageId',
      { messageId: message.id }
    )
    .getOne()

    if (!chat) {
      throw new Error('Message must have a chat')
    }
    return chat
  }

  async getChats() {
    const chats = await this.chatProvider
      .createQueryBuilder()
      .leftJoin(
        'chat.listingMembers',
        'listingMembers'
      )
      .where('listingMembers.id = :id', { id: this.currentUser.id })
      .getMany()

    for (let chat of chats) {
      chat.messages = await this.getChatMessages(chat)
    }

    return chats.sort((chatA, chatB) => {
      const dateA = chatA.messages.length
        ? chatA.messages[chatA.messages.length - 1].createdAt
        : chatA.createdAt
      const dateB = chatB.messages.length
        ? chatB.messages[chatB.messages.length - 1].createdAt
        : chatB.createdAt
      return dateB.valueOf() - dateA.valueOf()
    })
  }

  async getChatMessages(chat: Chat, amount?: number) {
    if (chat.messages) {
      return amount ? chat.messages.slice(-amount) : chat.messages
    }

    let query = this.createQueryBuilder()
      .innerJoin(
        'message.chat',
        'chat',
        'chat.id = :chatId',
        { chatId: chat.id }
      )
      .innerJoin(
        'message.holders',
        'holders',
        'holders.id = :userId',
        { userId: this.currentUser.id }
      )
      .orderBy({
        'message.createdAt': {
          order: 'DESC',
          nulls: 'NULLS LAST'
        }
      })

    if (amount) {
      query = query.take(amount)
    }
    return (await query.getMany()).reverse()
  }

  async getChatLastMessage(chat: Chat) {
    if (chat.messages) {
      return chat.messages.length
        ? chat.messages[chat.messages.length - 1]
        : null
    }
    const messages = await this.getChatMessages(chat, 1)
    return messages && messages.length ? messages[0] : null
  }

  async getChatUpdatedAt(chat: Chat) {
    if (chat.messages) {
      return chat.messages.length
        ? chat.messages[0].createdAt
        : null
    }

    const latestMessage = await this.createQueryBuilder()
      .innerJoin(
        'message.chat',
        'chat',
        'chat.id = :chatId',
        { chatId: chat.id }
      )
      .innerJoin(
        'message.holders',
        'holders',
        'holders.id = :userId',
        {
          userId: this.currentUser.id
        }
      )
      .orderBy({ 'message.createdAt': 'DESC' })
      .getOne()

    return latestMessage ? latestMessage.createdAt : null
  }

  async filterMessageAdded(messageAdded: Message) {
    let users: User[]

    if (!messageAdded.chat.name) {
      // chat
      users = await this.userProvider.createQueryBuilder()
        .innerJoin(
          'user.listingMemberChats',
          'listingMemberChats',
          'listingMemberChats.id = :chatId',
          { chatId: messageAdded.chat.id }
        )
        .getMany()
    } else {
      // group
      users = await this.userProvider.createQueryBuilder()
        .innerJoin(
          'user.actualGroupMemberChats',
          'actualGroupMemberChats',
          'actualGroupMemberChats.id = :chatId',
          { chatId: messageAdded.chat.id }
        )
        .getMany()
    }

    const relevantUsers = users.filter(user => user.id != messageAdded.sender.id)
    return relevantUsers.some(user => user.id === this.currentUser.id)
  }
}
