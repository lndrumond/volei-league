import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 🚨 AQUI: Agora recebemos a description (descrição/nome da rodada)
    const { slug, present_player_ids, description } = await request.json();

    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });

    // Se a pessoa não digitou nada, criamos um nome padrão com a data de hoje
    const sessionName = description?.trim() || `Rodada ${new Date().toLocaleDateString('pt-BR')}`;

    // Verifica se JÁ EXISTE uma rodada aberta
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('group_id', group.id)
      .eq('status', 'active')
      .maybeSingle(); 

    if (existing) {
      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update({ 
          present_player_ids: present_player_ids || [],
          description: sessionName // Atualiza o nome também
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, session: updatedSession });
    }

    // Cria a rodada nova salvando a descrição
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ 
        group_id: group.id, 
        status: 'active',
        present_player_ids: present_player_ids || [],
        description: sessionName // 🚨 Salvando no banco!
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, session });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao abrir a quadra.' }, { status: 500 });
  }
}