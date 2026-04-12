import { Link } from "wouter";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 bg-black/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-lg">Astryón</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>

          <p className="text-sm text-muted-foreground whitespace-nowrap">
            &copy; {new Date().getFullYear()} Astryón. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
