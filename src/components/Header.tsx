import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="w-full border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary-600">Forecast Pro</span>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost">Documentation</Button>
          <Button variant="ghost">Support</Button>
        </nav>
      </div>
    </header>
  );
};