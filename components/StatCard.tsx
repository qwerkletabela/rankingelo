type Props = {
  title: string;
  value: string | number;
  hint?: string;
};

export default function StatCard({ title, value, hint }: Props) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
    </div>
  );
}
