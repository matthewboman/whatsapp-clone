import { Injectable } from '@graphql-modules/di'
import { Connection } from 'typeorm'
import { PubSub } from 'apollo-server-express'

import { Chat } from '../../../entity/chat'
import { User } from '../../../entity/user'
import { AuthProvider } from '../../auth/providers/auth.provider'
import { UserProvider } from '../../user/providers/user.provider'

@Injectable()
export class ChatProvider {
  constructor(
    private pubsub: PubSub,
    private connection: Connection,
    private userProvider: UserProvider,
    private authProvider: AuthProvider
  ) {}

  repository = this.connection.getRepository(Chat)
  currentUser = this.authProvider.currentUser

  createQueryBuilder() {
    return this.connection.createQueryBuilder(Chat, 'chat')
  }

  async getChat(chatId: string) {
    const chat = await this.createQueryBuilder()
      .whereInIds(chatId)
      .getOne()

    return chat || null
  }

  async getChatName(chat: Chat) {
    if(chat.name) {
      return chat.name
    }

    const user = await this.userProvider
      .createQueryBuilder()
      .where('user.id != :userId', { userId: this.currentUser.id })
      .innerJoin(
        'user.allTimeMemberChats',
        'allTimeMemberChats',
        'allTimeMemberChats.id = :chatId',
        { chatId: chat.id }
      )
      .getOne()

    return (user && user.name) || null
  }

  async getChatPicture(chat: Chat) {
    if (chat.name) {
      return chat.picture
    }

    const user = await this.userProvider
      .createQueryBuilder()
      .where('user.id != :userId', { userId: this.currentUser.id })
      .innerJoin(
        'user.allTimeMemberChats',
        'allTimeMemberChats',
        'allTimeMemberChats.id = :chatId',
        { chatId: chat.id }
      )
      .getOne()

    return user ? user.picture : null
  }

  getChatAllTimeMembers(chat: Chat) {
    return this.userProvider
      .createQueryBuilder()
      .innerJoin(
        'user.listingMemberChats',
        'listingMemberChats',
        'listingMemberChats.id = :chatId',
        { chatId: chat.id }
      )
      .getMany()
  }

  getChatListingMembers(chat: Chat) {
    return this.userProvider
      .createQueryBuilder()
      .innerJoin(
        'user.listingMemberChats',
        'listingMemberChats',
        'listingMemberChats.id = :chatId',
        { chatId: chat.id }
      )
      .getMany()
  }

  async getChatOwner(chat: Chat) {
    const owner = await this.userProvider
      .createQueryBuilder()
      .innerJoin(
        'user.ownerChats',
        'ownerChats',
        'ownerChats.id = :chatId',
        { chatId: chat.id }
      )
      .getOne()
    return owner || null
  }

  async filterChatAddedOrUpdated(chatAddedOrUpdated: Chat, creatorOrUpdaterId: string) {
    return (
      creatorOrUpdaterId !== this.currentUser.id &&
      chatAddedOrUpdated.listingMembers.some((user: User) => user.id === this.currentUser.id)
    )
  }

  async updateUser({ name, picture }: { name?: string, picture?: string} = {}) {
    await this.userProvider.updateUser({ name, picture })

    const data = await this.connection
      .createQueryBuilder(User, 'user')
      .where('user.id = :id', { id: this.currentUser.id })
      // get a list of the chats who have/had currentUser involved
      .innerJoinAndSelect(
        'user.allTimeMemberChats',
        'allTimeMemberChats',
        // groups are unaffected
        'allTimeMemberChats.name IS NULL'
      )
      // we need to notify only those who get the chat listed
      .innerJoin(
        'allTimeMemberChats.listingMembers',
        'listingMembers',
        'listingMembers.id != :currentUserId',
        {
          currentUserId: this.currentUser.id
        }
      )
      .getOne()

    const chatsAffected = (data && data.allTimeMemberChats) || []

    chatsAffected.forEach(chat => {
      this.pubsub.publish('chatUpdated', {
        updaterId: this.currentUser.id,
        chatUpdated: chat
      })
    })

    return this.currentUser
  }
}
