export function Navigation() {
  return (
    <nav className="w-full h-14 bg-background-primary border-b border-border flex items-center px-8">
      <h1 className="text-text-primary text-base font-bold">
        Sequence Alignment Tool
      </h1>
      
      <div className="ml-auto flex items-center space-x-6">
        <button className="text-text-primary text-base hover:text-accent-primary transition-colors">
          home
        </button>
        <button className="text-text-muted text-base hover:text-text-primary transition-colors">
          my page
        </button>
      </div>
    </nav>
  );
} 