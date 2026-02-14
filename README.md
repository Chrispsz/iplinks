# 📺 IPLINKS - Player IPTV Inteligente

> Player IPTV que automaticamente conecta ao servidor mais rápido disponível

---

## 🌟 Funcionalidades

### ⚡ **Auto-Conexão Inteligente**
- Mede automaticamente a latência de cada servidor
- Seleciona o servidor mais rápido automaticamente
- Suporta múltiplas contas simultâneas
- Indicadores visuais de velocidade (⚡ Rápido, 🕐 Médio, ❌ Lento)

### 📺 **Sistema de Multi-Contas**
- Adicione quantas contas quiser
- Sistema mede e ordena por velocidade
- Troque entre contas facilmente
- Veja latência em tempo real

### 📱 **Sistema de Pairing TV**
- Use na TV sem teclado: gere um código
- Envie credenciais do celular/PC digitando o código
- Conexão automática sem cabos
- Ideal para TVs Smart e TVs Box

### 🎬 **Player IPTV Completo**
- Carregamento de categorias e canais
- Busca de canais por nome
- Abrir em apps externos (VLC, WVC)
- Copiar URLs para compartilhar
- Interface responsiva e moderna

---

## 🚀 Como Começar

### Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/iplinks.git
cd iplinks

# Instale as dependências
bun install

# Inicie o servidor de desenvolvimento
bun run dev
```

---

## 📱 Como Usar

### Opção 1: Acesso Direto
1. Clique em "Acesso Direto"
2. Cole suas credenciais no formato:
   ```
   Servidor: servidor.com:8080
   Usuário: seu_usuario
   Senha: sua_senha
   ```
3. Clique em "CONECTAR"
4. Selecione uma categoria e depois um canal

### Opção 2: Receber na TV
1. Na TV, clique em "Receber Credenciais"
2. Anote o código de 3 dígitos
3. No celular/PC, clique em "Enviar Credenciais"
4. Digite o código e cole suas credenciais
5. TV recebe e conecta automaticamente

---

## 📺 Como Assistir

| Dispositivo | Método |
|-------------|--------|
| **Android** | Toque em WVC (TV) ou VLC para abrir diretamente |
| **PC/Desktop** | Copie a URL e cole no VLC (Media → Open Network Stream) |

---

## 🔧 Tecnologias

- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling
- **Lucide React** - Icons
- **Radix UI** - Componentes base (shadcn/ui)

---

## 🚀 Deploy

### Vercel (Recomendado)
```bash
vercel deploy --prod
```

### VPS/Server
```bash
bun install
bun run build
bun start
```

---

## 📄 Licença

Este projeto é de código aberto e está disponível sob a Licença MIT.

---

**IPLINKS - Player IPTV Inteligente** ⚡📺🚀
