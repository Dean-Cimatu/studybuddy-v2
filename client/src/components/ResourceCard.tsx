import { UNIVERSITY_RESOURCES } from '../constants/universityResources';

interface Props {
  category: string;
}

export function ResourceCard({ category }: Props) {
  const resource = UNIVERSITY_RESOURCES[category] ?? UNIVERSITY_RESOURCES['general'];

  return (
    <div className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-2">
        <span>{resource.icon}</span>
        <span className="font-semibold text-amber-300">{resource.label}</span>
      </div>
      <div className="space-y-2">
        {resource.items.map((item, i) => (
          <div
            key={i}
            className={`pb-2 ${i < resource.items.length - 1 ? 'border-b border-amber-500/15' : ''}`}
          >
            <p className="font-medium text-gray-300">{item.name}</p>
            <p className="text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                >
                  Visit →
                </a>
              )}
              {item.phone && (
                <a
                  href={`tel:${item.phone}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                >
                  📞 {item.phone}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
