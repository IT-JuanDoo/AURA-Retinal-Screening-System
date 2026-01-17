interface StatCardProps {
  title: string;
  value: number | string;
  iconColor?: string;
  bgColor?: string;
  icon?: React.ReactNode;
  iconPath?: string;
  subtitle?: string;
  color?: "blue" | "green" | "purple" | "orange";
}

export default function StatCard({
  title,
  value,
  iconColor = "text-blue-500",
  bgColor = "bg-blue-500/10",
  icon,
  iconPath,
  subtitle,
  color,
}: StatCardProps) {
  const colorClasses = color ? {
    blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
    green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  }[color] : null;

  const finalIconColor = colorClasses ? colorClasses.text : iconColor;
  const finalBgColor = colorClasses ? colorClasses.bg : bgColor;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`size-12 rounded-lg ${finalBgColor} flex items-center justify-center ${typeof icon === "string" ? "text-2xl" : ""}`}>
          {typeof icon === "string" ? icon : icon || (
            <svg
              className={`w-6 h-6 ${finalIconColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {iconPath && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={iconPath}
                />
              )}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
