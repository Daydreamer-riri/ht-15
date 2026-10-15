/** WGS84 [lat, lng] */
export type LatLng = [number, number];

/** 两个行程项之间的驾车信息 */
export interface Leg {
  duration: string;
  distance: string;
  /** 当天首段：从前一晚酒店出发 */
  from?: string;
  /** 驶向非下一张卡片的目的地（如返回酒店、前往机场） */
  target?: string;
  points: LatLng[];
}

interface UnitBase {
  id: string;
  remark?: string;
  leg?: Leg;
}

export interface PoiUnit extends UnitBase {
  kind: 'poi';
  name: string;
  city: string;
  image: string;
  playTime: string;
  openStatus: string;
  price: string;
  position: LatLng;
}

export interface HotelUnit extends UnitBase {
  kind: 'hotel';
  name: string;
  city: string;
  image: string;
  star: number;
  score: number;
  reviewCount: number;
  rank?: string;
  position: LatLng;
}

export interface CustomUnit extends UnitBase {
  kind: 'custom';
  name: string;
  position: LatLng;
}

export interface TransportEnd {
  name: string;
  terminal?: string;
  city: string;
  position: LatLng;
}

export interface TransportUnit extends UnitBase {
  kind: 'transport';
  mode: 'flight' | 'other';
  number?: string;
  departTime?: string;
  arriveTime?: string;
  duration?: string;
  dateText?: string;
  from: TransportEnd;
  to: TransportEnd;
}

export type Unit = PoiUnit | HotelUnit | CustomUnit | TransportUnit;

export interface Day {
  index: number;
  /** 10月01日 */
  label: string;
  weekday: string;
  dateText: string;
  title?: string;
  departHotel?: { name: string; position: LatLng };
  cities: { name: string; position: LatLng }[];
  items: Unit[];
  returnLeg?: Leg & { target: string };
}

export interface Itinerary {
  name: string;
  coEditors: { nickName: string; avatar: string; owner: boolean }[];
  days: Day[];
  toBePlanned: Unit[];
}
