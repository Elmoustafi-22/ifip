import { Schema, model, type ClientSession } from 'mongoose';

export interface LevyAmounts {
    NGN: number;
    USD: number;
}

const pricingId = 'commitment-levy';
const defaultAmounts: LevyAmounts = { NGN: 2_500_000, USD: 3_500 };

const pricingSchema = new Schema<LevyAmounts & { _id: string }>({
    _id: { type: String, required: true },
    NGN: { type: Number, required: true },
    USD: { type: Number, required: true },
}, { timestamps: true });

const LevyPricing = model('LevyPricing', pricingSchema);

export async function getLevyAmounts(session: ClientSession | null = null): Promise<LevyAmounts> {
    const pricing = await LevyPricing.findById(pricingId).session(session).lean();
    return pricing ? { NGN: pricing.NGN, USD: pricing.USD } : defaultAmounts;
}

export async function setLevyAmounts(amounts: LevyAmounts) {
    await LevyPricing.updateOne({ _id: pricingId }, { $set: amounts }, { upsert: true });
    return amounts;
}
