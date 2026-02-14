'use client'

import { useState } from 'react'
import { ArrowLeft, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AccountManager } from '@/lib/accounts'

export default function SendPage() {
  const [code, setCode] = useState('')
  const [credentials, setCredentials] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSend = async () => {
    if (code.length !== 3 || !credentials.trim()) return

    setStatus('sending')
    setErrorMessage('')
    
    const parsed = AccountManager.parseCredentials(credentials)
    
    console.log('[Send] Parsed credentials:', { 
      host: parsed.host, 
      username: parsed.username,
      hasPassword: !!parsed.password 
    })
    
    if (!parsed.host || !parsed.username || !parsed.password) {
      setStatus('error')
      setErrorMessage('Credenciais inválidas. Verifique o formato.')
      return
    }

    try {
      console.log(`[Send] Sending credentials to code: ${code}`)
      
      const res = await fetch('/api/tv-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'credentials',
          code,
          credentials: {
            host: parsed.host,
            username: parsed.username,
            password: parsed.password
          }
        })
      })

      const data = await res.json()
      console.log('[Send] Response:', data)
      
      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Erro ao enviar credenciais')
      }
    } catch (error) {
      console.error('[Send] Error:', error)
      setStatus('error')
      setErrorMessage('Erro de conexão. Verifique sua internet.')
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setErrorMessage('')
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Enviado!</h2>
          <p className="text-slate-400 mt-2">A TV vai conectar automaticamente</p>
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
          <Button onClick={handleReset} className="bg-blue-600 hover:bg-blue-700">
            Tentar Novamente
          </Button>
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
          <h1 className="font-bold">Enviar Credenciais</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Digite o código da TV</h2>
            <p className="text-slate-400 text-sm mt-1">3 dígitos que aparecem na tela da TV</p>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Código</label>
                <Input
                  type="text"
                  placeholder="Ex: 123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="text-center text-2xl font-mono h-14 bg-slate-900 border-slate-700"
                  maxLength={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">Credenciais IPTV</label>
                <Textarea
                  placeholder="Cole suas credenciais...&#10;&#10;Servidor: servidor.com:80&#10;Usuário: usuario&#10;Senha: senha"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="min-h-[120px] bg-slate-900 border-slate-700"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={status === 'sending' || code.length !== 3 || !credentials.trim()}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    ENVIAR
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-slate-500">
            <p>Certifique-se de que a TV está na tela de código</p>
          </div>
        </div>
      </main>
    </div>
  )
}
