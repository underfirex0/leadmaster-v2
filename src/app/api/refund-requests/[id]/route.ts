export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type P = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Admin only
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { action, admin_note } = await request.json()
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action doit être approve ou reject' }, { status: 400 })
    }

    // Get the refund request
    const { data: refundReq } = await supabaseAdmin
      .from('refund_requests')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!refundReq) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (refundReq.status !== 'pending') {
      return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 409 })
    }

    if (action === 'approve') {
      // 1. Refund credits to user
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('credit_balance')
        .eq('id', refundReq.user_id)
        .single()

      const currentBalance = userProfile?.credit_balance ?? 0
      const newBalance = currentBalance + (refundReq.credits_to_refund ?? 0)

      await supabaseAdmin
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', refundReq.user_id)

      // 2. Log the credit transaction
      await supabaseAdmin.from('credit_transactions').insert({
        user_id:      refundReq.user_id,
        amount:       refundReq.credits_to_refund,
        balance_after: newBalance,
        type:         'refund',
        description:  `Remboursement — ${refundReq.company_name ?? refundReq.company_id} (${refundReq.reason})`,
      })

      // 3. Update refund request status
      await supabaseAdmin
        .from('refund_requests')
        .update({
          status:      'approved',
          admin_note:  admin_note || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      return NextResponse.json({
        success: true,
        message: `${refundReq.credits_to_refund} cr remboursés à l'utilisateur`,
        newBalance,
      })
    }

    // Reject
    await supabaseAdmin
      .from('refund_requests')
      .update({
        status:      'rejected',
        admin_note:  admin_note || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    return NextResponse.json({ success: true, message: 'Demande rejetée' })
  } catch (e) {
    console.error('PATCH refund-requests error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
