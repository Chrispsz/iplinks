'use client'

import { useEffect, useState } from 'react'
import { Trash2, Check, RefreshCw, Clock, WifiOff, AlertCircle, Zap, Timer, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AccountManager, type IptvAccount, showToast } from '@/lib/accounts'

interface AccountSelectorProps {
  onSelectAccount?: (account: IptvAccount) => void
  selectedAccountId?: string | null
}

export function AccountSelector({ onSelectAccount, selectedAccountId }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<IptvAccount[]>([])
  const [checkingId, setCheckingId] = useState<string | null>(null)

  useEffect(() => {
    if (AccountManager.isStorageCorrupted()) {
      AccountManager.clearAll()
    }

    const loadAccounts = async () => {
      const allAccounts = AccountManager.getAllAccounts()

      const now = Date.now()
      const FIVE_MINUTES = 5 * 60 * 1000

      const accountsToCheck = allAccounts.filter(acc =>
        !acc.lastChecked || (now - (acc.lastChecked || 0) > FIVE_MINUTES)
      )

      if (accountsToCheck.length > 0) {
        await Promise.all(
          accountsToCheck.map(acc => AccountManager.checkAccount(acc))
        )
      }

      const sortedAccounts = AccountManager.getAllAccounts().sort((a, b) => {
        if (a.latency && !b.latency) return -1
        if (!a.latency && b.latency) return 1
        if (a.latency && b.latency) return a.latency - b.latency
        return 0
      })

      setAccounts(sortedAccounts)
    }

    loadAccounts()
  }, [])

  const handleSelectAccount = (account: IptvAccount) => {
    AccountManager.setSelectedAccount(account)
    onSelectAccount?.(account)
  }

  const handleRemoveAccount = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja remover esta conta?')) {
      AccountManager.removeAccount(accountId)
      setAccounts(AccountManager.getAllAccounts())
      showToast.accountRemoved()
    }
  }

  const formatExpiry = (dateString?: string) => {
    if (!dateString) return null

    try {
      const date = new Date(dateString)
      const now = new Date()
      const diff = date.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

      if (days <= 0) return 'Expirada'
      if (days <= 7) return `${days} dias`
      if (days <= 30) return `${Math.floor(days / 7)} semanas`
      return `${Math.floor(days / 30)} meses`
    } catch {
      return null
    }
  }

  const getLatencyDisplay = (account: IptvAccount) => {
    if (!account.latency || account.status === 'checking') return null

    const latency = account.latency
    let icon: React.ReactNode = null
    let color = ''

    if (latency < 300) {
      icon = <Zap className="h-3 w-3" />
      color = 'text-green-400 bg-green-500/20'
    } else if (latency < 800) {
      icon = <Timer className="h-3 w-3" />
      color = 'text-yellow-400 bg-yellow-500/20'
    } else {
      icon = <XCircle className="h-3 w-3" />
      color = 'text-red-400 bg-red-500/20'
    }

    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {icon}
        {latency}ms
      </span>
    )
  }

  const getStatusIcon = (account: IptvAccount) => {
    switch (account.status) {
      case 'active':
        return <Check className="h-4 w-4 text-green-500" />
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'disabled':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="space-y-3">
      {accounts.length === 0 ? (
        <Card className="bg-slate-800/30 border-slate-700/30">
          <CardContent className="p-6 text-center">
            <WifiOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">Nenhuma conta salva</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={`cursor-pointer transition-all ${
                selectedAccountId === account.id
                  ? 'bg-blue-500/10 border-blue-500/50'
                  : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600'
              }`}
              onClick={() => handleSelectAccount(account)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(account)}
                      <span className="font-semibold text-white truncate">
                        {account.name || account.username}
                      </span>
                    </div>

                    <div className="text-sm text-slate-400 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{account.host}</span>
                        {formatExpiry(account.expiresAt) && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            account.status === 'expired'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {formatExpiry(account.expiresAt)}
                          </span>
                        )}
                        {getLatencyDisplay(account)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {account.username}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCheckingId(account.id)
                        AccountManager.checkAccount(account).then(() => {
                          setAccounts(AccountManager.getAllAccounts())
                          setCheckingId(null)
                        }).catch(() => {
                          showToast.accountCheckFailed()
                          setCheckingId(null)
                        })
                      }}
                      className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                      title="Verificar status"
                      disabled={checkingId === account.id}
                    >
                      <RefreshCw className={`h-4 w-4 ${checkingId === account.id ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleRemoveAccount(e, account.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Remover conta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
