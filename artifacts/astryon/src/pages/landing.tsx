import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, Sparkles, Zap, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { useGetPlans } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Landing() {
  const { data: plansData } = useGetPlans();

  return (
    <div className="min-h-screen relative flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Hero background" 
              className="w-full h-full object-cover opacity-50 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-primary/30 text-primary mb-8 animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Astryón AI Engine v2.0 Live</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Bulk Real Estate Listings <br className="hidden md:block" />
                <span className="text-gradient-primary">Generated in Seconds</span>
              </h1>
              
              <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground mb-10">
                Upload your property CSV and instantly generate highly-converting, SEO-optimized listing descriptions and social media captions for your entire portfolio.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto rounded-full glow-primary">
                    Start Generating for Free <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button variant="glass" size="lg" className="w-full sm:w-auto rounded-full">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-card/30 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Why Top Agencies Choose Astryón</h2>
              <p className="mt-4 text-muted-foreground">Stop wasting hours writing descriptions manually.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Lightning Fast", desc: "Process 100+ properties in under a minute with our bulk CSV engine." },
                { icon: TrendingUp, title: "Conversion Optimized", desc: "AI trained on thousands of successful real estate listings that actually sell." },
                { icon: Clock, title: "Save 20+ Hours", desc: "Automate your most tedious task and focus on closing deals." }
              ].map((feature, i) => (
                <div key={i} className="glass-panel p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 text-primary">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
              <p className="mt-4 text-muted-foreground">Choose the plan that fits your volume.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plansData?.plans?.map((plan) => (
                <div key={plan.id} className={`glass-panel p-8 rounded-3xl relative ${plan.isPopular ? 'border-primary/50 shadow-2xl shadow-primary/20 scale-105 z-10' : ''}`}>
                  {plan.isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
                  
                  <div className="mb-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white">€{plan.priceEur}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>

                  <Link href={`/register?plan=${plan.id}`}>
                    <Button variant={plan.isPopular ? 'default' : 'glass'} className="w-full mb-8">
                      Get Started
                    </Button>
                  </Link>

                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium text-white">{plan.credits} Credits / month</span>
                    </li>
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary/50 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-6 h-6" />
            <span className="font-display font-bold text-xl">Astryón</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Astryón. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
