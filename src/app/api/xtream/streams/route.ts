import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { host, username, password, category_id } = await request.json()

    if (!host || !username || !password || !category_id) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios' }, { status: 400 })
    }

    // Primeiro: autenticar para obter servidor de load balancing
    const authUrl = `http://${host}/player_api.php?username=${username}&password=${password}`
    const authResponse = await fetch(authUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    })

    let serverUrl = host
    if (authResponse.ok) {
      const authData = await authResponse.json()
      if (authData.server_info?.url) {
        serverUrl = authData.server_info.url
      }
    }

    // Segundo: obter streams
    const streamsUrl = `http://${host}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${category_id}`
    const response = await fetch(streamsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    })

    const data = await response.json()
    const streams = Array.isArray(data) ? data.map(({ stream_id, name, stream_icon }: { stream_id: string; name: string; stream_icon?: string }) => ({
      stream_id,
      name,
      stream_icon
    })) : []

    return NextResponse.json({ streams, serverUrl })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao carregar canais' }, { status: 500 })
  }
}
