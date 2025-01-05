import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModelResultsRow, ModelResults } from "@/types/forecast";
import { Database } from "@/integrations/supabase/types";

type DbModelResult = Database['public']['Tables']['model_results']['Row'];

export const Results = () => {
  const { data: results, isLoading } = useQuery<ModelResultsRow | null>({
    queryKey: ['model-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Convert the database result to our ModelResultsRow type
      return {
        ...data,
        results: data.results as ModelResults,
        status: data.status as ModelResultsRow['status']
      };
    }
  });

  const handleDownload = () => {
    if (!results) return;
    
    const jsonString = JSON.stringify(results.results, null, 2);
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
                  
                  {results.results && results.status === 'completed' && (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Overview</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Date Range</p>
                            <p className="text-gray-600">
                              {results.results.overview.minDate} to {results.results.overview.maxDate}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Coverage</p>
                            <p className="text-gray-600">{results.results.overview.dataCoverageDays} days</p>
                          </div>
                          <div>
                            <p className="font-medium">Total Rows</p>
                            <p className="text-gray-600">{results.results.overview.totalRows}</p>
                          </div>
                          <div>
                            <p className="font-medium">Partners</p>
                            <p className="text-gray-600">{results.results.overview.partners.join(', ')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Forecast</h3>
                        <div className="space-y-2">
                          <p className="font-medium">Next 7 Days Prediction</p>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left">Date</th>
                                  <th className="text-right">Predicted</th>
                                </tr>
                              </thead>
                              <tbody>
                                {results.results.forecast.nextSevenDays.map((day) => (
                                  <tr key={day.date}>
                                    <td>{day.date}</td>
                                    <td className="text-right">{day.predicted}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
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