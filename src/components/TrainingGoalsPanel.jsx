import { useTranslation } from 'react-i18next'

function GoalGroup({ title, goals, onComplete, emptyLabel }) {
  return (
    <div className="training-goals-group">
      <h3>{title}</h3>
      {goals.length === 0 ? (
        <p className="training-goals-empty">{emptyLabel}</p>
      ) : (
        <ul className="training-goals-list">
          {goals.map((goal) => (
            <li key={goal.id}>
              <label>
                <input type="checkbox" onChange={() => onComplete(goal)} />
                <span>{goal.content}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Goals come from Matchanalyse's "Ziele fürs nächste Match/Training"
// fields (see trainingGoalsApi.js) — checking one off just removes this
// derived entry, it never touches the original match record.
export default function TrainingGoalsPanel({ goals, onComplete }) {
  const { t } = useTranslation()
  const trainingGoals = goals.filter((g) => g.category === 'training')
  const matchGoals = goals.filter((g) => g.category === 'match')

  return (
    <div className="training-goals-panel">
      <GoalGroup title={t('trainingGoals.trainingTitle')} goals={trainingGoals} onComplete={onComplete} emptyLabel={t('trainingGoals.empty')} />
      <GoalGroup title={t('trainingGoals.matchTitle')} goals={matchGoals} onComplete={onComplete} emptyLabel={t('trainingGoals.empty')} />
    </div>
  )
}
