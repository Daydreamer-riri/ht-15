import type { Itinerary } from './types';
import { itinerary as northXinjiang } from './itinerary';
import { skySoho } from './skySoho';

/** 线路列表的展示顺序 */
export const routes: Itinerary[] = [skySoho, northXinjiang];

export const findRoute = (id: string) => routes.find(r => r.id === id);
