import rulesData from '@/data/rules.json';
import { RulesData } from '@/lib/types';

export default function RulesPage() {
  const rules = rulesData as RulesData;

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">League Rules</h1>
        <p className="text-[15px] text-[#6B7280] font-medium">Last updated {rules.lastUpdated}</p>
      </div>

      <div className="border border-[#E4E7ED] rounded-lg overflow-hidden">
        {rules.sections.map((section, idx) => (
          <div
            key={section.title}
            className={idx < rules.sections.length - 1 ? 'border-b border-[#E4E7ED]' : ''}
          >
            {/* Section title */}
            <div className="px-4 py-3 bg-[#F8F9FB]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                {section.title}
              </p>
            </div>

            {/* Rules list */}
            <div className="px-4 py-3">
              <ul className="flex flex-col gap-2">
                {section.rules.map((rule, ruleIdx) => (
                  <li key={ruleIdx} className="flex items-start gap-2.5">
                    <span className="text-[#2563EB] font-bold text-[14px] mt-[1px] shrink-0">·</span>
                    <span className="text-[15px] text-[#111827] font-medium leading-snug">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-5 px-1">
        <p className="text-[13px] text-[#6B7280] font-medium">
          Questions or disputes? Reach out in the league group chat. Commissioner&apos;s ruling is final.
        </p>
      </div>
    </div>
  );
}
