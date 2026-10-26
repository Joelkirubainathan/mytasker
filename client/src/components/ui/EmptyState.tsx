interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#2a2a3e] flex items-center justify-center mb-4 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-5">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
