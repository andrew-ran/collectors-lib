import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
} from '../components/Admin/adminUi'

/** US-100. Minimal Tailwind pass via components/Admin/adminUi.ts -- the
 * admin screens weren't part of the design sprint (only the public views
 * were mocked up), so this is deliberately plain, not a real design. */
export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const login = useLogin()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate('/admin') })
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Admin login</h1>
      <form onSubmit={handleSubmit} className={`space-y-4 ${ADMIN_CARD}`}>
        <div>
          <label htmlFor="email" className={ADMIN_LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={ADMIN_INPUT}
          />
        </div>
        <div>
          <label htmlFor="password" className={ADMIN_LABEL}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className={ADMIN_INPUT}
          />
        </div>
        {login.isError && (
          <p role="alert" className="text-sm text-red-600">
            Invalid email or password.
          </p>
        )}
        <button
          type="submit"
          disabled={login.isPending}
          className={`w-full ${ADMIN_BUTTON_PRIMARY}`}
        >
          {login.isPending ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
