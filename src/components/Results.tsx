import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { ForecastChart } from "./ForecastChart";
import { ModelResults, ModelResultsRow } from "@/types/forecast";

export function Results() {
  const { data, isLoading, error } = useQuery<ModelResultsRow | null, Error>({
    queryKey: ['model_results'],
    queryFn: async () => {
      console.log('Fetching results...');
      const { data, error } = await supabase
        .from('model_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      console.log('Fetched data:', data);

      if (!data) return null;

      // Type assertion for status and results
      const status = data.status as ModelResultsRow['status'];
      const results = data.results as unknown as ModelResults;
      
      // Ensure the results match our expected type
      const typedData: ModelResultsRow = {
        id: data.id,
        user_id: data.user_id,
        input_file_path: data.input_file_path,
        status: status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        results: results
      };

      return typedData;
    },
    refetchInterval: (query) => {
      const queryData = query.state.data;
      if (!queryData) return false;
      // If the status is 'processing', refetch every 5 seconds
      return queryData.status === 'processing' ? 5000 : false;
    }
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-[200px] w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading results: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Show processing state
  if (data?.status === 'processing') {
    return (
      <Alert>
        <AlertDescription>
          Processing your data... This may take a few moments.
        </AlertDescription>
      </Alert>
    );
  }

  // Check if we have valid results data
  if (!data?.results?.overview || !data?.results?.forecast?.nextSevenDays) {
    return (
      <Alert>
        <AlertDescription>
          No results available yet. Please upload a file to start the analysis.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4">
          <div>
            <h3 className="text-lg font-semibold">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{data.results.overview.minDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{data.results.overview.maxDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coverage (days)</p>
                <p className="font-medium">{data.results.overview.dataCoverageDays}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="font-medium">{data.results.overview.totalRows}</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Partners</h3>
            <div className="flex flex-wrap gap-2">
              {data.results.overview.partners.map((partner: string) => (
                <span
                  key={partner}
                  className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                >
                  {partner}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Forecast</h3>
            <ForecastChart data={data.results.forecast.nextSevenDays} />
          </div>
        </div>
      </Card>
    </div>
  );
}