import { GraphQLModule } from '@graphql-modules/core'
import { loadResolversFiles, loadSchemaFiles } from '@graphql-modules/sonar'

import { AuthModule } from '../auth'
import { ChatModule } from '../chat'
import { MessageModule } from '../message'
import { UserModule } from '../user'
import { RecipientProvider } from './providers/recipient.provider'

export const RecipientModule = new GraphQLModule({
  name: 'Recipient',
  import: [
    AuthModule,
    ChatModule,
    MessageModule,
    UserModule
  ],
  providers: [
    RecipientProvider
  ],
  typeDefs: loadSchemaFiles(__dirname + '/schema/'),
  resolvers: loadResolversFiles(__dirname + '/resolvers/')
})
