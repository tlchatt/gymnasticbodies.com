'use client';
import s from './Tabs.module.css';

/**
 * Tabs — filter tab bar.
 *
 * Props:
 *   tabs:     Array<{ label: string; value: string }>
 *   value:    string  — currently active tab value
 *   onChange: (value: string) => void
 *
 * Usage:
 *   const TABS = [
 *     { label: 'All',    value: '' },
 *     { label: 'Open',   value: 'open' },
 *     { label: 'Closed', value: 'closed' },
 *   ];
 *   <Tabs tabs={TABS} value={tab} onChange={setTab} />
 */
export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className={s.tabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={`${s.tab}${value === tab.value ? ` ${s.active}` : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
