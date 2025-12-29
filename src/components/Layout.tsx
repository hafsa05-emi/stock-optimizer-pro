import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Calculator, 
  Target, 
  CloudFog, 
  Brain, 
  Menu, 
  X, 
  Moon, 
  Sun,
  Download,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sections = [
  { id: 0, icon: Upload, label: 'Import & Aperçu', shortLabel: 'Import' },
  { id: 1, icon: Calculator, label: 'Transformation & Agrégation', shortLabel: 'Transform' },
  { id: 2, icon: Target, label: 'TOPSIS Classique', shortLabel: 'TOPSIS' },
  { id: 3, icon: CloudFog, label: 'Fuzzy TOPSIS', shortLabel: 'Fuzzy' },
  { id: 4, icon: Brain, label: 'ML & Comparaison', shortLabel: 'ML' },
];

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { activeSection, setActiveSection, isDataLoaded } = useAnalysisStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('light');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col fixed h-full z-40 lg:relative"
          >
            {/* Logo */}
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-bold text-foreground text-lg">ABC Analysis</h1>
                  <p className="text-xs text-muted-foreground">Multi-Critères MCDM</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {sections.map((section, idx) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isLocked = idx > 0 && !isDataLoaded;

                return (
                  <motion.button
                    key={section.id}
                    onClick={() => !isLocked && setActiveSection(section.id)}
                    disabled={isLocked}
                    className={cn(
                      'nav-item w-full text-left',
                      isActive && 'active',
                      isLocked && 'opacity-40 cursor-not-allowed'
                    )}
                    whileHover={!isLocked ? { x: 4 } : undefined}
                    whileTap={!isLocked ? { scale: 0.98 } : undefined}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 truncate">{section.label}</span>
                    {isLocked && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Importer d'abord</span>
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border">
              <div className="glass-panel p-4 text-center">
                <p className="text-xs text-muted-foreground">Développé pour</p>
                <p className="font-semibold text-sm text-foreground mt-1">Prof. Y. Lamrani</p>
                <p className="text-xs text-muted-foreground">EMI Rabat • IFElab</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden sm:block">
              <h2 className="font-semibold text-foreground">
                {sections[activeSection]?.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                Analyse décisionnelle multi-attributs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
            <Button size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Rapport PDF</span>
            </Button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
