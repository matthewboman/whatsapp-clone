import { ModuleContext } from '@graphql-modules/core'

import { User } from '../../../entity/user'
import { IResolvers } from '../../../types'
import { UserProvider } from '../providers/user.provider'

export default {
  Query: {
    me: (obj: any, args: any, { injector }: any) => injector.get(UserProvider).getMe(),
    users: (obj, args, { injector }) => injector.get(UserProvider).getUsers()
  },
  Mutation: {
    updateUser: (obj: any, { name, picture }: any, { injector }: any) => injector.get(UserProvider).updateUser({
      name: name || '',
      picture: picture || ''
    })
  }
} as IResolvers
