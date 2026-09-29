export type VedicCity = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tz: string;
};

// Curated city list with coordinates to avoid an external geocoding dependency.
export const vedicCities: VedicCity[] = [
  { id: "beijing", name: "北京", lat: 39.9042, lon: 116.4074, tz: "Asia/Shanghai" },
  { id: "shanghai", name: "上海", lat: 31.2304, lon: 121.4737, tz: "Asia/Shanghai" },
  { id: "guangzhou", name: "广州", lat: 23.1291, lon: 113.2644, tz: "Asia/Shanghai" },
  { id: "shenzhen", name: "深圳", lat: 22.5431, lon: 114.0579, tz: "Asia/Shanghai" },
  { id: "chengdu", name: "成都", lat: 30.5728, lon: 104.0668, tz: "Asia/Shanghai" },
  { id: "chongqing", name: "重庆", lat: 29.563, lon: 106.5516, tz: "Asia/Shanghai" },
  { id: "hangzhou", name: "杭州", lat: 30.2741, lon: 120.1551, tz: "Asia/Shanghai" },
  { id: "nanjing", name: "南京", lat: 32.0603, lon: 118.7969, tz: "Asia/Shanghai" },
  { id: "wuhan", name: "武汉", lat: 30.5928, lon: 114.3055, tz: "Asia/Shanghai" },
  { id: "xian", name: "西安", lat: 34.3416, lon: 108.9398, tz: "Asia/Shanghai" },
  { id: "suzhou", name: "苏州", lat: 31.2989, lon: 120.5853, tz: "Asia/Shanghai" },
  { id: "tianjin", name: "天津", lat: 39.3434, lon: 117.3616, tz: "Asia/Shanghai" },
  { id: "changsha", name: "长沙", lat: 28.2282, lon: 112.9388, tz: "Asia/Shanghai" },
  { id: "zhengzhou", name: "郑州", lat: 34.7466, lon: 113.6254, tz: "Asia/Shanghai" },
  { id: "shenyang", name: "沈阳", lat: 41.8057, lon: 123.4315, tz: "Asia/Shanghai" },
  { id: "dalian", name: "大连", lat: 38.914, lon: 121.6147, tz: "Asia/Shanghai" },
  { id: "qingdao", name: "青岛", lat: 36.0671, lon: 120.3826, tz: "Asia/Shanghai" },
  { id: "jinan", name: "济南", lat: 36.6512, lon: 117.1201, tz: "Asia/Shanghai" },
  { id: "harbin", name: "哈尔滨", lat: 45.8038, lon: 126.535, tz: "Asia/Shanghai" },
  { id: "changchun", name: "长春", lat: 43.8171, lon: 125.3235, tz: "Asia/Shanghai" },
  { id: "shijiazhuang", name: "石家庄", lat: 38.0428, lon: 114.5149, tz: "Asia/Shanghai" },
  { id: "taiyuan", name: "太原", lat: 37.8706, lon: 112.5489, tz: "Asia/Shanghai" },
  { id: "hefei", name: "合肥", lat: 31.8206, lon: 117.2272, tz: "Asia/Shanghai" },
  { id: "fuzhou", name: "福州", lat: 26.0745, lon: 119.2965, tz: "Asia/Shanghai" },
  { id: "xiamen", name: "厦门", lat: 24.4798, lon: 118.0894, tz: "Asia/Shanghai" },
  { id: "kunming", name: "昆明", lat: 25.0389, lon: 102.7183, tz: "Asia/Shanghai" },
  { id: "guiyang", name: "贵阳", lat: 26.6477, lon: 106.6302, tz: "Asia/Shanghai" },
  { id: "nanning", name: "南宁", lat: 22.817, lon: 108.3665, tz: "Asia/Shanghai" },
  { id: "haikou", name: "海口", lat: 20.0444, lon: 110.1999, tz: "Asia/Shanghai" },
  { id: "sanya", name: "三亚", lat: 18.2528, lon: 109.5119, tz: "Asia/Shanghai" },
  { id: "lantau", name: "香港", lat: 22.3193, lon: 114.1694, tz: "Asia/Hong_Kong" },
  { id: "macau", name: "澳门", lat: 22.1987, lon: 113.5439, tz: "Asia/Macau" },
  { id: "taipei", name: "台北", lat: 25.033, lon: 121.5654, tz: "Asia/Taipei" },
  { id: "kaohsiung", name: "高雄", lat: 22.6273, lon: 120.3014, tz: "Asia/Taipei" },
  { id: "urumqi", name: "乌鲁木齐", lat: 43.8256, lon: 87.6168, tz: "Asia/Urumqi" },
  { id: "lasa", name: "拉萨", lat: 29.652, lon: 91.1721, tz: "Asia/Shanghai" },
  { id: "lanzhou", name: "兰州", lat: 36.0611, lon: 103.8343, tz: "Asia/Shanghai" },
  { id: "xining", name: "西宁", lat: 36.6171, lon: 101.7782, tz: "Asia/Shanghai" },
  { id: "yinchuan", name: "银川", lat: 38.4872, lon: 106.2309, tz: "Asia/Shanghai" },
  { id: "hohhot", name: "呼和浩特", lat: 40.8414, lon: 111.7519, tz: "Asia/Shanghai" },
  { id: "nanchang", name: "南昌", lat: 28.682, lon: 115.8579, tz: "Asia/Shanghai" },
  { id: "wenzhou", name: "温州", lat: 27.9938, lon: 120.6994, tz: "Asia/Shanghai" },
  { id: "ningbo", name: "宁波", lat: 29.8683, lon: 121.544, tz: "Asia/Shanghai" },
  { id: "dongguan", name: "东莞", lat: 23.0207, lon: 113.7518, tz: "Asia/Shanghai" },
  { id: "foshan", name: "佛山", lat: 23.0218, lon: 113.1219, tz: "Asia/Shanghai" },
  { id: "singapore", name: "新加坡", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
  { id: "kualalumpur", name: "吉隆坡", lat: 3.139, lon: 101.6869, tz: "Asia/Kuala_Lumpur" },
  { id: "bangkok", name: "曼谷", lat: 13.7563, lon: 100.5018, tz: "Asia/Bangkok" },
  { id: "tokyo", name: "东京", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { id: "osaka", name: "大阪", lat: 34.6937, lon: 135.5023, tz: "Asia/Tokyo" },
  { id: "seoul", name: "首尔", lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" },
  { id: "newyork", name: "纽约", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { id: "losangeles", name: "洛杉矶", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { id: "sanfrancisco", name: "旧金山", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles" },
  { id: "london", name: "伦敦", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { id: "paris", name: "巴黎", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { id: "sydney", name: "悉尼", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { id: "melbourne", name: "墨尔本", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne" },
  { id: "toronto", name: "多伦多", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { id: "vancouver", name: "温哥华", lat: 49.2827, lon: -123.1207, tz: "America/Vancouver" },
];

const cityById = new Map(vedicCities.map((city) => [city.id, city]));

export function findVedicCity(id: string | null | undefined) {
  return id ? cityById.get(id) : undefined;
}
