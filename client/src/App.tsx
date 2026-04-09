import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Twin from "./pages/Twin";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";

function getRouterBase(): string {
  if (typeof window === "undefined") return "";
  if (!window.location.hostname.endsWith("github.io")) return "";

  // For project pages URLs like /repo-name/... use repo-name as router base.
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}` : "";
}

function AppRouter() {
  const base = getRouterBase();

  return (
    <WouterRouter base={base}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/twin" component={Twin} />
        <Route path="/twin/:theme" component={Twin} />
        <Route path="/veelgestelde-vragen" component={FAQ} />
        <Route path="/contact" component={Contact} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
