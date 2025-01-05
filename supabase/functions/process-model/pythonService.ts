export class PythonService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://forecastify-bridge.onrender.com';
  }

  async processFile(fileContent: string): Promise<any> {
    console.log('PythonService: Calling Python service at:', this.baseUrl);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileContent }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      console.log('PythonService: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PythonService: Error:', errorText);
        throw new Error(`Python service error: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Python service timeout after 60 seconds');
      }
      throw error;
    }
  }
}