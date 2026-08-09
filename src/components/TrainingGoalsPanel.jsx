function GoalGroup({ title, goals, onComplete }) {
  return (
    <div className="training-goals-group">
      <h3>{title}</h3>
      {goals.length === 0 ? (
        <p className="training-goals-empty">Keine offenen Ziele.</p>
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
  const trainingGoals = goals.filter((g) => g.category === 'training')
  const matchGoals = goals.filter((g) => g.category === 'match')

  return (
    <div className="training-goals-panel">
      <GoalGroup title="Ziele fürs nächste Training" goals={trainingGoals} onComplete={onComplete} />
      <GoalGroup title="Ziele fürs nächste Match" goals={matchGoals} onComplete={onComplete} />
    </div>
  )
}
