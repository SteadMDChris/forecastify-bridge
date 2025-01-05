import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export const Results = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-gray-500">Results will appear here</p>
          </div>
          <Button className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};