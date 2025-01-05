import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForecastChart } from "./ForecastChart";
import { Card } from "./ui/card";
import { ForecastDay } from "@/types/forecast";

interface ChartTabsProps {
  forecastData: ForecastDay[];
}

export const ChartTabs = ({ forecastData }: ChartTabsProps) => {
  return (
    <Tabs defaultValue="forecast" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="forecast">7-Day Forecast</TabsTrigger>
        <TabsTrigger value="historical">Historical Data</TabsTrigger>
      </TabsList>
      <TabsContent value="forecast">
        <ForecastChart data={forecastData} />
      </TabsContent>
      <TabsContent value="historical">
        <Card className="p-6">
          <p className="text-muted-foreground">
            Historical data visualization coming soon...
          </p>
        </Card>
      </TabsContent>
    </Tabs>
  );
};