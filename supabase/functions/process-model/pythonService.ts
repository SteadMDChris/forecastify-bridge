export class PythonService {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = 'https://forecastify-bridge.onrender.com';
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processFile(fileContent: string): Promise<any> {
    console.log('PythonService: Starting file processing with retries');
    
    let lastError;
    for(let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`PythonService: Attempt ${attempt} of ${this.maxRetries}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${this.baseUrl}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileContent }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`PythonService: Error response (${response.status}):`, errorText);
          
          if (response.status === 502) {
            throw new Error('Python service is temporarily unavailable');
          }
          
          throw new Error(`Python service error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('PythonService: Successfully processed file');
        return data;

      } catch (error) {
        console.error(`PythonService: Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < this.maxRetries) {
          console.log(`PythonService: Waiting ${this.retryDelay}ms before retry`);
          await this.sleep(this.retryDelay);
        }
      }
    }

    throw lastError;
  }
}