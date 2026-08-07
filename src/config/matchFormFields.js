// Each card's `blocks` array preserves the reference app's exact visual order:
// a block is either {type:'fields', fields:[...]} (plain qgroups) or
// {type:'subgroup', title, fields:[...]} (a titled, left-bordered cluster).
export const FORM1_CARDS = [
  {
    title: 'Ich — Allgemein',
    num: 1,
    blocks: [
      {
        type: 'fields',
        fields: [
          { key: 'allg1', label: 'Was hat gut funktioniert, das bereits trainiert wird?' },
          { key: 'allg2', label: 'Was hat nicht funktioniert, obwohl es trainiert wird?' },
          { key: 'allg3', label: 'Was hat gefehlt, das bisher noch nicht trainiert wurde?' },
        ],
      },
    ],
  },
  {
    title: 'Ich im Match',
    num: 2,
    blocks: [
      {
        // A single continuous bordered block spanning Taktik → Schläge → Feeling,
        // so the left rule doesn't break between sections.
        type: 'boundedGroup',
        sections: [
          {
            title: 'Taktik',
            fields: [
              { key: 'taktik1', label: 'Was war meine taktische Ausrichtung?' },
              { key: 'taktik2', label: 'Wie gut konnte ich diese umsetzen?' },
            ],
          },
          {
            fields: [{ key: 'schlaege', label: 'Wie waren meine Schläge (Vorhand, Rückhand, Aufschlag, Volley …)?' }],
          },
          {
            title: 'Feeling',
            fields: [
              { key: 'feeling1', label: 'Wie habe ich mich körperlich auf dem Platz gefühlt? (Energie, Beweglichkeit …)' },
              { key: 'feeling2', label: 'Wie habe ich mich mental auf dem Platz gefühlt? (Fokus, Selbstvertrauen …)' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Meine Gegnerin',
    num: 3,
    blocks: [
      {
        type: 'fields',
        fields: [
          { key: 'gegner1', label: 'Wie hat meine Gegnerin gespielt? (Taktik …)' },
          { key: 'gegner2', label: 'Was waren ihre Stärken?' },
          { key: 'gegner3', label: 'Was waren ihre Schwächen?' },
        ],
      },
    ],
  },
]

export const FORM2_FIELDS = {
  gut: 'Was lief gut?',
  nicht: 'Was lief nicht optimal?',
  warum:
    'Warum lief es nicht optimal? (ehrlich, sachlich, objektiv — z. B. Gegnerin kam mit den Bedingungen besser klar, war strategisch stärker …)',
  ziel: 'Ziel für das nächste Match — was möchtest du besser machen oder ausprobieren?',
}

export function blankForm1() {
  return {
    allg1: '', allg2: '', allg3: '',
    taktik1: '', taktik2: '', schlaege: '',
    feeling1: '', feeling2: '',
    gegner1: '', gegner2: '', gegner3: '',
  }
}

export function blankForm2() {
  return { gut: '', nicht: '', warum: '', ziel: '' }
}
