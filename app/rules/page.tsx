import rulesData from '@/data/rules.json';
import { RulesData } from '@/lib/types';

export default function RulesPage() {
  const rules = rulesData as RulesData;

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#0f1419]">League Rules</h1>
        <p className="text-[15px] text-[#536471] font-medium">Last updated {rules.lastUpdated}</p>
      </div>

      <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
        {rules.sections.map((section, idx) => (
          <div
            key={section.title}
            className={idx < rules.sections.length - 1 ? 'border-b border-[#eff3f4]' : ''}
          >
            {/* Section title */}
            <div className="px-4 py-3 bg-[#f7f9f9]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">
                {section.title}
              </p>
            </div>

            {/* Rules list */}
            <div className="px-4 py-3">
              <ul className="flex flex-col gap-2">
                {section.rules.map((rule, ruleIdx) => (
                  <li key={ruleIdx} className="flex items-start gap-2.5">
                    <span className="text-[#1d9bf0] font-bold text-[14px] mt-[1px] shrink-0">·</span>
                    <span className="text-[15px] text-[#0f1419] font-medium leading-snug">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-5 px-1">
        <p className="text-[13px] text-[#536471] font-medium">
          Questions or disputes? Reach out in the league group chat. Commissioner&apos;s ruling is final.
        </p>
      </div>
    </div>
  );
}
