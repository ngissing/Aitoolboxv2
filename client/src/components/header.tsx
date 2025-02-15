import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex gap-6 items-center">
            <Link href="/" className="flex items-center">
              <img 
                src="https://i.ibb.co/HD4rGzKj/AItoolbox-logo.png" 
                alt="AIToolBox" 
                className="h-10 w-auto"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}