declare module "lunar-javascript" {
  type LunarDate = {
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact(): string;
  };

  export const Solar: {
    fromYmd(year: number, month: number, day: number): { getLunar(): LunarDate };
  };
}
