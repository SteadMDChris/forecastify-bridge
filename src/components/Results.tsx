import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModelResultsRow, ModelResults } from "@/types/forecast";
import { Database } from "@/integrations/supabase/types";
import { ChartTabs } from "./ChartTabs";

type DbModelResult = Database['public']['Tables']['model_results']['Row'];

export const Results = () => {
  const { data: results, isLoading } = useQuery<DbModelResult>({
    queryKey: ['model-results'],
    queryFn: async () => {
      console.log("Fetching results...");
      const { data, error } = await supabase
        .from('model_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching results:", error);
        throw error;
      }
      
      console.log("Fetched data:", data);
      return data as DbModelResult;
    },
    refetchInterval: (data) => {
      if (!data) return false;
      return data.status === 'processing' ? 5000 : false;
    },
    refetchIntervalInBackground: true,
    enabled: true,
    staleTime: 0,
    gcTime: 0
  });

  // Safely parse the results with proper type assertion
  const parsedResults = results?.results ? (results.results as unknown as ModelResults) : undefined;

  const handleDownload = () => {
    if (!results || !parsedResults) return;
    
    const jsonString = JSON.stringify(parsedResults, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forecast_output.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="w-full border-2 border-accent/10">
        <CardHeader>
          <CardTitle className="font-glegoo text-accent">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="h-[500px] flex flex-col gap-4 border-2 border-dashed rounded-lg border-secondary/30 overflow-auto p-4">
              {isLoading ? (
                <p className="text-gray-500">Loading results...</p>
              ) : !results ? (
                <p className="text-gray-500">No results available. Upload a file to get started.</p>
              ) : (
                <div className="w-full space-y-6">
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
                    
                    {parsedResults && results.status === 'completed' && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Overview</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Date Range</p>
                              <p className="text-gray-600">
                                {parsedResults.overview.minDate} to {parsedResults.overview.maxDate}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Coverage</p>
                              <p className="text-gray-600">{parsedResults.overview.dataCoverageDays} days</p>
                            </div>
                            <div>
                              <p className="font-medium">Total Rows</p>
                              <p className="text-gray-600">{parsedResults.overview.totalRows}</p>
                            </div>
                            <div>
                              <p className="font-medium">Partners</p>
                              <p className="text-gray-600">{parsedResults.overview.partners.join(', ')}</p>
                            </div>
                          </div>
                        </div>

                        <ChartTabs forecastData={parsedResults.forecast.nextSevenDays} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button 
              className="w-full bg-secondary hover:bg-secondary/90"
              onClick={handleDownload}
              disabled={!results || !parsedResults}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};