interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  color?: string;
}

export default function ProgressBar({ 
  progress, 
  className = "h-3", 
  color = "from-primary to-secondary" 
}: ProgressBarProps) {
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${className}`}>
      <div 
        className={`bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out ${className}`}
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
}
