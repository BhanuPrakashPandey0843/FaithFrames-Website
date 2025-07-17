// src/components/ui/card.js
export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl shadow-xl p-6 transition-all ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`text-white ${className}`}>
      {children}
    </div>
  );
}
