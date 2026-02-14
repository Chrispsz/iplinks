'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Tv, ArrowLeft, RefreshCw, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AccountManager } from '@/lib/accounts'

export default function ReceivePage() {
  const [pairCode, setPairCode] = useState('')
  const [status, setStatus] = useState<'loading' | 'waiting' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const checkForCredentials = useCallback(async (code: string) => {
    try {
      console.log(`[Receive] Checking for credentials - code: ${code}`)
      const checkRes = await fetch(`/api/tv-pair?code=${code}`)
      const checkData = await checkRes.json()
      
      console.log(`[Receive] Check result:`, checkData)
      
      if (checkData.status === 'credentials_received' && checkData.credentials) {
        clearPolling()
        
        const creds = checkData.credentials
        console.log(`[Receive] Credentials received:`, { host: creds.host, username: creds.username })
        
        AccountManager.addAccount({
          host: creds.host || '',
          username: creds.username || '',
          password: creds.password || '',
          name: creds.username || 'Conta'
        })
        
        setStatus('success')
        setTimeout(() => { window.location.href = '/simple-player' }, 1500)
        return true
      }
      
      if (checkData.status === 'expired') {
        clearPolling()
        setStatus('error')
        setErrorMessage('Código expirado. Gere um novo código.')
        return true
      }
      
      return false
    } catch (error) {
      console.error('[Receive] Polling error:', error)
      return false
    }
  }, [clearPolling])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const createCode = async () => {
      setStatus('loading')
      setErrorMessage('')
      
      try {
        console.log('[Receive] Creating new code...')
        const res = await fetch('/api/tv-pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create' })
        })
        
        const data = await res.json()
        console.log('[Receive] Create result:', data)
        
        if (data.success) {
          setPairCode(data.code)
          setStatus('waiting')
          setPollCount(0)
          
          // Start polling every 2 seconds
          clearPolling()
          let localPollCount = 0
          
          pollRef.current = setInterval(async () => {
            localPollCount++
            setPollCount(localPollCount)
            
            // Auto-refresh code after 8 minutes (240 polls)
            if (localPollCount >= 240) {
              console.log('[Receive] Auto-refreshing code after 8 minutes')
              clearInterval(pollRef.current!)
              // Recreate code
              try {
                const newRes = await fetch('/api/tv-pair', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'create' })
                })
                const newData = await newRes.json()
                if (newData.success) {
                  setPairCode(newData.code)
                  localPollCount = 0
                  setPollCount(0)
                }
              } catch (e) {
                console.error('[Receive] Auto-refresh failed:', e)
              }
            }
            
            checkForCredentials(data.code)
          }, 2000)
          
        } else {
          setStatus('error')
          setErrorMessage(data.error || 'Erro ao criar código')
        }
      } catch (error) {
        console.error('[Receive] Create error:', error)
        setStatus('error')
        setErrorMessage('Erro de conexão. Verifique sua internet.')
      }
    }

    createCode()

    return () => {
      clearPolling()
    }
  }, [clearPolling, checkForCredentials])

  const resetCode = async () => {
    clearPolling()
    setStatus('loading')
    
    try {
      const res = await fetch('/api/tv-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      })
      const data = await res.json()
      
      if (data.success) {
        setPairCode(data.code)
        setStatus('waiting')
        setPollCount(0)
        
        // Restart polling
        let localPollCount = 0
        pollRef.current = setInterval(async () => {
          localPollCount++
          setPollCount(localPollCount)
          
          if (localPollCount >= 240) {
            clearInterval(pollRef.current!)
          }
          
          checkForCredentials(data.code)
        }, 2000)
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Erro ao criar código')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Erro de conexão.')
    }
  }

  // Calculate time remaining
  const timeElapsed = Math.floor(pollCount * 2 / 60)
  const timeRemaining = 10 - timeElapsed

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Gerando código...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Erro</h2>
          <p className="text-slate-400 mb-6">{errorMessage}</p>
          <Button onClick={resetCode} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Conectado!</h2>
          <p className="text-slate-400 mt-2">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="fixed top-0 left-0 right-0 bg-slate-800 border-b border-slate-700 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-bold">Receber Credenciais</h1>
          <div className="ml-auto flex items-center gap-2">
            {pollCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                {timeRemaining > 0 ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span>{timeRemaining}min</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-yellow-500" />
                    <span>Expirando...</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="h-16 w-16 rounded-xl bg-green-600 flex items-center justify-center mx-auto">
            <Tv className="h-8 w-8" />
          </div>

          <h2 className="text-2xl font-bold">Seu Código</h2>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8">
              <p className="text-6xl font-mono font-bold text-green-500 tracking-wider">
                {pairCode}
              </p>
              {pollCount > 0 && (
                <p className="text-xs text-slate-500 mt-4">
                  Aguardando... ({pollCount} verificações)
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-slate-400">
              Digite este código no celular/PC para enviar as credenciais
            </p>
            <p className="text-xs text-slate-500">
              Acesse: <span className="text-blue-400">iplinks/send</span>
            </p>
          </div>

          <Button variant="outline" onClick={resetCode} className="border-slate-600">
            <RefreshCw className="h-4 w-4 mr-2" />
            Novo Código
          </Button>
        </div>
      </main>
    </div>
  )
}
