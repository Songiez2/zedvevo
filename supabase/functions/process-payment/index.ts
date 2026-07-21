import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentRequest {
  amount: number;
  payment_method: 'visa' | 'mastercard' | 'mobile_money';
  payment_details: {
    card_number?: string;
    expiry?: string;
    cvv?: string;
    phone_number?: string;
  };
  purchase_type: string;
  reference_id?: string;
  metadata?: Record<string, unknown>;
  // For K5 plan: song/video data to upload after payment
  upload_data?: {
    title: string;
    artist_name: string;
    genre?: string;
    description?: string;
    cover_url?: string;
    audio_url?: string;
    video_url?: string;
    thumbnail_url?: string;
    is_free: boolean;
    price: number;
    content_type: 'song' | 'video';
  };
  // For artist plans
  plan_type?: 'k5' | 'k100' | 'k500';
}

function validateCardNumber(num: string): boolean {
  const cleaned = num.replace(/\s/g, '');
  return /^\d{13,19}$/.test(cleaned);
}

function validateExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const [, month, year] = match;
  const m = parseInt(month, 10);
  const y = 2000 + parseInt(year, 10);
  const now = new Date();
  return m >= 1 && m <= 12 && (y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1));
}

function validateCVV(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

function validatePhone(phone: string): boolean {
  return /^(\+?260|0)[0-9]{9}$/.test(phone.replace(/\s/g, ''));
}

function simulatePaymentSuccess(method: string, details: Record<string, string | undefined>): { success: boolean; message: string } {
  // Simulate payment processing — in production, integrate with Lipila/mobile money gateway
  if (method === 'visa' || method === 'mastercard') {
    if (!details.card_number || !validateCardNumber(details.card_number)) {
      return { success: false, message: 'Invalid card number' };
    }
    if (!details.expiry || !validateExpiry(details.expiry)) {
      return { success: false, message: 'Invalid or expired card' };
    }
    if (!details.cvv || !validateCVV(details.cvv)) {
      return { success: false, message: 'Invalid CVV' };
    }
    return { success: true, message: 'Card payment processed successfully' };
  }
  if (method === 'mobile_money') {
    if (!details.phone_number || !validatePhone(details.phone_number)) {
      return { success: false, message: 'Invalid Zambian mobile money number' };
    }
    return { success: true, message: 'Mobile money payment processed. Check your phone for confirmation.' };
  }
  return { success: false, message: 'Unknown payment method' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: PaymentRequest = await req.json();
    const { amount, payment_method, payment_details, purchase_type, reference_id, metadata, upload_data, plan_type } = body;

    // Validate payment details
    const validation = simulatePaymentSuccess(payment_method, {
      card_number: payment_details.card_number,
      expiry: payment_details.expiry,
      cvv: payment_details.cvv,
      phone_number: payment_details.phone_number,
    } as Record<string, string | undefined>);

    // Mask sensitive data before storing
    const maskedDetails: Record<string, string> = {};
    if (payment_method === 'mobile_money') {
      maskedDetails.phone = (payment_details.phone_number || '').replace(/(\d{3})\d+(\d{3})/, '$1****$2');
    } else {
      maskedDetails.last4 = (payment_details.card_number || '').replace(/\s/g, '').slice(-4);
      maskedDetails.type = payment_method;
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        currency: 'ZMW',
        payment_method,
        payment_details: maskedDetails,
        status: validation.success ? 'completed' : 'failed',
        purchase_type,
        reference_id: reference_id || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (paymentError) {
      return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validation.success) {
      return new Response(JSON.stringify({ success: false, message: validation.message, payment_id: payment.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Payment succeeded — process the purchase
    const purchaseResult: Record<string, unknown> = {};

    if (purchase_type === 'artist_plan' && plan_type) {
      const planConfig: Record<string, { songs_limit: number | null; tickets_limit: number | null; merch_limit: number | null }> = {
        k5: { songs_limit: 1, tickets_limit: 0, merch_limit: 0 },
        k100: { songs_limit: 10, tickets_limit: 4, merch_limit: 2 },
        k500: { songs_limit: null, tickets_limit: null, merch_limit: null },
      };
      const config = planConfig[plan_type];

      // Deactivate old plans
      await supabase.from('artist_plan_purchases')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Create new plan record
      const { data: planRecord } = await supabase.from('artist_plan_purchases').insert({
        user_id: user.id,
        plan_type,
        payment_id: payment.id,
        amount,
        ...config,
        is_active: true,
      }).select().single();

      // Update profile role & plan
      await supabase.from('profiles').update({
        role: 'artist',
        artist_plan: plan_type,
        plan_purchased_at: new Date().toISOString(),
      }).eq('id', user.id);

      // If K5 and upload_data provided, handle upload
      if (plan_type === 'k5' && upload_data) {
        if (upload_data.content_type === 'song' && upload_data.audio_url) {
          const { data: song } = await supabase.from('songs').insert({
            artist_id: user.id,
            title: upload_data.title,
            artist_name: upload_data.artist_name,
            genre: upload_data.genre,
            description: upload_data.description,
            cover_url: upload_data.cover_url,
            audio_url: upload_data.audio_url,
            price: upload_data.price,
            is_free: upload_data.is_free,
            status: 'pending',
          }).select().single();
          purchaseResult.uploaded_song = song;
        } else if (upload_data.content_type === 'video' && upload_data.video_url) {
          const { data: video } = await supabase.from('videos').insert({
            artist_id: user.id,
            title: upload_data.title,
            artist_name: upload_data.artist_name,
            genre: upload_data.genre,
            description: upload_data.description,
            thumbnail_url: upload_data.thumbnail_url,
            video_url: upload_data.video_url,
            price: upload_data.price,
            is_free: upload_data.is_free,
            status: 'pending',
          }).select().single();
          purchaseResult.uploaded_video = video;
        }
        // Update plan usage
        await supabase.from('artist_plan_purchases')
          .update({ songs_used: 1 })
          .eq('id', planRecord?.id);
        await supabase.from('profiles')
          .update({ songs_uploaded: 1 })
          .eq('id', user.id);
      }

      purchaseResult.plan = planRecord;

      // Notify user
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Artist Plan Activated!',
        message: `Your ${plan_type.toUpperCase()} plan is now active. Start uploading your music!`,
        type: 'plan',
        reference_id: payment.id,
      });
    } else if (['song', 'video', 'album', 'ticket', 'merchandise'].includes(purchase_type)) {
      // Generate QR for tickets
      const qrCode = purchase_type === 'ticket'
        ? `ZV-TKT-${user.id.slice(0, 8)}-${reference_id?.slice(0, 8)}-${Date.now()}`
        : undefined;

      const { data: purchase } = await supabase.from('purchases').insert({
        user_id: user.id,
        purchase_type,
        reference_id,
        payment_id: payment.id,
        qr_code: qrCode,
      }).select().single();

      purchaseResult.purchase = purchase;
      if (qrCode) purchaseResult.qr_code = qrCode;

      // Update ticket sold count
      if (purchase_type === 'ticket' && reference_id) {
        await supabase.from('tickets')
          .update({ quantity_sold: supabase.rpc('increment', { row_id: reference_id }) })
          .eq('id', reference_id);
      }

      // Notify
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Purchase Successful!',
        message: `Your ${purchase_type} has been unlocked. Check your library.`,
        type: 'purchase',
        reference_id: reference_id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: validation.message, payment_id: payment.id, ...purchaseResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
