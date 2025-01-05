import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { Results } from "@/components/Results";
import { AdminPanel } from "@/components/AdminPanel";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-accent font-glegoo">
              Forecasting Model
            </h1>
            <p className="text-lg text-muted font-sans">
              Upload your data and get instant forecasting results
            </p>
          </div>
          <div className="grid gap-8">
            <FileUpload />
            <Results />
          </div>
          <AdminPanel />
        </div>
      </main>
    </div>
  );
};

export default Index;