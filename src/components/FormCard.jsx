function QGroup({ field, value, onChange, minHeight }) {
  return (
    <div className="qgroup">
      <label className="qlabel">{field.label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        style={minHeight ? { minHeight } : undefined}
      />
    </div>
  )
}

export default function FormCard({ card, values, onChange }) {
  return (
    <div className="form-card">
      <h4>
        {card.num && <span className="num">{card.num}</span>} {card.title}
      </h4>
      {card.blocks.map((block, i) => {
        if (block.type === 'subgroup') {
          return (
            <div className="subgroup" key={i}>
              <div className="subgroup-title">{block.title}</div>
              {block.fields.map((f) => (
                <QGroup key={f.key} field={f} value={values[f.key]} onChange={onChange} />
              ))}
            </div>
          )
        }
        if (block.type === 'boundedGroup') {
          return (
            <div className="subgroup" key={i}>
              {block.sections.map((section, si) => (
                <div key={si}>
                  {section.title && <div className="subgroup-title">{section.title}</div>}
                  {section.fields.map((f) => (
                    <QGroup key={f.key} field={f} value={values[f.key]} onChange={onChange} />
                  ))}
                </div>
              ))}
            </div>
          )
        }
        return block.fields.map((f) => <QGroup key={f.key} field={f} value={values[f.key]} onChange={onChange} />)
      })}
    </div>
  )
}
