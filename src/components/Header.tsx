import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="w-full border-b bg-accent">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="https://raw.githubusercontent.com/SteadMDChris/Image/main/smd2logo%20(2).png"
            alt="SteadyMD Logo"
            className="h-8 w-auto"
          />
          <span className="text-2xl font-bold font-glegoo text-white">Forecast Pro</span>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:text-primary-200">Documentation</Button>
          <Button variant="ghost" className="text-white hover:text-primary-200">Support</Button>
        </nav>
      </div>
    </header>
  );
};