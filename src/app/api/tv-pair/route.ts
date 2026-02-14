import { NextRequest, NextResponse } from 'next/server'

interface Credentials {
  raw: string
  host?: string
  username?: string
  password?: string
}

interface PairingSession {
  status: 'waiting' | 'connected' | 'credentials_received'
  credentials: Credentials | null
  createdAt: number
}

// Global in-memory storage for pairing sessions (persisted across requests)
declare global {
  var pairingSessions: Map<string, PairingSession> | undefined
}

// Initialize global storage if not exists
if (!global.pairingSessions) {
  global.pairingSessions = new Map<string, PairingSession>()
}

const sessions = global.pairingSessions

// Cleanup expired sessions (10 minutes expiry)
const EXPIRY = 10 * 60 * 1000

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [code, session] of sessions.entries()) {
    if (now - session.createdAt > EXPIRY) {
      sessions.delete(code)
      console.log(`[TV-Pair] Session ${code} expired and removed`)
    }
  }
}

// Run cleanup on each request
cleanupExpiredSessions()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, code, credentials } = body

    console.log(`[TV-Pair] POST request - action: ${action}, code: ${code}`)

    if (action === 'create') {
      let newCode: string
      let attempts = 0
      
      do {
        newCode = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        attempts++
        if (attempts > 100) {
          console.error('[TV-Pair] Failed to generate unique code')
          return NextResponse.json({
            success: false,
            error: 'Não foi possível gerar código. Tente novamente.'
          }, { status: 500 })
        }
      } while (sessions.has(newCode))

      sessions.set(newCode, {
        status: 'waiting',
        credentials: null,
        createdAt: Date.now()
      })

      console.log(`[TV-Pair] Created session ${newCode}, total sessions: ${sessions.size}`)

      return NextResponse.json({
        success: true,
        code: newCode,
        expiresAt: Date.now() + EXPIRY
      })
    }

    if (action === 'connect') {
      if (!code || typeof code !== 'string') {
        return NextResponse.json({
          success: false,
          error: 'Código inválido'
        }, { status: 400 })
      }

      const session = sessions.get(code)
      if (!session) {
        console.log(`[TV-Pair] Session ${code} not found for connect`)
        return NextResponse.json({
          success: false,
          error: 'Código não encontrado ou expirado'
        }, { status: 404 })
      }

      session.status = 'connected'
      console.log(`[TV-Pair] Session ${code} connected`)

      return NextResponse.json({ success: true })
    }

    if (action === 'credentials') {
      if (!code || !credentials) {
        return NextResponse.json({
          success: false,
          error: 'Código e credenciais são obrigatórios'
        }, { status: 400 })
      }

      const session = sessions.get(code)
      if (!session) {
        console.log(`[TV-Pair] Session ${code} not found for credentials`)
        return NextResponse.json({
          success: false,
          error: 'Sessão não encontrada ou expirada'
        }, { status: 404 })
      }

      const structuredCreds: Credentials = {
        raw: credentials.raw || '',
        host: credentials.host,
        username: credentials.username,
        password: credentials.password
      }

      session.status = 'credentials_received'
      session.credentials = structuredCreds

      console.log(`[TV-Pair] Session ${code} received credentials for host: ${credentials.host}`)

      return NextResponse.json({ 
        success: true,
        message: 'Credenciais enviadas com sucesso'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Ação inválida'
    }, { status: 400 })

  } catch (error) {
    console.error('[TV-Pair] POST Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    console.log(`[TV-Pair] GET request - code: ${code}`)

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Código não fornecido'
      }, { status: 400 })
    }

    const session = sessions.get(code)
    if (!session) {
      console.log(`[TV-Pair] GET Session ${code} not found`)
      return NextResponse.json({
        success: false,
        error: 'Código não encontrado ou expirado',
        status: 'expired'
      }, { status: 404 })
    }

    console.log(`[TV-Pair] GET Session ${code} status: ${session.status}`)

    return NextResponse.json({
      success: true,
      status: session.status,
      credentials: session.credentials
    })

  } catch (error) {
    console.error('[TV-Pair] GET Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
