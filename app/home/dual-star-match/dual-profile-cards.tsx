// 八字资料卡:确认页与报告页共用的浅底文字卡——名字居中强调、
// 四柱四枚竖排小卡(标签+天干+地支分行)、日主收底。无头像、无连接符。
// 双人传两张(左右分列),单人传一张(单列居中)。
export type DualProfilePerson = {
  name: string;
  dayMaster: string;
  pillars: Array<{ label: string; gan: string; zhi: string }>;
};

export default function DualProfileCards({ people }: { people: DualProfilePerson[] }) {
  return (
    <div className={`mf-dual-profile-zone${people.length === 1 ? " is-single" : ""}`}>
      {people.map((person) => (
        <figure key={person.name}>
          <b>{person.name}</b>
          <div className="mf-dual-profile-pillars" aria-label="四柱">
            {person.pillars.map((pillar) => (
              <span key={pillar.label}><small>{pillar.label}</small><b>{pillar.gan}</b><b>{pillar.zhi}</b></span>
            ))}
          </div>
          <em className="mf-dual-profile-dm">日主 · {person.dayMaster}</em>
        </figure>
      ))}
    </div>
  );
}
