'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tv, Loader2, RefreshCw, Copy, Check, ArrowLeft, Play, Cast, LogOut, Trash2, AlertCircle, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { AccountManager, type IptvAccount } from '@/lib/accounts'

interface Category {
  category_id: string
  category_name: string
}

interface Channel {
  stream_id: string
  name: string
  stream_icon?: string
}

// Canais fixos (sempre disponíveis)
const FIXED_CHANNELS = [
  {
    id: 'jornal-paraiba-1',
    name: 'Jornal da Paraiba 1',
    url: 'https://171942.global.ssl.fastly.net/61df20a18ecf869e0a58a4fc/live_029d87c0746511ec978d3983d0d34e88/tracks-v1a1/mono.ts.m3u8',
    icon: '📺'
  },
  {
    id: 'jornal-paraiba-2',
    name: 'Jornal da Paraiba 2',
    url: 'https://171942.global.ssl.fastly.net/61df20a18ecf869e0a58a4fc/live_04cbdcf0841d11ecbd1e2f70fab15b4e/tracks-v1a1/mono.ts.m3u8',
    icon: '📺'
  }
]

export default function SimplePlayerPage() {
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [credentials, setCredentials] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [savedAccount, setSavedAccount] = useState<IptvAccount | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Gerar URL do canal
  const getStreamUrl = useCallback((streamId: string) => {
    const streamHost = serverUrl || host
    const fullHost = streamHost.includes(':') ? streamHost : `${streamHost}:80`
    return `http://${fullHost}/live/${username}/${password}/${streamId}.m3u8`
  }, [host, serverUrl, username, password])

  // Copiar URL
  const copyUrl = useCallback((channel: Channel) => {
    const url = getStreamUrl(channel.stream_id)
    navigator.clipboard.writeText(url)
    setCopiedId(channel.stream_id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [getStreamUrl])

  // Copiar URL de canal fixo
  const copyFixedUrl = useCallback((channelId: string) => {
    const channel = FIXED_CHANNELS.find(c => c.id === channelId)
    if (channel) {
      navigator.clipboard.writeText(channel.url)
      setCopiedId(channelId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  // Abrir seletor de players (MÉTODO CORRETO 2025)
  const openExternalChooser = useCallback((channel: Channel) => {
    const url = getStreamUrl(channel.stream_id)

    // Método 1: Intent genérico com chooser (mais confiável)
    const intentChooser = `intent://play/?url=${encodeURIComponent(url)}#Intent;action=android.intent.action.VIEW;type=video/*;category=android.intent.category.BROWSABLE;end`

    // Método 2: Universal para PWAs/Android TV (recomendado)
    const universalIntent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;type=application/x-mpegURL;end`

    // Tenta universal primeiro, fallback para chooser
    try {
      window.location.href = universalIntent

      // Fallback após 500ms se não funcionar
      setTimeout(() => {
        window.location.href = intentChooser
      }, 500)

    } catch {
      window.location.href = url
    }
  }, [getStreamUrl])

  // Abrir canal fixo no seletor de players
  const openFixedChannel = useCallback((url: string) => {
    const intentChooser = `intent://play/?url=${encodeURIComponent(url)}#Intent;action=android.intent.action.VIEW;type=video/*;category=android.intent.category.BROWSABLE;end`
    const universalIntent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;type=application/x-mpegURL;end`

    try {
      window.location.href = universalIntent
      setTimeout(() => {
        window.location.href = intentChooser
      }, 500)
    } catch {
      window.location.href = url
    }
  }, [])

  // Abrir canal fixo no WVC
  const openFixedWvc = useCallback((channel: typeof FIXED_CHANNELS[0]) => {
    const intent = `intent://open?url=${encodeURIComponent(channel.url)}&title=${encodeURIComponent(channel.name)}#Intent;scheme=wvc-x-callback;package=com.instantbits.cast.webvideo;end`
    window.location.href = intent
  }, [])

  // Abrir no Web Video Caster (para TV via Chromecast)
  const openWvc = useCallback((channel: Channel) => {
    const url = getStreamUrl(channel.stream_id)
    const title = encodeURIComponent(channel.name)
    const intent = `intent://open?url=${encodeURIComponent(url)}&title=${title}#Intent;scheme=wvc-x-callback;package=com.instantbits.cast.webvideo;end`
    window.location.href = intent
  }, [getStreamUrl])

  // Carregar categorias
  const loadCategories = useCallback(async () => {
    if (!host || !username || !password) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/xtream/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, username, password, type: 'live' })
      })

      const data = await response.json()
      if (data.categories) {
        setCategories(data.categories)
      }
      if (data.serverUrl) {
        setServerUrl(data.serverUrl)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }, [host, username, password])

  // Carregar canais
  const loadChannels = useCallback(async (category: Category) => {
    setIsLoading(true)
    setSelectedCategory(category)
    try {
      const response = await fetch('/api/xtream/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          username,
          password,
          type: 'live',
          category_id: category.category_id
        })
      })

      const data = await response.json()
      if (data.streams) {
        setChannels(data.streams)
      }
      if (data.serverUrl) {
        setServerUrl(data.serverUrl)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }, [host, username, password])

  // Conectar
  const handleConnect = () => {
    const parsed = AccountManager.parseCredentials(credentials)
    if (!parsed.host || !parsed.username || !parsed.password) {
      return
    }

    setHost(parsed.host)
    setUsername(parsed.username)
    setPassword(parsed.password)

    const account = AccountManager.addAccount({
      host: parsed.host,
      username: parsed.username,
      password: parsed.password,
      name: parsed.username
    })
    
    setSavedAccount(account)
  }

  // Limpar credenciais salvas
  const handleClearCredentials = () => {
    if (savedAccount) {
      AccountManager.removeAccount(savedAccount.id)
    }
    setHost('')
    setUsername('')
    setPassword('')
    setCredentials('')
    setCategories([])
    setChannels([])
    setSelectedCategory(null)
    setServerUrl('')
    setSavedAccount(null)
    setShowClearConfirm(false)
  }

  // Desconectar (mantém credenciais salvas)
  const handleDisconnect = () => {
    setCategories([])
    setChannels([])
    setSelectedCategory(null)
  }

  // Efeito para carregar categorias quando credenciais mudam
  useEffect(() => {
    if (host && username && password) {
      loadCategories()
    }
  }, [host, username, password, loadCategories])

  // Carregar conta salva
  useEffect(() => {
    const account = AccountManager.getSelectedAccount() || AccountManager.getFastestAccount()
    if (account) {
      setHost(account.host)
      setUsername(account.username)
      setPassword(account.password)
      setCredentials(`Servidor: ${account.host}\nUsuário: ${account.username}\nSenha: ${account.password}`)
      setSavedAccount(account)
    }
  }, [])

  // Filtrar canais
  const filteredChannels = searchQuery
    ? channels.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : channels

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">IPLINKS</h1>
              <p className="text-xs text-slate-400">
                {selectedCategory ? selectedCategory.category_name : (host ? '✓ Conectado' : 'Conecte sua conta')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {selectedCategory && (
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedCategory(null)
                setChannels([])
                setSearchQuery('')
              }}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            {host && categories.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 pt-20 pb-8">
        {/* Login */}
        {categories.length === 0 && (
          <div className="max-w-lg mx-auto pt-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 rounded-xl bg-blue-600 items-center justify-center mb-4">
                <Tv className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold">IPLINKS</h2>
              <p className="text-slate-400 text-sm mt-1">Cole suas credenciais IPTV</p>
            </div>

            {/* Conta salva */}
            {savedAccount && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Conta salva</p>
                      <p className="font-medium">{savedAccount.username}@{savedAccount.host}</p>
                    </div>
                    <div className="flex gap-2">
                      {!showClearConfirm ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowClearConfirm(true)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearCredentials}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowClearConfirm(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 space-y-4">
                <Textarea
                  placeholder="Servidor: servidor.com:80&#10;Usuário: usuario&#10;Senha: senha"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white min-h-[120px]"
                />
                <Button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'CONECTAR'}
                </Button>
              </CardContent>
            </Card>

            <div className="text-center text-xs text-slate-500">
              <p>Funciona com qualquer servidor Xtream Codes</p>
              <p className="mt-1">▶ Player (MX/VLC/Kodi) • 🟣 Chromecast • 📋 Copiar</p>
            </div>
          </div>
        )}

        {/* Categorias */}
        {categories.length > 0 && !selectedCategory && (
          <div className="pt-4 space-y-6">
            {/* Campeonato Paraibano - Canais Fixos (Grid Compacto) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Radio className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-bold">Campeonato Paraibano</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FIXED_CHANNELS.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex flex-col p-2 bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500/50"
                  >
                    <span className="font-medium text-sm text-center mb-2">{channel.name}</span>
                    <div className="flex justify-center gap-1">
                      <Button
                        onClick={() => openFixedChannel(channel.url)}
                        variant="ghost"
                        size="sm"
                        title="Player"
                        className="h-8 w-8 p-0"
                      >
                        <Play className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button
                        onClick={() => openFixedWvc(channel)}
                        variant="ghost"
                        size="sm"
                        title="Chromecast"
                        className="h-8 w-8 p-0"
                      >
                        <Cast className="h-4 w-4 text-purple-500" />
                      </Button>
                      <Button
                        onClick={() => copyFixedUrl(channel.id)}
                        variant="ghost"
                        size="sm"
                        title="Copiar"
                        className="h-8 w-8 p-0"
                      >
                        {copiedId === channel.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorias IPTV */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Categorias ({categories.length})</h2>
                {serverUrl && (
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                    Servidor: {serverUrl.split(':')[0]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.category_id}
                    onClick={() => loadChannels(category)}
                    variant="outline"
                    className="h-12 px-4 border-slate-600 hover:border-blue-500"
                  >
                    {category.category_name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Canais */}
        {selectedCategory && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{filteredChannels.length} canais</h2>
              {serverUrl && <span className="text-xs text-slate-500">Servidor: {serverUrl}</span>}
            </div>

            <Input
              placeholder="Buscar canal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.stream_id}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600"
                >
                  <span className="truncate flex-1">{channel.name}</span>
                  <div className="flex gap-1">
                    {/* Player Externo - PEGA TUDO (MX, VLC, Kodi...) */}
                    <Button
                      onClick={() => openExternalChooser(channel)}
                      variant="ghost"
                      size="sm"
                      title="Selecionar player (MX, VLC, Kodi...)"
                    >
                      <Play className="h-4 w-4 text-emerald-500" />
                    </Button>
                    {/* Web Video Caster - Chromecast específico */}
                    <Button
                      onClick={() => openWvc(channel)}
                      variant="ghost"
                      size="sm"
                      title="Web Video Caster (Chromecast)"
                    >
                      <Cast className="h-4 w-4 text-purple-500" />
                    </Button>
                    {/* Copiar URL */}
                    <Button
                      onClick={() => copyUrl(channel)}
                      variant="ghost"
                      size="sm"
                      title="Copiar URL"
                    >
                      {copiedId === channel.stream_id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span>Carregando...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
