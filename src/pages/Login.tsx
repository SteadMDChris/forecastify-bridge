import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const autoSignIn = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'admin123'
      });

      if (error) {
        // If sign in fails, try to sign up first
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'admin@example.com',
          password: 'admin123'
        });

        if (signUpError) {
          toast({
            title: "Error",
            description: signUpError.message,
            variant: "destructive"
          });
          return;
        }

        // After signup, try signing in again
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: 'admin123'
        });

        if (retryError) {
          toast({
            title: "Error",
            description: retryError.message,
            variant: "destructive"
          });
          return;
        }
      }

      // Create admin role for the user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('create_initial_admin', {
          admin_user_id: user.id
        });
      }

      navigate('/');
    };

    autoSignIn();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <img
            src="https://raw.githubusercontent.com/SteadMDChris/Image/main/smd2logo%20(2).png"
            alt="SteadyMD Logo"
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-primary">Welcome to Forecast Pro</h1>
        </div>
        <div className="text-center">
          <p>Signing in automatically...</p>
        </div>
      </div>
    </div>
  );
};

export default Login;