import { useTranslation } from 'react-i18next'

function QGroup({ field, value, onChange, minHeight, readOnly }) {
  const { t } = useTranslation()
  return (
    <div className="qgroup">
      <label className="qlabel">{t(field.labelKey)}</label>
      {readOnly ? (
        <div className="qvalue">{value || '–'}</div>
      ) : (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={minHeight ? { minHeight } : undefined}
        />
      )}
    </div>
  )
}

export default function FormCard({ card, values, onChange, readOnly }) {
  const { t } = useTranslation()
  return (
    <div className="form-card">
      <h4>
        {card.num && <span className="num">{card.num}</span>} {t(card.titleKey)}
      </h4>
      {card.blocks.map((block, i) => {
        if (block.type === 'subgroup') {
          return (
            <div className="subgroup" key={i}>
              <div className="subgroup-title">{t(block.titleKey)}</div>
              {block.fields.map((f) => (
                <QGroup key={f.key} field={f} value={values[f.key]} onChange={onChange} readOnly={readOnly} />
              ))}
            </div>
          )
        }
        if (block.type === 'boundedGroup') {
          return (
            <div key={i}>
              {block.sections.map((section, si) => (
                <div key={si}>
                  {section.titleKey && <div className="subgroup-title">{t(section.titleKey)}</div>}
                  {section.fields.map((f) => (
                    <QGroup key={f.key} field={f} value={values[f.key]} onChange={onChange} readOnly={readOnly} />
                  ))}
                </div>
              ))}
            </div>
          )
        }
        return block.fields.map((f) => <QGroup key={f.key} field={f} value={values[f.key]} onChange={onChange} readOnly={readOnly} />)
      })}
    </div>
  )
}
