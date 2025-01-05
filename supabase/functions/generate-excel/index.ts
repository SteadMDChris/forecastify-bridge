import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileUrl } = await req.json()
    console.log('Processing file for Excel:', fileUrl)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the model results
    const { data: modelResult, error: fetchError } = await supabase
      .from('model_results')
      .select('results')
      .eq('input_file_path', fileUrl)
      .single()

    if (fetchError) {
      throw new Error(`Error fetching results: ${fetchError.message}`)
    }

    // Generate Excel file content (mock implementation)
    const excelContent = new Uint8Array([/* Excel file bytes would go here */])
    const fileName = `forecast_${Date.now()}.xlsx`

    // Upload Excel file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('model-inputs')
      .upload(`excel/${fileName}`, excelContent.buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Error uploading Excel file: ${uploadError.message}`)
    }

    // Get download URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('model-inputs')
      .getPublicUrl(`excel/${fileName}`)

    return new Response(
      JSON.stringify({ success: true, downloadUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})