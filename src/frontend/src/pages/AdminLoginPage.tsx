import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'

/** US-100. Plain, unstyled form for now -- the admin screens weren't part
 * of the design sprint (only the public views were mocked up); this just
 * needs to work end-to-end against the backend. */
export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const login = useLogin()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/admin') },
    )
  }

  return (
    <div style={{ maxWidth: 320, margin: '4rem auto' }}>
      <h1>Admin login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {login.isError && (
          <p role="alert" style={{ color: 'crimson' }}>
            Invalid email or password.
          </p>
        )}
        <button type="submit" disabled={login.isPending} style={{ marginTop: 12 }}>
          {login.isPending ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
