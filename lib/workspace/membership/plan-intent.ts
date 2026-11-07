import {isPlanCode, type PlanCode} from './model';
export const PLAN_INTENT_COOKIE='ab_workspace_plan';
export function selectedPlan(value:unknown):PlanCode|null{return isPlanCode(value)?value:null;}
export function planEntry(code:PlanCode){return `/workspace/choose-plan?plan=${code}`;}
