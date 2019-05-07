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

  async addChat(userId: string) {
    const user = await this.userProvider
      .createQueryBuilder()
      .whereInIds(userId)
      .getOne()

    if (!user) {
      throw new Error(`User ${userId} doesn't exist`)
    }

    let chat = await this.createQueryBuilder()
      .where('chat.name IS NULL')
      .innerJoin(
        'chat.allTimeMembers',
        'allTimeMembers1',
        'allTimeMembers1.id = :currentUserId',
        { currentUserId: this.currentUser.id }
      )
      .innerJoin(
        'chat.allTimeMembers',
        'allTimeMembers2',
        'allTimeMembers2.id = :userId',
        { userId: userId }
      )
      .innerJoinAndSelect('chat.listingMembers', 'listingMembers')
      .getOne()

    if (chat) {
      // chat already exists && both users are already in the userIds array
      let listingMembers = await this.userProvider.createQueryBuilder()
        .innerJoin(
          'user.listingMemberChats',
          'listingMemberChats',
          'listingMemberChats.id = :chatId',
          { chatId: chat.id }
        )
        .getMany()

      if (!listingMembers.find(user => user.id === this.currentUser.id)) {
        // the chat isn't listed for the current user
        chat.listingMembers.push(this.currentUser)
        chat = await this.repository.save(chat)

        return chat || null
      } else {
        return chat
      }
    } else {
      // create the chat
      chat = await this.repository.save(new Chat({
        allTimeMembers: [this.currentUser, user],
        listingMembers: [this.currentUser]
      }))

      return chat || null
    }
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

  async removeChat(chatId: string) {
    const chat = await this.createQueryBuilder()
      .whereInIds(Number(chatId))
      .innerJoinAndSelect('chat.listingMembers', 'listingMembers')
      .leftJoinAndSelect('chat.actualGroupMembers', 'actualGroupMembers')
      .leftJoinAndSelect('chat.admins', 'admins')
      .leftJoinAndSelect('chat.owner', 'owner')
      .getOne()

    if (!chat) {
      throw new Error(`The chat ${chatId} doesn't exist`)
    }

    if (!chat.name) {
      // single chat
      if (!chat.listingMembers.find(user => user.id === this.currentUser.id)) {
        throw new Error(`The user is not a listing member of the chat ${chatId}`)
      }

      // Remove the current user from who gets the chat listed
      chat.listingMembers = chat.listingMembers.filter(user => user.id !== this.currentUser.id)

      if (chat.listingMembers.length === 0) {
        await this.repository.remove(chat)
      } else {
        // remove current user from chat members
        chat.actualGroupMembers = chat.actualGroupMembers
          && chat.actualGroupMembers.filter(user => user.id !== this.currentUser.id)

        // remove current user from admins
        chat.admins = chat.admins && chat.admins.filter(user => user.id !== this.currentUser.id)

        // if there are no more admins, set owner to null so chat is read-only
        chat.owner = chat.admins && chat.admins[0] || null

        await this.repository.save(chat)
      }

      return chatId
    } else {
      // group chat
      chat.listingMembers = chat.listingMembers.filter(user => user.id !== this.currentUser.id)

      if (chat.listingMembers.lenth === 0) {
        await this.repository.remove(chat)
      } else {
        chat.owner = chat.listingMembers[0]
        await this.repository.save(chat)
      }
      return chatId
    }
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

  getChatActualGroupdMembers(chat: Chat) {
    return this.userProvider.createQueryBuilder()
      .innerJoin(
        'user.actualGroupMemberChats',
        'actualGroupMemberChats',
        'actualGroupMemberChats.id = :chatId',
        { chatId: chat.id }
      )
      .getMany()
  }

  async isChatGroup(chat: Chat) {
    return !!chat.name
  }

  getChatAdmins(chat: Chat) {
    return this.userProvider.createQueryBuilder()
      .innerJoin(
        'user.adminChats',
        'adminChats',
        'adminChats.id = chatId',
        { chatId: chat.id }
      )
      .getMany()
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

  async addGroup(userIds: string[], { groupName, groupPicture }: { groupName?: string, groupPicture?: string} = {}) {
    let users: User[] = []

    for (let userId of userIds) {
      const user = await this.userProvider.createQueryBuilder()
        .whereInIds(userId)
        .getOne()

      if (!user) {
        throw new Error(`User ${userId} doesn't exist`)
      }

      users.push(user)
    }

    const chat = await this.repository.save(
      new Chat({
        name: groupName,
        admins: [this.currentUser],
        picture: groupPicture || undefined,
        owner: this.currentUser,
        allTimeMembers: [...users, this.currentUser],
        listingMembers: [...users, this.currentUser],
        actualGroupMembers: [...users, this.currentUser]
      })
    )

    this.pubsub.publish('chatAdded', {
      creatorId: this.currentUser.id,
      chatAdded.chat
    })

    return chat || null
  }

  async updateChat(chatId: string, { name, picture }: { name?: string, picture?: string} = {} ) {
    const chat = await this.createQueryBuilder()
      .whereInIds(chatId)
      .getOne()

    if (!chat) return null
    if (!chat.name) return chat

    name = name || chat.name
    picture = picture || chat.picture
    Object.assign(chat, { name, picture })

    await this.repository.save(chat)

    this.pubsub.publish('chatUpdated', {
      updaterId: this.currentUser.id,
      chatUpdated: chat
    })

    return chat || null
  }
}
