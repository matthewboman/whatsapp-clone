import { ModuleSessionInfo, OnRequest, OnConnect } from '@graphql-modules/core'
import { Injectable, ProviderScope } from '@graphql-modules/di'
import { Connection } from 'typeorm'
import bcrypt from 'bcrypt-nodejs'

import { User } from '../../../entity/user'

@Injectable({
  scope: ProviderScope.Session
})
export class AuthProvider implements OnRequest, OnConnect {
  currentUser: User

  constructor(
    private connection: Connection
  ) {}

  onRequest({ session }: ModuleSessionInfo) {
    if ('req' in session) {
      this.currentUser = session.req.user
    }
  }

  async onConnect(connectionParams: { authToken?: string }) {
    if (connectionParams.authToken) {
      // create a buffer and tell it the data coming is base64
      const buf = Buffer.from(connectionParams.authToken.split('')[1], 'base64')
      // read it back out as a string
      const [ username, password ]: string[] = buf.toString().split(':')
      const user = await this.signIn(username, password)

      if (user) {
        this.currentUser = user // set the context for the web socket
      } else {
        throw new Error('Wring credentials')
      }
    } else {
      throw new Error('Missing auth token')
    }
  }

  getUserByUsername(username: string) {
    return this.connection.getRepository(User).findOne({ where: { username } })
  }

  async signIn(username: string, password: string): Promise<User | false> {
    const user = await this.getUserByUsername(username)

    if (user && this.validPassword(password, user.password)) {
      return user
    } else {
      return false
    }
  }

  async signUp(username: string, password: string, name: string): Promise<User | false> {
    const userExists = !!(await this.getUserByUsername(username))

    if (!userExists) {
      const user = this.connection.manager.save(
        new User({
          username,
          password: this.generateHash(password),
          name
        })
      )
      return user
    } else {
      return false
    }
  }

  generateHash(password: string) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8))
  }

  validPassword(password: string, localPassword: string) {
    return bcrypt.compareSync(password, localPassword)
  }
}
