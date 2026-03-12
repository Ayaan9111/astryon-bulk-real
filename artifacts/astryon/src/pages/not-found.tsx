import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-8xl font-display font-bold text-primary/20">404</h1>
      <h2 className="text-2xl font-bold text-white mt-4 mb-2">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg" className="rounded-full">Return Home</Button>
      </Link>
    </div>
  );
}
