import { Button, TextField } from '@material-ui/core'
import { History } from 'history'
import * as React from 'react'
import { useState } from 'react'

import { signUp } from '../../services/auth.service'

interface SignUpFormProps {
  history: History
}

export default ({ history }: SignUpFormProps) => {
  const [ name, setName ] = useState('')
  const [ username, setUsername ] = useState('')
  const [ oldPassword, setOldPassword ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ error, setError ] = useState('')

  const updateName = ({ target }) => {
    setError('')
    setName(target.value)
  }

  const updateUsername = ({ target }) => {
    setError('')
    setUsername(target.value)
  }

  const updateOldPassword = ({ target }) => {
    setError('')
    setOldPassword(target.value)
  }

  const updateNewPassword = ({ target }) => {
    setError('')
    setPassword(target.value)
  }

  const maySignUp = () => {
    return !!(name && username && oldPassword && oldPassword === password)
  }

  const handleSignUp = () => {
    signUp({ username, password, name })
      .then(() => history.push('/sign-in'))
      .catch(err => setError(err.message || err))
  }

  const handleSignIn = () => {
    history.push('/sign-in')
  }

  return (
    <div className="SignUpForm Screen">
      <form>
        <legend>Sign up</legend>
        <div style={{ float: 'left', width: 'calc(50% - 10px)', paddingRight: '10px' }}>
          <TextField
            className="AuthScreen-text-field"
            label="Name"
            value={name}
            onChange={updateName}
            autoComplete="off"
            margin="normal"
          />
          <TextField
            className="AuthScreen-text-field"
            label="Username"
            value={username}
            onChange={updateUsername}
            autoComplete="off"
            margin="normal"
          />
        </div>  <div style={{ float: 'left', width: 'calc(50% - 10px)', paddingRight: '10px' }}>
          <TextField
            className="AuthScreen-text-field"
            label="Name"
            value={name}
            onChange={updateName}
            autoComplete="off"
            margin="normal"
          />
          <TextField
            className="AuthScreen-text-field"
            label="Username"
            value={username}
            onChange={updateUsername}
            autoComplete="off"
            margin="normal"
          />
        </div>
        <div style={{ float: 'right', width: 'calc(50% - 10px)', paddingRight: '10px' }}>
          <TextField
            className="AuthScreen-text-field"
            label="Old password"
            type="password"
            value={oldPassword}
            onChange={updateOldPassword}
            autoComplete="off"
            margin="normal"
          />
          <TextField
            className="AuthScreen-text-field"
            label="Password"
            type="password"
            value={password}
            onChange={updateNewPassword}
            autoComplete="off"
            margin="normal"
          />
        </div>
        <Button
          type="button"
          color="secondary"
          variant="contained"
          disabled={!maySignUp()}
          onClick={handleSignUp}
        >
          Sign Up
        </Button>
        <div className="AuthScreen-error">{error}</div>
        <span className="AuthScreen-alternative">
          Already have an account? <a onClick={handleSignIn}>Sign in here</a>
        </span>
      </form>
    </div>
  )
}
