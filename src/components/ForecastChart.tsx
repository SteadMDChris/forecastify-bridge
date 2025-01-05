import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ForecastDay } from "@/types/forecast";

interface ForecastChartProps {
  data: ForecastDay[];
}

export const ForecastChart = ({ data }: ForecastChartProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-glegoo text-accent">7-Day Forecast Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis 
                dataKey="date" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Date:</span>
                          <span>{payload[0].payload.date}</span>
                          <span className="font-medium">Predicted:</span>
                          <span>{payload[0].value}</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#FF264D"
                strokeWidth={2}
                dot={{ fill: "#FF264D" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};