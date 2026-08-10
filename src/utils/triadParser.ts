// src/utils/triadParser.ts
// Общий парсер Триады (Самочувствие | Энергия | Настроение) из rawTonus-строки замеров.
// Используется движками Замеров и Пищеварения для единой интерпретации состояния.

export interface Triad {
  energy: 'low' | 'normal' | 'high';
  mood: 'bad' | 'normal' | 'good';
  wellbeing: 'bad' | 'normal' | 'good';
  energyLabel: string;
  moodLabel: string;
  wellbeingLabel: string;
}

export const parseTriad = (rawTonus: string | null): Triad => {
  let energy: Triad['energy'] = 'normal';
  let mood: Triad['mood'] = 'normal';
  let wellbeing: Triad['wellbeing'] = 'normal';
  let energyLabel = '';
  let moodLabel = '';
  let wellbeingLabel = '';

  if (rawTonus) {
    const parts = rawTonus.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      energyLabel = parts[0];
      moodLabel = parts[1];
      wellbeingLabel = parts[2];

      if (parts[0] === 'Высокая') energy = 'high';
      else if (parts[0] === 'Сниженная') energy = 'low';

      if (parts[1] === 'Лёгкое') mood = 'good';
      else if (parts[1] === 'Тяжёлое') mood = 'bad';

      if (parts[2] === 'Хорошее') wellbeing = 'good';
      else if (parts[2] === 'Плохое') wellbeing = 'bad';
    }
  }
  return { energy, mood, wellbeing, energyLabel, moodLabel, wellbeingLabel };
};