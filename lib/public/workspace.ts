import 'server-only';
import { getEligibilityFormConfig } from '@/lib/workspace/eligibility/service';
import { CATEGORIES } from '@/lib/workspace/eligibility/model';
import { getCurrentPlans } from '@/lib/workspace/membership/service';
import { calculatePrice } from '@/lib/workspace/membership/model';
export type PublicWorkspaceInfo = {
    eligibility: {
        minimumExperienceMonths: number;
        profileRequired: boolean;
        categories: string[];
    } | null;
    plans: {
        code: string;
        name: string;
        months: number;
        totalPaise: number;
        available: boolean;
    }[] | null;
};
export async function readPublicWorkspaceInfo(): Promise<PublicWorkspaceInfo> {
    const [policy, plans] = await Promise.allSettled([getEligibilityFormConfig(), getCurrentPlans()]);
    return {
        eligibility: policy.status === 'fulfilled' ? {
            minimumExperienceMonths: policy.value.settings.config.minimumExperienceMonths,
            profileRequired: policy.value.settings.config.profileRequired,
            categories: CATEGORIES.filter(([code]) => policy.value.settings.config.allowedCategories.includes(code)).map(([, label]) => label),
        } : null,
        plans: plans.status === 'fulfilled' ? plans.value.map(plan => ({ code: plan.code, name: plan.displayName,
            months: plan.durationMonths, totalPaise: calculatePrice(plan.basePricePaise, plan.taxRateBps).totalPaise, available: plan.available })) : null,
    };
}
