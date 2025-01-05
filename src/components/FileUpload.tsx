import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const processData = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      console.log("Starting file upload process");
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        throw new Error("You must be logged in to upload files");
      }

      // First upload the file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('model-inputs')
        .upload(`${Date.now()}-${file.name}`, file);

      if (uploadError) throw uploadError;
      
      console.log("File uploaded successfully:", uploadData.path);

      // Create a new model_results record with user_id
      const { data: modelResult, error: modelError } = await supabase
        .from('model_results')
        .insert([
          {
            input_file_path: uploadData.path,
            status: 'processing',
            user_id: user.id // Include the user_id
          }
        ])
        .select()
        .single();

      if (modelError) throw modelError;
      
      console.log("Created model_results record:", modelResult);

      // Call the edge function to process the model
      const { data, error } = await supabase.functions.invoke('process-model', {
        body: { fileUrl: uploadData.path }
      });

      if (error) throw error;

      console.log("Edge function response:", data);

      toast({
        title: "Success!",
        description: "Data processed successfully",
      });

    } catch (error) {
      console.error('Error processing data:', error);
      toast({
        title: "Error",
        description: "Failed to process data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setFile(null);
    }
  };

  return (
    <Card className="w-full border-2 border-accent/10">
      <CardHeader>
        <CardTitle className="font-glegoo text-accent">Upload Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-primary-200 border-dashed rounded-lg cursor-pointer bg-primary-50/50 hover:bg-primary-100/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-primary" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Google Sheet URL or CSV file</p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".csv"
              />
            </label>
          </div>
          {file && (
            <div className="text-sm text-gray-500">
              Selected file: {file.name}
            </div>
          )}
          <Button 
            className="w-full bg-primary hover:bg-primary-600" 
            disabled={!file || isProcessing}
            onClick={processData}
          >
            {isProcessing ? "Processing..." : "Process Data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};