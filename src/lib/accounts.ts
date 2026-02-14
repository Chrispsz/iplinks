export interface IptvAccount {
  id: string
  host: string
  username: string
  password: string
  name?: string
  addedAt: number
  lastChecked?: number
  status?: 'active' | 'expired' | 'offline' | 'disabled' | 'checking'
  expiresAt?: string
  latency?: number
}

export interface Credentials {
  host: string
  username: string
  password: string
  raw: string
}

export class AccountManager {
  private static STORAGE_KEY = 'iptv_accounts'
  private static CREDENTIALS_KEY = 'iptv_credentials'
  private static SELECTED_KEY = 'iptv_selected_account'

  static parseCredentials(text: string): Credentials {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    let host = '', username = '', password = ''

    for (const line of lines) {
      const lower = line.toLowerCase()
      if (lower.includes('servidor:') || lower.includes('host:')) {
        host = line.split(/[:]\s+/i)[1]?.trim() || ''
      } else if (lower.includes('usuário:') || lower.includes('user:') || lower.includes('username:')) {
        username = line.split(/[:]\s+/i)[1]?.trim() || ''
      } else if (lower.includes('senha:') || lower.includes('password:') || lower.includes('pass:')) {
        password = line.split(/[:]\s+/i)[1]?.trim() || ''
      }
    }

    if (!host && !username && !password && lines.length >= 3) {
      host = lines[0]
      username = lines[1]
      password = lines[2]
    }

    return { host, username, password, raw: text }
  }

  static getAllAccounts(): IptvAccount[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      this.clearAll()
      return []
    }
  }

  static addAccount(account: Omit<IptvAccount, 'id' | 'addedAt'>): IptvAccount {
    const accounts = this.getAllAccounts()

    // Verifica se já existe uma conta com o mesmo host e username
    const existingIndex = accounts.findIndex(
      acc => acc.host === account.host && acc.username === account.username
    )

    if (existingIndex !== -1) {
      // Atualiza a conta existente
      const updatedAccount: IptvAccount = {
        ...accounts[existingIndex],
        password: account.password,
        name: account.name || accounts[existingIndex].name,
        lastChecked: Date.now(),
        status: 'checking'
      }
      accounts[existingIndex] = updatedAccount
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))
      // Seleciona a conta atualizada
      this.setSelectedAccount(updatedAccount)
      return updatedAccount
    }

    const newAccount: IptvAccount = {
      id: crypto.randomUUID(),
      addedAt: Date.now(),
      lastChecked: Date.now(),
      status: 'checking',
      ...account
    }

    accounts.push(newAccount)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))
    // Seleciona a nova conta
    this.setSelectedAccount(newAccount)

    return newAccount
  }

  static updateAccount(accountId: string, updates: Partial<IptvAccount>): IptvAccount | null {
    const accounts = this.getAllAccounts()
    const index = accounts.findIndex(acc => acc.id === accountId)
    
    if (index === -1) return null
    
    accounts[index] = { ...accounts[index], ...updates }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))
    return accounts[index]
  }

  static removeAccount(accountId: string): void {
    const accounts = this.getAllAccounts().filter(acc => acc.id !== accountId)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))

    const selected = this.getSelectedAccount()
    if (selected?.id === accountId) {
      localStorage.removeItem(this.SELECTED_KEY)
    }

    localStorage.removeItem(this.CREDENTIALS_KEY)
  }

  static setSelectedAccount(account: IptvAccount): void {
    localStorage.setItem(this.SELECTED_KEY, account.id)
    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify({
      host: account.host,
      username: account.username,
      password: account.password
    }))
  }

  static getSelectedAccount(): IptvAccount | null {
    try {
      const selectedId = localStorage.getItem(this.SELECTED_KEY)
      if (!selectedId) return null

      const accounts = this.getAllAccounts()
      return accounts.find(acc => acc.id === selectedId) || null
    } catch {
      return null
    }
  }

  static async checkAccount(account: IptvAccount): Promise<IptvAccount> {
    const startTime = performance.now()

    try {
      const response = await fetch('/api/accounts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: account.host,
          username: account.username,
          password: account.password
        })
      })

      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      const data = await response.json()
      const accounts = this.getAllAccounts()
      const accountIndex = accounts.findIndex(acc => acc.id === account.id)

      if (accountIndex === -1) return account

      const updatedAccount: IptvAccount = {
        ...accounts[accountIndex],
        status: data.status || 'offline',
        lastChecked: Date.now(),
        expiresAt: data.expiresAt,
        latency
      }

      accounts[accountIndex] = updatedAccount
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))

      return updatedAccount
    } catch {
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      const accounts = this.getAllAccounts()
      const accountIndex = accounts.findIndex(acc => acc.id === account.id)

      if (accountIndex !== -1) {
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          status: 'offline',
          lastChecked: Date.now(),
          latency
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))
        return accounts[accountIndex]
      }

      return account
    }
  }

  static getActiveAccounts(): IptvAccount[] {
    const accounts = this.getAllAccounts()
    return accounts.filter(acc => acc.status !== 'expired')
  }

  static getFastestAccount(): IptvAccount | null {
    const activeAccounts = this.getActiveAccounts()

    if (activeAccounts.length === 0) return null
    if (activeAccounts.length === 1) return activeAccounts[0]

    const accountsWithLatency = activeAccounts.filter(acc =>
      acc.latency !== undefined && acc.latency !== null &&
      acc.status !== 'offline' && acc.status !== 'expired'
    )

    if (accountsWithLatency.length === 0) return activeAccounts[0]

    return accountsWithLatency.sort((a, b) =>
      (a.latency || Infinity) - (b.latency || Infinity)
    )[0]
  }

  static clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.CREDENTIALS_KEY)
    localStorage.removeItem(this.SELECTED_KEY)
    localStorage.removeItem('iptv_favorites')
    localStorage.removeItem('iptv_encryption_key')
  }

  static isStorageCorrupted(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return false
      JSON.parse(stored)
      return false
    } catch {
      return true
    }
  }
}

export const showToast = {
  success: (message: string) => console.log('✓', message),
  error: (message: string) => console.error('✗', message),
  info: (message: string) => console.log('ℹ', message),
  urlCopied: () => console.log('✓ URL copiada!'),
  codeRequired: () => console.error('Código de 3 dígitos obrigatório'),
  codeConfirmed: (code: string) => console.log(`✓ Código ${code} confirmado`),
  credentialsRequired: () => console.error('Credenciais obrigatórias'),
  credentialsSent: () => console.log('✓ Credenciais enviadas'),
  connectionError: () => console.error('Erro de conexão'),
  serverError: (message: string) => console.error('Erro:', message),
  accountAdded: (name: string) => console.log(`✓ Conta ${name} adicionada`),
  accountRemoved: () => console.log('✓ Conta removida'),
  accountCheckFailed: () => console.error('Erro ao verificar conta')
}
