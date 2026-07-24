'use client';
/**
 * PaymentSection — saved card display, or the Add-payment-method flow.
 *
 * Props (from lib/accountData.js → getPaymentSection, plus userId from the shell):
 *   hasCard   : boolean         — true when a saved payment method exists
 *   cardBrand : string | null   — e.g. 'visa'
 *   cardLast4 : string | null   — e.g. '4242'
 *   userId    : string          — passed by the shell for the Add flow
 *
 * When hasCard is false, mounts AddPaymentMethod (owned by another agent) via
 * next/dynamic { ssr:false }. On save it optimistically flips to the saved-card view.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AccountCard, Row } from './accountUi';

const AddPaymentMethod = dynamic(() => import('./AddPaymentMethod'), { ssr: false });

function titleCase(s) {
    if (!s || typeof s !== 'string') return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PaymentSection({ hasCard, cardBrand, cardLast4, userId }) {
    const [savedCard, setSavedCard] = useState(
        hasCard ? { cardBrand, cardLast4 } : null
    );

    const card = savedCard;

    return (
        <AccountCard title="Payment Method">
            {card ? (
                <Row
                    label="Saved card"
                    value={`${titleCase(card.cardBrand) || 'Card'} ending in ${card.cardLast4 || '••••'}`}
                />
            ) : (
                <div>
                    <p style={{ color: '#666', fontSize: '0.95rem', margin: '0 0 12px' }}>
                        No payment method saved. Add a card to keep your membership active at renewal.
                    </p>
                    <AddPaymentMethod
                        userId={userId}
                        onSaved={(saved) => setSavedCard(saved)}
                    />
                </div>
            )}
        </AccountCard>
    );
}
