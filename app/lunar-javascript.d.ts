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
    fromYmd(year: number, month: number, day: number): { getLunar(): LunarDate & { getYear(): number; getMonth(): number; getDay(): number } };
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): { getLunar(): LunarDate & { getEightChar(): EightCharDate } };
  };
}

// 「开始解读」弹窗的历法切换:Solar/Lunar 互转。农历闰月以负数月表示(-4=闰四月);
// 转换后回转校验,保证不会落到不存在的农历日期。
declare module "lunar-javascript" {
  export type LunarConverted = LunarDate & {
    getYear(): number;
    /** 正数 1-12;闰月为负数(如 -4 表示闰四月) */
    getMonth(): number;
    getDay(): number;
    getSolar(): { getYear(): number; getMonth(): number; getDay(): number; getLunar(): LunarConverted };
  };

  export const Lunar: {
    fromYmd(year: number, month: number, day: number): LunarConverted;
  };
}
