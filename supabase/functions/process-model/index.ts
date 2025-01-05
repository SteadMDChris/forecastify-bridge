import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Edge Function: Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Edge Function: Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { fileUrl } = body;
    if (!fileUrl) {
      console.error('Edge Function: No fileUrl provided');
      return new Response(
        JSON.stringify({ error: 'No fileUrl provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Edge Function: Processing file:', fileUrl);

    // Initialize Supabase client with timeout
    console.log('Edge Function: Initializing Supabase client');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Get the file content from storage with timeout
    console.log('Edge Function: Downloading file from storage');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('model-inputs')
        .download(fileUrl);

      clearTimeout(timeout);

      if (fileError) {
        console.error('Edge Function: Error downloading file:', fileError);
        // Update status to error
        await supabase
          .from('model_results')
          .update({ 
            status: 'error',
            results: { error: fileError.message }
          })
          .eq('input_file_path', fileUrl);
        
        return new Response(
          JSON.stringify({ error: `Error downloading file: ${fileError.message}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Convert file content to text
      console.log('Edge Function: Converting file to text');
      const fileContent = await fileData.text();
      console.log('Edge Function: File content length:', fileContent.length);

      // Call Python service with timeout
      const PYTHON_SERVICE_URL = 'https://forecastify-bridge.onrender.com';
      console.log('Edge Function: Calling Python service at:', PYTHON_SERVICE_URL);
      
      const pythonController = new AbortController();
      const pythonTimeout = setTimeout(() => pythonController.abort(), 60000); // 60 second timeout

      try {
        const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileContent }),
          signal: pythonController.signal
        });

        clearTimeout(pythonTimeout);

        console.log('Edge Function: Python service response status:', pythonResponse.status);

        if (!pythonResponse.ok) {
          const errorText = await pythonResponse.text();
          console.error('Edge Function: Python service error:', errorText);
          
          // Update status to error
          await supabase
            .from('model_results')
            .update({ 
              status: 'error',
              results: { error: errorText }
            })
            .eq('input_file_path', fileUrl);
            
          return new Response(
            JSON.stringify({ error: `Python service error: ${pythonResponse.status} ${errorText}` }),
            { 
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const results = await pythonResponse.json();
        console.log('Edge Function: Python service response received');

        // Update model results
        console.log('Edge Function: Updating model results in database');
        const { error: updateError } = await supabase
          .from('model_results')
          .update({ 
            results: results.data,
            status: 'completed'
          })
          .eq('input_file_path', fileUrl);

        if (updateError) {
          console.error('Edge Function: Error updating results:', updateError);
          return new Response(
            JSON.stringify({ error: `Error updating results: ${updateError.message}` }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Edge Function: Processing completed successfully');
        return new Response(
          JSON.stringify({ success: true, data: results }),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            } 
          }
        );

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Edge Function: Python service timeout');
          return new Response(
            JSON.stringify({ error: 'Python service timeout after 60 seconds' }),
            { 
              status: 504,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        throw error;
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Edge Function: File download timeout');
        return new Response(
          JSON.stringify({ error: 'File download timeout after 30 seconds' }),
          { 
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Edge Function: Error in process-model function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        details: error.stack
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});