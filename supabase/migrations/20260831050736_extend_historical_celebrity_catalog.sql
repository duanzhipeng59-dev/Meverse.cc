alter table public.celebrity_profiles
  add column if not exists name_en text,
  add column if not exists name_zh text,
  add column if not exists gender text not null default 'unknown'
    check (gender in ('female', 'male', 'other', 'unknown')),
  add column if not exists death_date date,
  add column if not exists mbti_source_type text not null default 'unknown'
    check (mbti_source_type in ('self_reported', 'biographical_inference', 'unknown')),
  add column if not exists mbti_confidence text not null default 'unknown'
    check (mbti_confidence in ('high', 'medium', 'low', 'unknown')),
  add column if not exists birth_date_confidence text not null default 'unknown'
    check (birth_date_confidence in ('high', 'medium', 'low', 'unknown')),
  add column if not exists is_historical_figure boolean not null default false,
  add column if not exists is_deceased boolean not null default false,
  add column if not exists portrait_risk text not null default 'unknown'
    check (portrait_risk in ('low', 'medium', 'high', 'unknown')),
  add column if not exists commercial_demo_risk text not null default 'unknown'
    check (commercial_demo_risk in ('low', 'medium', 'high', 'unknown')),
  add column if not exists enable_bazi boolean not null default true,
  add column if not exists enable_mbti boolean not null default true,
  add column if not exists recommendation_level smallint
    check (recommendation_level between 1 and 5);

comment on column public.celebrity_profiles.mbti_source_type is
  'self_reported = 本人自我类型；biographical_inference = 传记推定；unknown = 未知';
comment on column public.celebrity_profiles.recommendation_level is
  '后台候选人物推荐度，1 到 5 星，不参与测试结果计算';
comment on column public.celebrity_profiles.portrait_risk is
  '肖像素材使用风险，仅供内容运营判断';
comment on column public.celebrity_profiles.commercial_demo_risk is
  '商业演示使用风险，仅供内容运营判断';

with historical_figures (
  id, name_en, name_zh, gender, birth_date, death_date, mbti,
  mbti_source_type, mbti_confidence, recommendation_level, three_pillars
) as (values
  ('isabel-briggs-myers', 'Isabel Briggs Myers', '伊莎贝尔·布里格斯·迈尔斯', 'female', date '1897-10-18', null::date, 'INFP', 'self_reported', 'high', 5, '丁酉 · 庚戌 · 己酉'),
  ('pierre-curie', 'Pierre Curie', '皮埃尔·居里', 'male', date '1859-05-15', null::date, 'INFP', 'biographical_inference', 'medium', 4, '己未 · 己巳 · 癸丑'),
  ('jean-jacques-rousseau', 'Jean-Jacques Rousseau', '让-雅克·卢梭', 'male', date '1712-06-28', null::date, 'INFP', 'biographical_inference', 'medium', 4, '壬辰 · 丙午 · 丁未'),
  ('martin-luther-king-jr', 'Martin Luther King Jr.', '马丁·路德·金', 'male', date '1929-01-15', null::date, 'INFJ', 'biographical_inference', 'medium', 5, '戊辰 · 乙丑 · 庚申'),
  ('thomas-jefferson', 'Thomas Jefferson', '托马斯·杰斐逊', 'male', date '1743-04-13', null::date, 'INFJ', 'biographical_inference', 'medium', 5, '癸亥 · 丙辰 · 癸酉'),
  ('thomas-more', 'Thomas More', '托马斯·莫尔', 'male', date '1478-02-07', null::date, 'INFJ', 'biographical_inference', 'medium', 4, '戊戌 · 甲寅 · 戊辰'),
  ('abigail-adams', 'Abigail Adams', '阿比盖尔·亚当斯', 'female', date '1744-11-22', null::date, 'ENFJ', 'biographical_inference', 'medium', 4, '甲子 · 乙亥 · 壬戌'),
  ('josephine-de-beauharnais', 'Joséphine de Beauharnais', '约瑟芬·德·博阿尔内', 'female', date '1763-06-23', null::date, 'ENFJ', 'biographical_inference', 'medium', 5, '癸未 · 戊午 · 己巳'),
  ('francis-xavier', 'Francis Xavier', '方济各·沙勿略', 'male', date '1506-04-07', null::date, 'ENFJ', 'biographical_inference', 'medium', 4, '丙寅 · 壬辰 · 甲午'),
  ('martin-luther', 'Martin Luther', '马丁·路德', 'male', date '1483-11-10', null::date, 'ENFP', 'biographical_inference', 'medium', 5, '癸卯 · 癸亥 · 庚午'),
  ('denis-diderot', 'Denis Diderot', '德尼·狄德罗', 'male', date '1713-10-05', null::date, 'ENFP', 'biographical_inference', 'medium', 4, '癸巳 · 辛酉 · 辛卯'),
  ('benjamin-rush', 'Benjamin Rush', '本杰明·拉什', 'male', date '1746-01-04', null::date, 'ENFP', 'biographical_inference', 'medium', 4, '乙丑 · 戊子 · 庚戌'),
  ('marie-curie', 'Marie Curie', '玛丽·居里', 'female', date '1867-11-07', date '1934-07-04', 'INTJ', 'biographical_inference', 'medium', 5, '丁卯 · 庚戌 · 辛卯'),
  ('malcolm-x', 'Malcolm X', '马尔科姆·X', 'male', date '1925-05-19', null::date, 'INTJ', 'biographical_inference', 'medium', 5, '乙丑 · 辛巳 · 癸卯'),
  ('w-e-b-du-bois', 'W. E. B. Du Bois', 'W. E. B. 杜波依斯', 'male', date '1868-02-23', null::date, 'INTJ', 'biographical_inference', 'medium', 4, '戊辰 · 甲寅 · 己卯'),
  ('immanuel-kant', 'Immanuel Kant', '伊曼努尔·康德', 'male', date '1724-04-22', null::date, 'INTP', 'biographical_inference', 'medium', 5, '甲辰 · 戊辰 · 癸卯'),
  ('edward-gibbon', 'Edward Gibbon', '爱德华·吉本', 'male', date '1737-05-08', null::date, 'INTP', 'biographical_inference', 'medium', 4, '丁巳 · 乙巳 · 丁卯'),
  ('mary-somerville', 'Mary Somerville', '玛丽·萨默维尔', 'female', date '1780-12-26', null::date, 'INTP', 'biographical_inference', 'medium', 4, '庚子 · 戊子 · 乙巳'),
  ('napoleon-bonaparte', 'Napoleon Bonaparte', '拿破仑·波拿巴', 'male', date '1769-08-15', null::date, 'ENTJ', 'biographical_inference', 'medium', 5, '己丑 · 壬申 · 甲午'),
  ('catherine-the-great', 'Catherine the Great', '叶卡捷琳娜二世', 'female', date '1729-05-02', null::date, 'ENTJ', 'biographical_inference', 'medium', 5, '己酉 · 戊辰 · 己卯'),
  ('booker-t-washington', 'Booker T. Washington', '布克·T·华盛顿', 'male', date '1856-04-05', null::date, 'ENTJ', 'biographical_inference', 'medium', 4, '丙辰 · 壬辰 · 戊午'),
  ('voltaire', 'Voltaire', '伏尔泰', 'male', date '1694-11-21', null::date, 'ENTP', 'biographical_inference', 'medium', 5, '甲戌 · 乙亥 · 己亥'),
  ('frederick-ii-holy-roman-emperor', 'Frederick II, Holy Roman Emperor', '神圣罗马皇帝腓特烈二世', 'male', date '1194-12-26', null::date, 'ENTP', 'biographical_inference', 'medium', 4, '甲寅 · 丙子 · 己亥'),
  ('george-washington', 'George Washington', '乔治·华盛顿', 'male', date '1732-02-22', null::date, 'ISTJ', 'biographical_inference', 'medium', 5, '壬子 · 壬寅 · 乙酉'),
  ('john-quincy-adams', 'John Quincy Adams', '约翰·昆西·亚当斯', 'male', date '1767-07-11', null::date, 'ISTJ', 'biographical_inference', 'medium', 4, '丁亥 · 丁未 · 戊申'),
  ('catherine-of-aragon', 'Catherine of Aragon', '阿拉贡的凯瑟琳', 'female', date '1485-12-16', null::date, 'ISFJ', 'biographical_inference', 'medium', 5, '乙巳 · 戊子 · 丁巳'),
  ('elizabeth-schuyler-hamilton', 'Elizabeth Schuyler Hamilton', '伊丽莎白·斯凯勒·汉密尔顿', 'female', date '1757-08-09', null::date, 'ISFJ', 'biographical_inference', 'medium', 4, '丁丑 · 戊申 · 乙酉'),
  ('edward-i-of-england', 'Edward I of England', '英格兰国王爱德华一世', 'male', date '1239-06-17', null::date, 'ESTJ', 'biographical_inference', 'medium', 4, '己亥 · 庚午 · 癸未'),
  ('maria-theresa', 'Maria Theresa', '玛丽亚·特蕾莎', 'female', date '1717-05-13', null::date, 'ESFJ', 'biographical_inference', 'medium', 5, '丁酉 · 乙巳 · 丁亥'),
  ('joseph-fouche', 'Joseph Fouché', '约瑟夫·富歇', 'male', date '1759-05-21', null::date, 'ISTP', 'biographical_inference', 'medium', 4, '己卯 · 己巳 · 乙亥'),
  ('edward-ii-of-england', 'Edward II of England', '英格兰国王爱德华二世', 'male', date '1284-04-25', null::date, 'ISFP', 'biographical_inference', 'medium', 4, '甲申 · 戊辰 · 丁亥'),
  ('marie-antoinette', 'Marie Antoinette', '玛丽·安托瓦内特', 'female', date '1755-11-02', null::date, 'ESFP', 'biographical_inference', 'medium', 5, '乙亥 · 丙戌 · 己亥')
)
insert into public.celebrity_profiles (
  id, name, name_en, name_zh, gender, birth_date, death_date, mbti,
  mbti_source_type, mbti_confidence, birth_date_confidence,
  is_historical_figure, is_deceased, portrait_risk, commercial_demo_risk,
  enable_bazi, enable_mbti, recommendation_level, three_pillars,
  role, tagline, description, relationship_style, focus, traits, categories,
  match_count, portrait_url, ideal, published, homepage_featured,
  workspace_position, homepage_position
)
select
  id, name_en, name_en, name_zh, gender, birth_date, death_date, mbti,
  mbti_source_type, mbti_confidence, 'high',
  true, true, 'medium', 'low', true, true, recommendation_level, three_pillars,
  '历史人物 · 人物档案',
  '等待完整人物画像',
  '历史人物候选档案。正式发布前需补充人物画像、内容校对与肖像素材。',
  '待依据人物资料完善',
  '待依据人物资料完善',
  jsonb_build_array(mbti, '历史人物'),
  jsonb_build_array('历史人物', mbti),
  0,
  '/historical-figure.svg',
  jsonb_build_object('security', 50, 'expression', 50, 'independence', 50, 'conflict', 50, 'novelty', 50),
  false, false, null, null
from historical_figures
on conflict (id) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  gender = excluded.gender,
  birth_date = excluded.birth_date,
  death_date = excluded.death_date,
  mbti = excluded.mbti,
  mbti_source_type = excluded.mbti_source_type,
  mbti_confidence = excluded.mbti_confidence,
  birth_date_confidence = excluded.birth_date_confidence,
  is_historical_figure = excluded.is_historical_figure,
  is_deceased = excluded.is_deceased,
  portrait_risk = excluded.portrait_risk,
  commercial_demo_risk = excluded.commercial_demo_risk,
  enable_bazi = excluded.enable_bazi,
  enable_mbti = excluded.enable_mbti,
  recommendation_level = excluded.recommendation_level,
  three_pillars = excluded.three_pillars,
  updated_at = now();
