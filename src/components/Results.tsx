import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Results = () => {
  const { data: results, isLoading } = useQuery({
    queryKey: ['model-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const handleDownload = () => {
    if (!results) return;
    
    const jsonString = JSON.stringify(results.results, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model-results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full border-2 border-accent/10">
      <CardHeader>
        <CardTitle className="font-glegoo text-accent">Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg border-secondary/30 overflow-auto p-4">
            {isLoading ? (
              <p className="text-gray-500">Loading results...</p>
            ) : !results ? (
              <p className="text-gray-500">No results available</p>
            ) : (
              <div className="w-full">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={`text-sm ${
                      results.status === 'completed' ? 'text-green-600' : 
                      results.status === 'processing' ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      {results.status.charAt(0).toUpperCase() + results.status.slice(1)}
                    </span>
                  </div>
                  {results.results && Object.keys(results.results).length > 0 && (
                    <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                      {JSON.stringify(results.results, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button 
            className="w-full bg-secondary hover:bg-secondary/90"
            onClick={handleDownload}
            disabled={!results || !results.results}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};