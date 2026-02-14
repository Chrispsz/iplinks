'use client'

import { Tv, Smartphone, ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">IPLINKS</h1>
            <p className="text-xs text-slate-400">Player IPTV</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-24 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Como você quer usar?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card
              className="bg-slate-800 border-slate-700 hover:border-purple-500 cursor-pointer transition-colors"
              onClick={() => window.location.href = '/simple-player'}
            >
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Play className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="font-bold mb-2">Acesso Direto</h3>
                <p className="text-sm text-slate-400 mb-4">Conecte e copie URLs para o VLC</p>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Acessar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="bg-slate-800 border-slate-700 hover:border-green-500 cursor-pointer transition-colors"
              onClick={() => window.location.href = '/receive'}
            >
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Tv className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="font-bold mb-2">Receber</h3>
                <p className="text-sm text-slate-400 mb-4">Mostra código para receber credenciais</p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Gerar Código
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="bg-slate-800 border-slate-700 hover:border-blue-500 cursor-pointer transition-colors"
              onClick={() => window.location.href = '/send'}
            >
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="font-bold mb-2">Enviar</h3>
                <p className="text-sm text-slate-400 mb-4">Envia credenciais para uma TV</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Enviar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center text-xs text-slate-500">
            <p>Copie a URL do canal e cole no VLC para assistir</p>
          </div>
        </div>
      </main>
    </div>
  )
}
