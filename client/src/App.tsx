import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Video from "@/pages/video";
import Admin from "@/pages/admin";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Link } from "wouter";

function Navigation() {
  return (
    <NavigationMenu className="max-w-screen-xl mx-auto px-4 py-6">
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href="/" className="font-semibold text-lg">
            AI Toolbox
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem className="ml-auto">
          <Link href="/admin" className="text-sm">
            Admin
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-screen-xl mx-auto px-4 pb-12">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/video/:id" component={Video} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;