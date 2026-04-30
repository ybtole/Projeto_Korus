// supabase/functions/admin-usuarios/index.ts
// Edge Function que roda com service_role para criar/remover usuários
// Chamada apenas por usuários com papel "T.I" (verificado pelo JWT)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Autenticação: verificar se o chamador é T.I ──────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cliente anon (para verificar o caller)
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const papel = user.user_metadata?.papel
  const isTI = papel === 'T.I'
  const isAC = papel === 'A.C'
  const isRA = papel === 'R.A'
  const isRM = papel === 'R.M'

  if (!isTI && !isAC && !isRA && !isRM) {
    return new Response(JSON.stringify({ error: 'Você não tem permissão para gerenciar usuários' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Cliente admin (service_role) ─────────────────────────────────────────────
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const body = await req.json()
  const { acao } = body // 'criar' | 'remover' | 'listar' | 'mudar_cargo' | 'editar_nome'

  if (acao !== 'listar' && !isTI && !isAC) {
    return new Response(JSON.stringify({ error: 'Você só tem permissão para visualizar os usuários' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Criar usuário ────────────────────────────────────────────────────────────
  if (acao === 'criar') {
    const { cpf, papel: papelNovo, nome } = body

    if (!cpf || !papelNovo) {
      return new Response(JSON.stringify({ error: 'CPF e papel são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Limpar CPF (remover pontos e traço)
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
      return new Response(JSON.stringify({ error: 'CPF inválido. Informe 11 dígitos.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = `${cpfLimpo}@aguia.com`
    const senha = cpfLimpo // senha = CPF sem pontuação

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        papel: papelNovo,
        nome: nome ?? cpfLimpo,
        email_verified: true,
      },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Remover usuário ──────────────────────────────────────────────────────────
  if (acao === 'remover') {
    const { user_id } = body

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Listar usuários ──────────────────────────────────────────────────────────
  if (acao === 'listar') {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Retornar apenas dados relevantes
    const usuarios = data.users.map(u => ({
      id: u.id,
      email: u.email,
      papel: u.user_metadata?.papel ?? '—',
      nome: u.user_metadata?.nome ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))

    return new Response(JSON.stringify({ ok: true, usuarios }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Mudar cargo ──────────────────────────────────────────────────────────────
  if (acao === 'mudar_cargo') {
    const { user_id, papel: novoPapel } = body
    if (!user_id || !novoPapel) {
      return new Response(JSON.stringify({ error: 'user_id e papel são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Buscar metadata atual para não sobrescrever outros campos
    const { data: { user: current } } = await supabaseAdmin.auth.admin.getUserById(user_id)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      user_metadata: { ...current?.user_metadata, papel: novoPapel },
    })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Editar nome ───────────────────────────────────────────────────────────────
  if (acao === 'editar_nome') {
    const { user_id, nome } = body
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user: current } } = await supabaseAdmin.auth.admin.getUserById(user_id)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      user_metadata: { 
        ...current?.user_metadata, 
        nome: nome ?? null,
        name: nome ?? null,
        display_name: nome ?? null
      },
    })
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Tentar atualizar também a tabela pública de usuários
    await supabaseAdmin.from('usuarios').update({ nome: nome ?? null }).eq('id', user_id)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
