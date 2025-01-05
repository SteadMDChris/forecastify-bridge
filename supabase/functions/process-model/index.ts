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
    console.log('Processing file:', fileUrl)

    const pythonServiceUrl = 'https://forecastify-bridge.onrender.com'
    console.log('Connecting to Python service at:', pythonServiceUrl)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('model-inputs')
      .download(fileUrl)

    if (downloadError) {
      throw new Error(`Error downloading file: ${downloadError.message}`)
    }

    // Convert the file to text
    const fileContent = await fileData.text()
    
    // Test connection to Python service
    try {
      const testResponse = await fetch(pythonServiceUrl + '/health', {
        method: 'GET',
      })
      
      if (!testResponse.ok) {
        throw new Error(`Python service health check failed: ${testResponse.statusText}`)
      }
      
      console.log('Successfully connected to Python service')
    } catch (error) {
      console.error('Failed to connect to Python service:', error)
      throw new Error(`Cannot connect to Python service: ${error.message}`)
    }
    
    // Send to Python service for processing
    console.log('Sending data to Python service for processing')
    const response = await fetch(pythonServiceUrl + '/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileContent })
    })

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`)
    }

    const processingResult = await response.json()
    console.log('Received processing results from Python service')

    // Update the model_results table
    const { error: updateError } = await supabase
      .from('model_results')
      .update({ 
        status: 'completed',
        results: processingResult.data
      })
      .eq('input_file_path', fileUrl)

    if (updateError) {
      throw new Error(`Error updating results: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, results: processingResult.data }),
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