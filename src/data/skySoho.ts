// 凌空 SOHO（长宁区金钟路 968 号）园区一日游。
// 园区轮廓取自 OpenStreetMap（relation 5469292）；楼栋与室内点位为示意坐标，并非实测。
import type { Itinerary, LatLng } from './types';
import skySohoImage from '@/assets/sky-soho.jpeg';

const SONGHONG_STATION: LatLng = [31.21998, 121.35582];
const BUILDING_8: LatLng = [31.22330, 121.34612];
const WORKSPACE: LatLng = [31.22354, 121.34586];
const PANTRY: LatLng = [31.22376, 121.34612];
const MEETING_ROOM: LatLng = [31.22360, 121.34644];
const GYM: LatLng = [31.22428, 121.34740];

/** 金钟路沿线：地铁站 ↔ 园区东门 */
const JINZHONG_ROAD: LatLng[] = [[31.22205, 121.35575], [31.22240, 121.35070], [31.22268, 121.34800]];

export const skySoho: Itinerary = {
  id: 'sky-soho',
  name: '凌空 SOHO 一日游',
  mode: 'walk',
  mapMaxZoom: 18,
  cover: {
    headline: ['Sky', 'SOHO'],
    issue: 'No.08 · Workday',
    badge: '园区漫步',
    intro: '从淞虹路地铁站步行进园，在 8 号楼刷卡上楼：上午埋头工区，茶水间续杯，下午开会，下班去健身房出汗。',
    color: '#e8253f',
    hero: '8号楼',
    outro: ['See you', 'at the desk'],
    note: '园区内点位为示意位置，楼层与开放时间以园区实际安排为准。',
    credit: '封面照片：Zhang Yong / Wikimedia Commons，CC BY 3.0',
  },
  coEditors: [
    {
      nickName: 'DaydreamerRiri',
      avatar: 'https://dimg04.c-ctrip.com/images/27c6n12000na9jeqj71E2.jpg',
      owner: true,
    },
    {
      nickName: '爱喝汽水的羊驼',
      avatar: 'https://dimg04.c-ctrip.com/images/27c1412000na9jj3x7258.jpg',
      owner: false,
    },
  ],
  days: [
    {
      index: 1,
      label: '10月16日',
      weekday: '周五',
      dateText: '10月16日',
      title: '凌空 SOHO',
      cities: [{ name: '凌空SOHO', position: [31.22385, 121.34726] }],
      items: [
        {
          kind: 'poi',
          id: 'sky-soho-building-8',
          name: '8号楼',
          city: '凌空SOHO',
          image: skySohoImage,
          playTime: '建议停留10分钟',
          openStatus: '刷工牌进入',
          price: '免费',
          position: BUILDING_8,
          remark: '扎哈·哈迪德设计的流线型楼群，楼与楼之间由空中连廊相接。上楼前先在水景广场拍一张外立面。',
          leg: {
            duration: '16分钟',
            distance: '1.2公里',
            from: '淞虹路地铁站',
            points: [SONGHONG_STATION, ...JINZHONG_ROAD, [31.22288, 121.34640], BUILDING_8],
          },
        },
        {
          kind: 'custom',
          id: 'sky-soho-workspace',
          name: '工区',
          playTime: '建议停留3小时',
          openStatus: '09:30 开工',
          position: WORKSPACE,
          remark: '靠窗工位能看到楼群弧线。先清掉早上的消息，再开始专注时段。',
          leg: {
            duration: '1分钟',
            distance: '40米',
            points: [BUILDING_8, [31.22342, 121.34598], WORKSPACE],
          },
        },
        {
          kind: 'custom',
          id: 'sky-soho-pantry',
          name: '茶水间',
          playTime: '建议停留15分钟',
          openStatus: '全天开放',
          position: PANTRY,
          remark: '咖啡机前常有偶遇，顺手续一杯、聊两句，十分钟后回工位。',
          leg: {
            duration: '1分钟',
            distance: '40米',
            points: [WORKSPACE, [31.22368, 121.34592], PANTRY],
          },
        },
        {
          kind: 'custom',
          id: 'sky-soho-meeting-room',
          name: '会议室',
          playTime: '建议停留1小时',
          openStatus: '14:00 需提前预订',
          position: MEETING_ROOM,
          remark: '提前五分钟到场连好投屏，议程贴在白板一角。',
          leg: {
            duration: '1分钟',
            distance: '40米',
            points: [PANTRY, [31.22370, 121.34632], MEETING_ROOM],
          },
        },
        {
          kind: 'custom',
          id: 'sky-soho-gym',
          name: '健身房',
          playTime: '建议停留1小时',
          openStatus: '18:30 下班后',
          position: GYM,
          remark: '备好毛巾和换洗衣物，跑步机三十分钟加一组拉伸，结束一天。',
          leg: {
            duration: '2分钟',
            distance: '120米',
            points: [MEETING_ROOM, [31.22384, 121.34668], [31.22402, 121.34706], GYM],
          },
        },
      ],
      returnLeg: {
        duration: '15分钟',
        distance: '1.2公里',
        target: '淞虹路地铁站',
        points: [GYM, [31.22390, 121.34792], [31.22300, 121.34830], [31.22268, 121.34800], ...JINZHONG_ROAD.slice(0, 2).reverse(), SONGHONG_STATION],
      },
    },
  ],
  toBePlanned: [
    {
      kind: 'custom',
      id: 'sky-soho-cafe',
      name: '携程旅行 Café',
      position: [31.22449, 121.34597],
    },
    {
      kind: 'custom',
      id: 'sky-soho-park',
      name: '虹桥体育公园',
      position: [31.22309, 121.34135],
    },
  ],
};
