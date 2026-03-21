import rulesData from '@/data/rules.json';
import { RulesData } from '@/lib/types';

export default function RulesPage() {
  const rules = rulesData as RulesData;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">League Rules</h1>
        <p className="text-[14px] text-[#475569] mt-1">Last updated {rules.lastUpdated}</p>
      </div>

      <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
        {rules.sections.map((section, idx) => (
          <div
            key={section.title}
            className={idx < rules.sections.length - 1 ? 'border-b border-[#E2E8F0]' : ''}
          >
            {/* Section title */}
            <div className="px-4 py-3 bg-white">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
                {section.title}
              </p>
            </div>

            {/* Rules list */}
            <div className="px-4 py-3">
              <ul className="flex flex-col gap-2">
                {section.rules.map((rule, ruleIdx) => (
                  <li key={ruleIdx} className="flex items-start gap-2.5">
                    <span className="text-[#C8956C] font-bold text-[14px] mt-[1px] shrink-0">·</span>
                    <span className="text-[15px] text-[#0F172A] font-medium leading-snug">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-5 px-1">
        <p className="text-[13px] text-[#94A3B8] font-medium">
          Questions or disputes? Reach out in the league group chat. Commissioner&apos;s ruling is final.
        </p>
      </div>
    </div>
  );
}
