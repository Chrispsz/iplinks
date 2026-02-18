'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tv, Loader2, ArrowLeft, Play, LogOut, Trash2, Radio, RefreshCw, Wifi } from 'lucide-react'
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
  const [serverUrl, setServerUrl] = useState('')
  const [savedAccount, setSavedAccount] = useState<IptvAccount | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getStreamUrl = useCallback((streamId: string) => {
    const streamHost = serverUrl || host
    const fullHost = streamHost.includes(':') ? streamHost : `${streamHost}:80`
    return `http://${fullHost}/live/${username}/${password}/${streamId}.m3u8`
  }, [host, serverUrl, username, password])

  const openPlayer = useCallback((url: string) => {
    window.location.href = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;end`
  }, [])

  const openChannel = useCallback((channel: Channel) => openPlayer(getStreamUrl(channel.stream_id)), [getStreamUrl, openPlayer])
  const openFixed = useCallback((url: string) => openPlayer(url), [openPlayer])

  const loadCategories = useCallback(async (refresh = false) => {
    if (!host || !username || !password) return
    refresh ? setIsRefreshing(true) : setIsLoading(true)
    try {
      const res = await fetch('/api/xtream/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, username, password, type: 'live' }) })
      const data = await res.json()
      if (data.categories) setCategories(data.categories)
      if (data.serverUrl) setServerUrl(data.serverUrl)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }, [host, username, password])

  const loadChannels = useCallback(async (cat: Category) => {
    setIsLoading(true); setSelectedCategory(cat)
    try {
      const res = await fetch('/api/xtream/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, username, password, type: 'live', category_id: cat.category_id }) })
      const data = await res.json()
      if (data.streams) setChannels(data.streams)
      if (data.serverUrl) setServerUrl(data.serverUrl)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [host, username, password])

  const handleConnect = () => {
    const p = AccountManager.parseCredentials(credentials)
    if (!p.host || !p.username || !p.password) return
    setHost(p.host); setUsername(p.username); setPassword(p.password)
    setSavedAccount(AccountManager.addAccount({ host: p.host, username: p.username, password: p.password, name: p.username }))
  }

  const handleClear = () => {
    if (savedAccount) AccountManager.removeAccount(savedAccount.id)
    setHost(''); setUsername(''); setPassword(''); setCredentials(''); setCategories([]); setChannels([]); setSelectedCategory(null); setServerUrl(''); setSavedAccount(null); setShowClearConfirm(false)
  }

  useEffect(() => { if (host && username && password) loadCategories() }, [host, username, password, loadCategories])
  useEffect(() => {
    const acc = AccountManager.getSelectedAccount() || AccountManager.getFastestAccount()
    if (acc) { setHost(acc.host); setUsername(acc.username); setPassword(acc.password); setCredentials(`Servidor: ${acc.host}\nUsuario: ${acc.username}\nSenha: ${acc.password}`); setSavedAccount(acc) }
  }, [])

  const filtered = searchQuery ? channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())) : channels
  const sorted = [...categories].sort((a, b) => a.category_name.localeCompare(b.category_name))

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center"><Tv className="h-5 w-5" /></div>
            <div>
              <h1 className="text-lg font-bold">IPLINKS</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                {selectedCategory ? selectedCategory.category_name : host ? <><Wifi className="h-3 w-3 text-green-400" /> {serverUrl?.split(':')[0] || host}</> : 'Conecte sua conta'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedCategory && <Button variant="outline" size="sm" onClick={() => { setSelectedCategory(null); setChannels([]); setSearchQuery('') }}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>}
            {host && categories.length > 0 && !selectedCategory && <Button variant="outline" size="sm" onClick={() => loadCategories(true)} disabled={isRefreshing}><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /></Button>}
            {host && categories.length > 0 && <Button variant="outline" size="sm" onClick={() => { setCategories([]); setChannels([]); setSelectedCategory(null) }}><LogOut className="h-4 w-4" /></Button>}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 pb-8">
        {categories.length === 0 && (
          <div className="max-w-lg mx-auto pt-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 rounded-xl bg-blue-600 items-center justify-center mb-4"><Tv className="h-8 w-8" /></div>
              <h2 className="text-2xl font-bold">IPLINKS</h2>
              <p className="text-slate-400 text-sm mt-1">Cole suas credenciais IPTV</p>
            </div>
            {savedAccount && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-slate-400">Conta salva</p><p className="font-medium">{savedAccount.username}@{savedAccount.host}</p></div>
                    {!showClearConfirm ? (
                      <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-400">Ok</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>X</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 space-y-4">
                <Textarea placeholder="Servidor: servidor.com:80&#10;Usuario: usuario&#10;Senha: senha" value={credentials} onChange={(e) => setCredentials(e.target.value)} className="bg-slate-900 border-slate-700 text-white min-h-[120px]" />
                <Button onClick={handleConnect} disabled={isLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-700">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'CONECTAR'}</Button>
              </CardContent>
            </Card>
            <p className="text-center text-xs text-slate-500">Funciona com qualquer servidor Xtream Codes</p>
          </div>
        )}

        {categories.length > 0 && !selectedCategory && (
          <div className="pt-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3"><Radio className="h-5 w-5 text-red-500" /><h2 className="text-lg font-bold">Campeonato Paraibano</h2></div>
              <div className="grid grid-cols-2 gap-2">
                {FIXED_CHANNELS.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500/50 cursor-pointer" onClick={() => openFixed(ch.url)}>
                    <span className="font-medium text-sm truncate">{ch.name}</span><Play className="h-5 w-5 text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-3">Categorias ({categories.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {sorted.map((cat) => (
                  <Button key={cat.category_id} onClick={() => loadChannels(cat)} variant="outline" className="h-12 border-slate-600 hover:border-blue-500 justify-start px-3">
                    <span className="truncate text-left">{cat.category_name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedCategory && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{filtered.length} canais</h2>
              <span className="text-xs text-slate-500">{selectedCategory.category_name}</span>
            </div>
            <Input placeholder="Buscar canal..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-800 border-slate-700" autoFocus />
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filtered.map((ch) => (
                <div key={ch.stream_id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer" onClick={() => openChannel(ch)}>
                  <span className="truncate flex-1">{ch.name}</span><Play className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 flex items-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /><span>Carregando...</span></div>
          </div>
        )}
      </main>
    </div>
  )
}
