import { Header } from "@/components/Header";
import { UserInfo } from "@/components/UserInfo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6">
        <UserInfo />
      </main>
    </div>
  );
};

export default Index;