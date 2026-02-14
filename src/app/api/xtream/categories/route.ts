import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { host, username, password } = await request.json()

    if (!host || !username || !password) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios' }, { status: 400 })
    }

    // Primeiro: autenticar para obter informações do servidor
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

    // Segundo: obter categorias
    const categoriesUrl = `http://${host}/player_api.php?username=${username}&password=${password}&action=get_live_categories`
    const response = await fetch(categoriesUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    })

    const data = await response.json()

    return NextResponse.json({
      success: true,
      categories: Array.isArray(data) ? data : [],
      serverUrl
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao carregar categorias' }, { status: 500 })
  }
}
