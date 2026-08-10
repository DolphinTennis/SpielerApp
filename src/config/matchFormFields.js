// Each card's `blocks` array preserves the reference app's exact visual order:
// a block is either {type:'fields', fields:[...]} (plain qgroups) or
// {type:'subgroup', title, fields:[...]} (a titled, left-bordered cluster).
// titleKey/labelKey point into src/locales/*.json — actual text lives there
// so it can be translated; consumers (FormCard.jsx, MatchEditor.jsx) call t().
export const FORM1_CARDS = [
  {
    titleKey: 'matchanalyse.form1.card1.title',
    num: 1,
    blocks: [
      {
        type: 'fields',
        fields: [
          { key: 'allg1', labelKey: 'matchanalyse.form1.fields.allg1' },
          { key: 'allg2', labelKey: 'matchanalyse.form1.fields.allg2' },
          { key: 'allg3', labelKey: 'matchanalyse.form1.fields.allg3' },
        ],
      },
    ],
  },
  {
    titleKey: 'matchanalyse.form1.card2.title',
    num: 2,
    blocks: [
      {
        // A single continuous bordered block spanning Taktik → Schläge → Feeling,
        // so the left rule doesn't break between sections.
        type: 'boundedGroup',
        sections: [
          {
            titleKey: 'matchanalyse.form1.card2.taktikTitle',
            fields: [
              { key: 'taktik1', labelKey: 'matchanalyse.form1.fields.taktik1' },
              { key: 'taktik2', labelKey: 'matchanalyse.form1.fields.taktik2' },
            ],
          },
          {
            fields: [{ key: 'schlaege', labelKey: 'matchanalyse.form1.fields.schlaege' }],
          },
          {
            titleKey: 'matchanalyse.form1.card2.feelingTitle',
            fields: [
              { key: 'feeling1', labelKey: 'matchanalyse.form1.fields.feeling1' },
              { key: 'feeling2', labelKey: 'matchanalyse.form1.fields.feeling2' },
            ],
          },
        ],
      },
    ],
  },
  {
    titleKey: 'matchanalyse.form1.card3.title',
    num: 3,
    blocks: [
      {
        type: 'fields',
        fields: [
          { key: 'gegner1', labelKey: 'matchanalyse.form1.fields.gegner1' },
          { key: 'gegner2', labelKey: 'matchanalyse.form1.fields.gegner2' },
          { key: 'gegner3', labelKey: 'matchanalyse.form1.fields.gegner3' },
        ],
      },
    ],
  },
]

export const FORM2_FIELDS = {
  gut: 'matchanalyse.form2.fields.gut',
  nicht: 'matchanalyse.form2.fields.nicht',
  warum: 'matchanalyse.form2.fields.warum',
  zieleMatch: 'matchanalyse.form2.fields.zieleMatch',
  zieleTraining: 'matchanalyse.form2.fields.zieleTraining',
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
  return { gut: '', nicht: '', warum: '', zieleMatch: '', zieleTraining: '' }
}
