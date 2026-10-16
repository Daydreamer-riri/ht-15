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
  playTime?: string;
  openStatus?: string;
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

/** 封面与封底的杂志化文案 */
export interface CoverMeta {
  /** 封面英文大字，每项一行 */
  headline: string[];
  /** 刊号，如 No.07 · Autumn */
  issue: string;
  /** 封面贴纸下方的短标签，如“自驾环线” */
  badge: string;
  intro: string;
  /** 封面底色 */
  color: string;
  /** 封面大图优先选用名称包含该关键字的景点 */
  hero?: string;
  /** 封底英文大字，每项一行 */
  outro: string[];
  /** 封底免责声明 */
  note: string;
  /** 图片版权署名 */
  credit?: string;
}

export interface Itinerary {
  /** 线路唯一标识，用于 URL hash */
  id: string;
  name: string;
  /** 出行方式，决定“车程/步行”等文案 */
  mode: 'drive' | 'walk';
  cover: CoverMeta;
  /** 地图自适应时允许的最大缩放级别，默认 12；园区级线路需要更大 */
  mapMaxZoom?: number;
  coEditors: { nickName: string; avatar: string; owner: boolean }[];
  days: Day[];
  toBePlanned: Unit[];
}
