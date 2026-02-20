'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Play, LogOut, Trash2, Radio, RefreshCw, Wifi, QrCode, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { AccountManager, type IptvAccount } from '@/lib/accounts'

interface Category { category_id: string; category_name: string }
interface Channel { stream_id: string; name: string; stream_icon?: string }

const FIXED_CHANNELS = [
  { id: 'jp1', name: 'Jornal da Paraiba 1', url: 'https://171942.global.ssl.fastly.net/61df20a18ecf869e0a58a4fc/live_029d87c0746511ec978d3983d0d34e88/tracks-v1a1/mono.ts.m3u8' },
  { id: 'jp2', name: 'Jornal da Paraiba 2', url: 'https://171942.global.ssl.fastly.net/61df20a18ecf869e0a58a4fc/live_04cbdcf0841d11ecbd1e2f70fab15b4e/tracks-v1a1/mono.ts.m3u8' }
]

const APP_PACKAGE = 'com.iplinks.player'

export default function HomePage() {
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [credentials, setCredentials] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [savedAccount, setSavedAccount] = useState<IptvAccount | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [pairCode, setPairCode] = useState('')
  const [receiveStatus, setReceiveStatus] = useState<'loading' | 'waiting' | 'success'>('loading')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const filtered = searchQuery ? channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())) : channels
  const sorted = [...categories].sort((a, b) => a.category_name.localeCompare(b.category_name))

  const getStreamUrl = useCallback((streamId: string) => {
    const streamHost = serverUrl || host
    const fullHost = streamHost.includes(':') ? streamHost : `${streamHost}:80`
    return `http://${fullHost}/live/${username}/${password}/${streamId}.m3u8`
  }, [host, serverUrl, username, password])

  const openInApp = useCallback((url: string) => {
    // Chrome Intent para Android - preferência para nosso app
    // Formato: intent://<host>/<path>#Intent;scheme=<scheme>;package=<pkg>;S.<extra>=<value>;end
    // 
    // Comportamento:
    // 1. Se IPLINKS Player instalado → abre direto
    // 2. Se não instalado → Android abre seletor com outros players
    // 3. Se nenhum player → abre navegador (fallback)
    // 
    // App lê: intent.getStringExtra("stream_url") ou intent.getData()
    
    const isAndroid = /android/i.test(navigator.userAgent)
    
    if (isAndroid) {
      // Parse da URL para montar o intent
      const urlObj = new URL(url)
      
      // Chrome Intent format
      const intent = [
        'intent://' + urlObj.host + urlObj.pathname + urlObj.search,
        '#Intent',
        'scheme=' + urlObj.protocol.replace(':', ''),
        'action=android.intent.action.VIEW',
        'category=android.intent.category.BROWSABLE',
        'category=android.intent.category.DEFAULT',
        `package=${APP_PACKAGE}`,                        // Preferência: nosso app
        `S.stream_url=${encodeURIComponent(url)}`,       // Extra para nosso app
        'type=video/*',
        'end'
      ].join(';')
      
      window.location.href = intent
    } else {
      // Desktop/outros - abre em nova aba
      window.open(url, '_blank')
    }
  }, [])

  const openChannel = useCallback((channel: Channel) => openInApp(getStreamUrl(channel.stream_id)), [getStreamUrl, openInApp])
  const openFixed = useCallback((url: string) => openInApp(url), [openInApp])

  const loadCategories = useCallback(async (refresh = false) => {
    if (!host || !username || !password) return
    if (refresh) setIsRefreshing(true); else setIsLoading(true)
    try {
      const res = await fetch('/api/xtream/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, username, password, type: 'live' }) })
      const data = await res.json()
      if (data.categories) setCategories(data.categories)
      if (data.serverUrl) setServerUrl(data.serverUrl)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }, [host, username, password])

  const loadChannels = useCallback(async (cat: Category) => {
    setIsLoading(true)
    setSelectedCategory(cat)
    try {
      const res = await fetch('/api/xtream/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, username, password, type: 'live', category_id: cat.category_id }) })
      const data = await res.json()
      if (data.streams) setChannels(data.streams)
      if (data.serverUrl) setServerUrl(data.serverUrl)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [host, username, password])

  const handleConnect = useCallback(() => {
    const p = AccountManager.parseCredentials(credentials)
    if (!p.host || !p.username || !p.password) return
    setHost(p.host); setUsername(p.username); setPassword(p.password)
    const acc = AccountManager.addAccount({ host: p.host, username: p.username, password: p.password, name: p.username })
    setSavedAccount(acc)
  }, [credentials])

  const handleClear = () => {
    if (savedAccount) AccountManager.removeAccount(savedAccount.id)
    setHost(''); setUsername(''); setPassword(''); setCredentials(''); setCategories([]); setChannels([]); setSelectedCategory(null); setServerUrl(''); setSavedAccount(null); setShowClearConfirm(false)
  }

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startReceive = useCallback(async () => {
    setShowReceive(true)
    setReceiveStatus('loading')
    try {
      const res = await fetch('/api/tv-pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create' }) })
      const data = await res.json()
      if (data.success) {
        setPairCode(data.code)
        setReceiveStatus('waiting')
        stopPolling()
        
        pollRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/tv-pair?code=${data.code}`)
            const checkData = await checkRes.json()
            if (checkData.status === 'credentials_received' && checkData.credentials) {
              stopPolling()
              const creds = checkData.credentials
              const acc = AccountManager.addAccount({ host: creds.host || '', username: creds.username || '', password: creds.password || '', name: creds.username || 'Conta' })
              setHost(acc.host); setUsername(acc.username); setPassword(acc.password); setSavedAccount(acc)
              setReceiveStatus('success')
              setTimeout(() => setShowReceive(false), 1500)
            }
          } catch (e) { console.error(e) }
        }, 2000)
        
        setTimeout(() => stopPolling(), 600000)
      }
    } catch (e) { console.error(e) }
  }, [stopPolling])

  useEffect(() => {
    const acc = AccountManager.getSelectedAccount() || AccountManager.getFastestAccount()
    if (acc) {
      setHost(acc.host); setUsername(acc.username); setPassword(acc.password)
      setSavedAccount(acc)
    }
    return () => stopPolling()
  }, [stopPolling])

  useEffect(() => {
    if (host && username && password) loadCategories()
  }, [host, username, password, loadCategories])

  // Receive mode overlay
  if (showReceive) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <Button variant="ghost" className="absolute top-4 left-4 sm:top-6 sm:left-6 h-12 w-12 sm:h-14 sm:w-14 hover:bg-slate-800" onClick={() => { stopPolling(); setShowReceive(false) }}>
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
        
        {receiveStatus === 'loading' && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-blue-500 mx-auto mb-4 sm:mb-6" />
            <p className="text-lg sm:text-xl text-slate-400">Gerando código...</p>
          </div>
        )}
        
        {receiveStatus === 'waiting' && (
          <div className="text-center space-y-6 sm:space-y-8 w-full max-w-md">
            <h2 className="text-2xl sm:text-3xl font-bold">Seu Código</h2>
            <Card className="bg-slate-800 border-2 border-slate-700">
              <CardContent className="p-6 sm:p-10">
                <p className="text-6xl sm:text-8xl font-mono font-bold text-green-500 tracking-widest">{pairCode}</p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <p className="text-base sm:text-lg text-slate-400">Digite no celular:</p>
              <a href="/send" className="inline-block text-lg sm:text-xl text-blue-400 underline hover:text-blue-300">iplinks/send</a>
            </div>
          </div>
        )}
        
        {receiveStatus === 'success' && (
          <div className="text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Wifi className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">Conectado!</h2>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header - Responsivo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800 border-b border-slate-700 h-14 sm:h-20">
        <div className="container mx-auto px-3 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg sm:rounded-xl overflow-hidden">
              <img src="/icon-192.png" alt="IPLINKS" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">IPLINKS</h1>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1 sm:gap-2">
                {selectedCategory ? selectedCategory.category_name : host ? <><Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> <span className="hidden sm:inline">{serverUrl?.split(':')[0] || host}</span><span className="sm:hidden">Conectado</span></> : 'Conecte sua conta'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            {selectedCategory && (
              <Button variant="outline" className="h-10 sm:h-14 px-3 sm:px-6 text-sm sm:text-lg border-slate-600 bg-slate-700" onClick={() => { setSelectedCategory(null); setChannels([]); setSearchQuery('') }}>
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" /> <span className="hidden sm:inline">Voltar</span>
              </Button>
            )}
            {host && categories.length > 0 && !selectedCategory && (
              <Button variant="outline" className="h-10 w-10 sm:h-14 sm:w-14 border-slate-600 bg-slate-700" onClick={() => loadCategories(true)} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {host && categories.length > 0 && (
              <Button variant="outline" className="h-10 w-10 sm:h-14 sm:w-14 border-slate-600 bg-slate-700" onClick={() => { setCategories([]); setChannels([]); setSelectedCategory(null) }}>
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-6 pt-18 sm:pt-28 pb-8" style={{ paddingTop: '4.5rem' }}>
        {/* Loading */}
        {isLoading && categories.length === 0 && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-base sm:text-lg text-slate-400">Conectando...</p>
            </div>
          </div>
        )}

        {/* Login Screen */}
        {categories.length === 0 && !isLoading && (
          <div className="max-w-xl mx-auto pt-4 sm:pt-8 space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 sm:h-24 sm:w-24 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6 shadow-lg shadow-blue-500/30">
                <img src="/icon-192.png" alt="IPLINKS" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">IPLINKS</h2>
              <p className="text-slate-400 text-base sm:text-lg mt-1 sm:mt-2">Player IPTV</p>
            </div>
            
            {/* Quick Setup */}
            <Card className="bg-slate-800 border-2 border-green-500/30">
              <CardContent className="p-4 sm:p-6">
                <Button onClick={startReceive} className="w-full h-12 sm:h-16 text-lg sm:text-xl bg-green-600 hover:bg-green-700">
                  <QrCode className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                  RECEBER DO CELULAR
                </Button>
                <p className="text-center text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4">Mais rápido - sem digitar na TV</p>
              </CardContent>
            </Card>
            
            {savedAccount && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-slate-400">Conta salva</p>
                      <p className="font-medium text-sm sm:text-lg">{savedAccount.username}@{savedAccount.host}</p>
                    </div>
                    {!showClearConfirm ? (
                      <Button variant="ghost" className="h-10 w-10 sm:h-14 sm:w-14 text-red-400 hover:bg-red-500/10" onClick={() => setShowClearConfirm(true)}>
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" className="h-10 px-3 sm:h-14 sm:px-4 text-red-400 text-sm sm:text-base" onClick={handleClear}>Ok</Button>
                        <Button variant="ghost" className="h-10 px-3 sm:h-14 sm:px-4 text-sm sm:text-base" onClick={() => setShowClearConfirm(false)}>X</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Manual */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                <p className="text-center text-sm sm:text-base text-slate-400">- ou cole suas credenciais -</p>
                <Textarea 
                  placeholder="Servidor: servidor.com:80&#10;Usuario: usuario&#10;Senha: senha" 
                  value={credentials} 
                  onChange={(e) => setCredentials(e.target.value)} 
                  className="bg-slate-900 border-slate-700 text-white min-h-[120px] sm:min-h-[140px] text-base sm:text-lg" 
                />
                <Button onClick={handleConnect} className="w-full h-12 sm:h-16 text-lg sm:text-xl bg-blue-600 hover:bg-blue-700">
                  CONECTAR
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Categories Grid */}
        {categories.length > 0 && !selectedCategory && (
          <div className="space-y-6 sm:space-y-8">
            {/* Fixed Channels */}
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                <h2 className="text-lg sm:text-xl font-bold">Campeonato Paraibano</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {FIXED_CHANNELS.map((ch) => (
                  <button key={ch.id} onClick={() => openFixed(ch.url)} className="flex items-center justify-between p-3 sm:p-5 bg-slate-800 rounded-lg sm:rounded-xl border-2 border-slate-700 hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 sm:focus:ring-4 focus:ring-emerald-500/30 cursor-pointer transition-all min-h-[56px] sm:min-h-[72px]">
                    <span className="font-medium text-sm sm:text-lg truncate">{ch.name}</span>
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 flex-shrink-0 ml-2 sm:ml-4" />
                  </button>
                ))}
              </div>
            </div>
            
            {/* All Categories */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Categorias ({categories.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {sorted.map((cat) => (
                  <button key={cat.category_id} onClick={() => loadChannels(cat)} className="h-12 sm:h-16 px-3 sm:px-5 rounded-lg sm:rounded-xl border-2 border-slate-700 hover:border-blue-500 focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/30 bg-slate-800 cursor-pointer transition-all text-left">
                    <span className="truncate text-sm sm:text-base block">{cat.category_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Channels List */}
        {selectedCategory && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold">{filtered.length} canais</h2>
              <span className="text-xs sm:text-sm text-slate-500">{selectedCategory.category_name}</span>
            </div>
            <Input placeholder="Buscar canal..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-800 border-slate-700 h-12 sm:h-16 text-base sm:text-lg px-4 sm:px-5" autoFocus />
            <div className="space-y-2 sm:space-y-3 max-h-[55vh] overflow-y-auto pr-1 sm:pr-2">
              {filtered.map((ch) => (
                <button key={ch.stream_id} onClick={() => openChannel(ch)} className="w-full flex items-center justify-between p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/30 bg-slate-800 cursor-pointer transition-all min-h-[52px] sm:min-h-[64px]">
                  <span className="truncate flex-1 text-left text-base sm:text-lg">{ch.name}</span>
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 flex-shrink-0 ml-2 sm:ml-4" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && categories.length > 0 && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 flex items-center gap-3 sm:gap-4">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-500" />
              <span className="text-lg sm:text-xl">Carregando...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
