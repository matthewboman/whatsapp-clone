import { IResolvers } from '../../../types'
import { RecipientProvider } from '../providers/recipient.provider'

export default {
  Mutation: {
    // TODO
    markAsReceived: async (obj, { chatId }) => false,
    // TODO
    markAsRead: async (obj, { chatId }) => false,
    removeChat: async (obj, { chatId }, { injector }) =>
      injector.get(RecipientProvider).removeChat(chatId),
    addMessage: async (obj, { chatId, content }, { injector }) =>
      injector.get(RecipientProvider).addMessage(chatId, content),
    removeMessages: async (obj, { chatId, messageIds, all }) =>
      injector.get(RecipientProvider).removeMessages(chatId, {
        messageIds: messageIds || undefined,
        all: all || false
      }),
  },
  Chat: {
    unreadMessages: async (chat, args, { injector }) =>
      injector.get(RecipientProvider).getChatUnreadMessagesCount(chat),
  },
  Message: {
    recipients: async (message, args, { injector }) =>
      injector.get(RecipientProvider).getMessageRecipients(message)
  },
  Recipient: {
    chat: async (recipient, args, { injector }) =>
      injector.get(RecipientProvider).getRecipientChat(recipient)
  }
} as IResolvers
