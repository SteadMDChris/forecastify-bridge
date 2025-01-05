import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { createErrorResponse } from './utils.ts'

export class FileService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );
  }

  async downloadFile(fileUrl: string): Promise<string> {
    console.log('FileService: Downloading file from storage:', fileUrl);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const { data: fileData, error: fileError } = await this.supabase
        .storage
        .from('model-inputs')
        .download(fileUrl);

      clearTimeout(timeout);

      if (fileError) {
        console.error('FileService: Error downloading file:', fileError);
        throw new Error(`Error downloading file: ${fileError.message}`);
      }

      const fileContent = await fileData.text();
      console.log('FileService: File content length:', fileContent.length);
      return fileContent;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('File download timeout after 30 seconds');
      }
      throw error;
    }
  }

  async updateModelStatus(fileUrl: string, status: 'error' | 'completed', results: any) {
    console.log(`FileService: Updating model status to ${status}`);
    const { error: updateError } = await this.supabase
      .from('model_results')
      .update({ 
        results,
        status
      })
      .eq('input_file_path', fileUrl);

    if (updateError) {
      throw new Error(`Error updating results: ${updateError.message}`);
    }
  }
}