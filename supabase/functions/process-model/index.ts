import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, createErrorResponse, createSuccessResponse } from './utils.ts'
import { FileService } from './fileService.ts'
import { PythonService } from './pythonService.ts'

serve(async (req) => {
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
      return createErrorResponse('Invalid request body', 400);
    }

    const { fileUrl } = body;
    if (!fileUrl) {
      console.error('Edge Function: No fileUrl provided');
      return createErrorResponse('No fileUrl provided', 400);
    }

    console.log('Edge Function: Processing file:', fileUrl);

    const fileService = new FileService();
    const pythonService = new PythonService();

    try {
      // Download and process file
      const fileContent = await fileService.downloadFile(fileUrl);
      
      // Process with Python service
      const results = await pythonService.processFile(fileContent);
      
      // Update model results
      await fileService.updateModelStatus(fileUrl, 'completed', results.data);

      console.log('Edge Function: Processing completed successfully');
      return createSuccessResponse({ success: true, data: results });

    } catch (error) {
      console.error('Edge Function: Error in processing:', error);
      
      // Update status to error if possible
      try {
        await fileService.updateModelStatus(fileUrl, 'error', { error: error.message });
      } catch (updateError) {
        console.error('Edge Function: Error updating error status:', updateError);
      }

      // Determine appropriate status code
      const status = error.message.includes('timeout') ? 504 : 500;
      return createErrorResponse(error.message, status);
    }

  } catch (error) {
    console.error('Edge Function: Unexpected error:', error);
    return createErrorResponse('An unexpected error occurred');
  }
});