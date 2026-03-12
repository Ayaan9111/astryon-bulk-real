import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Sparkles, Menu, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/lib/store";

export function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = useAuthStore(state => state.token);
  const logoutStore = useAuthStore(state => state.logout);
  
  const { data: user } = useGetMe({
    query: { enabled: !!token, retry: false }
  });
  
  const { mutate: doLogout } = useLogout({
    mutation: {
      onSuccess: () => {
        logoutStore();
        window.location.href = "/login";
      }
    }
  });

  const handleLogout = () => doLogout();

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-gradient">Astryón</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">Features</Link>
            <Link href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">Pricing</Link>
            
            <div className="h-6 w-px bg-border"></div>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold">{user.creditsRemaining} Credits</span>
                </div>
                <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">Log in</Link>
                <Link href="/register">
                  <Button className="rounded-full px-6">Start Free Trial</Button>
                </Link>
              </div>
            )}
          </nav>

          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-white/5 absolute w-full pb-4">
          <div className="px-4 pt-2 pb-3 space-y-1">
            <Link href="/#features" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-white hover:bg-white/5">Features</Link>
            <Link href="/#pricing" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-white hover:bg-white/5">Pricing</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-white/5">Dashboard ({user.creditsRemaining} credits)</Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-destructive hover:bg-destructive/10">Log out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-white hover:bg-white/5">Log in</Link>
                <Link href="/register" className="block px-3 py-2 mt-2 text-center rounded-md font-medium bg-primary text-white">Start Free Trial</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
