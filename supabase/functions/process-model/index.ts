import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PYTHON_SERVICE_URL = 'https://forecastify-bridge.onrender.com'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileUrl } = await req.json()
    console.log('Processing file:', fileUrl)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the file content from storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('model-inputs')
      .download(fileUrl)

    if (fileError) {
      console.error('Error downloading file:', fileError)
      throw new Error(`Error downloading file: ${fileError.message}`)
    }

    // Convert file content to text
    const fileContent = await fileData.text()

    // Call Python service
    console.log('Calling Python service...')
    const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileContent }),
    })

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text()
      console.error('Python service error:', errorText)
      throw new Error(`Python service error: ${pythonResponse.status} ${errorText}`)
    }

    const results = await pythonResponse.json()
    console.log('Python service response:', results)

    // Update model results
    const { error: updateError } = await supabase
      .from('model_results')
      .update({ 
        results: results,
        status: 'completed'
      })
      .eq('input_file_path', fileUrl)

    if (updateError) {
      console.error('Error updating results:', updateError)
      throw new Error(`Error updating results: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in process-model function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})