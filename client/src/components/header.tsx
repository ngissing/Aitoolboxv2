import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex gap-6 items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/" className="font-semibold text-lg">
              AI-Toolbox
            </Link>
          </div>
          <nav className="flex gap-4">
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}