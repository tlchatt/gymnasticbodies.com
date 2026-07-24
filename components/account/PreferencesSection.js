/**
 * PreferencesSection — workout configuration preferences.
 *
 * Props (from lib/accountData.js → getPreferencesSection):
 *   items : Array<{ label: string, value: string }>   — labelled preference rows (only non-empty)
 *
 * CORE stub: simple definition list.
 */
import { AccountCard, Row } from './accountUi';

export default function PreferencesSection({ items = [] }) {
    return (
        <AccountCard title="Preferences">
            {items.map((it) => (
                <Row key={it.label} label={it.label} value={it.value} />
            ))}
        </AccountCard>
    );
}
