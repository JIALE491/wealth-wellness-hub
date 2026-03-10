import React from 'react';

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'balanced',     label: 'Balanced'     },
  { value: 'aggressive',   label: 'Aggressive'   },
];

const GOAL_OPTIONS = [
  { value: 'emergency_fund',  label: 'Emergency Fund'  },
  { value: 'wealth_building', label: 'Wealth Building' },
  { value: 'retirement',      label: 'Retirement'      },
  { value: 'income',          label: 'Income'          },
];

export default function UserProfilePanel({ profile, onChange }) {
  const set = (key, val) => onChange({ ...profile, [key]: val });

  return (
    <div className="user-profile-panel">
      <div className="upp-title">Your Profile</div>

      <div className="upp-row">
        <label className="upp-label">Age</label>
        <div className="upp-age-wrap">
          <input
            type="range"
            min={18} max={80}
            value={profile.age}
            onChange={e => set('age', parseInt(e.target.value))}
            className="upp-slider"
          />
          <span className="upp-age-val">{profile.age}</span>
        </div>
      </div>

      <div className="upp-row">
        <label className="upp-label">Risk Appetite</label>
        <div className="upp-chips">
          {RISK_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`upp-chip${profile.riskAppetite === o.value ? ' active' : ''}`}
              onClick={() => set('riskAppetite', o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="upp-row">
        <label className="upp-label">Primary Goal</label>
        <select
          value={profile.primaryGoal}
          onChange={e => set('primaryGoal', e.target.value)}
          className="upp-select"
        >
          {GOAL_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="upp-row">
        <label className="upp-label">Monthly Income (S$)</label>
        <input
          type="number"
          min={0}
          step={500}
          value={profile.monthlyIncome || ''}
          placeholder="0"
          onChange={e => set('monthlyIncome', parseFloat(e.target.value) || 0)}
          className="upp-income"
        />
      </div>
    </div>
  );
}
