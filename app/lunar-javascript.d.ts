declare module "lunar-javascript" {
  type LunarDate = {
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact(): string;
    getYearInGanZhi(): string;
  };

  type LiuNian = {
    getYear(): number;
    getGanZhi(): string;
  };

  type DaYun = {
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
    getLiuNian(): LiuNian[];
  };

  type Yun = {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getDaYun(count?: number): DaYun[];
  };

  type EightCharDate = {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getDayGan(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    setSect(sect: number): void;
    getYun(gender: number): Yun;
  };

  export const Solar: {
    fromYmd(year: number, month: number, day: number): { getLunar(): LunarDate };
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): { getLunar(): LunarDate & { getEightChar(): EightCharDate } };
  };
}
