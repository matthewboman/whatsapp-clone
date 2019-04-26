import gql from 'graphql-tag'
import * as fragments from '../fragments'

export default gql`
  subscription ChatUpdate {
    chatUpdated {
      ...Chat
    }
  }
  ${fragments.chat}
`
