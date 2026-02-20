'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
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
    
    if (!parsed.host || !parsed.username || !parsed.password) {
      setStatus('error')
      setErrorMessage('Credenciais inválidas')
      return
    }

    try {
      const res = await fetch('/api/tv-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'credentials', code, credentials: { host: parsed.host, username: parsed.username, password: parsed.password } })
      })

      const data = await res.json()
      
      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Erro ao enviar')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Erro de conexão')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 text-green-500 mx-auto mb-4 sm:mb-6" />
        <h2 className="text-2xl sm:text-3xl font-bold">Enviado!</h2>
        <p className="text-base sm:text-lg text-slate-400 mt-2 sm:mt-4">A TV conectou automaticamente</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <AlertCircle className="h-16 w-16 sm:h-20 sm:w-20 text-red-500 mx-auto mb-4 sm:mb-6" />
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">Erro</h2>
        <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8">{errorMessage}</p>
        <Button onClick={() => { setStatus('idle'); setErrorMessage('') }} className="h-12 sm:h-16 px-6 sm:px-8 text-lg sm:text-xl bg-blue-600">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-slate-800 border-b border-slate-700 z-50 h-14 sm:h-20">
        <div className="container mx-auto px-3 sm:px-6 h-full flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" className="h-10 w-10 sm:h-14 sm:w-14 hover:bg-slate-700" onClick={() => window.location.href = '/'}>
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Enviar para TV</h1>
            <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Envie credenciais para uma TV</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pb-8" style={{ paddingTop: '4.5rem' }}>
        <div className="max-w-lg mx-auto pt-4 sm:pt-8 space-y-6 sm:space-y-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">Digite o código da TV</h2>
            <p className="text-base sm:text-lg text-slate-400 mt-1 sm:mt-2">Código de 3 dígitos mostrado na TV</p>
          </div>

          <Card className="bg-slate-800 border-2 border-slate-700">
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Code Input */}
              <div className="space-y-2">
                <label className="text-sm sm:text-base text-slate-400">Código</label>
                <Input
                  type="text"
                  placeholder="123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="text-center text-4xl sm:text-6xl font-mono h-16 sm:h-24 bg-slate-900 border-2 border-slate-700 focus:border-blue-500"
                  maxLength={3}
                />
              </div>

              {/* Credentials Input */}
              <div className="space-y-2">
                <label className="text-sm sm:text-base text-slate-400">Credenciais IPTV</label>
                <Textarea
                  placeholder="Cole suas credenciais...&#10;&#10;Servidor: servidor.com:80&#10;Usuário: usuario&#10;Senha: senha"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="min-h-[160px] sm:min-h-[200px] bg-slate-900 border-2 border-slate-700 text-base sm:text-lg focus:border-blue-500"
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={status === 'sending' || code.length !== 3 || !credentials.trim()}
                className="w-full h-12 sm:h-16 text-lg sm:text-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2 sm:mr-3" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    ENVIAR
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm sm:text-base text-slate-500">Certifique-se de que a TV está mostrando o código</p>
        </div>
      </main>
    </div>
  )
}
